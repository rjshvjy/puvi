"""
Batch Production Module for PUVI Oil Manufacturing System
Handles oil extraction from seeds, cost allocation, by-product tracking, and traceability
File Path: puvi-backend/puvi-backend-main/modules/batch_production.py
Version: 3.0 - Direct SQL Implementation with element_id support
"""

from flask import Blueprint, request, jsonify
from decimal import Decimal
from db_utils import get_db_connection, close_connection
from utils.date_utils import parse_date, integer_to_date
from utils.validation import safe_decimal, safe_float, validate_positive_number
from utils.traceability import generate_batch_traceable_code, generate_batch_code
import json

# Create Blueprint
batch_bp = Blueprint('batch', __name__)

@batch_bp.route('/api/seeds_for_batch', methods=['GET'])
def get_seeds_for_batch():
    """Get available seeds from inventory for batch production with CORRECT purchase traceable codes"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get seeds with their latest purchase codes
        cur.execute("""
            SELECT DISTINCT ON (i.material_id)
                i.inventory_id,
                i.material_id,
                m.material_name,
                m.unit,
                i.closing_stock as available_quantity,
                i.weighted_avg_cost,
                m.category,
                m.short_code,
                -- Get purchase code for THIS SPECIFIC material only
                (
                    SELECT p.traceable_code 
                    FROM purchases p
                    JOIN purchase_items pi ON p.purchase_id = pi.purchase_id
                    WHERE pi.material_id = i.material_id
                        AND p.traceable_code IS NOT NULL
                    ORDER BY p.purchase_date DESC
                    LIMIT 1
                ) as latest_purchase_code,
                m.produces_oil_type
            FROM inventory i
            JOIN materials m ON i.material_id = m.material_id
            WHERE m.category = 'Seeds' 
                AND i.closing_stock > 0
            ORDER BY i.material_id
        """)
        
        seeds = []
        total_value = 0
        for row in cur.fetchall():
            value = float(row[4]) * float(row[5])
            total_value += value
            
            seeds.append({
                'inventory_id': row[0],
                'material_id': row[1],
                'material_name': row[2],
                'unit': row[3],
                'available_quantity': float(row[4]),
                'weighted_avg_cost': float(row[5]),
                'category': row[6],
                'short_code': row[7],
                'latest_purchase_code': row[8],
                'produces_oil_type': row[9],
                'total_value': value
            })
        
        return jsonify({
            'success': True,
            'seeds': seeds,
            'count': len(seeds),
            'total_inventory_value': total_value
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@batch_bp.route('/api/cost_elements_for_batch', methods=['GET'])
def get_cost_elements_for_batch():
    """
    Get applicable cost elements for batch production - DIRECT SQL VERSION
    No proxy to Masters, direct database query for efficiency
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get stage parameter for activity-based filtering
        stage = request.args.get('stage')
        
        # Map frontend stage to database activity
        activity_map = {
            'drying': 'Drying',
            'crushing': 'Crushing',
            'filtering': 'Filtering',
            'batch': None  # Get all for complete batch view
        }
        
        activity = activity_map.get(stage)
        
        # Build query with filters
        query = """
            SELECT 
                element_id,
                element_name,
                category,
                unit_type,
                default_rate,
                calculation_method,
                is_optional,
                applicable_to,
                display_order,
                activity,
                module_specific,
                notes
            FROM cost_elements_master
            WHERE is_active = true
                AND applicable_to IN ('batch', 'all')
        """
        
        params = []
        
        # Add activity filter if specified
        if activity:
            query += " AND (activity = %s OR activity = 'Common')"
            params.append(activity)
        
        query += " ORDER BY display_order, category, element_name"
        
        # Execute query
        if params:
            cur.execute(query, params)
        else:
            cur.execute(query)
        
        cost_elements = []
        categories = {}
        activities = {}
        
        for row in cur.fetchall():
            element = {
                'element_id': row[0],  # IMPORTANT: Include element_id
                'element_name': row[1],
                'category': row[2],
                'unit_type': row[3],
                'default_rate': float(row[4]) if row[4] else 0,
                'calculation_method': row[5],
                'is_optional': row[6] if row[6] is not None else False,
                'applicable_to': row[7],
                'display_order': row[8] if row[8] else 0,
                'activity': row[9] if row[9] else 'General',
                'module_specific': row[10],
                'notes': row[11]
            }
            
            cost_elements.append(element)
            
            # Group by category
            category = element['category']
            if category not in categories:
                categories[category] = []
            categories[category].append(element)
            
            # Group by activity
            element_activity = element['activity']
            if element_activity not in activities:
                activities[element_activity] = []
            activities[element_activity].append(element)
        
        return jsonify({
            'success': True,
            'cost_elements': cost_elements,
            'cost_elements_by_category': categories,
            'cost_elements_by_activity': activities,
            'count': len(cost_elements),
            'stage': stage if stage else 'all',
            'source': 'direct_sql'  # Indicate data source for debugging
        })
        
    except Exception as e:
        print(f"Error in get_cost_elements_for_batch: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@batch_bp.route('/api/oil_cake_rates', methods=['GET'])
def get_oil_cake_rates():
    """Get current oil cake and sludge rates for estimation based on last saved rates"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # First, try to get rates from dedicated rate master table if exists
        try:
            cur.execute("""
                SELECT oil_type, cake_rate, sludge_rate 
                FROM oil_cake_rate_master 
                WHERE active = true
            """)
            
            rates = {}
            for row in cur.fetchall():
                rates[row[0]] = {
                    'cake_rate': float(row[1]),
                    'sludge_rate': float(row[2])
                }
                
            if rates:
                return jsonify({
                    'success': True,
                    'rates': rates,
                    'source': 'rate_master'
                })
        except:
            # Table doesn't exist, continue with other methods
            pass
        
        # Get all oil types from the system
        cur.execute("""
            SELECT DISTINCT oil_type FROM (
                SELECT DISTINCT produces_oil_type as oil_type
                FROM materials
                WHERE produces_oil_type IS NOT NULL
                
                UNION
                
                SELECT DISTINCT oil_type
                FROM batch
                WHERE oil_type IS NOT NULL
            ) combined_types
            WHERE oil_type IS NOT NULL AND oil_type != ''
        """)
        
        oil_types = [row[0] for row in cur.fetchall()]
        
        oil_cake_rates = {}
        
        for oil_type in oil_types:
            # Method 1: Get the most recent rates from batch records
            cur.execute("""
                SELECT 
                    cake_estimated_rate,
                    sludge_estimated_rate
                FROM batch
                WHERE oil_type = %s 
                    AND cake_estimated_rate IS NOT NULL
                ORDER BY production_date DESC, batch_id DESC
                LIMIT 1
            """, (oil_type,))
            
            batch_result = cur.fetchone()
            
            if batch_result and batch_result[0]:
                # Use the most recent batch rates
                cake_rate = float(batch_result[0])
                sludge_rate = float(batch_result[1]) if batch_result[1] else cake_rate / 3
            else:
                # Method 2: Get average from recent oil cake sales
                cur.execute("""
                    SELECT AVG(actual_rate) as avg_cake_rate
                    FROM oil_cake_sales ocs
                    JOIN oil_cake_inventory oci ON ocs.cake_inventory_id = oci.cake_inventory_id
                    WHERE oci.oil_type = %s
                        AND ocs.sale_date >= (
                            SELECT MAX(sale_date) - 90 
                            FROM oil_cake_sales
                        )
                """, (oil_type,))
                
                sales_result = cur.fetchone()
                
                if sales_result and sales_result[0]:
                    cake_rate = float(sales_result[0])
                    sludge_rate = cake_rate / 3
                else:
                    # Method 3: Get from inventory estimated rates
                    cur.execute("""
                        SELECT AVG(estimated_rate) as avg_rate
                        FROM oil_cake_inventory
                        WHERE oil_type = %s
                            AND estimated_rate > 0
                            AND quantity_remaining > 0
                    """, (oil_type,))
                    
                    inv_result = cur.fetchone()
                    
                    if inv_result and inv_result[0]:
                        cake_rate = float(inv_result[0])
                        sludge_rate = cake_rate / 3
                    else:
                        # Method 4: Use system-wide average as last resort
                        cur.execute("""
                            SELECT 
                                AVG(cake_estimated_rate) as avg_cake,
                                AVG(sludge_estimated_rate) as avg_sludge
                            FROM batch
                            WHERE cake_estimated_rate > 0
                        """)
                        
                        avg_result = cur.fetchone()
                        
                        if avg_result and avg_result[0]:
                            cake_rate = float(avg_result[0])
                            sludge_rate = float(avg_result[1]) if avg_result[1] else cake_rate / 3
                        else:
                            # Absolute fallback - minimal defaults only if no data exists
                            cake_rate = 25.00
                            sludge_rate = 8.00
            
            oil_cake_rates[oil_type] = {
                'cake_rate': round(cake_rate, 2),
                'sludge_rate': round(sludge_rate, 2)
            }
        
        # Add source information for transparency
        source_info = "last_batch_rates"
        
        return jsonify({
            'success': True,
            'rates': oil_cake_rates,
            'source': source_info,
            'message': 'Rates based on most recent production/sales data'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@batch_bp.route('/api/oil_types', methods=['GET'])
def get_oil_types():
    """Get distinct oil types from materials and production data"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get oil types from multiple sources
        cur.execute("""
            SELECT DISTINCT oil_type FROM (
                -- From materials that produce oil
                SELECT DISTINCT produces_oil_type as oil_type
                FROM materials
                WHERE produces_oil_type IS NOT NULL
                
                UNION
                
                -- From existing batches
                SELECT DISTINCT oil_type
                FROM batch
                WHERE oil_type IS NOT NULL
                
                UNION
                
                -- From SKU master
                SELECT DISTINCT oil_type
                FROM sku_master
                WHERE oil_type IS NOT NULL
                
                UNION
                
                -- From subcategories (oil products)
                SELECT DISTINCT oil_type
                FROM subcategories_master
                WHERE oil_type IS NOT NULL
            ) combined_types
            WHERE oil_type IS NOT NULL AND oil_type != ''
            ORDER BY oil_type
        """)
        
        oil_types = [row[0] for row in cur.fetchall()]
        
        return jsonify({
            'success': True,
            'oil_types': oil_types,
            'count': len(oil_types)
        })
        
    except Exception as e:
        print(f"Error in get_oil_types: {str(e)}")
        return jsonify({
            'success': False,
            'oil_types': [],
            'error': str(e)
        }), 500
    finally:
        close_connection(conn, cur)


@batch_bp.route('/api/add_batch', methods=['POST'])
def add_batch():
    """Create a new batch production record with auto oil type detection and proper element_id handling"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        # Debug logging
        print(f"Received batch data: {data}")
        
        # AUTO-DETECT OIL TYPE FROM MATERIAL
        material_id = data.get('material_id')
        if not material_id:
            return jsonify({
                'success': False,
                'error': 'Material ID is required'
            }), 400
        
        # Get oil type from materials.produces_oil_type
        cur.execute("""
            SELECT produces_oil_type, material_name
            FROM materials
            WHERE material_id = %s
        """, (material_id,))
        
        result = cur.fetchone()
        if not result or not result[0]:
            return jsonify({
                'success': False,
                'error': f'Selected material does not produce oil or oil type not configured. Please update materials.produces_oil_type for this seed.'
            }), 400
        
        oil_type = result[0]
        material_name = result[1]
        
        print(f"Auto-detected oil type: {oil_type} from material: {material_name}")
        
        # Validate required fields
        required_fields = ['batch_description', 'production_date', 
                          'material_id', 'seed_quantity_before_drying', 
                          'seed_quantity_after_drying', 'oil_yield', 
                          'cake_yield', 'cake_estimated_rate']
        
        missing_fields = []
        for field in required_fields:
            if field not in data or data[field] is None or data[field] == '':
                missing_fields.append(field)
        
        if missing_fields:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        # Parse date
        production_date = parse_date(data['production_date'])
        
        # Generate batch code
        batch_code = generate_batch_code(production_date, data['batch_description'], cur)
        
        # Get seed purchase traceable code
        seed_purchase_code = data.get('seed_purchase_code')
        if not seed_purchase_code:
            # Try to get the latest purchase code for this material
            cur.execute("""
                SELECT p.traceable_code
                FROM purchases p
                JOIN purchase_items pi ON p.purchase_id = pi.purchase_id
                WHERE pi.material_id = %s 
                    AND p.traceable_code IS NOT NULL
                ORDER BY p.purchase_date DESC
                LIMIT 1
            """, (material_id,))
            
            result = cur.fetchone()
            if result:
                seed_purchase_code = result[0]
            else:
                return jsonify({
                    'success': False,
                    'error': 'No purchase traceable code found for this seed. The seed must have been purchased with traceability enabled.'
                }), 400
        
        # Generate batch traceable code
        try:
            batch_traceable_code = generate_batch_traceable_code(
                material_id,
                seed_purchase_code,
                production_date,
                cur
            )
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Error generating batch traceable code: {str(e)}'
            }), 500
        
        # Safely convert values
        seed_qty_before = safe_decimal(data.get('seed_quantity_before_drying', 0))
        seed_qty_after = safe_decimal(data.get('seed_quantity_after_drying', 0))
        oil_yield = safe_decimal(data.get('oil_yield', 0))
        cake_yield = safe_decimal(data.get('cake_yield', 0))
        sludge_yield = safe_decimal(data.get('sludge_yield', 0))
        
        # Validate quantities
        validations = [
            validate_positive_number(seed_qty_before, 'Seed quantity before drying'),
            validate_positive_number(seed_qty_after, 'Seed quantity after drying'),
            validate_positive_number(oil_yield, 'Oil yield')
        ]
        
        for is_valid, error_msg in validations:
            if not is_valid:
                return jsonify({'success': False, 'error': error_msg}), 400
        
        if seed_qty_after > seed_qty_before:
            return jsonify({
                'success': False,
                'error': 'Seed quantity after drying cannot exceed quantity before drying'
            }), 400
        
        # Check seed availability
        cur.execute("""
            SELECT closing_stock FROM inventory 
            WHERE material_id = %s
            ORDER BY inventory_id DESC LIMIT 1
        """, (material_id,))
        
        available_stock = cur.fetchone()
        if not available_stock or float(available_stock[0]) < float(seed_qty_before):
            return jsonify({
                'success': False,
                'error': f'Insufficient seed stock. Available: {available_stock[0] if available_stock else 0} kg'
            }), 400
        
        drying_loss = seed_qty_before - seed_qty_after
        
        # Calculate percentages
        oil_yield_percent = (oil_yield / seed_qty_after * 100) if seed_qty_after > 0 else 0
        cake_yield_percent = (cake_yield / seed_qty_after * 100) if seed_qty_after > 0 else 0
        sludge_yield_percent = (sludge_yield / seed_qty_after * 100) if seed_qty_after > 0 else 0
        
        # Begin transaction
        cur.execute("BEGIN")
        
        # Insert batch record
        cur.execute("""
            INSERT INTO batch (
                batch_code, oil_type, seed_quantity_before_drying,
                seed_quantity_after_drying, drying_loss, oil_yield,
                oil_yield_percent, oil_cake_yield, oil_cake_yield_percent,
                sludge_yield, sludge_yield_percent, production_date, recipe_id,
                traceable_code, seed_purchase_code, seed_material_id
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING batch_id
        """, (
            batch_code,
            oil_type,
            float(seed_qty_before),
            float(seed_qty_after),
            float(drying_loss),
            float(oil_yield),
            float(oil_yield_percent),
            float(cake_yield),
            float(cake_yield_percent),
            float(sludge_yield),
            float(sludge_yield_percent),
            production_date,
            None,  # recipe_id
            batch_traceable_code,
            seed_purchase_code,
            material_id
        ))
        
        batch_id = cur.fetchone()[0]
        
        # Process cost details with element_id support
        total_production_cost = safe_decimal(data.get('seed_cost_total', 0))
        
        # FIXED: Insert cost elements with element_id
        cost_details = data.get('cost_details', [])
        for cost_item in cost_details:
            element_name = cost_item.get('element_name', '')
            element_id = cost_item.get('element_id')  # Get element_id from frontend
            
            # If element_id not provided, try to look it up
            if not element_id and element_name:
                cur.execute("""
                    SELECT element_id 
                    FROM cost_elements_master 
                    WHERE element_name = %s 
                        AND is_active = true
                    LIMIT 1
                """, (element_name,))
                
                result = cur.fetchone()
                element_id = result[0] if result else None
            
            master_rate = safe_float(cost_item.get('master_rate', 0))
            
            # Handle override rate
            override_rate_value = cost_item.get('override_rate')
            if override_rate_value in (None, '', 'null'):
                override_rate = master_rate
            else:
                override_rate = safe_float(override_rate_value, master_rate)
            
            quantity = safe_float(cost_item.get('quantity', 0))
            total_cost = safe_float(cost_item.get('total_cost', 0))
            
            # Add to total production cost
            total_production_cost += Decimal(str(total_cost))
            
            # Check if cost already exists (might be from time tracking)
            if element_id:
                cur.execute("""
                    SELECT cost_id FROM batch_extended_costs
                    WHERE batch_id = %s AND element_id = %s
                """, (batch_id, element_id))
            else:
                cur.execute("""
                    SELECT cost_id FROM batch_extended_costs
                    WHERE batch_id = %s AND element_name = %s
                """, (batch_id, element_name))
            
            existing = cur.fetchone()
            
            if existing:
                # Update existing cost
                cur.execute("""
                    UPDATE batch_extended_costs
                    SET element_id = %s,
                        quantity_or_hours = %s,
                        rate_used = %s,
                        total_cost = %s,
                        is_applied = %s,
                        created_by = %s
                    WHERE cost_id = %s
                """, (
                    element_id,
                    quantity,
                    override_rate,
                    total_cost,
                    True,
                    'Batch Production',
                    existing[0]
                ))
            else:
                # Insert new cost with element_id
                cur.execute("""
                    INSERT INTO batch_extended_costs (
                        batch_id, element_id, element_name,
                        quantity_or_hours, rate_used, total_cost,
                        is_applied, created_by
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    batch_id,
                    element_id,  # Now properly included
                    element_name,
                    quantity,
                    override_rate,
                    total_cost,
                    True,
                    'Batch Production'
                ))
        
        # Calculate net oil cost
        cake_estimated_rate = safe_decimal(data.get('cake_estimated_rate', 0))
        sludge_estimated_rate = safe_decimal(data.get('sludge_estimated_rate', 0))
        
        cake_revenue = cake_yield * cake_estimated_rate
        sludge_revenue = sludge_yield * sludge_estimated_rate
        net_oil_cost = total_production_cost - cake_revenue - sludge_revenue
        oil_cost_per_kg = net_oil_cost / oil_yield if oil_yield > 0 else 0
        
        # Update batch with cost information
        cur.execute("""
            UPDATE batch 
            SET total_production_cost = %s,
                net_oil_cost = %s,
                oil_cost_per_kg = %s,
                cake_estimated_rate = %s,
                sludge_estimated_rate = %s
            WHERE batch_id = %s
        """, (
            float(total_production_cost),
            float(net_oil_cost),
            float(oil_cost_per_kg),
            float(cake_estimated_rate),
            float(sludge_estimated_rate),
            batch_id
        ))
        
        # Update inventory
        # 1. Reduce seed inventory
        cur.execute("""
            UPDATE inventory
            SET closing_stock = closing_stock - %s,
                consumption = consumption + %s,
                last_updated = %s
            WHERE material_id = %s
        """, (
            float(seed_qty_before),
            float(seed_qty_before),
            production_date,
            material_id
        ))
        
        # 2. Add oil to inventory
        cur.execute("""
            SELECT inventory_id, closing_stock, weighted_avg_cost 
            FROM inventory 
            WHERE material_id IS NULL 
                AND product_id IS NULL
                AND oil_type = %s
                AND is_bulk_oil = true
                AND source_type = 'extraction'
            ORDER BY inventory_id DESC
            LIMIT 1
        """, (oil_type,))
        
        oil_inv = cur.fetchone()
        
        if oil_inv:
            # Update existing oil inventory with weighted average
            old_stock = float(oil_inv[1])
            old_avg_cost = float(oil_inv[2])
            new_stock = old_stock + float(oil_yield)
            
            # Calculate new weighted average
            total_value = (old_stock * old_avg_cost) + (float(oil_yield) * float(oil_cost_per_kg))
            new_avg_cost = total_value / new_stock if new_stock > 0 else float(oil_cost_per_kg)
            
            cur.execute("""
                UPDATE inventory
                SET closing_stock = %s,
                    weighted_avg_cost = %s,
                    last_updated = %s
                WHERE inventory_id = %s
            """, (new_stock, new_avg_cost, production_date, oil_inv[0]))
        else:
            # Create new oil inventory record
            cur.execute("""
                INSERT INTO inventory (
                    oil_type, closing_stock, weighted_avg_cost,
                    last_updated, source_type, source_reference_id,
                    is_bulk_oil
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                oil_type,
                float(oil_yield),
                float(oil_cost_per_kg),
                production_date,
                'extraction',
                batch_id,
                True
            ))
        
        # 3. Add oil cake to inventory
        if cake_yield > 0:
            cur.execute("""
                INSERT INTO oil_cake_inventory (
                    batch_id, oil_type, quantity_produced,
                    quantity_remaining, estimated_rate, production_date
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                batch_id,
                oil_type,
                float(cake_yield),
                float(cake_yield),
                float(cake_estimated_rate),
                production_date
            ))
        
        # Commit transaction
        conn.commit()
        
        print(f"Batch created successfully with oil type: {oil_type}")
        
        return jsonify({
            'success': True,
            'batch_id': batch_id,
            'batch_code': batch_code,
            'traceable_code': batch_traceable_code,
            'oil_type': oil_type,
            'oil_cost_per_kg': float(oil_cost_per_kg),
            'total_oil_produced': float(oil_yield),
            'net_oil_cost': float(net_oil_cost),
            'message': f'Batch {batch_code} created successfully with {oil_type} oil and traceable code {batch_traceable_code}!'
        }), 201
        
    except Exception as e:
        conn.rollback()
        print(f"Error in add_batch: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@batch_bp.route('/api/batch_history', methods=['GET'])
def get_batch_history():
    """Get batch production history with filters, analytics, and traceable codes"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get query parameters
        limit = request.args.get('limit', 50, type=int)
        oil_type = request.args.get('oil_type', None)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Build query with filters
        query = """
            SELECT 
                b.batch_id,
                b.batch_code,
                b.oil_type,
                b.production_date,
                b.seed_quantity_before_drying,
                b.seed_quantity_after_drying,
                b.drying_loss,
                b.oil_yield,
                b.oil_yield_percent,
                b.oil_cake_yield,
                b.oil_cake_yield_percent,
                b.sludge_yield,
                b.sludge_yield_percent,
                b.total_production_cost,
                b.net_oil_cost,
                b.oil_cost_per_kg,
                b.cake_estimated_rate,
                b.sludge_estimated_rate,
                COALESCE(b.cake_sold_quantity, 0) as cake_sold,
                COALESCE(b.oil_cake_yield - b.cake_sold_quantity, b.oil_cake_yield) as cake_remaining,
                b.traceable_code
            FROM batch b
            WHERE 1=1
        """
        
        params = []
        
        if oil_type:
            query += " AND b.oil_type = %s"
            params.append(oil_type)
            
        if start_date:
            query += " AND b.production_date >= %s"
            params.append(parse_date(start_date))
            
        if end_date:
            query += " AND b.production_date <= %s"
            params.append(parse_date(end_date))
            
        query += " ORDER BY b.production_date DESC, b.batch_id DESC LIMIT %s"
        params.append(limit)
        
        cur.execute(query, params)
        
        batches = []
        for row in cur.fetchall():
            batches.append({
                'batch_id': row[0],
                'batch_code': row[1],
                'oil_type': row[2],
                'production_date': integer_to_date(row[3], '%d-%m-%Y'),
                'seed_quantity_before': float(row[4]),
                'seed_quantity_after': float(row[5]),
                'drying_loss': float(row[6]),
                'oil_yield': float(row[7]),
                'oil_yield_percent': float(row[8]),
                'cake_yield': float(row[9]),
                'cake_yield_percent': float(row[10]),
                'sludge_yield': float(row[11]) if row[11] else 0,
                'sludge_yield_percent': float(row[12]) if row[12] else 0,
                'total_production_cost': float(row[13]),
                'net_oil_cost': float(row[14]),
                'oil_cost_per_kg': float(row[15]),
                'cake_rate': float(row[16]) if row[16] else 0,
                'sludge_rate': float(row[17]) if row[17] else 0,
                'cake_sold': float(row[18]),
                'cake_remaining': float(row[19]),
                'traceable_code': row[20]
            })
        
        # Get summary statistics
        summary_query = """
            SELECT 
                COUNT(*) as total_batches,
                COALESCE(SUM(seed_quantity_before_drying), 0) as total_seeds_used,
                COALESCE(SUM(oil_yield), 0) as total_oil_produced,
                COALESCE(SUM(oil_cake_yield), 0) as total_cake_produced,
                COALESCE(SUM(sludge_yield), 0) as total_sludge_produced,
                COALESCE(AVG(oil_yield_percent), 0) as avg_oil_yield_percent,
                COALESCE(AVG(oil_cost_per_kg), 0) as avg_oil_cost,
                COALESCE(SUM(total_production_cost), 0) as total_production_cost,
                COALESCE(SUM(net_oil_cost), 0) as total_net_oil_cost
            FROM batch
            WHERE 1=1
        """
        
        # Apply same filters
        if oil_type:
            summary_query += " AND oil_type = %s"
        if start_date:
            summary_query += " AND production_date >= %s"
        if end_date:
            summary_query += " AND production_date <= %s"
            
        cur.execute(summary_query, params[:-1])  # Exclude limit
        stats = cur.fetchone()
        
        # Get oil type breakdown
        cur.execute("""
            SELECT 
                oil_type,
                COUNT(*) as batch_count,
                COALESCE(SUM(oil_yield), 0) as total_oil,
                COALESCE(AVG(oil_yield_percent), 0) as avg_yield_percent,
                COALESCE(AVG(oil_cost_per_kg), 0) as avg_cost
            FROM batch
            GROUP BY oil_type
            ORDER BY total_oil DESC
        """)
        
        oil_type_summary = []
        for row in cur.fetchall():
            oil_type_summary.append({
                'oil_type': row[0],
                'batch_count': row[1],
                'total_oil': float(row[2]),
                'avg_yield_percent': float(row[3]),
                'avg_cost': float(row[4])
            })
        
        return jsonify({
            'success': True,
            'batches': batches,
            'count': len(batches),
            'summary': {
                'total_batches': stats[0],
                'total_seeds_used': float(stats[1]),
                'total_oil_produced': float(stats[2]),
                'total_cake_produced': float(stats[3]),
                'total_sludge_produced': float(stats[4]),
                'avg_oil_yield_percent': float(stats[5]),
                'avg_oil_cost': float(stats[6]),
                'total_production_cost': float(stats[7]),
                'total_net_oil_cost': float(stats[8])
            },
            'oil_type_summary': oil_type_summary
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@batch_bp.route('/api/batch/<int:batch_id>', methods=['GET'])
def get_batch_details(batch_id):
    """Get detailed information about a specific batch"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get batch details
        cur.execute("""
            SELECT 
                b.*,
                m.material_name as seed_material_name
            FROM batch b
            LEFT JOIN materials m ON b.seed_material_id = m.material_id
            WHERE b.batch_id = %s
        """, (batch_id,))
        
        columns = [desc[0] for desc in cur.description]
        batch_data = cur.fetchone()
        
        if not batch_data:
            return jsonify({'success': False, 'error': 'Batch not found'}), 404
        
        batch = dict(zip(columns, batch_data))
        
        # Format dates and numbers
        if batch.get('production_date'):
            batch['production_date'] = integer_to_date(batch['production_date'], '%d-%m-%Y')
        
        # Get extended costs
        cur.execute("""
            SELECT 
                bec.*,
                cem.category,
                cem.activity,
                cem.unit_type,
                cem.calculation_method
            FROM batch_extended_costs bec
            LEFT JOIN cost_elements_master cem ON bec.element_id = cem.element_id
            WHERE bec.batch_id = %s
            ORDER BY cem.display_order, bec.element_name
        """, (batch_id,))
        
        costs = []
        for row in cur.fetchall():
            cost_columns = [desc[0] for desc in cur.description]
            costs.append(dict(zip(cost_columns, row)))
        
        batch['extended_costs'] = costs
        
        return jsonify({
            'success': True,
            'batch': batch
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)
