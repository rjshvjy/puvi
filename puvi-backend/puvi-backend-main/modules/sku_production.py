"""
File path: puvi-backend/puvi-backend-main/modules/sku_production.py
SKU Production Module for PUVI Oil Manufacturing System
COMPLETE REPLACEMENT - Fixed SQL syntax error and removed duplicate code
Version: 2.5 - FIXED: SQL query completed, duplicates removed
"""

from flask import Blueprint, request, jsonify
from decimal import Decimal
from datetime import datetime
import json
from db_utils import get_db_connection, close_connection
from utils.date_utils import get_current_day_number, integer_to_date, parse_date, format_date_indian
from utils.validation import safe_decimal, validate_required_fields
from utils.expiry_utils import (
    calculate_expiry_date, 
    get_days_to_expiry, 
    get_expiry_status,
    validate_shelf_life,
    check_near_expiry_items,
    update_expiry_tracking,
    get_fefo_allocation,
    get_expiry_alert_summary
)

# Create Blueprint
sku_production_bp = Blueprint('sku_production', __name__)

# ============================================
# HELPER FUNCTION FOR VARIETY CODE EXTRACTION
# ============================================

def extract_variety_code_from_oil_source(oil_traceable_code):
    """
    Extract variety code from oil source traceable code.
    Based on exact formats from traceability.py
    
    Args:
        oil_traceable_code: Source oil traceable code
        
    Returns:
        str: Extracted variety code
    """
    if not oil_traceable_code:
        return 'XX'
    
    code_parts = oil_traceable_code.split('-')
    
    # Batch format with serial: GNO-K-1-05082025-PUV (5 parts)
    if len(code_parts) == 5:
        return code_parts[1]  # "K"
    
    # Older batch format: GNO-K-05082025-PUV (4 parts)
    elif len(code_parts) == 4:
        return code_parts[1]  # "K"
    
    # Blend format: GNOKU-07082025-PUV (3 parts)
    elif len(code_parts) == 3:
        # Skip first 3 chars (oil type) to get supplier codes
        if len(code_parts[0]) > 3:
            return code_parts[0][3:]  # "KU" from "GNOKU"
        else:
            return code_parts[0]  # Fallback to full code if too short
    
    # Unexpected format (like BATCH- codes which shouldn't be in traceable_code)
    else:
        print(f"WARNING: Unexpected traceable code format: {oil_traceable_code}")
        return 'ERR'

# ============================================
# MRP HISTORY MANAGEMENT
# ============================================

@sku_production_bp.route('/api/sku/mrp-history/<int:sku_id>', methods=['GET'])
def get_mrp_history(sku_id):
    """Get MRP change history for a SKU"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT 
                mrp_id,
                mrp_amount,
                effective_from,
                effective_to,
                changed_by,
                change_reason,
                is_current,
                created_at
            FROM sku_mrp_history
            WHERE sku_id = %s
            ORDER BY effective_from DESC
        """, (sku_id,))
        
        history = []
        for row in cur.fetchall():
            history.append({
                'mrp_id': row[0],
                'mrp_amount': float(row[1]),
                'effective_from': integer_to_date(row[2]) if row[2] else None,
                'effective_to': integer_to_date(row[3]) if row[3] else None,
                'changed_by': row[4],
                'change_reason': row[5],
                'is_current': row[6],
                'created_at': row[7].isoformat() if row[7] else None
            })
        
        return jsonify({
            'success': True,
            'mrp_history': history,
            'count': len(history)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@sku_production_bp.route('/api/sku/current-mrp/<int:sku_id>', methods=['GET'])
def get_current_mrp(sku_id):
    """Get current applicable MRP for a SKU"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        current_date = get_current_day_number()
        
        cur.execute("""
            SELECT 
                s.mrp_current,
                s.mrp_effective_date,
                h.mrp_amount,
                h.effective_from,
                h.changed_by,
                h.change_reason
            FROM sku_master s
            LEFT JOIN sku_mrp_history h ON s.sku_id = h.sku_id 
                AND h.is_current = true
            WHERE s.sku_id = %s
        """, (sku_id,))
        
        row = cur.fetchone()
        if not row:
            return jsonify({'success': False, 'error': 'SKU not found'}), 404
        
        return jsonify({
            'success': True,
            'current_mrp': {
                'mrp_amount': float(row[0]) if row[0] else 0,
                'effective_date': integer_to_date(row[1]) if row[1] else None,
                'from_history': float(row[2]) if row[2] else None,
                'history_effective_from': integer_to_date(row[3]) if row[3] else None,
                'last_changed_by': row[4],
                'last_change_reason': row[5]
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# ============================================
# PRODUCTION WITH MRP & EXPIRY - FIXED VERSION
# ============================================

@sku_production_bp.route('/api/sku/production', methods=['POST'])
def create_sku_production():
    """Create SKU production entry with MRP capture and expiry calculation"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['sku_id', 'bottles_produced', 'production_date', 
                          'packing_date', 'oil_allocations']
        is_valid, missing_fields = validate_required_fields(data, required_fields)
        
        if not is_valid:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        sku_id = data['sku_id']
        bottles_produced = int(data['bottles_produced'])
        production_date = parse_date(data['production_date'])
        packing_date = parse_date(data['packing_date'])
        oil_allocations = data['oil_allocations']
        
        cur.execute("BEGIN")
        
        # Get SKU details including MRP and shelf life
        cur.execute("""
            SELECT 
                s.package_size,
                s.density,
                s.mrp_current,
                s.shelf_life_months,
                b.bom_id,
                s.sku_code,
                s.product_name
            FROM sku_master s
            LEFT JOIN sku_bom_master b ON s.sku_id = b.sku_id AND b.is_current = true
            WHERE s.sku_id = %s
        """, (sku_id,))
        
        sku_data = cur.fetchone()
        if not sku_data:
            raise Exception("SKU not found")
        
        if not sku_data[4]:
            raise Exception("BOM not configured for this SKU")
        
        # Capture current MRP at production time
        mrp_at_production = float(sku_data[2]) if sku_data[2] else 0
        shelf_life_months = sku_data[3]
        package_size = sku_data[0]  # Store package_size for labor cost lookup
        
        # Calculate expiry date - ENSURE IT'S SAVED
        expiry_date = None
        if shelf_life_months:
            expiry_date = calculate_expiry_date(production_date, shelf_life_months)
            print(f"DEBUG: Calculated expiry_date = {expiry_date} (production_date={production_date} + {shelf_life_months} months)")
        
        # Generate production code
        cur.execute("""
            SELECT COUNT(*) + 1
            FROM sku_production
            WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
        """)
        seq_num = cur.fetchone()[0]
        production_code = f"SP-{seq_num:03d}-{datetime.now().year}"
        
        # Generate traceable code - FIXED EXTRACTION LOGIC
        first_allocation = oil_allocations[0]
        oil_traceable_code = first_allocation.get('traceable_code', '')
        
        # Extract variety code using improved function
        variety_codes = extract_variety_code_from_oil_source(oil_traceable_code)
        
        # Log for debugging
        print(f"DEBUG: Oil traceable code: {oil_traceable_code}")
        print(f"DEBUG: Extracted variety code: {variety_codes}")
        
        # Validate variety code
        if variety_codes in ['ERR', 'UNK', 'XX']:
            print(f"WARNING: Poor variety code extraction: {variety_codes} from {oil_traceable_code}")
        
        production_month = datetime.now().month
        
        # Get sequence number for this variety and month - FIXED SQL QUERY
        cur.execute("""
            SELECT COALESCE(MAX(
                CAST(SUBSTRING(traceable_code FROM '[0-9]{2}$') AS INTEGER)
            ), 0) + 1
            FROM sku_production
            WHERE traceable_code LIKE %s
            AND production_date >= %s
        """, (
            f"{variety_codes}{production_month}%",
            parse_date(f"{datetime.now().year}-04-01")  # Financial year start
        ))
        
        result = cur.fetchone()
        sequence = result[0] if result and result[0] else 1
        
        # Generate SKU traceable code
        traceable_code = f"{variety_codes}{production_month}{sequence:02d}"
        
        # Ensure it fits in database column (10 chars max)
        if len(traceable_code) > 10:
            print(f"WARNING: Traceable code too long: {traceable_code}, truncating")
            traceable_code = traceable_code[:10]
        
        print(f"DEBUG: Final SKU traceable code: {traceable_code}")
        
        # Calculate oil costs
        total_oil_quantity = sum(a['quantity_allocated'] for a in oil_allocations)
        weighted_oil_cost = sum(a['quantity_allocated'] * a.get('oil_cost_per_kg', 0) 
                               for a in oil_allocations) / total_oil_quantity if total_oil_quantity > 0 else 0
        oil_cost_total = total_oil_quantity * weighted_oil_cost
        
        # Calculate material costs
        cur.execute("""
            SELECT 
                bd.material_id,
                bd.quantity_per_unit,
                m.current_cost,
                m.material_name
            FROM sku_bom_details bd
            JOIN materials m ON bd.material_id = m.material_id
            WHERE bd.bom_id = %s
        """, (sku_data[4],))
        
        material_cost_total = 0
        material_consumptions = []
        
        for mat in cur.fetchall():
            quantity_used = float(mat[1]) * bottles_produced
            cost = quantity_used * float(mat[2])
            material_cost_total += cost
            
            material_consumptions.append({
                'material_id': mat[0],
                'material_name': mat[3],
                'planned_quantity': quantity_used,
                'actual_quantity': quantity_used,
                'material_cost_per_unit': float(mat[2]),
                'total_cost': cost
            })
        
        # ACTIVITY-BASED PACKING COST CALCULATION
        labor_cost_total = 0
        packing_costs_applied = []
        
        # Check if frontend sent packing_costs array (from CostCapture component)
        packing_costs = data.get('packing_costs', [])
        
        if packing_costs:
            # Use packing costs from frontend (with potential overrides)
            for packing_item in packing_costs:
                if packing_item.get('is_applied', False):
                    element_id = packing_item.get('element_id')
                    element_name = packing_item.get('element_name')
                    default_rate = float(packing_item.get('default_rate', 0))
                    override_rate = packing_item.get('override_rate')
                    
                    # Determine which rate to use
                    if override_rate is not None and override_rate != '':
                        rate_used = float(override_rate)
                        is_override = True
                        override_reason = packing_item.get('override_reason', 'Manual adjustment during production')
                    else:
                        rate_used = default_rate
                        is_override = False
                        override_reason = None
                    
                    # Calculate cost for this element
                    element_cost = rate_used * bottles_produced
                    labor_cost_total += element_cost
                    
                    # Track what was applied
                    packing_costs_applied.append({
                        'element_id': element_id,
                        'element_name': element_name,
                        'original_rate': default_rate,
                        'rate_used': rate_used,
                        'quantity': bottles_produced,
                        'total_cost': element_cost,
                        'is_override': is_override,
                        'override_reason': override_reason
                    })
        else:
            # Fallback: Fetch packing cost from database using activity-based approach
            cur.execute("""
                SELECT 
                    ce.element_id,
                    ce.element_name,
                    ce.default_rate,
                    ce.unit_type,
                    ce.calculation_method
                FROM cost_elements_master ce
                JOIN package_sizes_master ps ON ce.package_size_id = ps.size_id
                WHERE ps.size_code = %s
                    AND ce.activity = 'Packing'
                    AND ce.is_active = true
                    AND ce.calculation_method = 'per_unit'
                LIMIT 1
            """, (package_size,))
            
            labor_data = cur.fetchone()
            
            if labor_data:
                element_id = labor_data[0]
                element_name = labor_data[1]
                labor_rate_per_unit = float(labor_data[2])
                labor_cost_total = labor_rate_per_unit * bottles_produced
                
                packing_costs_applied.append({
                    'element_id': element_id,
                    'element_name': element_name,
                    'original_rate': labor_rate_per_unit,
                    'rate_used': labor_rate_per_unit,
                    'quantity': bottles_produced,
                    'total_cost': labor_cost_total,
                    'is_override': False,
                    'override_reason': None
                })
                
                print(f"Using cost element: {element_name} @ ₹{labor_rate_per_unit}/unit for {bottles_produced} bottles")
            else:
                # If no packing labor cost element found, use 0
                labor_rate_per_unit = 0
                labor_cost_total = 0
                print(f"Warning: No packing labor cost element found for package size {package_size}")
        
        # Calculate total costs
        total_production_cost = oil_cost_total + material_cost_total + labor_cost_total
        cost_per_bottle = total_production_cost / bottles_produced if bottles_produced > 0 else 0
        
        # Insert production record with MRP and expiry - ENSURE EXPIRY IS SAVED
        cur.execute("""
            INSERT INTO sku_production (
                production_code, traceable_code, sku_id, bom_id,
                production_date, packing_date, expiry_date, mrp_at_production,
                total_oil_quantity, weighted_oil_cost,
                bottles_planned, bottles_produced,
                oil_cost_total, material_cost_total, labor_cost_total,
                total_production_cost, cost_per_bottle,
                production_status, operator_name, shift_number,
                production_line, notes, created_by
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            ) RETURNING production_id, expiry_date
        """, (
            production_code, traceable_code, sku_id, sku_data[4],
            production_date, packing_date, expiry_date, mrp_at_production,
            total_oil_quantity, weighted_oil_cost,
            data.get('bottles_planned', bottles_produced), bottles_produced,
            oil_cost_total, material_cost_total, labor_cost_total,
            total_production_cost, cost_per_bottle,
            'completed', data.get('operator_name'), data.get('shift_number'),
            data.get('production_line'), data.get('notes'),
            data.get('created_by', 'System')
        ))
        
        result = cur.fetchone()
        production_id = result[0]
        saved_expiry_date = result[1]
        
        print(f"DEBUG: Production saved with ID={production_id}, expiry_date={saved_expiry_date}")
        
        # Save packing cost overrides if any
        for packing_cost in packing_costs_applied:
            if packing_cost['is_override']:
                cur.execute("""
                    INSERT INTO sku_cost_overrides (
                        production_id, element_id, element_name,
                        original_rate, override_rate, quantity,
                        reason, created_by
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    production_id,
                    packing_cost['element_id'],
                    packing_cost['element_name'],
                    packing_cost['original_rate'],
                    packing_cost['rate_used'],
                    packing_cost['quantity'],
                    packing_cost['override_reason'],
                    data.get('created_by', 'System')
                ))
        
        # Create expiry tracking record
        if expiry_date and shelf_life_months:
            tracking_id = update_expiry_tracking(
                conn, production_id, sku_id, production_date,
                expiry_date, bottles_produced
            )
            print(f"DEBUG: Created expiry tracking record ID={tracking_id}")
        
        # CREATE SKU INVENTORY RECORD - THIS WAS MISSING!
        cur.execute("""
            INSERT INTO sku_inventory (
                sku_id,
                production_id,
                quantity_available,
                mrp,
                status,
                expiry_date,
                created_at
            ) VALUES (%s, %s, %s, %s, 'active', %s, CURRENT_TIMESTAMP)
            RETURNING inventory_id
        """, (
            sku_id,
            production_id,
            bottles_produced,
            mrp_at_production,
            expiry_date
        ))
        
        inventory_id = cur.fetchone()[0]
        print(f"DEBUG: Created SKU inventory record ID={inventory_id} with {bottles_produced} bottles")
        
        # Insert oil allocations
        for allocation in oil_allocations:
            cur.execute("""
                INSERT INTO sku_oil_allocation (
                    production_id, source_type, source_id,
                    source_traceable_code, quantity_allocated,
                    oil_cost_per_kg, allocation_cost
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                production_id,
                allocation['source_type'],
                allocation['source_id'],
                allocation.get('traceable_code', ''),
                allocation['quantity_allocated'],
                allocation.get('oil_cost_per_kg', 0),
                allocation.get('allocation_cost', 0)
            ))
        
        # Insert material consumption
        for consumption in material_consumptions:
            cur.execute("""
                INSERT INTO sku_material_consumption (
                    production_id, material_id,
                    planned_quantity, actual_quantity,
                    material_cost_per_unit, total_cost
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                production_id,
                consumption['material_id'],
                consumption['planned_quantity'],
                consumption['actual_quantity'],
                consumption['material_cost_per_unit'],
                consumption['total_cost']
            ))
        
        conn.commit()
        
        # Calculate days to expiry if applicable
        days_to_expiry = None
        expiry_status = None
        if saved_expiry_date:
            days_to_expiry = get_days_to_expiry(saved_expiry_date)
            expiry_status = get_expiry_status(saved_expiry_date)
        
        # Get the first applied packing rate for response
        packing_rate_info = {}
        if packing_costs_applied:
            first_packing = packing_costs_applied[0]
            packing_rate_info = {
                'element_name': first_packing['element_name'],
                'rate_per_unit': first_packing['rate_used'],
                'was_override': first_packing['is_override']
            }
        
        return jsonify({
            'success': True,
            'production_id': production_id,
            'production_code': production_code,
            'traceable_code': traceable_code,
            'mrp_at_production': mrp_at_production,
            'expiry_date': integer_to_date(saved_expiry_date) if saved_expiry_date else None,
            'days_to_expiry': days_to_expiry,
            'expiry_status': expiry_status,
            'cost_summary': {
                'oil_cost': oil_cost_total,
                'material_cost': material_cost_total,
                'labor_cost': labor_cost_total,
                'packing_rate_info': packing_rate_info,
                'total_cost': total_production_cost,
                'cost_per_bottle': cost_per_bottle
            },
            'message': 'Production recorded successfully with MRP and expiry tracking'
        }), 201
        
    except Exception as e:
        conn.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# ============================================
# PRODUCTION HISTORY WITH EXPIRY
# ============================================

@sku_production_bp.route('/api/sku/production/history', methods=['GET'])
def get_production_history():
    """Get SKU production history with MRP and expiry details"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get filter parameters
        sku_id = request.args.get('sku_id')
        oil_type = request.args.get('oil_type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        expiry_status_filter = request.args.get('expiry_status')
        limit = int(request.args.get('limit', 50))
        
        query = """
            SELECT 
                p.production_id,
                p.production_code,
                p.traceable_code,
                p.production_date,
                p.packing_date,
                p.expiry_date,
                p.mrp_at_production,
                s.sku_code,
                s.product_name,
                s.oil_type,
                s.package_size,
                s.shelf_life_months,
                p.bottles_produced,
                p.total_oil_quantity,
                p.oil_cost_total,
                p.material_cost_total,
                p.labor_cost_total,
                p.total_production_cost,
                p.cost_per_bottle,
                p.operator_name,
                p.created_at,
                et.quantity_remaining,
                et.status as expiry_tracking_status
            FROM sku_production p
            JOIN sku_master s ON p.sku_id = s.sku_id
            LEFT JOIN sku_expiry_tracking et ON p.production_id = et.production_id
            WHERE 1=1
        """
        params = []
        
        if sku_id:
            query += " AND p.sku_id = %s"
            params.append(sku_id)
        
        if oil_type:
            query += " AND s.oil_type = %s"
            params.append(oil_type)
        
        if start_date:
            query += " AND p.production_date >= %s"
            params.append(parse_date(start_date))
        
        if end_date:
            query += " AND p.production_date <= %s"
            params.append(parse_date(end_date))
        
        if expiry_status_filter:
            query += " AND et.status = %s"
            params.append(expiry_status_filter)
        
        query += " ORDER BY p.production_date DESC, p.production_id DESC LIMIT %s"
        params.append(limit)
        
        cur.execute(query, params)
        
        productions = []
        for row in cur.fetchall():
            expiry_date = row[5]
            days_to_expiry = None
            expiry_status = None
            
            if expiry_date:
                days_to_expiry = get_days_to_expiry(expiry_date)
                expiry_status = get_expiry_status(expiry_date)
            
            productions.append({
                'production_id': row[0],
                'production_code': row[1],
                'traceable_code': row[2],
                'production_date': integer_to_date(row[3]),
                'packing_date': integer_to_date(row[4]),
                'expiry_date': integer_to_date(expiry_date) if expiry_date else None,
                'mrp_at_production': float(row[6]) if row[6] else None,
                'sku_code': row[7],
                'product_name': row[8],
                'oil_type': row[9],
                'package_size': row[10],
                'shelf_life_months': row[11],
                'bottles_produced': row[12],
                'total_oil_quantity': float(row[13]),
                'oil_cost': float(row[14]),
                'material_cost': float(row[15]),
                'labor_cost': float(row[16]),
                'total_cost': float(row[17]),
                'cost_per_bottle': float(row[18]),
                'operator_name': row[19],
                'created_at': row[20].isoformat() if row[20] else None,
                'quantity_remaining': float(row[21]) if row[21] else None,
                'expiry_tracking_status': row[22],
                'days_to_expiry': days_to_expiry,
                'expiry_status': expiry_status
            })
        
        return jsonify({
            'success': True,
            'productions': productions,
            'count': len(productions)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# ============================================
# EXPIRY MANAGEMENT
# ============================================

@sku_production_bp.route('/api/sku/expiry-alerts', methods=['GET'])
def get_expiry_alerts():
    """Get items nearing expiry with configurable threshold"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        days_threshold = int(request.args.get('days', 30))
        items = check_near_expiry_items(conn, days_threshold)
        
        # Format dates for display
        for item in items:
            item['expiry_date'] = integer_to_date(item['expiry_date'])
            item['expiry_status'] = get_expiry_status(item['days_to_expiry'])
        
        return jsonify({
            'success': True,
            'items': items,
            'count': len(items),
            'days_threshold': days_threshold
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@sku_production_bp.route('/api/sku/expiry-summary', methods=['GET'])
def get_expiry_summary():
    """Get summary of items by expiry status for dashboard"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        summary = get_expiry_alert_summary(conn)
        
        return jsonify({
            'success': True,
            'summary': summary,
            'categories': {
                'expired': 'Items past expiry date',
                'critical': 'Expiring within 30 days',
                'warning': 'Expiring within 60 days',
                'caution': 'Expiring within 90 days',
                'normal': 'More than 90 days to expiry'
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@sku_production_bp.route('/api/sku/fefo-allocation/<int:sku_id>', methods=['POST'])
def get_fefo_allocation_for_sku(sku_id):
    """Get FEFO (First Expiry First Out) allocation for SKU sales"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        quantity_needed = data.get('quantity_needed')
        
        if not quantity_needed:
            return jsonify({
                'success': False,
                'error': 'quantity_needed is required'
            }), 400
        
        result = get_fefo_allocation(conn, sku_id, quantity_needed)
        
        # Format dates in allocations
        for allocation in result.get('allocations', []):
            allocation['expiry_date'] = integer_to_date(allocation['expiry_date'])
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# ============================================
# PRODUCTION SUMMARY REPORT
# ============================================

@sku_production_bp.route('/api/sku/production-summary/<int:production_id>', methods=['GET'])
def get_production_summary_report(production_id):
    """Get printable production summary report for regulatory filing"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get production details
        cur.execute("""
            SELECT 
                p.production_code,
                p.traceable_code,
                p.production_date,
                p.packing_date,
                p.expiry_date,
                p.mrp_at_production,
                s.sku_code,
                s.product_name,
                s.oil_type,
                s.package_size,
                s.shelf_life_months,
                p.bottles_planned,
                p.bottles_produced,
                p.total_oil_quantity,
                p.operator_name,
                p.shift_number,
                p.production_line,
                p.production_status,
                p.quality_check_by,
                p.notes,
                p.oil_cost_total,
                p.material_cost_total,
                p.labor_cost_total,
                p.total_production_cost,
                p.cost_per_bottle
            FROM sku_production p
            JOIN sku_master s ON p.sku_id = s.sku_id
            WHERE p.production_id = %s
        """, (production_id,))
        
        prod_data = cur.fetchone()
        if not prod_data:
            return jsonify({'success': False, 'error': 'Production not found'}), 404
        
        # Get oil allocations with FULL traceability
        cur.execute("""
            SELECT 
                oa.source_type,
                oa.source_id,
                oa.source_traceable_code,
                oa.quantity_allocated,
                oa.oil_cost_per_kg,
                CASE 
                    WHEN oa.source_type = 'batch' THEN b.batch_code
                    WHEN oa.source_type = 'blend' THEN bl.blend_code
                END as source_code,
                CASE 
                    WHEN oa.source_type = 'batch' THEN b.oil_type
                    WHEN oa.source_type = 'blend' THEN 'Blended'
                END as oil_type
            FROM sku_oil_allocation oa
            LEFT JOIN batch b ON oa.source_type = 'batch' AND oa.source_id = b.batch_id
            LEFT JOIN blend_batches bl ON oa.source_type = 'blend' AND oa.source_id = bl.blend_id
            WHERE oa.production_id = %s
            ORDER BY oa.allocation_id
        """, (production_id,))

        oil_sources = []
        for row in cur.fetchall():
            source_type = row[0]
            source_id = row[1]
            
            # Build complete traceability chain
            traceability_chain = []
            
            if source_type == 'batch':
                # Get batch details including seed source
                cur.execute("""
                    SELECT 
                        b.batch_code,
                        b.traceable_code,
                        b.oil_yield,
                        b.seed_material_id,
                        b.seed_quantity_before_drying,
                        b.seed_purchase_code,
                        m.material_name as seed_name,
                        s.supplier_name
                    FROM batch b
                    LEFT JOIN materials m ON b.seed_material_id = m.material_id
                    LEFT JOIN purchases p ON p.traceable_code = b.seed_purchase_code
                    LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
                    WHERE b.batch_id = %s
                """, (source_id,))
                
                batch_data = cur.fetchone()
                if batch_data:
                    traceability_chain.append({
                        'level': 'seed_purchase',
                        'code': batch_data[5],  # seed_purchase_code
                        'description': f"Seed: {batch_data[6]} from {batch_data[7] or 'Unknown Supplier'}",
                        'quantity': f"{batch_data[4]} kg seeds"
                    })
                    traceability_chain.append({
                        'level': 'batch',
                        'code': batch_data[1],  # traceable_code
                        'description': f"Batch: {batch_data[0]}",
                        'quantity': f"{batch_data[2]} kg oil produced"
                    })
            
            elif source_type == 'blend':
                # Get blend components
                cur.execute("""
                    SELECT 
                        bbc.batch_id,
                        bbc.quantity_used,
                        bbc.percentage,
                        b.batch_code,
                        b.traceable_code,
                        b.seed_purchase_code,
                        b.seed_quantity_before_drying,
                        m.material_name as seed_name
                    FROM blend_batch_components bbc
                    JOIN batch b ON bbc.batch_id = b.batch_id
                    LEFT JOIN materials m ON b.seed_material_id = m.material_id
                    WHERE bbc.blend_id = %s
                    ORDER BY bbc.percentage DESC
                """, (source_id,))
                
                blend_components = cur.fetchall()
                
                # Add seed sources for each batch in blend
                seed_sources = []
                for comp in blend_components:
                    seed_sources.append({
                        'seed_code': comp[5],
                        'seed_name': comp[7],
                        'batch_code': comp[4],
                        'percentage': float(comp[2])
                    })
                
                # Group by seed purchase if multiple batches from same seed
                seed_groups = {}
                for src in seed_sources:
                    if src['seed_code'] not in seed_groups:
                        seed_groups[src['seed_code']] = {
                            'code': src['seed_code'],
                            'name': src['seed_name'],
                            'batches': [],
                            'total_percentage': 0
                        }
                    seed_groups[src['seed_code']]['batches'].append(src['batch_code'])
                    seed_groups[src['seed_code']]['total_percentage'] += src['percentage']
                
                # Add to traceability chain
                for seed_code, seed_info in seed_groups.items():
                    traceability_chain.append({
                        'level': 'seed_purchase',
                        'code': seed_code,
                        'description': f"Seed: {seed_info['name']}",
                        'quantity': f"{seed_info['total_percentage']:.1f}% of blend"
                    })
                    for batch_code in seed_info['batches']:
                        traceability_chain.append({
                            'level': 'batch',
                            'code': batch_code,
                            'description': f"Batch from above seed",
                            'quantity': ""
                        })
                
                traceability_chain.append({
                    'level': 'blend',
                    'code': row[2],  # blend traceable_code
                    'description': f"Blended oil from {len(blend_components)} batches",
                    'quantity': f"{float(row[3])} kg used"
                })
            
            oil_sources.append({
                'source_type': row[0],
                'traceable_code': row[2],
                'quantity_kg': float(row[3]),
                'cost_per_kg': float(row[4]),
                'source_code': row[5],
                'oil_type': row[6],
                'traceability_chain': traceability_chain  # NEW: Full chain
            })
        
        # Get materials consumed
        cur.execute("""
            SELECT 
                m.material_name,
                mc.planned_quantity,
                mc.actual_quantity,
                mc.variance_quantity,
                m.unit
            FROM sku_material_consumption mc
            JOIN materials m ON mc.material_id = m.material_id
            WHERE mc.production_id = %s
            ORDER BY m.material_name
        """, (production_id,))
        
        materials_used = []
        for row in cur.fetchall():
            materials_used.append({
                'material_name': row[0],
                'planned_qty': float(row[1]),
                'actual_qty': float(row[2]),
                'variance': float(row[3]) if row[3] else 0,
                'unit': row[4]
            })
        
        # Calculate expiry details
        expiry_date = prod_data[4]
        days_to_expiry = None
        expiry_status = None
        
        if expiry_date:
            days_to_expiry = get_days_to_expiry(expiry_date)
            expiry_status = get_expiry_status(expiry_date)
        
        # Build summary report
        summary = {
            'report_type': 'SKU Production Summary',
            'generated_at': datetime.now().isoformat(),
            
            'production_details': {
                'production_code': prod_data[0],
                'traceable_code': prod_data[1],
                'production_date': format_date_indian(prod_data[2]),
                'packing_date': format_date_indian(prod_data[3]),
                'shift': prod_data[15] or 'N/A',
                'production_line': prod_data[16] or 'N/A',
                'operator': prod_data[14] or 'N/A'
            },
            
            'product_details': {
                'sku_code': prod_data[6],
                'product_name': prod_data[7],
                'oil_type': prod_data[8],
                'package_size': prod_data[9],
                'mrp': f"₹{prod_data[5]:.2f}" if prod_data[5] else 'N/A',
                'shelf_life_months': prod_data[10],
                'bottles_planned': prod_data[11],
                'bottles_produced': prod_data[12],
                'total_oil_used_kg': float(prod_data[13])
            },
            
            'expiry_details': {
                'expiry_date': format_date_indian(expiry_date) if expiry_date else 'N/A',
                'days_to_expiry': days_to_expiry,
                'status': expiry_status or 'N/A'
            },
            
            'oil_traceability': oil_sources,
            'materials_consumed': materials_used,
            
            'quality_control': {
                'status': prod_data[17] or 'completed',
                'checked_by': prod_data[18] or 'N/A'
            },
            
            'cost_breakdown': {
                'oil_cost': float(prod_data[20]),
                'material_cost': float(prod_data[21]),
                'packing_cost': float(prod_data[22]),
                'total_cost': float(prod_data[23]),
                'cost_per_bottle': float(prod_data[24])
            },
            
            'notes': prod_data[19] or '',
            
            'approval_section': {
                'production_approved_by': '________________',
                'quality_approved_by': '________________',
                'warehouse_received_by': '________________'
            }
        }
        
        return jsonify({
            'success': True,
            'summary': summary
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# ============================================
# PRODUCTION PLANNING
# ============================================

@sku_production_bp.route('/api/sku/production/plan', methods=['POST'])
def create_production_plan():
    """Create production plan and check oil availability"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['sku_id', 'bottles_planned', 'production_date']
        is_valid, missing_fields = validate_required_fields(data, required_fields)
        
        if not is_valid:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        sku_id = data['sku_id']
        bottles_planned = int(data['bottles_planned'])
        production_date = parse_date(data['production_date'])
        
        # Get SKU details including MRP and shelf life
        cur.execute("""
            SELECT 
                s.sku_code,
                s.product_name,
                s.oil_type,
                s.package_size,
                s.density,
                s.mrp_current,
                s.shelf_life_months,
                b.bom_id
            FROM sku_master s
            LEFT JOIN sku_bom_master b ON s.sku_id = b.sku_id AND b.is_current = true
            WHERE s.sku_id = %s
        """, (sku_id,))
        
        sku_data = cur.fetchone()
        if not sku_data:
            return jsonify({'success': False, 'error': 'SKU not found'}), 404
        
        if not sku_data[7]:
            return jsonify({'success': False, 'error': 'BOM not configured for this SKU'}), 400
        
        package_size = sku_data[3]
        
        # Calculate expiry date
        expiry_date = None
        days_to_expiry = None
        if sku_data[6]:  # shelf_life_months
            expiry_date = calculate_expiry_date(production_date, sku_data[6])
            days_to_expiry = get_days_to_expiry(expiry_date)
        
        # Calculate oil requirement
        size_in_liters = float(package_size.replace('ml', '').replace('L', ''))
        if 'ml' in package_size:
            size_in_liters = size_in_liters / 1000
        
        oil_per_bottle = size_in_liters * float(sku_data[4])  # kg
        total_oil_required = oil_per_bottle * bottles_planned
        
        # Get packing cost element using activity-based approach
        cur.execute("""
            SELECT 
                ce.element_id,
                ce.element_name,
                ce.default_rate,
                ce.unit_type,
                ce.calculation_method
            FROM cost_elements_master ce
            JOIN package_sizes_master ps ON ce.package_size_id = ps.size_id
            WHERE ps.size_code = %s
                AND ce.activity = 'Packing'
                AND ce.is_active = true
                AND ce.calculation_method = 'per_unit'
            LIMIT 1
        """, (package_size,))
        
        labor_element = cur.fetchone()
        packing_cost_per_unit = 0
        packing_element_name = None
        
        if labor_element:
            packing_element_name = labor_element[1]
            packing_cost_per_unit = float(labor_element[2])
        
        # Check oil availability
        oil_type = sku_data[2]
        
        cur.execute("""
            SELECT 
                'batch' as source_type,
                b.batch_id as source_id,
                b.batch_code,
                b.traceable_code,
                (b.oil_yield - COALESCE(SUM(oa.quantity_allocated), 0)) as available_qty,
                b.oil_cost_per_kg,
                b.production_date
            FROM batch b
            LEFT JOIN sku_oil_allocation oa ON b.batch_id = oa.source_id 
                AND oa.source_type = 'batch'
            WHERE b.oil_type = %s
            GROUP BY b.batch_id, b.batch_code, b.traceable_code, 
                     b.oil_yield, b.oil_cost_per_kg, b.production_date
            HAVING (b.oil_yield - COALESCE(SUM(oa.quantity_allocated), 0)) > 0
            
            UNION ALL
            
            SELECT 
                'blend' as source_type,
                bl.blend_id as source_id,
                bl.blend_code,
                bl.traceable_code,
                (bl.total_quantity - COALESCE(SUM(oa.quantity_allocated), 0)) as available_qty,
                bl.weighted_avg_cost as oil_cost_per_kg,
                bl.blend_date as production_date
            FROM blend_batches bl
            LEFT JOIN sku_oil_allocation oa ON bl.blend_id = oa.source_id 
                AND oa.source_type = 'blend'
            WHERE EXISTS (
                SELECT 1 FROM blend_batch_components bbc 
                WHERE bbc.blend_id = bl.blend_id 
                AND bbc.oil_type = %s
            )
            GROUP BY bl.blend_id, bl.blend_code, bl.traceable_code, 
                     bl.total_quantity, bl.weighted_avg_cost, bl.blend_date
            HAVING (bl.total_quantity - COALESCE(SUM(oa.quantity_allocated), 0)) > 0
            
            ORDER BY production_date
        """, (oil_type, oil_type))
        
        available_sources = []
        total_available = 0
        
        for row in cur.fetchall():
            available_sources.append({
                'source_type': row[0],
                'source_id': row[1],
                'source_code': row[2],
                'traceable_code': row[3],
                'available_qty': float(row[4]),
                'oil_cost_per_kg': float(row[5]),
                'production_date': integer_to_date(row[6])
            })
            total_available += float(row[4])
        
        # Check material availability
        cur.execute("""
            SELECT 
                m.material_name,
                bd.quantity_per_unit,
                bd.quantity_per_unit * %s as required_qty,
                COALESCE(i.closing_stock, 0) as available_stock,
                m.unit
            FROM sku_bom_details bd
            JOIN materials m ON bd.material_id = m.material_id
            LEFT JOIN inventory i ON m.material_id = i.material_id
            WHERE bd.bom_id = %s
        """, (bottles_planned, sku_data[7]))
        
        material_requirements = []
        materials_available = True
        
        for row in cur.fetchall():
            required = float(row[2])
            available = float(row[3])
            is_available = available >= required
            
            material_requirements.append({
                'material_name': row[0],
                'quantity_per_unit': float(row[1]),
                'required_qty': required,
                'available_stock': available,
                'unit': row[4],
                'is_available': is_available
            })
            
            if not is_available:
                materials_available = False
        
        return jsonify({
            'success': True,
            'production_plan': {
                'sku_code': sku_data[0],
                'product_name': sku_data[1],
                'bottles_planned': bottles_planned,
                'mrp_current': float(sku_data[5]) if sku_data[5] else None,
                'shelf_life_months': sku_data[6],
                'expected_expiry_date': integer_to_date(expiry_date) if expiry_date else None,
                'days_to_expiry_from_production': days_to_expiry,
                'oil_requirement': {
                    'per_bottle_kg': oil_per_bottle,
                    'total_required_kg': total_oil_required,
                    'total_available_kg': total_available,
                    'is_sufficient': total_available >= total_oil_required
                },
                'oil_sources': available_sources,
                'material_requirements': material_requirements,
                'materials_available': materials_available,
                'packing_cost': {
                    'element_name': packing_element_name or 'Not configured',
                    'cost_per_unit': packing_cost_per_unit,
                    'total_cost': packing_cost_per_unit * bottles_planned
                },
                'can_proceed': (total_available >= total_oil_required) and materials_available
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# ============================================
# OIL ALLOCATION
# ============================================

@sku_production_bp.route('/api/sku/production/allocate-oil', methods=['POST'])
def allocate_oil_for_production():
    """Allocate oil from batches/blends using FIFO"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        sku_id = data['sku_id']
        quantity_required = safe_decimal(data['quantity_required'])
        
        # Get oil type for SKU
        cur.execute("SELECT oil_type FROM sku_master WHERE sku_id = %s", (sku_id,))
        oil_type = cur.fetchone()[0]
        
        # Get available sources (FIFO order)
        cur.execute("""
            WITH available_oil AS (
                SELECT 
                    'batch' as source_type,
                    b.batch_id as source_id,
                    b.traceable_code,
                    b.production_date,
                    (b.oil_yield - COALESCE(SUM(oa.quantity_allocated), 0)) as available_qty,
                    b.oil_cost_per_kg
                FROM batch b
                LEFT JOIN sku_oil_allocation oa ON b.batch_id = oa.source_id 
                    AND oa.source_type = 'batch'
                WHERE b.oil_type = %s
                GROUP BY b.batch_id, b.traceable_code, b.oil_yield, 
                         b.oil_cost_per_kg, b.production_date
                HAVING (b.oil_yield - COALESCE(SUM(oa.quantity_allocated), 0)) > 0
                
                UNION ALL
                
                SELECT 
                    'blend' as source_type,
                    bl.blend_id as source_id,
                    bl.traceable_code,
                    bl.blend_date as production_date,
                    (bl.total_quantity - COALESCE(SUM(oa.quantity_allocated), 0)) as available_qty,
                    bl.weighted_avg_cost as oil_cost_per_kg
                FROM blend_batches bl
                LEFT JOIN sku_oil_allocation oa ON bl.blend_id = oa.source_id 
                    AND oa.source_type = 'blend'
                WHERE EXISTS (
                    SELECT 1 FROM blend_batch_components bbc 
                    WHERE bbc.blend_id = bl.blend_id 
                    AND bbc.oil_type = %s
                )
                GROUP BY bl.blend_id, bl.traceable_code, bl.total_quantity, 
                         bl.weighted_avg_cost, bl.blend_date
                HAVING (bl.total_quantity - COALESCE(SUM(oa.quantity_allocated), 0)) > 0
            )
            SELECT * FROM available_oil
            ORDER BY production_date  -- FIFO
        """, (oil_type, oil_type))
        
        allocations = []
        remaining_qty = quantity_required
        total_cost = Decimal('0')
        
        for row in cur.fetchall():
            if remaining_qty <= 0:
                break
            
            source_type = row[0]
            source_id = row[1]
            traceable_code = row[2]
            available = Decimal(str(row[4]))
            cost_per_kg = Decimal(str(row[5]))
            
            # Calculate allocation
            allocation_qty = min(remaining_qty, available)
            allocation_cost = allocation_qty * cost_per_kg
            
            allocations.append({
                'source_type': source_type,
                'source_id': source_id,
                'traceable_code': traceable_code,
                'quantity_allocated': float(allocation_qty),
                'oil_cost_per_kg': float(cost_per_kg),
                'allocation_cost': float(allocation_cost)
            })
            
            total_cost += allocation_cost
            remaining_qty -= allocation_qty
        
        if remaining_qty > 0:
            return jsonify({
                'success': False,
                'error': f'Insufficient oil. Short by {float(remaining_qty)} kg'
            }), 400
        
        # Calculate weighted average cost
        weighted_cost = total_cost / quantity_required
        
        return jsonify({
            'success': True,
            'allocations': allocations,
            'total_quantity': float(quantity_required),
            'weighted_oil_cost': float(weighted_cost),
            'total_oil_cost': float(total_cost)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)
