# File Path: puvi-backend/modules/sku_production.py
"""
SKU Production Module for PUVI Oil Manufacturing System
Enhanced with MRP and Expiry Date Management
Version: 2.0 - Includes MRP tracking, expiry calculations, and production reports
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
# SKU MASTER MANAGEMENT WITH MRP & SHELF LIFE
# ============================================

@sku_production_bp.route('/api/sku/master', methods=['GET'])
def get_sku_master_list():
    """Get list of all SKUs with MRP and shelf life"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        query = """
            SELECT 
                s.sku_id,
                s.sku_code,
                s.product_name,
                s.oil_type,
                s.package_size,
                s.density,
                s.mrp_current,
                s.shelf_life_months,
                s.mrp_effective_date,
                s.is_active,
                s.created_at,
                h.mrp_amount as latest_mrp,
                h.effective_from,
                h.changed_by
            FROM sku_master s
            LEFT JOIN sku_mrp_history h ON s.sku_id = h.sku_id AND h.is_current = true
            WHERE s.is_active = true
            ORDER BY s.sku_code
        """
        
        cur.execute(query)
        
        skus = []
        for row in cur.fetchall():
            skus.append({
                'sku_id': row[0],
                'sku_code': row[1],
                'product_name': row[2],
                'oil_type': row[3],
                'package_size': row[4],
                'density': float(row[5]) if row[5] else 1.0,
                'mrp_current': float(row[6]) if row[6] else 0,
                'shelf_life_months': row[7],
                'mrp_effective_date': integer_to_date(row[8]) if row[8] else None,
                'is_active': row[9],
                'created_at': row[10].isoformat() if row[10] else None,
                'latest_mrp': float(row[11]) if row[11] else None,
                'mrp_effective_from': integer_to_date(row[12]) if row[12] else None,
                'mrp_changed_by': row[13]
            })
        
        return jsonify({
            'success': True,
            'skus': skus,
            'count': len(skus)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@sku_production_bp.route('/api/sku/master/<int:sku_id>', methods=['GET'])
def get_sku_master_details(sku_id):
    """Get specific SKU details with MRP and shelf life"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT 
                s.sku_id,
                s.sku_code,
                s.product_name,
                s.oil_type,
                s.package_size,
                s.density,
                s.mrp_current,
                s.shelf_life_months,
                s.mrp_effective_date,
                s.is_active,
                s.created_at,
                s.updated_at
            FROM sku_master s
            WHERE s.sku_id = %s
        """, (sku_id,))
        
        row = cur.fetchone()
        if not row:
            return jsonify({'success': False, 'error': 'SKU not found'}), 404
        
        sku_details = {
            'sku_id': row[0],
            'sku_code': row[1],
            'product_name': row[2],
            'oil_type': row[3],
            'package_size': row[4],
            'density': float(row[5]) if row[5] else 1.0,
            'mrp_current': float(row[6]) if row[6] else 0,
            'shelf_life_months': row[7],
            'mrp_effective_date': integer_to_date(row[8]) if row[8] else None,
            'is_active': row[9],
            'created_at': row[10].isoformat() if row[10] else None,
            'updated_at': row[11].isoformat() if row[11] else None
        }
        
        return jsonify({
            'success': True,
            'sku': sku_details
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@sku_production_bp.route('/api/sku/master', methods=['POST'])
def create_sku_master():
    """Create new SKU with MRP and shelf life"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        required_fields = ['sku_code', 'product_name', 'oil_type', 'package_size', 
                          'mrp_current', 'shelf_life_months']
        is_valid, missing_fields = validate_required_fields(data, required_fields)
        
        if not is_valid:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        # Validate shelf life
        is_valid_shelf, error_msg = validate_shelf_life(data['shelf_life_months'])
        if not is_valid_shelf:
            return jsonify({'success': False, 'error': error_msg}), 400
        
        cur.execute("BEGIN")
        
        # Insert SKU master
        cur.execute("""
            INSERT INTO sku_master (
                sku_code, product_name, oil_type, package_size,
                density, mrp_current, shelf_life_months,
                mrp_effective_date, is_active
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING sku_id
        """, (
            data['sku_code'],
            data['product_name'],
            data['oil_type'],
            data['package_size'],
            data.get('density', 1.0),
            data['mrp_current'],
            data['shelf_life_months'],
            parse_date(data.get('mrp_effective_date', datetime.now())),
            data.get('is_active', True)
        ))
        
        sku_id = cur.fetchone()[0]
        
        # Create initial MRP history entry
        cur.execute("""
            INSERT INTO sku_mrp_history (
                sku_id, mrp_amount, effective_from,
                changed_by, change_reason, is_current
            ) VALUES (%s, %s, %s, %s, %s, true)
        """, (
            sku_id,
            data['mrp_current'],
            parse_date(data.get('mrp_effective_date', datetime.now())),
            data.get('created_by', 'System'),
            'Initial MRP setup'
        ))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'sku_id': sku_id,
            'message': 'SKU created successfully with MRP and shelf life'
        }), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@sku_production_bp.route('/api/sku/master/<int:sku_id>', methods=['PUT'])
def update_sku_master(sku_id):
    """Update SKU master including MRP changes"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        cur.execute("BEGIN")
        
        # Get current MRP for comparison
        cur.execute("""
            SELECT mrp_current, shelf_life_months
            FROM sku_master
            WHERE sku_id = %s
        """, (sku_id,))
        
        current_data = cur.fetchone()
        if not current_data:
            return jsonify({'success': False, 'error': 'SKU not found'}), 404
        
        current_mrp = float(current_data[0]) if current_data[0] else 0
        new_mrp = data.get('mrp_current')
        
        # Update SKU master
        update_fields = []
        update_values = []
        
        if 'product_name' in data:
            update_fields.append("product_name = %s")
            update_values.append(data['product_name'])
        
        if 'shelf_life_months' in data:
            is_valid_shelf, error_msg = validate_shelf_life(data['shelf_life_months'])
            if not is_valid_shelf:
                return jsonify({'success': False, 'error': error_msg}), 400
            update_fields.append("shelf_life_months = %s")
            update_values.append(data['shelf_life_months'])
        
        if new_mrp is not None and new_mrp != current_mrp:
            update_fields.append("mrp_current = %s")
            update_values.append(new_mrp)
            
            if 'mrp_effective_date' in data:
                update_fields.append("mrp_effective_date = %s")
                update_values.append(parse_date(data['mrp_effective_date']))
        
        if 'is_active' in data:
            update_fields.append("is_active = %s")
            update_values.append(data['is_active'])
        
        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        update_values.append(sku_id)
        
        query = f"""
            UPDATE sku_master
            SET {', '.join(update_fields)}
            WHERE sku_id = %s
        """
        
        cur.execute(query, update_values)
        
        # If MRP changed, create history entry
        if new_mrp is not None and new_mrp != current_mrp:
            # Mark previous MRP as not current
            cur.execute("""
                UPDATE sku_mrp_history
                SET is_current = false,
                    effective_to = %s
                WHERE sku_id = %s AND is_current = true
            """, (
                parse_date(data.get('mrp_effective_date', datetime.now())) - 1,
                sku_id
            ))
            
            # Insert new MRP history
            cur.execute("""
                INSERT INTO sku_mrp_history (
                    sku_id, mrp_amount, effective_from,
                    changed_by, change_reason, is_current
                ) VALUES (%s, %s, %s, %s, %s, true)
            """, (
                sku_id,
                new_mrp,
                parse_date(data.get('mrp_effective_date', datetime.now())),
                data.get('changed_by', 'System'),
                data.get('change_reason', 'MRP Update')
            ))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'SKU updated successfully'
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


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
# PRODUCTION WITH MRP & EXPIRY
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
                b.bom_id
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
        
        # Calculate expiry date
        expiry_date = None
        if shelf_life_months:
            expiry_date = calculate_expiry_date(production_date, shelf_life_months)
        
        # Generate production code
        cur.execute("""
            SELECT COUNT(*) + 1
            FROM sku_production
            WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
        """)
        seq_num = cur.fetchone()[0]
        production_code = f"SP-{seq_num:03d}-{datetime.now().year}"
        
        # Generate traceable code
        first_allocation = oil_allocations[0]
        oil_traceable_code = first_allocation['traceable_code']
        production_month = datetime.now().month
        
        # Extract variety codes
        code_parts = oil_traceable_code.split('-')
        if len(code_parts) == 4:
            variety_codes = code_parts[1]
        else:
            variety_codes = code_parts[0][3:]
        
        # Get sequence number
        cur.execute("""
            SELECT COALESCE(MAX(
                CAST(SUBSTRING(traceable_code FROM '[0-9]{2}$') AS INTEGER)
            ), 0) + 1
            FROM sku_production
            WHERE traceable_code LIKE %s
            AND production_date >= %s
        """, (
            f"{variety_codes}{production_month}%",
            int(f"{datetime.now().year}0401")
        ))
        
        sequence = cur.fetchone()[0]
        traceable_code = f"{variety_codes}{production_month}{sequence:02d}"
        
        # Calculate costs
        total_oil_quantity = sum(a['quantity_allocated'] for a in oil_allocations)
        weighted_oil_cost = sum(a['quantity_allocated'] * a['oil_cost_per_kg'] 
                               for a in oil_allocations) / total_oil_quantity
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
        
        # Get labor cost
        cur.execute("""
            SELECT default_rate
            FROM cost_elements_master
            WHERE element_name LIKE %s
            AND active = true
        """, (f'Packing Labour {sku_data[0]}%',))
        
        labor_rate = cur.fetchone()
        labor_cost_total = float(labor_rate[0] if labor_rate else 0) * bottles_produced
        
        # Calculate total costs
        total_production_cost = oil_cost_total + material_cost_total + labor_cost_total
        cost_per_bottle = total_production_cost / bottles_produced
        
        # Insert production record with MRP and expiry
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
            ) RETURNING production_id
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
        
        production_id = cur.fetchone()[0]
        
        # Create expiry tracking record
        if expiry_date and shelf_life_months:
            tracking_id = update_expiry_tracking(
                conn, production_id, sku_id, production_date,
                expiry_date, bottles_produced
            )
        
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
                allocation['traceable_code'],
                allocation['quantity_allocated'],
                allocation['oil_cost_per_kg'],
                allocation['allocation_cost']
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
        if expiry_date:
            days_to_expiry = get_days_to_expiry(expiry_date)
            expiry_status = get_expiry_status(expiry_date)
        
        return jsonify({
            'success': True,
            'production_id': production_id,
            'production_code': production_code,
            'traceable_code': traceable_code,
            'mrp_at_production': mrp_at_production,
            'expiry_date': integer_to_date(expiry_date) if expiry_date else None,
            'days_to_expiry': days_to_expiry,
            'expiry_status': expiry_status,
            'cost_summary': {
                'oil_cost': oil_cost_total,
                'material_cost': material_cost_total,
                'labor_cost': labor_cost_total,
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
        close_connection(conn)


@sku_production_bp.route('/api/sku/expiry-summary', methods=['GET'])
def get_expiry_summary():
    """Get summary of items by expiry status for dashboard"""
    conn = get_db_connection()
    
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
        close_connection(conn)


@sku_production_bp.route('/api/sku/fefo-allocation/<int:sku_id>', methods=['POST'])
def get_fefo_allocation_for_sku(sku_id):
    """Get FEFO (First Expiry First Out) allocation for SKU sales"""
    conn = get_db_connection()
    
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
        close_connection(conn)


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
                p.quality_check_status,
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
        
        # Get oil allocations for traceability
        cur.execute("""
            SELECT 
                oa.source_type,
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
            oil_sources.append({
                'source_type': row[0],
                'traceable_code': row[1],
                'quantity_kg': float(row[2]),
                'cost_per_kg': float(row[3]),
                'source_code': row[4],
                'oil_type': row[5]
            })
        
        # Get material consumption
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
                'status': prod_data[17] or 'Pending',
                'checked_by': prod_data[18] or 'N/A'
            },
            
            'cost_breakdown': {
                'oil_cost': float(prod_data[20]),
                'material_cost': float(prod_data[21]),
                'labor_cost': float(prod_data[22]),
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
# PRODUCTION PLANNING (EXISTING)
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
        
        # Calculate expiry date
        expiry_date = None
        days_to_expiry = None
        if sku_data[6]:  # shelf_life_months
            expiry_date = calculate_expiry_date(production_date, sku_data[6])
            days_to_expiry = get_days_to_expiry(expiry_date)
        
        # Calculate oil requirement
        package_size = sku_data[3]
        size_in_liters = float(package_size.replace('ml', '').replace('L', ''))
        if 'ml' in package_size:
            size_in_liters = size_in_liters / 1000
        
        oil_per_bottle = size_in_liters * float(sku_data[4])  # kg
        total_oil_required = oil_per_bottle * bottles_planned
        
        # Check oil availability (existing logic)
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
                'can_proceed': (total_available >= total_oil_required) and materials_available
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# ============================================
# OIL ALLOCATION (EXISTING - NO CHANGES)
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
