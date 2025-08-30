"""
SKU Management Module for PUVI Oil Manufacturing System
Handles SKU master data, BOM configuration, and version management
Version: 3.0 - Enhanced with packaged weight management
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
    """Get list of all SKUs with basic information including weight"""
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
        
        # Build query - ENHANCED with packaged_weight_kg
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
                s.packaged_weight_kg,
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
                     s.shelf_life_months, s.is_active, s.packaged_weight_kg,
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
                'packaged_weight_kg': float(row[10]) if row[10] else 1.0,
                'current_bom_version': row[11],
                'bom_effective_from': integer_to_date(row[12]) if row[12] else None,
                'total_productions': row[13],
                'last_production_date': integer_to_date(row[14]) if row[14] else None
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
    """Get details of a single SKU including weight"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get SKU details - ENHANCED with packaged_weight_kg
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
                s.packaged_weight_kg,
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
            'packaged_weight_kg': float(row[11]) if row[11] else 1.0,
            'created_by': row[12],
            'created_at': row[13].isoformat() if row[13] else None,
            'updated_at': row[14].isoformat() if row[14] else None,
            'current_bom_version': row[15],
            'current_bom_id': row[16]
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
        
        # Get weight calculation info
        sku['weight_info'] = {
            'packaged_weight_kg': sku['packaged_weight_kg'],
            'estimated_oil_weight_kg': calculate_oil_weight(row[4], row[6]),
            'packaging_weight_kg': sku['packaged_weight_kg'] - calculate_oil_weight(row[4], row[6])
        }
        
        return jsonify({
            'success': True,
            'sku': sku
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


def calculate_oil_weight(package_size, density):
    """Helper function to calculate oil weight from package size and density"""
    if not package_size or not density:
        return 0.0
    
    # Parse package size to get liters
    size_str = package_size.upper()
    if 'ML' in size_str:
        liters = float(size_str.replace('ML', '')) / 1000
    elif 'L' in size_str:
        liters = float(size_str.replace('L', ''))
    else:
        return 0.0
    
    return liters * float(density)


@sku_management_bp.route('/api/sku/master', methods=['POST'])
def create_sku():
    """Create a new SKU with weight information"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        # Validate required fields - ENHANCED with packaged_weight_kg
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
        
        # Calculate default weight if not provided
        if 'packaged_weight_kg' not in data or not data['packaged_weight_kg']:
            density = safe_decimal(data.get('density', 0.91))
            oil_weight = calculate_oil_weight(data['package_size'], density)
            # Add 10% for packaging materials
            data['packaged_weight_kg'] = oil_weight * 1.1
        
        # Insert new SKU with weight
        cur.execute("""
            INSERT INTO sku_master (
                sku_code, product_name, oil_type, package_size,
                bottle_type, density, mrp_current, mrp_effective_date,
                shelf_life_months, packaged_weight_kg, is_active, created_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
            safe_decimal(data['packaged_weight_kg']),
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
            'message': 'SKU created successfully with weight information'
        }), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@sku_management_bp.route('/api/sku/master/<int:sku_id>', methods=['PUT'])
def update_sku(sku_id):
    """Update an existing SKU including weight"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        # Check if SKU exists
        cur.execute("SELECT sku_code, mrp_current, packaged_weight_kg FROM sku_master WHERE sku_id = %s", (sku_id,))
        existing = cur.fetchone()
        if not existing:
            return jsonify({'success': False, 'error': 'SKU not found'}), 404
        
        old_mrp = existing[1]
        old_weight = existing[2]
        
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
        
        # Fields that can be updated - ENHANCED with packaged_weight_kg
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
            'packaged_weight_kg': safe_decimal,
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
        
        # Log weight change if significant
        if 'packaged_weight_kg' in data and old_weight:
            weight_change = abs(float(data['packaged_weight_kg']) - float(old_weight))
            if weight_change > 0.01:  # More than 10g difference
                cur.execute("""
                    INSERT INTO masters_audit_log (
                        table_name, record_id, field_name,
                        old_value, new_value, changed_by, change_reason
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    'sku_master',
                    sku_id,
                    'packaged_weight_kg',
                    str(old_weight),
                    str(data['packaged_weight_kg']),
                    data.get('updated_by', 'System'),
                    data.get('weight_change_reason', 'Weight update')
                ))
        
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


# ============================================
# WEIGHT MANAGEMENT ENDPOINTS
# ============================================

@sku_management_bp.route('/api/sku/master/update-weights', methods=['POST'])
def bulk_update_weights():
    """Bulk update packaged weights for multiple SKUs"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        updates = data.get('weight_updates', [])
        
        if not updates:
            return jsonify({
                'success': False,
                'error': 'No weight updates provided'
            }), 400
        
        success_count = 0
        errors = []
        
        cur.execute("BEGIN")
        
        for update in updates:
            try:
                sku_id = update.get('sku_id')
                new_weight = safe_decimal(update.get('packaged_weight_kg'))
                
                if not sku_id or new_weight is None:
                    errors.append({
                        'sku_id': sku_id,
                        'error': 'Missing SKU ID or weight'
                    })
                    continue
                
                # Get current weight for audit
                cur.execute("""
                    SELECT packaged_weight_kg, sku_code 
                    FROM sku_master 
                    WHERE sku_id = %s
                """, (sku_id,))
                
                result = cur.fetchone()
                if not result:
                    errors.append({
                        'sku_id': sku_id,
                        'error': 'SKU not found'
                    })
                    continue
                
                old_weight = result[0]
                sku_code = result[1]
                
                # Update weight
                cur.execute("""
                    UPDATE sku_master
                    SET packaged_weight_kg = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE sku_id = %s
                """, (new_weight, sku_id))
                
                # Log the change
                if old_weight != new_weight:
                    cur.execute("""
                        INSERT INTO masters_audit_log (
                            table_name, record_id, field_name,
                            old_value, new_value, changed_by, change_reason
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (
                        'sku_master',
                        sku_id,
                        'packaged_weight_kg',
                        str(old_weight) if old_weight else 'NULL',
                        str(new_weight),
                        data.get('updated_by', 'System'),
                        f"Bulk weight update for {sku_code}"
                    ))
                
                success_count += 1
                
            except Exception as e:
                errors.append({
                    'sku_id': sku_id,
                    'error': str(e)
                })
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': f'Weight update completed. Success: {success_count}, Errors: {len(errors)}',
            'success_count': success_count,
            'errors': errors[:10]  # Return first 10 errors
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@sku_management_bp.route('/api/sku/master/calculate-weights', methods=['GET'])
def calculate_recommended_weights():
    """Calculate recommended packaged weights based on package size and density"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get all SKUs without weights or with default weights
        cur.execute("""
            SELECT 
                sku_id,
                sku_code,
                product_name,
                package_size,
                density,
                packaged_weight_kg
            FROM sku_master
            WHERE is_active = true
            ORDER BY oil_type, package_size
        """)
        
        recommendations = []
        for row in cur.fetchall():
            sku_id, sku_code, product_name, package_size, density, current_weight = row
            
            # Calculate recommended weight
            oil_weight = calculate_oil_weight(package_size, density or 0.91)
            # Add 10% for packaging
            recommended_weight = round(oil_weight * 1.1, 4)
            
            # Check if update is needed
            needs_update = (
                current_weight is None or 
                current_weight == 1.0 or  # Default value
                abs(float(current_weight) - recommended_weight) > 0.05  # More than 50g difference
            )
            
            if needs_update:
                recommendations.append({
                    'sku_id': sku_id,
                    'sku_code': sku_code,
                    'product_name': product_name,
                    'package_size': package_size,
                    'current_weight': float(current_weight) if current_weight else None,
                    'recommended_weight': recommended_weight,
                    'oil_weight': oil_weight,
                    'packaging_weight': recommended_weight - oil_weight,
                    'difference': (float(current_weight) - recommended_weight) if current_weight else None
                })
        
        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'count': len(recommendations)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# Keep all other endpoints unchanged (they don't need weight modifications)
# These include: delete_sku, get_sku_bom, create_or_update_bom, get_materials_for_bom,
# get_cost_preview, get_bom_history, activate_sku, bulk_update_skus, export_skus

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


# [Keep all other unchanged endpoints as they are in the original file]
# These include: get_sku_bom, create_or_update_bom, get_materials_for_bom,
# get_cost_preview, get_bom_history, activate_sku, bulk_update_skus, export_skus

# ... [rest of the original unchanged functions] ...
