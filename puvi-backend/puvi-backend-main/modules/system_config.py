"""
System Configuration Service for PUVI
File Path: puvi-backend/puvi-backend-main/modules/system_config.py
Returns centralized configuration values from database - NO HARDCODED VALUES
Updated: All values now fetched from database
"""

from flask import Blueprint, request, jsonify
from db_utils import get_db_connection, close_connection

system_config_bp = Blueprint('system_config', __name__)

# =====================================================
# GENERIC CONFIG ENDPOINT
# =====================================================

@system_config_bp.route('/api/config/<config_type>', methods=['GET'])
def get_config(config_type):
    """Get configuration values by type - all from database"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        values = []
        
        if config_type == 'oil_types':
            # Get from available_oil_types table
            cur.execute("""
                SELECT DISTINCT oil_type 
                FROM available_oil_types 
                ORDER BY oil_type
            """)
            values = [row[0] for row in cur.fetchall() if row[0]]
            
        elif config_type == 'gst_rates':
            # Get distinct GST rates from materials
            cur.execute("""
                SELECT DISTINCT gst_rate 
                FROM materials 
                WHERE gst_rate IS NOT NULL 
                ORDER BY gst_rate
            """)
            values = [float(row[0]) for row in cur.fetchall()]
            
        elif config_type == 'package_sizes':
            # Get from sku_master table - fixed query (no package_unit column)
            cur.execute("""
                SELECT DISTINCT package_size 
                FROM sku_master 
                WHERE package_size IS NOT NULL 
                ORDER BY package_size
            """)
            values = [row[0] for row in cur.fetchall() if row[0]]
            
        elif config_type == 'material_categories':
            # Get distinct categories from materials
            cur.execute("""
                SELECT DISTINCT category 
                FROM materials 
                WHERE category IS NOT NULL 
                AND is_active = true
                ORDER BY category
            """)
            values = [row[0] for row in cur.fetchall() if row[0]]
            
        elif config_type == 'writeoff_reasons':
            # NOW FROM DATABASE - not hardcoded
            cur.execute("""
                SELECT reason_code, reason_description, category
                FROM writeoff_reasons 
                WHERE is_active = true 
                ORDER BY reason_code
            """)
            values = [
                {
                    'code': row[0], 
                    'description': row[1], 
                    'category': row[2]
                } 
                for row in cur.fetchall()
            ]
            
        elif config_type == 'cost_elements':
            # Get from cost_elements_master
            cur.execute("""
                SELECT element_name, default_rate, unit_type, category
                FROM cost_elements_master 
                WHERE is_active = true 
                ORDER BY display_order, element_name
            """)
            values = [
                {
                    'name': row[0], 
                    'rate': float(row[1]) if row[1] else 0, 
                    'unit': row[2],
                    'category': row[3]
                } 
                for row in cur.fetchall()
            ]
            
        elif config_type == 'labor_rates':
            # Get labor-specific rates from cost_elements_master
            cur.execute("""
                SELECT element_name, default_rate, unit_type
                FROM cost_elements_master 
                WHERE category = 'Labor' 
                AND is_active = true 
                ORDER BY element_name
            """)
            values = [
                {
                    'name': row[0], 
                    'rate': float(row[1]) if row[1] else 0,
                    'unit': row[2]
                } 
                for row in cur.fetchall()
            ]
            
        elif config_type == 'density_values':
            # Get distinct density values from materials
            cur.execute("""
                SELECT DISTINCT density 
                FROM materials 
                WHERE density IS NOT NULL 
                AND density > 0
                ORDER BY density
            """)
            values = [float(row[0]) for row in cur.fetchall()]
            
        elif config_type == 'suppliers':
            # Get active suppliers
            cur.execute("""
                SELECT supplier_id, supplier_name, short_code
                FROM suppliers 
                WHERE is_active = true 
                ORDER BY supplier_name
            """)
            values = [
                {
                    'id': row[0], 
                    'name': row[1],
                    'short_code': row[2]
                } 
                for row in cur.fetchall()
            ]
            
        elif config_type == 'units':
            # Get distinct units from materials table
            cur.execute("""
                SELECT DISTINCT unit 
                FROM materials 
                WHERE unit IS NOT NULL 
                ORDER BY unit
            """)
            values = [row[0] for row in cur.fetchall() if row[0]]
            
        elif config_type == 'bom_categories':
            # Get BOM category mappings
            cur.execute("""
                SELECT bom_category, material_categories, keywords, display_order
                FROM bom_category_mapping 
                WHERE is_active = true 
                ORDER BY display_order, bom_category
            """)
            values = [
                {
                    'category': row[0],
                    'material_categories': row[1] if row[1] else [],
                    'keywords': row[2] if row[2] else [],
                    'order': row[3]
                }
                for row in cur.fetchall()
            ]
            
        elif config_type == 'bottle_types':
            # Get distinct bottle types from SKU master
            cur.execute("""
                SELECT DISTINCT bottle_type 
                FROM sku_master 
                WHERE bottle_type IS NOT NULL 
                ORDER BY bottle_type
            """)
            values = [row[0] for row in cur.fetchall() if row[0]]
            
        else:
            return jsonify({
                'success': False, 
                'error': f'Unknown config type: {config_type}'
            }), 400
            
        return jsonify({
            'success': True,
            'data': values,
            'values': values,  # Support both data and values keys
            'count': len(values)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        close_connection(conn, cur)


# =====================================================
# SPECIFIC ENDPOINTS FOR MATERIALS
# =====================================================

@system_config_bp.route('/api/materials/categories', methods=['GET'])
def get_material_categories():
    """Get distinct material categories from database"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get distinct categories from materials table
        cur.execute("""
            SELECT DISTINCT category 
            FROM materials 
            WHERE category IS NOT NULL 
            AND is_active = true
            ORDER BY category
        """)
        
        categories = [row[0] for row in cur.fetchall() if row[0]]
        
        return jsonify({
            'success': True,
            'categories': categories,
            'count': len(categories)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@system_config_bp.route('/api/materials/units', methods=['GET'])
def get_material_units():
    """Get distinct units from materials table"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get distinct units actually in use
        cur.execute("""
            SELECT DISTINCT unit 
            FROM materials 
            WHERE unit IS NOT NULL 
            ORDER BY unit
        """)
        
        units = [row[0] for row in cur.fetchall() if row[0]]
        
        return jsonify({
            'success': True,
            'units': units,
            'count': len(units)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# =====================================================
# BOM SPECIFIC ENDPOINTS
# =====================================================

@system_config_bp.route('/api/config/bom_categories', methods=['GET'])
def get_bom_categories():
    """Get BOM category mappings for dropdown"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT bom_category, material_categories, keywords, display_order
            FROM bom_category_mapping 
            WHERE is_active = true 
            ORDER BY display_order, bom_category
        """)
        
        categories = []
        for row in cur.fetchall():
            categories.append({
                'value': row[0],
                'label': row[0],
                'material_categories': row[1] if row[1] else [],
                'keywords': row[2] if row[2] else [],
                'order': row[3]
            })
        
        return jsonify({
            'success': True,
            'categories': categories,
            'count': len(categories)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@system_config_bp.route('/api/config/bom_materials', methods=['GET'])
def get_bom_materials():
    """Get materials filtered for BOM selection"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        bom_category = request.args.get('bom_category')
        
        if bom_category:
            # Get mapping for this BOM category
            cur.execute("""
                SELECT material_categories, keywords
                FROM bom_category_mapping 
                WHERE bom_category = %s 
                AND is_active = true
            """, (bom_category,))
            
            mapping = cur.fetchone()
            if mapping:
                material_categories = mapping[0] if mapping[0] else []
                keywords = mapping[1] if mapping[1] else []
                
                # Build query with filters
                query = """
                    SELECT material_id, material_name, category, unit, current_cost
                    FROM materials 
                    WHERE is_active = true
                """
                params = []
                
                if material_categories:
                    placeholders = ','.join(['%s'] * len(material_categories))
                    query += f" AND category IN ({placeholders})"
                    params.extend(material_categories)
                
                # Add keyword matching if needed
                if keywords:
                    keyword_conditions = []
                    for keyword in keywords:
                        keyword_conditions.append("material_name ILIKE %s")
                        params.append(f'%{keyword}%')
                    
                    if keyword_conditions:
                        query += f" AND ({' OR '.join(keyword_conditions)})"
                
                query += " ORDER BY material_name"
                cur.execute(query, params)
            else:
                # No mapping found, return all packaging materials
                cur.execute("""
                    SELECT material_id, material_name, category, unit, current_cost
                    FROM materials 
                    WHERE is_active = true
                    AND category IN ('Packaging', 'Labels', 'Bottles', 'Caps', 'Secondary Packaging')
                    ORDER BY material_name
                """)
        else:
            # No category specified, return all packaging materials
            cur.execute("""
                SELECT material_id, material_name, category, unit, current_cost
                FROM materials 
                WHERE is_active = true
                AND category IN ('Packaging', 'Labels', 'Bottles', 'Caps', 'Secondary Packaging')
                ORDER BY category, material_name
            """)
        
        materials = []
        for row in cur.fetchall():
            materials.append({
                'material_id': row[0],
                'material_name': row[1],
                'category': row[2],
                'unit': row[3],
                'current_cost': float(row[4]) if row[4] else 0
            })
        
        return jsonify({
            'success': True,
            'materials': materials,
            'count': len(materials)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# =====================================================
# WRITEOFF REASONS ENDPOINT
# =====================================================

@system_config_bp.route('/api/config/writeoff_reasons', methods=['GET'])
def get_writeoff_reasons():
    """Get writeoff reasons from database"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT reason_code, reason_description, category
            FROM writeoff_reasons 
            WHERE is_active = true 
            ORDER BY category, reason_code
        """)
        
        reasons = []
        for row in cur.fetchall():
            reasons.append({
                'value': row[0],
                'label': row[1],
                'category': row[2]
            })
        
        return jsonify({
            'success': True,
            'reasons': reasons,
            'count': len(reasons)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# =====================================================
# LABOR RATES ENDPOINT
# =====================================================

@system_config_bp.route('/api/config/labor_rates', methods=['GET'])
def get_labor_rates():
    """Get labor rates from cost_elements_master"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        activity = request.args.get('activity')
        
        if activity:
            # Get rates for specific activity
            cur.execute("""
                SELECT element_name, default_rate, unit_type, activity
                FROM cost_elements_master 
                WHERE category = 'Labor'
                AND activity = %s
                AND is_active = true 
                ORDER BY element_name
            """, (activity,))
        else:
            # Get all labor rates
            cur.execute("""
                SELECT element_name, default_rate, unit_type, activity
                FROM cost_elements_master 
                WHERE category = 'Labor'
                AND is_active = true 
                ORDER BY activity, element_name
            """)
        
        rates = []
        for row in cur.fetchall():
            rates.append({
                'element_name': row[0],
                'rate': float(row[1]) if row[1] else 0,
                'unit': row[2],
                'activity': row[3]
            })
        
        return jsonify({
            'success': True,
            'rates': rates,
            'count': len(rates)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# =====================================================
# REGISTER BLUEPRINT
# =====================================================
# Note: Make sure to register this blueprint in app.py:
# app.register_blueprint(system_config_bp)
