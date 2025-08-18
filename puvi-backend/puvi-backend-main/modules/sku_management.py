"""
SKU Management Module for PUVI Oil Manufacturing System
Handles SKU master data, BOM configuration, and version management
Version: 2.0 - Complete CRUD operations with proper patterns
File Path: puvi-backend/puvi-backend-main/modules/sku_management.py
"""

from flask import Blueprint, request, jsonify
from decimal import Decimal
from datetime import datetime
import json
from db_utils import get_db_connection, close_connection
from utils.date_utils import get_current_day_number, integer_to_date, parse_date
from utils.validation import safe_decimal, safe_int, validate_required_fields

# Create Blueprint
sku_management_bp = Blueprint('sku_management', __name__)

# ============================================
# SKU MASTER CRUD OPERATIONS
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
        page = safe_int(request.args.get('page', 1))
        per_page = safe_int(request.args.get('per_page', 50))
        search = request.args.get('search', '')
        
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
                s.mrp_current,
                s.shelf_life_months,
                s.is_active,
                COALESCE(b.version_number, 0) as current_bom_version,
                COALESCE(b.effective_from, 0) as bom_effective_from,
                COUNT(DISTINCT p.production_id) as total_productions,
                MAX(p.production_date) as last_production_date
            FROM sku_master s
            LEFT JOIN sku_bom_master b ON s.sku_id = b.sku_id AND b.is_current = true
            LEFT JOIN sku_production p ON s.sku_id = p.sku_id
            WHERE 1=1
        """
        params = []
        
        # Apply filters
        if is_active is not None:
            query += " AND s.is_active = %s"
            params.append(is_active)
        
        if oil_type:
            query += " AND s.oil_type = %s"
            params.append(oil_type)
        
        if package_size:
            query += " AND s.package_size = %s"
            params.append(package_size)
        
        if search:
            query += """ AND (
                LOWER(s.sku_code) LIKE LOWER(%s) OR 
                LOWER(s.product_name) LIKE LOWER(%s) OR
                LOWER(s.oil_type) LIKE LOWER(%s)
            )"""
            search_pattern = f'%{search}%'
            params.extend([search_pattern, search_pattern, search_pattern])
        
        query += """
            GROUP BY s.sku_id, s.sku_code, s.product_name, s.oil_type, 
                     s.package_size, s.bottle_type, s.density, s.mrp_current,
                     s.shelf_life_months, s.is_active,
                     b.version_number, b.effective_from
            ORDER BY s.oil_type, s.package_size, s.sku_code
        """
        
        # Add pagination
        offset = (page - 1) * per_page
        query += " LIMIT %s OFFSET %s"
        params.extend([per_page, offset])
        
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
                'density': float(row[6]) if row[6] else 0.91,
                'mrp_current': float(row[7]) if row[7] else None,
                'shelf_life_months': row[8],
                'is_active': row[9],
                'current_bom_version': row[10],
                'bom_effective_from': integer_to_date(row[11]) if row[11] else None,
                'total_productions': row[12],
                'last_production_date': integer_to_date(row[13]) if row[13] else None
            })
        
        # Get total count for pagination
        count_query = """
            SELECT COUNT(*) FROM sku_master s WHERE 1=1
        """
        count_params = []
        
        if is_active is not None:
            count_query += " AND s.is_active = %s"
            count_params.append(is_active)
        
        if oil_type:
            count_query += " AND s.oil_type = %s"
            count_params.append(oil_type)
        
        if package_size:
            count_query += " AND s.package_size = %s"
            count_params.append(package_size)
        
        if search:
            count_query += """ AND (
                LOWER(s.sku_code) LIKE LOWER(%s) OR 
                LOWER(s.product_name) LIKE LOWER(%s) OR
                LOWER(s.oil_type) LIKE LOWER(%s)
            )"""
            count_params.extend([search_pattern, search_pattern, search_pattern])
        
        cur.execute(count_query, count_params)
        total_count = cur.fetchone()[0]
        
        return jsonify({
            'success': True,
            'skus': skus,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total_count,
                'pages': (total_count + per_page - 1) // per_page
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@sku_management_bp.route('/api/sku/master/<int:sku_id>', methods=['GET'])
def get_single_sku(sku_id):
    """Get details of a single SKU"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get SKU details
        cur.execute("""
            SELECT 
                s.sku_id,
                s.sku_code,
                s.product_name,
                s.oil_type,
                s.package_size,
                s.bottle_type,
                s.density,
                s.mrp_current,
                s.mrp_effective_date,
                s.shelf_life_months,
                s.is_active,
                s.created_by,
                s.created_at,
                s.updated_at,
                COALESCE(b.version_number, 0) as current_bom_version,
                COALESCE(b.bom_id, 0) as current_bom_id
            FROM sku_master s
            LEFT JOIN sku_bom_master b ON s.sku_id = b.sku_id AND b.is_current = true
            WHERE s.sku_id = %s
        """, (sku_id,))
        
        row = cur.fetchone()
        if not row:
            return jsonify({
                'success': False,
                'error': 'SKU not found'
            }), 404
        
        sku = {
            'sku_id': row[0],
            'sku_code': row[1],
            'product_name': row[2],
            'oil_type': row[3],
            'package_size': row[4],
            'bottle_type': row[5],
            'density': float(row[6]) if row[6] else 0.91,
            'mrp_current': float(row[7]) if row[7] else None,
            'mrp_effective_date': integer_to_date(row[8]) if row[8] else None,
            'shelf_life_months': row[9],
            'is_active': row[10],
            'created_by': row[11],
            'created_at': row[12].isoformat() if row[12] else None,
            'updated_at': row[13].isoformat() if row[13] else None,
            'current_bom_version': row[14],
            'current_bom_id': row[15]
        }
        
        # Get production statistics
        cur.execute("""
            SELECT 
                COUNT(*) as total_productions,
                SUM(bottles_produced) as total_bottles,
                MAX(production_date) as last_production_date,
                AVG(cost_per_bottle) as avg_cost_per_bottle
            FROM sku_production
            WHERE sku_id = %s
        """, (sku_id,))
        
        stats_row = cur.fetchone()
        if stats_row:
            sku['production_stats'] = {
                'total_productions': stats_row[0] or 0,
                'total_bottles': int(stats_row[1]) if stats_row[1] else 0,
                'last_production_date': integer_to_date(stats_row[2]) if stats_row[2] else None,
                'avg_cost_per_bottle': float(stats_row[3]) if stats_row[3] else 0
            }
        
        return jsonify({
            'success': True,
            'sku': sku
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
                bottle_type, density, mrp_current, mrp_effective_date,
                shelf_life_months, is_active, created_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING sku_id
        """, (
            data['sku_code'],
            data['product_name'],
            data['oil_type'],
            data['package_size'],
            data.get('bottle_type', 'PET'),
            safe_decimal(data.get('density', 0.91)),
            safe_decimal(data.get('mrp_current', 0)),
            parse_date(data['mrp_effective_date']) if data.get('mrp_effective_date') else get_current_day_number(),
            safe_int(data.get('shelf_life_months', 12)),
            data.get('is_active', True),
            data.get('created_by', 'System')
        ))
        
        sku_id = cur.fetchone()[0]
        
        # If MRP is provided, create initial MRP history entry
        if data.get('mrp_current'):
            cur.execute("""
                INSERT INTO sku_mrp_history (
                    sku_id, mrp_amount, effective_from,
                    is_current, changed_by, change_reason
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                sku_id,
                safe_decimal(data['mrp_current']),
                parse_date(data['mrp_effective_date']) if data.get('mrp_effective_date') else get_current_day_number(),
                True,
                data.get('created_by', 'System'),
                'Initial MRP'
            ))
        
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


@sku_management_bp.route('/api/sku/master/<int:sku_id>', methods=['PUT'])
def update_sku(sku_id):
    """Update an existing SKU"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        # Check if SKU exists
        cur.execute("SELECT sku_code, mrp_current FROM sku_master WHERE sku_id = %s", (sku_id,))
        existing = cur.fetchone()
        if not existing:
            return jsonify({'success': False, 'error': 'SKU not found'}), 404
        
        old_mrp = existing[1]
        
        # Check if sku_code is being changed and if new code already exists
        if 'sku_code' in data and data['sku_code'] != existing[0]:
            cur.execute(
                "SELECT sku_id FROM sku_master WHERE sku_code = %s AND sku_id != %s", 
                (data['sku_code'], sku_id)
            )
            if cur.fetchone():
                return jsonify({'success': False, 'error': 'SKU code already exists'}), 400
        
        # Build UPDATE query dynamically
        update_fields = []
        values = []
        
        # Fields that can be updated
        updatable_fields = {
            'sku_code': str,
            'product_name': str,
            'oil_type': str,
            'package_size': str,
            'bottle_type': str,
            'density': safe_decimal,
            'mrp_current': safe_decimal,
            'mrp_effective_date': parse_date,
            'shelf_life_months': safe_int,
            'is_active': bool
        }
        
        for field, converter in updatable_fields.items():
            if field in data:
                update_fields.append(f"{field} = %s")
                if converter in [safe_decimal, safe_int, parse_date]:
                    values.append(converter(data[field]) if data[field] is not None else None)
                else:
                    values.append(data[field])
        
        if not update_fields:
            return jsonify({
                'success': False,
                'error': 'No valid fields to update'
            }), 400
        
        # Add updated_at
        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        
        # Add SKU ID for WHERE clause
        values.append(sku_id)
        
        # Execute update
        query = f"""
            UPDATE sku_master
            SET {', '.join(update_fields)}
            WHERE sku_id = %s
        """
        
        cur.execute(query, values)
        
        # Handle MRP change history
        if 'mrp_current' in data and data.get('mrp_current') != old_mrp:
            # Set previous MRP as not current
            cur.execute("""
                UPDATE sku_mrp_history
                SET is_current = false,
                    effective_to = %s
                WHERE sku_id = %s AND is_current = true
            """, (get_current_day_number(), sku_id))
            
            # Insert new MRP history
            cur.execute("""
                INSERT INTO sku_mrp_history (
                    sku_id, mrp_amount, effective_from,
                    is_current, changed_by, change_reason
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                sku_id,
                safe_decimal(data['mrp_current']),
                parse_date(data.get('mrp_effective_date', get_current_day_number())),
                True,
                data.get('updated_by', 'System'),
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


@sku_management_bp.route('/api/sku/master/<int:sku_id>', methods=['DELETE'])
def delete_sku(sku_id):
    """Delete/Deactivate an SKU"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Check if SKU exists
        cur.execute("SELECT sku_code, is_active FROM sku_master WHERE sku_id = %s", (sku_id,))
        existing = cur.fetchone()
        if not existing:
            return jsonify({'success': False, 'error': 'SKU not found'}), 404
        
        # Check for dependencies (productions)
        cur.execute("""
            SELECT COUNT(*) FROM sku_production WHERE sku_id = %s
        """, (sku_id,))
        
        production_count = cur.fetchone()[0]
        
        if production_count > 0:
            # Soft delete only - has dependencies
            cur.execute("""
                UPDATE sku_master
                SET is_active = false,
                    updated_at = CURRENT_TIMESTAMP
                WHERE sku_id = %s
            """, (sku_id,))
            
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': 'SKU deactivated successfully (has production history)',
                'soft_delete': True,
                'dependencies': {
                    'productions': production_count
                }
            })
        else:
            # Hard delete - no dependencies
            # Delete related records first
            cur.execute("DELETE FROM sku_mrp_history WHERE sku_id = %s", (sku_id,))
            cur.execute("DELETE FROM sku_bom_details WHERE bom_id IN (SELECT bom_id FROM sku_bom_master WHERE sku_id = %s)", (sku_id,))
            cur.execute("DELETE FROM sku_bom_master WHERE sku_id = %s", (sku_id,))
            cur.execute("DELETE FROM sku_master WHERE sku_id = %s", (sku_id,))
            
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': 'SKU deleted permanently',
                'soft_delete': False
            })
            
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
        
        # Get labor cost for this package size
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
                SET notes = %s,
                    updated_at = CURRENT_TIMESTAMP
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
                detail.get('material_category', 'Packaging'),
                safe_decimal(detail.get('quantity_per_unit', 1)),
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
                'current_cost': float(row[5]) if row[5] else 0
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
        quantity = safe_int(data.get('quantity', 1))
        oil_cost_per_kg = safe_decimal(data.get('oil_cost_per_kg', 0))
        
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
        oil_cost = total_oil_quantity * float(oil_cost_per_kg)
        
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
        
        # Get labor cost
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
                    'cost_per_kg': float(oil_cost_per_kg),
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


# ============================================
# ADDITIONAL UTILITY ENDPOINTS
# ============================================

@sku_management_bp.route('/api/sku/master/activate/<int:sku_id>', methods=['POST'])
def activate_sku(sku_id):
    """Reactivate a deactivated SKU"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            UPDATE sku_master
            SET is_active = true,
                updated_at = CURRENT_TIMESTAMP
            WHERE sku_id = %s
            RETURNING sku_code
        """, (sku_id,))
        
        result = cur.fetchone()
        if not result:
            return jsonify({'success': False, 'error': 'SKU not found'}), 404
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': f'SKU {result[0]} activated successfully'
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@sku_management_bp.route('/api/sku/master/bulk-update', methods=['POST'])
def bulk_update_skus():
    """Bulk update multiple SKUs (e.g., MRP update)"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        updates = data.get('updates', [])
        field_to_update = data.get('field')  # e.g., 'mrp_current'
        
        if not updates or not field_to_update:
            return jsonify({
                'success': False,
                'error': 'Missing updates or field specification'
            }), 400
        
        success_count = 0
        errors = []
        
        cur.execute("BEGIN")
        
        for update in updates:
            try:
                sku_id = update.get('sku_id')
                value = update.get('value')
                
                if field_to_update == 'mrp_current':
                    # Special handling for MRP updates
                    cur.execute("""
                        UPDATE sku_master
                        SET mrp_current = %s,
                            mrp_effective_date = %s,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE sku_id = %s
                    """, (safe_decimal(value), get_current_day_number(), sku_id))
                    
                    # Update MRP history
                    cur.execute("""
                        UPDATE sku_mrp_history
                        SET is_current = false,
                            effective_to = %s
                        WHERE sku_id = %s AND is_current = true
                    """, (get_current_day_number(), sku_id))
                    
                    cur.execute("""
                        INSERT INTO sku_mrp_history (
                            sku_id, mrp_amount, effective_from,
                            is_current, changed_by, change_reason
                        ) VALUES (%s, %s, %s, %s, %s, %s)
                    """, (
                        sku_id,
                        safe_decimal(value),
                        get_current_day_number(),
                        True,
                        data.get('updated_by', 'System'),
                        data.get('change_reason', 'Bulk MRP Update')
                    ))
                else:
                    # Generic field update
                    query = f"""
                        UPDATE sku_master
                        SET {field_to_update} = %s,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE sku_id = %s
                    """
                    cur.execute(query, (value, sku_id))
                
                success_count += 1
                
            except Exception as e:
                errors.append({
                    'sku_id': sku_id,
                    'error': str(e)
                })
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': f'Bulk update completed. Success: {success_count}, Errors: {len(errors)}',
            'success_count': success_count,
            'errors': errors[:10]  # Return first 10 errors
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@sku_management_bp.route('/api/sku/master/export', methods=['GET'])
def export_skus():
    """Export SKUs to CSV format (returns JSON for frontend to convert)"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        is_active = request.args.get('is_active', 'true').lower() == 'true'
        
        cur.execute("""
            SELECT 
                s.sku_code,
                s.product_name,
                s.oil_type,
                s.package_size,
                s.bottle_type,
                s.density,
                s.mrp_current,
                s.shelf_life_months,
                s.is_active,
                COALESCE(b.version_number, 0) as bom_version
            FROM sku_master s
            LEFT JOIN sku_bom_master b ON s.sku_id = b.sku_id AND b.is_current = true
            WHERE s.is_active = %s OR %s = false
            ORDER BY s.oil_type, s.package_size, s.sku_code
        """, (is_active, is_active))
        
        columns = ['SKU Code', 'Product Name', 'Oil Type', 'Package Size', 
                  'Bottle Type', 'Density', 'MRP', 'Shelf Life (Months)', 
                  'Active', 'BOM Version']
        
        rows = []
        for row in cur.fetchall():
            rows.append({
                'SKU Code': row[0],
                'Product Name': row[1],
                'Oil Type': row[2],
                'Package Size': row[3],
                'Bottle Type': row[4],
                'Density': float(row[5]) if row[5] else 0.91,
                'MRP': float(row[6]) if row[6] else 0,
                'Shelf Life (Months)': row[7],
                'Active': 'Yes' if row[8] else 'No',
                'BOM Version': row[9]
            })
        
        return jsonify({
            'success': True,
            'columns': columns,
            'data': rows,
            'count': len(rows)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)
