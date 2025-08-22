"""
Package Sizes Management Module for PUVI Oil Manufacturing System
Handles CRUD operations for package sizes and auto-creates packing cost elements
File Path: puvi-backend/puvi-backend-main/modules/package_sizes.py
"""

from flask import Blueprint, request, jsonify
from decimal import Decimal
from datetime import datetime
from db_utils import get_db_connection, close_connection

# Create Blueprint
package_sizes_bp = Blueprint('package_sizes', __name__)

# =====================================================
# GET ALL PACKAGE SIZES
# =====================================================
@package_sizes_bp.route('/api/masters/package_sizes', methods=['GET'])
def get_package_sizes():
    """Get all package sizes with their linked cost elements"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get filter parameters
        include_inactive = request.args.get('include_inactive', 'false').lower() == 'true'
        
        # Build query
        query = """
            SELECT 
                ps.size_id,
                ps.size_code,
                ps.size_name,
                ps.size_in_ml,
                ps.size_in_liters,
                ps.display_order,
                ps.is_active,
                ps.created_at,
                ps.created_by,
                ce.element_id,
                ce.element_name,
                ce.default_rate,
                ce.is_active as cost_element_active
            FROM package_sizes_master ps
            LEFT JOIN cost_elements_master ce ON ps.size_id = ce.package_size_id
            WHERE 1=1
        """
        
        params = []
        if not include_inactive:
            query += " AND ps.is_active = true"
        
        query += " ORDER BY ps.display_order, ps.size_in_ml"
        
        cur.execute(query, params)
        
        sizes = []
        for row in cur.fetchall():
            sizes.append({
                'size_id': row[0],
                'size_code': row[1],
                'size_name': row[2],
                'size_in_ml': row[3],
                'size_in_liters': float(row[4]),
                'display_order': row[5],
                'is_active': row[6],
                'created_at': row[7].isoformat() if row[7] else None,
                'created_by': row[8],
                'cost_element': {
                    'element_id': row[9],
                    'element_name': row[10],
                    'default_rate': float(row[11]) if row[11] else None,
                    'is_active': row[12]
                } if row[9] else None
            })
        
        return jsonify({
            'success': True,
            'package_sizes': sizes,
            'count': len(sizes)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)

# =====================================================
# GET SINGLE PACKAGE SIZE
# =====================================================
@package_sizes_bp.route('/api/masters/package_sizes/<int:size_id>', methods=['GET'])
def get_package_size(size_id):
    """Get single package size details"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT 
                ps.size_id,
                ps.size_code,
                ps.size_name,
                ps.size_in_ml,
                ps.size_in_liters,
                ps.display_order,
                ps.is_active,
                ps.created_at,
                ps.created_by,
                ps.updated_at,
                ce.element_id,
                ce.element_name,
                ce.default_rate
            FROM package_sizes_master ps
            LEFT JOIN cost_elements_master ce ON ps.size_id = ce.package_size_id
            WHERE ps.size_id = %s
        """, (size_id,))
        
        row = cur.fetchone()
        if not row:
            return jsonify({'success': False, 'error': 'Package size not found'}), 404
        
        size = {
            'size_id': row[0],
            'size_code': row[1],
            'size_name': row[2],
            'size_in_ml': row[3],
            'size_in_liters': float(row[4]),
            'display_order': row[5],
            'is_active': row[6],
            'created_at': row[7].isoformat() if row[7] else None,
            'created_by': row[8],
            'updated_at': row[9].isoformat() if row[9] else None,
            'cost_element': {
                'element_id': row[10],
                'element_name': row[11],
                'default_rate': float(row[12]) if row[12] else None
            } if row[10] else None
        }
        
        return jsonify({
            'success': True,
            'package_size': size
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)

# =====================================================
# CREATE PACKAGE SIZE
# =====================================================
@package_sizes_bp.route('/api/masters/package_sizes', methods=['POST'])
def create_package_size():
    """Create new package size and auto-create packing cost element"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['size_code', 'size_name', 'size_in_ml']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    'success': False, 
                    'error': f'{field} is required'
                }), 400
        
        # Calculate size in liters
        size_in_liters = Decimal(str(data['size_in_ml'])) / 1000
        
        # Check if size_code already exists
        cur.execute("""
            SELECT size_id FROM package_sizes_master 
            WHERE size_code = %s
        """, (data['size_code'],))
        
        if cur.fetchone():
            return jsonify({
                'success': False,
                'error': f"Package size {data['size_code']} already exists"
            }), 400
        
        # Begin transaction
        cur.execute("BEGIN")
        
        # Insert package size
        cur.execute("""
            INSERT INTO package_sizes_master (
                size_code, size_name, size_in_ml, size_in_liters,
                display_order, created_by
            ) VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING size_id
        """, (
            data['size_code'],
            data['size_name'],
            data['size_in_ml'],
            size_in_liters,
            data.get('display_order', 999),
            data.get('created_by', 'System')
        ))
        
        size_id = cur.fetchone()[0]
        
        # Auto-create packing cost element
        default_rate = data.get('default_packing_rate', 1.00)
        
        # Check if cost element already exists for this exact name
        element_name = f"Packing Labour {data['size_code']}"
        
        cur.execute("""
            SELECT element_id FROM cost_elements_master
            WHERE element_name = %s
        """, (element_name,))
        
        existing_element = cur.fetchone()
        
        if not existing_element:
            # Create new cost element
            cur.execute("""
                INSERT INTO cost_elements_master (
                    element_name,
                    category,
                    activity,
                    unit_type,
                    default_rate,
                    calculation_method,
                    is_optional,
                    applicable_to,
                    module_specific,
                    package_size_id,
                    display_order,
                    created_by
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING element_id
            """, (
                element_name,
                'Labour',
                'Packing',
                'Per Unit',
                default_rate,
                'per_unit',
                False,  # Not optional
                'sku',
                'sku_production',
                size_id,
                20 + data.get('display_order', 999),  # Cost element display order
                data.get('created_by', 'System')
            ))
            
            element_id = cur.fetchone()[0]
        else:
            # Update existing element to link with this package size
            element_id = existing_element[0]
            cur.execute("""
                UPDATE cost_elements_master 
                SET 
                    package_size_id = %s,
                    activity = 'Packing',
                    applicable_to = 'sku',
                    calculation_method = 'per_unit',
                    unit_type = 'Per Unit',
                    updated_at = CURRENT_TIMESTAMP
                WHERE element_id = %s
            """, (size_id, element_id))
        
        # Commit transaction
        conn.commit()
        
        # Fetch the created size with cost element
        cur.execute("""
            SELECT 
                ps.size_id,
                ps.size_code,
                ps.size_name,
                ps.size_in_ml,
                ps.size_in_liters,
                ce.element_id,
                ce.element_name,
                ce.default_rate
            FROM package_sizes_master ps
            LEFT JOIN cost_elements_master ce ON ps.size_id = ce.package_size_id
            WHERE ps.size_id = %s
        """, (size_id,))
        
        row = cur.fetchone()
        
        created_size = {
            'size_id': row[0],
            'size_code': row[1],
            'size_name': row[2],
            'size_in_ml': row[3],
            'size_in_liters': float(row[4]),
            'cost_element': {
                'element_id': row[5],
                'element_name': row[6],
                'default_rate': float(row[7])
            } if row[5] else None
        }
        
        return jsonify({
            'success': True,
            'package_size': created_size,
            'message': f'Package size {data["size_code"]} created with packing cost element'
        }), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)

# =====================================================
# UPDATE PACKAGE SIZE
# =====================================================
@package_sizes_bp.route('/api/masters/package_sizes/<int:size_id>', methods=['PUT'])
def update_package_size(size_id):
    """Update package size details"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        # Check if package size exists
        cur.execute("""
            SELECT size_code FROM package_sizes_master 
            WHERE size_id = %s
        """, (size_id,))
        
        existing = cur.fetchone()
        if not existing:
            return jsonify({
                'success': False,
                'error': 'Package size not found'
            }), 404
        
        old_size_code = existing[0]
        
        # Build update query dynamically
        update_fields = []
        params = []
        
        if 'size_code' in data:
            update_fields.append("size_code = %s")
            params.append(data['size_code'])
        
        if 'size_name' in data:
            update_fields.append("size_name = %s")
            params.append(data['size_name'])
        
        if 'size_in_ml' in data:
            update_fields.append("size_in_ml = %s")
            params.append(data['size_in_ml'])
            # Also update size_in_liters
            update_fields.append("size_in_liters = %s")
            params.append(Decimal(str(data['size_in_ml'])) / 1000)
        
        if 'display_order' in data:
            update_fields.append("display_order = %s")
            params.append(data['display_order'])
        
        if 'is_active' in data:
            update_fields.append("is_active = %s")
            params.append(data['is_active'])
        
        if not update_fields:
            return jsonify({
                'success': False,
                'error': 'No fields to update'
            }), 400
        
        # Add updated_at
        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        
        # Add size_id for WHERE clause
        params.append(size_id)
        
        # Begin transaction
        cur.execute("BEGIN")
        
        # Update package size
        query = f"""
            UPDATE package_sizes_master 
            SET {', '.join(update_fields)}
            WHERE size_id = %s
        """
        cur.execute(query, params)
        
        # If size_code changed, update cost element name
        if 'size_code' in data and data['size_code'] != old_size_code:
            new_element_name = f"Packing Labour {data['size_code']}"
            old_element_name = f"Packing Labour {old_size_code}"
            
            cur.execute("""
                UPDATE cost_elements_master
                SET element_name = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE element_name = %s
                  AND package_size_id = %s
            """, (new_element_name, old_element_name, size_id))
        
        # Update cost element rate if provided
        if 'default_packing_rate' in data:
            cur.execute("""
                UPDATE cost_elements_master
                SET default_rate = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE package_size_id = %s
            """, (data['default_packing_rate'], size_id))
        
        # Commit transaction
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Package size updated successfully'
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)

# =====================================================
# DELETE PACKAGE SIZE
# =====================================================
@package_sizes_bp.route('/api/masters/package_sizes/<int:size_id>', methods=['DELETE'])
def delete_package_size(size_id):
    """Delete or deactivate package size"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Check if package size exists
        cur.execute("""
            SELECT size_code FROM package_sizes_master 
            WHERE size_id = %s
        """, (size_id,))
        
        existing = cur.fetchone()
        if not existing:
            return jsonify({
                'success': False,
                'error': 'Package size not found'
            }), 404
        
        # Check if package size is used in any SKU
        cur.execute("""
            SELECT COUNT(*) FROM sku_master
            WHERE package_size = %s
        """, (existing[0],))
        
        sku_count = cur.fetchone()[0]
        
        if sku_count > 0:
            # Soft delete - just deactivate
            cur.execute("""
                UPDATE package_sizes_master
                SET is_active = false,
                    updated_at = CURRENT_TIMESTAMP
                WHERE size_id = %s
            """, (size_id,))
            
            # Also deactivate the cost element
            cur.execute("""
                UPDATE cost_elements_master
                SET is_active = false,
                    updated_at = CURRENT_TIMESTAMP
                WHERE package_size_id = %s
            """, (size_id,))
            
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': f'Package size deactivated (used in {sku_count} SKUs)'
            })
        else:
            # Hard delete if not used
            cur.execute("BEGIN")
            
            # Delete cost element first (foreign key constraint)
            cur.execute("""
                DELETE FROM cost_elements_master
                WHERE package_size_id = %s
            """, (size_id,))
            
            # Delete package size
            cur.execute("""
                DELETE FROM package_sizes_master
                WHERE size_id = %s
            """, (size_id,))
            
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': 'Package size deleted permanently'
            })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)

# =====================================================
# BULK UPDATE PACKAGE SIZES
# =====================================================
@package_sizes_bp.route('/api/masters/package_sizes/bulk-update', methods=['POST'])
def bulk_update_package_sizes():
    """Bulk update display order or rates"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        updates = data.get('updates', [])
        
        if not updates:
            return jsonify({
                'success': False,
                'error': 'No updates provided'
            }), 400
        
        cur.execute("BEGIN")
        
        updated_count = 0
        
        for update in updates:
            size_id = update.get('size_id')
            if not size_id:
                continue
            
            # Update package size fields
            if 'display_order' in update:
                cur.execute("""
                    UPDATE package_sizes_master
                    SET display_order = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE size_id = %s
                """, (update['display_order'], size_id))
            
            # Update cost element rate
            if 'default_packing_rate' in update:
                cur.execute("""
                    UPDATE cost_elements_master
                    SET default_rate = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE package_size_id = %s
                """, (update['default_packing_rate'], size_id))
            
            updated_count += 1
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': f'Updated {updated_count} package sizes',
            'updated_count': updated_count
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)

# =====================================================
# GET PACKAGE SIZES FOR DROPDOWN
# =====================================================
@package_sizes_bp.route('/api/masters/package_sizes/dropdown', methods=['GET'])
def get_package_sizes_dropdown():
    """Get simplified list for dropdowns"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT 
                size_id,
                size_code,
                size_name,
                size_in_ml
            FROM package_sizes_master
            WHERE is_active = true
            ORDER BY display_order, size_in_ml
        """)
        
        sizes = []
        for row in cur.fetchall():
            sizes.append({
                'value': row[1],  # size_code for dropdown value
                'label': row[2],  # size_name for display
                'size_id': row[0],
                'size_in_ml': row[3]
            })
        
        return jsonify({
            'success': True,
            'options': sizes
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)

# =====================================================
# VALIDATE PACKAGE SIZE CODE
# =====================================================
@package_sizes_bp.route('/api/masters/package_sizes/validate', methods=['POST'])
def validate_package_size():
    """Validate if package size code is unique"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        size_code = data.get('size_code')
        exclude_id = data.get('exclude_id')  # For update validation
        
        if not size_code:
            return jsonify({
                'success': False,
                'error': 'size_code is required'
            }), 400
        
        query = """
            SELECT size_id FROM package_sizes_master 
            WHERE size_code = %s
        """
        params = [size_code]
        
        if exclude_id:
            query += " AND size_id != %s"
            params.append(exclude_id)
        
        cur.execute(query, params)
        
        existing = cur.fetchone()
        
        return jsonify({
            'success': True,
            'is_valid': existing is None,
            'message': 'Size code is available' if not existing else 'Size code already exists'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)
