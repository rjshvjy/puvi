"""
Transaction Manager - Configuration Module
File Path: puvi-backend/puvi-backend-main/transaction_management/tm_configs.py
Purpose: Centralized configuration for all transaction modules
Defines: Immutable fields, safe fields, cascade fields, dependencies for each module

This module contains the complete configuration for edit/delete operations
across all transaction types in the PUVI Oil Manufacturing System.
"""

# ============================================
# MODULE CONFIGURATIONS
# ============================================

TRANSACTION_MODULES = {
    # ============================================
    # INPUT OPERATIONS
    # ============================================
    
    'purchases': {
        'table': 'purchases',
        'items_table': 'purchase_items',
        'primary_key': 'purchase_id',
        'item_key': 'item_id',
        'display_name': 'Purchase',
        'display_field': 'invoice_ref',
        
        # Fields that can NEVER be edited
        'immutable_fields': [
            'purchase_id',
            'traceable_code',      # Critical: Part of traceability chain
            'purchase_date',       # Part of traceable code
            'supplier_id',         # Part of traceable code
            'created_at'
        ],
        
        # Fields in items table that are immutable
        'immutable_item_fields': [
            'item_id',
            'purchase_id',
            'material_id',         # Part of traceable code
            'quantity',            # Affects inventory calculations
            'rate',                # Affects weighted average cost
            'landed_cost_per_unit' # Affects inventory valuation
        ],
        
        # Fields that can be edited even with dependencies
        'safe_fields': {
            'header': [
                'invoice_ref',
                'transport_cost',
                'loading_charges',
                'notes'
            ],
            'items': [
                'transport_charges',
                'handling_charges',
                'notes'
            ]
        },
        
        # Fields that affect downstream calculations
        'cascade_fields': {
            'header': [
                'subtotal',
                'total_gst_amount', 
                'total_cost'
            ],
            'items': [
                'amount',
                'gst_rate',
                'gst_amount',
                'total_amount'
            ]
        },
        
        # Query to check dependencies
        'dependency_check': """
            SELECT COUNT(*) FROM batch 
            WHERE seed_purchase_code IN (
                SELECT traceable_code FROM purchases WHERE purchase_id = %s
            )
        """,
        
        # Fields to show in list view
        'list_fields': [
            'purchase_id', 'invoice_ref', 'purchase_date', 
            'supplier_name', 'total_cost', 'status', 'edit_status'
        ]
    },
    
    'material_writeoffs': {
        'table': 'material_writeoffs',
        'primary_key': 'writeoff_id',
        'display_name': 'Material Writeoff',
        'display_field': 'writeoff_id',
        
        'immutable_fields': [
            'writeoff_id',
            'material_id',         # Can't change what was written off
            'writeoff_date',       # Historical record
            'quantity',            # Affects inventory
            'weighted_avg_cost',   # Historical cost at time of writeoff
            'reference_type',      # Type of writeoff (material/sku/cake/sludge)
            'reference_id',        # Link to source
            'created_at'
        ],
        
        'safe_fields': [
            'reason_code',
            'reason_description',
            'notes',
            'scrap_value'          # Can adjust recovery value
        ],
        
        'cascade_fields': [
            'total_cost',          # quantity * weighted_avg_cost
            'net_loss'             # total_cost - scrap_value
        ],
        
        # Writeoffs typically don't have dependencies
        'dependency_check': None,
        
        'list_fields': [
            'writeoff_id', 'writeoff_date', 'item_name',
            'quantity', 'net_loss', 'reason_code', 'edit_status'
        ]
    },
    
    # ============================================
    # PRODUCTION OPERATIONS
    # ============================================
    
    'batch': {
        'table': 'batch',
        'extended_table': 'batch_extended_costs',
        'primary_key': 'batch_id',
        'display_name': 'Batch Production',
        'display_field': 'batch_code',
        
        'immutable_fields': [
            'batch_id',
            'traceable_code',      # Critical: Flows to SKU
            'batch_code',          # User-facing identifier
            'production_date',     # Part of traceable code
            'seed_material_id',    # Source material
            'seed_purchase_code',  # Link to purchase
            'created_at'
        ],
        
        'safe_fields': [
            'batch_description',
            'notes',
            'remarks',
            'operator_name'
        ],
        
        'cascade_fields': [
            'seed_quantity_kg',    # Affects yield calculations
            'oil_produced',        # Affects inventory
            'oil_cake_yield',      # Affects cake inventory
            'sludge_yield',        # Affects sludge inventory
            'oil_yield_percentage',
            'total_cost',
            'cost_per_kg',
            'drying_loss',
            'packing_loss'
        ],
        
        'dependency_check': """
            SELECT COUNT(*) FROM (
                SELECT 1 FROM sku_oil_allocation WHERE source_id = %s
                UNION
                SELECT 1 FROM blend_batch_components WHERE batch_id = %s
            ) as deps
        """,
        
        'list_fields': [
            'batch_id', 'batch_code', 'production_date', 'oil_type',
            'oil_produced', 'status', 'edit_status'
        ]
    },
    
    'blend_batches': {
        'table': 'blend_batches',
        'components_table': 'blend_batch_components',
        'primary_key': 'blend_id',
        'component_key': 'component_id',
        'display_name': 'Oil Blend',
        'display_field': 'blend_code',
        
        'immutable_fields': [
            'blend_id',
            'blend_code',
            'blend_date',          # Historical record
            'result_oil_type',     # Can't change output type
            'created_at'
        ],
        
        'immutable_component_fields': [
            'component_id',
            'blend_id',
            'batch_id',            # Source batch
            'oil_quantity',        # Affects inventory
            'percentage'           # Blend ratio
        ],
        
        'safe_fields': {
            'header': [
                'blend_description',
                'notes',
                'operator_name'
            ],
            'components': [
                'notes'
            ]
        },
        
        'cascade_fields': {
            'header': [
                'total_quantity',
                'blend_cost',
                'cost_per_kg'
            ]
        },
        
        'dependency_check': """
            SELECT COUNT(*) FROM sku_oil_allocation 
            WHERE source_type = 'blend' AND source_id = %s
        """,
        
        'list_fields': [
            'blend_id', 'blend_code', 'blend_date', 'result_oil_type',
            'total_quantity', 'status', 'edit_status'
        ]
    },
    
    # ============================================
    # OUTPUT OPERATIONS
    # ============================================
    
    'sku_production': {
        'table': 'sku_production',
        'oil_allocation_table': 'sku_oil_allocation',
        'material_consumption_table': 'sku_material_consumption',
        'primary_key': 'production_id',
        'display_name': 'SKU Production',
        'display_field': 'traceable_code',
        
        'immutable_fields': [
            'production_id',
            'traceable_code',      # Critical identifier
            'sku_id',              # Product being made
            'production_date',     # Historical record
            'bottles_produced',    # Affects inventory
            'created_at'
        ],
        
        'safe_fields': [
            'batch_number',
            'notes',
            'remarks',
            'supervisor_name',
            'mrp'                  # Can update MRP
        ],
        
        'cascade_fields': [
            'oil_used_liters',     # Total oil consumed
            'total_cost',          # Production cost
            'cost_per_bottle',     # Unit cost
            'overhead_cost',
            'total_material_cost',
            'total_oil_cost'
        ],
        
        'dependency_check': """
            SELECT COUNT(*) FROM sku_outbound_items 
            WHERE production_id = %s
        """,
        
        'list_fields': [
            'production_id', 'traceable_code', 'production_date',
            'sku_name', 'bottles_produced', 'status', 'edit_status'
        ]
    },
    
    'sku_outbound': {
        'table': 'sku_outbound',
        'items_table': 'sku_outbound_items',
        'primary_key': 'outbound_id',
        'item_key': 'outbound_item_id',
        'display_name': 'SKU Outbound',
        'display_field': 'invoice_number',
        
        'immutable_fields': [
            'outbound_id',
            'customer_id',         # Can't change customer
            'outbound_date',       # Historical record
            'created_at'
        ],
        
        'immutable_item_fields': [
            'outbound_item_id',
            'outbound_id',
            'production_id',       # Source production
            'sku_id',              # Product shipped
            'quantity'             # Affects inventory
        ],
        
        'safe_fields': {
            'header': [
                'invoice_number',
                'transport_details',
                'delivery_notes',
                'po_number',
                'payment_terms'
            ],
            'items': [
                'notes'
            ]
        },
        
        'cascade_fields': {
            'header': [
                'subtotal',
                'gst_amount',
                'total_amount',
                'discount_amount'
            ],
            'items': [
                'unit_price',
                'total_price'
            ]
        },
        
        # No dependencies - this is the end of chain
        'dependency_check': None,
        
        # Special flag for boundary crossing
        'triggers_boundary': True,
        'boundary_field': 'invoice_sent',
        
        'list_fields': [
            'outbound_id', 'invoice_number', 'outbound_date',
            'customer_name', 'total_amount', 'status', 'edit_status'
        ]
    },
    
    'oil_cake_sales': {
        'table': 'oil_cake_sales',
        'allocations_table': 'oil_cake_sale_allocations',
        'primary_key': 'sale_id',
        'allocation_key': 'allocation_id',
        'display_name': 'Oil Cake Sale',
        'display_field': 'invoice_ref',
        
        'immutable_fields': [
            'sale_id',
            'sale_date',           # Historical record
            'customer_name',       # Can't change customer
            'created_at'
        ],
        
        'immutable_allocation_fields': [
            'allocation_id',
            'sale_id',
            'batch_id',            # Source batch
            'quantity_kg',         # Affects inventory
            'cake_inventory_id'    # Link to inventory
        ],
        
        'safe_fields': {
            'header': [
                'invoice_ref',
                'transport_cost',
                'notes',
                'payment_status',
                'payment_notes'
            ]
        },
        
        'cascade_fields': {
            'header': [
                'total_quantity',
                'subtotal',
                'gst_amount',
                'total_amount'
            ],
            'allocations': [
                'rate_per_kg',
                'amount'
            ]
        },
        
        # No dependencies - this is end of cake chain
        'dependency_check': None,
        
        'list_fields': [
            'sale_id', 'invoice_ref', 'sale_date', 'customer_name',
            'total_quantity', 'total_amount', 'status', 'edit_status'
        ]
    },
    
    # ============================================
    # SUPPORT OPERATIONS
    # ============================================
    
    'cost_override_log': {
        'table': 'cost_override_log',
        'primary_key': 'log_id',
        'display_name': 'Cost Override',
        'display_field': 'log_id',
        
        'immutable_fields': [
            'log_id',
            'override_date',       # Historical record
            'reference_type',      # Type of override
            'reference_id',        # Link to source
            'original_cost',       # Historical value
            'created_at'
        ],
        
        'safe_fields': [
            'override_reason',
            'notes',
            'approved_by'
        ],
        
        'cascade_fields': [
            'override_cost',       # New cost value
            'cost_difference'      # override - original
        ],
        
        'dependency_check': None,
        
        'list_fields': [
            'log_id', 'override_date', 'reference_type',
            'original_cost', 'override_cost', 'override_reason'
        ]
    },
    
    'batch_time_tracking': {
        'table': 'batch_time_tracking',
        'primary_key': 'tracking_id',
        'display_name': 'Batch Time Tracking',
        'display_field': 'tracking_id',
        
        'immutable_fields': [
            'tracking_id',
            'batch_id',            # Link to batch
            'activity_date',       # Historical record
            'activity_type',       # Type of activity
            'created_at'
        ],
        
        'safe_fields': [
            'notes',
            'verified_by'
        ],
        
        'cascade_fields': [
            'hours_worked',        # Labor hours
            'hourly_rate',         # Rate per hour
            'total_cost'           # hours * rate
        ],
        
        'dependency_check': None,
        
        'list_fields': [
            'tracking_id', 'batch_code', 'activity_date',
            'activity_type', 'hours_worked', 'total_cost'
        ]
    }
}

# ============================================
# HELPER FUNCTIONS
# ============================================

def get_module_config(module_name):
    """
    Get configuration for a specific module
    
    Args:
        module_name: Name of the module
        
    Returns:
        dict: Module configuration or None if not found
    """
    return TRANSACTION_MODULES.get(module_name)

def get_immutable_fields(module_name, include_items=False):
    """
    Get list of immutable fields for a module
    
    Args:
        module_name: Name of the module
        include_items: Include item table fields if applicable
        
    Returns:
        list: List of immutable field names
    """
    config = get_module_config(module_name)
    if not config:
        return []
    
    fields = config.get('immutable_fields', [])
    
    if include_items:
        fields.extend(config.get('immutable_item_fields', []))
        fields.extend(config.get('immutable_component_fields', []))
        fields.extend(config.get('immutable_allocation_fields', []))
    
    return fields

def get_safe_fields(module_name):
    """
    Get safe fields that can be edited even with dependencies
    
    Args:
        module_name: Name of the module
        
    Returns:
        dict or list: Safe fields configuration
    """
    config = get_module_config(module_name)
    if not config:
        return []
    
    return config.get('safe_fields', [])

def get_cascade_fields(module_name):
    """
    Get cascade fields that affect downstream calculations
    
    Args:
        module_name: Name of the module
        
    Returns:
        dict or list: Cascade fields configuration
    """
    config = get_module_config(module_name)
    if not config:
        return []
    
    return config.get('cascade_fields', [])

def check_if_triggers_boundary(module_name):
    """
    Check if this module can trigger boundary crossing
    
    Args:
        module_name: Name of the module
        
    Returns:
        bool: True if module triggers boundary crossing
    """
    config = get_module_config(module_name)
    if not config:
        return False
    
    return config.get('triggers_boundary', False)

def get_dependency_query(module_name):
    """
    Get the SQL query to check dependencies for a module
    
    Args:
        module_name: Name of the module
        
    Returns:
        str: SQL query string or None
    """
    config = get_module_config(module_name)
    if not config:
        return None
    
    return config.get('dependency_check')

def get_all_modules():
    """
    Get list of all configured modules
    
    Returns:
        list: List of module names
    """
    return list(TRANSACTION_MODULES.keys())

def get_modules_by_category():
    """
    Get modules grouped by category
    
    Returns:
        dict: Modules grouped by category
    """
    return {
        'input': ['purchases', 'material_writeoffs'],
        'production': ['batch', 'blend_batches'],
        'output': ['sku_production', 'sku_outbound', 'oil_cake_sales'],
        'support': ['cost_override_log', 'batch_time_tracking']
    }

# ============================================
# VALIDATION HELPERS
# ============================================

def is_field_editable(module_name, field_name, has_dependencies=False, boundary_crossed=False):
    """
    Check if a specific field is editable given the current state
    
    Args:
        module_name: Name of the module
        field_name: Name of the field
        has_dependencies: Whether record has dependencies
        boundary_crossed: Whether boundary has been crossed
        
    Returns:
        bool: True if field is editable
    """
    if boundary_crossed:
        return False
    
    config = get_module_config(module_name)
    if not config:
        return False
    
    # Check if field is immutable
    if field_name in get_immutable_fields(module_name, include_items=True):
        return False
    
    # If no dependencies, all non-immutable fields are editable
    if not has_dependencies:
        return True
    
    # With dependencies, only safe fields are editable
    safe_fields = get_safe_fields(module_name)
    
    # Handle different safe field structures
    if isinstance(safe_fields, dict):
        # Check in all safe field categories
        for category, fields in safe_fields.items():
            if field_name in fields:
                return True
    elif isinstance(safe_fields, list):
        if field_name in safe_fields:
            return True
    
    return False

# ============================================
# MODULE STATUS HELPERS
# ============================================

def get_edit_status(module_name, created_at, has_dependencies, boundary_crossed):
    """
    Determine the edit status for a record
    
    Args:
        module_name: Name of the module
        created_at: Record creation timestamp
        has_dependencies: Whether record has dependencies
        boundary_crossed: Whether boundary has been crossed
        
    Returns:
        str: Edit status ('locked', 'editable', 'partial')
    """
    if boundary_crossed:
        return 'locked'
    
    from datetime import datetime
    
    # Check if same day entry
    if isinstance(created_at, datetime):
        is_same_day = created_at.date() == datetime.now().date()
    else:
        is_same_day = False
    
    if is_same_day and not has_dependencies:
        return 'editable'
    elif has_dependencies:
        return 'partial'
    else:
        return 'editable'
