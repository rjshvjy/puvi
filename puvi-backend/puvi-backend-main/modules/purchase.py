"""
Purchase Module for PUVI Oil Manufacturing System - Multi-Item Support
Handles multi-item purchase invoices with tag support and traceability
Enhanced with category/subcategory support for dynamic oil types
File Path: puvi-backend/puvi-backend-main/modules/purchase.py
"""

from flask import Blueprint, request, jsonify
from decimal import Decimal
from db_utils import get_db_connection, close_connection
from inventory_utils import update_inventory
from utils.date_utils import date_to_day_number, integer_to_date
from utils.validation import safe_decimal, validate_required_fields
from utils.traceability import generate_purchase_traceable_code

# Create Blueprint
purchase_bp = Blueprint('purchase', __name__)

@purchase_bp.route('/api/materials', methods=['GET'])
def get_materials():
    """Get materials, optionally filtered by supplier"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        supplier_id = request.args.get('supplier_id', type=int)
        
        if supplier_id:
            # Get materials for specific supplier with tags and subcategory info
            # ENHANCED: Added subcategory information to material queries
            cur.execute("""
                SELECT 
                    m.material_id,
                    m.material_name,
                    m.current_cost,
                    m.gst_rate,
                    m.unit,
                    m.category,
                    ARRAY_AGG(DISTINCT t.tag_name) as tags,
                    m.short_code,
                    m.subcategory_id,
                    s.subcategory_name,
                    s.oil_type
                FROM materials m
                LEFT JOIN material_tags mt ON m.material_id = mt.material_id
                LEFT JOIN tags t ON mt.tag_id = t.tag_id
                LEFT JOIN subcategories_master s ON m.subcategory_id = s.subcategory_id
                WHERE m.supplier_id = %s
                GROUP BY m.material_id, m.material_name, m.current_cost, 
                         m.gst_rate, m.unit, m.category, m.short_code,
                         m.subcategory_id, s.subcategory_name, s.oil_type
                ORDER BY m.material_name
            """, (supplier_id,))
        else:
            # Get all materials with supplier info, tags, and subcategory info
            cur.execute("""
                SELECT 
                    m.material_id,
                    m.material_name,
                    m.current_cost,
                    m.gst_rate,
                    m.unit,
                    m.category,
                    sup.supplier_id,
                    sup.supplier_name,
                    ARRAY_AGG(DISTINCT t.tag_name) as tags,
                    m.short_code,
                    m.subcategory_id,
                    s.subcategory_name,
                    s.oil_type
                FROM materials m
                LEFT JOIN suppliers sup ON m.supplier_id = sup.supplier_id
                LEFT JOIN material_tags mt ON m.material_id = mt.material_id
                LEFT JOIN tags t ON mt.tag_id = t.tag_id
                LEFT JOIN subcategories_master s ON m.subcategory_id = s.subcategory_id
                GROUP BY m.material_id, m.material_name, m.current_cost, 
                         m.gst_rate, m.unit, m.category, sup.supplier_id, 
                         sup.supplier_name, m.short_code, m.subcategory_id,
                         s.subcategory_name, s.oil_type
                ORDER BY m.material_name
            """)
        
        materials = []
        for row in cur.fetchall():
            material = {
                'material_id': row[0],
                'material_name': row[1],
                'current_cost': float(row[2]),
                'gst_rate': float(row[3]),
                'unit': row[4],
                'category': row[5],
                'tags': row[6] if supplier_id else row[8],
                'short_code': row[7] if supplier_id else row[9],
                # NEW: Subcategory information
                'subcategory_id': row[8] if supplier_id else row[10],
                'subcategory_name': row[9] if supplier_id else row[11],
                'oil_type': row[10] if supplier_id else row[12]
            }
            
            if not supplier_id:
                material['supplier_id'] = row[6]
                material['supplier_name'] = row[7]
                
            materials.append(material)
        
        return jsonify({
            'success': True,
            'materials': materials,
            'count': len(materials)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# NEW ENDPOINT: Create material with subcategory support
@purchase_bp.route('/api/materials', methods=['POST'])
def create_material():
    """
    Create a new material with category/subcategory support
    ENHANCED: Validates subcategory requirement for Seeds/Oil categories
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        # Validate required fields
        required = ['material_name', 'supplier_id', 'category', 'unit', 'current_cost', 'gst_rate']
        is_valid, missing = validate_required_fields(data, required)
        
        if not is_valid:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing)}'
            }), 400
        
        # CRITICAL: Check if category requires subcategory
        cur.execute("""
            SELECT requires_subcategory 
            FROM categories_master 
            WHERE category_name = %s AND is_active = true
        """, (data['category'],))
        
        category_result = cur.fetchone()
        if not category_result:
            return jsonify({
                'success': False,
                'error': f'Invalid category: {data["category"]}'
            }), 400
        
        requires_subcategory = category_result[0]
        
        # Validate subcategory requirement
        if requires_subcategory and not data.get('subcategory_id'):
            return jsonify({
                'success': False,
                'error': f'Category "{data["category"]}" requires a subcategory selection'
            }), 400
        
        # If subcategory provided, validate it belongs to the category
        subcategory_id = data.get('subcategory_id')
        if subcategory_id:
            cur.execute("""
                SELECT s.subcategory_name, c.category_name 
                FROM subcategories_master s
                JOIN categories_master c ON s.category_id = c.category_id
                WHERE s.subcategory_id = %s AND s.is_active = true
            """, (subcategory_id,))
            
            subcat_result = cur.fetchone()
            if not subcat_result:
                return jsonify({
                    'success': False,
                    'error': 'Invalid subcategory ID'
                }), 400
            
            if subcat_result[1] != data['category']:
                return jsonify({
                    'success': False,
                    'error': f'Subcategory does not belong to category {data["category"]}'
                }), 400
        
        # Check if material already exists for this supplier
        cur.execute("""
            SELECT material_id FROM materials 
            WHERE material_name = %s AND supplier_id = %s
        """, (data['material_name'], data['supplier_id']))
        
        if cur.fetchone():
            return jsonify({
                'success': False,
                'error': 'Material already exists for this supplier'
            }), 400
        
        # Generate short code if not provided
        short_code = data.get('short_code')
        if not short_code:
            # Auto-generate from first 6 chars of name
            short_code = ''.join(data['material_name'].split())[:6].upper()
        
        # FIXED: Extract oil_type from subcategory for seed materials
        produces_oil_type = None
        if subcategory_id and data['category'] == 'Seeds':
            cur.execute("""
                SELECT oil_type
                FROM subcategories_master
                WHERE subcategory_id = %s AND is_active = true
            """, (subcategory_id,))
            
            result = cur.fetchone()
            if result and result[0]:
                produces_oil_type = result[0]
                print(f"Auto-setting produces_oil_type to '{produces_oil_type}' from subcategory")
        
        # Insert new material with subcategory AND produces_oil_type
        cur.execute("""
            INSERT INTO materials (
                material_name, supplier_id, category, subcategory_id,
                unit, current_cost, gst_rate, density, 
                short_code, material_type, is_active, last_updated,
                produces_oil_type
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING material_id
        """, (
            data['material_name'],
            data['supplier_id'],
            data['category'],
            subcategory_id,
            data['unit'],
            float(data['current_cost']),
            float(data['gst_rate']),
            float(data.get('density', 0.91)),
            short_code,
            data.get('material_type', 'raw'),
            True,
            date_to_day_number('today'),
            produces_oil_type
        ))
        
        material_id = cur.fetchone()[0]
        
        # Handle tags if provided
        if 'tags' in data and data['tags']:
            for tag_name in data['tags']:
                # Get or create tag
                cur.execute("""
                    INSERT INTO tags (tag_name, tag_category)
                    VALUES (%s, %s)
                    ON CONFLICT (tag_name) DO NOTHING
                    RETURNING tag_id
                """, (tag_name, 'material'))
                
                result = cur.fetchone()
                if result:
                    tag_id = result[0]
                else:
                    cur.execute("SELECT tag_id FROM tags WHERE tag_name = %s", (tag_name,))
                    tag_id = cur.fetchone()[0]
                
                # Link tag to material
                cur.execute("""
                    INSERT INTO material_tags (material_id, tag_id)
                    VALUES (%s, %s)
                    ON CONFLICT DO NOTHING
                """, (material_id, tag_id))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Material created successfully',
            'material_id': material_id
        }), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@purchase_bp.route('/api/add_purchase', methods=['POST'])
def add_purchase():
    """Add a new multi-item purchase transaction with traceability"""
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Validate required fields
        required = ['supplier_id', 'invoice_ref', 'purchase_date', 'items']
        is_valid, missing = validate_required_fields(data, required)
        
        if not is_valid:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing)}'
            }), 400
        
        if not data['items'] or len(data['items']) == 0:
            return jsonify({
                'success': False,
                'error': 'At least one item is required'
            }), 400
        
        # Check if supplier has short code
        cur.execute("""
            SELECT short_code FROM suppliers WHERE supplier_id = %s
        """, (data['supplier_id'],))
        supplier_result = cur.fetchone()
        
        if not supplier_result or not supplier_result[0]:
            return jsonify({
                'success': False,
                'error': 'Supplier short code not set. Please set a 3-letter code for this supplier first.'
            }), 400
        
        # Begin transaction
        cur.execute("BEGIN")
        
        # Calculate totals
        subtotal = Decimal('0')
        total_gst = Decimal('0')
        
        # First pass - calculate subtotal and GST
        for item in data['items']:
            amount = safe_decimal(item['quantity']) * safe_decimal(item['rate'])
            subtotal += amount
            
            # GST on item amount + allocated charges
            item_transport = safe_decimal(item.get('transport_charges', 0))
            item_handling = safe_decimal(item.get('handling_charges', 0))
            taxable_amount = amount + item_transport + item_handling
            gst_amount = taxable_amount * safe_decimal(item['gst_rate']) / 100
            total_gst += gst_amount
        
        # Total cost including charges at header level
        transport_cost = safe_decimal(data.get('transport_cost', 0))
        handling_charges = safe_decimal(data.get('handling_charges', 0))  
        total_cost = subtotal + total_gst + transport_cost + handling_charges
        
        # Convert date
        purchase_date = date_to_day_number(data['purchase_date'])
        
        # Insert purchase header
        cur.execute("""
            INSERT INTO purchases (
                supplier_id, invoice_ref, purchase_date,
                transport_cost, loading_charges, 
                subtotal, total_gst_amount, total_cost
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING purchase_id
        """, (
            data['supplier_id'],
            data['invoice_ref'],
            purchase_date,
            float(transport_cost),
            float(handling_charges),
            float(subtotal),
            float(total_gst),
            float(total_cost)
        ))
        
        purchase_id = cur.fetchone()[0]
        
        # Insert purchase items with traceable codes
        traceable_codes = []
        
        for item in data['items']:
            # Check if material has short code
            cur.execute("""
                SELECT short_code FROM materials WHERE material_id = %s
            """, (item['material_id'],))
            material_result = cur.fetchone()
            
            if not material_result or not material_result[0]:
                conn.rollback()
                return jsonify({
                    'success': False,
                    'error': f'Material short code not set for material ID {item["material_id"]}. Please set short codes for all materials first.'
                }), 400
            
            quantity = safe_decimal(item['quantity'])
            rate = safe_decimal(item['rate'])
            amount = quantity * rate
            gst_rate = safe_decimal(item['gst_rate'])
            
            # Item-level charges
            item_transport = safe_decimal(item.get('transport_charges', 0))
            item_handling = safe_decimal(item.get('handling_charges', 0))
            
            # Calculate GST on (amount + charges)
            taxable_amount = amount + item_transport + item_handling
            gst_amount = taxable_amount * gst_rate / 100
            
            # Total for this item
            item_total = amount + gst_amount + item_transport + item_handling
            landed_cost_per_unit = item_total / quantity if quantity > 0 else 0
            
            # Generate traceable code for this item
            try:
                traceable_code = generate_purchase_traceable_code(
                    item['material_id'],
                    data['supplier_id'],
                    purchase_date,
                    cur
                )
                traceable_codes.append(traceable_code)
            except Exception as e:
                conn.rollback()
                return jsonify({
                    'success': False,
                    'error': f'Error generating traceable code: {str(e)}'
                }), 500
            
            # Insert item
            cur.execute("""
                INSERT INTO purchase_items (
                    purchase_id, material_id, quantity, rate, amount,
                    gst_rate, gst_amount, transport_charges, handling_charges,
                    total_amount, landed_cost_per_unit
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                purchase_id,
                item['material_id'],
                float(quantity),
                float(rate),
                float(amount),
                float(gst_rate),
                float(gst_amount),
                float(item_transport),
                float(item_handling),
                float(item_total),
                float(landed_cost_per_unit)
            ))
            
            # Update inventory
            update_inventory(
                item['material_id'],
                float(quantity),
                float(landed_cost_per_unit),
                conn,
                cur
            )
            
            # Update material's current cost
            cur.execute("""
                UPDATE materials 
                SET current_cost = (
                    SELECT weighted_avg_cost 
                    FROM inventory 
                    WHERE material_id = %s 
                    ORDER BY inventory_id DESC 
                    LIMIT 1
                ),
                last_updated = %s
                WHERE material_id = %s
            """, (item['material_id'], purchase_date, item['material_id']))
        
        # Update purchase record with traceable codes (store first code as reference)
        if traceable_codes:
            cur.execute("""
                UPDATE purchases
                SET traceable_code = %s
                WHERE purchase_id = %s
            """, (traceable_codes[0], purchase_id))
        
        # Commit transaction
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Purchase added successfully with traceable codes',
            'purchase_id': purchase_id,
            'invoice_ref': data['invoice_ref'],
            'total_cost': float(total_cost),
            'items_count': len(data['items']),
            'traceable_codes': traceable_codes
        }), 201
        
    except Exception as e:
        conn.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@purchase_bp.route('/api/purchase_history', methods=['GET'])
def get_purchase_history():
    """Get purchase history with header and items including traceable codes"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        limit = request.args.get('limit', 50, type=int)
        supplier_id = request.args.get('supplier_id', type=int)
        
        # Get purchase headers
        query = """
            SELECT 
                p.purchase_id,
                p.invoice_ref,
                p.purchase_date,
                p.supplier_id,
                s.supplier_name,
                p.transport_cost,
                p.loading_charges,
                p.subtotal,
                p.total_gst_amount,
                p.total_cost,
                COUNT(pi.item_id) as item_count,
                p.traceable_code
            FROM purchases p
            LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
            LEFT JOIN purchase_items pi ON p.purchase_id = pi.purchase_id
            WHERE 1=1
        """
        
        params = []
        if supplier_id:
            query += " AND p.supplier_id = %s"
            params.append(supplier_id)
            
        query += " GROUP BY p.purchase_id, p.invoice_ref, p.purchase_date, "
        query += "p.supplier_id, s.supplier_name, p.transport_cost, "
        query += "p.loading_charges, p.subtotal, p.total_gst_amount, p.total_cost, p.traceable_code"
        query += " ORDER BY p.purchase_date DESC, p.purchase_id DESC LIMIT %s"
        params.append(limit)
        
        cur.execute(query, params)
        
        purchases = []
        for row in cur.fetchall():
            purchase = {
                'purchase_id': row[0],
                'invoice_ref': row[1],
                'purchase_date': integer_to_date(row[2]),
                'supplier_id': row[3],
                'supplier_name': row[4],
                'transport_cost': float(row[5]) if row[5] else 0,
                'handling_charges': float(row[6]) if row[6] else 0,
                'subtotal': float(row[7]) if row[7] else 0,
                'total_gst': float(row[8]) if row[8] else 0,
                'total_cost': float(row[9]) if row[9] else 0,
                'item_count': row[10],
                'traceable_code': row[11]
            }
            
            # Get items for this purchase with subcategory info
            # ENHANCED: Added subcategory and oil_type to item details
            cur.execute("""
                SELECT 
                    pi.item_id,
                    pi.material_id,
                    m.material_name,
                    m.unit,
                    pi.quantity,
                    pi.rate,
                    pi.amount,
                    pi.gst_rate,
                    pi.gst_amount,
                    pi.transport_charges,
                    pi.handling_charges,
                    pi.total_amount,
                    pi.landed_cost_per_unit,
                    m.short_code,
                    m.category,
                    s.subcategory_name,
                    s.oil_type
                FROM purchase_items pi
                JOIN materials m ON pi.material_id = m.material_id
                LEFT JOIN subcategories_master s ON m.subcategory_id = s.subcategory_id
                WHERE pi.purchase_id = %s
                ORDER BY pi.item_id
            """, (row[0],))
            
            items = []
            for item_row in cur.fetchall():
                items.append({
                    'item_id': item_row[0],
                    'material_id': item_row[1],
                    'material_name': item_row[2],
                    'unit': item_row[3],
                    'quantity': float(item_row[4]),
                    'rate': float(item_row[5]),
                    'amount': float(item_row[6]),
                    'gst_rate': float(item_row[7]),
                    'gst_amount': float(item_row[8]),
                    'transport_charges': float(item_row[9]),
                    'handling_charges': float(item_row[10]),
                    'total_amount': float(item_row[11]),
                    'landed_cost_per_unit': float(item_row[12]),
                    'material_short_code': item_row[13],
                    # NEW: Category and subcategory info
                    'category': item_row[14],
                    'subcategory_name': item_row[15],
                    'oil_type': item_row[16]
                })
            
            purchase['items'] = items
            purchases.append(purchase)
        
        # Get summary
        cur.execute("""
            SELECT 
                COUNT(DISTINCT p.purchase_id) as total_purchases,
                COALESCE(SUM(p.total_cost), 0) as total_amount,
                COUNT(DISTINCT p.supplier_id) as unique_suppliers,
                COUNT(DISTINCT pi.material_id) as unique_materials
            FROM purchases p
            LEFT JOIN purchase_items pi ON p.purchase_id = pi.purchase_id
        """)
        
        stats = cur.fetchone()
        
        return jsonify({
            'success': True,
            'purchases': purchases,
            'count': len(purchases),
            'summary': {
                'total_purchases': stats[0],
                'total_amount': float(stats[1]),
                'unique_suppliers': stats[2],
                'unique_materials': stats[3]
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@purchase_bp.route('/api/suppliers', methods=['GET'])
def get_suppliers():
    """Get list of suppliers with material count and short codes"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT 
                s.supplier_id,
                s.supplier_name,
                s.contact_person,
                s.phone,
                s.email,
                s.gst_number,
                COUNT(DISTINCT m.material_id) as material_count,
                s.short_code
            FROM suppliers s
            LEFT JOIN materials m ON s.supplier_id = m.supplier_id
            GROUP BY s.supplier_id, s.supplier_name, s.contact_person,
                     s.phone, s.email, s.gst_number, s.short_code
            ORDER BY s.supplier_name
        """)
        
        suppliers = []
        for row in cur.fetchall():
            suppliers.append({
                'supplier_id': row[0],
                'supplier_name': row[1],
                'contact_person': row[2],
                'phone': row[3],
                'email': row[4],
                'gst_number': row[5],
                'material_count': row[6],
                'short_code': row[7]
            })
        
        return jsonify({
            'success': True,
            'suppliers': suppliers,
            'count': len(suppliers)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@purchase_bp.route('/api/tags', methods=['GET'])
def get_tags():
    """Get all available tags"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT tag_id, tag_name, tag_category
            FROM tags
            ORDER BY tag_category, tag_name
        """)
        
        tags = []
        for row in cur.fetchall():
            tags.append({
                'tag_id': row[0],
                'tag_name': row[1],
                'tag_category': row[2]
            })
        
        # Group by category
        tags_by_category = {}
        for tag in tags:
            category = tag['tag_category'] or 'Other'
            if category not in tags_by_category:
                tags_by_category[category] = []
            tags_by_category[category].append(tag)
        
        return jsonify({
            'success': True,
            'tags': tags,
            'tags_by_category': tags_by_category,
            'count': len(tags)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)
