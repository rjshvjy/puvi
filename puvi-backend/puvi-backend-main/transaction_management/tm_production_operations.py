"""
Transaction Manager - Production Operations Module
File Path: puvi-backend/puvi-backend-main/transaction_management/tm_production_operations.py
Purpose: Handles edit/delete operations for batch production and blend transactions
Covers: Batch Production (with extended costs), Blend Batches (with components)

This module provides centralized edit/delete functionality for production transactions
following the business rules from the Edit/Delete Strategic Implementation Plan.

FIXED ISSUES:
1. Date formatting - Now uses DUAL FORMAT (Option 3):
   - Sends DD-MM-YYYY as _display fields for user viewing
   - Sends YYYY-MM-DD for HTML date inputs
2. NULL handling - Properly handles missing codes and values
3. Consistent with tm_output_operations.py approach
"""

from flask import jsonify
from decimal import Decimal
from datetime import datetime, date
from db_utils import get_db_connection, close_connection
from utils.date_utils import parse_date, integer_to_date, get_current_day_number
from utils.validation import safe_decimal, safe_float
import json

# ============================================
# CONFIGURATION
# ============================================

BATCH_CONFIG = {
    'table': 'batch',
    'extended_table': 'batch_extended_costs',
    'primary_key': 'batch_id',
    'display_field': 'batch_code',
    'immutable_fields': [
        'batch_id',
        'traceable_code',      # Critical: Flows to SKU
        'batch_code',          # User-facing identifier
        'production_date',     # Part of traceable code
        'seed_material_id',    # Source material
        'seed_purchase_code',  # Link to purchase
        'recipe_id',           # If using recipe
        'oil_type'             # Can't change oil type
    ],
    'safe_fields': [
        'batch_description',
        'notes',
        'remarks',
        'operator_name'
    ],
    'cascade_fields': [
        'seed_quantity_before_drying',
        'seed_quantity_after_drying',
        'drying_loss',
        'oil_yield',
        'oil_yield_percent',
        'oil_cake_yield',
        'oil_cake_yield_percent',
        'sludge_yield',
        'sludge_yield_percent',
        'total_production_cost',
        'net_oil_cost',
        'oil_cost_per_kg',
        'cake_estimated_rate',
        'sludge_estimated_rate'
    ]
}

BLEND_CONFIG = {
    'table': 'blend_batches',
    'components_table': 'blend_batch_components',
    'primary_key': 'blend_id',
    'component_key': 'component_id',
    'display_field': 'blend_code',
    'immutable_fields': [
        'blend_id',
        'blend_code',
        'blend_date',          # Historical record
        'result_oil_type',     # Can't change output type
        'traceable_code'       # If exists
    ],
    'immutable_component_fields': [
        'component_id',
        'blend_id',
        'oil_type',
        'source_type',
        'source_batch_id',
        'quantity_used',       # Affects inventory
        'percentage'           # Blend ratio
    ],
    'safe_fields': {
        'header': [
            'blend_description',
            'notes',
            'created_by'
        ],
        'components': [
            'notes'  # If component has notes field
        ]
    },
    'cascade_fields': {
        'header': [
            'total_quantity',
            'weighted_avg_cost'
        ],
        'components': [
            'cost_per_unit'
        ]
    }
}

# ============================================
# SHARED UTILITIES
# ============================================

def log_transaction_audit(conn, cur, table_name, record_id, action, 
                         old_values=None, new_values=None, changed_by='System', reason=None):
    """Log transaction changes to audit trail"""
    try:
        cur.execute("""
            INSERT INTO transaction_audit_log (
                table_name, record_id, action, module,
                old_values, new_values, changed_by,
                reason, changed_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
        """, (
            table_name,
            record_id,
            action,
            'production',
            json.dumps(old_values) if old_values else None,
            json.dumps(new_values) if new_values else None,
            changed_by,
            reason
        ))
    except Exception as e:
        print(f"Audit logging failed: {str(e)}")

def check_batch_dependencies(batch_id, cur):
    """Check if batch has downstream dependencies"""
    dependencies = {
        'sku_allocations': 0,
        'blend_components': 0,
        'cake_sales': 0,
        'has_dependencies': False
    }
    
    # Check SKU oil allocations
    cur.execute("""
        SELECT COUNT(*) FROM sku_oil_allocation 
        WHERE source_type = 'batch' AND source_id = %s
    """, (batch_id,))
    dependencies['sku_allocations'] = cur.fetchone()[0]
    
    # Check blend components
    cur.execute("""
        SELECT COUNT(*) FROM blend_batch_components 
        WHERE source_batch_id = %s AND status = 'active'
    """, (batch_id,))
    dependencies['blend_components'] = cur.fetchone()[0]
    
    # Check oil cake sales through allocations
    cur.execute("""
        SELECT COUNT(*) FROM oil_cake_sale_allocations 
        WHERE batch_id = %s
    """, (batch_id,))
    dependencies['cake_sales'] = cur.fetchone()[0]
    
    dependencies['has_dependencies'] = (
        dependencies['sku_allocations'] > 0 or 
        dependencies['blend_components'] > 0 or
        dependencies['cake_sales'] > 0
    )
    
    return dependencies

def check_blend_dependencies(blend_id, cur):
    """Check if blend has downstream dependencies"""
    dependencies = {
        'sku_allocations': 0,
        'has_dependencies': False
    }
    
    # Check SKU oil allocations
    cur.execute("""
        SELECT COUNT(*) FROM sku_oil_allocation 
        WHERE source_type = 'blend' AND source_id = %s
    """, (blend_id,))
    dependencies['sku_allocations'] = cur.fetchone()[0]
    
    dependencies['has_dependencies'] = dependencies['sku_allocations'] > 0
    
    return dependencies

# ============================================
# BATCH OPERATIONS
# ============================================

def get_batch_for_edit(batch_id):
    """Get batch details for editing with proper date formatting"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get batch header
        cur.execute("""
            SELECT b.*, m.material_name as seed_material_name
            FROM batch b
            LEFT JOIN materials m ON b.seed_material_id = m.material_id
            WHERE b.batch_id = %s AND b.status = 'active'
        """, (batch_id,))
        
        columns = [desc[0] for desc in cur.description]
        batch_data = cur.fetchone()
        
        if not batch_data:
            return {'success': False, 'error': 'Batch not found or deleted'}
        
        batch = dict(zip(columns, batch_data))
        
        # Option 3: Dual format - display and input fields
        if batch.get('production_date'):
            # Display format for user to see (DD-MM-YYYY)
            batch['production_date_display'] = integer_to_date(batch['production_date'], '%d-%m-%Y')
            # Input format for HTML date input (YYYY-MM-DD)
            batch['production_date'] = integer_to_date(batch['production_date'], '%Y-%m-%d')
        
        # Handle NULL values for codes
        if not batch.get('batch_code'):
            batch['batch_code'] = ''
        if not batch.get('traceable_code'):
            batch['traceable_code'] = ''
        if not batch.get('seed_purchase_code'):
            batch['seed_purchase_code'] = ''
        
        # Get extended costs
        cur.execute("""
            SELECT bec.*, cem.category, cem.unit_type
            FROM batch_extended_costs bec
            LEFT JOIN cost_elements_master cem ON bec.element_id = cem.element_id
            WHERE bec.batch_id = %s AND bec.status = 'active'
            ORDER BY bec.cost_id
        """, (batch_id,))
        
        costs = []
        for row in cur.fetchall():
            cost_cols = [desc[0] for desc in cur.description]
            cost = dict(zip(cost_cols, row))
            costs.append(cost)
        
        batch['extended_costs'] = costs
        
        # Check permissions
        dependencies = check_batch_dependencies(batch_id, cur)
        boundary_crossed = batch.get('boundary_crossed', False)
        created_at = batch.get('created_at')
        
        # Determine edit status
        is_same_day = False
        if created_at:
            if isinstance(created_at, datetime):
                is_same_day = created_at.date() == datetime.now().date()
        
        permissions = {
            'can_edit': not boundary_crossed,
            'can_delete': not boundary_crossed and not dependencies['has_dependencies'] and is_same_day,
            'editable_fields': [],
            'reason': ''
        }
        
        if boundary_crossed:
            permissions['reason'] = 'Transaction locked - external document exists'
        elif dependencies['has_dependencies']:
            permissions['can_edit'] = True
            permissions['editable_fields'] = BATCH_CONFIG['safe_fields']
            permissions['reason'] = f"Limited edit - used in {dependencies['sku_allocations']} SKUs, {dependencies['blend_components']} blends"
        else:
            permissions['editable_fields'] = 'all_except_immutable'
            permissions['reason'] = 'Full edit allowed'
        
        return {
            'success': True,
            'batch': batch,
            'permissions': permissions,
            'dependencies': dependencies
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

def update_batch(batch_id, data, user='System'):
    """Update batch production record"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get current batch data
        cur.execute("""
            SELECT * FROM batch 
            WHERE batch_id = %s AND status = 'active'
        """, (batch_id,))
        
        columns = [desc[0] for desc in cur.description]
        current_data = cur.fetchone()
        
        if not current_data:
            return {'success': False, 'error': 'Batch not found'}
        
        current = dict(zip(columns, current_data))
        
        # Check permissions
        dependencies = check_batch_dependencies(batch_id, cur)
        boundary_crossed = current.get('boundary_crossed', False)
        
        if boundary_crossed:
            return {'success': False, 'error': 'Cannot edit - transaction locked'}
        
        # Begin transaction
        cur.execute("BEGIN")
        
        # Build update query
        update_fields = []
        update_values = []
        old_values = {}
        new_values = {}
        
        # Process main batch fields
        for field, value in data.items():
            if field in ['batch_id', 'status', 'created_at'] or field in BATCH_CONFIG['immutable_fields']:
                continue
                
            # Check if field can be edited
            if dependencies['has_dependencies'] and field not in BATCH_CONFIG['safe_fields']:
                continue
            
            # Parse dates if needed
            if field == 'production_date' and isinstance(value, str):
                value = parse_date(value)
            
            # Track changes
            if current.get(field) != value:
                old_values[field] = current.get(field)
                new_values[field] = value
                update_fields.append(f"{field} = %s")
                update_values.append(value)
        
        # Add edit tracking
        update_fields.append("edited_by = %s")
        update_values.append(user)
        update_fields.append("edited_at = CURRENT_TIMESTAMP")
        
        # Execute update if there are changes
        if update_fields:
            update_values.append(batch_id)
            query = f"UPDATE batch SET {', '.join(update_fields)} WHERE batch_id = %s"
            cur.execute(query, update_values)
            
            # Log audit
            log_transaction_audit(
                conn, cur, 'batch', batch_id, 'UPDATE',
                old_values, new_values, user, data.get('edit_reason')
            )
        
        # Handle extended costs if provided
        if 'extended_costs' in data:
            for cost_item in data['extended_costs']:
                cost_id = cost_item.get('cost_id')
                
                if cost_id:
                    # Update existing cost
                    cur.execute("""
                        UPDATE batch_extended_costs
                        SET quantity_or_hours = %s,
                            rate_used = %s,
                            total_cost = %s,
                            edited_by = %s,
                            edited_at = CURRENT_TIMESTAMP
                        WHERE cost_id = %s AND batch_id = %s
                    """, (
                        safe_float(cost_item.get('quantity_or_hours', 0)),
                        safe_float(cost_item.get('rate_used', 0)),
                        safe_float(cost_item.get('total_cost', 0)),
                        user,
                        cost_id,
                        batch_id
                    ))
        
        # Update oil cake inventory if yield changed
        if 'oil_cake_yield' in new_values:
            old_yield = float(old_values.get('oil_cake_yield', 0))
            new_yield = float(new_values.get('oil_cake_yield', 0))
            yield_diff = new_yield - old_yield
            
            if yield_diff != 0:
                cur.execute("""
                    UPDATE oil_cake_inventory
                    SET quantity_produced = quantity_produced + %s,
                        quantity_remaining = quantity_remaining + %s
                    WHERE batch_id = %s
                """, (yield_diff, yield_diff, batch_id))
        
        conn.commit()
        
        return {
            'success': True,
            'message': f'Batch {current["batch_code"]} updated successfully',
            'changes': new_values
        }
        
    except Exception as e:
        conn.rollback()
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

def soft_delete_batch(batch_id, reason='', user='System'):
    """Soft delete batch production record"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get batch details
        cur.execute("""
            SELECT * FROM batch 
            WHERE batch_id = %s AND status = 'active'
        """, (batch_id,))
        
        columns = [desc[0] for desc in cur.description]
        batch_data = cur.fetchone()
        
        if not batch_data:
            return {'success': False, 'error': 'Batch not found'}
        
        batch = dict(zip(columns, batch_data))
        
        # Check dependencies
        dependencies = check_batch_dependencies(batch_id, cur)
        if dependencies['has_dependencies']:
            return {
                'success': False,
                'error': f"Cannot delete - batch used in {dependencies['sku_allocations']} SKUs, {dependencies['blend_components']} blends"
            }
        
        # Check boundary
        if batch.get('boundary_crossed'):
            return {'success': False, 'error': 'Cannot delete - transaction locked'}
        
        # Begin transaction
        cur.execute("BEGIN")
        
        # Soft delete batch
        cur.execute("""
            UPDATE batch 
            SET status = 'deleted',
                edited_by = %s,
                edited_at = CURRENT_TIMESTAMP
            WHERE batch_id = %s
        """, (user, batch_id))
        
        # Soft delete extended costs
        cur.execute("""
            UPDATE batch_extended_costs
            SET status = 'deleted',
                edited_by = %s,
                edited_at = CURRENT_TIMESTAMP
            WHERE batch_id = %s
        """, (user, batch_id))
        
        # Reverse inventory updates
        # 1. Add seed back to inventory
        if batch['seed_material_id'] and batch['seed_quantity_before_drying']:
            cur.execute("""
                UPDATE inventory
                SET closing_stock = closing_stock + %s,
                    consumption = consumption - %s,
                    last_updated = %s
                WHERE material_id = %s
            """, (
                float(batch['seed_quantity_before_drying']),
                float(batch['seed_quantity_before_drying']),
                get_current_day_number(),
                batch['seed_material_id']
            ))
        
        # 2. Remove oil from inventory
        if batch['oil_yield'] and batch['oil_type']:
            cur.execute("""
                UPDATE inventory
                SET closing_stock = closing_stock - %s,
                    last_updated = %s
                WHERE oil_type = %s 
                    AND is_bulk_oil = true
                    AND source_type = 'extraction'
                ORDER BY inventory_id DESC
                LIMIT 1
            """, (
                float(batch['oil_yield']),
                get_current_day_number(),
                batch['oil_type']
            ))
        
        # 3. Remove oil cake from inventory
        cur.execute("""
            UPDATE oil_cake_inventory
            SET status = 'deleted'
            WHERE batch_id = %s
        """, (batch_id,))
        
        # Log audit
        log_transaction_audit(
            conn, cur, 'batch', batch_id, 'DELETE',
            batch, None, user, reason
        )
        
        conn.commit()
        
        return {
            'success': True,
            'message': f'Batch {batch["batch_code"]} deleted successfully'
        }
        
    except Exception as e:
        conn.rollback()
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

def list_batches_with_status(filters=None):
    """List batches with edit/delete status - Handle NULLs"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        query = """
            SELECT 
                b.batch_id,
                COALESCE(b.batch_code, ''),
                b.oil_type,
                b.production_date,
                b.oil_yield as oil_produced,
                b.oil_cake_yield as cake_produced,
                b.status,
                b.boundary_crossed,
                b.created_at,
                m.material_name as seed_material,
                COALESCE(b.traceable_code, ''),
                CASE 
                    WHEN b.boundary_crossed = true THEN 'locked'
                    WHEN EXISTS (
                        SELECT 1 FROM sku_oil_allocation 
                        WHERE source_type = 'batch' AND source_id = b.batch_id
                    ) OR EXISTS (
                        SELECT 1 FROM blend_batch_components 
                        WHERE source_batch_id = b.batch_id AND status = 'active'
                    ) THEN 'partial'
                    WHEN b.created_at::date = CURRENT_DATE THEN 'editable'
                    ELSE 'editable'
                END as edit_status
            FROM batch b
            LEFT JOIN materials m ON b.seed_material_id = m.material_id
            WHERE b.status = 'active'
        """
        
        params = []
        if filters:
            if filters.get('oil_type'):
                query += " AND b.oil_type = %s"
                params.append(filters['oil_type'])
            if filters.get('start_date'):
                query += " AND b.production_date >= %s"
                params.append(parse_date(filters['start_date']))
            if filters.get('end_date'):
                query += " AND b.production_date <= %s"
                params.append(parse_date(filters['end_date']))
        
        query += " ORDER BY b.production_date DESC, b.batch_id DESC LIMIT 100"
        
        cur.execute(query, params)
        
        batches = []
        for row in cur.fetchall():
            batches.append({
                'batch_id': row[0],
                'batch_code': row[1] or f'BATCH-{row[0]}',  # Generate if NULL
                'oil_type': row[2] or '',
                'production_date': integer_to_date(row[3], '%d-%m-%Y') if row[3] else None,
                'oil_produced': float(row[4]) if row[4] else 0,
                'cake_produced': float(row[5]) if row[5] else 0,
                'status': row[6],
                'boundary_crossed': row[7],
                'seed_material': row[9] or '',
                'traceable_code': row[10] or '',
                'edit_status': row[11]
            })
        
        return {
            'success': True,
            'batches': batches,
            'count': len(batches)
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

# ============================================
# BLEND OPERATIONS
# ============================================

def get_blend_for_edit(blend_id):
    """Get blend details for editing with proper date formatting"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get blend header
        cur.execute("""
            SELECT * FROM blend_batches
            WHERE blend_id = %s AND status = 'active'
        """, (blend_id,))
        
        columns = [desc[0] for desc in cur.description]
        blend_data = cur.fetchone()
        
        if not blend_data:
            return {'success': False, 'error': 'Blend not found or deleted'}
        
        blend = dict(zip(columns, blend_data))
        
        # Option 3: Dual format - display and input fields
        if blend.get('blend_date'):
            # Display format for user to see (DD-MM-YYYY)
            blend['blend_date_display'] = integer_to_date(blend['blend_date'], '%d-%m-%Y')
            # Input format for HTML date input (YYYY-MM-DD)
            blend['blend_date'] = integer_to_date(blend['blend_date'], '%Y-%m-%d')
        
        # Handle NULL values for codes
        if not blend.get('blend_code'):
            blend['blend_code'] = ''
        if not blend.get('traceable_code'):
            blend['traceable_code'] = ''
        
        # Get components
        cur.execute("""
            SELECT bbc.*, b.batch_code
            FROM blend_batch_components bbc
            LEFT JOIN batch b ON bbc.source_batch_id = b.batch_id
            WHERE bbc.blend_id = %s AND bbc.status = 'active'
            ORDER BY bbc.percentage DESC
        """, (blend_id,))
        
        components = []
        for row in cur.fetchall():
            comp_cols = [desc[0] for desc in cur.description]
            component = dict(zip(comp_cols, row))
            # Handle NULL batch codes
            if not component.get('batch_code'):
                component['batch_code'] = ''
            components.append(component)
        
        blend['components'] = components
        
        # Check permissions
        dependencies = check_blend_dependencies(blend_id, cur)
        boundary_crossed = blend.get('boundary_crossed', False)
        created_at = blend.get('created_at')
        
        # Determine edit status
        is_same_day = False
        if created_at:
            if isinstance(created_at, datetime):
                is_same_day = created_at.date() == datetime.now().date()
        
        permissions = {
            'can_edit': not boundary_crossed,
            'can_delete': not boundary_crossed and not dependencies['has_dependencies'] and is_same_day,
            'editable_fields': [],
            'reason': ''
        }
        
        if boundary_crossed:
            permissions['reason'] = 'Transaction locked - external document exists'
        elif dependencies['has_dependencies']:
            permissions['can_edit'] = True
            permissions['editable_fields'] = BLEND_CONFIG['safe_fields']['header']
            permissions['reason'] = f"Limited edit - used in {dependencies['sku_allocations']} SKUs"
        else:
            permissions['editable_fields'] = 'all_except_immutable'
            permissions['reason'] = 'Full edit allowed'
        
        return {
            'success': True,
            'blend': blend,
            'permissions': permissions,
            'dependencies': dependencies
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

def update_blend(blend_id, data, user='System'):
    """Update blend record"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get current blend data
        cur.execute("""
            SELECT * FROM blend_batches 
            WHERE blend_id = %s AND status = 'active'
        """, (blend_id,))
        
        columns = [desc[0] for desc in cur.description]
        current_data = cur.fetchone()
        
        if not current_data:
            return {'success': False, 'error': 'Blend not found'}
        
        current = dict(zip(columns, current_data))
        
        # Check permissions
        dependencies = check_blend_dependencies(blend_id, cur)
        boundary_crossed = current.get('boundary_crossed', False)
        
        if boundary_crossed:
            return {'success': False, 'error': 'Cannot edit - transaction locked'}
        
        # Begin transaction
        cur.execute("BEGIN")
        
        # Build update query for blend header
        update_fields = []
        update_values = []
        old_values = {}
        new_values = {}
        
        for field, value in data.items():
            if field in ['blend_id', 'status', 'created_at'] or field in BLEND_CONFIG['immutable_fields']:
                continue
            
            # Check if field can be edited
            if dependencies['has_dependencies']:
                if field not in BLEND_CONFIG['safe_fields']['header']:
                    continue
            
            # Parse dates if needed
            if field == 'blend_date' and isinstance(value, str):
                value = parse_date(value)
            
            # Track changes
            if current.get(field) != value:
                old_values[field] = current.get(field)
                new_values[field] = value
                update_fields.append(f"{field} = %s")
                update_values.append(value)
        
        # Add edit tracking
        update_fields.append("edited_by = %s")
        update_values.append(user)
        update_fields.append("edited_at = CURRENT_TIMESTAMP")
        
        # Execute update if there are changes
        if update_fields:
            update_values.append(blend_id)
            query = f"UPDATE blend_batches SET {', '.join(update_fields)} WHERE blend_id = %s"
            cur.execute(query, update_values)
            
            # Log audit
            log_transaction_audit(
                conn, cur, 'blend_batches', blend_id, 'UPDATE',
                old_values, new_values, user, data.get('edit_reason')
            )
        
        conn.commit()
        
        return {
            'success': True,
            'message': f'Blend {current["blend_code"]} updated successfully',
            'changes': new_values
        }
        
    except Exception as e:
        conn.rollback()
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

def soft_delete_blend(blend_id, reason='', user='System'):
    """Soft delete blend record"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get blend details
        cur.execute("""
            SELECT * FROM blend_batches 
            WHERE blend_id = %s AND status = 'active'
        """, (blend_id,))
        
        columns = [desc[0] for desc in cur.description]
        blend_data = cur.fetchone()
        
        if not blend_data:
            return {'success': False, 'error': 'Blend not found'}
        
        blend = dict(zip(columns, blend_data))
        
        # Check dependencies
        dependencies = check_blend_dependencies(blend_id, cur)
        if dependencies['has_dependencies']:
            return {
                'success': False,
                'error': f"Cannot delete - blend used in {dependencies['sku_allocations']} SKU productions"
            }
        
        # Check boundary
        if blend.get('boundary_crossed'):
            return {'success': False, 'error': 'Cannot delete - transaction locked'}
        
        # Begin transaction
        cur.execute("BEGIN")
        
        # Get components for reversal
        cur.execute("""
            SELECT * FROM blend_batch_components
            WHERE blend_id = %s AND status = 'active'
        """, (blend_id,))
        
        components = cur.fetchall()
        
        # Soft delete blend
        cur.execute("""
            UPDATE blend_batches 
            SET status = 'deleted',
                edited_by = %s,
                edited_at = CURRENT_TIMESTAMP
            WHERE blend_id = %s
        """, (user, blend_id))
        
        # Soft delete components
        cur.execute("""
            UPDATE blend_batch_components
            SET status = 'deleted',
                edited_by = %s,
                edited_at = CURRENT_TIMESTAMP
            WHERE blend_id = %s
        """, (user, blend_id))
        
        # Reverse oil inventory update
        if blend['total_quantity'] and blend['result_oil_type']:
            cur.execute("""
                UPDATE inventory
                SET closing_stock = closing_stock - %s,
                    last_updated = %s
                WHERE oil_type = %s 
                    AND is_bulk_oil = true
                    AND source_type = 'blend'
                ORDER BY inventory_id DESC
                LIMIT 1
            """, (
                float(blend['total_quantity']),
                get_current_day_number(),
                blend['result_oil_type']
            ))
        
        # Log audit
        log_transaction_audit(
            conn, cur, 'blend_batches', blend_id, 'DELETE',
            blend, None, user, reason
        )
        
        conn.commit()
        
        return {
            'success': True,
            'message': f'Blend {blend["blend_code"]} deleted successfully'
        }
        
    except Exception as e:
        conn.rollback()
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

def list_blends_with_status(filters=None):
    """List blends with edit/delete status - Handle NULLs"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        query = """
            SELECT 
                bb.blend_id,
                COALESCE(bb.blend_code, ''),
                bb.result_oil_type,
                bb.blend_date,
                bb.total_quantity,
                bb.weighted_avg_cost,
                bb.status,
                bb.boundary_crossed,
                bb.created_at,
                COALESCE(bb.traceable_code, ''),
                CASE 
                    WHEN bb.boundary_crossed = true THEN 'locked'
                    WHEN EXISTS (
                        SELECT 1 FROM sku_oil_allocation 
                        WHERE source_type = 'blend' AND source_id = bb.blend_id
                    ) THEN 'partial'
                    WHEN bb.created_at::date = CURRENT_DATE THEN 'editable'
                    ELSE 'editable'
                END as edit_status
            FROM blend_batches bb
            WHERE bb.status = 'active'
        """
        
        params = []
        if filters:
            if filters.get('oil_type'):
                query += " AND bb.result_oil_type = %s"
                params.append(filters['oil_type'])
            if filters.get('start_date'):
                query += " AND bb.blend_date >= %s"
                params.append(parse_date(filters['start_date']))
            if filters.get('end_date'):
                query += " AND bb.blend_date <= %s"
                params.append(parse_date(filters['end_date']))
        
        query += " ORDER BY bb.blend_date DESC, bb.blend_id DESC LIMIT 100"
        
        cur.execute(query, params)
        
        blends = []
        for row in cur.fetchall():
            blends.append({
                'blend_id': row[0],
                'blend_code': row[1] or f'BLEND-{row[0]}',  # Generate if NULL
                'result_oil_type': row[2] or '',
                'blend_date': integer_to_date(row[3], '%d-%m-%Y') if row[3] else None,
                'total_quantity': float(row[4]) if row[4] else 0,
                'weighted_avg_cost': float(row[5]) if row[5] else 0,
                'status': row[6],
                'boundary_crossed': row[7],
                'traceable_code': row[9] or '',
                'edit_status': row[10]
            })
        
        return {
            'success': True,
            'blends': blends,
            'count': len(blends)
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

# ============================================
# MODULE EXPORTS
# ============================================

__all__ = [
    # Batch operations
    'get_batch_for_edit',
    'update_batch',
    'soft_delete_batch',
    'list_batches_with_status',
    # Blend operations
    'get_blend_for_edit',
    'update_blend',
    'soft_delete_blend',
    'list_blends_with_status',
    # Utilities
    'check_batch_dependencies',
    'check_blend_dependencies'
]
