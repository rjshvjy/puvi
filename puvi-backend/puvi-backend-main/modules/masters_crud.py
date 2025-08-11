"""
Generic Masters CRUD Module for PUVI Oil Manufacturing System
Handles CRUD operations for all master data tables using configuration
Provides unified API for suppliers, materials, tags, writeoff_reasons, cost_elements
File Path: puvi-backend/puvi-backend-main/modules/masters_crud.py
"""

from flask import Blueprint, request, jsonify, send_file
from decimal import Decimal
from datetime import datetime
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
            field_info = {
                'name': field_name,
                'type': field_config['type'],
                'label': field_config.get('label', field_name.replace('_', ' ').title()),
                'required': field_config.get('required', False),
                'unique': field_config.get('unique', False),
                'max_length': field_config.get('max_length'),
                'pattern': field_config.get('pattern'),
                'options': field_config.get('options'),
                'min': field_config.get('min'),
                'max': field_config.get('max'),
                'decimal_places': field_config.get('decimal_places', 2),
                'default': field_config.get('default'),
                'transform': field_config.get('transform'),
                'placeholder': field_config.get('placeholder'),
                'help_text': field_config.get('help_text')
            }
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
# LIST RECORDS (PAGINATED)
# =====================================================

@masters_crud_bp.route('/api/masters/<master_type>', methods=['GET'])
def list_master_records(master_type):
    """Get paginated list of records for a master type"""
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
        
        # Build query
        table = config['table']
        soft_delete_field = config.get('soft_delete_field', 'is_active')
        
        # Special handling for cost_elements_master
        if master_type == 'cost_elements':
            soft_delete_field = 'is_active'
        
        # Use custom list query if available
        if 'list_query' in config and not include_inactive:
            base_query = config['list_query']
            count_query = f"""
                SELECT COUNT(*) FROM ({config['list_query']}) as subquery
            """
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
        
        # Add sorting and pagination
        paginated_query = f"{base_query} ORDER BY {sort_by} {sort_order} LIMIT %s OFFSET %s"
        
        # Execute paginated query
        if search:
            cur.execute(paginated_query, search_params + [per_page, offset])
        else:
            cur.execute(paginated_query, (per_page, offset))
        
        # Format results
        columns = [desc[0] for desc in cur.description]
        records = []
        for row in cur.fetchall():
            record = dict(zip(columns, row))
            records.append(format_response_data(record))
        
        return jsonify({
            'success': True,
            'records': records,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total_count': total_count,
                'total_pages': total_pages,
                'has_next': page < total_pages,
                'has_prev': page > 1
            },
            'master_type': master_type,
            'display_name': config.get('display_name', master_type.title())
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
            query = f"SELECT * FROM {table} WHERE {primary_key} = %s"
            cur.execute(query, (record_id,))
        else:
            query = f"SELECT * FROM {table} WHERE {primary_key} = %s"
            cur.execute(query, (int(record_id),))
        
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
                fields.append(field_name)
                values.append(data[field_name])
                placeholders.append('%s')
        
        # Add created_by if not present
        if 'created_by' not in fields:
            fields.append('created_by')
            values.append(data.get('created_by', 'System'))
            placeholders.append('%s')
        
        # Add is_active for new records
        soft_delete_field = config.get('soft_delete_field', 'is_active')
        if master_type == 'cost_elements':
            soft_delete_field = 'is_active'
        
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
                set_clauses.append(f"{field_name} = %s")
                values.append(data[field_name])
        
        if not set_clauses:
            return jsonify({
                'success': False,
                'error': 'No valid fields to update'
            }), 400
        
        # Add updated_at
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
        
        # Force soft delete if requested or has dependencies
        force_soft = request.args.get('force_soft', 'false').lower() == 'true'
        
        if not dep_result['can_delete'] or force_soft:
            # Perform soft delete
            result = soft_delete_record(
                conn, cur, master_type, record_id,
                deleted_by=request.json.get('deleted_by') if request.json else 'System'
            )
            
            if result['success']:
                conn.commit()
                return jsonify({
                    'success': True,
                    'message': f'{config.get("display_name", master_type)} deactivated successfully',
                    'action': 'soft_delete',
                    'dependencies': dep_result['dependencies']
                })
            else:
                return jsonify(result), 400
        else:
            # Perform hard delete
            table = config['table']
            primary_key = config['primary_key']
            
            # Get record for audit before deletion
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
            
            old_values = dict(zip(columns, row))
            
            # Delete the record
            if config.get('primary_key_type') == 'varchar':
                cur.execute(f"DELETE FROM {table} WHERE {primary_key} = %s", (record_id,))
            else:
                cur.execute(f"DELETE FROM {table} WHERE {primary_key} = %s", (int(record_id),))
            
            # Log audit
            log_audit(
                conn, cur, table, record_id, 'DELETE',
                old_values=old_values,
                changed_by=request.json.get('deleted_by') if request.json else 'System',
                reason=f'Hard delete {master_type} record'
            )
            
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': f'{config.get("display_name", master_type)} deleted permanently',
                'action': 'hard_delete'
            })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# =====================================================
# RESTORE SOFT-DELETED RECORD
# =====================================================

@masters_crud_bp.route('/api/masters/<master_type>/<record_id>/restore', methods=['POST'])
def restore_deleted_record(master_type, record_id):
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
        
        result = restore_record(
            conn, cur, master_type, record_id,
            restored_by=request.json.get('restored_by') if request.json else 'System'
        )
        
        if result['success']:
            conn.commit()
            return jsonify({
                'success': True,
                'message': f'{config.get("display_name", master_type)} restored successfully'
            })
        else:
            return jsonify(result), 400
        
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
    """Check dependencies for a record"""
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
            'master_type': master_type,
            'record_id': record_id,
            'can_delete': dep_result['can_delete'],
            'can_soft_delete': dep_result['can_soft_delete'],
            'dependencies': dep_result['dependencies'],
            'total_dependent_records': dep_result['total_dependent_records'],
            'message': dep_result['message']
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# =====================================================
# EXPORT TO CSV
# =====================================================

@masters_crud_bp.route('/api/masters/<master_type>/export', methods=['GET'])
def export_master_data(master_type):
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
        
        # Get export query
        include_inactive = request.args.get('include_inactive', 'false').lower() == 'true'
        query = get_export_query(master_type, include_inactive)
        
        if not query:
            return jsonify({
                'success': False,
                'error': 'Export not supported for this master type'
            }), 400
        
        cur.execute(query)
        
        # Get column names
        columns = [desc[0] for desc in cur.description]
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(columns)
        
        # Write data
        for row in cur.fetchall():
            formatted_row = []
            for i, value in enumerate(row):
                if isinstance(value, Decimal):
                    formatted_row.append(float(value))
                elif isinstance(value, datetime):
                    formatted_row.append(value.strftime('%Y-%m-%d %H:%M:%S'))
                elif isinstance(value, bool):
                    formatted_row.append('Yes' if value else 'No')
                elif value is None:
                    formatted_row.append('')
                else:
                    formatted_row.append(str(value))
            writer.writerow(formatted_row)
        
        # Prepare response
        output.seek(0)
        
        return send_file(
            io.BytesIO(output.getvalue().encode('utf-8')),
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'{master_type}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        )
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# =====================================================
# IMPORT FROM CSV
# =====================================================

@masters_crud_bp.route('/api/masters/<master_type>/import', methods=['POST'])
def import_master_data(master_type):
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
        
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file uploaded'
            }), 400
        
        file = request.files['file']
        
        # Read CSV file
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        csv_reader = csv.DictReader(stream)
        
        cur.execute("BEGIN")
        
        imported_count = 0
        updated_count = 0
        error_rows = []
        
        for row_num, row in enumerate(csv_reader, start=2):
            try:
                # Transform field values
                for field_name, field_config in config['fields'].items():
                    if field_name in row:
                        row[field_name] = transform_field_value(field_config, row[field_name])
                
                # Validate row data
                is_valid, errors = validate_master_data(master_type, row)
                if not is_valid:
                    error_rows.append({
                        'row': row_num,
                        'errors': errors
                    })
                    continue
                
                # Check if record exists (for update vs insert)
                primary_key = config['primary_key']
                if primary_key in row and row[primary_key]:
                    # Update existing record
                    set_clauses = []
                    values = []
                    
                    for field_name in row:
                        if field_name in config['fields'] and field_name != primary_key:
                            set_clauses.append(f"{field_name} = %s")
                            values.append(row[field_name])
                    
                    if set_clauses:
                        values.append(row[primary_key])
                        query = f"""
                            UPDATE {config['table']}
                            SET {', '.join(set_clauses)}, updated_at = CURRENT_TIMESTAMP
                            WHERE {primary_key} = %s
                        """
                        cur.execute(query, values)
                        if cur.rowcount > 0:
                            updated_count += 1
                else:
                    # Insert new record
                    fields = []
                    values = []
                    placeholders = []
                    
                    for field_name in row:
                        if field_name in config['fields']:
                            fields.append(field_name)
                            values.append(row[field_name])
                            placeholders.append('%s')
                    
                    if fields:
                        query = f"""
                            INSERT INTO {config['table']} ({', '.join(fields)})
                            VALUES ({', '.join(placeholders)})
                        """
                        cur.execute(query, values)
                        imported_count += 1
                
            except Exception as row_error:
                error_rows.append({
                    'row': row_num,
                    'error': str(row_error)
                })
        
        # Commit if any successful imports/updates
        if imported_count > 0 or updated_count > 0:
            conn.commit()
        else:
            conn.rollback()
        
        return jsonify({
            'success': True,
            'summary': {
                'imported': imported_count,
                'updated': updated_count,
                'errors': len(error_rows),
                'total_processed': imported_count + updated_count + len(error_rows)
            },
            'error_rows': error_rows[:10] if error_rows else []  # Limit error details
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)
