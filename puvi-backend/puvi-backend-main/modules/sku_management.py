# File Path: puvi-backend/modules/sku_production.py
"""
SKU Production Module for PUVI Oil Manufacturing System
Handles production entry, oil allocation, cost calculation, and traceable code generation
Version: 1.1 (Simplified - No cartons in production)
"""

from flask import Blueprint, request, jsonify
from decimal import Decimal
from datetime import datetime
import json
from db_utils import get_db_connection, close_connection
from utils.date_utils import get_current_day_number, integer_to_date, parse_date
from utils.validation import safe_decimal, validate_required_fields

# Create Blueprint
sku_production_bp = Blueprint('sku_production', __name__)

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
        
        # Get SKU details
        cur.execute("""
            SELECT 
                s.sku_code,
                s.product_name,
                s.oil_type,
                s.package_size,
                s.density,
                b.bom_id
            FROM sku_master s
            LEFT JOIN sku_bom_master b ON s.sku_id = b.sku_id AND b.is_current = true
            WHERE s.sku_id = %s
        """, (sku_id,))
        
        sku_data = cur.fetchone()
        if not sku_data:
            return jsonify({'success': False, 'error': 'SKU not found'}), 404
        
        if not sku_data[5]:
            return jsonify({'success': False, 'error': 'BOM not configured for this SKU'}), 400
        
        # Calculate oil requirement
        package_size = sku_data[3]
        size_in_liters = float(package_size.replace('ml', '').replace('L', ''))
        if 'ml' in package_size:
            size_in_liters = size_in_liters / 1000
        
        oil_per_bottle = size_in_liters * float(sku_data[4])  # kg
        total_oil_required = oil_per_bottle * bottles_planned
        
        # Check oil availability from batches and blends
        oil_type = sku_data[2]
        
        # Get available oil from batches
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
        
        # Check material availability from BOM
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
        """, (bottles_planned, sku_data[5]))
        
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


# ============================================
# PRODUCTION ENTRY
# ============================================

@sku_production_bp.route('/api/sku/production', methods=['POST'])
def create_sku_production():
    """Create SKU production entry with cost calculation"""
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
        
        # Get SKU and BOM details
        cur.execute("""
            SELECT 
                s.package_size,
                s.density,
                b.bom_id
            FROM sku_master s
            JOIN sku_bom_master b ON s.sku_id = b.sku_id AND b.is_current = true
            WHERE s.sku_id = %s
        """, (sku_id,))
        
        sku_data = cur.fetchone()
        if not sku_data:
            raise Exception("SKU or BOM not found")
        
        # Generate production code
        cur.execute("""
            SELECT COUNT(*) + 1
            FROM sku_production
            WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
        """)
        seq_num = cur.fetchone()[0]
        production_code = f"SP-{seq_num:03d}-{datetime.now().year}"
        
        # Generate traceable code using first oil allocation
        first_allocation = oil_allocations[0]
        oil_traceable_code = first_allocation['traceable_code']
        production_month = datetime.now().month
        
        # Extract variety codes from oil traceable code
        code_parts = oil_traceable_code.split('-')
        if len(code_parts) == 4:  # Single variety: GNO-K-05082025-PUV
            variety_codes = code_parts[1]
        else:  # Blend: GNOKU-07082025-PUV
            variety_codes = code_parts[0][3:]  # Remove oil type prefix
        
        # Get sequence number for this variety-month combination
        cur.execute("""
            SELECT COALESCE(MAX(
                CAST(SUBSTRING(traceable_code FROM '[0-9]{2}$') AS INTEGER)
            ), 0) + 1
            FROM sku_production
            WHERE traceable_code LIKE %s
            AND production_date >= %s
        """, (
            f"{variety_codes}{production_month}%",
            int(f"{datetime.now().year}0401")  # April 1st of current year
        ))
        
        sequence = cur.fetchone()[0]
        traceable_code = f"{variety_codes}{production_month}{sequence:02d}"
        
        # Calculate costs
        total_oil_quantity = sum(a['quantity_allocated'] for a in oil_allocations)
        weighted_oil_cost = sum(a['quantity_allocated'] * a['oil_cost_per_kg'] 
                               for a in oil_allocations) / total_oil_quantity
        oil_cost_total = total_oil_quantity * weighted_oil_cost
        
        # Calculate material costs from BOM
        cur.execute("""
            SELECT 
                bd.material_id,
                bd.quantity_per_unit,
                m.current_cost,
                m.material_name
            FROM sku_bom_details bd
            JOIN materials m ON bd.material_id = m.material_id
            WHERE bd.bom_id = %s
        """, (sku_data[2],))
        
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
        
        # Insert production record
        cur.execute("""
            INSERT INTO sku_production (
                production_code, traceable_code, sku_id, bom_id,
                production_date, packing_date,
                total_oil_quantity, weighted_oil_cost,
                bottles_planned, bottles_produced,
                oil_cost_total, material_cost_total, labor_cost_total,
                total_production_cost, cost_per_bottle,
                production_status, operator_name, shift_number,
                production_line, notes, created_by
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            ) RETURNING production_id
        """, (
            production_code, traceable_code, sku_id, sku_data[2],
            production_date, packing_date,
            total_oil_quantity, weighted_oil_cost,
            data.get('bottles_planned', bottles_produced), bottles_produced,
            oil_cost_total, material_cost_total, labor_cost_total,
            total_production_cost, cost_per_bottle,
            'completed', data.get('operator_name'), data.get('shift_number'),
            data.get('production_line'), data.get('notes'),
            data.get('created_by', 'System')
        ))
        
        production_id = cur.fetchone()[0]
        
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
        
        return jsonify({
            'success': True,
            'production_id': production_id,
            'production_code': production_code,
            'traceable_code': traceable_code,
            'cost_summary': {
                'oil_cost': oil_cost_total,
                'material_cost': material_cost_total,
                'labor_cost': labor_cost_total,
                'total_cost': total_production_cost,
                'cost_per_bottle': cost_per_bottle
            },
            'message': 'Production recorded successfully'
        }), 201
        
    except Exception as e:
        conn.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# ============================================
# PRODUCTION HISTORY
# ============================================

@sku_production_bp.route('/api/sku/production/history', methods=['GET'])
def get_production_history():
    """Get SKU production history with filters"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get filter parameters
        sku_id = request.args.get('sku_id')
        oil_type = request.args.get('oil_type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = int(request.args.get('limit', 50))
        
        query = """
            SELECT 
                p.production_id,
                p.production_code,
                p.traceable_code,
                p.production_date,
                p.packing_date,
                s.sku_code,
                s.product_name,
                s.oil_type,
                s.package_size,
                p.bottles_produced,
                p.total_oil_quantity,
                p.oil_cost_total,
                p.material_cost_total,
                p.labor_cost_total,
                p.total_production_cost,
                p.cost_per_bottle,
                p.operator_name,
                p.created_at
            FROM sku_production p
            JOIN sku_master s ON p.sku_id = s.sku_id
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
        
        query += " ORDER BY p.production_date DESC, p.production_id DESC LIMIT %s"
        params.append(limit)
        
        cur.execute(query, params)
        
        productions = []
        for row in cur.fetchall():
            productions.append({
                'production_id': row[0],
                'production_code': row[1],
                'traceable_code': row[2],
                'production_date': integer_to_date(row[3]),
                'packing_date': integer_to_date(row[4]),
                'sku_code': row[5],
                'product_name': row[6],
                'oil_type': row[7],
                'package_size': row[8],
                'bottles_produced': row[9],
                'total_oil_quantity': float(row[10]),
                'oil_cost': float(row[11]),
                'material_cost': float(row[12]),
                'labor_cost': float(row[13]),
                'total_cost': float(row[14]),
                'cost_per_bottle': float(row[15]),
                'operator_name': row[16],
                'created_at': row[17].isoformat() if row[17] else None
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
