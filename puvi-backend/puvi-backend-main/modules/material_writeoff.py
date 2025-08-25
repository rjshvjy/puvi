"""
Material Writeoff Module for PUVI Oil Manufacturing System
Enhanced version with unified inventory and SKU writeoff support
File Path: puvi-backend/puvi-backend-main/modules/material_writeoff.py
Version: 3.0 - Unified writeoff with dynamic categories
"""

from flask import Blueprint, request, jsonify
from db_utils import get_db_connection, close_connection
from utils.date_utils import parse_date, integer_to_date, get_current_day_number
from utils.validation import safe_float, validate_required_fields

# Create Blueprint
writeoff_bp = Blueprint('writeoff', __name__)

# ============================================
# EXISTING ENDPOINTS (UNCHANGED)
# ============================================

@writeoff_bp.route('/api/writeoff_reasons', methods=['GET'])
def get_writeoff_reasons():
    """Get all writeoff reason codes"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT reason_code, reason_description, category 
            FROM writeoff_reasons 
            ORDER BY category, reason_description
        """)
        
        reasons = []
        for row in cur.fetchall():
            reasons.append({
                'reason_code': row[0],
                'reason_description': row[1],
                'category': row[2]
            })
        
        # Group by category for better organization
        reasons_by_category = {}
        for reason in reasons:
            category = reason['category'] or 'Other'
            if category not in reasons_by_category:
                reasons_by_category[category] = []
            reasons_by_category[category].append(reason)
        
        return jsonify({
            'success': True,
            'reasons': reasons,
            'reasons_by_category': reasons_by_category,
            'count': len(reasons)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@writeoff_bp.route('/api/inventory_for_writeoff', methods=['GET'])
def get_inventory_for_writeoff():
    """Get materials with current inventory for writeoff selection"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get optional filter parameters
        category = request.args.get('category')
        
        query = """
            SELECT 
                i.inventory_id,
                i.material_id,
                m.material_name,
                m.unit,
                m.category,
                i.closing_stock,
                i.weighted_avg_cost,
                i.last_updated
            FROM inventory i
            JOIN materials m ON i.material_id = m.material_id
            WHERE i.closing_stock > 0
        """
        
        params = []
        if category:
            query += " AND m.category = %s"
            params.append(category)
            
        query += " ORDER BY m.category, m.material_name"
        
        cur.execute(query, params)
        
        inventory_items = []
        for row in cur.fetchall():
            inventory_items.append({
                'inventory_id': row[0],
                'material_id': row[1],
                'material_name': row[2],
                'unit': row[3],
                'category': row[4],
                'available_quantity': float(row[5]),
                'weighted_avg_cost': float(row[6]),
                'last_updated': integer_to_date(row[7]) if row[7] else '',
                'total_value': float(row[5]) * float(row[6])
            })
        
        # Get category summary
        cur.execute("""
            SELECT 
                m.category,
                COUNT(DISTINCT m.material_id) as material_count,
                COALESCE(SUM(i.closing_stock * i.weighted_avg_cost), 0) as total_value
            FROM inventory i
            JOIN materials m ON i.material_id = m.material_id
            WHERE i.closing_stock > 0
            GROUP BY m.category
            ORDER BY m.category
        """)
        
        category_summary = []
        for row in cur.fetchall():
            category_summary.append({
                'category': row[0] or 'Uncategorized',
                'material_count': row[1],
                'total_value': float(row[2])
            })
        
        return jsonify({
            'success': True,
            'inventory_items': inventory_items,
            'count': len(inventory_items),
            'category_summary': category_summary
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# ============================================
# NEW UNIFIED INVENTORY ENDPOINT
# ============================================

@writeoff_bp.route('/api/unified_writeoff_inventory', methods=['GET'])
def get_unified_writeoff_inventory():
    """Get all writeoff-able items dynamically from database"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        result = {
            'success': True,
            'categories': [],
            'inventory_items': []
        }
        
        # 1. DYNAMICALLY get all material categories from categories_master
        cur.execute("""
            SELECT 
                cm.category_name,
                COUNT(DISTINCT CASE WHEN i.closing_stock > 0 THEN m.material_id END) as item_count
            FROM categories_master cm
            LEFT JOIN materials m ON (
                m.category = cm.category_name 
                OR (cm.category_name = 'Packing Material' AND m.category = 'Packaging')
            ) AND m.is_active = true
            LEFT JOIN inventory i ON i.material_id = m.material_id
            WHERE cm.is_active = true
            GROUP BY cm.category_name
            ORDER BY cm.category_name
        """)
        
        material_categories = []
        for row in cur.fetchall():
            material_categories.append({
                'type': 'material',
                'category': row[0],
                'display_name': row[0],
                'count': row[1] or 0,
                'unit': 'items'
            })
        
        # 2. DYNAMICALLY get all SKU products from sku_master
        cur.execute("""
            SELECT 
                CONCAT('sku_', sm.oil_type, '_', sm.package_size) as category_key,
                CONCAT(sm.oil_type, ' Oil - ', sm.package_size) as display_name,
                COUNT(DISTINCT si.inventory_id) as item_count,
                COALESCE(SUM(si.quantity_available), 0) as total_quantity
            FROM sku_master sm
            LEFT JOIN sku_inventory si ON sm.sku_id = si.sku_id 
                AND si.quantity_available > 0 
                AND si.status = 'active'
            WHERE sm.is_active = true
            GROUP BY sm.oil_type, sm.package_size
            ORDER BY sm.oil_type, sm.package_size
        """)
        
        sku_categories = []
        for row in cur.fetchall():
            sku_categories.append({
                'type': 'sku',
                'category': row[0],
                'display_name': row[1],
                'count': float(row[3]) if row[3] else 0,
                'unit': 'bottles'
            })
        
        # 3. DYNAMICALLY get oil cake types from actual inventory
        cur.execute("""
            SELECT DISTINCT 
                oci.oil_type,
                COUNT(DISTINCT oci.cake_inventory_id) as batch_count,
                SUM(oci.quantity_remaining) as total_quantity
            FROM oil_cake_inventory oci
            WHERE oci.quantity_remaining > 0
            GROUP BY oci.oil_type
            ORDER BY oci.oil_type
        """)
        
        oilcake_categories = []
        for row in cur.fetchall():
            oilcake_categories.append({
                'type': 'oilcake',
                'category': f'oilcake_{row[0]}',
                'display_name': f'Oil Cake - {row[0]}',
                'count': float(row[2]) if row[2] else 0,
                'unit': 'kg'
            })
        
        # 4. DYNAMICALLY get sludge types from batch table
        cur.execute("""
            SELECT DISTINCT 
                b.oil_type,
                COUNT(DISTINCT b.batch_id) as batch_count,
                SUM(b.sludge_yield - COALESCE(b.sludge_sold_quantity, 0)) as total_quantity
            FROM batch b
            WHERE b.sludge_yield > 0 
                AND (b.sludge_yield - COALESCE(b.sludge_sold_quantity, 0)) > 0
            GROUP BY b.oil_type
            ORDER BY b.oil_type
        """)
        
        sludge_categories = []
        for row in cur.fetchall():
            sludge_categories.append({
                'type': 'sludge',
                'category': f'sludge_{row[0]}',
                'display_name': f'Sludge - {row[0]}',
                'count': float(row[2]) if row[2] else 0,
                'unit': 'kg'
            })
        
        # 5. Also check for oil cake with zero inventory but exists in batch history
        cur.execute("""
            SELECT DISTINCT b.oil_type
            FROM batch b
            WHERE b.oil_cake_yield > 0
                AND b.oil_type NOT IN (
                    SELECT DISTINCT oil_type 
                    FROM oil_cake_inventory 
                    WHERE quantity_remaining > 0
                )
            ORDER BY b.oil_type
        """)
        
        for row in cur.fetchall():
            # Check if not already added
            exists = any(cat['category'] == f'oilcake_{row[0]}' for cat in oilcake_categories)
            if not exists:
                oilcake_categories.append({
                    'type': 'oilcake',
                    'category': f'oilcake_{row[0]}',
                    'display_name': f'Oil Cake - {row[0]}',
                    'count': 0,
                    'unit': 'kg'
                })
        
        # Combine all dynamically fetched categories
        result['categories'] = {
            'materials': material_categories,
            'finished_products': sku_categories,
            'byproducts': oilcake_categories + sludge_categories
        }
        
        # If specific category requested, fetch its items
        selected_category = request.args.get('category')
        if selected_category:
            if selected_category.startswith('sku_'):
                # Parse dynamically - handle any oil type and package size
                parts = selected_category.replace('sku_', '').rsplit('_', 1)
                if len(parts) == 2:
                    oil_type, package_size = parts
                    
                    # Fetch SKU inventory for this combination
                    cur.execute("""
                        SELECT 
                            si.inventory_id,
                            si.sku_id,
                            sm.sku_code,
                            sm.product_name,
                            si.quantity_available,
                            si.expiry_date,
                            si.batch_code,
                            si.mrp,
                            si.production_id
                        FROM sku_inventory si
                        JOIN sku_master sm ON si.sku_id = sm.sku_id
                        WHERE sm.oil_type = %s 
                            AND sm.package_size = %s
                            AND si.quantity_available > 0
                            AND si.status = 'active'
                        ORDER BY si.expiry_date
                    """, (oil_type, package_size))
                    
                    for row in cur.fetchall():
                        # Get production cost if available
                        production_cost = 0
                        if row[8]:  # production_id
                            cur.execute("""
                                SELECT cost_per_bottle 
                                FROM sku_production 
                                WHERE production_id = %s
                            """, (row[8],))
                            cost_row = cur.fetchone()
                            if cost_row:
                                production_cost = float(cost_row[0])
                        
                        result['inventory_items'].append({
                            'inventory_id': row[0],
                            'sku_id': row[1],
                            'sku_code': row[2],
                            'product_name': row[3],
                            'quantity_available': float(row[4]),
                            'expiry_date': integer_to_date(row[5]) if row[5] else None,
                            'batch_code': row[6],
                            'mrp': float(row[7]) if row[7] else 0,
                            'production_cost': production_cost,
                            'type': 'sku',
                            'unit': 'bottles'
                        })
                        
            elif selected_category.startswith('oilcake_'):
                oil_type = selected_category.replace('oilcake_', '')
                
                # Existing oil cake logic
                cur.execute("""
                    SELECT 
                        oci.cake_inventory_id,
                        oci.batch_id,
                        b.batch_code,
                        oci.oil_type,
                        oci.quantity_produced,
                        oci.quantity_remaining,
                        oci.estimated_rate,
                        oci.production_date,
                        b.traceable_code
                    FROM oil_cake_inventory oci
                    JOIN batch b ON oci.batch_id = b.batch_id
                    WHERE oci.quantity_remaining > 0
                        AND oci.oil_type = %s
                    ORDER BY oci.production_date DESC
                """, (oil_type,))
                
                for row in cur.fetchall():
                    result['inventory_items'].append({
                        'inventory_id': row[0],
                        'batch_id': row[1],
                        'batch_code': row[2],
                        'oil_type': row[3],
                        'quantity_produced': float(row[4]),
                        'quantity_remaining': float(row[5]),
                        'estimated_rate': float(row[6]),
                        'production_date': integer_to_date(row[7]),
                        'traceable_code': row[8],
                        'type': 'oilcake',
                        'unit': 'kg',
                        'available_quantity': float(row[5])
                    })
                    
            elif selected_category.startswith('sludge_'):
                oil_type = selected_category.replace('sludge_', '')
                
                # Existing sludge logic
                cur.execute("""
                    SELECT 
                        b.batch_id,
                        b.batch_code,
                        b.oil_type,
                        b.sludge_yield as quantity_produced,
                        b.sludge_yield - COALESCE(b.sludge_sold_quantity, 0) as quantity_remaining,
                        b.sludge_estimated_rate as estimated_rate,
                        b.production_date,
                        b.traceable_code
                    FROM batch b
                    WHERE b.sludge_yield > 0 
                        AND (b.sludge_yield - COALESCE(b.sludge_sold_quantity, 0)) > 0
                        AND b.oil_type = %s
                    ORDER BY b.production_date DESC
                """, (oil_type,))
                
                for row in cur.fetchall():
                    quantity_remaining = float(row[4]) if row[4] else 0
                    result['inventory_items'].append({
                        'inventory_id': row[0],  # batch_id for sludge
                        'batch_id': row[0],
                        'batch_code': row[1],
                        'oil_type': row[2],
                        'quantity_produced': float(row[3]) if row[3] else 0,
                        'quantity_remaining': quantity_remaining,
                        'estimated_rate': float(row[5]) if row[5] else 0,
                        'production_date': integer_to_date(row[6]),
                        'traceable_code': row[7],
                        'type': 'sludge',
                        'unit': 'kg',
                        'available_quantity': quantity_remaining
                    })
                    
            else:
                # Material category - fetch dynamically
                cur.execute("""
                    SELECT 
                        i.inventory_id,
                        i.material_id,
                        m.material_name,
                        m.unit,
                        i.closing_stock,
                        i.weighted_avg_cost
                    FROM inventory i
                    JOIN materials m ON i.material_id = m.material_id
                    WHERE (m.category = %s 
                        OR (%s = 'Packing Material' AND m.category = 'Packaging'))
                        AND i.closing_stock > 0
                    ORDER BY m.material_name
                """, (selected_category, selected_category))
                
                for row in cur.fetchall():
                    result['inventory_items'].append({
                        'inventory_id': row[0],
                        'material_id': row[1],
                        'material_name': row[2],
                        'unit': row[3],
                        'available_quantity': float(row[4]),
                        'weighted_avg_cost': float(row[5]),
                        'type': 'material'
                    })
        
        return jsonify(result)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# ============================================
# NEW SKU WRITEOFF ENDPOINTS
# ============================================

@writeoff_bp.route('/api/sku_for_writeoff', methods=['GET'])
def get_sku_for_writeoff():
    """Get available SKU inventory for writeoff selection"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        oil_type = request.args.get('oil_type')
        package_size = request.args.get('package_size')
        
        # Build query with filters
        query = """
            SELECT 
                si.inventory_id,
                si.sku_id,
                sm.sku_code,
                sm.product_name,
                sm.oil_type,
                sm.package_size,
                si.quantity_available,
                si.batch_code,
                si.production_id,
                si.expiry_date,
                si.mrp
            FROM sku_inventory si
            JOIN sku_master sm ON si.sku_id = sm.sku_id
            WHERE si.quantity_available > 0
                AND si.status = 'active'
        """
        
        params = []
        if oil_type:
            query += " AND sm.oil_type = %s"
            params.append(oil_type)
            
        if package_size:
            query += " AND sm.package_size = %s"
            params.append(package_size)
            
        query += " ORDER BY si.expiry_date, si.production_id"
        
        cur.execute(query, params)
        
        inventory_items = []
        for row in cur.fetchall():
            # Get production cost from sku_production
            production_cost = 0
            if row[8]:  # production_id
                cur.execute("""
                    SELECT cost_per_bottle, production_date
                    FROM sku_production
                    WHERE production_id = %s
                """, (row[8],))
                prod_row = cur.fetchone()
                if prod_row:
                    production_cost = float(prod_row[0])
                    production_date = integer_to_date(prod_row[1]) if prod_row[1] else None
                else:
                    production_date = None
            else:
                production_date = None
            
            inventory_items.append({
                'inventory_id': row[0],
                'sku_id': row[1],
                'sku_code': row[2],
                'product_name': row[3],
                'oil_type': row[4],
                'package_size': row[5],
                'quantity_available': float(row[6]),
                'batch_code': row[7],
                'production_date': production_date,
                'expiry_date': integer_to_date(row[9]) if row[9] else None,
                'mrp': float(row[10]) if row[10] else 0,
                'production_cost': production_cost,
                'type': 'sku',
                'unit': 'bottles'
            })
        
        # Get summary
        cur.execute("""
            SELECT 
                sm.oil_type,
                sm.package_size,
                COUNT(DISTINCT si.inventory_id) as batch_count,
                COALESCE(SUM(si.quantity_available), 0) as total_quantity,
                COALESCE(AVG(si.mrp), 0) as avg_mrp
            FROM sku_inventory si
            JOIN sku_master sm ON si.sku_id = sm.sku_id
            WHERE si.quantity_available > 0
                AND si.status = 'active'
            GROUP BY sm.oil_type, sm.package_size
            ORDER BY sm.oil_type, sm.package_size
        """)
        
        summary = []
        for row in cur.fetchall():
            summary.append({
                'oil_type': row[0],
                'package_size': row[1],
                'batch_count': row[2],
                'total_quantity': float(row[3]),
                'avg_mrp': float(row[4])
            })
        
        return jsonify({
            'success': True,
            'inventory_items': inventory_items,
            'count': len(inventory_items),
            'summary': summary
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@writeoff_bp.route('/api/add_sku_writeoff', methods=['POST'])
def add_sku_writeoff():
    """Record a SKU product writeoff"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        # Validate required fields
        is_valid, missing_fields = validate_required_fields(
            data,
            ['sku_inventory_id', 'quantity', 'writeoff_date', 'reason_code']
        )
        
        if not is_valid:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        sku_inventory_id = data['sku_inventory_id']
        writeoff_qty = safe_float(data['quantity'])
        writeoff_date_int = parse_date(data['writeoff_date'])
        
        # Get SKU inventory details
        cur.execute("""
            SELECT 
                si.sku_id,
                si.quantity_available,
                si.production_id,
                si.mrp,
                si.batch_code,
                sm.sku_code,
                sm.product_name,
                sm.oil_type,
                sm.package_size
            FROM sku_inventory si
            JOIN sku_master sm ON si.sku_id = sm.sku_id
            WHERE si.inventory_id = %s
        """, (sku_inventory_id,))
        
        sku_row = cur.fetchone()
        if not sku_row:
            return jsonify({
                'success': False,
                'error': 'SKU inventory not found'
            }), 404
        
        sku_id = sku_row[0]
        quantity_available = float(sku_row[1])
        production_id = sku_row[2]
        mrp = float(sku_row[3]) if sku_row[3] else 0
        batch_code = sku_row[4]
        sku_code = sku_row[5]
        product_name = sku_row[6]
        oil_type = sku_row[7]
        package_size = sku_row[8]
        
        # Get production cost if available
        production_cost = 0
        if production_id:
            cur.execute("""
                SELECT cost_per_bottle
                FROM sku_production
                WHERE production_id = %s
            """, (production_id,))
            cost_row = cur.fetchone()
            if cost_row:
                production_cost = float(cost_row[0])
        
        # Validate quantity
        if writeoff_qty <= 0:
            return jsonify({
                'success': False,
                'error': 'Writeoff quantity must be greater than 0'
            }), 400
            
        if writeoff_qty > quantity_available:
            return jsonify({
                'success': False,
                'error': f'Insufficient stock. Available: {quantity_available} bottles'
            }), 400
        
        # Calculate costs (use production cost if available, else use MRP * 0.7 as estimate)
        cost_per_unit = production_cost if production_cost > 0 else mrp * 0.7
        total_cost = writeoff_qty * cost_per_unit
        scrap_value = safe_float(data.get('scrap_value', 0))
        net_loss = total_cost - scrap_value
        
        # Begin transaction
        cur.execute("BEGIN")
        
        # Insert writeoff record
        cur.execute("""
            INSERT INTO material_writeoffs (
                material_id, writeoff_date, quantity, weighted_avg_cost,
                total_cost, scrap_value, net_loss, reason_code,
                reason_description, reference_type, reference_id,
                notes, created_by
            ) VALUES (NULL, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING writeoff_id
        """, (
            writeoff_date_int,
            writeoff_qty,
            cost_per_unit,
            total_cost,
            scrap_value,
            net_loss,
            data['reason_code'],
            data.get('reason_description', ''),
            'sku',
            sku_inventory_id,
            data.get('notes', f'SKU writeoff: {product_name} from batch {batch_code}'),
            data.get('created_by', 'System')
        ))
        
        writeoff_id = cur.fetchone()[0]
        
        # Update SKU inventory
        new_quantity = quantity_available - writeoff_qty
        
        if new_quantity == 0:
            # Mark as fully consumed
            cur.execute("""
                UPDATE sku_inventory
                SET quantity_available = 0,
                    status = 'consumed'
                WHERE inventory_id = %s
            """, (sku_inventory_id,))
        else:
            # Update remaining quantity
            cur.execute("""
                UPDATE sku_inventory
                SET quantity_available = %s
                WHERE inventory_id = %s
            """, (new_quantity, sku_inventory_id))
        
        # Update impact tracking
        cur.execute("SELECT update_writeoff_impact_tracking()")
        
        # Update monthly summary
        month_year = int(integer_to_date(writeoff_date_int, '%Y%m'))
        cur.execute("SELECT update_writeoff_monthly_summary(%s)", (month_year,))
        
        # Commit transaction
        conn.commit()
        
        return jsonify({
            'success': True,
            'writeoff_id': writeoff_id,
            'sku_code': sku_code,
            'product_name': f'{oil_type} Oil - {package_size}',
            'batch_code': batch_code,
            'quantity_written_off': writeoff_qty,
            'unit': 'bottles',
            'total_cost': total_cost,
            'scrap_value': scrap_value,
            'net_loss': net_loss,
            'new_balance': new_quantity,
            'message': f'SKU writeoff recorded successfully. {writeoff_qty} bottles of {product_name} written off.'
        }), 201
        
    except Exception as e:
        conn.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# ============================================
# EXISTING WRITEOFF ENDPOINTS (UNCHANGED)
# ============================================

@writeoff_bp.route('/api/add_writeoff', methods=['POST'])
def add_writeoff():
    """Record a material writeoff"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        # Validate required fields
        is_valid, missing_fields = validate_required_fields(
            data, 
            ['material_id', 'quantity', 'writeoff_date', 'reason_code']
        )
        
        if not is_valid:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        # Parse the date
        writeoff_date_int = parse_date(data['writeoff_date'])
        
        # Get current inventory and cost
        cur.execute("""
            SELECT i.closing_stock, i.weighted_avg_cost, m.material_name, m.unit
            FROM inventory i
            JOIN materials m ON i.material_id = m.material_id
            WHERE i.material_id = %s
            ORDER BY i.inventory_id DESC
            LIMIT 1
        """, (data['material_id'],))
        
        inv_row = cur.fetchone()
        if not inv_row:
            return jsonify({
                'success': False,
                'error': 'Material not found in inventory'
            }), 404
        
        current_stock = float(inv_row[0])
        weighted_avg_cost = float(inv_row[1])
        material_name = inv_row[2]
        unit = inv_row[3]
        
        # Validate quantity
        writeoff_qty = safe_float(data['quantity'])
        if writeoff_qty <= 0:
            return jsonify({
                'success': False,
                'error': 'Writeoff quantity must be greater than 0'
            }), 400
            
        if writeoff_qty > current_stock:
            return jsonify({
                'success': False,
                'error': f'Insufficient stock. Available: {current_stock} {unit}'
            }), 400
        
        # Calculate costs
        total_cost = writeoff_qty * weighted_avg_cost
        scrap_value = safe_float(data.get('scrap_value', 0))
        net_loss = total_cost - scrap_value
        
        # Begin transaction
        cur.execute("BEGIN")
        
        # Insert writeoff record
        cur.execute("""
            INSERT INTO material_writeoffs (
                material_id, writeoff_date, quantity, weighted_avg_cost,
                total_cost, scrap_value, net_loss, reason_code,
                reason_description, reference_type, reference_id,
                notes, created_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING writeoff_id
        """, (
            data['material_id'],
            writeoff_date_int,
            writeoff_qty,
            weighted_avg_cost,
            total_cost,
            scrap_value,
            net_loss,
            data['reason_code'],
            data.get('reason_description', ''),
            data.get('reference_type', 'manual'),
            data.get('reference_id'),
            data.get('notes', ''),
            data.get('created_by', 'System')
        ))
        
        writeoff_id = cur.fetchone()[0]
        
        # Update inventory
        new_closing_stock = current_stock - writeoff_qty
        
        cur.execute("""
            UPDATE inventory
            SET closing_stock = %s,
                consumption = consumption + %s,
                last_updated = %s
            WHERE material_id = %s
                AND inventory_id = (
                    SELECT inventory_id FROM inventory 
                    WHERE material_id = %s 
                    ORDER BY inventory_id DESC LIMIT 1
                )
        """, (
            new_closing_stock,
            writeoff_qty,
            writeoff_date_int,
            data['material_id'],
            data['material_id']
        ))
        
        # Update impact tracking
        cur.execute("SELECT update_writeoff_impact_tracking()")
        
        # Update monthly summary
        month_year = int(integer_to_date(writeoff_date_int, '%Y%m'))
        cur.execute("SELECT update_writeoff_monthly_summary(%s)", (month_year,))
        
        # Commit transaction
        conn.commit()
        
        return jsonify({
            'success': True,
            'writeoff_id': writeoff_id,
            'material_name': material_name,
            'quantity_written_off': writeoff_qty,
            'unit': unit,
            'total_cost': total_cost,
            'scrap_value': scrap_value,
            'net_loss': net_loss,
            'new_stock_balance': new_closing_stock,
            'message': f'Writeoff recorded successfully. {writeoff_qty} {unit} written off.'
        }), 201
        
    except Exception as e:
        conn.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@writeoff_bp.route('/api/writeoff_history', methods=['GET'])
def get_writeoff_history():
    """Get writeoff history with filters and summary"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get query parameters
        limit = request.args.get('limit', 100, type=int)
        material_id = request.args.get('material_id', type=int)
        reason_code = request.args.get('reason_code')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Build query with filters
        query = """
            SELECT 
                w.*,
                m.material_name,
                m.unit,
                m.category
            FROM material_writeoffs w
            LEFT JOIN materials m ON w.material_id = m.material_id
            WHERE 1=1
        """
        
        params = []
        
        if material_id:
            query += " AND w.material_id = %s"
            params.append(material_id)
            
        if reason_code:
            query += " AND w.reason_code = %s"
            params.append(reason_code)
            
        if start_date:
            query += " AND w.writeoff_date >= %s"
            params.append(parse_date(start_date))
            
        if end_date:
            query += " AND w.writeoff_date <= %s"
            params.append(parse_date(end_date))
            
        query += " ORDER BY w.writeoff_date DESC, w.writeoff_id DESC LIMIT %s"
        params.append(limit)
        
        cur.execute(query, params)
        
        writeoffs = []
        for row in cur.fetchall():
            # Determine item name based on reference type
            if row[10] == 'oil_cake':
                item_name = 'Oil Cake'
            elif row[10] == 'sludge':
                item_name = 'Sludge'
            elif row[10] == 'sku':
                item_name = 'SKU Product'
            else:
                item_name = row[15] if row[15] else 'Unknown'
            
            writeoff = {
                'writeoff_id': row[0],
                'material_id': row[1],
                'writeoff_date': row[2],
                'writeoff_date_display': integer_to_date(row[2]),
                'quantity': float(row[3]),
                'weighted_avg_cost': float(row[4]),
                'total_cost': float(row[5]),
                'scrap_value': float(row[6]) if row[6] else 0,
                'net_loss': float(row[7]),
                'reason_code': row[8],
                'reason_description': row[9],
                'reference_type': row[10],
                'reference_id': row[11],
                'notes': row[12],
                'created_by': row[13],
                'created_at': row[14].isoformat() if row[14] else None,
                'material_name': item_name,
                'unit': row[16] if row[16] else 'kg',
                'category': row[17] if row[17] else 'By-product'
            }
            writeoffs.append(writeoff)
        
        # Get summary statistics with same filters
        summary_query = """
            SELECT 
                COUNT(*) as total_writeoffs,
                COALESCE(SUM(w.quantity), 0) as total_quantity,
                COALESCE(SUM(w.total_cost), 0) as total_cost_sum,
                COALESCE(SUM(w.scrap_value), 0) as total_scrap_value,
                COALESCE(SUM(w.net_loss), 0) as total_net_loss,
                COUNT(DISTINCT w.material_id) as unique_materials,
                COUNT(DISTINCT w.reason_code) as unique_reasons
            FROM material_writeoffs w
            WHERE 1=1
        """
        
        # Apply same filters to summary
        summary_params = params[:-1]  # Exclude limit
        if material_id:
            summary_query = summary_query.replace("WHERE 1=1", "WHERE 1=1 AND w.material_id = %s", 1)
        if reason_code:
            summary_query = summary_query.replace("WHERE 1=1", f"WHERE 1=1{' AND w.material_id = %s' if material_id else ''} AND w.reason_code = %s", 1)
        
        cur.execute(summary_query, summary_params)
        stats = cur.fetchone()
        
        # Get writeoff by reason summary
        cur.execute("""
            SELECT 
                w.reason_code,
                wr.reason_description,
                COUNT(*) as count,
                COALESCE(SUM(w.net_loss), 0) as total_loss
            FROM material_writeoffs w
            LEFT JOIN writeoff_reasons wr ON w.reason_code = wr.reason_code
            GROUP BY w.reason_code, wr.reason_description
            ORDER BY total_loss DESC
        """)
        
        reason_summary = []
        for row in cur.fetchall():
            reason_summary.append({
                'reason_code': row[0],
                'reason_description': row[1] or row[0],
                'count': row[2],
                'total_loss': float(row[3])
            })
        
        return jsonify({
            'success': True,
            'writeoffs': writeoffs,
            'count': len(writeoffs),
            'summary': {
                'total_writeoffs': stats[0],
                'total_quantity': float(stats[1]),
                'total_cost': float(stats[2]),
                'total_scrap_recovered': float(stats[3]),
                'total_net_loss': float(stats[4]),
                'unique_materials': stats[5],
                'unique_reasons': stats[6]
            },
            'reason_summary': reason_summary
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@writeoff_bp.route('/api/oilcake_for_writeoff', methods=['GET'])
def get_oilcake_for_writeoff():
    """Get available oil cake inventory for writeoff selection
    User can select ANY batch - damage/quality issues can affect any batch regardless of age"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        oil_type = request.args.get('oil_type')
        
        # Get oil cake inventory from batches
        query = """
            SELECT 
                oci.cake_inventory_id,
                oci.batch_id,
                b.batch_code,
                oci.oil_type,
                oci.quantity_produced,
                oci.quantity_remaining,
                oci.estimated_rate,
                oci.production_date,
                b.traceable_code,
                CURRENT_DATE - (DATE '1970-01-01' + oci.production_date * INTERVAL '1 day') as age_days
            FROM oil_cake_inventory oci
            JOIN batch b ON oci.batch_id = b.batch_id
            WHERE oci.quantity_remaining > 0
        """
        
        params = []
        if oil_type:
            query += " AND oci.oil_type = %s"
            params.append(oil_type)
        
        query += " ORDER BY oci.production_date DESC"  # Recent batches first for easier selection
        
        cur.execute(query, params)
        
        inventory_items = []
        total_quantity = 0
        total_value = 0
        
        for row in cur.fetchall():
            quantity_remaining = float(row[5])
            estimated_rate = float(row[6])
            item_value = quantity_remaining * estimated_rate
            
            inventory_items.append({
                'inventory_id': row[0],
                'batch_id': row[1],
                'batch_code': row[2],
                'oil_type': row[3],
                'quantity_produced': float(row[4]),
                'quantity_remaining': quantity_remaining,
                'estimated_rate': estimated_rate,
                'production_date': integer_to_date(row[7]),
                'traceable_code': row[8],
                'age_days': row[9].days if row[9] else 0,
                'type': 'oil_cake',
                'unit': 'kg',
                'total_value': item_value
            })
            
            total_quantity += quantity_remaining
            total_value += item_value
        
        # Get distinct oil types for filtering
        cur.execute("""
            SELECT DISTINCT oil_type 
            FROM oil_cake_inventory 
            WHERE quantity_remaining > 0
            ORDER BY oil_type
        """)
        
        oil_types = [row[0] for row in cur.fetchall()]
        
        # Get summary by oil type
        cur.execute("""
            SELECT 
                oil_type,
                COUNT(*) as batch_count,
                COALESCE(SUM(quantity_remaining), 0) as total_quantity,
                COALESCE(AVG(estimated_rate), 0) as avg_rate
            FROM oil_cake_inventory
            WHERE quantity_remaining > 0
            GROUP BY oil_type
            ORDER BY oil_type
        """)
        
        oil_type_summary = []
        for row in cur.fetchall():
            oil_type_summary.append({
                'oil_type': row[0],
                'batch_count': row[1],
                'total_quantity': float(row[2]),
                'avg_rate': float(row[3])
            })
        
        return jsonify({
            'success': True,
            'inventory_items': inventory_items,
            'oil_types': oil_types,
            'oil_type_summary': oil_type_summary,
            'summary': {
                'total_quantity': total_quantity,
                'total_estimated_value': total_value,
                'item_count': len(inventory_items),
                'oldest_stock_days': max([item['age_days'] for item in inventory_items], default=0)
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@writeoff_bp.route('/api/add_oilcake_writeoff', methods=['POST'])
def add_oilcake_writeoff():
    """Record an oil cake writeoff"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        # Validate required fields
        is_valid, missing_fields = validate_required_fields(
            data,
            ['cake_inventory_id', 'quantity', 'writeoff_date', 'reason_code']
        )
        
        if not is_valid:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        cake_inventory_id = data['cake_inventory_id']
        writeoff_qty = safe_float(data['quantity'])
        writeoff_date_int = parse_date(data['writeoff_date'])
        
        # Get oil cake inventory details
        cur.execute("""
            SELECT 
                oci.batch_id,
                oci.oil_type,
                oci.quantity_remaining,
                oci.estimated_rate,
                b.batch_code,
                b.traceable_code
            FROM oil_cake_inventory oci
            JOIN batch b ON oci.batch_id = b.batch_id
            WHERE oci.cake_inventory_id = %s
        """, (cake_inventory_id,))
        
        cake_row = cur.fetchone()
        if not cake_row:
            return jsonify({
                'success': False,
                'error': 'Oil cake inventory not found'
            }), 404
        
        batch_id = cake_row[0]
        oil_type = cake_row[1]
        quantity_remaining = float(cake_row[2])
        estimated_rate = float(cake_row[3])
        batch_code = cake_row[4]
        traceable_code = cake_row[5]
        
        # Validate quantity
        if writeoff_qty <= 0:
            return jsonify({
                'success': False,
                'error': 'Writeoff quantity must be greater than 0'
            }), 400
            
        if writeoff_qty > quantity_remaining:
            return jsonify({
                'success': False,
                'error': f'Insufficient oil cake. Available: {quantity_remaining} kg'
            }), 400
        
        # Calculate costs
        total_cost = writeoff_qty * estimated_rate
        scrap_value = safe_float(data.get('scrap_value', 0))
        net_loss = total_cost - scrap_value
        
        # Begin transaction
        cur.execute("BEGIN")
        
        # Insert writeoff record
        cur.execute("""
            INSERT INTO material_writeoffs (
                material_id, writeoff_date, quantity, weighted_avg_cost,
                total_cost, scrap_value, net_loss, reason_code,
                reason_description, reference_type, reference_id,
                notes, created_by
            ) VALUES (NULL, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING writeoff_id
        """, (
            writeoff_date_int,
            writeoff_qty,
            estimated_rate,
            total_cost,
            scrap_value,
            net_loss,
            data['reason_code'],
            data.get('reason_description', ''),
            'oil_cake',
            batch_id,
            data.get('notes', f'Oil cake writeoff from batch {batch_code}'),
            data.get('created_by', 'System')
        ))
        
        writeoff_id = cur.fetchone()[0]
        
        # Update oil cake inventory
        new_quantity_remaining = quantity_remaining - writeoff_qty
        
        cur.execute("""
            UPDATE oil_cake_inventory
            SET quantity_remaining = %s
            WHERE cake_inventory_id = %s
        """, (new_quantity_remaining, cake_inventory_id))
        
        # Update batch cake sold quantity (even for writeoff, to track total disposed)
        cur.execute("""
            UPDATE batch
            SET cake_sold_quantity = COALESCE(cake_sold_quantity, 0) + %s
            WHERE batch_id = %s
        """, (writeoff_qty, batch_id))
        
        # Update impact tracking
        cur.execute("SELECT update_writeoff_impact_tracking()")
        
        # Update monthly summary
        month_year = int(integer_to_date(writeoff_date_int, '%Y%m'))
        cur.execute("SELECT update_writeoff_monthly_summary(%s)", (month_year,))
        
        # Commit transaction
        conn.commit()
        
        return jsonify({
            'success': True,
            'writeoff_id': writeoff_id,
            'batch_code': batch_code,
            'oil_type': oil_type,
            'quantity_written_off': writeoff_qty,
            'unit': 'kg',
            'total_cost': total_cost,
            'scrap_value': scrap_value,
            'net_loss': net_loss,
            'new_balance': new_quantity_remaining,
            'message': f'Oil cake writeoff recorded successfully. {writeoff_qty} kg written off from batch {batch_code}.'
        }), 201
        
    except Exception as e:
        conn.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@writeoff_bp.route('/api/sludge_for_writeoff', methods=['GET'])
def get_sludge_for_writeoff():
    """Get available sludge inventory for writeoff selection
    User can select ANY batch - damage/quality issues can affect any batch regardless of age"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        oil_type = request.args.get('oil_type')
        
        # Get sludge inventory from batches
        query = """
            SELECT 
                b.batch_id,
                b.batch_code,
                b.oil_type,
                b.sludge_yield as quantity_produced,
                b.sludge_yield - COALESCE(b.sludge_sold_quantity, 0) as quantity_remaining,
                b.sludge_estimated_rate as estimated_rate,
                b.production_date,
                b.traceable_code,
                CURRENT_DATE - (DATE '1970-01-01' + b.production_date * INTERVAL '1 day') as age_days
            FROM batch b
            WHERE b.sludge_yield > 0 
                AND (b.sludge_yield - COALESCE(b.sludge_sold_quantity, 0)) > 0
        """
        
        params = []
        if oil_type:
            query += " AND b.oil_type = %s"
            params.append(oil_type)
        
        query += " ORDER BY b.production_date DESC"  # Recent batches first for easier selection
        
        cur.execute(query, params)
        
        inventory_items = []
        total_quantity = 0
        total_value = 0
        
        for row in cur.fetchall():
            quantity_remaining = float(row[4]) if row[4] else 0
            estimated_rate = float(row[5]) if row[5] else 0
            item_value = quantity_remaining * estimated_rate
            
            inventory_items.append({
                'inventory_id': row[0],  # batch_id for sludge
                'batch_id': row[0],
                'batch_code': row[1],
                'oil_type': row[2],
                'quantity_produced': float(row[3]) if row[3] else 0,
                'quantity_remaining': quantity_remaining,
                'estimated_rate': estimated_rate,
                'production_date': integer_to_date(row[6]),
                'traceable_code': row[7],
                'age_days': row[8].days if row[8] else 0,
                'type': 'sludge',
                'unit': 'kg',
                'total_value': item_value
            })
            
            total_quantity += quantity_remaining
            total_value += item_value
        
        # Get distinct oil types for filtering
        cur.execute("""
            SELECT DISTINCT oil_type 
            FROM batch 
            WHERE sludge_yield > 0 
                AND (sludge_yield - COALESCE(sludge_sold_quantity, 0)) > 0
            ORDER BY oil_type
        """)
        
        oil_types = [row[0] for row in cur.fetchall()]
        
        # Get summary by oil type
        cur.execute("""
            SELECT 
                oil_type,
                COUNT(*) as batch_count,
                COALESCE(SUM(sludge_yield - COALESCE(sludge_sold_quantity, 0)), 0) as total_quantity,
                COALESCE(AVG(sludge_estimated_rate), 0) as avg_rate
            FROM batch
            WHERE sludge_yield > 0 
                AND (sludge_yield - COALESCE(sludge_sold_quantity, 0)) > 0
            GROUP BY oil_type
            ORDER BY oil_type
        """)
        
        oil_type_summary = []
        for row in cur.fetchall():
            oil_type_summary.append({
                'oil_type': row[0],
                'batch_count': row[1],
                'total_quantity': float(row[2]),
                'avg_rate': float(row[3])
            })
        
        return jsonify({
            'success': True,
            'inventory_items': inventory_items,
            'oil_types': oil_types,
            'oil_type_summary': oil_type_summary,
            'summary': {
                'total_quantity': total_quantity,
                'total_estimated_value': total_value,
                'item_count': len(inventory_items),
                'oldest_stock_days': max([item['age_days'] for item in inventory_items], default=0)
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@writeoff_bp.route('/api/add_sludge_writeoff', methods=['POST'])
def add_sludge_writeoff():
    """Record a sludge writeoff"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        # Validate required fields
        is_valid, missing_fields = validate_required_fields(
            data,
            ['batch_id', 'quantity', 'writeoff_date', 'reason_code']
        )
        
        if not is_valid:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        batch_id = data['batch_id']
        writeoff_qty = safe_float(data['quantity'])
        writeoff_date_int = parse_date(data['writeoff_date'])
        
        # Get sludge inventory details
        cur.execute("""
            SELECT 
                b.batch_code,
                b.oil_type,
                b.sludge_yield - COALESCE(b.sludge_sold_quantity, 0) as quantity_remaining,
                b.sludge_estimated_rate,
                b.traceable_code
            FROM batch b
            WHERE b.batch_id = %s
        """, (batch_id,))
        
        sludge_row = cur.fetchone()
        if not sludge_row:
            return jsonify({
                'success': False,
                'error': 'Batch not found'
            }), 404
        
        batch_code = sludge_row[0]
        oil_type = sludge_row[1]
        quantity_remaining = float(sludge_row[2]) if sludge_row[2] else 0
        estimated_rate = float(sludge_row[3]) if sludge_row[3] else 0
        traceable_code = sludge_row[4]
        
        # Validate quantity
        if writeoff_qty <= 0:
            return jsonify({
                'success': False,
                'error': 'Writeoff quantity must be greater than 0'
            }), 400
            
        if writeoff_qty > quantity_remaining:
            return jsonify({
                'success': False,
                'error': f'Insufficient sludge. Available: {quantity_remaining} kg'
            }), 400
        
        # Calculate costs
        total_cost = writeoff_qty * estimated_rate
        scrap_value = safe_float(data.get('scrap_value', 0))
        net_loss = total_cost - scrap_value
        
        # Begin transaction
        cur.execute("BEGIN")
        
        # Insert writeoff record
        cur.execute("""
            INSERT INTO material_writeoffs (
                material_id, writeoff_date, quantity, weighted_avg_cost,
                total_cost, scrap_value, net_loss, reason_code,
                reason_description, reference_type, reference_id,
                notes, created_by
            ) VALUES (NULL, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING writeoff_id
        """, (
            writeoff_date_int,
            writeoff_qty,
            estimated_rate,
            total_cost,
            scrap_value,
            net_loss,
            data['reason_code'],
            data.get('reason_description', ''),
            'sludge',
            batch_id,
            data.get('notes', f'Sludge writeoff from batch {batch_code}'),
            data.get('created_by', 'System')
        ))
        
        writeoff_id = cur.fetchone()[0]
        
        # Update batch sludge sold quantity (even for writeoff, to track total disposed)
        cur.execute("""
            UPDATE batch
            SET sludge_sold_quantity = COALESCE(sludge_sold_quantity, 0) + %s
            WHERE batch_id = %s
        """, (writeoff_qty, batch_id))
        
        # Update impact tracking
        cur.execute("SELECT update_writeoff_impact_tracking()")
        
        # Update monthly summary
        month_year = int(integer_to_date(writeoff_date_int, '%Y%m'))
        cur.execute("SELECT update_writeoff_monthly_summary(%s)", (month_year,))
        
        # Commit transaction
        conn.commit()
        
        new_balance = quantity_remaining - writeoff_qty
        
        return jsonify({
            'success': True,
            'writeoff_id': writeoff_id,
            'batch_code': batch_code,
            'oil_type': oil_type,
            'quantity_written_off': writeoff_qty,
            'unit': 'kg',
            'total_cost': total_cost,
            'scrap_value': scrap_value,
            'net_loss': net_loss,
            'new_balance': new_balance,
            'message': f'Sludge writeoff recorded successfully. {writeoff_qty} kg written off from batch {batch_code}.'
        }), 201
        
    except Exception as e:
        conn.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# ============================================
# IMPACT ANALYTICS ENDPOINTS - FIXED
# ============================================

@writeoff_bp.route('/api/writeoff_impact', methods=['GET'])
def get_writeoff_impact():
    """Get current writeoff impact metrics"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT 
                total_writeoffs_value,
                total_oil_produced_kg,
                impact_per_kg,
                writeoff_percentage,
                created_at,
                notes
            FROM writeoff_impact_tracking
            ORDER BY tracking_id DESC
            LIMIT 1
        """)
        
        row = cur.fetchone()
        if row:
            # Calculate impact level and color based on impact_per_kg
            impact_per_kg = float(row[2])
            
            # Determine impact level based on impact_per_kg value
            if impact_per_kg <= 2:
                impact_level = 'low'
                impact_color = '#00FF00'  # Green
            elif impact_per_kg <= 5:
                impact_level = 'moderate'
                impact_color = '#FFFF00'  # Yellow
            elif impact_per_kg <= 10:
                impact_level = 'high'
                impact_color = '#FFA500'  # Orange
            else:
                impact_level = 'critical'
                impact_color = '#FF0000'  # Red
            
            impact_data = {
                'total_writeoffs_value': float(row[0]),
                'total_oil_produced_kg': float(row[1]),
                'impact_per_kg': impact_per_kg,
                'writeoff_percentage': float(row[3]),
                'impact_level': impact_level,
                'impact_color': impact_color,
                'last_updated': row[4].isoformat() if row[4] else None,
                'note': row[5] or 'Impact calculated as total writeoffs divided by total oil production'
            }
        else:
            # No data yet - return defaults
            impact_data = {
                'total_writeoffs_value': 0,
                'total_oil_produced_kg': 0,
                'impact_per_kg': 0,
                'writeoff_percentage': 0,
                'impact_level': 'low',
                'impact_color': '#00FF00',
                'last_updated': None,
                'note': 'No writeoff data available yet'
            }
        
        return jsonify({
            'success': True,
            'impact_data': impact_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@writeoff_bp.route('/api/writeoff_dashboard', methods=['GET'])
def get_writeoff_dashboard():
    """Get combined dashboard data"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        dashboard = {}
        
        # Get recent writeoffs
        cur.execute("""
            SELECT 
                w.writeoff_id,
                w.writeoff_date,
                COALESCE(m.material_name, 
                    CASE 
                        WHEN w.reference_type = 'oil_cake' THEN 'Oil Cake'
                        WHEN w.reference_type = 'sludge' THEN 'Sludge'
                        WHEN w.reference_type = 'sku' THEN 'SKU Product'
                        ELSE 'Unknown'
                    END
                ) as item_name,
                w.quantity,
                COALESCE(m.unit, 'kg') as unit,
                w.net_loss,
                w.reason_description
            FROM material_writeoffs w
            LEFT JOIN materials m ON w.material_id = m.material_id
            ORDER BY w.writeoff_date DESC, w.writeoff_id DESC
            LIMIT 10
        """)
        
        recent_writeoffs = []
        for row in cur.fetchall():
            recent_writeoffs.append({
                'writeoff_id': row[0],
                'date': integer_to_date(row[1]),
                'item_name': row[2],
                'quantity': float(row[3]),
                'unit': row[4],
                'net_loss': float(row[5]),
                'reason': row[6]
            })
        
        dashboard['recent_writeoffs'] = recent_writeoffs
        
        # Get top reasons
        cur.execute("""
            SELECT 
                w.reason_code,
                COALESCE(wr.reason_description, w.reason_description) as reason,
                wr.category,
                COUNT(*) as count,
                SUM(w.net_loss) as total_loss
            FROM material_writeoffs w
            LEFT JOIN writeoff_reasons wr ON w.reason_code = wr.reason_code
            GROUP BY w.reason_code, wr.reason_description, w.reason_description, wr.category
            ORDER BY total_loss DESC
            LIMIT 5
        """)
        
        top_reasons = []
        for row in cur.fetchall():
            top_reasons.append({
                'reason_code': row[0],
                'reason': row[1],
                'category': row[2] or 'Other',
                'count': row[3],
                'total_loss': float(row[4])
            })
        
        dashboard['top_reasons'] = top_reasons
        
        # Get alerts based on impact metrics
        cur.execute("""
            SELECT 
                impact_per_kg, 
                writeoff_percentage
            FROM writeoff_impact_tracking
            ORDER BY tracking_id DESC
            LIMIT 1
        """)
        
        alerts = []
        impact_row = cur.fetchone()
        if impact_row:
            impact_per_kg = float(impact_row[0])
            writeoff_percentage = float(impact_row[1])
            
            # Calculate impact level
            if impact_per_kg > 10:
                impact_level = 'critical'
            elif impact_per_kg > 5:
                impact_level = 'high'
            else:
                impact_level = None
            
            if impact_level == 'critical':
                alerts.append({
                    'level': 'critical',
                    'message': f'CRITICAL: Writeoff impact at ₹{impact_per_kg:.2f}/kg oil ({writeoff_percentage:.2f}% of production value)'
                })
            elif impact_level == 'high':
                alerts.append({
                    'level': 'warning',
                    'message': f'HIGH: Writeoff impact at ₹{impact_per_kg:.2f}/kg oil ({writeoff_percentage:.2f}% of production value)'
                })
        
        dashboard['alerts'] = alerts
        
        return jsonify({
            'success': True,
            'dashboard': dashboard
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@writeoff_bp.route('/api/writeoff_trends', methods=['GET'])
def get_writeoff_trends():
    """Get monthly writeoff trends"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT 
                month_year,
                month_writeoff_count,
                month_writeoffs,
                month_material_writeoffs,
                month_oilcake_writeoffs + month_sludge_writeoffs as byproduct_writeoffs,
                top_writeoff_reason
            FROM writeoff_monthly_summary
            ORDER BY month_year DESC
            LIMIT 12
        """)
        
        trends = []
        for row in cur.fetchall():
            month_str = str(row[0])
            year = month_str[:4]
            month = month_str[4:6]
            
            trends.append({
                'month_year': row[0],
                'month_display': f'{month}/{year}',
                'total_count': row[1],
                'total_value': float(row[2]),
                'material_writeoffs': float(row[3]) if row[3] else 0,
                'byproduct_writeoffs': float(row[4]) if row[4] else 0,
                'top_reason': row[5]
            })
        
        return jsonify({
            'success': True,
            'trends': trends
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@writeoff_bp.route('/api/refresh_writeoff_metrics', methods=['POST'])
def refresh_writeoff_metrics():
    """Manually refresh writeoff metrics"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Update impact tracking
        cur.execute("SELECT update_writeoff_impact_tracking()")
        
        # Update monthly summary for current month
        current_month = get_current_day_number()
        month_year = int(integer_to_date(current_month, '%Y%m'))
        cur.execute("SELECT update_writeoff_monthly_summary(%s)", (month_year,))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Metrics refreshed successfully'
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@writeoff_bp.route('/api/writeoff_report/<int:writeoff_id>', methods=['GET'])
def get_writeoff_report(writeoff_id):
    """Get printable writeoff report"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get writeoff details
        cur.execute("""
            SELECT 
                w.*,
                m.material_name,
                m.unit,
                m.category
            FROM material_writeoffs w
            LEFT JOIN materials m ON w.material_id = m.material_id
            WHERE w.writeoff_id = %s
        """, (writeoff_id,))
        
        row = cur.fetchone()
        if not row:
            return jsonify({
                'success': False,
                'error': 'Writeoff not found'
            }), 404
        
        # Build report data
        report = {
            'writeoff_id': row[0],
            'material_id': row[1],
            'writeoff_date': integer_to_date(row[2]),
            'quantity': float(row[3]),
            'weighted_avg_cost': float(row[4]),
            'total_cost': float(row[5]),
            'scrap_value': float(row[6]) if row[6] else 0,
            'net_loss': float(row[7]),
            'reason_code': row[8],
            'reason_description': row[9],
            'reference_type': row[10],
            'reference_id': row[11],
            'notes': row[12],
            'created_by': row[13],
            'created_at': row[14].isoformat() if row[14] else None,
            'material_name': row[15] if row[15] else 'N/A',
            'unit': row[16] if row[16] else 'kg',
            'category': row[17] if row[17] else 'N/A'
        }
        
        return jsonify({
            'success': True,
            'report': report
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)
