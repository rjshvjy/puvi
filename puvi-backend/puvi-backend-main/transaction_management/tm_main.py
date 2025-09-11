"""
Transaction Manager - Main Module (UPDATED VERSION)
File Path: puvi-backend/puvi-backend-main/transaction_management/tm_main.py
Purpose: Centralized transaction management with two-stream correction system
Version: 2.0 - Implements Returns/Reversals Pattern

This is the main entry point for the Transaction Manager module that provides
unified transaction management with return documents and reversal entries.
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

# Import NEW operation modules with return/reversal functions
from .tm_input_operations import (
    # NEW: Return and reversal functions
    validate_purchase_return,
    create_purchase_return,
    check_reversal_possibility,
    reverse_and_correct_purchase,
    create_adjustment_entry,
    adjust_writeoff,
    list_purchases_with_correction_status,
    list_purchase_returns,
    list_writeoffs_with_status,
    get_purchase_for_correction,
    get_writeoff_for_adjustment,
    approve_purchase_return,
    get_correction_summary,
    # Legacy functions (kept for backward compatibility during transition)
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
# MODULE OPERATIONS MAPPING (UPDATED)
# ============================================

MODULE_OPERATIONS = {
    'purchases': {
        'type': 'input',
        'get': get_purchase_for_correction,  # Changed to new function
        'update': update_purchase,  # Legacy - will be phased out
        'delete': delete_purchase,  # Legacy - will be phased out
        'list': list_purchases_with_correction_status,  # Changed to new function
        # NEW operations
        'validate_return': validate_purchase_return,
        'create_return': create_purchase_return,
        'check_reversal': check_reversal_possibility,
        'reverse_and_correct': reverse_and_correct_purchase
    },
    'material_writeoffs': {
        'type': 'input',
        'get': get_writeoff_for_adjustment,  # Changed to new function
        'update': update_writeoff,  # Legacy
        'delete': delete_writeoff,  # Legacy
        'list': list_writeoffs_with_status,
        # NEW operations
        'adjust': adjust_writeoff  # Writeoffs can only be adjusted, not reversed
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
    return request.headers.get('X-User', 'System')

# ============================================
# NEW: RETURN AND REVERSAL ENDPOINTS
# ============================================

@tm_bp.route('/api/tm/purchase/returns/validate', methods=['POST'])
def validate_purchase_return_endpoint():
    """Validate if a purchase can be returned"""
    try:
        data = request.get_json()
        purchase_id = data.get('purchase_id')
        return_items = data.get('items', [])
        
        if not purchase_id:
            return jsonify({'success': False, 'error': 'Purchase ID required'}), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        validation = validate_purchase_return(purchase_id, return_items, cur)
        
        close_connection(conn, cur)
        
        return jsonify({
            'success': True,
            'validation': validation
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@tm_bp.route('/api/tm/purchase/returns/create', methods=['POST'])
def create_purchase_return_endpoint():
    """Create a purchase return with inventory reversal"""
    try:
        data = request.get_json()
        purchase_id = data.get('purchase_id')
        return_data = data.get('return_data')
        user = get_user_from_request()
        
        if not purchase_id or not return_data:
            return jsonify({'success': False, 'error': 'Missing required data'}), 400
        
        result = create_purchase_return(purchase_id, return_data, user)
        
        if result.get('success'):
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@tm_bp.route('/api/tm/purchase/returns/list', methods=['GET'])
def list_purchase_returns_endpoint():
    """List all purchase returns with filters"""
    try:
        filters = {}
        for key in request.args:
            filters[key] = request.args.get(key)
        
        result = list_purchase_returns(filters)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@tm_bp.route('/api/tm/purchase/returns/<int:return_id>/approve', methods=['POST'])
def approve_purchase_return_endpoint(return_id):
    """Approve a purchase return"""
    try:
        user = get_user_from_request()
        result = approve_purchase_return(return_id, user)
        
        if result.get('success'):
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@tm_bp.route('/api/tm/purchase/reverse', methods=['POST'])
def reverse_purchase_endpoint():
    """Create reversal and correction entries for a purchase"""
    try:
        data = request.get_json()
        purchase_id = data.get('purchase_id')
        corrections = data.get('corrections', {})
        reason = data.get('reason')
        user = get_user_from_request()
        
        if not purchase_id:
            return jsonify({'success': False, 'error': 'Purchase ID required'}), 400
        
        result = reverse_and_correct_purchase(purchase_id, corrections, user, reason)
        
        if result.get('success'):
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@tm_bp.route('/api/tm/<module>/check-reversal/<int:record_id>', methods=['GET'])
def check_reversal_possibility_endpoint(module, record_id):
    """Check if a transaction can be reversed"""
    try:
        is_valid, error = validate_module(module)
        if not is_valid:
            return jsonify({'success': False, 'error': error}), 400
        
        config = get_module_config(module)
        table_name = config.get('table')
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        result = check_reversal_possibility(table_name, record_id, cur)
        
        close_connection(conn, cur)
        
        return jsonify({
            'success': True,
            'reversal_check': result
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@tm_bp.route('/api/tm/adjustment/create', methods=['POST'])
def create_adjustment_endpoint():
    """Create an adjustment entry when reversal is not possible"""
    try:
        data = request.get_json()
        transaction_type = data.get('transaction_type')
        transaction_id = data.get('transaction_id')
        adjustment_data = data.get('adjustment_data')
        user = get_user_from_request()
        
        if not all([transaction_type, transaction_id, adjustment_data]):
            return jsonify({'success': False, 'error': 'Missing required data'}), 400
        
        result = create_adjustment_entry(transaction_type, transaction_id, adjustment_data, user)
        
        if result.get('success'):
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@tm_bp.route('/api/tm/writeoff/adjust/<int:writeoff_id>', methods=['POST'])
def adjust_writeoff_endpoint(writeoff_id):
    """Adjust a writeoff (safe fields only)"""
    try:
        data = request.get_json()
        user = get_user_from_request()
        
        result = adjust_writeoff(writeoff_id, data, user)
        
        if result.get('success'):
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@tm_bp.route('/api/tm/corrections/summary', methods=['GET'])
def get_corrections_summary():
    """Get summary of all corrections in a period"""
    try:
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        result = get_correction_summary(date_from, date_to)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============================================
# ENHANCED STATUS ENDPOINTS
# ============================================

@tm_bp.route('/api/tm/purchases/status', methods=['GET'])
def get_purchases_with_correction_status():
    """Get purchases with return/reversal status"""
    try:
        filters = {}
        for key in request.args:
            filters[key] = request.args.get(key)
        
        result = list_purchases_with_correction_status(filters)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@tm_bp.route('/api/tm/writeoffs/status', methods=['GET'])
def get_writeoffs_with_adjustment_status():
    """Get writeoffs with adjustment capability status"""
    try:
        filters = {}
        for key in request.args:
            filters[key] = request.args.get(key)
        
        result = list_writeoffs_with_status(filters)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============================================
# LEGACY API ENDPOINTS (Kept for compatibility)
# ============================================

@tm_bp.route('/api/transaction-manager/<module>/list', methods=['GET'])
def list_transactions(module):
    """List transactions with edit/delete status"""
    try:
        is_valid, error = validate_module(module)
        if not is_valid:
            return jsonify({'success': False, 'error': error}), 400
        
        filters = {}
        for key in request.args:
            filters[key] = request.args.get(key)
        
        list_func = MODULE_OPERATIONS[module].get('list')
        if not list_func:
            return jsonify({'success': False, 'error': 'List operation not available'}), 400
        
        result = list_func(filters)
        
        if result.get('success'):
            # Normalize response format
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
    """Get transaction details for editing/correction"""
    try:
        is_valid, error = validate_module(module)
        if not is_valid:
            return jsonify({'success': False, 'error': error}), 400
        
        get_func = MODULE_OPERATIONS[module].get('get')
        if not get_func:
            return jsonify({'success': False, 'error': 'Get operation not available'}), 400
        
        result = get_func(record_id)
        
        if result.get('success'):
            # Normalize response format
            module_data_keys = {
                'purchases': 'purchase',
                'material_writeoffs': 'writeoff',
                'batch': 'batch',
                'blend_batches': 'blend',
                'sku_production': 'production',
                'sku_outbound': 'outbound',
                'oil_cake_sales': 'sale'
            }
            
            data_key = module_data_keys.get(module)
            if data_key and data_key in result:
                result['record'] = result[data_key]
                result['data'] = result[data_key]
            
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
    """Update transaction (LEGACY - will be replaced by corrections)"""
    try:
        is_valid, error = validate_module(module)
        if not is_valid:
            return jsonify({'success': False, 'error': error}), 400
        
        # Check if this should use new correction pattern
        if module == 'purchases':
            # Redirect to appropriate correction method
            return jsonify({
                'success': False,
                'error': 'Direct edits deprecated. Use returns or reversals.',
                'suggestions': {
                    'physical_return': '/api/tm/purchase/returns/create',
                    'clerical_error': '/api/tm/purchase/reverse'
                }
            }), 400
        
        update_func = MODULE_OPERATIONS[module].get('update')
        if not update_func:
            return jsonify({'success': False, 'error': 'Update operation not available'}), 400
        
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        user = get_user_from_request()
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
    """Delete transaction (LEGACY - will be replaced by corrections)"""
    try:
        is_valid, error = validate_module(module)
        if not is_valid:
            return jsonify({'success': False, 'error': error}), 400
        
        # Check if this should use new correction pattern
        if module in ['purchases', 'material_writeoffs']:
            return jsonify({
                'success': False,
                'error': 'Direct deletion deprecated. Use appropriate correction method.',
                'suggestions': {
                    'purchases': 'Use returns or reversals',
                    'writeoffs': 'Use adjustments'
                }
            }), 400
        
        delete_func = MODULE_OPERATIONS[module].get('delete')
        if not delete_func:
            return jsonify({'success': False, 'error': 'Delete operation not available'}), 400
        
        data = request.get_json() or {}
        reason = data.get('reason', '')
        user = get_user_from_request()
        
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
        is_valid, error = validate_module(module)
        if not is_valid:
            return jsonify({'success': False, 'error': error}), 400
        
        get_func = MODULE_OPERATIONS[module].get('get')
        if not get_func:
            return jsonify({'success': False, 'error': 'Operation not available'}), 400
        
        result = get_func(record_id)
        
        if result.get('success'):
            # Add correction options for new system
            if module == 'purchases':
                permissions = result.get('correction_options', {})
            else:
                permissions = result.get('permissions', {})
            
            return jsonify({
                'success': True,
                'permissions': permissions
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
        is_valid, error = validate_module(module)
        if not is_valid:
            return jsonify({'success': False, 'error': error}), 400
        
        config = get_module_config(module)
        table_name = config.get('table')
        
        conn = get_db_connection()
        cur = conn.cursor()
        
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
    """Get list of available modules with correction capabilities"""
    try:
        modules = []
        for module_name, config in TRANSACTION_MODULES.items():
            module_info = {
                'module': module_name,
                'display_name': config.get('display_name', module_name),
                'table': config.get('table'),
                'type': MODULE_OPERATIONS.get(module_name, {}).get('type', 'unknown'),
                'has_items': 'items_table' in config,
                'supports_boundary': module_name in ['purchases', 'batch', 'blend_batches', 
                                                     'sku_production', 'sku_outbound', 
                                                     'oil_cake_sales', 'material_writeoffs'],
                'correction_methods': []
            }
            
            # Add correction methods based on module
            if module_name == 'purchases':
                module_info['correction_methods'] = ['return', 'reversal', 'adjustment']
            elif module_name == 'material_writeoffs':
                module_info['correction_methods'] = ['adjustment']
            elif module_name in ['batch', 'blend_batches', 'sku_production']:
                module_info['correction_methods'] = ['reversal', 'adjustment']
            elif module_name in ['sku_outbound', 'oil_cake_sales']:
                module_info['correction_methods'] = ['return']
            
            modules.append(module_info)
        
        return jsonify({
            'success': True,
            'modules': modules,
            'total': len(modules),
            'correction_system': 'two-stream'  # Indicate new system is active
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
        is_valid, error = validate_module(module)
        if not is_valid:
            return jsonify({'success': False, 'error': error}), 400
        
        config = get_module_config(module)
        
        safe_config = {
            'module': module,
            'display_name': config.get('display_name'),
            'primary_key': config.get('primary_key'),
            'has_items': 'items_table' in config,
            'immutable_fields': config.get('immutable_fields', []),
            'safe_fields': config.get('safe_fields', {}),
            'cascade_fields': config.get('cascade_fields', {}),
            'list_fields': config.get('list_fields', []),
            'operation_type': MODULE_OPERATIONS.get(module, {}).get('type', 'unknown'),
            'correction_capabilities': {}
        }
        
        # Add correction capabilities
        if module == 'purchases':
            safe_config['correction_capabilities'] = {
                'supports_returns': True,
                'supports_reversals': True,
                'supports_adjustments': True
            }
        elif module == 'material_writeoffs':
            safe_config['correction_capabilities'] = {
                'supports_returns': False,
                'supports_reversals': False,
                'supports_adjustments': True
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
    """Get statistics about transactions and corrections"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        stats = {}
        
        # Get stats for each module
        for module_name, config in TRANSACTION_MODULES.items():
            table = config['table']
            
            # Check which columns exist
            cur.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = %s 
                AND column_name IN ('status', 'boundary_crossed', 'created_at', 'reversal_status')
            """, (table,))
            
            existing_columns = [row[0] for row in cur.fetchall()]
            
            # Build dynamic query
            select_parts = ["COUNT(*) as total"]
            
            if 'status' in existing_columns:
                select_parts.append("COUNT(CASE WHEN status = 'active' THEN 1 END) as active")
                select_parts.append("COUNT(CASE WHEN status = 'deleted' THEN 1 END) as deleted")
            else:
                select_parts.append("COUNT(*) as active")
                select_parts.append("0 as deleted")
            
            if 'created_at' in existing_columns:
                select_parts.append("COUNT(CASE WHEN created_at::date = CURRENT_DATE THEN 1 END) as today")
            else:
                select_parts.append("0 as today")
            
            if 'boundary_crossed' in existing_columns:
                select_parts.append("COUNT(CASE WHEN boundary_crossed = true THEN 1 END) as locked")
            
            # NEW: Add reversal status counts
            if 'reversal_status' in existing_columns:
                select_parts.append("COUNT(CASE WHEN reversal_status = 'reversed' THEN 1 END) as reversed")
                select_parts.append("COUNT(CASE WHEN reversal_status IN ('reversal_entry', 'correction_entry') THEN 1 END) as corrections")
            
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
                
                col_index = 4
                if 'boundary_crossed' in existing_columns:
                    stats[module_name]['locked'] = row[col_index]
                    col_index += 1
                
                if 'reversal_status' in existing_columns:
                    stats[module_name]['reversed'] = row[col_index]
                    stats[module_name]['corrections'] = row[col_index + 1]
        
        # Get return statistics
        cur.execute("""
            SELECT COUNT(*) as total_returns,
                   COUNT(CASE WHEN status = 'draft' THEN 1 END) as pending,
                   COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved
            FROM purchase_returns
        """)
        returns_row = cur.fetchone()
        if returns_row:
            stats['purchase_returns'] = {
                'total': returns_row[0],
                'pending': returns_row[1],
                'approved': returns_row[2]
            }
        
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
    """Health check for Transaction Manager with correction system status"""
    try:
        return jsonify({
            'success': True,
            'status': 'healthy',
            'version': '2.0',
            'correction_system': 'two-stream',
            'modules_loaded': len(MODULE_OPERATIONS),
            'operations_available': [
                'list', 'get', 'edit', 'delete',  # Legacy
                'return', 'reverse', 'adjust',     # New correction methods
                'permissions', 'audit'
            ],
            'features': {
                'purchase_returns': 'enabled',
                'reversals': 'enabled',
                'adjustments': 'enabled',
                'boundary_crossing': 'enabled',
                'field_classification': 'enabled'
            },
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
