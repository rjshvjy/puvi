# puvi-backend/puvi-backend-main/modules/system_config.py
"""
System Configuration Service for PUVI
Returns centralized configuration values to replace hardcoded arrays
"""

from flask import Blueprint, request, jsonify
from db_utils import get_db_connection, close_connection

config_bp = Blueprint('config', __name__)

@config_bp.route('/api/config/<config_type>', methods=['GET'])
def get_config(config_type):
    """Get configuration values by type"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        values = []
        
        if config_type == 'oil_types':
            # Get from materials table - already exists
            cur.execute("""
                SELECT DISTINCT oil_type 
                FROM materials 
                WHERE oil_type IS NOT NULL 
                ORDER BY oil_type
            """)
            values = [row[0] for row in cur.fetchall()]
            
        elif config_type == 'gst_rates':
            # Get from materials table
            cur.execute("""
                SELECT DISTINCT gst_rate 
                FROM materials 
                WHERE gst_rate IS NOT NULL 
                ORDER BY gst_rate
            """)
            values = [float(row[0]) for row in cur.fetchall()]
            
        elif config_type == 'package_sizes':
            # Get from sku_master table
            cur.execute("""
                SELECT DISTINCT package_size, package_unit 
                FROM sku_master 
                WHERE package_size IS NOT NULL 
                ORDER BY package_size
            """)
            values = [f"{row[0]}{row[1]}" for row in cur.fetchall()]
            
        elif config_type == 'material_categories':
            # Get categories from materials
            cur.execute("""
                SELECT DISTINCT category 
                FROM materials 
                WHERE category IS NOT NULL 
                ORDER BY category
            """)
            values = [row[0] for row in cur.fetchall()]
            
        elif config_type == 'writeoff_reasons':
            # Hardcoded for now - can move to table later
            values = [
                'Expired',
                'Damaged',
                'Quality Issue',
                'Contaminated',
                'Processing Loss',
                'Other'
            ]
            
        elif config_type == 'cost_elements':
            # Get from cost_elements_master
            cur.execute("""
                SELECT element_name, default_rate, unit 
                FROM cost_elements_master 
                WHERE is_active = true 
                ORDER BY element_name
            """)
            values = [
                {'name': row[0], 'rate': float(row[1]), 'unit': row[2]} 
                for row in cur.fetchall()
            ]
            
        elif config_type == 'density_values':
            # Get from materials or use defaults
            cur.execute("""
                SELECT DISTINCT density 
                FROM materials 
                WHERE density IS NOT NULL 
                ORDER BY density
            """)
            result = cur.fetchall()
            values = [float(row[0]) for row in result] if result else [0.91]
            
        elif config_type == 'suppliers':
            # Get active suppliers
            cur.execute("""
                SELECT supplier_id, supplier_name 
                FROM suppliers 
                WHERE is_active = true 
                ORDER BY supplier_name
            """)
            values = [
                {'id': row[0], 'name': row[1]} 
                for row in cur.fetchall()
            ]
            
        elif config_type == 'units':
            # Common units used in system
            values = ['kg', 'L', 'ml', 'g', 'units', 'bottles']
            
        else:
            return jsonify({
                'success': False, 
                'error': f'Unknown config type: {config_type}'
            }), 400
            
        return jsonify({
            'success': True,
            'data': values,
            'values': values  # Support both data and values keys
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        close_connection(conn)
