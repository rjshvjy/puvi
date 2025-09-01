"""
File path: puvi-backend/puvi-backend-main/modules/sku_outbound.py
SKU Outbound Module for PUVI Oil Manufacturing System
Handles Internal Transfers, Third Party Transfers, and Sales transactions
Version: 3.4 - FIXED: GST rate retrieval with better error handling
"""

from flask import Blueprint, request, jsonify
from decimal import Decimal
from datetime import datetime, date, timedelta
import json
import time
import psycopg2
from db_utils import get_db_connection, close_connection
from utils.date_utils import parse_date, integer_to_date, get_current_day_number, format_date_indian
from utils.validation import validate_required_fields, safe_decimal
from utils.expiry_utils import get_fefo_allocation, get_days_to_expiry, get_expiry_status

# Create Blueprint
sku_outbound_bp = Blueprint('sku_outbound', __name__)

# ============================================
# HELPER FUNCTIONS
# ============================================

def generate_outbound_code(outbound_date, cur):
    """
    Generate sequential outbound code
    Format: OUT-DDMMYYYY-001
    
    Args:
        outbound_date: Date as integer (days since epoch)
        cur: Database cursor
    
    Returns:
        str: Generated outbound code
    """
    dt = date(1970, 1, 1) + timedelta(days=outbound_date)
    date_str = dt.strftime('%d%m%Y')  # DDMMYYYY format
    
    # Get count of outbounds on same date
    cur.execute("""
        SELECT COUNT(*) FROM sku_outbound
        WHERE outbound_date = %s
    """, (outbound_date,))
    
    count = cur.fetchone()[0]
    return f"OUT-{date_str}-{count+1:03d}"


def calculate_gst_amount(base_amount, gst_rate):
    """Calculate GST amount from base amount and rate"""
    if not gst_rate:
        return Decimal('0')
    return (safe_decimal(base_amount) * safe_decimal(gst_rate)) / 100


def calculate_base_from_inclusive(inclusive_amount, gst_rate):
    """
    Calculate base price from GST-inclusive amount
    Base = Inclusive / (1 + GST/100)
    """
    if not gst_rate:
        return safe_decimal(inclusive_amount)
    return safe_decimal(inclusive_amount) / (1 + safe_decimal(gst_rate)/100)


def get_gst_rate_for_sku(sku_id, cur):
    """
    Get GST rate for SKU from subcategories_master via oil_type
    
    NO FALLBACK VERSION: Returns None if GST not configured
    
    Args:
        sku_id: SKU ID
        cur: Database cursor
    
    Returns:
        float: GST rate or None if not found
    
    Raises:
        ValueError: If GST rate not configured
    """
    try:
        # First, get the oil_type from SKU
        cur.execute("""
            SELECT 
                s.sku_code,
                s.product_name,
                s.oil_type
            FROM sku_master s
            WHERE s.sku_id = %s
        """, (sku_id,))
        
        sku_info = cur.fetchone()
        if not sku_info:
            raise ValueError(f"SKU with ID {sku_id} not found")
        
        sku_code, product_name, oil_type = sku_info
        
        if not oil_type:
            raise ValueError(
                f"Oil type not configured for SKU: {sku_code} - {product_name}. "
                f"Please configure oil_type in SKU master."
            )
        
        # Try with JOIN first
        cur.execute("""
            SELECT 
                sc.subcategory_name,
                sc.gst_rate
            FROM subcategories_master sc
            INNER JOIN categories_master c ON sc.category_id = c.category_id
            WHERE sc.oil_type = %s
                AND c.category_name = 'Oil'
                AND sc.gst_rate IS NOT NULL
                AND sc.is_active = true
            ORDER BY sc.subcategory_id
            LIMIT 1
        """, (oil_type,))
        
        result = cur.fetchone()
        
        # If no result, try with hardcoded category_id
        if not result or result[1] is None:
            cur.execute("""
                SELECT 
                    sc.subcategory_name,
                    sc.gst_rate
                FROM subcategories_master sc
                WHERE sc.oil_type = %s
                    AND sc.category_id = 8
                    AND sc.gst_rate IS NOT NULL
                ORDER BY sc.subcategory_id
                LIMIT 1
            """, (oil_type,))
            
            result = cur.fetchone()
        
        if result and result[1] is not None:
            return float(result[1])
        else:
            raise ValueError(
                f"GST rate not configured for oil type '{oil_type}' "
                f"(SKU: {sku_code} - {product_name}). "
                f"Please configure GST rate in subcategories master for {oil_type} oil."
            )
            
    except ValueError:
        # Re-raise ValueError as is
        raise
    except Exception as e:
        # Wrap other exceptions in ValueError with context
        raise ValueError(f"Error retrieving GST rate for SKU {sku_id}: {str(e)}")


def calculate_weight_based_costs(items, transport_cost, handling_cost, cur):
    """
    Calculate cost allocation based on weight
    
    Args:
        items: List of items with sku_id and quantity
        transport_cost: Total transport cost to allocate
        handling_cost: Total handling cost to allocate
        cur: Database cursor
    
    Returns:
        tuple: (cost allocations per item, total shipment weight)
    """
    total_weight = Decimal('0')
    item_weights = []
    
    # Calculate total weight
    for item in items:
        cur.execute("""
            SELECT packaged_weight_kg
            FROM sku_master
            WHERE sku_id = %s
        """, (item['sku_id'],))
        
        result = cur.fetchone()
        if not result or result[0] is None:
            # Default weight if not set
            unit_weight = Decimal('1.0')
        else:
            unit_weight = Decimal(str(result[0]))
        
        item_weight = unit_weight * Decimal(str(item['quantity_ordered']))
        item_weights.append({
            'sku_id': item['sku_id'],
            'unit_weight': unit_weight,
            'total_weight': item_weight,
            'quantity': item['quantity_ordered']
        })
        total_weight += item_weight
    
    # Calculate costs per kg
    if total_weight > 0:
        transport_per_kg = safe_decimal(transport_cost) / total_weight
        handling_per_kg = safe_decimal(handling_cost) / total_weight
    else:
        transport_per_kg = Decimal('0')
        handling_per_kg = Decimal('0')
    
    # Allocate costs to items
    for item_weight in item_weights:
        item_weight['transport_per_unit'] = item_weight['unit_weight'] * transport_per_kg
        item_weight['transport_per_kg'] = transport_per_kg
        item_weight['handling_per_unit'] = item_weight['unit_weight'] * handling_per_kg
        item_weight['handling_per_kg'] = handling_per_kg
    
    return item_weights, float(total_weight)


def check_sku_availability(sku_id, quantity_needed, from_location_id, cur):
    """
    Get available batches at location with FEFO suggestion
    Returns existing production traceable codes with expiry tracking
    
    Args:
        sku_id: SKU ID to check
        quantity_needed: Quantity required
        from_location_id: Source location ID
        cur: Database cursor
    
    Returns:
        dict: Availability status and batch details
    """
    # Get available batches at location ordered by FEFO
    cur.execute("""
        SELECT 
            et.tracking_id,
            et.production_id,
            p.production_code,
            p.traceable_code as sku_traceable_code,
            et.expiry_date,
            et.quantity_remaining,
            p.mrp_at_production,
            p.cost_per_bottle,
            si.inventory_id
        FROM sku_expiry_tracking et
        JOIN sku_production p ON et.production_id = p.production_id
        LEFT JOIN sku_inventory si ON si.production_id = p.production_id 
            AND si.location_id = %s
        WHERE et.sku_id = %s
            AND et.location_id = %s
            AND et.quantity_remaining > 0
            AND et.status != 'expired'
        ORDER BY et.expiry_date ASC  -- FEFO order
    """, (from_location_id, sku_id, from_location_id))
    
    available_batches = []
    total_available = 0
    
    for row in cur.fetchall():
        tracking_id, prod_id, prod_code, sku_trace, expiry, qty_remaining, mrp, cost, inv_id = row
        
        # Calculate days to expiry
        days_to_expiry = get_days_to_expiry(expiry) if expiry else None
        expiry_status = get_expiry_status(expiry) if expiry else 'unknown'
        
        available_batches.append({
            'tracking_id': tracking_id,
            'production_id': prod_id,
            'production_code': prod_code,
            'sku_traceable_code': sku_trace,
            'expiry_date': integer_to_date(expiry, '%d-%m-%Y') if expiry else None,  # DD-MM-YYYY format
            'days_to_expiry': days_to_expiry,
            'expiry_status': expiry_status,
            'quantity_remaining': float(qty_remaining),
            'mrp': float(mrp) if mrp else 0,
            'production_cost': float(cost) if cost else 0,
            'inventory_id': inv_id
        })
        total_available += float(qty_remaining)
    
    return {
        'success': total_available >= quantity_needed,
        'available_batches': available_batches,
        'total_available': total_available,
        'shortage': max(0, quantity_needed - total_available)
    }


def deplete_inventory_atomic(sku_id, location_id, quantity, cur):
    """
    Atomic inventory depletion with concurrency handling
    
    Args:
        sku_id: SKU ID
        location_id: Location ID
        quantity: Quantity to deplete
        cur: Database cursor
    
    Returns:
        float: Remaining quantity after depletion
    
    Raises:
        InsufficientInventoryError: If not enough inventory
    """
    cur.execute("""
        UPDATE sku_inventory
        SET quantity_available = quantity_available - %s,
            last_updated = CURRENT_TIMESTAMP
        WHERE sku_id = %s
            AND location_id = %s
            AND quantity_available >= %s
        RETURNING quantity_available
    """, (quantity, sku_id, location_id, quantity))
    
    result = cur.fetchone()
    if not result:
        # Check if record exists
        cur.execute("""
            SELECT quantity_available 
            FROM sku_inventory 
            WHERE sku_id = %s AND location_id = %s
        """, (sku_id, location_id))
        
        existing = cur.fetchone()
        if existing:
            raise InsufficientInventoryError(
                f"Insufficient inventory. Available: {existing[0]}, Required: {quantity}"
            )
        else:
            raise InsufficientInventoryError(
                f"No inventory record found for SKU {sku_id} at location {location_id}"
            )
    
    return result[0]


def add_inventory_atomic(sku_id, location_id, quantity, production_id, mrp, expiry_date, cur):
    """
    Atomic inventory addition for transfers
    
    Args:
        sku_id: SKU ID
        location_id: Destination location ID
        quantity: Quantity to add
        production_id: Production ID for tracking
        mrp: MRP value
        expiry_date: Expiry date integer
        cur: Database cursor
    
    Returns:
        float: New quantity available
    """
    cur.execute("""
        INSERT INTO sku_inventory (
            sku_id, location_id, production_id,
            quantity_available, mrp, expiry_date,
            status, created_at, updated_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (sku_id, location_id) 
        DO UPDATE SET 
            quantity_available = sku_inventory.quantity_available + %s,
            last_updated = CURRENT_TIMESTAMP
        RETURNING quantity_available
    """, (sku_id, location_id, production_id, quantity, mrp, expiry_date, quantity))
    
    return cur.fetchone()[0]


def update_expiry_tracking_location(tracking_ids, new_location_id, cur):
    """
    Update location in expiry tracking for internal transfers
    
    Args:
        tracking_ids: List of tracking IDs
        new_location_id: New location ID
        cur: Database cursor
    """
    if not tracking_ids:
        return
    
    cur.execute("""
        UPDATE sku_expiry_tracking
        SET location_id = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE tracking_id = ANY(%s)
    """, (new_location_id, tracking_ids))


def update_expiry_tracking_quantity(tracking_id, quantity_used, cur):
    """
    Update remaining quantity in expiry tracking after outbound
    
    Args:
        tracking_id: Expiry tracking ID
        quantity_used: Quantity consumed
        cur: Database cursor
    """
    cur.execute("""
        UPDATE sku_expiry_tracking
        SET quantity_remaining = quantity_remaining - %s,
            status = CASE 
                WHEN quantity_remaining - %s <= 0 THEN 'consumed'
                ELSE status
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE tracking_id = %s
            AND quantity_remaining >= %s
        RETURNING quantity_remaining
    """, (quantity_used, quantity_used, tracking_id, quantity_used))
    
    result = cur.fetchone()
    if not result:
        raise InsufficientInventoryError(
            f"Insufficient quantity in expiry tracking {tracking_id}"
        )
    return result[0]


# ============================================
# CUSTOM EXCEPTIONS
# ============================================

class InsufficientInventoryError(Exception):
    """Raised when inventory is insufficient for the operation"""
    pass


class InvalidLocationError(Exception):
    """Raised when location configuration is invalid"""
    pass


# ============================================
# MAIN ENDPOINTS
# ============================================

@sku_outbound_bp.route('/api/sku/outbound/check-availability', methods=['POST'])
def check_availability():
    """Check SKU batch availability at a location"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['sku_id', 'quantity_needed', 'from_location_id']
        is_valid, missing_fields = validate_required_fields(data, required_fields)
        
        if not is_valid:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        sku_id = data['sku_id']
        quantity_needed = int(data['quantity_needed'])
        from_location_id = data['from_location_id']
        
        # Get SKU details
        cur.execute("""
            SELECT sku_code, product_name, package_size, packaged_weight_kg
            FROM sku_master
            WHERE sku_id = %s
        """, (sku_id,))
        
        sku_data = cur.fetchone()
        if not sku_data:
            return jsonify({'success': False, 'error': 'SKU not found'}), 404
        
        # Get GST rate - let errors propagate for sales, but handle for availability check
        try:
            gst_rate = get_gst_rate_for_sku(sku_id, cur)
        except ValueError as e:
            # For availability check, we can proceed without GST
            # It will be required during sales creation
            print(f"WARNING: GST rate error for SKU {sku_id}: {str(e)}")
            gst_rate = None
        
        # Check availability
        availability = check_sku_availability(
            sku_id, quantity_needed, from_location_id, cur
        )
        
        availability['sku_details'] = {
            'sku_code': sku_data[0],
            'product_name': sku_data[1],
            'package_size': sku_data[2],
            'packaged_weight_kg': float(sku_data[3]) if sku_data[3] else 1.0,
            'gst_rate': gst_rate
        }
        
        return jsonify(availability)
        
    except Exception as e:
        print(f"ERROR in check_availability: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@sku_outbound_bp.route('/api/sku/outbound/create', methods=['POST'])
def create_outbound():
    """Create outbound transaction with GST handling for sales"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    max_retries = 3
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            data = request.json
            
            # Validate required fields
            required_fields = ['transaction_type', 'from_location_id', 'items', 'outbound_date']
            is_valid, missing_fields = validate_required_fields(data, required_fields)
            
            if not is_valid:
                return jsonify({
                    'success': False,
                    'error': f'Missing required fields: {", ".join(missing_fields)}'
                }), 400
            
            transaction_type = data['transaction_type']
            from_location_id = data['from_location_id']
            
            # Parse date in DD-MM-YYYY format
            outbound_date = parse_date(data['outbound_date'])
            
            # Validate transaction type specific requirements
            if transaction_type == 'transfer':
                if not data.get('to_location_id'):
                    return jsonify({
                        'success': False,
                        'error': 'to_location_id required for transfers'
                    }), 400
                    
                # Check destination location ownership
                cur.execute("""
                    SELECT ownership, location_name 
                    FROM locations_master 
                    WHERE location_id = %s
                """, (data['to_location_id'],))
                
                to_location = cur.fetchone()
                if not to_location:
                    return jsonify({
                        'success': False,
                        'error': 'Invalid destination location'
                    }), 400
                    
            elif transaction_type == 'sales':
                if not data.get('customer_id'):
                    return jsonify({
                        'success': False,
                        'error': 'customer_id required for sales'
                    }), 400
            
            # Begin transaction
            cur.execute("BEGIN")
            
            # Generate outbound code
            outbound_code = generate_outbound_code(outbound_date, cur)
            
            # Get cost inputs
            transport_cost = safe_decimal(data.get('transport_cost', 0))
            handling_cost = safe_decimal(data.get('handling_cost', 0))
            
            # Calculate weight-based cost allocation
            cost_allocations, total_shipment_weight = calculate_weight_based_costs(
                data['items'], transport_cost, handling_cost, cur
            )
            
            # Build cost allocation lookup
            cost_allocation_map = {item['sku_id']: item for item in cost_allocations}
            
            # Calculate totals for sales transactions
            subtotal = Decimal('0')
            total_gst = Decimal('0')
            
            if transaction_type == 'sales':
                for item in data['items']:
                    if item.get('unit_price'):
                        # Unit price is inclusive of GST
                        inclusive_price = safe_decimal(item['unit_price'])
                        quantity = safe_decimal(item['quantity_ordered'])
                        
                        # Get GST rate for this SKU
                        try:
                            sku_gst_rate = get_gst_rate_for_sku(item['sku_id'], cur)
                        except ValueError as e:
                            conn.rollback()
                            return jsonify({'success': False, 'error': str(e)}), 400
                        
                        # Calculate base price from inclusive price
                        base_price = calculate_base_from_inclusive(inclusive_price, sku_gst_rate)
                        line_base_amount = base_price * quantity
                        line_gst_amount = (inclusive_price * quantity) - line_base_amount
                        
                        subtotal += line_base_amount
                        total_gst += line_gst_amount
                        
                        # Store calculated values back in item for later use
                        item['gst_rate'] = sku_gst_rate
                        item['base_price'] = float(base_price)
                        item['gst_amount'] = float(line_gst_amount / quantity) if quantity > 0 else 0
            
            # Grand total calculation
            grand_total = subtotal + total_gst + transport_cost + handling_cost
            
            # Create main outbound record
            cur.execute("""
                INSERT INTO sku_outbound (
                    outbound_code, transaction_type, from_location_id,
                    to_location_id, customer_id, ship_to_location_id,
                    customer_po_number, invoice_number, eway_bill_number,
                    stn_number, stn_date, shipment_id,
                    outbound_date, dispatch_date,
                    transport_mode, transport_vendor, vehicle_number,
                    lr_number, transport_cost, handling_cost,
                    total_shipment_weight_kg,
                    subtotal, total_gst_amount, grand_total,
                    status, notes, created_by
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                ) RETURNING outbound_id
            """, (
                outbound_code,
                transaction_type,
                from_location_id,
                data.get('to_location_id'),
                data.get('customer_id'),
                data.get('ship_to_location_id'),
                data.get('customer_po_number'),
                data.get('invoice_number'),
                data.get('eway_bill_number'),
                data.get('stn_number'),  # Stock Transfer Note number
                parse_date(data.get('stn_date')) if data.get('stn_date') else None,  # STN date
                data.get('shipment_id'),  # Shipment/Tracking ID
                outbound_date,
                parse_date(data.get('dispatch_date')) if data.get('dispatch_date') else None,
                data.get('transport_mode'),
                data.get('transport_vendor'),
                data.get('vehicle_number'),
                data.get('lr_number'),
                float(transport_cost),
                float(handling_cost),
                total_shipment_weight,
                float(subtotal) if transaction_type == 'sales' else None,
                float(total_gst) if transaction_type == 'sales' else None,
                float(grand_total) if transaction_type == 'sales' else float(transport_cost + handling_cost),
                'confirmed',
                data.get('notes'),
                data.get('created_by', 'System')
            ))
            
            outbound_id = cur.fetchone()[0]
            
            # Process each item
            for item in data['items']:
                sku_id = item['sku_id']
                quantity_ordered = int(item['quantity_ordered'])
                allocations = item.get('allocations', [])
                
                # Get cost allocation for this item
                cost_alloc = cost_allocation_map.get(sku_id, {})
                
                if not allocations:
                    # Auto-allocate using FEFO if not provided
                    availability = check_sku_availability(
                        sku_id, quantity_ordered, from_location_id, cur
                    )
                    
                    if not availability['success']:
                        raise InsufficientInventoryError(
                            f"Insufficient inventory for SKU {sku_id}"
                        )
                    
                    # Create allocations from available batches
                    allocations = []
                    remaining = quantity_ordered
                    
                    for batch in availability['available_batches']:
                        if remaining <= 0:
                            break
                        
                        alloc_qty = min(remaining, batch['quantity_remaining'])
                        allocations.append({
                            'tracking_id': batch['tracking_id'],
                            'production_id': batch['production_id'],
                            'production_code': batch['production_code'],
                            'sku_traceable_code': batch['sku_traceable_code'],
                            'quantity': alloc_qty,
                            'expiry_date': batch['expiry_date'],
                            'mrp': batch['mrp'],
                            'production_cost': batch['production_cost']
                        })
                        remaining -= alloc_qty
                
                # Prepare allocation data for JSONB
                allocation_data = {
                    'allocations': allocations,
                    'allocation_strategy': item.get('allocation_strategy', 'fefo'),
                    'total_allocated': sum(a['quantity'] for a in allocations)
                }
                
                # Calculate line amounts for sales
                if transaction_type == 'sales' and item.get('unit_price'):
                    # Use pre-calculated values
                    base_price = item.get('base_price')
                    gst_rate = item.get('gst_rate')
                    gst_amount = item.get('gst_amount')
                    line_total = safe_decimal(item['unit_price']) * quantity_ordered
                else:
                    base_price = None
                    gst_rate = None
                    gst_amount = None
                    line_total = None
                
                # Insert outbound item
                cur.execute("""
                    INSERT INTO sku_outbound_items (
                        outbound_id, sku_id,
                        quantity_ordered, quantity_shipped,
                        allocation_data,
                        item_weight_kg,
                        transport_cost_per_unit, transport_cost_per_kg,
                        handling_cost_per_unit, handling_cost_per_kg,
                        unit_price, base_price, gst_rate, gst_amount, line_total,
                        notes
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING item_id
                """, (
                    outbound_id,
                    sku_id,
                    quantity_ordered,
                    quantity_ordered,  # Initially shipped = ordered
                    json.dumps(allocation_data),
                    float(cost_alloc.get('total_weight', 0)),
                    float(cost_alloc.get('transport_per_unit', 0)),
                    float(cost_alloc.get('transport_per_kg', 0)),
                    float(cost_alloc.get('handling_per_unit', 0)),
                    float(cost_alloc.get('handling_per_kg', 0)),
                    safe_decimal(item.get('unit_price')) if item.get('unit_price') else None,
                    safe_decimal(base_price) if base_price else None,
                    safe_decimal(gst_rate) if gst_rate else None,
                    safe_decimal(gst_amount) if gst_amount else None,
                    float(line_total) if line_total else None,
                    item.get('notes')
                ))
                
                item_id = cur.fetchone()[0]
                
                # Process inventory changes based on allocations
                for allocation in allocations:
                    tracking_id = allocation['tracking_id']
                    quantity = allocation['quantity']
                    
                    # Deplete from source location
                    deplete_inventory_atomic(sku_id, from_location_id, quantity, cur)
                    
                    # Update expiry tracking quantity
                    update_expiry_tracking_quantity(tracking_id, quantity, cur)
                    
                    # For internal transfers, add to destination
                    if transaction_type == 'transfer' and to_location[0] == 'own':
                        add_inventory_atomic(
                            sku_id,
                            data['to_location_id'],
                            quantity,
                            allocation['production_id'],
                            allocation['mrp'],
                            parse_date(allocation['expiry_date']) if allocation['expiry_date'] else None,
                            cur
                        )
                        
                        # Update expiry tracking location
                        update_expiry_tracking_location(
                            [tracking_id],
                            data['to_location_id'],
                            cur
                        )
            
            # Commit transaction
            conn.commit()
            
            response_data = {
                'success': True,
                'outbound_id': outbound_id,
                'outbound_code': outbound_code,
                'total_shipment_weight_kg': total_shipment_weight,
                'cost_summary': {
                    'transport_cost': float(transport_cost),
                    'handling_cost': float(handling_cost),
                    'total_logistics_cost': float(transport_cost + handling_cost)
                }
            }
            
            # Add GST summary for sales
            if transaction_type == 'sales':
                response_data['gst_summary'] = {
                    'subtotal': float(subtotal),
                    'total_gst': float(total_gst),
                    'grand_total': float(grand_total)
                }
                response_data['message'] = f'Sales order {outbound_code} created successfully'
            else:
                response_data['message'] = f'Transfer {outbound_code} created successfully'
            
            return jsonify(response_data), 201
            
        except InsufficientInventoryError as e:
            conn.rollback()
            return jsonify({'success': False, 'error': str(e)}), 400
            
        except psycopg2.Error as e:
            conn.rollback()
            
            # Check for concurrency issues
            if 'could not serialize' in str(e) or 'concurrent update' in str(e):
                retry_count += 1
                if retry_count >= max_retries:
                    return jsonify({
                        'success': False,
                        'error': 'System busy, please try again'
                    }), 503
                
                # Exponential backoff
                time.sleep(0.1 * (2 ** retry_count))
                continue
            else:
                return jsonify({'success': False, 'error': str(e)}), 500
                
        except Exception as e:
            conn.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500
            
    # This is the key fix - finally is outside the while loop
    close_connection(conn, cur)
    
    # If we get here, we exhausted retries
    return jsonify({
        'success': False,
        'error': 'Failed to create outbound after maximum retries'
    }), 503


@sku_outbound_bp.route('/api/sku/outbound/history', methods=['GET'])
def get_outbound_history():
    """Get outbound transaction history with GST details"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get filter parameters
        transaction_type = request.args.get('transaction_type')
        from_location_id = request.args.get('from_location_id')
        customer_id = request.args.get('customer_id')
        start_date = request.args.get('start_date')  # Expected in DD-MM-YYYY
        end_date = request.args.get('end_date')      # Expected in DD-MM-YYYY
        status = request.args.get('status')
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        
        # Build query
        query = """
            SELECT 
                o.outbound_id,
                o.outbound_code,
                o.transaction_type,
                o.outbound_date,
                o.dispatch_date,
                fl.location_name as from_location,
                tl.location_name as to_location,
                c.customer_name,
                stl.location_name as ship_to_location,
                o.status,
                o.transport_cost,
                o.handling_cost,
                o.total_shipment_weight_kg,
                o.subtotal,
                o.total_gst_amount,
                o.grand_total,
                o.created_at,
                COUNT(DISTINCT oi.sku_id) as sku_count,
                SUM(oi.quantity_shipped) as total_units
            FROM sku_outbound o
            JOIN locations_master fl ON o.from_location_id = fl.location_id
            LEFT JOIN locations_master tl ON o.to_location_id = tl.location_id
            LEFT JOIN customers c ON o.customer_id = c.customer_id
            LEFT JOIN customer_ship_to_locations stl ON o.ship_to_location_id = stl.ship_to_id
            LEFT JOIN sku_outbound_items oi ON o.outbound_id = oi.outbound_id
            WHERE 1=1
        """
        
        params = []
        
        if transaction_type:
            query += " AND o.transaction_type = %s"
            params.append(transaction_type)
        
        if from_location_id:
            query += " AND o.from_location_id = %s"
            params.append(from_location_id)
        
        if customer_id:
            query += " AND o.customer_id = %s"
            params.append(customer_id)
        
        if start_date:
            query += " AND o.outbound_date >= %s"
            params.append(parse_date(start_date))  # Parse DD-MM-YYYY
        
        if end_date:
            query += " AND o.outbound_date <= %s"
            params.append(parse_date(end_date))    # Parse DD-MM-YYYY
        
        if status:
            query += " AND o.status = %s"
            params.append(status)
        
        query += """
            GROUP BY o.outbound_id, o.outbound_code, o.transaction_type,
                     o.outbound_date, o.dispatch_date, fl.location_name,
                     tl.location_name, c.customer_name, stl.location_name,
                     o.status, o.transport_cost, o.handling_cost,
                     o.total_shipment_weight_kg, o.subtotal, o.total_gst_amount,
                     o.grand_total, o.created_at
            ORDER BY o.outbound_date DESC, o.outbound_id DESC
            LIMIT %s OFFSET %s
        """
        params.extend([limit, offset])
        
        cur.execute(query, params)
        
        outbounds = []
        for row in cur.fetchall():
            outbound_data = {
                'outbound_id': row[0],
                'outbound_code': row[1],
                'transaction_type': row[2],
                'outbound_date': integer_to_date(row[3], '%d-%m-%Y'),
                'dispatch_date': integer_to_date(row[4], '%d-%m-%Y') if row[4] else None,
                'from_location': row[5],
                'to_location': row[6],
                'customer_name': row[7],
                'ship_to_location': row[8],
                'status': row[9],
                'costs': {
                    'transport': float(row[10]) if row[10] else 0,
                    'handling': float(row[11]) if row[11] else 0,
                    'total': (float(row[10] or 0) + float(row[11] or 0))
                },
                'weight_info': {
                    'total_shipment_weight_kg': float(row[12]) if row[12] else 0
                },
                'created_at': row[16].isoformat() if row[16] else None,
                'sku_count': row[17] or 0,
                'total_units': int(row[18]) if row[18] else 0
            }
            
            # Add GST details for sales
            if row[2] == 'sales':
                outbound_data['financial'] = {
                    'subtotal': float(row[13]) if row[13] else 0,
                    'gst_amount': float(row[14]) if row[14] else 0,
                    'grand_total': float(row[15]) if row[15] else 0
                }
            
            outbounds.append(outbound_data)
        
        return jsonify({
            'success': True,
            'outbounds': outbounds,
            'count': len(outbounds)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@sku_outbound_bp.route('/api/sku/outbound/<int:outbound_id>', methods=['GET'])
def get_outbound_details(outbound_id):
    """Get detailed information for a specific outbound transaction with GST breakdown"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get main outbound details
        cur.execute("""
            SELECT 
                o.outbound_code,
                o.transaction_type,
                o.outbound_date,
                o.dispatch_date,
                fl.location_name as from_location,
                tl.location_name as to_location,
                tl.ownership as to_location_ownership,
                c.customer_name,
                stl.location_name as ship_to_location,
                o.customer_po_number,
                o.invoice_number,
                o.eway_bill_number,
                o.stn_number,
                o.stn_date,
                o.shipment_id,
                o.transport_mode,
                o.transport_vendor,
                o.vehicle_number,
                o.lr_number,
                o.transport_cost,
                o.handling_cost,
                o.total_shipment_weight_kg,
                o.subtotal,
                o.total_gst_amount,
                o.grand_total,
                o.status,
                o.notes,
                o.created_by,
                o.created_at,
                c.gst_number as customer_gst
            FROM sku_outbound o
            JOIN locations_master fl ON o.from_location_id = fl.location_id
            LEFT JOIN locations_master tl ON o.to_location_id = tl.location_id
            LEFT JOIN customers c ON o.customer_id = c.customer_id
            LEFT JOIN customer_ship_to_locations stl ON o.ship_to_location_id = stl.ship_to_id
            WHERE o.outbound_id = %s
        """, (outbound_id,))
        
        outbound_data = cur.fetchone()
        if not outbound_data:
            return jsonify({'success': False, 'error': 'Outbound not found'}), 404
        
        # Get line items
        cur.execute("""
            SELECT 
                oi.item_id,
                s.sku_id,
                s.sku_code,
                s.product_name,
                s.package_size,
                s.packaged_weight_kg,
                oi.quantity_ordered,
                oi.quantity_shipped,
                oi.allocation_data,
                oi.item_weight_kg,
                oi.transport_cost_per_unit,
                oi.transport_cost_per_kg,
                oi.handling_cost_per_unit,
                oi.handling_cost_per_kg,
                oi.unit_price,
                oi.base_price,
                oi.gst_rate,
                oi.gst_amount,
                oi.line_total,
                oi.notes
            FROM sku_outbound_items oi
            JOIN sku_master s ON oi.sku_id = s.sku_id
            WHERE oi.outbound_id = %s
            ORDER BY oi.item_id
        """, (outbound_id,))
        
        items = []
        for row in cur.fetchall():
            item_data = {
                'item_id': row[0],
                'sku_id': row[1],
                'sku_code': row[2],
                'product_name': row[3],
                'package_size': row[4],
                'packaged_weight_kg': float(row[5]) if row[5] else 1.0,
                'quantity_ordered': row[6],
                'quantity_shipped': row[7],
                'allocations': row[8]['allocations'] if row[8] else [],
                'weight_allocation': {
                    'item_weight_kg': float(row[9]) if row[9] else 0,
                    'transport_cost_per_unit': float(row[10]) if row[10] else 0,
                    'transport_cost_per_kg': float(row[11]) if row[11] else 0,
                    'handling_cost_per_unit': float(row[12]) if row[12] else 0,
                    'handling_cost_per_kg': float(row[13]) if row[13] else 0
                },
                'notes': row[19]
            }
            
            # Add pricing details for sales
            if outbound_data[1] == 'sales':
                item_data['pricing'] = {
                    'unit_price_inclusive': float(row[14]) if row[14] else None,
                    'base_price': float(row[15]) if row[15] else None,
                    'gst_rate': float(row[16]) if row[16] else None,
                    'gst_amount_per_unit': float(row[17]) if row[17] else None,
                    'line_total': float(row[18]) if row[18] else None
                }
            
            # Format dates in allocations to DD-MM-YYYY
            for alloc in item_data['allocations']:
                if alloc.get('expiry_date'):
                    # Convert to DD-MM-YYYY if it's in another format
                    expiry_int = parse_date(alloc['expiry_date'])
                    alloc['expiry_date'] = integer_to_date(expiry_int, '%d-%m-%Y')
                    alloc['days_to_expiry'] = get_days_to_expiry(expiry_int)
                    alloc['expiry_status'] = get_expiry_status(expiry_int)
            
            items.append(item_data)
        
        # Build response
        response = {
            'success': True,
            'outbound': {
                'outbound_code': outbound_data[0],
                'transaction_type': outbound_data[1],
                'outbound_date': integer_to_date(outbound_data[2], '%d-%m-%Y'),
                'dispatch_date': integer_to_date(outbound_data[3], '%d-%m-%Y') if outbound_data[3] else None,
                'from_location': outbound_data[4],
                'to_location': outbound_data[5],
                'to_location_type': 'internal' if outbound_data[6] == 'own' else 'third_party',
                'customer_name': outbound_data[7],
                'ship_to_location': outbound_data[8],
                'customer_gst': outbound_data[29],
                'reference_documents': {
                    'customer_po': outbound_data[9],
                    'invoice': outbound_data[10],
                    'eway_bill': outbound_data[11],
                    'stn_number': outbound_data[12],  # Stock Transfer Note
                    'stn_date': integer_to_date(outbound_data[13], '%d-%m-%Y') if outbound_data[13] else None,
                    'shipment_id': outbound_data[14]  # Shipment/Tracking ID
                },
                'transport': {
                    'mode': outbound_data[15],
                    'vendor': outbound_data[16],
                    'vehicle_number': outbound_data[17],
                    'lr_number': outbound_data[18],
                    'cost': float(outbound_data[19]) if outbound_data[19] else 0
                },
                'cost_summary': {
                    'transport_cost': float(outbound_data[19]) if outbound_data[19] else 0,
                    'handling_cost': float(outbound_data[20]) if outbound_data[20] else 0,
                    'total_logistics_cost': (float(outbound_data[19] or 0) + float(outbound_data[20] or 0))
                },
                'weight_info': {
                    'total_shipment_weight_kg': float(outbound_data[21]) if outbound_data[21] else 0
                },
                'status': outbound_data[25],
                'notes': outbound_data[26],
                'created_by': outbound_data[27],
                'created_at': outbound_data[28].isoformat() if outbound_data[28] else None,
                'items': items
            }
        }
        
        # Add financial summary for sales
        if outbound_data[1] == 'sales':
            response['outbound']['financial_summary'] = {
                'subtotal': float(outbound_data[22]) if outbound_data[22] else 0,
                'total_gst': float(outbound_data[23]) if outbound_data[23] else 0,
                'grand_total': float(outbound_data[24]) if outbound_data[24] else 0
            }
            
            # Calculate margin if production costs available
            total_production_cost = 0
            for item in items:
                for alloc in item['allocations']:
                    total_production_cost += alloc.get('production_cost', 0) * alloc.get('quantity', 0)
            
            if total_production_cost > 0 and outbound_data[22]:
                revenue = float(outbound_data[22])
                response['outbound']['margin_analysis'] = {
                    'revenue': revenue,
                    'production_cost': total_production_cost,
                    'gross_margin': revenue - total_production_cost,
                    'gross_margin_percentage': ((revenue - total_production_cost) / revenue * 100) if revenue > 0 else 0
                }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@sku_outbound_bp.route('/api/sku/outbound/trace/<traceable_code>', methods=['GET'])
def trace_batch(traceable_code):
    """Find where a specific SKU batch was sent"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Search in allocation data for the traceable code
        cur.execute("""
            SELECT 
                o.outbound_id,
                o.outbound_code,
                o.outbound_date,
                o.transaction_type,
                fl.location_name as from_location,
                COALESCE(tl.location_name, c.customer_name) as destination,
                stl.location_name as ship_to_location,
                s.sku_code,
                s.product_name,
                oi.quantity_shipped,
                oi.allocation_data,
                oi.unit_price,
                oi.base_price,
                oi.gst_rate
            FROM sku_outbound o
            JOIN sku_outbound_items oi ON o.outbound_id = oi.outbound_id
            JOIN sku_master s ON oi.sku_id = s.sku_id
            JOIN locations_master fl ON o.from_location_id = fl.location_id
            LEFT JOIN locations_master tl ON o.to_location_id = tl.location_id
            LEFT JOIN customers c ON o.customer_id = c.customer_id
            LEFT JOIN customer_ship_to_locations stl ON o.ship_to_location_id = stl.ship_to_id
            WHERE oi.allocation_data::text LIKE %s
            ORDER BY o.outbound_date DESC
        """, (f'%{traceable_code}%',))
        
        movements = []
        for row in cur.fetchall():
            # Extract specific allocation for this traceable code
            allocations = row[10].get('allocations', []) if row[10] else []
            specific_allocation = None
            
            for alloc in allocations:
                if alloc.get('sku_traceable_code') == traceable_code:
                    specific_allocation = alloc
                    break
            
            if specific_allocation:
                movement = {
                    'outbound_code': row[1],
                    'outbound_date': integer_to_date(row[2], '%d-%m-%Y'),
                    'transaction_type': row[3],
                    'from_location': row[4],
                    'destination': row[5],
                    'ship_to_location': row[6],
                    'sku_code': row[7],
                    'product_name': row[8],
                    'quantity': specific_allocation['quantity'],
                    'expiry_date': specific_allocation.get('expiry_date')
                }
                
                # Add sales information if applicable
                if row[3] == 'sales':
                    movement['unit_price_inclusive'] = float(row[11]) if row[11] else None
                    movement['base_price'] = float(row[12]) if row[12] else None
                    movement['gst_rate'] = float(row[13]) if row[13] else None
                
                movements.append(movement)
        
        # Also get production details for this traceable code
        cur.execute("""
            SELECT 
                p.production_code,
                p.production_date,
                p.bottles_produced,
                s.sku_code,
                s.product_name,
                p.expiry_date
            FROM sku_production p
            JOIN sku_master s ON p.sku_id = s.sku_id
            WHERE p.traceable_code = %s
        """, (traceable_code,))
        
        production = cur.fetchone()
        
        response = {
            'success': True,
            'traceable_code': traceable_code,
            'production': None,
            'movements': movements,
            'movement_count': len(movements)
        }
        
        if production:
            response['production'] = {
                'production_code': production[0],
                'production_date': integer_to_date(production[1], '%d-%m-%Y'),
                'quantity_produced': production[2],
                'sku_code': production[3],
                'product_name': production[4],
                'expiry_date': integer_to_date(production[5], '%d-%m-%Y') if production[5] else None
            }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@sku_outbound_bp.route('/api/sku/outbound/<int:outbound_id>/update-status', methods=['POST'])
def update_outbound_status(outbound_id):
    """Update status of outbound transaction"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        new_status = data.get('status')
        
        if new_status not in ['draft', 'confirmed', 'dispatched', 'delivered', 'cancelled']:
            return jsonify({
                'success': False,
                'error': 'Invalid status'
            }), 400
        
        # Check current status
        cur.execute("""
            SELECT status, transaction_type 
            FROM sku_outbound 
            WHERE outbound_id = %s
        """, (outbound_id,))
        
        result = cur.fetchone()
        if not result:
            return jsonify({'success': False, 'error': 'Outbound not found'}), 404
        
        current_status = result[0]
        
        # Validate status transition
        if current_status == 'cancelled':
            return jsonify({
                'success': False,
                'error': 'Cannot update cancelled transaction'
            }), 400
        
        if new_status == 'cancelled' and current_status in ['dispatched', 'delivered']:
            return jsonify({
                'success': False,
                'error': 'Cannot cancel dispatched/delivered transaction'
            }), 400
        
        # Update status
        cur.execute("""
            UPDATE sku_outbound
            SET status = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE outbound_id = %s
        """, (new_status, outbound_id))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': f'Status updated to {new_status}'
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# ============================================
# CUSTOMER ENDPOINTS - NEW ADDITION 
# ============================================

@sku_outbound_bp.route('/api/customers/<int:customer_id>/ship-to', methods=['GET'])
def get_customer_ship_to_locations(customer_id):
    """Get ship-to locations for a customer"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # First check if customer exists
        cur.execute("""
            SELECT customer_name 
            FROM customers 
            WHERE customer_id = %s AND is_active = true
        """, (customer_id,))
        
        if not cur.fetchone():
            return jsonify({
                'success': False,
                'error': 'Customer not found'
            }), 404
        
        # Get ship-to locations
        cur.execute("""
            SELECT 
                ship_to_id,
                location_code,
                location_name,
                address_line1,
                address_line2,
                city,
                state,
                pincode,
                contact_person,
                contact_phone,
                gstin,
                is_default
            FROM customer_ship_to_locations
            WHERE customer_id = %s AND is_active = true
            ORDER BY is_default DESC, location_name
        """, (customer_id,))
        
        locations = []
        for row in cur.fetchall():
            locations.append({
                'ship_to_id': row[0],
                'location_code': row[1],
                'location_name': row[2],
                'address_line1': row[3],
                'address_line2': row[4],
                'city': row[5],
                'state': row[6],
                'pincode': row[7],
                'contact_person': row[8],
                'contact_phone': row[9],
                'gstin': row[10],
                'is_default': row[11]
            })
        
        return jsonify({
            'success': True,
            'locations': locations,
            'count': len(locations)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@sku_outbound_bp.route('/api/customers/dropdown', methods=['GET'])
def get_customers_dropdown():
    """Get customers for dropdown selection"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT 
                customer_id,
                customer_code,
                customer_name,
                gst_number
            FROM customers
            WHERE is_active = true
            ORDER BY customer_name
        """)
        
        customers = []
        for row in cur.fetchall():
            customers.append({
                'customer_id': row[0],
                'customer_code': row[1],
                'customer_name': row[2],
                'gst_number': row[3],
                'label': f"{row[2]} ({row[1]})",  # For dropdown display
                'value': row[0]  # For dropdown value
            })
        
        return jsonify({
            'success': True,
            'customers': customers
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# ============================================
# STATISTICS ENDPOINT
# ============================================

@sku_outbound_bp.route('/api/sku/outbound/stats', methods=['GET'])
def get_outbound_stats():
    """Get real-time statistics for SKU outbound transactions"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get today's date as integer (days since epoch)
        today_integer = get_current_day_number()
        
        # Total transfers
        cur.execute("""
            SELECT COUNT(*) 
            FROM sku_outbound 
            WHERE transaction_type = 'transfer' 
            AND status != 'cancelled'
        """)
        total_transfers = cur.fetchone()[0] or 0
        
        # Total sales
        cur.execute("""
            SELECT COUNT(*) 
            FROM sku_outbound 
            WHERE transaction_type = 'sales' 
            AND status != 'cancelled'
        """)
        total_sales = cur.fetchone()[0] or 0
        
        # Pending deliveries (confirmed or dispatched but not delivered)
        cur.execute("""
            SELECT COUNT(*) 
            FROM sku_outbound 
            WHERE status IN ('confirmed', 'dispatched')
        """)
        pending_deliveries = cur.fetchone()[0] or 0
        
        # Delivered today (based on dispatch_date)
        cur.execute("""
            SELECT COUNT(*) 
            FROM sku_outbound 
            WHERE status = 'delivered' 
            AND dispatch_date = %s
        """, (today_integer,))
        delivered_today = cur.fetchone()[0] or 0
        
        # Additional useful stats
        # Total value of sales this month
        today = datetime.now().date()
        first_day_of_month = datetime(today.year, today.month, 1).date()
        first_day_integer = parse_date(first_day_of_month.strftime('%Y-%m-%d'))
        
        cur.execute("""
            SELECT 
                COALESCE(SUM(o.subtotal), 0) as monthly_revenue,
                COALESCE(SUM(o.total_gst_amount), 0) as monthly_gst,
                COALESCE(SUM(oi.quantity_shipped), 0) as monthly_units_sold
            FROM sku_outbound o
            LEFT JOIN sku_outbound_items oi ON o.outbound_id = oi.outbound_id
            WHERE o.transaction_type = 'sales'
            AND o.status != 'cancelled'
            AND o.outbound_date >= %s
            AND o.outbound_date <= %s
        """, (first_day_integer, today_integer))
        monthly_stats = cur.fetchone()
        
        # Active customers (customers with transactions in last 30 days)
        thirty_days_ago = today_integer - 30  # Simple arithmetic since it's days
        cur.execute("""
            SELECT COUNT(DISTINCT customer_id)
            FROM sku_outbound
            WHERE customer_id IS NOT NULL
            AND status != 'cancelled'
            AND outbound_date >= %s
        """, (thirty_days_ago,))
        active_customers = cur.fetchone()[0] or 0
        
        # Locations with pending shipments
        cur.execute("""
            SELECT COUNT(DISTINCT COALESCE(to_location_id, ship_to_location_id))
            FROM sku_outbound
            WHERE status IN ('confirmed', 'dispatched')
        """)
        locations_pending = cur.fetchone()[0] or 0
        
        return jsonify({
            'success': True,
            'stats': {
                'totalTransfers': total_transfers,
                'totalSales': total_sales,
                'pendingDeliveries': pending_deliveries,
                'deliveredToday': delivered_today,
                'monthlyRevenue': float(monthly_stats[0]) if monthly_stats[0] else 0,
                'monthlyGSTCollected': float(monthly_stats[1]) if monthly_stats[1] else 0,
                'monthlyUnitsSold': int(monthly_stats[2]) if monthly_stats[2] else 0,
                'activeCustomers': active_customers,
                'locationsPending': locations_pending
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False, 
            'error': str(e),
            'stats': {
                'totalTransfers': 0,
                'totalSales': 0,
                'pendingDeliveries': 0,
                'deliveredToday': 0
            }
        }), 500
    finally:
        close_connection(conn, cur)


@sku_outbound_bp.route('/api/sku/outbound/sales-summary', methods=['GET'])
def get_sales_summary():
    """Get sales summary with GST and margin analysis"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get date range from parameters (DD-MM-YYYY format)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        customer_id = request.args.get('customer_id')
        
        query = """
            SELECT 
                c.customer_name,
                COUNT(DISTINCT o.outbound_id) as transaction_count,
                SUM(oi.quantity_shipped) as total_units,
                SUM(oi.item_weight_kg) as total_weight_kg,
                SUM(oi.transport_cost_per_unit * oi.quantity_shipped) as total_transport_allocated,
                SUM(oi.handling_cost_per_unit * oi.quantity_shipped) as total_handling_allocated,
                SUM(oi.base_price * oi.quantity_shipped) as total_revenue,
                SUM(oi.gst_amount * oi.quantity_shipped) as total_gst,
                SUM(oi.line_total) as total_sales_value
            FROM sku_outbound o
            JOIN customers c ON o.customer_id = c.customer_id
            JOIN sku_outbound_items oi ON o.outbound_id = oi.outbound_id
            WHERE o.transaction_type = 'sales'
                AND o.status != 'cancelled'
        """
        
        params = []
        
        if start_date:
            query += " AND o.outbound_date >= %s"
            params.append(parse_date(start_date))
        
        if end_date:
            query += " AND o.outbound_date <= %s"
            params.append(parse_date(end_date))
        
        if customer_id:
            query += " AND o.customer_id = %s"
            params.append(customer_id)
        
        query += " GROUP BY c.customer_name ORDER BY total_revenue DESC"
        
        cur.execute(query, params)
        
        sales_summary = []
        for row in cur.fetchall():
            sales_summary.append({
                'customer_name': row[0],
                'transaction_count': row[1],
                'total_units': int(row[2]) if row[2] else 0,
                'total_weight_kg': float(row[3]) if row[3] else 0,
                'logistics_costs': {
                    'transport': float(row[4]) if row[4] else 0,
                    'handling': float(row[5]) if row[5] else 0,
                    'total': (float(row[4] or 0) + float(row[5] or 0))
                },
                'revenue': float(row[6]) if row[6] else 0,  # Excluding GST
                'gst_collected': float(row[7]) if row[7] else 0,
                'total_sales_value': float(row[8]) if row[8] else 0,  # Including GST
                'cost_per_kg': ((float(row[4] or 0) + float(row[5] or 0)) / float(row[3])) if row[3] else 0
            })
        
        return jsonify({
            'success': True,
            'sales_summary': sales_summary,
            'count': len(sales_summary)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)
