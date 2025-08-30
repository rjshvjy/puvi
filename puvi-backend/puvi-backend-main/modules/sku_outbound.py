"""
File path: puvi-backend/puvi-backend-main/modules/sku_outbound.py
SKU Outbound Module for PUVI Oil Manufacturing System
Handles Internal Transfers, Third Party Transfers, and Sales transactions
Version: 2.0 - Enhanced with proper date formats, GST, and cost elements
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
            si.inventory_id,
            s.gst_rate
        FROM sku_expiry_tracking et
        JOIN sku_production p ON et.production_id = p.production_id
        JOIN sku_master s ON et.sku_id = s.sku_id
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
        tracking_id, prod_id, prod_code, sku_trace, expiry, qty_remaining, mrp, cost, inv_id, gst_rate = row
        
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
            'gst_rate': float(gst_rate) if gst_rate else 0,
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
        
        # Get SKU details including GST rate
        cur.execute("""
            SELECT sku_code, product_name, package_size, gst_rate
            FROM sku_master
            WHERE sku_id = %s
        """, (sku_id,))
        
        sku_data = cur.fetchone()
        if not sku_data:
            return jsonify({'success': False, 'error': 'SKU not found'}), 404
        
        # Check availability
        availability = check_sku_availability(
            sku_id, quantity_needed, from_location_id, cur
        )
        
        availability['sku_details'] = {
            'sku_code': sku_data[0],
            'product_name': sku_data[1],
            'package_size': sku_data[2],
            'gst_rate': float(sku_data[3]) if sku_data[3] else 0
        }
        
        return jsonify(availability)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@sku_outbound_bp.route('/api/sku/outbound/create', methods=['POST'])
def create_outbound():
    """Create outbound transaction with atomic operations and GST handling"""
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
            
            # Calculate totals for the entire outbound
            subtotal = Decimal('0')
            total_gst = Decimal('0')
            
            # Calculate subtotal and GST from items (for sales only)
            if transaction_type == 'sales':
                for item in data['items']:
                    if item.get('unit_price'):
                        amount = safe_decimal(item['quantity_ordered']) * safe_decimal(item['unit_price'])
                        subtotal += amount
                        
                        # Calculate GST if rate provided
                        if item.get('gst_rate'):
                            gst_amount = calculate_gst_amount(amount, item['gst_rate'])
                            total_gst += gst_amount
            
            # Add cost elements (loading, unloading, documentation, etc.)
            loading_charges = safe_decimal(data.get('loading_charges', 0))
            unloading_charges = safe_decimal(data.get('unloading_charges', 0))
            documentation_charges = safe_decimal(data.get('documentation_charges', 0))
            other_charges = safe_decimal(data.get('other_charges', 0))
            transport_cost = safe_decimal(data.get('transport_cost', 0))
            
            # Total outbound cost
            total_cost_elements = loading_charges + unloading_charges + documentation_charges + other_charges + transport_cost
            
            # For sales, total includes subtotal + GST + cost elements
            # For transfers, only cost elements
            if transaction_type == 'sales':
                grand_total = subtotal + total_gst + total_cost_elements
            else:
                grand_total = total_cost_elements
            
            # Create main outbound record with all cost elements
            cur.execute("""
                INSERT INTO sku_outbound (
                    outbound_code, transaction_type, from_location_id,
                    to_location_id, customer_id, ship_to_location_id,
                    customer_po_number, invoice_number, eway_bill_number,
                    outbound_date, dispatch_date,
                    transport_mode, transport_vendor, vehicle_number,
                    lr_number, transport_cost,
                    loading_charges, unloading_charges, documentation_charges, other_charges,
                    subtotal, total_gst_amount, grand_total,
                    status, notes, created_by
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s
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
                outbound_date,
                parse_date(data.get('dispatch_date')) if data.get('dispatch_date') else None,
                data.get('transport_mode'),
                data.get('transport_vendor'),
                data.get('vehicle_number'),
                data.get('lr_number'),
                float(transport_cost),
                float(loading_charges),
                float(unloading_charges),
                float(documentation_charges),
                float(other_charges),
                float(subtotal) if transaction_type == 'sales' else 0,
                float(total_gst) if transaction_type == 'sales' else 0,
                float(grand_total),
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
                
                # Get SKU GST rate if not provided
                if transaction_type == 'sales' and not item.get('gst_rate'):
                    cur.execute("SELECT gst_rate FROM sku_master WHERE sku_id = %s", (sku_id,))
                    result = cur.fetchone()
                    if result:
                        item['gst_rate'] = float(result[0]) if result[0] else 0
                
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
                line_total = None
                gst_amount = None
                
                if transaction_type == 'sales' and item.get('unit_price'):
                    base_amount = safe_decimal(item['unit_price']) * quantity_ordered
                    gst_amount = calculate_gst_amount(base_amount, item.get('gst_rate', 0))
                    line_total = base_amount + gst_amount
                
                # Insert outbound item with GST details
                cur.execute("""
                    INSERT INTO sku_outbound_items (
                        outbound_id, sku_id,
                        quantity_ordered, quantity_shipped,
                        allocation_data,
                        unit_price, gst_rate, gst_amount, line_total,
                        notes
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING item_id
                """, (
                    outbound_id,
                    sku_id,
                    quantity_ordered,
                    quantity_ordered,  # Initially shipped = ordered
                    json.dumps(allocation_data),
                    safe_decimal(item.get('unit_price')) if item.get('unit_price') else None,
                    safe_decimal(item.get('gst_rate', 0)) if transaction_type == 'sales' else None,
                    float(gst_amount) if gst_amount else None,
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
            
            return jsonify({
                'success': True,
                'outbound_id': outbound_id,
                'outbound_code': outbound_code,
                'grand_total': float(grand_total),
                'subtotal': float(subtotal) if transaction_type == 'sales' else None,
                'total_gst': float(total_gst) if transaction_type == 'sales' else None,
                'message': f'Outbound {outbound_code} created successfully'
            }), 201
            
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
            
    finally:
        close_connection(conn, cur)


@sku_outbound_bp.route('/api/sku/outbound/history', methods=['GET'])
def get_outbound_history():
    """Get outbound transaction history with filters"""
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
                o.loading_charges,
                o.unloading_charges,
                o.documentation_charges,
                o.other_charges,
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
                     o.status, o.transport_cost, o.loading_charges,
                     o.unloading_charges, o.documentation_charges, o.other_charges,
                     o.subtotal, o.total_gst_amount, o.grand_total, o.created_at
            ORDER BY o.outbound_date DESC, o.outbound_id DESC
            LIMIT %s OFFSET %s
        """
        params.extend([limit, offset])
        
        cur.execute(query, params)
        
        outbounds = []
        for row in cur.fetchall():
            # Calculate total cost elements
            total_cost_elements = (
                (float(row[10]) if row[10] else 0) +  # transport
                (float(row[11]) if row[11] else 0) +  # loading
                (float(row[12]) if row[12] else 0) +  # unloading
                (float(row[13]) if row[13] else 0) +  # documentation
                (float(row[14]) if row[14] else 0)    # other
            )
            
            outbounds.append({
                'outbound_id': row[0],
                'outbound_code': row[1],
                'transaction_type': row[2],
                'outbound_date': integer_to_date(row[3], '%d-%m-%Y'),  # DD-MM-YYYY format
                'dispatch_date': integer_to_date(row[4], '%d-%m-%Y') if row[4] else None,
                'from_location': row[5],
                'to_location': row[6],
                'customer_name': row[7],
                'ship_to_location': row[8],
                'status': row[9],
                'cost_elements': {
                    'transport': float(row[10]) if row[10] else 0,
                    'loading': float(row[11]) if row[11] else 0,
                    'unloading': float(row[12]) if row[12] else 0,
                    'documentation': float(row[13]) if row[13] else 0,
                    'other': float(row[14]) if row[14] else 0,
                    'total': total_cost_elements
                },
                'subtotal': float(row[15]) if row[15] else None,
                'total_gst': float(row[16]) if row[16] else None,
                'grand_total': float(row[17]) if row[17] else 0,
                'created_at': row[18].isoformat() if row[18] else None,
                'sku_count': row[19] or 0,
                'total_units': int(row[20]) if row[20] else 0
            })
        
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
    """Get detailed information for a specific outbound transaction"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get main outbound details with all cost elements
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
                o.transport_mode,
                o.transport_vendor,
                o.vehicle_number,
                o.lr_number,
                o.transport_cost,
                o.loading_charges,
                o.unloading_charges,
                o.documentation_charges,
                o.other_charges,
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
        
        # Get line items with SKU details and GST
        cur.execute("""
            SELECT 
                oi.item_id,
                s.sku_id,
                s.sku_code,
                s.product_name,
                s.package_size,
                oi.quantity_ordered,
                oi.quantity_shipped,
                oi.allocation_data,
                oi.unit_price,
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
                'quantity_ordered': row[5],
                'quantity_shipped': row[6],
                'allocations': row[7]['allocations'] if row[7] else [],
                'unit_price': float(row[8]) if row[8] else None,
                'gst_rate': float(row[9]) if row[9] else None,
                'gst_amount': float(row[10]) if row[10] else None,
                'line_total': float(row[11]) if row[11] else None,
                'notes': row[12]
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
                'customer_gst': outbound_data[28],
                'reference_documents': {
                    'customer_po': outbound_data[9],
                    'invoice': outbound_data[10],
                    'eway_bill': outbound_data[11]
                },
                'transport': {
                    'mode': outbound_data[12],
                    'vendor': outbound_data[13],
                    'vehicle_number': outbound_data[14],
                    'lr_number': outbound_data[15],
                    'cost': float(outbound_data[16]) if outbound_data[16] else 0
                },
                'cost_elements': {
                    'transport': float(outbound_data[16]) if outbound_data[16] else 0,
                    'loading': float(outbound_data[17]) if outbound_data[17] else 0,
                    'unloading': float(outbound_data[18]) if outbound_data[18] else 0,
                    'documentation': float(outbound_data[19]) if outbound_data[19] else 0,
                    'other': float(outbound_data[20]) if outbound_data[20] else 0
                },
                'financial_summary': {
                    'subtotal': float(outbound_data[21]) if outbound_data[21] else None,
                    'total_gst': float(outbound_data[22]) if outbound_data[22] else None,
                    'grand_total': float(outbound_data[23]) if outbound_data[23] else 0
                },
                'status': outbound_data[24],
                'notes': outbound_data[25],
                'created_by': outbound_data[26],
                'created_at': outbound_data[27].isoformat() if outbound_data[27] else None,
                'items': items
            }
        }
        
        # Add margin analysis for sales
        if outbound_data[1] == 'sales' and items:
            total_cost = sum(
                sum(a['production_cost'] * a['quantity'] for a in item['allocations'])
                for item in items
            )
            total_revenue = float(outbound_data[21]) if outbound_data[21] else 0
            
            response['outbound']['margin_analysis'] = {
                'total_production_cost': total_cost,
                'total_revenue_before_gst': total_revenue,
                'gross_margin': total_revenue - total_cost,
                'gross_margin_percentage': ((total_revenue - total_cost) / total_revenue * 100) if total_revenue > 0 else 0
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
                oi.gst_amount
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
                    movement['unit_price'] = float(row[11]) if row[11] else None
                    movement['gst_amount'] = float(row[12]) if row[12] else None
                
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
                SUM(o.subtotal) as total_sales,
                SUM(o.total_gst_amount) as total_gst,
                SUM(o.grand_total) as grand_total,
                SUM(o.transport_cost + o.loading_charges + o.unloading_charges + 
                    o.documentation_charges + o.other_charges) as total_logistics_cost
            FROM sku_outbound o
            JOIN customers c ON o.customer_id = c.customer_id
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
        
        query += " GROUP BY c.customer_name ORDER BY total_sales DESC"
        
        cur.execute(query, params)
        
        sales_summary = []
        for row in cur.fetchall():
            sales_summary.append({
                'customer_name': row[0],
                'transaction_count': row[1],
                'total_sales_before_gst': float(row[2]) if row[2] else 0,
                'total_gst': float(row[3]) if row[3] else 0,
                'grand_total': float(row[4]) if row[4] else 0,
                'total_logistics_cost': float(row[5]) if row[5] else 0
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
