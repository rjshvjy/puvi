"""
Transaction Manager - Main Module
File Path: puvi-backend/puvi-backend-main/transaction_management/tm_main.py
Purpose: Centralized transaction editing and deletion management
Implements: Edit/Delete operations for all transaction types with dependency checking

This is the main entry point for the Transaction Manager module that provides
unified edit/delete capabilities across all transaction types.
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
from db_utils import get_db_connection, close_connection

# Import configurations
from .tm_configs import (
    TRANSACTION_MODULES,
    get_module_config,
    get_immutable_fields,
    get_safe_fields,
    get_all_modules,
    get_modules_by_category
)

# Import operation modules
from .tm_input_operations import (
    get_purchase_for_edit,
    update_purchase,
    delete_purchase,
    get_writeoff_for_edit,
    update_writeoff,
    delete_writeoff,
    list_purchases_with_status,
    list_writeoffs_with_status
)

from .tm_production_operations import (
    get_batch_for_edit,
    update_batch,
    soft_delete_batch,
    get_blend_for_edit,
    update_blend,
    soft_delete_blend,
    list_batches_with_status,
    list_blends_with_status
)

from .tm_output_operations import (
    get_sku_production_for_edit,
    update_sku_production,
    soft_delete_sku_production,
    get_outbound_for_edit,
    update_outbound,
    soft_delete_outbound,
    get_oil_cake_sale_for_edit,
    update_oil_cake_sale,
    soft_delete_oil_cake_sale,
    list_sku_productions_with_status,
    list_outbounds_with_status,
    list_oil_cake_sales_with_status,
    trigger_invoice_boundary
)

# Create Blueprint
tm_bp = Blueprint('transaction_manager', __name__)

# ============================================
# MODULE OPERATIONS MAPPING
# ============================================

MODULE_OPERATIONS = {
    'purchases': {
        'type': 'input',
        'get': get_purchase_for_edit,
        'update': update_purchase,
        'delete': delete_purchase,
        'list': list_purchases_with_status
    },
    'material_writeoffs': {
        'type': 'input',
        'get': get_writeoff_for_edit,
        'update': update_writeoff,
        'delete': delete_writeoff,
        'list': list_writeoffs_with_status
    },
    'batch': {
        'type': 'production',
        'get': get_batch_for_edit,
        'update': update_batch,
        'delete': soft_delete_batch,
        'list': list_batches_with_status
    },
    'blend_batches': {
        'type': 'production',
        'get': get_blend_for_edit,
        'update': update_blend,
        'delete': soft_delete_blend,
        'list': list_blends_with_status
    },
    'sku_production': {
        'type': 'output',
        'get': get_sku_production_for_edit,
        'update': update_sku_production,
        'delete': soft_delete_sku_production,
        'list': list_sku_productions_with_status
    },
    'sku_outbound': {
        'type': 'output',
        'get': get_outbound_for_edit,
        'update': update_outbound,
        'delete': soft_delete_outbound,
        'list': list_outbounds_with_status
    },
    'oil_cake_sales': {
        'type': 'output',
        'get': get_oil_cake_sale_for_edit,
        'update': update_oil_cake_sale,
        'delete': soft_delete_oil_cake_sale,
        'list': list_oil_cake_sales_with_status
    }
}

# ============================================
# UTILITY FUNCTIONS
# ============================================

def validate_module(module_name):
    """Validate if module exists and is configured"""
    if module_name not in MODULE_OPERATIONS:
        return False, f"Module '{module_name}' not found"
    if module_name not in TRANSACTION_MODULES:
        return False, f"Module '{module_name}' not configured"
    return True, None

def get_user_from_request():
    """Extract user from request headers or session"""
    # For now, return a default user
    # In production, this would extract from JWT or session
    return request.headers.get('X-User', 'System')

# ============================================
# MAIN API ENDPOINTS
# ============================================

@tm_bp.route('/api/transaction-manager/<module>/list', methods=['GET'])
def list_transactions(module):
    """List transactions with edit/delete status"""
    try:
        # Validate module
        is_valid, error = validate_module(module)
        if not is_valid:
            return jsonify({'success': False, 'error': error}), 400
        
        # Get filters from query params
        filters = {}
        for key in request.args:
            filters[key] = request.args.get(key)
        
        # Get list function for module
        list_func = MODULE_OPERATIONS[module].get('list')
        if not list_func:
            return jsonify({'success': False, 'error': 'List operation not available'}), 400
        
        # Execute list operation
        result = list_func(filters)
        
        if result.get('success'):
            # Normalize response format for frontend
            # Backend returns module-specific keys (purchases, batches, etc.)
            # Frontend expects 'records' or 'data'
            module_data_keys = {
                'purchases': 'purchases',
                'material_writeoffs': 'writeoffs',
                'batch': 'batches',
                'blend_batches': 'blends',
                'sku_production': 'productions',
                'sku_outbound': 'outbounds',
                'oil_cake_sales': 'sales'
            }
            
            data_key = module_data_keys.get(module)
            if data_key and data_key in result:
                result['records'] = result[data_key]
            
            return jsonify(result)
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@tm_bp.route('/api/transaction-manager/<module>/<int:record_id>', methods=['GET'])
def get_transaction(module, record_id):
    """Get transaction details for editing"""
    try:
        # Validate module
        is_valid, error = validate_module(module)
        if not is_valid:
            return jsonify({'success': False, 'error': error}), 400
        
        # Get function for module
        get_func = MODULE_OPERATIONS[module].get('get')
        if not get_func:
            return jsonify({'success': False, 'error': 'Get operation not available'}), 400
        
        # Execute get operation
        result = get_func(record_id)
        
        if result.get('success'):
            return jsonify(result)
        else:
            return jsonify(result), 404 if 'not found' in result.get('error', '').lower() else 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@tm_bp.route('/api/transaction-manager/<module>/<int:record_id>', methods=['PUT'])
def update_transaction(module, record_id):
    """Update transaction"""
    try:
        # Validate module
        is_valid, error = validate_module(module)
        if not is_valid:
            return jsonify({'success': False, 'error': error}), 400
        
        # Get update function for module
        update_func = MODULE_OPERATIONS[module].get('update')
        if not update_func:
            return jsonify({'success': False, 'error': 'Update operation not available'}), 400
        
        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        # Get user
        user = get_user_from_request()
        
        # Execute update operation
        result = update_func(record_id, data, user)
        
        if result.get('success'):
            return jsonify(result)
        else:
            return jsonify(result), 403 if 'locked' in result.get('error', '').lower() else 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@tm_bp.route('/api/transaction-manager/<module>/<int:record_id>', methods=['DELETE'])
def delete_transaction(module, record_id):
    """Delete (soft delete) transaction"""
    try:
        # Validate module
        is_valid, error = validate_module(module)
        if not is_valid:
            return jsonify({'success': False, 'error': error}), 400
        
        # Get delete function for module
        delete_func = MODULE_OPERATIONS[module].get('delete')
        if not delete_func:
            return jsonify({'success': False, 'error': 'Delete operation not available'}), 400
        
        # Get reason from request
        data = request.get_json() or {}
        reason = data.get('reason', '')
        
        # Get user
        user = get_user_from_request()
        
        # Execute delete operation
        result = delete_func(record_id, reason, user)
        
        if result.get('success'):
            return jsonify(result)
        else:
            return jsonify(result), 403 if 'locked' in result.get('error', '').lower() else 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@tm_bp.route('/api/transaction-manager/<module>/<int:record_id>/permissions', methods=['GET'])
def check_permissions(module, record_id):
    """Check edit/delete permissions for a record"""
    try:
        # Validate module
        is_valid, error = validate_module(module)
        if not is_valid:
            return jsonify({'success': False, 'error': error}), 400
        
        # Get function for module to fetch current state
        get_func = MODULE_OPERATIONS[module].get('get')
        if not get_func:
            return jsonify({'success': False, 'error': 'Operation not available'}), 400
        
        # Get record with permissions
        result = get_func(record_id)
        
        if result.get('success'):
            return jsonify({
                'success': True,
                'permissions': result.get('permissions', {})
            })
        else:
            return jsonify(result), 404 if 'not found' in result.get('error', '').lower() else 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@tm_bp.route('/api/transaction-manager/<module>/<int:record_id>/audit', methods=['GET'])
def get_audit_trail(module, record_id):
    """Get audit trail for a record"""
    conn = None
    try:
        # Validate module
        is_valid, error = validate_module(module)
        if not is_valid:
            return jsonify({'success': False, 'error': error}), 400
        
        # Get table name from config
        config = get_module_config(module)
        table_name = config.get('table')
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get audit trail
        cur.execute("""
            SELECT 
                audit_id,
                action,
                old_values,
                new_values,
                changed_by,
                changed_at,
                reason
            FROM transaction_audit_log
            WHERE table_name = %s AND record_id = %s
            ORDER BY changed_at DESC
        """, (table_name, record_id))
        
        audit_trail = []
        for row in cur.fetchall():
            audit_trail.append({
                'audit_id': row[0],
                'action': row[1],
                'old_values': row[2],
                'new_values': row[3],
                'changed_by': row[4],
                'changed_at': row[5].isoformat() if row[5] else None,
                'reason': row[6]
            })
        
        close_connection(conn, cur)
        
        return jsonify({
            'success': True,
            'audit_trail': audit_trail,
            'count': len(audit_trail)
        })
        
    except Exception as e:
        if conn:
            close_connection(conn, None)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============================================
# SPECIAL OPERATIONS
# ============================================

@tm_bp.route('/api/transaction-manager/trigger-boundary/<module>/<int:record_id>', methods=['POST'])
def trigger_boundary_crossing(module, record_id):
    """Trigger boundary crossing for a transaction"""
    try:
        # Only specific modules support boundary crossing
        if module not in ['sku_outbound']:
            return jsonify({
                'success': False,
                'error': 'Boundary crossing not supported for this module'
            }), 400
        
        data = request.get_json() or {}
        user = get_user_from_request()
        
        if module == 'sku_outbound':
            invoice_number = data.get('invoice_number')
            if not invoice_number:
                return jsonify({'success': False, 'error': 'Invoice number required'}), 400
            
            result = trigger_invoice_boundary(record_id, invoice_number, user)
        
        if result.get('success'):
            return jsonify(result)
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============================================
# MODULE CONFIGURATION ENDPOINTS
# ============================================

@tm_bp.route('/api/transaction-manager/modules', methods=['GET'])
def get_modules():
    """Get list of available modules"""
    try:
        modules = []
        for module_name, config in TRANSACTION_MODULES.items():
            modules.append({
                'module': module_name,
                'display_name': config.get('display_name', module_name),
                'table': config.get('table'),
                'type': MODULE_OPERATIONS.get(module_name, {}).get('type', 'unknown'),
                'has_items': 'items_table' in config,
                'supports_boundary': module_name in ['purchases', 'batch', 'blend_batches', 
                                                     'sku_production', 'sku_outbound', 
                                                     'oil_cake_sales', 'material_writeoffs']
            })
        
        return jsonify({
            'success': True,
            'modules': modules,
            'total': len(modules)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@tm_bp.route('/api/transaction-manager/config/<module>', methods=['GET'])
def get_module_config_endpoint(module):
    """Get detailed configuration for a specific module"""
    try:
        # Validate module
        is_valid, error = validate_module(module)
        if not is_valid:
            return jsonify({'success': False, 'error': error}), 400
        
        config = get_module_config(module)
        
        # Add operation type
        config['operation_type'] = MODULE_OPERATIONS.get(module, {}).get('type', 'unknown')
        
        # Remove sensitive information
        safe_config = {
            'module': module,
            'display_name': config.get('display_name'),
            'primary_key': config.get('primary_key'),
            'has_items': 'items_table' in config,
            'immutable_fields': config.get('immutable_fields', []),
            'safe_fields': config.get('safe_fields', {}),
            'cascade_fields': config.get('cascade_fields', {}),
            'list_fields': config.get('list_fields', []),
            'operation_type': config.get('operation_type')
        }
        
        return jsonify({
            'success': True,
            'config': safe_config
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============================================
# STATISTICS ENDPOINTS - FIXED VERSION
# ============================================

@tm_bp.route('/api/transaction-manager/stats', methods=['GET'])
def get_transaction_stats():
    """
    Get statistics about editable/locked transactions
    FIXED: Handles tables without status column
    """
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        stats = {}
        
        # Get stats for each module
        for module_name, config in TRANSACTION_MODULES.items():
            table = config['table']
            
            # Check which columns exist in this table
            cur.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = %s 
                AND column_name IN ('status', 'boundary_crossed', 'created_at')
            """, (table,))
            
            existing_columns = [row[0] for row in cur.fetchall()]
            
            # Build dynamic query based on available columns
            select_parts = ["COUNT(*) as total"]
            
            # Handle status column
            if 'status' in existing_columns:
                select_parts.append("COUNT(CASE WHEN status = 'active' THEN 1 END) as active")
                select_parts.append("COUNT(CASE WHEN status = 'deleted' THEN 1 END) as deleted")
            else:
                # For tables without status column (like cost_override_log, batch_time_tracking)
                # count all records as active
                select_parts.append("COUNT(*) as active")
                select_parts.append("0 as deleted")
            
            # Handle created_at column
            if 'created_at' in existing_columns:
                select_parts.append("COUNT(CASE WHEN created_at::date = CURRENT_DATE THEN 1 END) as today")
            else:
                select_parts.append("0 as today")
            
            # Handle boundary_crossed column
            if 'boundary_crossed' in existing_columns:
                select_parts.append("COUNT(CASE WHEN boundary_crossed = true THEN 1 END) as locked")
            
            # Execute query
            query = f"SELECT {', '.join(select_parts)} FROM {table}"
            cur.execute(query)
            
            row = cur.fetchone()
            if row:
                stats[module_name] = {
                    'total': row[0],
                    'active': row[1],
                    'deleted': row[2],
                    'created_today': row[3]
                }
                # Add locked count if boundary_crossed column exists
                if 'boundary_crossed' in existing_columns:
                    stats[module_name]['locked'] = row[4]
        
        close_connection(conn, cur)
        
        return jsonify({
            'success': True,
            'statistics': stats,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        if conn:
            close_connection(conn, None)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============================================
# HEALTH CHECK
# ============================================

@tm_bp.route('/api/transaction-manager/health', methods=['GET'])
def health_check():
    """
    Health check for Transaction Manager
    """
    try:
        return jsonify({
            'success': True,
            'status': 'healthy',
            'modules_loaded': len(MODULE_OPERATIONS),
            'operations_available': ['list', 'get', 'edit', 'delete', 'permissions', 'audit'],
            'boundary_crossing': 'enabled',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'status': 'unhealthy',
            'error': str(e)
        }), 500

# Export the blueprint
__all__ = ['tm_bp']
