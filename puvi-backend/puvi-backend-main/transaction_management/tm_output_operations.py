"""
Transaction Manager - Output Operations Module
File Path: puvi-backend/puvi-backend-main/transaction_management/tm_output_operations.py
Purpose: Handles edit/delete operations for SKU production, SKU outbound, and oil cake sales
Implements: Critical boundary crossing logic that locks entire upstream chain

This module provides centralized edit/delete functionality for output transactions
including the boundary crossing mechanism when invoices are sent.

FIXED ISSUES:
1. Date formatting - Now uses DUAL FORMAT (Option 3):
   - Sends DD-MM-YYYY as _display fields for user viewing
   - Sends YYYY-MM-DD for HTML date inputs
2. Oil cake sales SQL - Uses correct column names
3. NULL handling - Properly handles missing traceable codes
4. SKU production list index error prevention
5. CRITICAL FIX: Added aliases for backward compatibility with tm_main.py imports
"""

from flask import jsonify
from decimal import Decimal
from datetime import datetime, date
from db_utils import get_db_connection, close_connection
from utils.date_utils import parse_date, integer_to_date, get_current_day_number
from utils.validation import safe_decimal, safe_float
import json

# ============================================
# CRITICAL: BOUNDARY CROSSING IMPLEMENTATION
# ============================================

def mark_upstream_boundary_crossed(outbound_id, user='System'):
    """
    CRITICAL FUNCTION: Mark entire upstream chain as boundary_crossed
    when invoice is sent. This prevents editing of the entire production chain.
    
    Flow: SKU Outbound → SKU Production → Batch → Purchase
    
    Args:
        outbound_id: The outbound transaction that triggered boundary
        user: User who triggered the boundary crossing
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("BEGIN")
        
        # Step 1: Mark the outbound itself
        cur.execute("""
            UPDATE sku_outbound 
            SET boundary_crossed = true,
                edited_by = %s,
                edited_at = CURRENT_TIMESTAMP
            WHERE outbound_id = %s
        """, (user, outbound_id))
        
        # Step 2: Get all SKU productions used in this outbound
        cur.execute("""
            SELECT DISTINCT production_id
            FROM sku_outbound_items oi
            WHERE oi.outbound_id = %s
        """, (outbound_id,))
        
        production_ids = [row[0] for row in cur.fetchall()]
        
        if production_ids:
            # Step 3: Mark all SKU productions
            cur.execute("""
                UPDATE sku_production 
                SET boundary_crossed = true,
                    edited_by = %s,
                    edited_at = CURRENT_TIMESTAMP
                WHERE production_id = ANY(%s)
            """, (user, production_ids))
            
            # Step 4: Get all batches used in these productions
            cur.execute("""
                SELECT DISTINCT source_id
                FROM sku_oil_allocation
                WHERE production_id = ANY(%s)
                    AND source_type = 'batch'
            """, (production_ids,))
            
            batch_ids = [row[0] for row in cur.fetchall()]
            
            if batch_ids:
                # Step 5: Mark all batches
                cur.execute("""
                    UPDATE batch 
                    SET boundary_crossed = true,
                        edited_by = %s,
                        edited_at = CURRENT_TIMESTAMP
                    WHERE batch_id = ANY(%s)
                """, (user, batch_ids))
                
                # Step 6: Get all purchases used for these batches
                cur.execute("""
                    SELECT DISTINCT p.purchase_id
                    FROM purchases p
                    JOIN batch b ON p.traceable_code = b.seed_purchase_code
                    WHERE b.batch_id = ANY(%s)
                """, (batch_ids,))
                
                purchase_ids = [row[0] for row in cur.fetchall()]
                
                if purchase_ids:
                    # Step 7: Mark all purchases
                    cur.execute("""
                        UPDATE purchases 
                        SET boundary_crossed = true,
                            edited_by = %s,
                            edited_at = CURRENT_TIMESTAMP
                        WHERE purchase_id = ANY(%s)
                    """, (user, purchase_ids))
            
            # Step 8: Get all blends used in these productions
            cur.execute("""
                SELECT DISTINCT source_id
                FROM sku_oil_allocation
                WHERE production_id = ANY(%s)
                    AND source_type = 'blend'
            """, (production_ids,))
            
            blend_ids = [row[0] for row in cur.fetchall()]
            
            if blend_ids:
                # Step 9: Mark all blends
                cur.execute("""
                    UPDATE blend_batches 
                    SET boundary_crossed = true,
                        edited_by = %s,
                        edited_at = CURRENT_TIMESTAMP
                    WHERE blend_id = ANY(%s)
                """, (user, blend_ids))
        
        conn.commit()
        
        return {
            'success': True,
            'productions_locked': len(production_ids),
            'batches_locked': len(batch_ids) if 'batch_ids' in locals() else 0,
            'purchases_locked': len(purchase_ids) if 'purchase_ids' in locals() else 0,
            'blends_locked': len(blend_ids) if 'blend_ids' in locals() else 0
        }
        
    except Exception as e:
        conn.rollback()
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

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
            'output',
            json.dumps(old_values) if old_values else None,
            json.dumps(new_values) if new_values else None,
            changed_by,
            reason
        ))
    except Exception as e:
        print(f"Audit logging failed: {str(e)}")

def check_sku_production_dependencies(production_id, cur):
    """Check if SKU production has downstream dependencies"""
    dependencies = {
        'outbound_items': 0,
        'has_dependencies': False
    }
    
    # Check if used in any outbound
    cur.execute("""
        SELECT COUNT(*) FROM sku_outbound_items 
        WHERE allocation_data::text LIKE %s
    """, (f'%"production_id":{production_id}%',))
    dependencies['outbound_items'] = cur.fetchone()[0]
    
    dependencies['has_dependencies'] = dependencies['outbound_items'] > 0
    
    return dependencies

def check_outbound_dependencies(outbound_id, cur):
    """Check if outbound has external dependencies (invoice sent, etc.)"""
    # Outbound is end of chain, no downstream dependencies
    # But check if invoice has been sent
    cur.execute("""
        SELECT invoice_number, boundary_crossed
        FROM sku_outbound
        WHERE outbound_id = %s
    """, (outbound_id,))
    
    result = cur.fetchone()
    if result:
        return {
            'invoice_sent': bool(result[0]),
            'boundary_crossed': bool(result[1]),
            'has_dependencies': bool(result[0]) or bool(result[1])
        }
    return {'has_dependencies': False}

def check_oil_cake_sale_dependencies(sale_id, cur):
    """Check if oil cake sale has dependencies"""
    # Oil cake sales are typically end of chain
    # Check if invoice exists
    cur.execute("""
        SELECT invoice_number, boundary_crossed
        FROM oil_cake_sales
        WHERE sale_id = %s
    """, (sale_id,))
    
    result = cur.fetchone()
    if result:
        return {
            'invoice_exists': bool(result[0]),
            'boundary_crossed': bool(result[1]),
            'has_dependencies': bool(result[0]) or bool(result[1])
        }
    return {'has_dependencies': False}

# ============================================
# SKU PRODUCTION OPERATIONS
# ============================================

def get_sku_production_for_edit(production_id):
    """Get SKU production details for editing with proper date formatting"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get production header
        cur.execute("""
            SELECT p.*, s.sku_code, s.product_name
            FROM sku_production p
            JOIN sku_master s ON p.sku_id = s.sku_id
            WHERE p.production_id = %s AND p.status = 'active'
        """, (production_id,))
        
        columns = [desc[0] for desc in cur.description]
        prod_data = cur.fetchone()
        
        if not prod_data:
            return {'success': False, 'error': 'Production not found or deleted'}
        
        production = dict(zip(columns, prod_data))
        
        # FIX: Convert integer dates to YYYY-MM-DD format for HTML date inputs
        date_fields = ['production_date', 'packing_date', 'expiry_date']
        for field in date_fields:
            if production.get(field):
                # Convert integer to YYYY-MM-DD for form editing
                production[field] = integer_to_date(production[field], '%Y-%m-%d')
                # Also keep display version
                production[f'{field}_display'] = integer_to_date(production[field], '%d-%m-%Y')
        
        # FIX: Handle NULL traceable_code
        if not production.get('traceable_code'):
            production['traceable_code'] = ''
        
        # Get oil allocations
        cur.execute("""
            SELECT * FROM sku_oil_allocation
            WHERE production_id = %s
            ORDER BY allocation_id
        """, (production_id,))
        
        allocations = []
        for row in cur.fetchall():
            alloc_cols = [desc[0] for desc in cur.description]
            allocations.append(dict(zip(alloc_cols, row)))
        
        production['oil_allocations'] = allocations
        
        # Get material consumption
        cur.execute("""
            SELECT mc.*, m.material_name
            FROM sku_material_consumption mc
            JOIN materials m ON mc.material_id = m.material_id
            WHERE mc.production_id = %s
        """, (production_id,))
        
        materials = []
        for row in cur.fetchall():
            mat_cols = [desc[0] for desc in cur.description]
            materials.append(dict(zip(mat_cols, row)))
        
        production['material_consumption'] = materials
        
        # Check permissions
        dependencies = check_sku_production_dependencies(production_id, cur)
        boundary_crossed = production.get('boundary_crossed', False)
        created_at = production.get('created_at')
        
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
            permissions['reason'] = 'Transaction locked - invoice sent downstream'
        elif dependencies['has_dependencies']:
            permissions['can_edit'] = True
            permissions['editable_fields'] = ['notes', 'operator_name', 'quality_check_by']
            permissions['reason'] = f"Limited edit - used in {dependencies['outbound_items']} shipments"
        else:
            permissions['editable_fields'] = 'all_except_immutable'
            permissions['reason'] = 'Full edit allowed'
        
        return {
            'success': True,
            'production': production,
            'permissions': permissions,
            'dependencies': dependencies
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

def update_sku_production(production_id, data, user='System'):
    """Update SKU production record"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get current production data
        cur.execute("""
            SELECT * FROM sku_production 
            WHERE production_id = %s AND status = 'active'
        """, (production_id,))
        
        columns = [desc[0] for desc in cur.description]
        current_data = cur.fetchone()
        
        if not current_data:
            return {'success': False, 'error': 'Production not found'}
        
        current = dict(zip(columns, current_data))
        
        # Check permissions
        dependencies = check_sku_production_dependencies(production_id, cur)
        boundary_crossed = current.get('boundary_crossed', False)
        
        if boundary_crossed:
            return {'success': False, 'error': 'Cannot edit - transaction locked by invoice'}
        
        # Define immutable fields
        immutable_fields = [
            'production_id', 'production_code', 'traceable_code',
            'sku_id', 'production_date', 'bottles_produced',
            'total_oil_quantity', 'created_at'
        ]
        
        # Safe fields that can be edited even with dependencies
        safe_fields = ['notes', 'operator_name', 'quality_check_by', 'shift_number']
        
        # Begin transaction
        cur.execute("BEGIN")
        
        # Build update query
        update_fields = []
        update_values = []
        old_values = {}
        new_values = {}
        
        for field, value in data.items():
            if field in immutable_fields:
                continue
            
            # Check if field can be edited
            if dependencies['has_dependencies'] and field not in safe_fields:
                continue
            
            # Parse dates if needed
            if field in ['production_date', 'packing_date', 'expiry_date'] and isinstance(value, str):
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
            update_values.append(production_id)
            query = f"UPDATE sku_production SET {', '.join(update_fields)} WHERE production_id = %s"
            cur.execute(query, update_values)
            
            # Log audit
            log_transaction_audit(
                conn, cur, 'sku_production', production_id, 'UPDATE',
                old_values, new_values, user, data.get('edit_reason')
            )
        
        conn.commit()
        
        return {
            'success': True,
            'message': f'Production {current["production_code"]} updated successfully',
            'changes': new_values
        }
        
    except Exception as e:
        conn.rollback()
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

def delete_sku_production(production_id, reason='', user='System'):
    """Soft delete SKU production record"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get production details
        cur.execute("""
            SELECT * FROM sku_production 
            WHERE production_id = %s AND status = 'active'
        """, (production_id,))
        
        columns = [desc[0] for desc in cur.description]
        prod_data = cur.fetchone()
        
        if not prod_data:
            return {'success': False, 'error': 'Production not found'}
        
        production = dict(zip(columns, prod_data))
        
        # Check dependencies
        dependencies = check_sku_production_dependencies(production_id, cur)
        if dependencies['has_dependencies']:
            return {
                'success': False,
                'error': f"Cannot delete - production used in {dependencies['outbound_items']} shipments"
            }
        
        # Check boundary
        if production.get('boundary_crossed'):
            return {'success': False, 'error': 'Cannot delete - transaction locked by invoice'}
        
        # Begin transaction
        cur.execute("BEGIN")
        
        # Soft delete production
        cur.execute("""
            UPDATE sku_production 
            SET status = 'deleted',
                edited_by = %s,
                edited_at = CURRENT_TIMESTAMP
            WHERE production_id = %s
        """, (user, production_id))
        
        # Update SKU inventory
        cur.execute("""
            UPDATE sku_inventory
            SET status = 'deleted'
            WHERE production_id = %s
        """, (production_id,))
        
        # Update expiry tracking
        cur.execute("""
            UPDATE sku_expiry_tracking
            SET status = 'deleted'
            WHERE production_id = %s
        """, (production_id,))
        
        # Log audit
        log_transaction_audit(
            conn, cur, 'sku_production', production_id, 'DELETE',
            production, None, user, reason
        )
        
        conn.commit()
        
        return {
            'success': True,
            'message': f'Production {production["production_code"]} deleted successfully'
        }
        
    except Exception as e:
        conn.rollback()
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

# ============================================
# SKU OUTBOUND OPERATIONS
# ============================================

def get_outbound_for_edit(outbound_id):
    """Get outbound details for editing with proper date formatting"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get outbound header
        cur.execute("""
            SELECT o.*, fl.location_name as from_location,
                   tl.location_name as to_location,
                   c.customer_name
            FROM sku_outbound o
            JOIN locations_master fl ON o.from_location_id = fl.location_id
            LEFT JOIN locations_master tl ON o.to_location_id = tl.location_id
            LEFT JOIN customers c ON o.customer_id = c.customer_id
            WHERE o.outbound_id = %s AND o.status != 'cancelled'
        """, (outbound_id,))
        
        columns = [desc[0] for desc in cur.description]
        outbound_data = cur.fetchone()
        
        if not outbound_data:
            return {'success': False, 'error': 'Outbound not found or cancelled'}
        
        outbound = dict(zip(columns, outbound_data))
        
        # FIX: Convert integer dates to YYYY-MM-DD format for HTML date inputs
        date_fields = ['outbound_date', 'dispatch_date']
        for field in date_fields:
            if outbound.get(field):
                # Convert integer to YYYY-MM-DD for form editing
                outbound[field] = integer_to_date(outbound[field], '%Y-%m-%d')
                # Also keep display version
                outbound[f'{field}_display'] = integer_to_date(outbound[field], '%d-%m-%Y')
        
        # FIX: Handle NULL outbound_code
        if not outbound.get('outbound_code'):
            outbound['outbound_code'] = ''
        
        # Get items
        cur.execute("""
            SELECT oi.*, s.sku_code, s.product_name
            FROM sku_outbound_items oi
            JOIN sku_master s ON oi.sku_id = s.sku_id
            WHERE oi.outbound_id = %s AND oi.status = 'active'
        """, (outbound_id,))
        
        items = []
        for row in cur.fetchall():
            item_cols = [desc[0] for desc in cur.description]
            item = dict(zip(item_cols, row))
            # FIX: Handle NULL SKU codes
            if not item.get('sku_code'):
                item['sku_code'] = ''
            items.append(item)
        
        outbound['items'] = items
        
        # Check permissions
        dependencies = check_outbound_dependencies(outbound_id, cur)
        boundary_crossed = outbound.get('boundary_crossed', False)
        invoice_sent = bool(outbound.get('invoice_number'))
        created_at = outbound.get('created_at')
        
        # Determine edit status
        is_same_day = False
        if created_at:
            if isinstance(created_at, datetime):
                is_same_day = created_at.date() == datetime.now().date()
        
        permissions = {
            'can_edit': not boundary_crossed and not invoice_sent,
            'can_delete': not boundary_crossed and not invoice_sent and is_same_day,
            'editable_fields': [],
            'reason': ''
        }
        
        if boundary_crossed or invoice_sent:
            permissions['reason'] = 'Transaction locked - invoice sent'
        else:
            permissions['editable_fields'] = [
                'transport_vendor', 'vehicle_number', 'lr_number',
                'notes', 'dispatch_date'
            ]
            permissions['reason'] = 'Limited edit allowed'
        
        return {
            'success': True,
            'outbound': outbound,
            'permissions': permissions,
            'dependencies': dependencies
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

def update_outbound(outbound_id, data, user='System'):
    """Update outbound record"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get current outbound data
        cur.execute("""
            SELECT * FROM sku_outbound 
            WHERE outbound_id = %s AND status != 'cancelled'
        """, (outbound_id,))
        
        columns = [desc[0] for desc in cur.description]
        current_data = cur.fetchone()
        
        if not current_data:
            return {'success': False, 'error': 'Outbound not found'}
        
        current = dict(zip(columns, current_data))
        
        # Check if invoice sent
        if current.get('invoice_number') or current.get('boundary_crossed'):
            return {'success': False, 'error': 'Cannot edit - invoice already sent'}
        
        # Safe fields that can be edited
        safe_fields = [
            'transport_vendor', 'vehicle_number', 'lr_number',
            'notes', 'dispatch_date', 'transport_mode'
        ]
        
        # Begin transaction
        cur.execute("BEGIN")
        
        # Build update query
        update_fields = []
        update_values = []
        old_values = {}
        new_values = {}
        
        for field, value in data.items():
            if field not in safe_fields:
                continue
            
            # Parse dates if needed
            if field == 'dispatch_date' and isinstance(value, str):
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
            update_values.append(outbound_id)
            query = f"UPDATE sku_outbound SET {', '.join(update_fields)} WHERE outbound_id = %s"
            cur.execute(query, update_values)
            
            # Log audit
            log_transaction_audit(
                conn, cur, 'sku_outbound', outbound_id, 'UPDATE',
                old_values, new_values, user, data.get('edit_reason')
            )
        
        conn.commit()
        
        return {
            'success': True,
            'message': f'Outbound {current["outbound_code"]} updated successfully',
            'changes': new_values
        }
        
    except Exception as e:
        conn.rollback()
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

def delete_outbound(outbound_id, reason='', user='System'):
    """Soft delete outbound record"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get outbound details
        cur.execute("""
            SELECT * FROM sku_outbound 
            WHERE outbound_id = %s AND status != 'cancelled'
        """, (outbound_id,))
        
        columns = [desc[0] for desc in cur.description]
        outbound_data = cur.fetchone()
        
        if not outbound_data:
            return {'success': False, 'error': 'Outbound not found'}
        
        outbound = dict(zip(columns, outbound_data))
        
        # Check if invoice sent or boundary crossed
        if outbound.get('invoice_number') or outbound.get('boundary_crossed'):
            return {'success': False, 'error': 'Cannot delete - invoice sent'}
        
        # Check dependencies
        dependencies = check_outbound_dependencies(outbound_id, cur)
        if dependencies['has_dependencies']:
            return {
                'success': False,
                'error': 'Cannot delete - invoice exists or boundary crossed'
            }
        
        # Begin transaction
        cur.execute("BEGIN")
        
        # Soft delete outbound
        cur.execute("""
            UPDATE sku_outbound 
            SET status = 'cancelled',
                edited_by = %s,
                edited_at = CURRENT_TIMESTAMP
            WHERE outbound_id = %s
        """, (user, outbound_id))
        
        # Soft delete outbound items
        cur.execute("""
            UPDATE sku_outbound_items
            SET status = 'cancelled'
            WHERE outbound_id = %s
        """, (outbound_id,))
        
        # Log audit
        log_transaction_audit(
            conn, cur, 'sku_outbound', outbound_id, 'DELETE',
            outbound, None, user, reason
        )
        
        conn.commit()
        
        return {
            'success': True,
            'message': f'Outbound {outbound["outbound_code"]} deleted successfully'
        }
        
    except Exception as e:
        conn.rollback()
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

def trigger_invoice_boundary(outbound_id, invoice_number, user='System'):
    """
    Trigger boundary crossing when invoice is sent
    This is the critical function that locks the entire chain
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("BEGIN")
        
        # Update outbound with invoice number
        cur.execute("""
            UPDATE sku_outbound 
            SET invoice_number = %s,
                boundary_crossed = true,
                edited_by = %s,
                edited_at = CURRENT_TIMESTAMP
            WHERE outbound_id = %s
        """, (invoice_number, user, outbound_id))
        
        # Mark entire upstream chain
        result = mark_upstream_boundary_crossed(outbound_id, user)
        
        if result['success']:
            conn.commit()
            return {
                'success': True,
                'message': f'Invoice {invoice_number} recorded and chain locked',
                'chain_locked': result
            }
        else:
            conn.rollback()
            return result
            
    except Exception as e:
        conn.rollback()
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

# ============================================
# OIL CAKE SALES OPERATIONS
# ============================================

def get_oil_cake_sale_for_edit(sale_id):
    """Get oil cake sale details for editing with proper date formatting"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get sale header
        cur.execute("""
            SELECT * FROM oil_cake_sales
            WHERE sale_id = %s AND status = 'active'
        """, (sale_id,))
        
        columns = [desc[0] for desc in cur.description]
        sale_data = cur.fetchone()
        
        if not sale_data:
            return {'success': False, 'error': 'Sale not found or deleted'}
        
        sale = dict(zip(columns, sale_data))
        
        # FIX: Convert integer dates to YYYY-MM-DD format for HTML date inputs
        if sale.get('sale_date'):
            # Convert integer to YYYY-MM-DD for form editing
            sale['sale_date'] = integer_to_date(sale['sale_date'], '%Y-%m-%d')
            # Also keep display version
            sale['sale_date_display'] = integer_to_date(sale['sale_date'], '%d-%m-%Y')
        
        # FIX: Handle missing invoice_number (not sale_code)
        if not sale.get('invoice_number'):
            sale['invoice_number'] = ''
        
        # Get allocations
        cur.execute("""
            SELECT oca.*, b.batch_code, b.oil_type, b.traceable_code
            FROM oil_cake_sale_allocations oca
            JOIN batch b ON oca.batch_id = b.batch_id
            WHERE oca.sale_id = %s
        """, (sale_id,))
        
        allocations = []
        for row in cur.fetchall():
            alloc_cols = [desc[0] for desc in cur.description]
            alloc = dict(zip(alloc_cols, row))
            # FIX: Handle NULL traceable codes
            if not alloc.get('traceable_code'):
                alloc['traceable_code'] = ''
            allocations.append(alloc)
        
        sale['allocations'] = allocations
        
        # Check permissions
        dependencies = check_oil_cake_sale_dependencies(sale_id, cur)
        boundary_crossed = sale.get('boundary_crossed', False)
        invoice_exists = bool(sale.get('invoice_number'))
        created_at = sale.get('created_at')
        
        # Determine edit status
        is_same_day = False
        if created_at:
            if isinstance(created_at, datetime):
                is_same_day = created_at.date() == datetime.now().date()
        
        permissions = {
            'can_edit': not boundary_crossed and not invoice_exists,
            'can_delete': not boundary_crossed and not invoice_exists and is_same_day,
            'editable_fields': [],
            'reason': ''
        }
        
        if boundary_crossed or invoice_exists:
            permissions['reason'] = 'Transaction locked - invoice exists'
        else:
            permissions['editable_fields'] = [
                'invoice_number', 'transport_cost', 'notes', 'packing_cost'
            ]
            permissions['reason'] = 'Limited edit allowed'
        
        return {
            'success': True,
            'sale': sale,
            'permissions': permissions,
            'dependencies': dependencies
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

def update_oil_cake_sale(sale_id, data, user='System'):
    """Update oil cake sale record"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get current sale data
        cur.execute("""
            SELECT * FROM oil_cake_sales 
            WHERE sale_id = %s AND status = 'active'
        """, (sale_id,))
        
        columns = [desc[0] for desc in cur.description]
        current_data = cur.fetchone()
        
        if not current_data:
            return {'success': False, 'error': 'Sale not found'}
        
        current = dict(zip(columns, current_data))
        
        # Check if invoice exists
        if current.get('boundary_crossed'):
            return {'success': False, 'error': 'Cannot edit - transaction locked'}
        
        # Safe fields that can be edited
        safe_fields = ['invoice_number', 'transport_cost', 'notes', 'packing_cost']
        
        # Begin transaction
        cur.execute("BEGIN")
        
        # Build update query
        update_fields = []
        update_values = []
        old_values = {}
        new_values = {}
        
        for field, value in data.items():
            if field not in safe_fields:
                continue
            
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
            update_values.append(sale_id)
            query = f"UPDATE oil_cake_sales SET {', '.join(update_fields)} WHERE sale_id = %s"
            cur.execute(query, update_values)
            
            # Log audit
            log_transaction_audit(
                conn, cur, 'oil_cake_sales', sale_id, 'UPDATE',
                old_values, new_values, user, data.get('edit_reason')
            )
        
        conn.commit()
        
        return {
            'success': True,
            'message': f'Oil cake sale updated successfully',
            'changes': new_values
        }
        
    except Exception as e:
        conn.rollback()
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

def soft_delete_oil_cake_sale(sale_id, reason='', user='System'):
    """Soft delete oil cake sale record"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get sale details
        cur.execute("""
            SELECT * FROM oil_cake_sales 
            WHERE sale_id = %s AND status = 'active'
        """, (sale_id,))
        
        columns = [desc[0] for desc in cur.description]
        sale_data = cur.fetchone()
        
        if not sale_data:
            return {'success': False, 'error': 'Sale not found'}
        
        sale = dict(zip(columns, sale_data))
        
        # Check if invoice exists
        if sale.get('invoice_number') or sale.get('boundary_crossed'):
            return {'success': False, 'error': 'Cannot delete - invoice exists'}
        
        # Begin transaction
        cur.execute("BEGIN")
        
        # Get allocations for reversal
        cur.execute("""
            SELECT batch_id, quantity_allocated
            FROM oil_cake_sale_allocations
            WHERE sale_id = %s
        """, (sale_id,))
        
        allocations = cur.fetchall()
        
        # Soft delete sale
        cur.execute("""
            UPDATE oil_cake_sales 
            SET status = 'deleted',
                edited_by = %s,
                edited_at = CURRENT_TIMESTAMP
            WHERE sale_id = %s
        """, (user, sale_id))
        
        # Reverse oil cake inventory
        for batch_id, quantity in allocations:
            cur.execute("""
                UPDATE oil_cake_inventory
                SET quantity_remaining = quantity_remaining + %s
                WHERE batch_id = %s
            """, (quantity, batch_id))
        
        # Log audit
        log_transaction_audit(
            conn, cur, 'oil_cake_sales', sale_id, 'DELETE',
            sale, None, user, reason
        )
        
        conn.commit()
        
        return {
            'success': True,
            'message': 'Oil cake sale deleted successfully'
        }
        
    except Exception as e:
        conn.rollback()
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

# ============================================
# LIST OPERATIONS - FIXED
# ============================================

def list_sku_productions_with_status(filters=None):
    """List SKU productions with edit/delete status - Handle NULLs"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        query = """
            SELECT 
                p.production_id,
                p.production_code,
                COALESCE(p.traceable_code, ''),  -- FIX: Handle NULL
                p.production_date,
                s.sku_code,
                s.product_name,
                p.bottles_produced,
                p.status,
                p.boundary_crossed,
                p.created_at,
                CASE 
                    WHEN p.boundary_crossed = true THEN 'locked'
                    WHEN EXISTS (
                        SELECT 1 FROM sku_outbound_items oi
                        WHERE oi.allocation_data::text LIKE '%' || p.production_id || '%'
                    ) THEN 'partial'
                    WHEN p.created_at::date = CURRENT_DATE THEN 'editable'
                    ELSE 'editable'
                END as edit_status
            FROM sku_production p
            JOIN sku_master s ON p.sku_id = s.sku_id
            WHERE p.status = 'active'
        """
        
        params = []
        if filters:
            if filters.get('sku_id'):
                query += " AND p.sku_id = %s"
                params.append(filters['sku_id'])
            if filters.get('start_date'):
                query += " AND p.production_date >= %s"
                params.append(parse_date(filters['start_date']))
            if filters.get('end_date'):
                query += " AND p.production_date <= %s"
                params.append(parse_date(filters['end_date']))
        
        query += " ORDER BY p.production_date DESC, p.production_id DESC LIMIT 100"
        
        cur.execute(query, params)
        
        productions = []
        for row in cur.fetchall():
            productions.append({
                'production_id': row[0],
                'production_code': row[1] or '',  # Handle NULL
                'traceable_code': row[2] or '',   # Already handled with COALESCE
                'production_date': integer_to_date(row[3], '%d-%m-%Y') if row[3] else None,
                'sku_code': row[4] or '',         # Handle NULL
                'product_name': row[5] or '',     # Handle NULL
                'bottles_produced': row[6],
                'status': row[7],
                'boundary_crossed': row[8],
                'edit_status': row[10]
            })
        
        return {
            'success': True,
            'productions': productions,
            'count': len(productions)
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

def list_outbounds_with_status(filters=None):
    """List outbounds with edit/delete status - Handle NULLs"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        query = """
            SELECT 
                o.outbound_id,
                COALESCE(o.outbound_code, ''),  -- FIX: Handle NULL
                o.transaction_type,
                o.outbound_date,
                fl.location_name as from_location,
                COALESCE(tl.location_name, c.customer_name, '') as destination,
                o.invoice_number,
                o.status,
                o.boundary_crossed,
                o.created_at,
                CASE 
                    WHEN o.boundary_crossed = true OR o.invoice_number IS NOT NULL THEN 'locked'
                    WHEN o.created_at::date = CURRENT_DATE THEN 'editable'
                    ELSE 'partial'
                END as edit_status
            FROM sku_outbound o
            JOIN locations_master fl ON o.from_location_id = fl.location_id
            LEFT JOIN locations_master tl ON o.to_location_id = tl.location_id
            LEFT JOIN customers c ON o.customer_id = c.customer_id
            WHERE o.status != 'cancelled'
        """
        
        params = []
        if filters:
            if filters.get('transaction_type'):
                query += " AND o.transaction_type = %s"
                params.append(filters['transaction_type'])
            if filters.get('start_date'):
                query += " AND o.outbound_date >= %s"
                params.append(parse_date(filters['start_date']))
            if filters.get('end_date'):
                query += " AND o.outbound_date <= %s"
                params.append(parse_date(filters['end_date']))
        
        query += " ORDER BY o.outbound_date DESC, o.outbound_id DESC LIMIT 100"
        
        cur.execute(query, params)
        
        outbounds = []
        for row in cur.fetchall():
            outbounds.append({
                'outbound_id': row[0],
                'outbound_code': row[1] or f'OUT-{row[0]}',  # Generate if NULL
                'transaction_type': row[2],
                'outbound_date': integer_to_date(row[3], '%d-%m-%Y') if row[3] else None,
                'from_location': row[4] or '',
                'destination': row[5] or '',
                'invoice_number': row[6],
                'status': row[7],
                'boundary_crossed': row[8],
                'edit_status': row[10]
            })
        
        return {
            'success': True,
            'outbounds': outbounds,
            'count': len(outbounds)
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

def list_oil_cake_sales_with_status(filters=None):
    """List oil cake sales with edit/delete status - FIXED SQL"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # FIX: Use invoice_number instead of non-existent sale_code
        query = """
            SELECT 
                ocs.sale_id,
                ocs.invoice_number,  -- FIXED: was ocs.sale_code
                ocs.sale_date,
                ocs.buyer_name,
                ocs.quantity_sold,  -- FIXED: was total_quantity
                ocs.total_amount,   -- FIXED: was total_value
                ocs.invoice_number,
                ocs.status,
                ocs.boundary_crossed,
                ocs.created_at,
                CASE 
                    WHEN ocs.boundary_crossed = true OR ocs.invoice_number IS NOT NULL THEN 'locked'
                    WHEN ocs.created_at::date = CURRENT_DATE THEN 'editable'
                    ELSE 'partial'
                END as edit_status
            FROM oil_cake_sales ocs
            WHERE ocs.status = 'active'
        """
        
        params = []
        if filters:
            if filters.get('start_date'):
                query += " AND ocs.sale_date >= %s"
                params.append(parse_date(filters['start_date']))
            if filters.get('end_date'):
                query += " AND ocs.sale_date <= %s"
                params.append(parse_date(filters['end_date']))
        
        query += " ORDER BY ocs.sale_date DESC, ocs.sale_id DESC LIMIT 100"
        
        cur.execute(query, params)
        
        sales = []
        for row in cur.fetchall():
            sales.append({
                'sale_id': row[0],
                'sale_code': row[1] or f'SALE-{row[0]}',  # Use invoice or generate code
                'sale_date': integer_to_date(row[2], '%d-%m-%Y') if row[2] else None,
                'buyer_name': row[3],
                'total_quantity': float(row[4]) if row[4] else 0,
                'total_value': float(row[5]) if row[5] else 0,
                'invoice_number': row[6],
                'status': row[7],
                'boundary_crossed': row[8],
                'edit_status': row[10]
            })
        
        return {
            'success': True,
            'sales': sales,
            'count': len(sales)
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

# ============================================
# CRITICAL ALIASES FOR BACKWARD COMPATIBILITY
# ============================================

# Create aliases for backward compatibility with tm_main.py imports
soft_delete_sku_production = delete_sku_production
soft_delete_outbound = delete_outbound
# Note: soft_delete_oil_cake_sale already has the correct name

# ============================================
# MODULE EXPORTS
# ============================================

__all__ = [
    # Critical boundary function
    'mark_upstream_boundary_crossed',
    'trigger_invoice_boundary',
    # SKU Production operations
    'get_sku_production_for_edit',
    'update_sku_production',
    'delete_sku_production',
    'soft_delete_sku_production',  # ALIAS ADDED
    'list_sku_productions_with_status',
    # SKU Outbound operations
    'get_outbound_for_edit',
    'update_outbound',
    'delete_outbound',
    'soft_delete_outbound',  # ALIAS ADDED
    'list_outbounds_with_status',
    # Oil Cake Sales operations
    'get_oil_cake_sale_for_edit',
    'update_oil_cake_sale',
    'soft_delete_oil_cake_sale',  # ALREADY CORRECT NAME
    'list_oil_cake_sales_with_status',
    # Utilities
    'check_sku_production_dependencies',
    'check_outbound_dependencies',
    'check_oil_cake_sale_dependencies'
]
