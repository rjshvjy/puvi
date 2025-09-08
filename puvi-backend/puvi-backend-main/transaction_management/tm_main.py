"""
Transaction Manager - Main Orchestrator Module
File Path: puvi-backend/puvi-backend-main/transaction_management/tm_main.py
Purpose: Flask routes and orchestration for centralized edit/delete functionality
Version: 1.0.0

This module provides the main API endpoints for the Transaction Management Console,
routing requests to appropriate operation modules based on transaction type.
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
import json

# Import operation modules
from transaction_management.tm_input_operations import (
    get_purchase_for_edit, update_purchase, delete_purchase,
    get_writeoff_for_edit, update_writeoff, delete_writeoff,
    list_purchases_with_status, list_writeoffs_with_status,
    check_edit_permissions
)

from transaction_management.tm_production_operations import (
    get_batch_for_edit, update_batch, delete_batch,
    get_blend_for_edit, update_blend, delete_blend,
    list_batches_with_status, list_blends_with_status
)

from transaction_management.tm_output_operations import (
    get_sku_production_for_edit, update_sku_production, delete_sku_production,
    get_outbound_for_edit, update_outbound, delete_outbound,
    get_oil_cake_sale_for_edit, update_oil_cake_sale, delete_oil_cake_sale,
    list_sku_productions_with_status, list_outbounds_with_status, list_oil_cake_sales_with_status,
    trigger_invoice_boundary
)

from transaction_management.tm_configs import TRANSACTION_MODULES

from db_utils import get_db_connection, close_connection

# Create Blueprint
tm_bp = Blueprint('transaction_manager', __name__)

# ============================================
# MODULE ROUTING CONFIGURATION
# ============================================

MODULE_OPERATIONS = {
    'purchases': {
        'get': get_purchase_for_edit,
        'update': update_purchase,
        'delete': delete_purchase,
        'list': list_purchases_with_status,
        'type': 'input'
    },
    'material_writeoffs': {
        'get': get_writeoff_for_edit,
        'update': update_writeoff,
        'delete': delete_writeoff,
        'list': list_writeoffs_with_status,
        'type': 'input'
    },
    'batch': {
        'get': get_batch_for_edit,
        'update': update_batch,
        'delete': delete_batch,
        'list': list_batches_with_status,
        'type': 'production'
    },
    'blend_batches': {
        'get': get_blend_for_edit,
        'update': update_blend,
        'delete': delete_blend,
        'list': list_blends_with_status,
        'type': 'production'
    },
    'sku_production': {
        'get': get_sku_production_for_edit,
        'update': update_sku_production,
        'delete': delete_sku_production,
        'list': list_sku_productions_with_status,
        'type': 'output'
    },
    'sku_outbound': {
        'get': get_outbound_for_edit,
        'update': update_outbound,
        'delete': delete_outbound,
        'list': list_outbounds_with_status,
        'type': 'output'
    },
    'oil_cake_sales': {
        'get': get_oil_cake_sale_for_edit,
        'update': update_oil_cake_sale,
        'delete': delete_oil_cake_sale,
        'list': list_oil_cake_sales_with_status,
        'type': 'output'
    }
}

# ============================================
# UTILITY FUNCTIONS
# ============================================

def get_user_from_request():
    """
    Extract user identifier from request
    Future: Will use Gmail OAuth
    Current: Returns 'System' as placeholder
    """
    # TODO: Implement Gmail OAuth integration
    # auth_header = request.headers.get('Authorization')
    # if auth_header:
    #     return extract_user_from_token(auth_header)
    return 'System'

def validate_module(module_name):
    """
    Validate if module exists and is supported
    """
    if module_name not in MODULE_OPERATIONS:
        return False, f"Module '{module_name}' not supported"
    return True, None

# ============================================
# LIST ENDPOINTS
# ============================================

@tm_bp.route('/api/transaction-manager/<module>/list', methods=['GET'])
def list_transactions(module):
    """
    List transactions with edit/delete status for a module
    """
    try:
        # Validate module
        is_valid, error = validate_module(module)
        if not is_valid:
            return jsonify({'success': False, 'error': error}), 400
        
        # Get filters from query params
        filters = {}
        if request.args.get('start_date'):
            filters['start_date'] = request.args.get('start_date')
        if request.args.get('end_date'):
            filters['end_date'] = request.args.get('end_date')
        if request.args.get('status'):
            filters['status'] = request.args.get('status')
        if request.args.get('supplier_id'):
            filters['supplier_id'] = int(request.args.get('supplier_id'))
        if request.args.get('material_id'):
            filters['material_id'] = int(request.args.get('material_id'))
        
        # Call appropriate list function
        list_func = MODULE_OPERATIONS[module]['list']
        result = list_func(filters)
        
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
# PERMISSION CHECK ENDPOINTS
# ============================================

@tm_bp.route('/api/transaction-manager/<module>/<int:record_id>/permissions', methods=['GET'])
def check_permissions(module, record_id):
    """
    Check edit/delete permissions for a specific record
    """
    conn = None
    try:
        # Validate module
        is_valid, error = validate_module(module)
        if not is_valid:
            return jsonify({'success': False, 'error': error}), 400
        
        # Get table name from config
        config = TRANSACTION_MODULES.get(module)
        if not config:
            return jsonify({'success': False, 'error': 'Module configuration not found'}), 400
        
        table_name = config['table']
        
        # Check permissions
        conn = get_db_connection()
        cur = conn.cursor()
        
        permissions = check_edit_permissions(table_name, record_id, cur)
        
        close_connection(conn, cur)
        
        return jsonify({
            'success': True,
            'permissions': permissions
        })
        
    except Exception as e:
        if conn:
            close_connection(conn, None)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============================================
# GET FOR EDIT ENDPOINTS
# ============================================

@tm_bp.route('/api/transaction-manager/<module>/<int:record_id>', methods=['GET'])
def get_record_for_edit(module, record_id):
    """
    Get record details for editing
    """
    try:
        # Validate module
        is_valid, error = validate_module(module)
        if not is_valid:
            return jsonify({'success': False, 'error': error}), 400
        
        # Call appropriate get function
        get_func = MODULE_OPERATIONS[module]['get']
        result = get_func(record_id)
        
        if result.get('success'):
            return jsonify(result)
        else:
            return jsonify(result), 404
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============================================
# EDIT ENDPOINTS
# ============================================

@tm_bp.route('/api/transaction-manager/<module>/<int:record_id>/edit', methods=['POST', 'PUT'])
def edit_record(module, record_id):
    """
    Update a transaction record
    """
    try:
        # Validate module
        is_valid, error = validate_module(module)
        if not is_valid:
            return jsonify({'success': False, 'error': error}), 400
        
        # Get update data
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        # Get user
        user = get_user_from_request()
        
        # Call appropriate update function
        update_func = MODULE_OPERATIONS[module]['update']
        result = update_func(record_id, data, user=user)
        
        if result.get('success'):
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============================================
# DELETE ENDPOINTS
# ============================================

@tm_bp.route('/api/transaction-manager/<module>/<int:record_id>/delete', methods=['POST', 'DELETE'])
def delete_record(module, record_id):
    """
    Soft delete a transaction record
    """
    try:
        # Validate module
        is_valid, error = validate_module(module)
        if not is_valid:
            return jsonify({'success': False, 'error': error}), 400
        
        # Get reason from request
        data = request.get_json() or {}
        reason = data.get('reason', 'Deleted via Transaction Manager')
        
        # Get user
        user = get_user_from_request()
        
        # Call appropriate delete function
        delete_func = MODULE_OPERATIONS[module]['delete']
        result = delete_func(record_id, reason=reason, user=user)
        
        if result.get('success'):
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============================================
# BOUNDARY CROSSING ENDPOINTS
# ============================================

@tm_bp.route('/api/transaction-manager/trigger-invoice-boundary', methods=['POST'])
def trigger_boundary():
    """
    Trigger boundary crossing when invoice is sent
    Locks entire upstream chain from editing
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        outbound_id = data.get('outbound_id')
        invoice_number = data.get('invoice_number')
        
        if not outbound_id:
            return jsonify({'success': False, 'error': 'Outbound ID required'}), 400
        
        # Get user
        user = get_user_from_request()
        
        # Trigger boundary crossing
        result = trigger_invoice_boundary(outbound_id, invoice_number, user)
        
        if result.get('success'):
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@tm_bp.route('/api/transaction-manager/boundary-status/<module>/<int:record_id>', methods=['GET'])
def check_boundary_status(module, record_id):
    """
    Check if a record has crossed boundary (locked due to external document)
    """
    conn = None
    try:
        # Validate module
        is_valid, error = validate_module(module)
        if not is_valid:
            return jsonify({'success': False, 'error': error}), 400
        
        # Get table name from config
        config = TRANSACTION_MODULES.get(module)
        if not config:
            return jsonify({'success': False, 'error': 'Module configuration not found'}), 400
        
        table_name = config['table']
        primary_key = config['primary_key']
        
        # Check boundary status
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Check if table has boundary_crossed column
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = %s AND column_name = 'boundary_crossed'
        """, (table_name,))
        
        if not cur.fetchone():
            close_connection(conn, cur)
            return jsonify({
                'success': True,
                'boundary_crossed': False,
                'message': 'This module does not track boundary crossing'
            })
        
        # Check boundary status
        cur.execute(f"""
            SELECT boundary_crossed, status
            FROM {table_name}
            WHERE {primary_key} = %s
        """, (record_id,))
        
        row = cur.fetchone()
        if not row:
            close_connection(conn, cur)
            return jsonify({'success': False, 'error': 'Record not found'}), 404
        
        boundary_crossed, status = row
        
        close_connection(conn, cur)
        
        return jsonify({
            'success': True,
            'boundary_crossed': boundary_crossed or False,
            'status': status,
            'is_locked': boundary_crossed or status == 'deleted'
        })
        
    except Exception as e:
        if conn:
            close_connection(conn, None)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============================================
# AUDIT TRAIL ENDPOINTS
# ============================================

@tm_bp.route('/api/transaction-manager/audit/<module>/<int:record_id>', methods=['GET'])
def get_audit_trail(module, record_id):
    """
    Get audit trail for a specific record
    """
    conn = None
    try:
        # Validate module
        is_valid, error = validate_module(module)
        if not is_valid:
            return jsonify({'success': False, 'error': error}), 400
        
        # Get table name from config
        config = TRANSACTION_MODULES.get(module)
        if not config:
            return jsonify({'success': False, 'error': 'Module configuration not found'}), 400
        
        table_name = config['table']
        
        # Fetch audit trail
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT 
                audit_id,
                action,
                old_values,
                new_values,
                changed_by,
                change_reason,
                created_at
            FROM transaction_audit_log
            WHERE table_name = %s AND record_id = %s
            ORDER BY created_at DESC
        """, (table_name, record_id))
        
        columns = [desc[0] for desc in cur.description]
        audit_records = []
        
        for row in cur.fetchall():
            audit = dict(zip(columns, row))
            # Format timestamp
            if audit['created_at']:
                audit['created_at'] = audit['created_at'].isoformat()
            audit_records.append(audit)
        
        close_connection(conn, cur)
        
        return jsonify({
            'success': True,
            'audit_trail': audit_records,
            'total_changes': len(audit_records)
        })
        
    except Exception as e:
        if conn:
            close_connection(conn, None)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============================================
# MODULE CONFIGURATION ENDPOINTS
# ============================================

@tm_bp.route('/api/transaction-manager/modules', methods=['GET'])
def get_supported_modules():
    """
    Get list of all supported modules with their configurations
    """
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
def get_module_config(module):
    """
    Get detailed configuration for a specific module
    """
    try:
        # Validate module
        is_valid, error = validate_module(module)
        if not is_valid:
            return jsonify({'success': False, 'error': error}), 400
        
        config = TRANSACTION_MODULES.get(module, {})
        
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
# STATISTICS ENDPOINTS
# ============================================

@tm_bp.route('/api/transaction-manager/stats', methods=['GET'])
def get_transaction_stats():
    """
    Get statistics about editable/locked transactions
    """
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        stats = {}
        
        # Get stats for each module
        for module_name, config in TRANSACTION_MODULES.items():
            table = config['table']
            
            # Check if table has boundary_crossed column
            cur.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = %s AND column_name = 'boundary_crossed'
            """, (table,))
            
            has_boundary = cur.fetchone() is not None
            
            # Get counts
            cur.execute(f"""
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
                    COUNT(CASE WHEN status = 'deleted' THEN 1 END) as deleted,
                    COUNT(CASE WHEN created_at::date = CURRENT_DATE THEN 1 END) as today
                    {', COUNT(CASE WHEN boundary_crossed = true THEN 1 END) as locked' if has_boundary else ''}
                FROM {table}
            """)
            
            row = cur.fetchone()
            if row:
                stats[module_name] = {
                    'total': row[0],
                    'active': row[1],
                    'deleted': row[2],
                    'created_today': row[3]
                }
                if has_boundary:
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
