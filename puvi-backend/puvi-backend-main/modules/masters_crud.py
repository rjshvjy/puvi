"""
Generic Masters CRUD Module for PUVI Oil Manufacturing System
Handles CRUD operations for all master data tables using configuration
Provides unified API for suppliers, materials, tags, writeoff_reasons, cost_elements
Enhanced with GST support for subcategories
Enhanced with dynamic field options and cost elements filtering
File Path: puvi-backend/puvi-backend-main/modules/masters_crud.py
Version: 3.1 - Added Cost Elements Dynamic Field Options
"""

from flask import Blueprint, request, jsonify, send_file
from decimal import Decimal
from datetime import datetime, date
import csv
import io
import json
from db_utils import get_db_connection, close_connection
from utils.date_utils import get_current_day_number, integer_to_date
from utils.validation import safe_decimal, safe_float, safe_int, validate_required_fields

# Import configurations and utilities from masters_common
from modules.masters_common import (
    MASTERS_CONFIG,
    log_audit,
    check_dependencies,
    validate_field,
    validate_master_data,
    soft_delete_record,
    restore_record,
    get_record_by_id,
    get_master_types,
    get_master_config,
    get_export_query,
    format_response_data,
    transform_field_value
)

# Create Blueprint
masters_crud_bp = Blueprint('masters_crud', __name__)

# =====================================================
# HELPER FUNCTION TO CHECK COLUMN EXISTENCE
# =====================================================

def check_column_exists(cur, table_name, column_name):
    """
    Check if a column exists in a table
    
    Args:
        cur: Database cursor
        table_name: Name of the table
        column_name: Name of the column
    
    Returns:
        bool: True if column exists, False otherwise
    """
    try:
        cur.execute("""
            SELECT COUNT(*) 
            FROM information_schema.columns 
            WHERE table_name = %s 
            AND column_name = %s
        """, (table_name, column_name))
        
        return cur.fetchone()[0] > 0
    except:
        return False

# =====================================================
# GST VALIDATION HELPER
# =====================================================

def validate_gst_rate(gst_rate, category_id=None):
    """
    Validate GST rate according to Indian GST slabs
    
    Args:
        gst_rate: The GST rate to validate
        category_id: Category ID (8 for Oil category)
    
    Returns:
        tuple: (is_valid, error_message, validated_rate)
    """
    if gst_rate is None or gst_rate == '':
        # For Oil category (ID 8), GST is mandatory
        if category_id == 8:
            return False, "GST rate is mandatory for Oil subcategories", None
        return True, None, None
    
    try:
        rate = safe_decimal(gst_rate)
        
        # Check valid range (0-28%)
        if rate < 0:
            return False, "GST rate cannot be negative", None
        if rate > 28:
            return False, "GST rate cannot exceed 28%", None
        
        # Warn about non-standard slabs (but allow them)
        standard_slabs = [0, 5, 12, 18, 28]
        if rate not in standard_slabs:
            # This is just a warning, we still allow it
            print(f"Warning: GST rate {rate}% is not a standard slab")
        
        return True, None, rate
        
    except Exception as e:
        return False, f"Invalid GST rate: {str(e)}", None

# =====================================================
# DYNAMIC FIELD OPTIONS ENDPOINTS
# =====================================================

@masters_crud_bp.route('/api/masters/<master_type>/field-options/<field_name>', methods=['GET'])
def get_field_options(master_type, field_name):
    """Get distinct values for a field from the master table"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get master configuration
        config = get_master_config(master_type)
        if not config:
            return jsonify({
                'success': False,
                'error': f'Invalid master type: {master_type}'
            }), 400
        
        # Validate field exists in configuration
        if field_name not in config['fields']:
            return jsonify({
                'success': False,
                'error': f'Invalid field: {field_name}'
            }), 400
        
        # Get table name
        table = config['table']
        
        # Get distinct values from database
        cur.execute(f"""
            SELECT DISTINCT {field_name} 
            FROM {table}
            WHERE {field_name} IS NOT NULL 
                AND is_active = true
            ORDER BY {field_name}
        """)
        
        options = [row[0] for row in cur.fetchall() if row[0]]
        
        return jsonify({
            'success': True,
            'field': field_name,
            'options': options,
            'count': len(options)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)

# =====================================================
# NEW: COST ELEMENTS SPECIFIC FIELD OPTIONS ENDPOINTS
# =====================================================

@masters_crud_bp.route('/api/masters/cost_elements/field-options/category', methods=['GET'])
def get_cost_element_categories():
    """Get categories from cost_element_categories table"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT category_name
            FROM cost_element_categories
            WHERE is_active = true
            ORDER BY display_order, category_name
        """)
        
        options = [row[0] for row in cur.fetchall()]
        
        return jsonify({
            'success': True,
            'options': options
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@masters_crud_bp.route('/api/masters/cost_elements/field-options/activity', methods=['GET'])
def get_cost_element_activities():
    """Get activities from cost_element_activities table"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT activity_name
            FROM cost_element_activities
            WHERE is_active = true
            ORDER BY display_order, activity_name
        """)
        
        options = [row[0] for row in cur.fetchall()]
        
        return jsonify({
            'success': True,
            'options': options
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@masters_crud_bp.route('/api/masters/cost_elements/field-options/unit_type', methods=['GET'])
def get_cost_element_unit_types():
    """Get unit types from cost_element_unit_types table"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT unit_type
            FROM cost_element_unit_types
            WHERE is_active = true
            ORDER BY display_order, unit_type
        """)
        
        options = [row[0] for row in cur.fetchall()]
        
        return jsonify({
            'success': True,
            'options': options
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@masters_crud_bp.route('/api/masters/cost_elements/field-options/calculation_method', methods=['GET'])
def get_cost_element_calculation_methods():
    """Get calculation methods (same as unit_types for now)"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT unit_type
            FROM cost_element_unit_types
            WHERE is_active = true
            ORDER BY display_order, unit_type
        """)
        
        options = [row[0] for row in cur.fetchall()]
        
        return jsonify({
            'success': True,
            'options': options
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@masters_crud_bp.route('/api/masters/cost_elements/field-options/applicable_to', methods=['GET'])
def get_cost_element_applicable_to():
    """Get distinct applicable_to values from cost_elements_master"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT DISTINCT applicable_to
            FROM cost_elements_master
            WHERE applicable_to IS NOT NULL
                AND is_active = true
            ORDER BY applicable_to
        """)
        
        options = [row[0] for row in cur.fetchall()]
        
        # Add any missing standard options
        standard_options = ['all', 'batch', 'sku', 'blend', 'purchase', 'sales']
        for opt in standard_options:
            if opt not in options:
                options.append(opt)
        
        options.sort()
        
        return jsonify({
            'success': True,
            'options': options
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)

# =====================================================
# LIST MASTER TYPES
# =====================================================

@masters_crud_bp.route('/api/masters/types', methods=['GET'])
def list_master_types():
    """Get list of all available master types with their metadata"""
    try:
        types = []
        for master_type in get_master_types():
            config = get_master_config(master_type)
            types.append({
                'type': master_type,
                'display_name': config.get('display_name', master_type.title()),
                'table': config['table'],
                'primary_key': config['primary_key'],
                'name_field': config.get('name_field', config['primary_key']),
                'has_soft_delete': True,
                'field_count': len(config['fields'])
            })
        
        return jsonify({
            'success': True,
            'master_types': types,
            'count': len(types)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# =====================================================
# GET FIELD SCHEMA
# =====================================================

@masters_crud_bp.route('/api/masters/<master_type>/schema', methods=['GET'])
def get_master_schema(master_type):
    """Get field configuration for a master type"""
    try:
        config = get_master_config(master_type)
        if not config:
            return jsonify({
                'success': False,
                'error': f'Invalid master type: {master_type}'
            }), 400
        
        # Format fields for frontend
        fields = []
        for field_name, field_config in config['fields'].items():
            # Build field info with only non-None values
            field_info = {
                'name': field_name,
                'type': field_config['type'],
                'label': field_config.get('label', field_name.replace('_', ' ').title()),
                'required': field_config.get('required', False),
            }
            
            # Only add optional fields if they have non-None values
            optional_fields = {
                'unique': field_config.get('unique'),
                'max_length': field_config.get('max_length'),
                'pattern': field_config.get('pattern'),
                'options': field_config.get('options'),
                'options_source': field_config.get('options_source'),
                'options_endpoint': field_config.get('options_endpoint'),
                'min': field_config.get('min'),
                'max': field_config.get('max'),
                'decimal_places': field_config.get('decimal_places'),
                'default': field_config.get('default'),
                'transform': field_config.get('transform'),
                'placeholder': field_config.get('placeholder'),
                'help_text': field_config.get('help_text')
            }
            
            # Add only non-None optional fields
            for key, value in optional_fields.items():
                if value is not None:
                    field_info[key] = value
            
            # Special handling for decimal_places - always include for decimal type
            if field_config['type'] == 'decimal' and 'decimal_places' not in field_info:
                field_info['decimal_places'] = 2
            
            fields.append(field_info)
        
        return jsonify({
            'success': True,
            'master_type': master_type,
            'display_name': config.get('display_name', master_type.title()),
            'primary_key': config['primary_key'],
            'fields': fields,
            'dependencies': list(config.get('dependencies', {}).keys())
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# =====================================================
# LIST RECORDS (PAGINATED) - ENHANCED FOR COST_ELEMENTS
# =====================================================

@masters_crud_bp.route('/api/masters/<master_type>', methods=['GET'])
def list_master_records(master_type):
    """Get paginated list of records for a master type - Enhanced for cost_elements filtering"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        config = get_master_config(master_type)
        if not config:
            return jsonify({
                'success': False,
                'error': f'Invalid master type: {master_type}'
            }), 400
        
        # Get query parameters
        page = safe_int(request.args.get('page', 1))
        per_page = safe_int(request.args.get('per_page', 50))
        search = request.args.get('search', '')
        include_inactive = request.args.get('include_inactive', 'false').lower() == 'true'
        sort_by = request.args.get('sort_by', config.get('name_field', config['primary_key']))
        sort_order = request.args.get('sort_order', 'ASC').upper()
        
        # Validate sort parameters
        if sort_order not in ['ASC', 'DESC']:
            sort_order = 'ASC'
        
        # Special handling for cost_elements with enhanced filtering
        if master_type == 'cost_elements':
            return list_cost_elements_enhanced(config, page, per_page, search, include_inactive, sort_by, sort_order)
        
        # Build query for other master types
        table = config['table']
        soft_delete_field = config.get('soft_delete_field', 'is_active')
        
        # Use custom list query if available
        if 'list_query' in config and not include_inactive:
            base_query = config['list_query']
            
            # Check if the list_query already has an ORDER BY clause
            if 'ORDER BY' in base_query.upper():
                order_by_pos = base_query.upper().rfind('ORDER BY')
                if order_by_pos != -1:
                    count_base_query = base_query[:order_by_pos].strip()
                else:
                    count_base_query = base_query
                
                count_query = f"SELECT COUNT(*) FROM ({count_base_query}) as subquery"
                base_query_wrapped = f"SELECT * FROM ({base_query}) as subquery"
                base_query = base_query_wrapped
            else:
                count_query = f"SELECT COUNT(*) FROM ({config['list_query']}) as subquery"
        else:
            # Build default query
            base_query = f"SELECT * FROM {table}"
            count_query = f"SELECT COUNT(*) FROM {table}"
            
            where_clauses = []
            if not include_inactive:
                where_clauses.append(f"{soft_delete_field} = true")
            
            # Add search filter if provided
            if search:
                name_field = config.get('name_field', config['primary_key'])
                search_fields = [name_field]
                
                # Add additional searchable fields
                if 'searchable_fields' in config:
                    search_fields.extend(config['searchable_fields'])
                
                search_conditions = []
                for field in search_fields:
                    search_conditions.append(f"LOWER({field}::text) LIKE LOWER(%s)")
                
                where_clauses.append(f"({' OR '.join(search_conditions)})")
            
            if where_clauses:
                where_clause = " WHERE " + " AND ".join(where_clauses)
                base_query += where_clause
                count_query += where_clause
        
        # Get total count
        if search:
            search_pattern = f'%{search}%'
            search_params = [search_pattern] * len(search_fields) if 'search_fields' in locals() else [search_pattern]
            cur.execute(count_query, search_params)
        else:
            cur.execute(count_query)
        
        total_count = cur.fetchone()[0]
        
        # Calculate pagination
        offset = (page - 1) * per_page
        total_pages = (total_count + per_page - 1) // per_page
        
        # Add sorting and pagination to query
        paginated_query = f"{base_query} ORDER BY {sort_by} {sort_order} LIMIT %s OFFSET %s"
        
        # Execute paginated query
        if search:
            cur.execute(paginated_query, search_params + [per_page, offset])
        else:
            cur.execute(paginated_query, [per_page, offset])
        
        columns = [desc[0] for desc in cur.description]
        rows = cur.fetchall()
        
        # Format results
        records = []
        for row in rows:
            record = dict(zip(columns, row))
            records.append(format_response_data(record))
        
        return jsonify({
            'success': True,
            'records': records,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total_count,
                'pages': total_pages
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


def list_cost_elements_enhanced(config, page, per_page, search, include_inactive, sort_by, sort_order):
    """Enhanced list function specifically for cost_elements with activity/package filtering"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get additional filter parameters specific to cost_elements
        activity = request.args.get('activity')
        package_size = request.args.get('package_size')
        module = request.args.get('module')
        stage = request.args.get('stage')
        include_common = request.args.get('include_common', 'true').lower() == 'true'
        group_by_activity = request.args.get('group_by_activity', 'false').lower() == 'true'
        
        # Build base query with all fields
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
                is_active,
                notes,
                created_at,
                updated_at,
                created_by,
                activity,
                module_specific,
                package_size_id
            FROM cost_elements_master
            WHERE 1=1
        """
        
        params = []
        
        # Add active filter
        if not include_inactive:
            query += " AND is_active = true"
        
        # Handle stage parameter (maps to activity)
        if stage:
            activity_map = {
                'drying': 'Drying',
                'crushing': 'Crushing',
                'filtering': 'Filtering',
                'batch': None  # Return all for batch
            }
            if stage in activity_map and activity_map[stage]:
                activity = activity_map[stage]
        
        # Add activity filter
        if activity:
            if ',' in activity:
                # Support comma-separated activities
                activities = activity.split(',')
                placeholders = ','.join(['%s'] * len(activities))
                query += f" AND activity IN ({placeholders})"
                params.extend(activities)
            elif include_common:
                query += " AND (activity = %s OR activity = 'Common')"
                params.append(activity)
            else:
                query += " AND activity = %s"
                params.append(activity)
        
        # Add package size filter
        if package_size:
            # First get the package_size_id from package_sizes_master
            cur.execute("""
                SELECT size_id FROM package_sizes_master
                WHERE size_code = %s OR size_name = %s
                LIMIT 1
            """, (package_size, package_size))
            
            size_result = cur.fetchone()
            if size_result:
                query += " AND package_size_id = %s"
                params.append(size_result[0])
        
        # Add module filter
        if module:
            query += " AND (module_specific = %s OR module_specific = 'all')"
            params.append(module)
        
        # Add search filter
        if search:
            query += " AND (LOWER(element_name) LIKE LOWER(%s) OR LOWER(category) LIKE LOWER(%s))"
            search_pattern = f'%{search}%'
            params.extend([search_pattern, search_pattern])
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM ({query}) as subquery"
        cur.execute(count_query, params)
        total_count = cur.fetchone()[0]
        
        # Add sorting and pagination
        query += f" ORDER BY {sort_by} {sort_order} LIMIT %s OFFSET %s"
        offset = (page - 1) * per_page
        params.extend([per_page, offset])
        
        # Execute query
        cur.execute(query, params)
        
        columns = [desc[0] for desc in cur.description]
        rows = cur.fetchall()
        
        # Format results
        records = []
        for row in rows:
            record = dict(zip(columns, row))
            records.append(format_response_data(record))
        
        # Group by activity if requested
        if group_by_activity:
            grouped = {}
            for record in records:
                activity_key = record.get('activity', 'General')
                if activity_key not in grouped:
                    grouped[activity_key] = []
                grouped[activity_key].append(record)
            
            return jsonify({
                'success': True,
                'cost_elements_by_activity': grouped,
                'total': total_count,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': total_count,
                    'pages': (total_count + per_page - 1) // per_page
                }
            })
        
        return jsonify({
            'success': True,
            'records': records,
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


# =====================================================
# COST ELEMENTS ANALYTICS ENDPOINTS
# =====================================================

@masters_crud_bp.route('/api/masters/cost_elements/validation_report', methods=['GET'])
def cost_elements_validation_report():
    """Check which batches are missing cost elements"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get date range from parameters
        days = request.args.get('days', 30, type=int)
        
        cur.execute("""
            WITH required_elements AS (
                SELECT DISTINCT activity
                FROM cost_elements_master
                WHERE is_active = true
                AND activity IS NOT NULL
                AND is_optional = false
            ),
            batch_activities AS (
                SELECT
                    b.batch_id,
                    b.batch_code,
                    b.production_date,
                    CASE
                        WHEN b.drying_loss > 0 THEN 'Drying'
                        WHEN EXISTS (SELECT 1 FROM batch_extended_costs bec
                                   JOIN cost_elements_master cem ON bec.element_id = cem.element_id
                                   WHERE bec.batch_id = b.batch_id AND cem.activity = 'Crushing')
                            THEN 'Crushing'
                        WHEN EXISTS (SELECT 1 FROM batch_extended_costs bec
                                   JOIN cost_elements_master cem ON bec.element_id = cem.element_id
                                   WHERE bec.batch_id = b.batch_id AND cem.activity = 'Filtering')
                            THEN 'Filtering'
                    END as stage_activity
                FROM batch b
                WHERE b.production_date >= (
                    SELECT MAX(production_date) - %s FROM batch
                )
            ),
            missing_costs AS (
                SELECT
                    ba.batch_id,
                    ba.batch_code,
                    ba.production_date,
                    re.activity as missing_activity
                FROM batch_activities ba
                CROSS JOIN required_elements re
                WHERE re.activity = ba.stage_activity
                AND NOT EXISTS (
                    SELECT 1 FROM batch_extended_costs bec
                    JOIN cost_elements_master ce ON bec.element_id = ce.element_id
                    WHERE bec.batch_id = ba.batch_id
                    AND ce.activity = re.activity
                )
            )
            SELECT
                batch_id,
                batch_code,
                production_date,
                STRING_AGG(missing_activity, ', ') as missing_activities
            FROM missing_costs
            GROUP BY batch_id, batch_code, production_date
            ORDER BY production_date DESC
        """, (days,))
        
        issues = []
        for row in cur.fetchall():
            issues.append({
                'batch_id': row[0],
                'batch_code': row[1],
                'production_date': integer_to_date(row[2]) if row[2] else None,
                'missing_activities': row[3]
            })
        
        return jsonify({
            'success': True,
            'validation_issues': issues,
            'total_issues': len(issues),
            'report_period_days': days
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@masters_crud_bp.route('/api/masters/cost_elements/usage_stats', methods=['GET'])
def cost_elements_usage_stats():
    """Get usage statistics for cost elements"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Query the usage stats view if it exists, otherwise calculate
        cur.execute("""
            SELECT 
                ce.element_id,
                ce.element_name,
                ce.category,
                ce.activity,
                ce.default_rate,
                COUNT(DISTINCT bec.batch_id) as times_used,
                AVG(bec.rate_used) as avg_rate_applied,
                SUM(bec.total_cost) as total_cost_incurred,
                COUNT(CASE WHEN bec.rate_used != ce.default_rate THEN 1 END) as override_count,
                MAX(bec.created_at) as last_used
            FROM cost_elements_master ce
            LEFT JOIN batch_extended_costs bec ON ce.element_id = bec.element_id
            WHERE ce.is_active = true
            GROUP BY ce.element_id, ce.element_name, ce.category, ce.activity, ce.default_rate
            ORDER BY times_used DESC
        """)
        
        stats = []
        for row in cur.fetchall():
            times_used = row[5] if row[5] else 0
            override_count = row[8] if row[8] else 0
            
            stats.append({
                'element_id': row[0],
                'element_name': row[1],
                'category': row[2],
                'activity': row[3] if row[3] else 'General',
                'default_rate': float(row[4]) if row[4] else 0,
                'times_used': times_used,
                'avg_rate_applied': float(row[6]) if row[6] else 0,
                'total_cost_incurred': float(row[7]) if row[7] else 0,
                'override_count': override_count,
                'override_percentage': round((override_count / times_used * 100) if times_used > 0 else 0, 1),
                'last_used': row[9].isoformat() if row[9] else None
            })
        
        # Get category summary
        cur.execute("""
            SELECT 
                category,
                COUNT(*) as element_count,
                SUM(times_used) as total_uses,
                SUM(total_cost_incurred) as category_cost
            FROM (
                SELECT 
                    ce.category,
                    ce.element_id,
                    COUNT(DISTINCT bec.batch_id) as times_used,
                    SUM(bec.total_cost) as total_cost_incurred
                FROM cost_elements_master ce
                LEFT JOIN batch_extended_costs bec ON ce.element_id = bec.element_id
                WHERE ce.is_active = true
                GROUP BY ce.category, ce.element_id
            ) as subquery
            GROUP BY category
            ORDER BY category_cost DESC NULLS LAST
        """)
        
        category_summary = []
        for row in cur.fetchall():
            category_summary.append({
                'category': row[0],
                'element_count': row[1],
                'total_uses': row[2] if row[2] else 0,
                'total_cost': float(row[3]) if row[3] else 0
            })
        
        return jsonify({
            'success': True,
            'usage_stats': stats,
            'category_summary': category_summary,
            'total_elements': len(stats)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@masters_crud_bp.route('/api/masters/cost_elements/bulk_update', methods=['POST'])
def bulk_update_cost_elements():
    """Bulk update rates with history tracking"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        updates = data.get('updates', [])
        reason = data.get('reason', 'Bulk rate update')
        updated_by = data.get('updated_by', 'System')
        effective_from = data.get('effective_from')
        
        if not updates:
            return jsonify({'success': False, 'error': 'No updates provided'}), 400
        
        # Parse effective_from date if provided
        if effective_from:
            try:
                effective_from = datetime.strptime(effective_from, '%Y-%m-%d').date()
            except:
                effective_from = date.today()
        else:
            effective_from = date.today()
        
        cur.execute("BEGIN")
        
        updated_count = 0
        failed_updates = []
        
        for update in updates:
            element_id = update.get('element_id')
            new_rate = safe_decimal(update.get('new_rate'))
            
            if not element_id or new_rate is None:
                failed_updates.append({
                    'element_id': element_id,
                    'error': 'Missing element_id or new_rate'
                })
                continue
            
            # Get current rate for history
            cur.execute("""
                SELECT default_rate, element_name
                FROM cost_elements_master
                WHERE element_id = %s
            """, (element_id,))
            
            current = cur.fetchone()
            if not current:
                failed_updates.append({
                    'element_id': element_id,
                    'error': 'Element not found'
                })
                continue
            
            old_rate = float(current[0]) if current[0] else 0
            element_name = current[1]
            
            # Skip if rate hasn't changed
            if float(old_rate) == float(new_rate):
                continue
            
            # Update rate
            cur.execute("""
                UPDATE cost_elements_master
                SET default_rate = %s,
                    updated_at = CURRENT_TIMESTAMP,
                    created_by = %s
                WHERE element_id = %s
            """, (float(new_rate), updated_by, element_id))
            
            # Add to rate history
            cur.execute("""
                INSERT INTO cost_element_rate_history (
                    element_id, old_rate, new_rate,
                    effective_from, changed_by, change_reason
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                element_id,
                float(old_rate),
                float(new_rate),
                effective_from,
                updated_by,
                reason
            ))
            
            # Log to audit
            log_audit(
                conn, cur, 'cost_elements_master', element_id, 'UPDATE',
                old_values={'default_rate': old_rate},
                new_values={'default_rate': new_rate},
                changed_by=updated_by,
                reason=reason
            )
            
            updated_count += 1
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'updated_count': updated_count,
            'failed_count': len(failed_updates),
            'failed_updates': failed_updates,
            'message': f'Updated {updated_count} cost elements'
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@masters_crud_bp.route('/api/masters/cost_elements/<int:element_id>/history', methods=['GET'])
def get_cost_element_history(element_id):
    """Get rate change history from audit log"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get element details
        cur.execute("""
            SELECT element_name, category, default_rate, activity
            FROM cost_elements_master
            WHERE element_id = %s
        """, (element_id,))
        
        element = cur.fetchone()
        if not element:
            return jsonify({'success': False, 'error': 'Cost element not found'}), 404
        
        element_info = {
            'element_id': element_id,
            'element_name': element[0],
            'category': element[1],
            'current_rate': float(element[2]) if element[2] else 0,
            'activity': element[3] if element[3] else 'General'
        }
        
        # Get rate history from cost_element_rate_history table
        cur.execute("""
            SELECT 
                history_id,
                old_rate,
                new_rate,
                effective_from,
                effective_to,
                changed_by,
                change_reason,
                created_at
            FROM cost_element_rate_history
            WHERE element_id = %s
            ORDER BY created_at DESC
            LIMIT 50
        """, (element_id,))
        
        history = []
        for row in cur.fetchall():
            old_rate = float(row[1]) if row[1] else 0
            new_rate = float(row[2]) if row[2] else 0
            
            history.append({
                'history_id': row[0],
                'old_rate': old_rate,
                'new_rate': new_rate,
                'effective_from': row[3].strftime('%Y-%m-%d') if row[3] else None,
                'effective_to': row[4].strftime('%Y-%m-%d') if row[4] else None,
                'changed_by': row[5],
                'change_reason': row[6],
                'changed_at': row[7].isoformat() if row[7] else None,
                'percentage_change': round(((new_rate - old_rate) / old_rate * 100) if old_rate > 0 else 0, 2)
            })
        
        return jsonify({
            'success': True,
            'element': element_info,
            'history': history,
            'history_count': len(history)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# =====================================================
# GET SINGLE RECORD
# =====================================================

@masters_crud_bp.route('/api/masters/<master_type>/<record_id>', methods=['GET'])
def get_single_record(master_type, record_id):
    """Get a single record by ID"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        config = get_master_config(master_type)
        if not config:
            return jsonify({
                'success': False,
                'error': f'Invalid master type: {master_type}'
            }), 400
        
        table = config['table']
        primary_key = config['primary_key']
        
        # Handle different primary key types
        if config.get('primary_key_type') == 'varchar':
            cur.execute(f"SELECT * FROM {table} WHERE {primary_key} = %s", (record_id,))
        else:
            cur.execute(f"SELECT * FROM {table} WHERE {primary_key} = %s", (int(record_id),))
        
        columns = [desc[0] for desc in cur.description]
        row = cur.fetchone()
        
        if not row:
            return jsonify({
                'success': False,
                'error': 'Record not found'
            }), 404
        
        record = dict(zip(columns, row))
        formatted_record = format_response_data(record)
        
        # Get dependencies if requested
        if request.args.get('include_dependencies') == 'true':
            dep_result = check_dependencies(conn, cur, master_type, record_id)
            formatted_record['dependencies'] = dep_result
        
        return jsonify({
            'success': True,
            'record': formatted_record,
            'master_type': master_type
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# =====================================================
# CREATE RECORD
# =====================================================

@masters_crud_bp.route('/api/masters/<master_type>', methods=['POST'])
def create_record(master_type):
    """Create a new record"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        config = get_master_config(master_type)
        if not config:
            return jsonify({
                'success': False,
                'error': f'Invalid master type: {master_type}'
            }), 400
        
        data = request.json
        
        # Transform field values
        for field_name, field_config in config['fields'].items():
            if field_name in data:
                data[field_name] = transform_field_value(field_config, data[field_name])
        
        # Validate data
        is_valid, errors = validate_master_data(master_type, data)
        if not is_valid:
            return jsonify({
                'success': False,
                'errors': errors
            }), 400
        
        # Build INSERT query
        table = config['table']
        fields = []
        values = []
        placeholders = []
        
        for field_name, field_config in config['fields'].items():
            if field_name in data:
                # Special handling for last_updated in materials
                if master_type == 'materials' and field_name == 'last_updated' and not data[field_name]:
                    fields.append(field_name)
                    values.append(get_current_day_number())
                    placeholders.append('%s')
                else:
                    fields.append(field_name)
                    values.append(data[field_name])
                    placeholders.append('%s')
        
        # Add last_updated for materials table if not present
        if master_type == 'materials' and 'last_updated' not in fields:
            fields.append('last_updated')
            values.append(get_current_day_number())
            placeholders.append('%s')
        
        # Add is_active for new records
        soft_delete_field = config.get('soft_delete_field', 'is_active')
        if soft_delete_field not in fields:
            fields.append(soft_delete_field)
            values.append(True)
            placeholders.append('%s')
        
        query = f"""
            INSERT INTO {table} ({', '.join(fields)})
            VALUES ({', '.join(placeholders)})
            RETURNING {config['primary_key']}
        """
        
        cur.execute(query, values)
        new_id = cur.fetchone()[0]
        
        # Log audit
        log_audit(
            conn, cur, table, new_id, 'INSERT',
            new_values=data,
            changed_by=data.get('created_by', 'System'),
            reason=f'Created new {master_type} record'
        )
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': f'{config.get("display_name", master_type)} created successfully',
            'id': new_id
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# =====================================================
# UPDATE RECORD
# =====================================================

@masters_crud_bp.route('/api/masters/<master_type>/<record_id>', methods=['PUT'])
def update_record(master_type, record_id):
    """Update an existing record"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        config = get_master_config(master_type)
        if not config:
            return jsonify({
                'success': False,
                'error': f'Invalid master type: {master_type}'
            }), 400
        
        data = request.json
        table = config['table']
        primary_key = config['primary_key']
        
        # Get current record for audit
        if config.get('primary_key_type') == 'varchar':
            cur.execute(f"SELECT * FROM {table} WHERE {primary_key} = %s", (record_id,))
        else:
            cur.execute(f"SELECT * FROM {table} WHERE {primary_key} = %s", (int(record_id),))
        
        columns = [desc[0] for desc in cur.description]
        current_row = cur.fetchone()
        
        if not current_row:
            return jsonify({
                'success': False,
                'error': 'Record not found'
            }), 404
        
        old_values = dict(zip(columns, current_row))
        
        # Transform field values
        for field_name, field_config in config['fields'].items():
            if field_name in data:
                data[field_name] = transform_field_value(field_config, data[field_name])
        
        # Validate data
        is_valid, errors = validate_master_data(master_type, data, record_id)
        if not is_valid:
            return jsonify({
                'success': False,
                'errors': errors
            }), 400
        
        # Build UPDATE query
        set_clauses = []
        values = []
        
        for field_name in data:
            if field_name in config['fields']:
                # Special handling for last_updated in materials
                if master_type == 'materials' and field_name == 'last_updated':
                    set_clauses.append(f"{field_name} = %s")
                    values.append(get_current_day_number())
                else:
                    set_clauses.append(f"{field_name} = %s")
                    values.append(data[field_name])
        
        # Always update last_updated for materials on any update
        if master_type == 'materials' and 'last_updated' not in data:
            set_clauses.append("last_updated = %s")
            values.append(get_current_day_number())
        
        if not set_clauses:
            return jsonify({
                'success': False,
                'error': 'No valid fields to update'
            }), 400
        
        # Check if updated_at column exists before adding it
        if check_column_exists(cur, table, 'updated_at'):
            set_clauses.append("updated_at = CURRENT_TIMESTAMP")
        
        # Add record_id to values
        if config.get('primary_key_type') == 'varchar':
            values.append(record_id)
        else:
            values.append(int(record_id))
        
        query = f"""
            UPDATE {table}
            SET {', '.join(set_clauses)}
            WHERE {primary_key} = %s
        """
        
        cur.execute(query, values)
        
        if cur.rowcount == 0:
            return jsonify({
                'success': False,
                'error': 'No rows updated'
            }), 400
        
        # Log audit
        log_audit(
            conn, cur, table, record_id, 'UPDATE',
            old_values=old_values,
            new_values=data,
            changed_by=data.get('updated_by', 'System'),
            reason=f'Updated {master_type} record'
        )
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': f'{config.get("display_name", master_type)} updated successfully'
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# =====================================================
# DELETE RECORD
# =====================================================

@masters_crud_bp.route('/api/masters/<master_type>/<record_id>', methods=['DELETE'])
def delete_record(master_type, record_id):
    """Delete a record (soft or hard delete based on dependencies)"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        config = get_master_config(master_type)
        if not config:
            return jsonify({
                'success': False,
                'error': f'Invalid master type: {master_type}'
            }), 400
        
        # Check dependencies
        dep_result = check_dependencies(conn, cur, master_type, record_id)
        
        if dep_result['has_dependencies']:
            # Soft delete only
            success = soft_delete_record(conn, cur, master_type, record_id)
            if success:
                conn.commit()
                return jsonify({
                    'success': True,
                    'message': f'{config.get("display_name", master_type)} deactivated successfully',
                    'soft_delete': True,
                    'dependencies': dep_result
                })
            else:
                return jsonify({
                    'success': False,
                    'error': 'Failed to deactivate record'
                }), 500
        else:
            # Hard delete
            table = config['table']
            primary_key = config['primary_key']
            
            if config.get('primary_key_type') == 'varchar':
                cur.execute(f"DELETE FROM {table} WHERE {primary_key} = %s", (record_id,))
            else:
                cur.execute(f"DELETE FROM {table} WHERE {primary_key} = %s", (int(record_id),))
            
            if cur.rowcount == 0:
                return jsonify({
                    'success': False,
                    'error': 'Record not found'
                }), 404
            
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': f'{config.get("display_name", master_type)} deleted successfully',
                'soft_delete': False
            })
            
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# =====================================================
# RESTORE RECORD
# =====================================================

@masters_crud_bp.route('/api/masters/<master_type>/<record_id>/restore', methods=['POST'])
def restore_record_endpoint(master_type, record_id):
    """Restore a soft-deleted record"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        config = get_master_config(master_type)
        if not config:
            return jsonify({
                'success': False,
                'error': f'Invalid master type: {master_type}'
            }), 400
        
        success = restore_record(conn, cur, master_type, record_id, request.json.get('restored_by'))
        
        if success:
            conn.commit()
            return jsonify({
                'success': True,
                'message': f'{config.get("display_name", master_type)} restored successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to restore record'
            }), 404
            
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# =====================================================
# CHECK DEPENDENCIES
# =====================================================

@masters_crud_bp.route('/api/masters/<master_type>/<record_id>/dependencies', methods=['GET'])
def check_record_dependencies(master_type, record_id):
    """Check if a record has dependencies"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        config = get_master_config(master_type)
        if not config:
            return jsonify({
                'success': False,
                'error': f'Invalid master type: {master_type}'
            }), 400
        
        dep_result = check_dependencies(conn, cur, master_type, record_id)
        
        return jsonify({
            'success': True,
            'dependencies': dep_result
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# =====================================================
# EXPORT TO CSV
# =====================================================

@masters_crud_bp.route('/api/masters/<master_type>/export', methods=['GET'])
def export_to_csv(master_type):
    """Export master data to CSV"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        config = get_master_config(master_type)
        if not config:
            return jsonify({
                'success': False,
                'error': f'Invalid master type: {master_type}'
            }), 400
        
        include_inactive = request.args.get('include_inactive', 'false').lower() == 'true'
        
        # Get export query
        query = get_export_query(master_type, include_inactive)
        if not query:
            return jsonify({
                'success': False,
                'error': 'Export not supported for this master type'
            }), 400
        
        # Add ORDER BY
        name_field = config.get('name_field', config['primary_key'])
        query += f" ORDER BY {name_field}"
        
        cur.execute(query)
        columns = [desc[0] for desc in cur.description]
        rows = cur.fetchall()
        
        # Create CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(columns)
        
        # Write data
        for row in rows:
            formatted_row = []
            for value in row:
                if isinstance(value, Decimal):
                    formatted_row.append(float(value))
                elif isinstance(value, datetime):
                    formatted_row.append(value.strftime('%Y-%m-%d %H:%M:%S'))
                elif value is None:
                    formatted_row.append('')
                else:
                    formatted_row.append(str(value))
            writer.writerow(formatted_row)
        
        # Create response
        output.seek(0)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'{master_type}_{timestamp}.csv'
        
        return send_file(
            io.BytesIO(output.getvalue().encode()),
            mimetype='text/csv',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# =====================================================
# IMPORT FROM CSV
# =====================================================

@masters_crud_bp.route('/api/masters/<master_type>/import', methods=['POST'])
def import_from_csv(master_type):
    """Import master data from CSV"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        config = get_master_config(master_type)
        if not config:
            return jsonify({
                'success': False,
                'error': f'Invalid master type: {master_type}'
            }), 400
        
        # Get CSV file from request
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file uploaded'
            }), 400
        
        file = request.files['file']
        if not file.filename.endswith('.csv'):
            return jsonify({
                'success': False,
                'error': 'File must be a CSV'
            }), 400
        
        # Read CSV
        content = file.read().decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(content))
        
        success_count = 0
        error_count = 0
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):
            try:
                # Transform and validate data
                data = {}
                for field_name, field_config in config['fields'].items():
                    if field_name in row:
                        value = row[field_name]
                        
                        # Convert empty strings to None for optional fields
                        if value == '' and not field_config.get('required', False):
                            value = None
                        elif field_config['type'] == 'decimal' and value:
                            value = safe_decimal(value)
                        elif field_config['type'] == 'integer' and value:
                            value = safe_int(value)
                        elif field_config['type'] == 'boolean':
                            value = value.lower() in ['true', '1', 'yes']
                        
                        if value is not None:
                            data[field_name] = transform_field_value(field_config, value)
                
                # Validate
                is_valid, validation_errors = validate_master_data(master_type, data)
                if not is_valid:
                    errors.append(f"Row {row_num}: {validation_errors}")
                    error_count += 1
                    continue
                
                # Insert record
                table = config['table']
                fields = list(data.keys())
                values = list(data.values())
                placeholders = ['%s'] * len(fields)
                
                # Add is_active
                soft_delete_field = config.get('soft_delete_field', 'is_active')
                if soft_delete_field not in fields:
                    fields.append(soft_delete_field)
                    values.append(True)
                    placeholders.append('%s')
                
                query = f"""
                    INSERT INTO {table} ({', '.join(fields)})
                    VALUES ({', '.join(placeholders)})
                    ON CONFLICT ({config['primary_key']}) DO NOTHING
                """
                
                cur.execute(query, values)
                success_count += 1
                
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
                error_count += 1
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': f'Import completed. Success: {success_count}, Errors: {error_count}',
            'success_count': success_count,
            'error_count': error_count,
            'errors': errors[:10] if errors else []
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# =====================================================
# CATEGORY AND SUBCATEGORY ENDPOINTS (EXISTING)
# =====================================================

@masters_crud_bp.route('/api/categories', methods=['GET'])
def get_categories():
    """Get all categories with their subcategory requirements"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT 
                category_id,
                category_name,
                requires_subcategory,
                is_active
            FROM categories_master
            WHERE is_active = true
            ORDER BY category_name
        """)
        
        categories = []
        for row in cur.fetchall():
            categories.append({
                'category_id': row[0],
                'category_name': row[1],
                'requires_subcategory': row[2],
                'is_active': row[3]
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


@masters_crud_bp.route('/api/subcategories', methods=['GET'])
def get_subcategories():
    """Get subcategories, optionally filtered by category_id"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        category_id = request.args.get('category_id', type=int)
        
        if category_id:
            cur.execute("""
                SELECT 
                    s.subcategory_id,
                    s.category_id,
                    c.category_name,
                    s.subcategory_name,
                    s.subcategory_code,
                    s.oil_type,
                    s.gst_rate,
                    s.is_active
                FROM subcategories_master s
                JOIN categories_master c ON s.category_id = c.category_id
                WHERE s.category_id = %s AND s.is_active = true
                ORDER BY s.subcategory_name
            """, (category_id,))
        else:
            cur.execute("""
                SELECT 
                    s.subcategory_id,
                    s.category_id,
                    c.category_name,
                    s.subcategory_name,
                    s.subcategory_code,
                    s.oil_type,
                    s.gst_rate,
                    s.is_active
                FROM subcategories_master s
                JOIN categories_master c ON s.category_id = c.category_id
                WHERE s.is_active = true
                ORDER BY c.category_name, s.subcategory_name
            """)
        
        subcategories = []
        for row in cur.fetchall():
            subcategories.append({
                'subcategory_id': row[0],
                'category_id': row[1],
                'category_name': row[2],
                'subcategory_name': row[3],
                'subcategory_code': row[4],
                'oil_type': row[5],
                'gst_rate': float(row[6]) if row[6] is not None else None,
                'is_active': row[7]
            })
        
        return jsonify({
            'success': True,
            'subcategories': subcategories,
            'count': len(subcategories)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@masters_crud_bp.route('/api/subcategories/<int:subcategory_id>', methods=['GET'])
def get_subcategory_details(subcategory_id):
    """Get details of a single subcategory"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT 
                s.subcategory_id,
                s.category_id,
                c.category_name,
                s.subcategory_name,
                s.subcategory_code,
                s.oil_type,
                s.gst_rate,
                s.is_active,
                s.created_at
            FROM subcategories_master s
            JOIN categories_master c ON s.category_id = c.category_id
            WHERE s.subcategory_id = %s
        """, (subcategory_id,))
        
        row = cur.fetchone()
        
        if not row:
            return jsonify({
                'success': False,
                'error': 'Subcategory not found'
            }), 404
        
        subcategory = {
            'subcategory_id': row[0],
            'category_id': row[1],
            'category_name': row[2],
            'subcategory_name': row[3],
            'subcategory_code': row[4],
            'oil_type': row[5],
            'gst_rate': float(row[6]) if row[6] is not None else None,
            'is_active': row[7],
            'created_at': row[8].isoformat() if row[8] else None
        }
        
        return jsonify({
            'success': True,
            'subcategory': subcategory
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# =====================================================
# SUBCATEGORY CREATE/UPDATE/DELETE ENDPOINTS
# =====================================================

@masters_crud_bp.route('/api/masters/subcategories', methods=['POST'])
def create_subcategory():
    """Create a new subcategory with GST validation"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['subcategory_name', 'subcategory_code', 'category_id']
        missing_fields = [f for f in required_fields if f not in data or data[f] is None]
        
        if missing_fields:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        # Validate category exists and is active
        cur.execute("""
            SELECT category_id, category_name 
            FROM categories_master 
            WHERE category_id = %s AND is_active = true
        """, (data['category_id'],))
        
        category = cur.fetchone()
        if not category:
            return jsonify({
                'success': False,
                'error': f'Invalid or inactive category_id: {data["category_id"]}'
            }), 400
        
        # Check for duplicate subcategory_code
        cur.execute("""
            SELECT subcategory_id 
            FROM subcategories_master 
            WHERE subcategory_code = %s
        """, (data['subcategory_code'],))
        
        if cur.fetchone():
            return jsonify({
                'success': False,
                'error': f'Subcategory code "{data["subcategory_code"]}" already exists'
            }), 400
        
        # GST Validation for Oil Category (category_id = 8)
        gst_rate = None
        if 'gst_rate' in data:
            is_valid, error_msg, validated_rate = validate_gst_rate(data['gst_rate'], data['category_id'])
            if not is_valid:
                return jsonify({
                    'success': False,
                    'error': error_msg
                }), 400
            gst_rate = validated_rate
        elif data['category_id'] == 8:
            return jsonify({
                'success': False,
                'error': 'GST rate is required for Oil subcategories'
            }), 400
        
        # Insert the subcategory with GST rate
        cur.execute("""
            INSERT INTO subcategories_master (
                category_id,
                subcategory_name,
                subcategory_code,
                oil_type,
                gst_rate,
                is_active,
                created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            RETURNING subcategory_id
        """, (
            data['category_id'],
            data['subcategory_name'],
            data['subcategory_code'],
            data.get('oil_type'),
            gst_rate,
            data.get('is_active', True)
        ))
        
        new_subcategory_id = cur.fetchone()[0]
        
        # Log audit
        audit_data = dict(data)
        audit_data['gst_rate'] = gst_rate
        
        log_audit(
            conn, cur, 'subcategories_master', new_subcategory_id, 'INSERT',
            new_values=audit_data,
            changed_by='System',
            reason='Created new subcategory'
        )
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'id': new_subcategory_id,
            'subcategory_id': new_subcategory_id,
            'message': f'Subcategory "{data["subcategory_name"]}" created successfully'
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        close_connection(conn, cur)


@masters_crud_bp.route('/api/masters/subcategories/<int:subcategory_id>', methods=['PUT'])
def update_subcategory(subcategory_id):
    """Update an existing subcategory with GST validation"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        # Get current record for audit
        cur.execute("""
            SELECT * FROM subcategories_master 
            WHERE subcategory_id = %s
        """, (subcategory_id,))
        
        columns = [desc[0] for desc in cur.description]
        current_row = cur.fetchone()
        
        if not current_row:
            return jsonify({
                'success': False,
                'error': 'Subcategory not found'
            }), 404
        
        old_values = dict(zip(columns, current_row))
        current_category_id = old_values['category_id']
        
        # Build update query dynamically
        update_fields = []
        values = []
        
        if 'subcategory_name' in data:
            update_fields.append('subcategory_name = %s')
            values.append(data['subcategory_name'])
            
        if 'subcategory_code' in data:
            update_fields.append('subcategory_code = %s')
            values.append(data['subcategory_code'])
            
        if 'category_id' in data:
            # Validate category exists
            cur.execute("""
                SELECT category_id FROM categories_master 
                WHERE category_id = %s AND is_active = true
            """, (data['category_id'],))
            
            if not cur.fetchone():
                return jsonify({
                    'success': False,
                    'error': f'Invalid or inactive category_id: {data["category_id"]}'
                }), 400
                
            update_fields.append('category_id = %s')
            values.append(data['category_id'])
            current_category_id = data['category_id']
            
        if 'oil_type' in data:
            update_fields.append('oil_type = %s')
            values.append(data['oil_type'])
            
        # GST Rate Update with Validation
        if 'gst_rate' in data:
            is_valid, error_msg, validated_rate = validate_gst_rate(data['gst_rate'], current_category_id)
            if not is_valid:
                return jsonify({
                    'success': False,
                    'error': error_msg
                }), 400
            
            update_fields.append('gst_rate = %s')
            values.append(validated_rate)
            
        if 'is_active' in data:
            update_fields.append('is_active = %s')
            values.append(data['is_active'])
        
        if not update_fields:
            return jsonify({
                'success': False,
                'error': 'No fields to update'
            }), 400
        
        # Add subcategory_id to values
        values.append(subcategory_id)
        
        # Execute update
        query = f"""
            UPDATE subcategories_master
            SET {', '.join(update_fields)}
            WHERE subcategory_id = %s
            RETURNING subcategory_id
        """
        
        cur.execute(query, values)
        
        if cur.rowcount == 0:
            return jsonify({
                'success': False,
                'error': 'No rows updated'
            }), 400
        
        # Log audit
        log_audit(
            conn, cur, 'subcategories_master', subcategory_id, 'UPDATE',
            old_values=old_values,
            new_values=data,
            changed_by='System',
            reason='Updated subcategory'
        )
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Subcategory updated successfully'
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        close_connection(conn, cur)


@masters_crud_bp.route('/api/masters/subcategories/<int:subcategory_id>', methods=['DELETE'])
def delete_subcategory(subcategory_id):
    """Delete or deactivate a subcategory"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Check if subcategory has dependent materials
        cur.execute("""
            SELECT COUNT(*) 
            FROM materials 
            WHERE subcategory_id = %s AND is_active = true
        """, (subcategory_id,))
        
        material_count = cur.fetchone()[0]
        
        if material_count > 0:
            # Soft delete only
            cur.execute("""
                UPDATE subcategories_master 
                SET is_active = false 
                WHERE subcategory_id = %s
                RETURNING subcategory_name
            """, (subcategory_id,))
            
            if cur.rowcount == 0:
                return jsonify({
                    'success': False,
                    'error': 'Subcategory not found'
                }), 404
            
            name = cur.fetchone()[0]
            
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': f'Subcategory "{name}" deactivated (has {material_count} active materials)',
                'soft_delete': True
            })
        else:
            # Hard delete if no dependencies
            cur.execute("""
                DELETE FROM subcategories_master 
                WHERE subcategory_id = %s
                RETURNING subcategory_name
            """, (subcategory_id,))
            
            if cur.rowcount == 0:
                return jsonify({
                    'success': False,
                    'error': 'Subcategory not found'
                }), 404
            
            name = cur.fetchone()[0]
            
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': f'Subcategory "{name}" deleted permanently',
                'soft_delete': False
            })
            
    except Exception as e:
        conn.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        close_connection(conn, cur)


# =====================================================
# REMAINING OIL CONFIGURATION ENDPOINTS (TRUNCATED FOR LENGTH)
# All other endpoints remain exactly as they were in the original file
# =====================================================

# =====================================================
# OIL CONFIGURATION ENDPOINTS (EXISTING)
# =====================================================

@masters_crud_bp.route('/api/oil-config/status', methods=['GET'])
def get_oil_config_status():
    """Get comprehensive oil configuration health status"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Check Seeds subcategories with oil_type mapping
        cur.execute("""
            SELECT 
                s.subcategory_id,
                s.subcategory_name,
                s.subcategory_code,
                s.oil_type,
                COUNT(DISTINCT m.material_id) as material_count,
                COUNT(DISTINCT CASE WHEN m.produces_oil_type IS NOT NULL THEN m.material_id END) as mapped_materials
            FROM subcategories_master s
            JOIN categories_master c ON s.category_id = c.category_id
            LEFT JOIN materials m ON s.subcategory_id = m.subcategory_id
            WHERE c.category_name = 'Seeds' AND s.is_active = true
            GROUP BY s.subcategory_id, s.subcategory_name, s.subcategory_code, s.oil_type
        """)
        
        seed_configs = []
        unmapped_seeds = 0
        for row in cur.fetchall():
            is_configured = row[3] is not None and row[3] != ''
            if not is_configured:
                unmapped_seeds += 1
            
            seed_configs.append({
                'subcategory_id': row[0],
                'name': row[1],
                'code': row[2],
                'oil_type': row[3],
                'material_count': row[4],
                'mapped_materials': row[5],
                'is_configured': is_configured
            })
        
        # Check Oil subcategories with GST rates
        cur.execute("""
            SELECT 
                s.subcategory_id,
                s.subcategory_name,
                s.subcategory_code,
                s.oil_type,
                s.gst_rate,
                COUNT(DISTINCT sku.sku_id) as sku_count
            FROM subcategories_master s
            JOIN categories_master c ON s.category_id = c.category_id
            LEFT JOIN sku_master sku ON sku.oil_type = s.oil_type
            WHERE c.category_name = 'Oil' AND s.is_active = true
            GROUP BY s.subcategory_id, s.subcategory_name, s.subcategory_code, s.oil_type, s.gst_rate
        """)
        
        oil_products = []
        unmapped_oils = 0
        missing_gst = 0
        for row in cur.fetchall():
            is_configured = row[3] is not None and row[3] != ''
            has_gst = row[4] is not None
            
            if not is_configured:
                unmapped_oils += 1
            if not has_gst:
                missing_gst += 1
                
            oil_products.append({
                'subcategory_id': row[0],
                'name': row[1],
                'code': row[2],
                'oil_type': row[3],
                'gst_rate': float(row[4]) if row[4] is not None else None,
                'sku_count': row[5],
                'is_configured': is_configured,
                'has_gst': has_gst
            })
        
        # Check materials without produces_oil_type
        cur.execute("""
            SELECT COUNT(*) 
            FROM materials 
            WHERE category = 'Seeds' 
            AND (produces_oil_type IS NULL OR produces_oil_type = '')
            AND is_active = true
        """)
        materials_without_oil_type = cur.fetchone()[0]
        
        # Check for orphaned oil types (oil without corresponding seeds)
        cur.execute("""
            SELECT DISTINCT s.oil_type
            FROM subcategories_master s
            JOIN categories_master c ON s.category_id = c.category_id
            WHERE c.category_name = 'Oil' 
            AND s.oil_type IS NOT NULL 
            AND s.oil_type != ''
            AND s.oil_type NOT IN (
                SELECT DISTINCT oil_type 
                FROM subcategories_master s2
                JOIN categories_master c2 ON s2.category_id = c2.category_id
                WHERE c2.category_name = 'Seeds' 
                AND oil_type IS NOT NULL
            )
        """)
        orphaned_oil_types = [row[0] for row in cur.fetchall()]
        
        # Calculate health score
        total_issues = unmapped_seeds + unmapped_oils + materials_without_oil_type + len(orphaned_oil_types) + missing_gst
        health_score = 'healthy' if total_issues == 0 else 'warning' if total_issues <= 3 else 'critical'
        
        # Prepare recommendations
        recommendations = []
        if missing_gst > 0:
            recommendations.append(f'Configure GST rates for {missing_gst} oil products')
        if unmapped_seeds > 0:
            recommendations.append(f'Map oil types for {unmapped_seeds} seed varieties')
        if unmapped_oils > 0:
            recommendations.append(f'Configure oil types for {unmapped_oils} oil products')
        
        return jsonify({
            'success': True,
            'health_score': health_score,
            'total_issues': total_issues,
            'seed_configurations': seed_configs,
            'oil_products': oil_products,
            'statistics': {
                'total_seed_varieties': len(seed_configs),
                'unmapped_seed_varieties': unmapped_seeds,
                'total_oil_products': len(oil_products),
                'unmapped_oil_products': unmapped_oils,
                'oil_products_missing_gst': missing_gst,
                'materials_without_oil_type': materials_without_oil_type,
                'orphaned_oil_types': orphaned_oil_types
            },
            'recommendations': recommendations
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@masters_crud_bp.route('/api/oil-config/seed-varieties', methods=['GET'])
def get_seed_varieties():
    """Get seed subcategories with oil mapping status and material counts"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT 
                s.subcategory_id,
                s.subcategory_name,
                s.subcategory_code,
                s.oil_type,
                s.is_active,
                COUNT(DISTINCT m.material_id) as total_materials,
                COUNT(DISTINCT CASE WHEN m.produces_oil_type IS NOT NULL THEN m.material_id END) as configured_materials,
                COALESCE(SUM(i.closing_stock), 0) as total_stock
            FROM subcategories_master s
            JOIN categories_master c ON s.category_id = c.category_id
            LEFT JOIN materials m ON s.subcategory_id = m.subcategory_id AND m.is_active = true
            LEFT JOIN inventory i ON m.material_id = i.material_id
            WHERE c.category_name = 'Seeds'
            GROUP BY s.subcategory_id, s.subcategory_name, s.subcategory_code, s.oil_type, s.is_active
            ORDER BY s.subcategory_name
        """)
        
        varieties = []
        for row in cur.fetchall():
            varieties.append({
                'subcategory_id': row[0],
                'variety_name': row[1],
                'code': row[2],
                'produces_oil': row[3] if row[3] else 'NOT CONFIGURED',
                'is_active': row[4],
                'total_materials': row[5],
                'configured_materials': row[6],
                'total_stock': float(row[7]),
                'configuration_status': 'configured' if row[3] else 'needs_configuration'
            })
        
        return jsonify({
            'success': True,
            'seed_varieties': varieties,
            'count': len(varieties)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@masters_crud_bp.route('/api/oil-config/oil-products', methods=['GET'])
def get_oil_products():
    """Get oil subcategories with production statistics and GST rates"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT 
                s.subcategory_id,
                s.subcategory_name,
                s.subcategory_code,
                s.oil_type,
                s.gst_rate,
                s.is_active,
                COUNT(DISTINCT sku.sku_id) as sku_count,
                COUNT(DISTINCT b.batch_id) as batch_count,
                COUNT(DISTINCT blend.blend_id) as blend_count
            FROM subcategories_master s
            JOIN categories_master c ON s.category_id = c.category_id
            LEFT JOIN sku_master sku ON sku.oil_type = s.oil_type
            LEFT JOIN batch b ON b.oil_type = s.oil_type
            LEFT JOIN blend_batches blend ON blend.result_oil_type = s.oil_type
            WHERE c.category_name = 'Oil'
            GROUP BY s.subcategory_id, s.subcategory_name, s.subcategory_code, s.oil_type, s.gst_rate, s.is_active
            ORDER BY s.subcategory_name
        """)
        
        products = []
        for row in cur.fetchall():
            products.append({
                'subcategory_id': row[0],
                'product_name': row[1],
                'code': row[2],
                'oil_type': row[3] if row[3] else 'NOT SET',
                'gst_rate': float(row[4]) if row[4] is not None else None,
                'is_active': row[5],
                'sku_count': row[6],
                'batch_count': row[7],
                'blend_count': row[8],
                'configuration_status': 'configured' if row[3] else 'needs_configuration',
                'gst_status': 'configured' if row[4] is not None else 'missing'
            })
        
        return jsonify({
            'success': True,
            'oil_products': products,
            'count': len(products)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@masters_crud_bp.route('/api/oil-config/production-flow', methods=['GET'])
def get_production_flow():
    """Get the complete seed → oil → product → SKU flow for visualization"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get the production chain with GST rates
        cur.execute("""
            WITH seed_to_oil AS (
                SELECT DISTINCT
                    s.subcategory_name as seed_variety,
                    s.oil_type as produces_oil,
                    COUNT(DISTINCT m.material_id) as material_count
                FROM subcategories_master s
                JOIN categories_master c ON s.category_id = c.category_id
                LEFT JOIN materials m ON s.subcategory_id = m.subcategory_id
                WHERE c.category_name = 'Seeds' AND s.oil_type IS NOT NULL
                GROUP BY s.subcategory_name, s.oil_type
            ),
            oil_to_product AS (
                SELECT DISTINCT
                    s.oil_type,
                    s.subcategory_name as oil_product,
                    s.gst_rate,
                    COUNT(DISTINCT sku.sku_id) as sku_count
                FROM subcategories_master s
                JOIN categories_master c ON s.category_id = c.category_id
                LEFT JOIN sku_master sku ON sku.oil_type = s.oil_type
                WHERE c.category_name = 'Oil' AND s.oil_type IS NOT NULL
                GROUP BY s.oil_type, s.subcategory_name, s.gst_rate
            )
            SELECT 
                sto.seed_variety,
                sto.produces_oil,
                sto.material_count,
                otp.oil_product,
                otp.gst_rate,
                otp.sku_count
            FROM seed_to_oil sto
            LEFT JOIN oil_to_product otp ON sto.produces_oil = otp.oil_type
            ORDER BY sto.produces_oil, sto.seed_variety
        """)
        
        flow_data = []
        oil_types = {}
        
        for row in cur.fetchall():
            oil_type = row[1]
            if oil_type not in oil_types:
                oil_types[oil_type] = {
                    'oil_type': oil_type,
                    'seeds': [],
                    'products': [],
                    'gst_rate': None,
                    'total_materials': 0,
                    'total_skus': 0
                }
            
            # Add seed variety
            oil_types[oil_type]['seeds'].append({
                'name': row[0],
                'material_count': row[2]
            })
            oil_types[oil_type]['total_materials'] += row[2]
            
            # Add oil product if not already added
            if row[3] and row[3] not in [p['name'] for p in oil_types[oil_type]['products']]:
                oil_types[oil_type]['products'].append({
                    'name': row[3],
                    'gst_rate': float(row[4]) if row[4] is not None else None,
                    'sku_count': row[5]
                })
                oil_types[oil_type]['total_skus'] += row[5]
                if row[4] is not None:
                    oil_types[oil_type]['gst_rate'] = float(row[4])
        
        # Convert to list
        for oil_type, data in oil_types.items():
            flow_data.append(data)
        
        return jsonify({
            'success': True,
            'production_flow': flow_data,
            'oil_type_count': len(flow_data)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@masters_crud_bp.route('/api/oil-config/validate', methods=['POST'])
def validate_oil_configuration():
    """Validate oil configuration and suggest fixes (does not auto-apply)"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json or {}
        
        issues = []
        suggestions = []
        
        # Check 1: Seed subcategories without oil_type
        cur.execute("""
            SELECT s.subcategory_id, s.subcategory_name, s.subcategory_code
            FROM subcategories_master s
            JOIN categories_master c ON s.category_id = c.category_id
            WHERE c.category_name = 'Seeds' 
            AND (s.oil_type IS NULL OR s.oil_type = '')
            AND s.is_active = true
            ORDER BY s.subcategory_name
        """)
        
        for row in cur.fetchall():
            subcategory_id = row[0]
            subcategory_name = row[1]
            subcategory_code = row[2]
            
            # Issue tracking
            issues.append({
                'type': 'missing_oil_type',
                'entity': 'subcategory',
                'id': subcategory_id,
                'name': subcategory_name,
                'message': f"Seed variety '{subcategory_name}' has no oil_type configured"
            })
            
            # Try to suggest oil type based on name patterns
            name_upper = subcategory_name.upper()
            suggested_oil_type = None
            confidence = 'low'
            pattern_matched = None
            
            # High confidence patterns (exact matches with "SEED" keyword)
            if 'GROUNDNUT' in name_upper and 'SEED' in name_upper:
                suggested_oil_type = 'Groundnut'
                confidence = 'high'
                pattern_matched = 'Groundnut + Seed'
            elif ('SESAME' in name_upper or 'GINGELLY' in name_upper) and 'SEED' in name_upper:
                suggested_oil_type = 'Sesame'
                confidence = 'high'
                pattern_matched = 'Sesame/Gingelly + Seed'
            elif 'COCONUT' in name_upper and ('SEED' in name_upper or 'COPRA' in name_upper):
                suggested_oil_type = 'Coconut'
                confidence = 'high'
                pattern_matched = 'Coconut/Copra'
            elif 'MUSTARD' in name_upper and 'SEED' in name_upper:
                suggested_oil_type = 'Mustard'
                confidence = 'high'
                pattern_matched = 'Mustard + Seed'
            elif 'SUNFLOWER' in name_upper and 'SEED' in name_upper:
                suggested_oil_type = 'Sunflower'
                confidence = 'high'
                pattern_matched = 'Sunflower + Seed'
            elif 'CASTOR' in name_upper and 'SEED' in name_upper:
                suggested_oil_type = 'Castor'
                confidence = 'high'
                pattern_matched = 'Castor + Seed'
            # Medium confidence patterns (name contains oil type but not "SEED")
            elif 'GROUNDNUT' in name_upper:
                suggested_oil_type = 'Groundnut'
                confidence = 'medium'
                pattern_matched = 'Groundnut'
            elif 'SESAME' in name_upper or 'GINGELLY' in name_upper:
                suggested_oil_type = 'Sesame'
                confidence = 'medium'
                pattern_matched = 'Sesame/Gingelly'
            elif 'COCONUT' in name_upper:
                suggested_oil_type = 'Coconut'
                confidence = 'medium'
                pattern_matched = 'Coconut'
            elif 'MUSTARD' in name_upper:
                suggested_oil_type = 'Mustard'
                confidence = 'medium'
                pattern_matched = 'Mustard'
            elif 'SUNFLOWER' in name_upper:
                suggested_oil_type = 'Sunflower'
                confidence = 'medium'
                pattern_matched = 'Sunflower'
            elif 'CASTOR' in name_upper:
                suggested_oil_type = 'Castor'
                confidence = 'medium'
                pattern_matched = 'Castor'
            # Low confidence patterns (partial matches)
            elif 'PALM' in name_upper:
                suggested_oil_type = 'Palm'
                confidence = 'low'
                pattern_matched = 'Palm'
            elif 'NEEM' in name_upper:
                suggested_oil_type = 'Neem'
                confidence = 'low'
                pattern_matched = 'Neem'
            
            if suggested_oil_type:
                suggestions.append({
                    'entity_type': 'subcategory',
                    'entity_id': subcategory_id,
                    'entity_name': subcategory_name,
                    'entity_code': subcategory_code,
                    'field': 'oil_type',
                    'current_value': None,
                    'suggested_value': suggested_oil_type,
                    'confidence': confidence,
                    'pattern_matched': pattern_matched,
                    'reason': f"Name contains '{pattern_matched}'"
                })
        
        # Check 2: Seed materials without produces_oil_type but subcategory has oil_type
        cur.execute("""
            SELECT m.material_id, m.material_name, s.oil_type, s.subcategory_name
            FROM materials m
            JOIN subcategories_master s ON m.subcategory_id = s.subcategory_id
            WHERE m.category = 'Seeds' 
            AND (m.produces_oil_type IS NULL OR m.produces_oil_type = '')
            AND m.is_active = true
            AND s.oil_type IS NOT NULL
            AND s.oil_type != ''
            ORDER BY m.material_name
        """)
        
        for row in cur.fetchall():
            material_id = row[0]
            material_name = row[1]
            subcategory_oil_type = row[2]
            subcategory_name = row[3]
            
            issues.append({
                'type': 'missing_produces_oil_type',
                'entity': 'material',
                'id': material_id,
                'name': material_name,
                'message': f"Seed material '{material_name}' has no produces_oil_type set"
            })
            
            # High confidence suggestion since subcategory already has oil_type
            suggestions.append({
                'entity_type': 'material',
                'entity_id': material_id,
                'entity_name': material_name,
                'field': 'produces_oil_type',
                'current_value': None,
                'suggested_value': subcategory_oil_type,
                'confidence': 'high',
                'pattern_matched': 'subcategory_oil_type',
                'reason': f"Subcategory '{subcategory_name}' has oil_type='{subcategory_oil_type}'"
            })
        
        # Check 3: Oil subcategories without oil_type
        cur.execute("""
            SELECT s.subcategory_id, s.subcategory_name, s.subcategory_code
            FROM subcategories_master s
            JOIN categories_master c ON s.category_id = c.category_id
            WHERE c.category_name = 'Oil' 
            AND (s.oil_type IS NULL OR s.oil_type = '')
            AND s.is_active = true
            ORDER BY s.subcategory_name
        """)
        
        for row in cur.fetchall():
            subcategory_id = row[0]
            subcategory_name = row[1]
            
            issues.append({
                'type': 'oil_product_missing_type',
                'entity': 'subcategory',
                'id': subcategory_id,
                'name': subcategory_name,
                'message': f"Oil product '{subcategory_name}' has no oil_type configured"
            })
            
            # Try to detect oil type from product name
            name_upper = subcategory_name.upper()
            suggested_oil_type = None
            confidence = 'low'
            
            # Remove common suffixes to identify base oil
            cleaned_name = name_upper.replace(' OIL', '').replace('DEEPAM ', '').strip()
            
            if 'COCONUT' in cleaned_name:
                suggested_oil_type = 'Coconut'
                confidence = 'medium'
            elif 'SESAME' in cleaned_name or 'GINGELLY' in cleaned_name:
                suggested_oil_type = 'Sesame'
                confidence = 'medium'
            elif 'GROUNDNUT' in cleaned_name:
                suggested_oil_type = 'Groundnut'
                confidence = 'medium'
            elif 'MUSTARD' in cleaned_name:
                suggested_oil_type = 'Mustard'
                confidence = 'medium'
            elif 'CASTOR' in cleaned_name:
                suggested_oil_type = 'Castor'
                confidence = 'medium'
            
            if suggested_oil_type:
                suggestions.append({
                    'entity_type': 'oil_subcategory',
                    'entity_id': subcategory_id,
                    'entity_name': subcategory_name,
                    'field': 'oil_type',
                    'current_value': None,
                    'suggested_value': suggested_oil_type,
                    'confidence': confidence,
                    'pattern_matched': suggested_oil_type,
                    'reason': f"Product name contains '{suggested_oil_type}'"
                })
        
        # Check 4: Oil subcategories without GST rate
        cur.execute("""
            SELECT s.subcategory_id, s.subcategory_name, s.oil_type
            FROM subcategories_master s
            JOIN categories_master c ON s.category_id = c.category_id
            WHERE c.category_name = 'Oil' 
            AND s.gst_rate IS NULL
            AND s.is_active = true
            ORDER BY s.subcategory_name
        """)
        
        for row in cur.fetchall():
            subcategory_id = row[0]
            subcategory_name = row[1]
            oil_type = row[2]
            
            issues.append({
                'type': 'oil_product_missing_gst',
                'entity': 'subcategory',
                'id': subcategory_id,
                'name': subcategory_name,
                'message': f"Oil product '{subcategory_name}' has no GST rate configured"
            })
            
            # Suggest GST rate based on oil type
            suggested_gst = 5.0  # Default for edible oils
            confidence = 'high'
            
            # Check if it's lamp oil (Deepam)
            if 'DEEPAM' in subcategory_name.upper():
                suggested_gst = 12.0
                confidence = 'high'
            
            suggestions.append({
                'entity_type': 'oil_subcategory',
                'entity_id': subcategory_id,
                'entity_name': subcategory_name,
                'field': 'gst_rate',
                'current_value': None,
                'suggested_value': suggested_gst,
                'confidence': confidence,
                'pattern_matched': 'standard_rate',
                'reason': f"Standard GST rate for {'lamp oil' if suggested_gst == 12 else 'edible oil'}"
            })
        
        # Group suggestions by confidence for better UX
        suggestions_by_confidence = {
            'high': [s for s in suggestions if s['confidence'] == 'high'],
            'medium': [s for s in suggestions if s['confidence'] == 'medium'],
            'low': [s for s in suggestions if s['confidence'] == 'low']
        }
        
        return jsonify({
            'success': True,
            'issues_count': len(issues),
            'suggestions_count': len(suggestions),
            'issues': issues,
            'suggestions': suggestions,
            'suggestions_by_confidence': suggestions_by_confidence,
            'summary': {
                'subcategories_without_oil_type': len([i for i in issues if i['type'] == 'missing_oil_type']),
                'materials_without_produces_oil_type': len([i for i in issues if i['type'] == 'missing_produces_oil_type']),
                'oil_products_without_type': len([i for i in issues if i['type'] == 'oil_product_missing_type']),
                'oil_products_without_gst': len([i for i in issues if i['type'] == 'oil_product_missing_gst']),
                'high_confidence_suggestions': len(suggestions_by_confidence['high']),
                'medium_confidence_suggestions': len(suggestions_by_confidence['medium']),
                'low_confidence_suggestions': len(suggestions_by_confidence['low'])
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@masters_crud_bp.route('/api/oil-config/apply-suggestions', methods=['POST'])
def apply_oil_suggestions():
    """Apply selected oil configuration suggestions with audit trail"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        suggestions_to_apply = data.get('suggestions', [])
        applied_by = data.get('applied_by', 'System')
        
        if not suggestions_to_apply:
            return jsonify({
                'success': False,
                'error': 'No suggestions provided to apply'
            }), 400
        
        applied_count = 0
        failed_count = 0
        results = []
        
        for suggestion in suggestions_to_apply:
            try:
                entity_type = suggestion.get('entity_type')
                entity_id = suggestion.get('entity_id')
                field = suggestion.get('field')
                new_value = suggestion.get('value')  # Can be suggested_value or user-modified
                
                if entity_type == 'subcategory' and field == 'oil_type':
                    # Get current value for audit
                    cur.execute("""
                        SELECT oil_type, subcategory_name 
                        FROM subcategories_master 
                        WHERE subcategory_id = %s
                    """, (entity_id,))
                    row = cur.fetchone()
                    
                    if row:
                        old_value = row[0]
                        entity_name = row[1]
                        
                        # Update subcategory oil_type
                        cur.execute("""
                            UPDATE subcategories_master 
                            SET oil_type = %s 
                            WHERE subcategory_id = %s
                        """, (new_value, entity_id))
                        
                        # Log audit
                        log_audit(
                            conn, cur, 'subcategories_master', entity_id, 'UPDATE',
                            old_values={'oil_type': old_value},
                            new_values={'oil_type': new_value},
                            changed_by=applied_by,
                            reason=f'Applied oil type suggestion for seed variety'
                        )
                        
                        applied_count += 1
                        results.append({
                            'entity': entity_name,
                            'field': field,
                            'old_value': old_value,
                            'new_value': new_value,
                            'status': 'success'
                        })
                        
                elif entity_type == 'oil_subcategory' and field == 'oil_type':
                    # Similar to above but for oil products
                    cur.execute("""
                        SELECT oil_type, subcategory_name 
                        FROM subcategories_master 
                        WHERE subcategory_id = %s
                    """, (entity_id,))
                    row = cur.fetchone()
                    
                    if row:
                        old_value = row[0]
                        entity_name = row[1]
                        
                        cur.execute("""
                            UPDATE subcategories_master 
                            SET oil_type = %s 
                            WHERE subcategory_id = %s
                        """, (new_value, entity_id))
                        
                        log_audit(
                            conn, cur, 'subcategories_master', entity_id, 'UPDATE',
                            old_values={'oil_type': old_value},
                            new_values={'oil_type': new_value},
                            changed_by=applied_by,
                            reason=f'Applied oil type suggestion for oil product'
                        )
                        
                        applied_count += 1
                        results.append({
                            'entity': entity_name,
                            'field': field,
                            'old_value': old_value,
                            'new_value': new_value,
                            'status': 'success'
                        })
                        
                elif entity_type == 'oil_subcategory' and field == 'gst_rate':
                    # Handle GST rate updates
                    cur.execute("""
                        SELECT gst_rate, subcategory_name 
                        FROM subcategories_master 
                        WHERE subcategory_id = %s
                    """, (entity_id,))
                    row = cur.fetchone()
                    
                    if row:
                        old_value = row[0]
                        entity_name = row[1]
                        
                        cur.execute("""
                            UPDATE subcategories_master 
                            SET gst_rate = %s 
                            WHERE subcategory_id = %s
                        """, (new_value, entity_id))
                        
                        log_audit(
                            conn, cur, 'subcategories_master', entity_id, 'UPDATE',
                            old_values={'gst_rate': old_value},
                            new_values={'gst_rate': new_value},
                            changed_by=applied_by,
                            reason=f'Applied GST rate suggestion for oil product'
                        )
                        
                        applied_count += 1
                        results.append({
                            'entity': entity_name,
                            'field': field,
                            'old_value': old_value,
                            'new_value': new_value,
                            'status': 'success'
                        })
                        
                elif entity_type == 'material' and field == 'produces_oil_type':
                    # Get current value for audit
                    cur.execute("""
                        SELECT produces_oil_type, material_name 
                        FROM materials 
                        WHERE material_id = %s
                    """, (entity_id,))
                    row = cur.fetchone()
                    
                    if row:
                        old_value = row[0]
                        entity_name = row[1]
                        
                        # Update material produces_oil_type
                        cur.execute("""
                            UPDATE materials 
                            SET produces_oil_type = %s 
                            WHERE material_id = %s
                        """, (new_value, entity_id))
                        
                        # Log audit
                        log_audit(
                            conn, cur, 'materials', entity_id, 'UPDATE',
                            old_values={'produces_oil_type': old_value},
                            new_values={'produces_oil_type': new_value},
                            changed_by=applied_by,
                            reason=f'Applied produces_oil_type from subcategory oil_type'
                        )
                        
                        applied_count += 1
                        results.append({
                            'entity': entity_name,
                            'field': field,
                            'old_value': old_value,
                            'new_value': new_value,
                            'status': 'success'
                        })
                else:
                    failed_count += 1
                    results.append({
                        'entity': f"{entity_type}:{entity_id}",
                        'field': field,
                        'status': 'failed',
                        'error': 'Unknown entity type or field'
                    })
                    
            except Exception as e:
                failed_count += 1
                results.append({
                    'entity': suggestion.get('entity_name', 'Unknown'),
                    'status': 'failed',
                    'error': str(e)
                })
        
        # Commit if any successful updates
        if applied_count > 0:
            conn.commit()
        
        return jsonify({
            'success': True,
            'applied_count': applied_count,
            'failed_count': failed_count,
            'results': results,
            'message': f'Applied {applied_count} suggestions successfully'
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)
