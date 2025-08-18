# File Path: puvi-backend/puvi-backend-main/modules/sku_management.py
"""
SKU Management Module for PUVI Oil Manufacturing System
Handles SKU master data, BOM configuration, and version management
Version: 1.1 (Simplified - No cartons in production)
FIXED: Changed 'active' to 'is_active' for cost_elements_master table
"""

from flask import Blueprint, request, jsonify
from decimal import Decimal
from datetime import datetime
import json
from db_utils import get_db_connection, close_connection
from utils.date_utils import get_current_day_number, integer_to_date, parse_date
from utils.validation import safe_decimal, validate_required_fields

# Create Blueprint
sku_management_bp = Blueprint('sku_management', __name__)

# ============================================
# SKU MASTER MANAGEMENT
# ============================================

@sku_management_bp.route('/api/sku/master', methods=['GET'])
def get_sku_master_list():
    """Get list of all SKUs with basic information"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get filter parameters
        oil_type = request.args.get('oil_type')
        package_size = request.args.get('package_size')
        is_active = request.args.get('is_active', 'true').lower() == 'true'
        
        # Build query
        query = """
            SELECT 
                s.sku_id,
                s.sku_code,
                s.product_name,
                s.oil_type,
                s.package_size,
                s.bottle_type,
                s.density,
                s.is_active,
                COALESCE(b.version_number, 0) as current_bom_version,
                COALESCE(b.effective_from, 0) as bom_effective_from,
                COUNT(DISTINCT p.production_id) as total_productions,
                MAX(p.production_date) as last_production_date
            FROM sku_master s
            LEFT JOIN sku_bom_master b ON s.sku_id = b.sku_id AND b.is_current = true
            LEFT JOIN sku_production p ON s.sku_id = p.sku_id
            WHERE s.is_active = %s
        """
        params = [is_active]
        
        if oil_type:
            query += " AND s.oil_type = %s"
            params.append(oil_type)
        
        if package_size:
            query += " AND s.package_size = %s"
            params.append(package_size)
        
        query += """
            GROUP BY s.sku_id, s.sku_code, s.product_name, s.oil_type, 
                     s.package_size, s.bottle_type, s.density, s.is_active,
                     b.version_number, b.effective_from
            ORDER BY s.oil_type, s.package_size, s.sku_code
        """
        
        cur.execute(query, params)
        
        skus = []
        for row in cur.fetchall():
            skus.append({
                'sku_id': row[0],
                'sku_code': row[1],
                'product_name': row[2],
                'oil_type': row[3],
                'package_size': row[4],
                'bottle_type': row[5],
                'density': float(row[6]),
                'is_active': row[7],
                'current_bom_version': row[8],
                'bom_effective_from': integer_to_date(row[9]) if row[9] else None,
                'total_productions': row[10],
                'last_production_date': integer_to_date(row[11]) if row[11] else None
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


@sku_management_bp.route('/api/sku/master', methods=['POST'])
def create_sku():
    """Create a new SKU"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['sku_code', 'product_name', 'oil_type', 'package_size']
        is_valid, missing_fields = validate_required_fields(data, required_fields)
        
        if not is_valid:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        # Check if SKU code already exists
        cur.execute("SELECT sku_id FROM sku_master WHERE sku_code = %s", (data['sku_code'],))
        if cur.fetchone():
            return jsonify({'success': False, 'error': 'SKU code already exists'}), 400
        
        # Insert new SKU
        cur.execute("""
            INSERT INTO sku_master (
                sku_code, product_name, oil_type, package_size,
                bottle_type, density, is_active, created_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING sku_id
        """, (
            data['sku_code'],
            data['product_name'],
            data['oil_type'],
            data['package_size'],
            data.get('bottle_type', 'PET'),
            float(data.get('density', 0.91)),
            data.get('is_active', True),
            data.get('created_by', 'System')
        ))
        
        sku_id = cur.fetchone()[0]
        conn.commit()
        
        return jsonify({
            'success': True,
            'sku_id': sku_id,
            'message': 'SKU created successfully'
        }), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# ============================================
# BOM CONFIGURATION
# ============================================

@sku_management_bp.route('/api/sku/bom/<int:sku_id>', methods=['GET'])
def get_sku_bom(sku_id):
    """Get current BOM for a SKU"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get SKU details
        cur.execute("""
            SELECT sku_code, product_name, oil_type, package_size, density
            FROM sku_master
            WHERE sku_id = %s
        """, (sku_id,))
        
        sku_data = cur.fetchone()
        if not sku_data:
            return jsonify({'success': False, 'error': 'SKU not found'}), 404
        
        # Get current BOM
        cur.execute("""
            SELECT 
                b.bom_id,
                b.version_number,
                b.effective_from,
                b.effective_to,
                b.is_current,
                b.notes
            FROM sku_bom_master b
            WHERE b.sku_id = %s AND b.is_current = true
        """, (sku_id,))
        
        bom_data = cur.fetchone()
        
        bom_details = []
        total_material_cost = 0
        
        if bom_data:
            # Get BOM details
            cur.execute("""
                SELECT 
                    bd.detail_id,
                    bd.material_id,
                    m.material_name,
                    m.short_code,
                    m.unit,
                    bd.material_category,
                    bd.quantity_per_unit,
                    bd.is_shared,
                    bd.applicable_sizes,
                    m.current_cost,
                    bd.notes
                FROM sku_bom_details bd
                JOIN materials m ON bd.material_id = m.material_id
                WHERE bd.bom_id = %s
                ORDER BY bd.material_category, m.material_name
            """, (bom_data[0],))
            
            for detail in cur.fetchall():
                item_cost = float(detail[6]) * float(detail[9])
                total_material_cost += item_cost
                
                bom_details.append({
                    'detail_id': detail[0],
                    'material_id': detail[1],
                    'material_name': detail[2],
                    'short_code': detail[3],
                    'unit': detail[4],
                    'material_category': detail[5],
                    'quantity_per_unit': float(detail[6]),
                    'is_shared': detail[7],
                    'applicable_sizes': detail[8],
                    'current_cost': float(detail[9]),
                    'total_cost': item_cost,
                    'notes': detail[10]
                })
        
        # Get labor cost for this package size - FIXED: Changed 'active' to 'is_active'
        cur.execute("""
            SELECT element_id, element_name, default_rate
            FROM cost_elements_master
            WHERE element_name LIKE %s
            AND is_active = true
        """, (f'Packing Labour {sku_data[3]}%',))
        
        labor_data = cur.fetchone()
        labor_cost = float(labor_data[2]) if labor_data else 0
        
        return jsonify({
            'success': True,
            'sku': {
                'sku_id': sku_id,
                'sku_code': sku_data[0],
                'product_name': sku_data[1],
                'oil_type': sku_data[2],
                'package_size': sku_data[3],
                'density': float(sku_data[4])
            },
            'bom': {
                'bom_id': bom_data[0] if bom_data else None,
                'version_number': bom_data[1] if bom_data else 0,
                'effective_from': integer_to_date(bom_data[2]) if bom_data else None,
                'is_current': bom_data[4] if bom_data else False,
                'notes': bom_data[5] if bom_data else None
            } if bom_data else None,
            'bom_details': bom_details,
            'cost_summary': {
                'material_cost_per_unit': total_material_cost,
                'labor_cost_per_unit': labor_cost,
                'total_cost_per_unit': total_material_cost + labor_cost
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@sku_management_bp.route('/api/sku/bom', methods=['POST'])
def create_or_update_bom():
    """Create or update BOM for a SKU"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['sku_id', 'bom_details']
        is_valid, missing_fields = validate_required_fields(data, required_fields)
        
        if not is_valid:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        sku_id = data['sku_id']
        bom_details = data['bom_details']
        
        # Check if BOM exists
        cur.execute("""
            SELECT bom_id, version_number
            FROM sku_bom_master
            WHERE sku_id = %s AND is_current = true
        """, (sku_id,))
        
        existing_bom = cur.fetchone()
        
        cur.execute("BEGIN")
        
        if existing_bom and not data.get('create_new_version', False):
            # Update existing BOM
            bom_id = existing_bom[0]
            
            # Delete existing details
            cur.execute("DELETE FROM sku_bom_details WHERE bom_id = %s", (bom_id,))
            
            # Update BOM master
            cur.execute("""
                UPDATE sku_bom_master
                SET notes = %s
                WHERE bom_id = %s
            """, (data.get('notes', ''), bom_id))
        else:
            # Create new version
            new_version = existing_bom[1] + 1 if existing_bom else 1
            
            # Set current BOM as not current
            if existing_bom:
                cur.execute("""
                    UPDATE sku_bom_master
                    SET is_current = false,
                        effective_to = %s
                    WHERE sku_id = %s AND is_current = true
                """, (get_current_day_number(), sku_id))
            
            # Create new BOM master
            cur.execute("""
                INSERT INTO sku_bom_master (
                    sku_id, version_number, effective_from,
                    is_current, notes, created_by
                ) VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING bom_id
            """, (
                sku_id,
                new_version,
                get_current_day_number(),
                True,
                data.get('notes', ''),
                data.get('created_by', 'System')
            ))
            
            bom_id = cur.fetchone()[0]
        
        # Insert BOM details
        for detail in bom_details:
            cur.execute("""
                INSERT INTO sku_bom_details (
                    bom_id, material_id, material_category,
                    quantity_per_unit, is_shared, applicable_sizes, notes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                bom_id,
                detail['material_id'],
                detail['material_category'],
                float(detail.get('quantity_per_unit', 1)),
                detail.get('is_shared', False),
                detail.get('applicable_sizes', []),
                detail.get('notes', '')
            ))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'bom_id': bom_id,
            'message': 'BOM configured successfully'
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# ============================================
# MATERIAL LISTING FOR BOM
# ============================================

@sku_management_bp.route('/api/sku/materials', methods=['GET'])
def get_materials_for_bom():
    """Get materials suitable for BOM configuration"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        category = request.args.get('category')
        search = request.args.get('search', '')
        
        query = """
            SELECT 
                material_id,
                material_name,
                short_code,
                category,
                unit,
                current_cost
            FROM materials
            WHERE 1=1
        """
        params = []
        
        if category:
            query += " AND category = %s"
            params.append(category)
        
        if search:
            query += " AND (material_name ILIKE %s OR short_code ILIKE %s)"
            params.extend([f'%{search}%', f'%{search}%'])
        
        # Filter for packaging materials
        query += """
            AND category IN ('Packaging', 'Labels', 'Bottles', 'Caps', 'Secondary Packaging')
            ORDER BY category, material_name
        """
        
        cur.execute(query, params)
        
        materials = []
        for row in cur.fetchall():
            materials.append({
                'material_id': row[0],
                'material_name': row[1],
                'short_code': row[2],
                'category': row[3],
                'unit': row[4],
                'current_cost': float(row[5])
            })
        
        # Get material categories
        cur.execute("""
            SELECT DISTINCT category
            FROM materials
            WHERE category IN ('Packaging', 'Labels', 'Bottles', 'Caps', 'Secondary Packaging')
            ORDER BY category
        """)
        
        categories = [row[0] for row in cur.fetchall()]
        
        return jsonify({
            'success': True,
            'materials': materials,
            'categories': categories,
            'count': len(materials)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# ============================================
# COST PREVIEW
# ============================================

@sku_management_bp.route('/api/sku/cost-preview', methods=['POST'])
def get_cost_preview():
    """Calculate cost preview for SKU production"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        sku_id = data.get('sku_id')
        quantity = int(data.get('quantity', 1))
        oil_cost_per_kg = float(data.get('oil_cost_per_kg', 0))
        
        # Get SKU details
        cur.execute("""
            SELECT package_size, density
            FROM sku_master
            WHERE sku_id = %s
        """, (sku_id,))
        
        sku_data = cur.fetchone()
        if not sku_data:
            return jsonify({'success': False, 'error': 'SKU not found'}), 404
        
        package_size = sku_data[0]
        density = float(sku_data[1])
        
        # Calculate oil requirement
        size_in_liters = float(package_size.replace('ml', '').replace('L', ''))
        if 'ml' in package_size:
            size_in_liters = size_in_liters / 1000
        
        oil_quantity_per_bottle = size_in_liters * density  # kg per bottle
        total_oil_quantity = oil_quantity_per_bottle * quantity
        oil_cost = total_oil_quantity * oil_cost_per_kg
        
        # Get material costs from BOM
        cur.execute("""
            SELECT 
                SUM(bd.quantity_per_unit * m.current_cost)
            FROM sku_bom_master b
            JOIN sku_bom_details bd ON b.bom_id = bd.bom_id
            JOIN materials m ON bd.material_id = m.material_id
            WHERE b.sku_id = %s AND b.is_current = true
        """, (sku_id,))
        
        material_cost_per_unit = cur.fetchone()[0] or 0
        material_cost = float(material_cost_per_unit) * quantity
        
        # Get labor cost - FIXED: Changed 'active' to 'is_active'
        cur.execute("""
            SELECT default_rate
            FROM cost_elements_master
            WHERE element_name LIKE %s
            AND is_active = true
        """, (f'Packing Labour {package_size}%',))
        
        labor_rate = cur.fetchone()
        labor_cost_per_unit = float(labor_rate[0]) if labor_rate else 0
        labor_cost = labor_cost_per_unit * quantity
        
        # Calculate totals
        total_cost = oil_cost + material_cost + labor_cost
        cost_per_bottle = total_cost / quantity if quantity > 0 else 0
        
        return jsonify({
            'success': True,
            'cost_preview': {
                'quantity': quantity,
                'oil_requirement': {
                    'per_bottle_kg': oil_quantity_per_bottle,
                    'total_kg': total_oil_quantity,
                    'cost_per_kg': oil_cost_per_kg,
                    'total_cost': oil_cost
                },
                'material_cost': {
                    'per_bottle': float(material_cost_per_unit),
                    'total': material_cost
                },
                'labor_cost': {
                    'per_bottle': labor_cost_per_unit,
                    'total': labor_cost
                },
                'summary': {
                    'total_production_cost': total_cost,
                    'cost_per_bottle': cost_per_bottle
                }
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# ============================================
# BOM VERSION HISTORY
# ============================================

@sku_management_bp.route('/api/sku/bom-history/<int:sku_id>', methods=['GET'])
def get_bom_history(sku_id):
    """Get BOM version history for a SKU"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT 
                bom_id,
                version_number,
                effective_from,
                effective_to,
                is_current,
                notes,
                created_by,
                created_at
            FROM sku_bom_master
            WHERE sku_id = %s
            ORDER BY version_number DESC
        """, (sku_id,))
        
        versions = []
        for row in cur.fetchall():
            versions.append({
                'bom_id': row[0],
                'version_number': row[1],
                'effective_from': integer_to_date(row[2]) if row[2] else None,
                'effective_to': integer_to_date(row[3]) if row[3] else None,
                'is_current': row[4],
                'notes': row[5],
                'created_by': row[6],
                'created_at': row[7].isoformat() if row[7] else None
            })
        
        return jsonify({
            'success': True,
            'versions': versions,
            'count': len(versions)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)
