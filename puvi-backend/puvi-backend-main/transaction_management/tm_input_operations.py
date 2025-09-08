"""
Transaction Manager - Input Operations Module
File Path: puvi-backend/puvi-backend-main/transaction_management/tm_input_operations.py
Purpose: Handles edit/delete operations for purchase and writeoff transactions
Covers: Purchases (multi-item), Material Writeoffs, SKU Writeoffs, Oil Cake Writeoffs, Sludge Writeoffs

This module provides centralized edit/delete functionality for all input transactions
following the business rules from the Edit/Delete Strategic Implementation Plan.
"""

from flask import jsonify
from decimal import Decimal
from datetime import datetime, date
from db_utils import get_db_connection, close_connection
from utils.date_utils import parse_date, integer_to_date, get_current_day_number
from utils.validation import safe_decimal, safe_float

# ============================================
# CONFIGURATION
# ============================================

PURCHASE_CONFIG = {
    'table': 'purchases',
    'items_table': 'purchase_items',
    'primary_key': 'purchase_id',
    'item_key': 'item_id',
    'immutable_fields': [
        'traceable_code', 
        'purchase_date', 
        'supplier_id',
        'material_id',  # In items table
        'quantity',     # In items table - affects inventory
        'rate'          # In items table - affects costing
    ],
    'safe_fields': {
        'header': ['invoice_ref', 'transport_cost', 'loading_charges'],
        'items': ['transport_charges', 'handling_charges']
    },
    'cascade_fields': {
        'header': ['subtotal', 'total_gst_amount', 'total_cost'],
        'items': ['amount', 'gst_rate', 'gst_amount', 'total_amount', 'landed_cost_per_unit']
    }
}

WRITEOFF_CONFIG = {
    'table': 'material_writeoffs',
    'primary_key': 'writeoff_id',
    'immutable_fields': [
        'material_id',
        'writeoff_date',
        'quantity',
        'reference_type',
        'reference_id'
    ],
    'safe_fields': [
        'reason_code',
        'reason_description', 
        'notes',
        'scrap_value'
    ],
    'cascade_fields': [
        'weighted_avg_cost',
        'total_cost',
        'net_loss'
    ]
}

# ============================================
# AUDIT LOGGING
# ============================================

def log_transaction_audit(conn, cur, table_name, record_id, action, 
                         old_values=None, new_values=None, changed_by='System', reason=None):
    """
    Log transaction changes to audit trail
    
    Args:
        conn: Database connection
        cur: Database cursor
        table_name: Name of the table being modified
        record_id: ID of the record being modified
        action: Type of action (UPDATE, DELETE, etc.)
        old_values: Dictionary of old values
        new_values: Dictionary of new values
        changed_by: User making the change
        reason: Reason for the change
    """
    try:
        import json
        
        cur.execute("""
            INSERT INTO transaction_audit_log (
                table_name, record_id, action,
                old_values, new_values, changed_by,
                change_reason, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
        """, (
            table_name,
            record_id,
            action,
            json.dumps(old_values) if old_values else None,
            json.dumps(new_values) if new_values else None,
            changed_by,
            reason
        ))
    except Exception as e:
        print(f"Audit logging failed: {str(e)}")
        # Don't fail the main operation if audit fails

# ============================================
# PERMISSION CHECKING
# ============================================

def check_edit_permissions(table_name, record_id, cur):
    """
    Check if a record can be edited based on business rules
    
    Returns:
        dict: Permission details including what can be edited
    """
    result = {
        'can_edit': False,
        'can_delete': False,
        'editable_fields': [],
        'reason': '',
        'is_same_day': False,
        'has_dependencies': False,
        'boundary_crossed': False
    }
    
    # Check if boundary_crossed flag is set
    if table_name == 'purchases':
        cur.execute("""
            SELECT boundary_crossed, created_at, supplier_id, purchase_date
            FROM purchases
            WHERE purchase_id = %s AND status = 'active'
        """, (record_id,))
    elif table_name == 'material_writeoffs':
        cur.execute("""
            SELECT boundary_crossed, created_at, material_id, writeoff_date
            FROM material_writeoffs
            WHERE writeoff_id = %s AND status = 'active'
        """, (record_id,))
    else:
        return result
    
    row = cur.fetchone()
    if not row:
        result['reason'] = 'Record not found or already deleted'
        return result
    
    boundary_crossed = row[0] if row[0] is not None else False
    created_at = row[1]
    
    # Check if boundary crossed (invoice sent, etc.)
    if boundary_crossed:
        result['boundary_crossed'] = True
        result['reason'] = 'Transaction locked - external document exists'
        return result
    
    # Check if same day entry
    if created_at:
        current_date = datetime.now().date()
        entry_date = created_at.date() if isinstance(created_at, datetime) else created_at
        result['is_same_day'] = (entry_date == current_date)
    
    # Check dependencies
    if table_name == 'purchases':
        # Check if purchase is used in batch production
        cur.execute("""
            SELECT COUNT(*) FROM batch 
            WHERE seed_purchase_code IN (
                SELECT traceable_code FROM purchases WHERE purchase_id = %s
            )
        """, (record_id,))
        has_batch = cur.fetchone()[0] > 0
        result['has_dependencies'] = has_batch
        
    elif table_name == 'material_writeoffs':
        # Writeoffs typically don't have downstream dependencies
        result['has_dependencies'] = False
    
    # Determine permissions based on rules
    if result['is_same_day'] and not result['has_dependencies']:
        result['can_edit'] = True
        result['can_delete'] = True
        result['editable_fields'] = 'all'
        result['reason'] = 'Same day entry - full edit/delete allowed'
    elif result['has_dependencies']:
        result['can_edit'] = True
        result['can_delete'] = False
        if table_name == 'purchases':
            result['editable_fields'] = PURCHASE_CONFIG['safe_fields']['header'] + ['item_charges']
        else:
            result['editable_fields'] = WRITEOFF_CONFIG['safe_fields']
        result['reason'] = 'Has dependencies - limited edit only'
    else:
        result['can_edit'] = True
        result['can_delete'] = True
        result['editable_fields'] = 'all'
        result['reason'] = 'No dependencies - full edit/delete allowed'
    
    return result

# ============================================
# PURCHASE OPERATIONS
# ============================================

def get_purchase_for_edit(purchase_id):
    """
    Get purchase details for editing
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get purchase header
        cur.execute("""
            SELECT 
                p.*,
                s.supplier_name,
                TO_CHAR(p.created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at_str
            FROM purchases p
            JOIN suppliers s ON p.supplier_id = s.supplier_id
            WHERE p.purchase_id = %s AND p.status = 'active'
        """, (purchase_id,))
        
        columns = [desc[0] for desc in cur.description]
        row = cur.fetchone()
        
        if not row:
            return {'success': False, 'error': 'Purchase not found or deleted'}
        
        purchase = dict(zip(columns, row))
        
        # Convert dates
        if purchase['purchase_date']:
            purchase['purchase_date_display'] = integer_to_date(purchase['purchase_date'])
        
        # Get purchase items
        cur.execute("""
            SELECT 
                pi.*,
                m.material_name,
                m.unit,
                m.category
            FROM purchase_items pi
            JOIN materials m ON pi.material_id = m.material_id
            WHERE pi.purchase_id = %s
            ORDER BY pi.item_id
        """, (purchase_id,))
        
        item_columns = [desc[0] for desc in cur.description]
        items = []
        for item_row in cur.fetchall():
            item = dict(zip(item_columns, item_row))
            items.append(item)
        
        purchase['items'] = items
        
        # Check permissions
        permissions = check_edit_permissions('purchases', purchase_id, cur)
        
        return {
            'success': True,
            'purchase': purchase,
            'permissions': permissions
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

def update_purchase(purchase_id, updates, user='System'):
    """
    Update purchase with validation
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Check permissions
        permissions = check_edit_permissions('purchases', purchase_id, cur)
        
        if not permissions['can_edit']:
            return {
                'success': False,
                'error': permissions['reason']
            }
        
        # Get current values for audit
        cur.execute("SELECT * FROM purchases WHERE purchase_id = %s", (purchase_id,))
        columns = [desc[0] for desc in cur.description]
        old_row = cur.fetchone()
        if not old_row:
            return {'success': False, 'error': 'Purchase not found'}
        
        old_values = dict(zip(columns, old_row))
        
        cur.execute("BEGIN")
        
        # Build update query for header
        header_updates = {}
        for field, value in updates.get('header', {}).items():
            # Check if field is editable
            if permissions['editable_fields'] == 'all' or field in permissions['editable_fields']:
                if field not in PURCHASE_CONFIG['immutable_fields']:
                    header_updates[field] = value
        
        if header_updates:
            set_clauses = [f"{field} = %s" for field in header_updates.keys()]
            set_clauses.append("edited_at = CURRENT_TIMESTAMP")
            set_clauses.append("edited_by = %s")
            
            values = list(header_updates.values())
            values.append(user)
            values.append(purchase_id)
            
            query = f"""
                UPDATE purchases 
                SET {', '.join(set_clauses)}
                WHERE purchase_id = %s
            """
            cur.execute(query, values)
        
        # Handle item updates
        for item_update in updates.get('items', []):
            item_id = item_update.get('item_id')
            if not item_id:
                continue
            
            item_fields = {}
            for field, value in item_update.items():
                if field == 'item_id':
                    continue
                # Only allow safe fields for items when dependencies exist
                if permissions['has_dependencies']:
                    if field in PURCHASE_CONFIG['safe_fields']['items']:
                        item_fields[field] = value
                elif field not in PURCHASE_CONFIG['immutable_fields']:
                    item_fields[field] = value
            
            if item_fields:
                set_clauses = [f"{field} = %s" for field in item_fields.keys()]
                values = list(item_fields.values())
                values.append(item_id)
                
                query = f"""
                    UPDATE purchase_items
                    SET {', '.join(set_clauses)}
                    WHERE item_id = %s
                """
                cur.execute(query, values)
        
        # Log audit
        log_transaction_audit(
            conn, cur, 'purchases', purchase_id, 'UPDATE',
            old_values=old_values,
            new_values=updates,
            changed_by=user,
            reason='Transaction Manager Edit'
        )
        
        conn.commit()
        
        return {
            'success': True,
            'message': 'Purchase updated successfully'
        }
        
    except Exception as e:
        conn.rollback()
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

def delete_purchase(purchase_id, reason='', user='System'):
    """
    Soft delete purchase
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Check permissions
        permissions = check_edit_permissions('purchases', purchase_id, cur)
        
        if not permissions['can_delete']:
            return {
                'success': False,
                'error': permissions['reason']
            }
        
        cur.execute("BEGIN")
        
        # Get current values for audit
        cur.execute("SELECT * FROM purchases WHERE purchase_id = %s", (purchase_id,))
        columns = [desc[0] for desc in cur.description]
        old_row = cur.fetchone()
        if not old_row:
            return {'success': False, 'error': 'Purchase not found'}
        
        old_values = dict(zip(columns, old_row))
        
        # Soft delete
        cur.execute("""
            UPDATE purchases
            SET status = 'deleted',
                edited_at = CURRENT_TIMESTAMP,
                edited_by = %s
            WHERE purchase_id = %s
        """, (user, purchase_id))
        
        # Also mark items as deleted
        cur.execute("""
            UPDATE purchase_items
            SET status = 'deleted'
            WHERE purchase_id = %s
        """, (purchase_id,))
        
        # Log audit
        log_transaction_audit(
            conn, cur, 'purchases', purchase_id, 'DELETE',
            old_values=old_values,
            changed_by=user,
            reason=reason or 'Transaction Manager Delete'
        )
        
        conn.commit()
        
        return {
            'success': True,
            'message': 'Purchase deleted successfully'
        }
        
    except Exception as e:
        conn.rollback()
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

# ============================================
# WRITEOFF OPERATIONS
# ============================================

def get_writeoff_for_edit(writeoff_id):
    """
    Get writeoff details for editing
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get writeoff details with related info
        cur.execute("""
            SELECT 
                w.*,
                CASE 
                    WHEN w.material_id IS NOT NULL THEN m.material_name
                    WHEN w.reference_type = 'oil_cake' THEN 'Oil Cake - ' || b.oil_type
                    WHEN w.reference_type = 'sludge' THEN 'Sludge - ' || b.oil_type  
                    WHEN w.reference_type = 'sku' THEN sm.product_name
                    ELSE 'Unknown'
                END as item_name,
                CASE
                    WHEN w.material_id IS NOT NULL THEN m.unit
                    WHEN w.reference_type = 'sku' THEN 'bottles'
                    ELSE 'kg'
                END as unit,
                TO_CHAR(w.created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at_str
            FROM material_writeoffs w
            LEFT JOIN materials m ON w.material_id = m.material_id
            LEFT JOIN batch b ON w.reference_type IN ('oil_cake', 'sludge') 
                AND w.reference_id = b.batch_id
            LEFT JOIN sku_inventory si ON w.reference_type = 'sku' 
                AND w.reference_id = si.inventory_id
            LEFT JOIN sku_master sm ON si.sku_id = sm.sku_id
            WHERE w.writeoff_id = %s AND w.status = 'active'
        """, (writeoff_id,))
        
        columns = [desc[0] for desc in cur.description]
        row = cur.fetchone()
        
        if not row:
            return {'success': False, 'error': 'Writeoff not found or deleted'}
        
        writeoff = dict(zip(columns, row))
        
        # Convert dates
        if writeoff['writeoff_date']:
            writeoff['writeoff_date_display'] = integer_to_date(writeoff['writeoff_date'])
        
        # Check permissions
        permissions = check_edit_permissions('material_writeoffs', writeoff_id, cur)
        
        return {
            'success': True,
            'writeoff': writeoff,
            'permissions': permissions
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

def update_writeoff(writeoff_id, updates, user='System'):
    """
    Update writeoff with validation
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Check permissions
        permissions = check_edit_permissions('material_writeoffs', writeoff_id, cur)
        
        if not permissions['can_edit']:
            return {
                'success': False,
                'error': permissions['reason']
            }
        
        # Get current values for audit
        cur.execute("SELECT * FROM material_writeoffs WHERE writeoff_id = %s", (writeoff_id,))
        columns = [desc[0] for desc in cur.description]
        old_row = cur.fetchone()
        if not old_row:
            return {'success': False, 'error': 'Writeoff not found'}
        
        old_values = dict(zip(columns, old_row))
        
        cur.execute("BEGIN")
        
        # Build update query
        allowed_updates = {}
        for field, value in updates.items():
            # Check if field is editable
            if permissions['editable_fields'] == 'all' or field in permissions['editable_fields']:
                if field not in WRITEOFF_CONFIG['immutable_fields']:
                    allowed_updates[field] = value
        
        if allowed_updates:
            # Recalculate net_loss if scrap_value changes
            if 'scrap_value' in allowed_updates:
                scrap_value = safe_float(allowed_updates['scrap_value'])
                total_cost = float(old_values['total_cost'])
                allowed_updates['net_loss'] = total_cost - scrap_value
            
            set_clauses = [f"{field} = %s" for field in allowed_updates.keys()]
            set_clauses.append("edited_at = CURRENT_TIMESTAMP")
            set_clauses.append("edited_by = %s")
            
            values = list(allowed_updates.values())
            values.append(user)
            values.append(writeoff_id)
            
            query = f"""
                UPDATE material_writeoffs
                SET {', '.join(set_clauses)}
                WHERE writeoff_id = %s
            """
            cur.execute(query, values)
        
        # Log audit
        log_transaction_audit(
            conn, cur, 'material_writeoffs', writeoff_id, 'UPDATE',
            old_values=old_values,
            new_values=allowed_updates,
            changed_by=user,
            reason='Transaction Manager Edit'
        )
        
        conn.commit()
        
        return {
            'success': True,
            'message': 'Writeoff updated successfully'
        }
        
    except Exception as e:
        conn.rollback()
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

def delete_writeoff(writeoff_id, reason='', user='System'):
    """
    Soft delete writeoff and reverse inventory impact
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Check permissions
        permissions = check_edit_permissions('material_writeoffs', writeoff_id, cur)
        
        if not permissions['can_delete']:
            return {
                'success': False,
                'error': permissions['reason']
            }
        
        cur.execute("BEGIN")
        
        # Get writeoff details
        cur.execute("""
            SELECT * FROM material_writeoffs 
            WHERE writeoff_id = %s AND status = 'active'
        """, (writeoff_id,))
        
        columns = [desc[0] for desc in cur.description]
        row = cur.fetchone()
        if not row:
            return {'success': False, 'error': 'Writeoff not found'}
        
        writeoff = dict(zip(columns, row))
        
        # Reverse inventory impact based on type
        if writeoff['material_id']:
            # Regular material writeoff - restore inventory
            cur.execute("""
                UPDATE inventory
                SET closing_stock = closing_stock + %s,
                    consumption = consumption - %s,
                    last_updated = %s
                WHERE material_id = %s
            """, (
                writeoff['quantity'],
                writeoff['quantity'],
                get_current_day_number(),
                writeoff['material_id']
            ))
            
        elif writeoff['reference_type'] == 'oil_cake':
            # Restore oil cake inventory
            cur.execute("""
                UPDATE oil_cake_inventory
                SET quantity_remaining = quantity_remaining + %s
                WHERE batch_id = %s
            """, (writeoff['quantity'], writeoff['reference_id']))
            
            cur.execute("""
                UPDATE batch
                SET cake_sold_quantity = COALESCE(cake_sold_quantity, 0) - %s
                WHERE batch_id = %s
            """, (writeoff['quantity'], writeoff['reference_id']))
            
        elif writeoff['reference_type'] == 'sludge':
            # Restore sludge inventory
            cur.execute("""
                UPDATE batch
                SET sludge_sold_quantity = COALESCE(sludge_sold_quantity, 0) - %s
                WHERE batch_id = %s
            """, (writeoff['quantity'], writeoff['reference_id']))
            
        elif writeoff['reference_type'] == 'sku':
            # Restore SKU inventory
            cur.execute("""
                UPDATE sku_inventory
                SET quantity_available = quantity_available + %s,
                    status = CASE 
                        WHEN quantity_available + %s > 0 THEN 'active'
                        ELSE status
                    END
                WHERE inventory_id = %s
            """, (
                writeoff['quantity'],
                writeoff['quantity'],
                writeoff['reference_id']
            ))
        
        # Soft delete the writeoff
        cur.execute("""
            UPDATE material_writeoffs
            SET status = 'deleted',
                edited_at = CURRENT_TIMESTAMP,
                edited_by = %s
            WHERE writeoff_id = %s
        """, (user, writeoff_id))
        
        # Log audit
        log_transaction_audit(
            conn, cur, 'material_writeoffs', writeoff_id, 'DELETE',
            old_values=writeoff,
            changed_by=user,
            reason=reason or 'Transaction Manager Delete'
        )
        
        # Update impact tracking
        cur.execute("SELECT update_writeoff_impact_tracking()")
        
        conn.commit()
        
        return {
            'success': True,
            'message': 'Writeoff deleted and inventory restored successfully'
        }
        
    except Exception as e:
        conn.rollback()
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

# ============================================
# LIST OPERATIONS
# ============================================

def list_purchases_with_status(filters=None):
    """
    List purchases with edit/delete status
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        query = """
            SELECT 
                p.purchase_id,
                p.invoice_ref,
                p.purchase_date,
                s.supplier_name,
                p.total_cost,
                p.status,
                p.boundary_crossed,
                p.created_at,
                CASE 
                    WHEN p.boundary_crossed = true THEN 'locked'
                    WHEN p.created_at::date = CURRENT_DATE THEN 'editable'
                    WHEN EXISTS (
                        SELECT 1 FROM batch 
                        WHERE seed_purchase_code = p.traceable_code
                    ) THEN 'partial'
                    ELSE 'editable'
                END as edit_status,
                COUNT(pi.item_id) as item_count
            FROM purchases p
            JOIN suppliers s ON p.supplier_id = s.supplier_id
            LEFT JOIN purchase_items pi ON p.purchase_id = pi.purchase_id
            WHERE p.status = 'active'
        """
        
        params = []
        if filters:
            if filters.get('supplier_id'):
                query += " AND p.supplier_id = %s"
                params.append(filters['supplier_id'])
            if filters.get('start_date'):
                query += " AND p.purchase_date >= %s"
                params.append(parse_date(filters['start_date']))
            if filters.get('end_date'):
                query += " AND p.purchase_date <= %s"
                params.append(parse_date(filters['end_date']))
        
        query += """
            GROUP BY p.purchase_id, p.invoice_ref, p.purchase_date, 
                     s.supplier_name, p.total_cost, p.status, 
                     p.boundary_crossed, p.created_at
            ORDER BY p.purchase_date DESC, p.purchase_id DESC
            LIMIT 100
        """
        
        cur.execute(query, params)
        
        purchases = []
        for row in cur.fetchall():
            purchases.append({
                'purchase_id': row[0],
                'invoice_ref': row[1],
                'purchase_date': integer_to_date(row[2]),
                'supplier_name': row[3],
                'total_cost': float(row[4]),
                'status': row[5],
                'boundary_crossed': row[6],
                'created_at': row[7].isoformat() if row[7] else None,
                'edit_status': row[8],
                'item_count': row[9],
                'can_edit': row[8] in ['editable', 'partial'],
                'can_delete': row[8] == 'editable'
            })
        
        return {
            'success': True,
            'purchases': purchases,
            'count': len(purchases)
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

def list_writeoffs_with_status(filters=None):
    """
    List writeoffs with edit/delete status
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        query = """
            SELECT 
                w.writeoff_id,
                w.writeoff_date,
                CASE 
                    WHEN w.material_id IS NOT NULL THEN m.material_name
                    WHEN w.reference_type = 'oil_cake' THEN 'Oil Cake'
                    WHEN w.reference_type = 'sludge' THEN 'Sludge'
                    WHEN w.reference_type = 'sku' THEN 'SKU Product'
                    ELSE 'Unknown'
                END as item_name,
                w.quantity,
                w.net_loss,
                w.reason_code,
                w.status,
                w.boundary_crossed,
                w.created_at,
                CASE 
                    WHEN w.boundary_crossed = true THEN 'locked'
                    WHEN w.created_at::date = CURRENT_DATE THEN 'editable'
                    ELSE 'editable'
                END as edit_status
            FROM material_writeoffs w
            LEFT JOIN materials m ON w.material_id = m.material_id
            WHERE w.status = 'active'
        """
        
        params = []
        if filters:
            if filters.get('material_id'):
                query += " AND w.material_id = %s"
                params.append(filters['material_id'])
            if filters.get('reason_code'):
                query += " AND w.reason_code = %s"
                params.append(filters['reason_code'])
            if filters.get('start_date'):
                query += " AND w.writeoff_date >= %s"
                params.append(parse_date(filters['start_date']))
            if filters.get('end_date'):
                query += " AND w.writeoff_date <= %s"
                params.append(parse_date(filters['end_date']))
        
        query += " ORDER BY w.writeoff_date DESC, w.writeoff_id DESC LIMIT 100"
        
        cur.execute(query, params)
        
        writeoffs = []
        for row in cur.fetchall():
            writeoffs.append({
                'writeoff_id': row[0],
                'writeoff_date': integer_to_date(row[1]),
                'item_name': row[2],
                'quantity': float(row[3]),
                'net_loss': float(row[4]),
                'reason_code': row[5],
                'status': row[6],
                'boundary_crossed': row[7],
                'created_at': row[8].isoformat() if row[8] else None,
                'edit_status': row[9],
                'can_edit': row[9] == 'editable',
                'can_delete': row[9] == 'editable'
            })
        
        return {
            'success': True,
            'writeoffs': writeoffs,
            'count': len(writeoffs)
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

# ============================================
# BOUNDARY CROSSING
# ============================================

def mark_purchase_boundary_crossed(purchase_id, reason='Invoice sent'):
    """
    Mark purchase as boundary crossed (cannot be edited)
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            UPDATE purchases
            SET boundary_crossed = true,
                edited_at = CURRENT_TIMESTAMP,
                edited_by = 'System'
            WHERE purchase_id = %s
        """, (purchase_id,))
        
        conn.commit()
        
        return {'success': True, 'message': 'Purchase marked as boundary crossed'}
        
    except Exception as e:
        conn.rollback()
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)
