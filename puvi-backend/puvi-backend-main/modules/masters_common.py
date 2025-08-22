"""
Common utilities and configurations for Masters CRUD operations
File Path: puvi-backend/puvi-backend-main/modules/masters_common.py
Updated: Added UOM master configuration with system UOM protection
"""

import re
import json
from decimal import Decimal
from datetime import datetime
from db_utils import get_db_connection, close_connection

# =====================================================
# JSON SERIALIZATION HANDLER - FIXES DECIMAL BUG
# =====================================================

def decimal_handler(obj):
    """Custom JSON handler for Decimal and other non-serializable types"""
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, bytes):
        return obj.decode('utf-8', errors='ignore')
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")

# =====================================================
# SELF-HEALING STANDARDIZATION FUNCTION
# =====================================================

def standardize_select_value(field_config, value):
    """
    Standardize select field values based on defined options in config
    Uses the first matching option (case-insensitive) as the standard
    Also handles legacy values that are no longer valid
    
    Args:
        field_config: Field configuration dict containing options
        value: The value to standardize
    
    Returns:
        Standardized value (first matching option) or mapped legacy value
    """
    if not value or not isinstance(value, str):
        return value
    
    # Legacy value mappings for removed options
    legacy_mappings = {
        # Old per_bag values map to per_kg (since no bag conversion exists)
        'per_bag': 'per_kg',
        'Per Bag': 'per_kg',
        'PER_BAG': 'per_kg',
        
        # Old percentage values map to fixed
        'percentage': 'fixed',
        'Percentage': 'fixed',
        'PERCENTAGE': 'fixed',
        
        # Old per_unit values map to per_kg
        'per_unit': 'per_kg',
        'Per Unit': 'per_kg',
        'PER_UNIT': 'per_kg',
        
        # Formula-based maps to fixed
        'Formula-based': 'fixed',
        'formula': 'fixed',
        'Formula': 'fixed',
        
        # Direct maps to actual
        'Direct': 'actual',
        'direct': 'actual',
        'DIRECT': 'actual',
        
        # Allocation maps to fixed
        'Allocation': 'fixed',
        'allocation': 'fixed',
        
        # Fixed Amount maps to fixed
        'Fixed Amount': 'fixed',
        'FIXED AMOUNT': 'fixed'
    }
    
    # Check if it's a legacy value that needs mapping
    if value in legacy_mappings:
        print(f"Self-healing: Legacy value '{value}' -> '{legacy_mappings[value]}'")
        return legacy_mappings[value]
    
    options = field_config.get('options', [])
    if not options or options == 'dynamic':
        # Dynamic options loaded from database, no standardization needed
        return value
    
    value_lower = value.lower()
    
    # Find the first option that matches case-insensitively
    for option in options:
        if isinstance(option, str) and option.lower() == value_lower:
            # Return the option as defined in config (this is the standard)
            if value != option:
                print(f"Self-healing: Standardizing '{value}' -> '{option}'")
            return option
    
    # If no match found and not in legacy mappings, return original value
    # This shouldn't happen with proper validation
    print(f"Warning: Unknown value '{value}' not in options or legacy mappings")
    return value

# =====================================================
# MASTERS CONFIGURATION
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
                'max_length': 100,
                'label': 'Contact Person'
            },
            'phone': {
                'type': 'text',
                'required': True,
                'max_length': 20,
                'pattern': r'^[0-9+\-\s()]+$',
                'label': 'Phone Number'
            },
            'email': {
                'type': 'email',
                'required': False,
                'max_length': 100,
                'label': 'Email Address'
            },
            'address': {
                'type': 'textarea',
                'required': False,
                'max_length': 500,
                'label': 'Address'
            },
            'gst_number': {
                'type': 'text',
                'required': False,
                'unique': True,
                'max_length': 15,
                'pattern': r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$',
                'label': 'GST Number',
                'placeholder': '22AAAAA0000A1Z5'
            },
            'notes': {
                'type': 'textarea',
                'required': False,
                'max_length': 500,
                'label': 'Notes'
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
                # DYNAMIC: Options loaded from database via API
                'options': 'dynamic',  # Signal to frontend to fetch from /api/materials/categories
                'options_source': 'api',
                'options_endpoint': '/api/materials/categories',
                'label': 'Category'
            },
            'unit': {
                'type': 'select',
                'required': True,
                # DYNAMIC: Options loaded from database via API
                'options': 'dynamic',
                'options_source': 'api',
                'options_endpoint': '/api/materials/units',
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
            # NEW: Added density field for materials
            'density': {
                'type': 'decimal',
                'required': False,
                'min': 0,
                'max': 2,
                'decimal_places': 2,
                'default': 0.91,
                'label': 'Density (g/ml)'
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
                'pattern': r'^[A-Z]{1,3}-[A-Z]{1,2}$',
                'label': 'Short Code (e.g., GNS-K)',
                'transform': 'uppercase',
                'placeholder': 'XXX-Y'
            },
            # FIXED: Added produces_oil_type field for seed materials
            'produces_oil_type': {
                'type': 'text',
                'required': False,
                'max_length': 50,
                'label': 'Produces Oil Type',
                'help_text': 'For seed materials: Type of oil this seed produces (e.g., Groundnut, Sesame, Coconut)',
                'placeholder': 'e.g., Groundnut'
            }
        },
        'list_query': """
            SELECT 
                m.*,
                s.supplier_name,
                COUNT(DISTINCT p.purchase_id) as purchase_count
            FROM materials m
            LEFT JOIN suppliers s ON m.supplier_id = s.supplier_id
            LEFT JOIN purchase_items p ON m.material_id = p.material_id
            WHERE m.is_active = true
            GROUP BY m.material_id, s.supplier_name
        """,
        'dependencies': {
            'purchase_items': {
                'table': 'purchase_items',
                'foreign_key': 'material_id',
                'message': 'Material used in {count} purchase items'
            },
            'inventory': {
                'table': 'inventory',
                'foreign_key': 'material_id',
                'message': 'Material has inventory records'
            },
            'material_writeoffs': {
                'table': 'material_writeoffs',
                'foreign_key': 'material_id',
                'message': 'Material has {count} writeoff records'
            }
        }
    },
    
    # NEW: Added UOM Master configuration
    'uom': {
        'table': 'uom_master',
        'primary_key': 'uom_id',
        'display_name': 'Unit of Measure',
        'name_field': 'uom_name',
        'soft_delete_field': 'is_active',
        'fields': {
            'uom_code': {
                'type': 'text',
                'required': True,
                'unique': True,
                'max_length': 10,
                'pattern': r'^[A-Za-z]+$',
                'label': 'UOM Code',
                'help_text': 'Short code for the unit (e.g., kg, Nos, Litres)'
            },
            'uom_name': {
                'type': 'text',
                'required': True,
                'max_length': 50,
                'label': 'UOM Name',
                'help_text': 'Full name of the unit (e.g., Kilograms, Numbers, Litres)'
            },
            'uom_symbol': {
                'type': 'text',
                'required': True,
                'max_length': 10,
                'label': 'Symbol',
                'help_text': 'Display symbol for the unit'
            },
            'uom_category': {
                'type': 'select',
                'required': True,
                'options': ['Weight', 'Volume', 'Count', 'Other'],
                'label': 'Category',
                'help_text': 'Type of measurement this unit represents'
            },
            'display_order': {
                'type': 'integer',
                'required': False,
                'default': 999,
                'min': 1,
                'max': 9999,
                'label': 'Display Order',
                'help_text': 'Order in which this unit appears in dropdowns'
            },
            'is_system': {
                'type': 'boolean',
                'required': False,
                'default': False,
                'readonly': True,
                'label': 'System UOM',
                'help_text': 'System UOMs cannot be modified or deleted'
            }
        },
        'list_query': """
            SELECT 
                u.*,
                COUNT(DISTINCT m.material_id) as material_count,
                CASE 
                    WHEN u.uom_category = 'Weight' THEN 'Weight'
                    WHEN u.uom_category = 'Volume' THEN 'Litres'
                    WHEN u.uom_category = 'Count' THEN 'Numbers'
                    ELSE u.uom_category
                END as transport_group
            FROM uom_master u
            LEFT JOIN materials m ON u.uom_code = m.unit
            WHERE u.is_active = true
            GROUP BY u.uom_id
            ORDER BY u.display_order, u.uom_code
        """,
        'dependencies': {
            'materials': {
                'table': 'materials',
                'foreign_key': 'unit',
                'foreign_key_type': 'varchar',
                'reference_field': 'uom_code',
                'display_field': 'material_name',
                'message': 'UOM is used by {count} materials'
            }
        },
        'special_validations': {
            'system_protection': {
                'field': 'is_system',
                'message': 'System UOMs cannot be modified or deleted',
                'allow_soft_delete': False,
                'allow_edit': ['display_order'],  # Only allow editing display order for system UOMs
                'readonly_fields': ['uom_code', 'uom_name', 'uom_symbol', 'uom_category', 'is_system']
            }
        }
    },
    
    # NEW: Added Categories master configuration
    'categories': {
        'table': 'categories_master',
        'primary_key': 'category_id',
        'display_name': 'Categories',
        'name_field': 'category_name',
        'fields': {
            'category_name': {
                'type': 'text',
                'required': True,
                'unique': True,
                'max_length': 50,
                'label': 'Category Name'
            },
            'requires_subcategory': {
                'type': 'boolean',
                'required': False,
                'default': False,
                'label': 'Requires Subcategory'
            },
            'is_active': {
                'type': 'boolean',
                'required': False,
                'default': True,
                'label': 'Active Status'
            }
        },
        'list_query': """
            SELECT 
                c.*,
                COUNT(DISTINCT s.subcategory_id) FILTER (WHERE s.is_active = true) as subcategory_count
            FROM categories_master c
            LEFT JOIN subcategories_master s ON c.category_id = s.category_id
            WHERE c.is_active = true
            GROUP BY c.category_id
            ORDER BY c.category_name
        """,
        'dependencies': {
            'subcategories_master': {
                'table': 'subcategories_master',
                'foreign_key': 'category_id',
                'display_field': 'subcategory_name',
                'message': 'Category has {count} associated subcategories'
            },
            'materials': {
                'table': 'materials',
                'foreign_key': 'category',
                'display_field': 'material_name',
                'message': 'Category has {count} associated materials'
            }
        }
    },
    
    # NEW: Added Subcategories master configuration
    'subcategories': {
        'table': 'subcategories_master',
        'primary_key': 'subcategory_id',
        'display_name': 'Subcategories',
        'name_field': 'subcategory_name',
        'fields': {
            'subcategory_name': {
                'type': 'text',
                'required': True,
                'max_length': 100,
                'label': 'Subcategory Name'
            },
            'subcategory_code': {
                'type': 'text',
                'required': True,
                'unique': True,
                'max_length': 20,
                'pattern': r'^[A-Z0-9\-]+$',
                'label': 'Subcategory Code',
                'transform': 'uppercase'
            },
            'category_id': {
                'type': 'reference',
                'required': True,
                'reference_table': 'categories_master',
                'reference_field': 'category_id',
                'display_field': 'category_name',
                'label': 'Category'
            },
            'oil_type': {
                'type': 'text',
                'required': False,
                'max_length': 50,
                'label': 'Oil Type',
                'help_text': 'Type of oil produced (e.g., Groundnut, Sesame, Deepam Oil)'
            },
            'is_active': {
                'type': 'boolean',
                'required': False,
                'default': True,
                'label': 'Active Status'
            }
        },
        'list_query': """
            SELECT 
                s.subcategory_id,
                s.subcategory_name,
                s.subcategory_code,
                s.category_id,
                c.category_name,
                s.oil_type,
                s.is_active,
                s.created_at,
                COUNT(DISTINCT m.material_id) FILTER (WHERE m.is_active = true) as material_count
            FROM subcategories_master s
            LEFT JOIN categories_master c ON s.category_id = c.category_id
            LEFT JOIN materials m ON s.subcategory_id = m.subcategory_id
            WHERE s.is_active = true
            GROUP BY s.subcategory_id, s.subcategory_name, s.subcategory_code, 
                     s.category_id, c.category_name, s.oil_type, s.is_active, s.created_at
            ORDER BY c.category_name, s.subcategory_name
        """,
        'dependencies': {
            'materials': {
                'table': 'materials',
                'foreign_key': 'subcategory_id',
                'display_field': 'material_name',
                'message': 'Subcategory has {count} associated materials'
            }
        }
    },
    
    # NEW: Added BOM Category Mapping master
    'bom_category_mapping': {
        'table': 'bom_category_mapping',
        'primary_key': 'mapping_id',
        'display_name': 'BOM Categories',
        'name_field': 'bom_category',
        'fields': {
            'bom_category': {
                'type': 'text',
                'required': True,
                'unique': True,
                'max_length': 50,
                'label': 'BOM Category Name'
            },
            'material_categories': {
                'type': 'text',
                'required': False,
                'max_length': 500,
                'label': 'Material Categories (comma-separated)',
                'placeholder': 'Packaging, Bottles'
            },
            'keywords': {
                'type': 'text',
                'required': False,
                'max_length': 500,
                'label': 'Keywords (comma-separated)',
                'placeholder': 'bottle, jar, pet'
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
                bcm.*,
                array_length(material_categories, 1) as category_count,
                array_length(keywords, 1) as keyword_count
            FROM bom_category_mapping bcm
            WHERE bcm.is_active = true
            ORDER BY display_order, bom_category
        """,
        'dependencies': {}
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
                'max_length': 50,
                'label': 'Tag Name'
            },
            'tag_category': {
                'type': 'select',
                'required': True,
                'options': ['General', 'Quality', 'Source', 'Special'],
                'label': 'Category'
            },
            'description': {
                'type': 'textarea',
                'required': False,
                'max_length': 200,
                'label': 'Description'
            },
            'color_code': {
                'type': 'text',
                'required': False,
                'max_length': 7,
                'pattern': r'^#[0-9A-Fa-f]{6}$',
                'label': 'Color Code',
                'placeholder': '#FF5733'
            }
        },
        'list_query': """
            SELECT 
                t.*,
                COUNT(DISTINCT mt.material_id) as tagged_materials
            FROM tags t
            LEFT JOIN material_tags mt ON t.tag_id = mt.tag_id
            WHERE t.is_active = true
            GROUP BY t.tag_id
        """,
        'dependencies': {
            'material_tags': {
                'table': 'material_tags',
                'foreign_key': 'tag_id',
                'message': 'Tag applied to {count} materials'
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
                'pattern': r'^[A-Z0-9_]+$',
                'label': 'Reason Code',
                'transform': 'uppercase'
            },
            'reason_description': {
                'type': 'text',
                'required': True,
                'max_length': 100,
                'label': 'Description'
            },
            'category': {
                'type': 'select',
                'required': True,
                'options': ['Damage', 'Quality', 'Process Loss', 'Spillage', 'Expired', 'Other'],
                'label': 'Category'
            },
            'requires_approval': {
                'type': 'boolean',
                'required': False,
                'default': False,
                'label': 'Requires Approval'
            },
            'max_quantity': {
                'type': 'decimal',
                'required': False,
                'min': 0,
                'decimal_places': 2,
                'label': 'Max Quantity Allowed'
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
                'options': ['Fixed', 'Variable', 'Semi-Variable', 'Labor', 'Utilities', 'Consumables', 'Transport', 'Quality', 'Maintenance', 'Overhead'],
                'label': 'Category'
            },
            'activity': {
                'type': 'select',
                'required': False,
                'options': ['Drying', 'Crushing', 'Filtering', 'Common', 'Quality', 'Transport', 'Maintenance', 'General'],
                'label': 'Activity',
                'default': 'General'
            },
            'unit_type': {
                'type': 'select',
                'required': True,
                'options': ['per_kg', 'per_hour', 'fixed', 'actual'],
                'label': 'Unit Type',
                'help_text': 'per_kg: Rate × Weight | per_hour: Rate × Hours | fixed: Flat amount | actual: Manual entry'
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
                'options': ['per_kg', 'per_hour', 'per_unit', 'fixed', 'actual'],
                'label': 'Calculation Method',
                'help_text': 'per_kg: Cost = Quantity(kg) × Rate | per_hour: Cost = Hours × Rate | per_unit: Cost = Units × Rate | fixed: Cost = Rate (flat) | actual: Manual cost entry'
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
                'options': ['Purchase', 'Production', 'Both', 'all', 'batch', 'sku', 'blend', 'sales'],
                'label': 'Applicable To'
            },
            'module_specific': {
                'type': 'text',
                'required': False,
                'max_length': 100,
                'label': 'Module Specific',
                'placeholder': 'batch, sku, blend, etc.'
            },
            'display_order': {
                'type': 'integer',
                'required': False,
                'min': 0,
                'max': 999,
                'default': 0,
                'label': 'Display Order'
            },
            'notes': {
                'type': 'textarea',
                'required': False,
                'max_length': 500,
                'label': 'Notes'
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
# AUDIT LOGGING - FIXED WITH decimal_handler
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
        
        # FIXED: Convert dictionaries to JSON with custom handler for Decimal types
        old_json = json.dumps(old_values, default=decimal_handler) if old_values else None
        new_json = json.dumps(new_values, default=decimal_handler) if new_values else None
        
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
# DEPENDENCY CHECKING - ENHANCED FOR UOM
# =====================================================

def check_dependencies(conn, cur, master_type, record_id):
    """
    Check if a record can be deleted by checking dependencies
    Enhanced to handle UOM special cases
    
    Returns:
        dict: {
            'can_delete': bool,
            'can_soft_delete': bool,
            'has_dependencies': bool,
            'dependencies': list of dependency details,
            'message': string message
        }
    """
    config = MASTERS_CONFIG.get(master_type)
    if not config:
        return {
            'can_delete': False,
            'can_soft_delete': False,
            'has_dependencies': False,
            'message': f'Invalid master type: {master_type}'
        }
    
    # Special handling for UOM master with system protection
    if master_type == 'uom':
        # Check if it's a system UOM
        cur.execute("""
            SELECT is_system FROM uom_master 
            WHERE uom_id = %s
        """, (int(record_id),))
        
        result = cur.fetchone()
        if result and result[0]:  # is_system = True
            return {
                'can_delete': False,
                'can_soft_delete': False,
                'has_dependencies': True,
                'dependencies': [{
                    'table': 'system',
                    'field': 'is_system',
                    'count': 1,
                    'message': 'System UOMs cannot be deleted'
                }],
                'total_dependent_records': 1,
                'message': 'This is a system UOM and cannot be deleted'
            }
    
    dependencies = []
    total_dependent_records = 0
    
    # Check each dependency
    for dep_name, dep_config in config.get('dependencies', {}).items():
        table = dep_config['table']
        foreign_key = dep_config['foreign_key']
        
        # Special handling for different foreign key types
        if dep_config.get('foreign_key_type') == 'varchar':
            # For UOM, we need to get the uom_code first
            if master_type == 'uom':
                cur.execute("""
                    SELECT uom_code FROM uom_master 
                    WHERE uom_id = %s
                """, (int(record_id),))
                uom_result = cur.fetchone()
                if uom_result:
                    cur.execute(f"""
                        SELECT COUNT(*) FROM {table} 
                        WHERE {foreign_key} = %s
                    """, (uom_result[0],))
                else:
                    continue
            else:
                cur.execute(f"""
                    SELECT COUNT(*) FROM {table} 
                    WHERE {foreign_key} = %s
                """, (record_id,))
        elif config.get('primary_key_type') == 'varchar':
            cur.execute(f"""
                SELECT COUNT(*) FROM {table} 
                WHERE {foreign_key} = %s
            """, (record_id,))
        else:
            cur.execute(f"""
                SELECT COUNT(*) FROM {table} 
                WHERE {foreign_key} = %s
            """, (int(record_id),))
        
        count = cur.fetchone()[0]
        
        if count > 0:
            dependencies.append({
                'table': table,
                'field': foreign_key,
                'count': count,
                'message': dep_config['message'].format(count=count)
            })
            total_dependent_records += count
    
    has_dependencies = total_dependent_records > 0
    
    # Check special validations
    special_validations = config.get('special_validations', {})
    if 'system_protection' in special_validations:
        protection = special_validations['system_protection']
        field = protection['field']
        
        # Check if record has system protection
        cur.execute(f"""
            SELECT {field} FROM {config['table']} 
            WHERE {config['primary_key']} = %s
        """, (record_id,))
        
        result = cur.fetchone()
        if result and result[0]:  # Protected record
            return {
                'can_delete': False,
                'can_soft_delete': protection.get('allow_soft_delete', False),
                'has_dependencies': True,
                'dependencies': dependencies,
                'total_dependent_records': total_dependent_records,
                'message': protection.get('message', 'Protected record cannot be deleted')
            }
    
    return {
        'can_delete': not has_dependencies,
        'can_soft_delete': True,  # Always allow soft delete unless protected
        'has_dependencies': has_dependencies,
        'dependencies': dependencies,
        'total_dependent_records': total_dependent_records,
        'message': f'Record has {total_dependent_records} dependent records' if has_dependencies 
                   else 'Record can be safely deleted'
    }


# =====================================================
# FIELD VALIDATION - UPDATED WITH CASE-INSENSITIVE
# =====================================================

def validate_field(field_name, value, field_config, conn=None, cur=None, 
                   table_name=None, record_id=None, primary_key=None):
    """
    Validate a single field value against its configuration
    Now with case-insensitive validation for select fields
    
    Returns:
        tuple: (is_valid, error_message)
    """
    # Check if field is readonly
    if field_config.get('readonly') and record_id:
        # Skip validation for readonly fields during updates
        return True, None
    
    field_type = field_config.get('type')
    
    # Required field check
    if field_config.get('required', False):
        if value is None or value == '' or (isinstance(value, str) and value.strip() == ''):
            return False, f"{field_config.get('label', field_name)} is required"
    
    # If not required and empty, it's valid
    if value is None or value == '':
        return True, None
    
    # Type-specific validation
    if field_type == 'text':
        # Max length check
        max_length = field_config.get('max_length')
        if max_length and len(str(value)) > max_length:
            return False, f"{field_config.get('label', field_name)} must not exceed {max_length} characters"
        
        # Pattern check
        pattern = field_config.get('pattern')
        if pattern:
            if not re.match(pattern, str(value)):
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
        
        # Skip validation for dynamic options (loaded from database)
        if options == 'dynamic':
            return True, None
        
        # SELF-HEALING: Case-insensitive validation for select fields
        # Check if value matches any option (case-insensitive)
        value_str = str(value) if value is not None else ''
        value_lower = value_str.lower()
        
        # Check against all options case-insensitively
        valid = False
        for option in options:
            if isinstance(option, str):
                if option.lower() == value_lower:
                    valid = True
                    break
            elif str(option) == value_str:
                valid = True
                break
        
        if not valid:
            return False, f"{field_config.get('label', field_name)} must be one of: {', '.join(str(o) for o in options)}"
    
    elif field_type == 'boolean':
        if not isinstance(value, bool):
            return False, f"{field_config.get('label', field_name)} must be true or false"
    
    # Check unique constraint if needed
    if field_config.get('unique') and conn and cur and table_name:
        if record_id and primary_key:
            # Update - exclude current record using the correct primary key
            cur.execute(f"""
                SELECT COUNT(*) FROM {table_name} 
                WHERE {field_name} = %s AND {primary_key} != %s
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
    elif transform == 'preserve':
        # Don't transform the value
        return value
    
    return value


# =====================================================
# MASTER DATA VALIDATION - WITH SELF-HEALING
# =====================================================

def validate_master_data(master_type, data, record_id=None):
    """
    Validate all fields in master data
    Also applies self-healing standardization for select fields
    Enhanced to handle UOM special validations
    
    Args:
        master_type: Type of master
        data: Dictionary of field values (will be modified in place for standardization)
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
        # Get the primary key field name for this master type
        primary_key = config.get('primary_key')
        table_name = config.get('table')
        
        # Handle UOM special validations
        if master_type == 'uom' and record_id:
            # Check if it's a system UOM
            cur.execute("""
                SELECT is_system FROM uom_master 
                WHERE uom_id = %s
            """, (int(record_id),))
            
            result = cur.fetchone()
            if result and result[0]:  # is_system = True
                special_validations = config.get('special_validations', {})
                if 'system_protection' in special_validations:
                    protection = special_validations['system_protection']
                    readonly_fields = protection.get('readonly_fields', [])
                    allow_edit = protection.get('allow_edit', [])
                    
                    # Check if trying to edit protected fields
                    for field in data.keys():
                        if field in readonly_fields and field not in allow_edit:
                            errors[field] = f"Cannot modify {field} for system UOM"
        
        # Validate and standardize each field
        for field_name, field_config in config['fields'].items():
            if field_name in data:
                # Apply transformation first (uppercase, lowercase, etc.)
                data[field_name] = transform_field_value(field_config, data[field_name])
                
                # Validate the field
                is_valid, error_msg = validate_field(
                    field_name, data[field_name], field_config,
                    conn, cur, table_name, record_id, primary_key
                )
                if not is_valid:
                    errors[field_name] = error_msg
                else:
                    # SELF-HEALING: If validation passed and it's a select field, standardize it
                    if field_config.get('type') == 'select' and data[field_name]:
                        standardized = standardize_select_value(field_config, data[field_name])
                        if standardized != data[field_name]:
                            # Apply standardization (self-healing)
                            print(f"Self-healing: {field_name} '{data[field_name]}' -> '{standardized}'")
                            data[field_name] = standardized
        
        return len(errors) == 0, errors
        
    finally:
        close_connection(conn, cur)


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
# SOFT DELETE AND RESTORE
# =====================================================

def soft_delete_record(conn, cur, master_type, record_id, deleted_by=None):
    """
    Soft delete a record by setting is_active to false
    Enhanced to handle UOM system protection
    
    Returns:
        bool: Success status
    """
    config = MASTERS_CONFIG.get(master_type)
    if not config:
        return False
    
    # Check special validations for system protection
    if master_type == 'uom':
        cur.execute("""
            SELECT is_system FROM uom_master 
            WHERE uom_id = %s
        """, (int(record_id),))
        
        result = cur.fetchone()
        if result and result[0]:  # is_system = True
            return False  # Cannot delete system UOM
    
    table = config['table']
    primary_key = config['primary_key']
    soft_delete_field = config.get('soft_delete_field', 'is_active')
    
    # Get current record for audit
    cur.execute(f"SELECT * FROM {table} WHERE {primary_key} = %s", (record_id,))
    columns = [desc[0] for desc in cur.description]
    row = cur.fetchone()
    
    if not row:
        return False
    
    old_values = dict(zip(columns, row))
    
    # Build UPDATE query with conditional updated_at
    set_clauses = [f"{soft_delete_field} = false"]
    
    # Check if updated_at column exists before adding it
    if check_column_exists(cur, table, 'updated_at'):
        set_clauses.append("updated_at = CURRENT_TIMESTAMP")
    
    # Soft delete the record
    cur.execute(f"""
        UPDATE {table}
        SET {', '.join(set_clauses)}
        WHERE {primary_key} = %s
    """, (record_id,))
    
    # Log audit
    log_audit(
        conn, cur, table, record_id, 'SOFT_DELETE',
        old_values=old_values,
        changed_by=deleted_by,
        reason='Soft delete via masters management'
    )
    
    return True


def restore_record(conn, cur, master_type, record_id, restored_by=None):
    """
    Restore a soft-deleted record
    
    Returns:
        bool: Success status
    """
    config = MASTERS_CONFIG.get(master_type)
    if not config:
        return False
    
    table = config['table']
    primary_key = config['primary_key']
    soft_delete_field = config.get('soft_delete_field', 'is_active')
    
    # Build UPDATE query with conditional updated_at
    set_clauses = [f"{soft_delete_field} = true"]
    
    # Check if updated_at column exists before adding it
    if check_column_exists(cur, table, 'updated_at'):
        set_clauses.append("updated_at = CURRENT_TIMESTAMP")
    
    # Restore the record
    cur.execute(f"""
        UPDATE {table}
        SET {', '.join(set_clauses)}
        WHERE {primary_key} = %s
    """, (record_id,))
    
    if cur.rowcount == 0:
        return False
    
    # Log audit
    log_audit(
        conn, cur, table, record_id, 'RESTORE',
        changed_by=restored_by,
        reason='Record restored via masters management'
    )
    
    return True


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
    
    query = f"SELECT * FROM {table}"
    
    if not include_inactive:
        query += f" WHERE {soft_delete_field} = true"
    
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
