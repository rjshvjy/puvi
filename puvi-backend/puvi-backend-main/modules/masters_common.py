"""
Masters Common Module for PUVI Oil Manufacturing System
Shared utilities and configurations for all master data management
Provides base classes, validation, audit logging, and dependency checking
File Path: puvi-backend/puvi-backend-main/modules/masters_common.py
"""

import json
import re
from decimal import Decimal
from datetime import datetime
from flask import jsonify
from db_utils import get_db_connection, close_connection
from utils.validation import safe_decimal, safe_float, safe_int
from utils.date_utils import get_current_day_number

# =====================================================
# MASTER CONFIGURATIONS
# =====================================================

MASTERS_CONFIG = {
    'suppliers': {
        'table': 'suppliers',
        'primary_key': 'supplier_id',
        'display_name': 'Suppliers',
        'name_field': 'supplier_name',
        'fields': {
            'supplier_name': {
                'type': 'text',
                'required': True,
                'unique': True,
                'max_length': 255,
                'label': 'Supplier Name'
            },
            'contact_person': {
                'type': 'text',
                'required': False,
                'max_length': 255,
                'label': 'Contact Person'
            },
            'phone': {
                'type': 'text',
                'required': False,
                'max_length': 50,
                'pattern': r'^[0-9\-\+\(\)\s]*$',
                'label': 'Phone Number'
            },
            'email': {
                'type': 'email',
                'required': False,
                'max_length': 255,
                'label': 'Email Address'
            },
            'address': {
                'type': 'textarea',
                'required': False,
                'label': 'Address'
            },
            'gst_number': {
                'type': 'text',
                'required': False,
                'max_length': 50,
                'pattern': r'^[0-9A-Z]{15}$',
                'label': 'GST Number'
            },
            'short_code': {
                'type': 'text',
                'required': True,
                'unique': True,
                'max_length': 3,
                'pattern': r'^[A-Z]{3}$',
                'label': 'Short Code (3 letters)',
                'transform': 'uppercase'
            }
        },
        'list_query': """
            SELECT 
                s.*,
                COUNT(DISTINCT m.material_id) FILTER (WHERE m.is_active = true) as material_count
            FROM suppliers s
            LEFT JOIN materials m ON s.supplier_id = m.supplier_id
            WHERE s.is_active = true
            GROUP BY s.supplier_id
        """,
        'dependencies': {
            'materials': {
                'table': 'materials',
                'foreign_key': 'supplier_id',
                'display_field': 'material_name',
                'message': 'Supplier has {count} associated materials'
            },
            'purchases': {
                'table': 'purchases',
                'foreign_key': 'supplier_id',
                'display_field': 'invoice_ref',
                'message': 'Supplier has {count} purchase transactions'
            }
        }
    },
    
    'materials': {
        'table': 'materials',
        'primary_key': 'material_id',
        'display_name': 'Materials',
        'name_field': 'material_name',
        'fields': {
            'material_name': {
                'type': 'text',
                'required': True,
                'max_length': 255,
                'label': 'Material Name'
            },
            'category': {
                'type': 'select',
                'required': True,
                'options': ['Seeds', 'Oil', 'Chemical', 'Packing'],
                'label': 'Category'
            },
            'unit': {
                'type': 'select',
                'required': True,
                'options': ['Kg', 'L', 'Nos', 'MT'],
                'label': 'Unit of Measure'
            },
            'current_cost': {
                'type': 'decimal',
                'required': True,
                'min': 0,
                'decimal_places': 2,
                'label': 'Current Cost'
            },
            'gst_rate': {
                'type': 'decimal',
                'required': True,
                'min': 0,
                'max': 100,
                'decimal_places': 2,
                'default': 5.00,
                'label': 'GST Rate (%)'
            },
            'supplier_id': {
                'type': 'reference',
                'required': True,
                'reference_table': 'suppliers',
                'reference_field': 'supplier_id',
                'display_field': 'supplier_name',
                'label': 'Supplier'
            },
            'short_code': {
                'type': 'text',
                'required': True,
                'unique': True,
                'max_length': 6,
                'pattern': r'^[A-Z0-9]{1,6}$',
                'label': 'Short Code (6 chars)',
                'transform': 'uppercase'
            }
        },
        'list_query': """
            SELECT 
                m.*,
                s.supplier_name,
                i.closing_stock,
                i.weighted_avg_cost
            FROM materials m
            LEFT JOIN suppliers s ON m.supplier_id = s.supplier_id
            LEFT JOIN inventory i ON m.material_id = i.material_id
            WHERE m.is_active = true
        """,
        'dependencies': {
            'inventory': {
                'table': 'inventory',
                'foreign_key': 'material_id',
                'check_field': 'closing_stock',
                'message': 'Material has inventory balance of {value}'
            },
            'purchase_items': {
                'table': 'purchase_items',
                'foreign_key': 'material_id',
                'message': 'Material has {count} purchase transactions'
            },
            'batch': {
                'table': 'batch',
                'foreign_key': 'material_id',
                'message': 'Material used in {count} batch productions'
            },
            'material_writeoffs': {
                'table': 'material_writeoffs',
                'foreign_key': 'material_id',
                'message': 'Material has {count} writeoff records'
            },
            'sku_bom_details': {
                'table': 'sku_bom_details',
                'foreign_key': 'material_id',
                'message': 'Material used in {count} SKU BOMs'
            }
        }
    },
    
    'tags': {
        'table': 'tags',
        'primary_key': 'tag_id',
        'display_name': 'Tags',
        'name_field': 'tag_name',
        'fields': {
            'tag_name': {
                'type': 'text',
                'required': True,
                'unique': True,
                'max_length': 100,
                'label': 'Tag Name'
            },
            'tag_category': {
                'type': 'text',
                'required': False,
                'max_length': 50,
                'label': 'Tag Category'
            },
            'description': {
                'type': 'textarea',
                'required': False,
                'label': 'Description'
            }
        },
        'list_query': """
            SELECT 
                t.*,
                COUNT(DISTINCT mt.material_id) as material_count
            FROM tags t
            LEFT JOIN material_tags mt ON t.tag_id = mt.tag_id
            WHERE t.is_active = true
            GROUP BY t.tag_id
        """,
        'dependencies': {
            'material_tags': {
                'table': 'material_tags',
                'foreign_key': 'tag_id',
                'message': 'Tag is assigned to {count} materials'
            }
        }
    },
    
    'writeoff_reasons': {
        'table': 'writeoff_reasons',
        'primary_key': 'reason_code',
        'primary_key_type': 'varchar',
        'display_name': 'Writeoff Reasons',
        'name_field': 'reason_description',
        'fields': {
            'reason_code': {
                'type': 'text',
                'required': True,
                'unique': True,
                'max_length': 20,
                'label': 'Reason Code',
                'transform': 'uppercase'
            },
            'reason_description': {
                'type': 'text',
                'required': True,
                'max_length': 255,
                'label': 'Reason Description'
            },
            'category': {
                'type': 'select',
                'required': False,
                'options': ['Damage', 'Expiry', 'Quality', 'Returns', 'Other'],
                'label': 'Category'
            }
        },
        'list_query': """
            SELECT 
                wr.*,
                COUNT(DISTINCT mw.writeoff_id) as usage_count
            FROM writeoff_reasons wr
            LEFT JOIN material_writeoffs mw ON wr.reason_code = mw.reason_code
            WHERE wr.is_active = true
            GROUP BY wr.reason_code
        """,
        'dependencies': {
            'material_writeoffs': {
                'table': 'material_writeoffs',
                'foreign_key': 'reason_code',
                'message': 'Reason used in {count} writeoff records'
            }
        }
    },
    
    'cost_elements': {
        'table': 'cost_elements_master',
        'primary_key': 'element_id',
        'display_name': 'Cost Elements',
        'name_field': 'element_name',
        'soft_delete_field': 'is_active',
        'fields': {
            'element_name': {
                'type': 'text',
                'required': True,
                'max_length': 255,
                'label': 'Element Name'
            },
            'category': {
                'type': 'select',
                'required': True,
                'options': ['Fixed', 'Variable', 'Semi-Variable'],
                'label': 'Category'
            },
            'unit_type': {
                'type': 'select',
                'required': True,
                'options': ['Per Unit', 'Percentage', 'Fixed Amount'],
                'label': 'Unit Type'
            },
            'default_rate': {
                'type': 'decimal',
                'required': False,
                'min': 0,
                'decimal_places': 2,
                'label': 'Default Rate'
            },
            'calculation_method': {
                'type': 'select',
                'required': True,
                'options': ['Direct', 'Formula-based', 'Allocation'],
                'label': 'Calculation Method'
            },
            'is_optional': {
                'type': 'boolean',
                'required': False,
                'default': False,
                'label': 'Is Optional'
            },
            'applicable_to': {
                'type': 'select',
                'required': True,
                'options': ['Purchase', 'Production', 'Both'],
                'label': 'Applicable To'
            },
            'display_order': {
                'type': 'integer',
                'required': False,
                'min': 0,
                'max': 999,
                'default': 0,
                'label': 'Display Order'
            }
        },
        'list_query': """
            SELECT 
                c.*,
                COUNT(DISTINCT bec.batch_id) as usage_count
            FROM cost_elements_master c
            LEFT JOIN batch_extended_costs bec ON c.element_id = bec.element_id
            WHERE c.is_active = true
            GROUP BY c.element_id
        """,
        'dependencies': {
            'batch_extended_costs': {
                'table': 'batch_extended_costs',
                'foreign_key': 'element_id',
                'message': 'Element used in {count} batch cost records'
            },
            'cost_override_log': {
                'table': 'cost_override_log',
                'foreign_key': 'element_id',
                'message': 'Element has {count} override records'
            }
        }
    }
}

# =====================================================
# AUDIT LOGGING
# =====================================================

def log_audit(conn, cur, table_name, record_id, action, old_values=None, 
              new_values=None, changed_by=None, reason=None, session_id=None):
    """
    Log changes to audit table
    
    Args:
        conn: Database connection
        cur: Database cursor
        table_name: Name of the table being modified
        record_id: ID of the record being modified
        action: Type of action (INSERT, UPDATE, DELETE, SOFT_DELETE, RESTORE)
        old_values: Dictionary of old values (for UPDATE/DELETE)
        new_values: Dictionary of new values (for INSERT/UPDATE)
        changed_by: User making the change
        reason: Optional reason for the change
        session_id: Optional session ID for grouping related changes
    """
    try:
        # Calculate changed fields for updates
        changed_fields = None
        if action == 'UPDATE' and old_values and new_values:
            changed_fields = []
            for key in new_values:
                if key in old_values:
                    # Compare values, handling None and type differences
                    old_val = old_values.get(key)
                    new_val = new_values.get(key)
                    if str(old_val) != str(new_val):
                        changed_fields.append(key)
        
        # Convert dictionaries to JSON
        old_json = json.dumps(old_values) if old_values else None
        new_json = json.dumps(new_values) if new_values else None
        
        # Insert audit log
        cur.execute("""
            INSERT INTO masters_audit_log (
                table_name, record_id, action, old_values, new_values,
                changed_fields, changed_by, reason, session_id
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            table_name,
            record_id,
            action,
            old_json,
            new_json,
            changed_fields,
            changed_by or 'System',
            reason,
            session_id
        ))
        
    except Exception as e:
        print(f"Error logging audit: {str(e)}")
        # Don't fail the main operation if audit logging fails


# =====================================================
# DEPENDENCY CHECKING
# =====================================================

def check_dependencies(conn, cur, master_type, record_id):
    """
    Check if a record can be deleted by checking dependencies
    
    Returns:
        dict: {
            'can_delete': bool,
            'can_soft_delete': bool,
            'dependencies': list of dependency details,
            'message': string message
        }
    """
    config = MASTERS_CONFIG.get(master_type)
    if not config:
        return {
            'can_delete': False,
            'can_soft_delete': False,
            'message': f'Invalid master type: {master_type}'
        }
    
    dependencies = []
    total_dependent_records = 0
    
    # Check each dependency
    for dep_name, dep_config in config.get('dependencies', {}).items():
        table = dep_config['table']
        foreign_key = dep_config['foreign_key']
        
        # Special handling for different primary key types
        if config.get('primary_key_type') == 'varchar':
            query = f"SELECT COUNT(*) FROM {table} WHERE {foreign_key} = %s"
            cur.execute(query, (record_id,))
        else:
            query = f"SELECT COUNT(*) FROM {table} WHERE {foreign_key} = %s"
            cur.execute(query, (int(record_id),))
        
        count = cur.fetchone()[0]
        
        if count > 0:
            # Check if it's a special dependency with value (like inventory)
            if 'check_field' in dep_config:
                value_query = f"SELECT {dep_config['check_field']} FROM {table} WHERE {foreign_key} = %s"
                if config.get('primary_key_type') == 'varchar':
                    cur.execute(value_query, (record_id,))
                else:
                    cur.execute(value_query, (int(record_id),))
                
                value_row = cur.fetchone()
                if value_row and value_row[0]:
                    message = dep_config['message'].format(value=value_row[0])
                else:
                    message = dep_config['message'].format(count=count)
            else:
                message = dep_config['message'].format(count=count)
            
            dependencies.append({
                'table': table,
                'count': count,
                'message': message
            })
            
            total_dependent_records += count
    
    # Determine what actions are allowed
    can_hard_delete = total_dependent_records == 0
    can_soft_delete = True  # Always allow soft delete
    
    return {
        'can_delete': can_hard_delete,
        'can_soft_delete': can_soft_delete,
        'dependencies': dependencies,
        'total_dependent_records': total_dependent_records,
        'message': 'No dependencies' if can_hard_delete else f'Record has {total_dependent_records} dependencies'
    }


# =====================================================
# FIELD VALIDATION
# =====================================================

def validate_field(field_name, field_config, value, conn=None, cur=None, 
                   table_name=None, record_id=None):
    """
    Validate a field value based on its configuration
    
    Returns:
        tuple: (is_valid, error_message)
    """
    field_type = field_config.get('type')
    
    # Required field check
    if field_config.get('required', False):
        if value is None or value == '' or (isinstance(value, str) and not value.strip()):
            return False, f"{field_config.get('label', field_name)} is required"
    
    # Skip validation if value is empty and not required
    if value is None or value == '':
        return True, None
    
    # Type-specific validation
    if field_type == 'text':
        if not isinstance(value, str):
            value = str(value)
        
        # Max length check
        max_length = field_config.get('max_length')
        if max_length and len(value) > max_length:
            return False, f"{field_config.get('label', field_name)} must not exceed {max_length} characters"
        
        # Pattern check
        pattern = field_config.get('pattern')
        if pattern and not re.match(pattern, value):
            return False, f"{field_config.get('label', field_name)} format is invalid"
    
    elif field_type == 'email':
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, value):
            return False, "Invalid email address"
    
    elif field_type == 'decimal':
        try:
            decimal_value = Decimal(str(value))
            min_val = field_config.get('min')
            max_val = field_config.get('max')
            
            if min_val is not None and decimal_value < Decimal(str(min_val)):
                return False, f"{field_config.get('label', field_name)} must be at least {min_val}"
            
            if max_val is not None and decimal_value > Decimal(str(max_val)):
                return False, f"{field_config.get('label', field_name)} must not exceed {max_val}"
        except:
            return False, f"{field_config.get('label', field_name)} must be a valid number"
    
    elif field_type == 'integer':
        try:
            int_value = int(value)
            min_val = field_config.get('min')
            max_val = field_config.get('max')
            
            if min_val is not None and int_value < min_val:
                return False, f"{field_config.get('label', field_name)} must be at least {min_val}"
            
            if max_val is not None and int_value > max_val:
                return False, f"{field_config.get('label', field_name)} must not exceed {max_val}"
        except:
            return False, f"{field_config.get('label', field_name)} must be a valid integer"
    
    elif field_type == 'select':
        options = field_config.get('options', [])
        if value not in options:
            return False, f"{field_config.get('label', field_name)} must be one of: {', '.join(options)}"
    
    elif field_type == 'boolean':
        if not isinstance(value, bool):
            return False, f"{field_config.get('label', field_name)} must be true or false"
    
    # Check unique constraint if needed
    if field_config.get('unique') and conn and cur and table_name:
        if record_id:
            # Update - exclude current record
            cur.execute(f"""
                SELECT COUNT(*) FROM {table_name} 
                WHERE {field_name} = %s AND id != %s
            """, (value, record_id))
        else:
            # Insert - check all records
            cur.execute(f"""
                SELECT COUNT(*) FROM {table_name} 
                WHERE {field_name} = %s
            """, (value,))
        
        if cur.fetchone()[0] > 0:
            return False, f"{field_config.get('label', field_name)} already exists"
    
    return True, None


# =====================================================
# DATA TRANSFORMATION
# =====================================================

def transform_field_value(field_config, value):
    """
    Transform field value based on configuration
    
    Args:
        field_config: Field configuration dict
        value: Field value to transform
    
    Returns:
        Transformed value
    """
    if value is None or value == '':
        return value
    
    transform = field_config.get('transform')
    
    if transform == 'uppercase':
        return str(value).upper()
    elif transform == 'lowercase':
        return str(value).lower()
    elif transform == 'capitalize':
        return str(value).capitalize()
    
    return value


# =====================================================
# MASTER DATA VALIDATION
# =====================================================

def validate_master_data(master_type, data, record_id=None):
    """
    Validate all fields in master data
    
    Args:
        master_type: Type of master
        data: Dictionary of field values
        record_id: ID if updating existing record
    
    Returns:
        tuple: (is_valid, errors)
    """
    config = MASTERS_CONFIG.get(master_type)
    if not config:
        return False, {'error': f'Invalid master type: {master_type}'}
    
    errors = {}
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Validate each field
        for field_name, field_config in config['fields'].items():
            value = data.get(field_name)
            
            # Transform value if needed
            value = transform_field_value(field_config, value)
            data[field_name] = value  # Update data with transformed value
            
            # Validate
            is_valid, error_msg = validate_field(
                field_name, field_config, value,
                conn, cur, config['table'], record_id
            )
            
            if not is_valid:
                errors[field_name] = error_msg
        
        return len(errors) == 0, errors
        
    except Exception as e:
        return False, {'error': str(e)}
    finally:
        close_connection(conn, cur)


# =====================================================
# SOFT DELETE HANDLING
# =====================================================

def soft_delete_record(conn, cur, master_type, record_id, deleted_by=None):
    """
    Soft delete a record by setting is_active = false
    
    Returns:
        dict: Result with success status and message
    """
    config = MASTERS_CONFIG.get(master_type)
    if not config:
        return {'success': False, 'error': 'Invalid master type'}
    
    table = config['table']
    primary_key = config['primary_key']
    
    # Get current record for audit
    if config.get('primary_key_type') == 'varchar':
        cur.execute(f"SELECT * FROM {table} WHERE {primary_key} = %s", (record_id,))
    else:
        cur.execute(f"SELECT * FROM {table} WHERE {primary_key} = %s", (int(record_id),))
    
    columns = [desc[0] for desc in cur.description]
    row = cur.fetchone()
    
    if not row:
        return {'success': False, 'error': 'Record not found'}
    
    old_values = dict(zip(columns, row))
    
    # Perform soft delete
    soft_delete_field = config.get('soft_delete_field', 'is_active')
    
    # Special handling for cost_elements_master (uses 'is_active' instead of 'is_active')
    if master_type == 'cost_elements' and soft_delete_field == 'is_active':
        soft_delete_field = 'is_active'  # We renamed it in DB setup
    
    cur.execute(f"""
        UPDATE {table}
        SET {soft_delete_field} = false,
            updated_at = CURRENT_TIMESTAMP
        WHERE {primary_key} = %s
    """, (record_id,))
    
    # Log audit
    log_audit(
        conn, cur, table, record_id, 'SOFT_DELETE',
        old_values=old_values,
        changed_by=deleted_by,
        reason='Soft delete via masters management'
    )
    
    return {
        'success': True,
        'message': f'Record soft deleted successfully'
    }


def restore_record(conn, cur, master_type, record_id, restored_by=None):
    """
    Restore a soft-deleted record
    
    Returns:
        dict: Result with success status and message
    """
    config = MASTERS_CONFIG.get(master_type)
    if not config:
        return {'success': False, 'error': 'Invalid master type'}
    
    table = config['table']
    primary_key = config['primary_key']
    soft_delete_field = config.get('soft_delete_field', 'is_active')
    
    # Special handling for cost_elements_master
    if master_type == 'cost_elements' and soft_delete_field == 'is_active':
        soft_delete_field = 'is_active'
    
    # Restore the record
    cur.execute(f"""
        UPDATE {table}
        SET {soft_delete_field} = true,
            updated_at = CURRENT_TIMESTAMP
        WHERE {primary_key} = %s
    """, (record_id,))
    
    if cur.rowcount == 0:
        return {'success': False, 'error': 'Record not found'}
    
    # Log audit
    log_audit(
        conn, cur, table, record_id, 'RESTORE',
        changed_by=restored_by,
        reason='Record restored via masters management'
    )
    
    return {
        'success': True,
        'message': 'Record restored successfully'
    }


# =====================================================
# RECORD RETRIEVAL
# =====================================================

def get_record_by_id(conn, cur, master_type, record_id):
    """
    Get a single record by ID
    
    Returns:
        dict: Record data or None if not found
    """
    config = MASTERS_CONFIG.get(master_type)
    if not config:
        return None
    
    table = config['table']
    primary_key = config['primary_key']
    
    # Handle different primary key types
    if config.get('primary_key_type') == 'varchar':
        cur.execute(f"SELECT * FROM {table} WHERE {primary_key} = %s", (record_id,))
    else:
        cur.execute(f"SELECT * FROM {table} WHERE {primary_key} = %s", (int(record_id),))
    
    columns = [desc[0] for desc in cur.description]
    row = cur.fetchone()
    
    if row:
        return dict(zip(columns, row))
    
    return None


# =====================================================
# EXPORT UTILITIES
# =====================================================

def get_export_query(master_type, include_inactive=False):
    """
    Get SQL query for exporting master data
    
    Args:
        master_type: Type of master
        include_inactive: Whether to include soft-deleted records
    
    Returns:
        str: SQL query for export
    """
    config = MASTERS_CONFIG.get(master_type)
    if not config:
        return None
    
    # Use custom list query if available
    if 'list_query' in config and not include_inactive:
        return config['list_query']
    
    # Build default query
    table = config['table']
    soft_delete_field = config.get('soft_delete_field', 'is_active')
    
    if master_type == 'cost_elements':
        soft_delete_field = 'is_active'
    
    query = f"SELECT * FROM {table}"
    
    if not include_inactive:
        query += f" WHERE {soft_delete_field} = true"
    
    # Note: ORDER BY will be added by masters_crud.py dynamically
    
    return query


# =====================================================
# HELPER FUNCTIONS
# =====================================================

def get_master_types():
    """Get list of all available master types"""
    return list(MASTERS_CONFIG.keys())


def get_master_config(master_type):
    """Get configuration for a specific master type"""
    return MASTERS_CONFIG.get(master_type)


def format_response_data(row_data):
    """Format database row data for JSON response"""
    formatted = {}
    for key, value in row_data.items():
        if isinstance(value, Decimal):
            formatted[key] = float(value)
        elif isinstance(value, datetime):
            formatted[key] = value.isoformat()
        elif value is None:
            formatted[key] = None
        else:
            formatted[key] = value
    return formatted
