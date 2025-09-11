"""
Transaction Manager - Input Operations Module (COMPLETE REPLACEMENT)
File Path: puvi-backend/puvi-backend-main/transaction_management/tm_input_operations.py
Purpose: Implements two-stream correction system for purchases and writeoffs
Version: 2.0 - Return/Reversal Pattern Implementation

This module replaces the old edit/delete pattern with:
1. Return Documents - For physical inventory corrections (with debit/credit notes)
2. Reversal Entries - For clerical errors (negative + correction entries)
3. Adjustments - For cases where reversal is not possible
"""

from flask import jsonify
from decimal import Decimal
from datetime import datetime, date
from db_utils import get_db_connection, close_connection
from utils.date_utils import parse_date, integer_to_date, get_current_day_number
from utils.validation import safe_decimal, safe_float
import json

# ============================================
# FIELD CLASSIFICATION ENGINE
# ============================================

def get_field_classification(table_name, field_name, cur):
    """Get field classification from database rules"""
    cur.execute("""
        SELECT classification, dependency_check_sql, edit_condition,
               reason_template, affects_calculation, affects_inventory,
               affects_traceability
        FROM field_edit_rules
        WHERE table_name = %s AND field_name = %s AND is_active = true
    """, (table_name, field_name))
    
    row = cur.fetchone()
    if row:
        return {
            'classification': row[0],
            'dependency_check_sql': row[1],
            'edit_condition': row[2],
            'reason_template': row[3],
            'affects_calculation': row[4],
            'affects_inventory': row[5],
            'affects_traceability': row[6]
        }
    return None

def check_field_editability(table_name, record_id, field_name, cur):
    """Check if a specific field can be edited"""
    field_rule = get_field_classification(table_name, field_name, cur)
    
    if not field_rule:
        return {'can_edit': True, 'reason': 'No rules defined'}
    
    # IMMUTABLE fields can never be edited
    if field_rule['classification'] == 'IMMUTABLE':
        return {
            'can_edit': False,
            'reason': field_rule['reason_template'] or 'System field - cannot be modified',
            'classification': 'IMMUTABLE'
        }
    
    # SAFE fields can always be edited
    if field_rule['classification'] == 'SAFE':
        return {
            'can_edit': True,
            'reason': 'Safe field - always editable',
            'classification': 'SAFE'
        }
    
    # CONDITIONAL fields need dependency check
    if field_rule['classification'] == 'CONDITIONAL':
        if field_rule['dependency_check_sql']:
            cur.execute(field_rule['dependency_check_sql'], (record_id,))
            count = cur.fetchone()[0]
            if count > 0:
                return {
                    'can_edit': False,
                    'reason': field_rule['reason_template'] or f'Field has {count} dependencies',
                    'classification': 'CONDITIONAL',
                    'dependency_count': count
                }
        
        return {
            'can_edit': True,
            'reason': 'No active dependencies',
            'classification': 'CONDITIONAL'
        }
    
    return {'can_edit': True, 'reason': 'Unknown classification'}

# ============================================
# AUDIT LOGGING
# ============================================

def log_transaction_audit(conn, cur, table_name, record_id, action,
                         old_values=None, new_values=None, 
                         changed_by='System', reason=None, module='tm_input'):
    """Enhanced audit logging for all transaction changes"""
    try:
        # Calculate changed fields
        changed_fields = []
        if old_values and new_values:
            for key in new_values:
                if key in old_values and str(old_values[key]) != str(new_values.get(key)):
                    changed_fields.append(key)
        
        cur.execute("""
            INSERT INTO transaction_audit_log (
                table_name, record_id, action, module,
                old_values, new_values, changed_fields,
                changed_by, reason, changed_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            RETURNING audit_id
        """, (
            table_name,
            record_id,
            action,
            module,
            json.dumps(old_values, default=str) if old_values else None,
            json.dumps(new_values, default=str) if new_values else None,
            changed_fields,
            changed_by,
            reason
        ))
        
        audit_id = cur.fetchone()[0]
        return audit_id
        
    except Exception as e:
        print(f"Audit logging failed: {str(e)}")
        # Don't fail the main operation if audit fails
        return None

# ============================================
# PURCHASE RETURNS IMPLEMENTATION
# ============================================

def validate_purchase_return(purchase_id, return_items, cur):
    """Validate if purchase items can be returned"""
    validation = {
        'can_return': True,
        'issues': [],
        'warnings': [],
        'item_validations': {}
    }
    
    # Get purchase details
    cur.execute("""
        SELECT p.*, s.supplier_name
        FROM purchases p
        JOIN suppliers s ON p.supplier_id = s.supplier_id
        WHERE p.purchase_id = %s AND p.status = 'active'
    """, (purchase_id,))
    
    purchase = cur.fetchone()
    if not purchase:
        validation['can_return'] = False
        validation['issues'].append('Purchase not found or already deleted')
        return validation
    
    # Check if purchase is already fully returned
    cur.execute("""
        SELECT COUNT(*) as return_count,
               COALESCE(SUM(pri.quantity_returned), 0) as total_returned
        FROM purchase_returns pr
        JOIN purchase_return_items pri ON pr.return_id = pri.return_id
        WHERE pr.original_purchase_id = %s 
          AND pr.status NOT IN ('cancelled')
    """, (purchase_id,))
    
    return_stats = cur.fetchone()
    
    # Validate each return item
    for item in return_items:
        item_id = item.get('item_id')
        return_qty = safe_decimal(item.get('quantity', 0))
        
        # Get original item details
        cur.execute("""
            SELECT pi.*, m.material_name
            FROM purchase_items pi
            JOIN materials m ON pi.material_id = m.material_id
            WHERE pi.item_id = %s AND pi.purchase_id = %s
        """, (item_id, purchase_id))
        
        original_item = cur.fetchone()
        if not original_item:
            validation['issues'].append(f'Item {item_id} not found in purchase')
            validation['can_return'] = False
            continue
        
        # Check if material is used in batch
        cur.execute("""
            SELECT b.batch_code, b.batch_id
            FROM batch b
            WHERE b.seed_purchase_code = %s
              AND b.seed_material_id = %s
              AND b.status = 'active'
        """, (purchase[22], original_item[2]))  # traceable_code, material_id
        
        batch_usage = cur.fetchall()
        if batch_usage:
            validation['can_return'] = False
            validation['issues'].append(
                f'Material {original_item[2]} used in batch(es): {", ".join([b[0] for b in batch_usage])}'
            )
            continue
        
        # Check quantity available for return
        cur.execute("""
            SELECT COALESCE(SUM(quantity_returned), 0)
            FROM purchase_return_items pri
            JOIN purchase_returns pr ON pri.return_id = pr.return_id
            WHERE pri.original_item_id = %s
              AND pr.status NOT IN ('cancelled')
        """, (item_id,))
        
        already_returned = cur.fetchone()[0] or 0
        available_qty = float(original_item[3]) - float(already_returned)  # quantity field
        
        if return_qty > available_qty:
            validation['issues'].append(
                f'Item {item_id}: Only {available_qty} available for return (requested: {return_qty})'
            )
            validation['can_return'] = False
        
        item_validation = {
            'item_id': item_id,
            'material_name': original_item[2],
            'original_qty': float(original_item[3]),
            'already_returned': float(already_returned),
            'available_qty': available_qty,
            'requested_qty': float(return_qty),
            'can_return': return_qty <= available_qty
        }
        validation['item_validations'][item_id] = item_validation
    
    # Check if purchase is from closed period
    current_day = get_current_day_number()
    if purchase[6] < (current_day - 30):  # purchase_date
        validation['warnings'].append(
            'Purchase is from previous period - return will be posted in current period'
        )
    
    return validation

def create_purchase_return(purchase_id, return_data, user='System'):
    """Create purchase return with inventory reversal"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Validate return
        validation = validate_purchase_return(
            purchase_id,
            return_data.get('items', []),
            cur
        )
        
        if not validation['can_return']:
            return {
                'success': False,
                'errors': validation['issues'],
                'warnings': validation['warnings']
            }
        
        cur.execute("BEGIN")
        
        # Generate return code
        cur.execute("SELECT generate_return_code('PR')")
        return_code = cur.fetchone()[0]
        
        # Get purchase details
        cur.execute("""
            SELECT supplier_id, invoice_ref, total_cost
            FROM purchases
            WHERE purchase_id = %s
        """, (purchase_id,))
        
        purchase = cur.fetchone()
        supplier_id = purchase[0]
        
        # Calculate return totals
        subtotal = Decimal('0')
        total_gst = Decimal('0')
        
        for item in return_data['items']:
            amount = safe_decimal(item['quantity']) * safe_decimal(item['rate'])
            subtotal += amount
            gst_amount = amount * safe_decimal(item.get('gst_rate', 0)) / 100
            total_gst += gst_amount
        
        transport_deduction = safe_decimal(return_data.get('transport_deduction', 0))
        loading_deduction = safe_decimal(return_data.get('loading_deduction', 0))
        total_return_value = subtotal + total_gst - transport_deduction - loading_deduction
        
        # Create return header
        cur.execute("""
            INSERT INTO purchase_returns (
                return_code, original_purchase_id, supplier_id,
                return_date, return_type, debit_note_number,
                subtotal, gst_reversed, transport_deduction,
                loading_deduction, total_return_value,
                status, notes, created_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING return_id
        """, (
            return_code,
            purchase_id,
            supplier_id,
            parse_date(return_data['return_date']),
            return_data['return_type'],
            return_data.get('debit_note_number'),
            float(subtotal),
            float(total_gst),
            float(transport_deduction),
            float(loading_deduction),
            float(total_return_value),
            'draft',
            return_data.get('notes'),
            user
        ))
        
        return_id = cur.fetchone()[0]
        
        # Process each return item
        for item in return_data['items']:
            # Get original item details
            cur.execute("""
                SELECT material_id, rate, gst_rate, landed_cost_per_unit,
                       transport_charges, handling_charges
                FROM purchase_items
                WHERE item_id = %s
            """, (item['item_id'],))
            
            orig_item = cur.fetchone()
            
            quantity_returned = safe_decimal(item['quantity'])
            rate = safe_decimal(item.get('rate', orig_item[1]))
            gst_rate = safe_decimal(item.get('gst_rate', orig_item[2]))
            amount = quantity_returned * rate
            gst_amount = amount * gst_rate / 100
            total_amount = amount + gst_amount
            
            # Insert return item
            cur.execute("""
                INSERT INTO purchase_return_items (
                    return_id, original_item_id, material_id,
                    quantity_returned, rate, amount,
                    gst_rate, gst_amount, total_amount,
                    landed_cost_reversed, reason
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                return_id,
                item['item_id'],
                orig_item[0],
                float(quantity_returned),
                float(rate),
                float(amount),
                float(gst_rate),
                float(gst_amount),
                float(total_amount),
                float(orig_item[3] * quantity_returned),  # landed_cost_reversed
                item.get('reason')
            ))
            
            # Reverse inventory
            cur.execute("""
                UPDATE inventory
                SET closing_stock = closing_stock - %s,
                    purchases = purchases - %s,
                    last_updated = %s
                WHERE material_id = %s
                ORDER BY inventory_id DESC
                LIMIT 1
            """, (
                float(quantity_returned),
                float(quantity_returned),
                get_current_day_number(),
                orig_item[0]
            ))
            
            # Recalculate weighted average cost
            # (This would need the actual recalculation logic)
        
        # Generate debit note number if not provided
        if not return_data.get('debit_note_number'):
            debit_note_number = f"DN-{return_code}"
            cur.execute("""
                UPDATE purchase_returns
                SET debit_note_number = %s,
                    debit_note_date = %s
                WHERE return_id = %s
            """, (debit_note_number, get_current_day_number(), return_id))
        
        # Log audit
        log_transaction_audit(
            conn, cur, 'purchase_returns', return_id, 'CREATE',
            None, {'return_code': return_code, 'purchase_id': purchase_id},
            user, f'Purchase return created for {purchase[1]}'
        )
        
        conn.commit()
        
        return {
            'success': True,
            'return_id': return_id,
            'return_code': return_code,
            'debit_note_number': debit_note_number if not return_data.get('debit_note_number') else return_data['debit_note_number'],
            'total_return_value': float(total_return_value),
            'message': f'Purchase return {return_code} created successfully'
        }
        
    except Exception as e:
        conn.rollback()
        import traceback
        traceback.print_exc()
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

# ============================================
# REVERSAL PATTERN IMPLEMENTATION
# ============================================

def check_reversal_possibility(table_name, record_id, cur):
    """Check if a transaction can be reversed"""
    result = {
        'can_reverse': False,
        'reason': '',
        'has_dependencies': False,
        'dependency_details': []
    }
    
    if table_name == 'purchases':
        # Check boundary crossed
        cur.execute("""
            SELECT boundary_crossed, status, reversal_status
            FROM purchases
            WHERE purchase_id = %s
        """, (record_id,))
        
        row = cur.fetchone()
        if not row:
            result['reason'] = 'Record not found'
            return result
        
        if row[0]:  # boundary_crossed
            result['reason'] = 'Transaction locked - invoice has been sent'
            return result
        
        if row[2] == 'reversed':  # already reversed
            result['reason'] = 'Transaction already reversed'
            return result
        
        # Check dependencies
        cur.execute("SELECT * FROM check_purchase_dependencies(%s)", (record_id,))
        deps = cur.fetchone()
        
        if deps[0]:  # has_dependencies
            result['has_dependencies'] = True
            result['dependency_details'].append({
                'type': deps[1],
                'count': deps[2]
            })
            result['reason'] = f'Cannot reverse - used in {deps[2]} batch production(s)'
            return result
        
        result['can_reverse'] = True
        result['reason'] = 'Can be reversed'
        
    elif table_name == 'material_writeoffs':
        # Writeoffs generally cannot be reversed (inventory already disposed)
        result['reason'] = 'Writeoffs cannot be reversed - use adjustment if needed'
        return result
    
    return result

def reverse_and_correct_purchase(purchase_id, corrections, user='System', reason=None):
    """Create reversal and correction entries for a purchase"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Check if reversal is possible
        reversal_check = check_reversal_possibility('purchases', purchase_id, cur)
        
        if not reversal_check['can_reverse']:
            return {
                'success': False,
                'error': reversal_check['reason'],
                'suggestion': 'Consider using purchase return or adjustment entry'
            }
        
        cur.execute("BEGIN")
        
        # Get original purchase with all details
        cur.execute("""
            SELECT * FROM purchases
            WHERE purchase_id = %s
        """, (purchase_id,))
        
        columns = [desc[0] for desc in cur.description]
        original_row = cur.fetchone()
        original = dict(zip(columns, original_row))
        
        # Create reversal entry (negative values)
        reversal_data = original.copy()
        reversal_data.pop('purchase_id', None)
        reversal_data['invoice_ref'] = f"REV-{original['invoice_ref']}"
        reversal_data['reversal_of'] = purchase_id
        reversal_data['is_reversal'] = True
        reversal_data['reversal_status'] = 'reversal_entry'
        reversal_data['reversal_reason'] = reason or 'Data entry correction'
        reversal_data['status'] = 'active'
        reversal_data['edited_by'] = user
        reversal_data['edited_at'] = datetime.now()
        
        # Negate financial values
        for field in ['subtotal', 'total_gst_amount', 'total_cost', 'transport_cost', 'loading_charges']:
            if field in reversal_data and reversal_data[field]:
                reversal_data[field] = -float(reversal_data[field])
        
        # Insert reversal entry
        reversal_fields = [k for k in reversal_data.keys() if k != 'created_at']
        reversal_values = [reversal_data[k] for k in reversal_fields]
        
        cur.execute(f"""
            INSERT INTO purchases ({', '.join(reversal_fields)})
            VALUES ({', '.join(['%s'] * len(reversal_fields))})
            RETURNING purchase_id
        """, reversal_values)
        
        reversal_id = cur.fetchone()[0]
        
        # Copy and negate purchase items
        cur.execute("""
            SELECT * FROM purchase_items
            WHERE purchase_id = %s
        """, (purchase_id,))
        
        item_columns = [desc[0] for desc in cur.description]
        for item_row in cur.fetchall():
            item = dict(zip(item_columns, item_row))
            item.pop('item_id', None)
            item['purchase_id'] = reversal_id
            
            # Negate quantities and amounts
            for field in ['quantity', 'amount', 'gst_amount', 'total_amount']:
                if field in item and item[field]:
                    item[field] = -float(item[field])
            
            item_fields = [k for k in item.keys() if k != 'created_at']
            item_values = [item[k] for k in item_fields]
            
            cur.execute(f"""
                INSERT INTO purchase_items ({', '.join(item_fields)})
                VALUES ({', '.join(['%s'] * len(item_fields))})
            """, item_values)
        
        # Create correction entry with new values
        correction_data = original.copy()
        correction_data.pop('purchase_id', None)
        correction_data.update(corrections)
        correction_data['invoice_ref'] = f"COR-{original['invoice_ref']}"
        correction_data['replaces'] = purchase_id
        correction_data['reversal_status'] = 'correction_entry'
        correction_data['status'] = 'active'
        correction_data['edited_by'] = user
        correction_data['edited_at'] = datetime.now()
        
        # Insert correction entry
        correction_fields = [k for k in correction_data.keys() if k != 'created_at']
        correction_values = [correction_data[k] for k in correction_fields]
        
        cur.execute(f"""
            INSERT INTO purchases ({', '.join(correction_fields)})
            VALUES ({', '.join(['%s'] * len(correction_fields))})
            RETURNING purchase_id
        """, correction_values)
        
        correction_id = cur.fetchone()[0]
        
        # Copy items with corrections
        if 'items' in corrections:
            for item_correction in corrections['items']:
                # Get original item
                cur.execute("""
                    SELECT * FROM purchase_items
                    WHERE item_id = %s
                """, (item_correction['item_id'],))
                
                orig_item = dict(zip(item_columns, cur.fetchone()))
                orig_item.pop('item_id', None)
                orig_item['purchase_id'] = correction_id
                orig_item.update(item_correction)
                
                # Recalculate amounts if quantity or rate changed
                if 'quantity' in item_correction or 'rate' in item_correction:
                    qty = safe_decimal(orig_item['quantity'])
                    rate = safe_decimal(orig_item['rate'])
                    orig_item['amount'] = float(qty * rate)
                    orig_item['gst_amount'] = float(orig_item['amount'] * safe_decimal(orig_item['gst_rate']) / 100)
                    orig_item['total_amount'] = orig_item['amount'] + orig_item['gst_amount']
                
                item_fields = [k for k in orig_item.keys() if k != 'created_at' and k != 'item_id']
                item_values = [orig_item[k] for k in item_fields]
                
                cur.execute(f"""
                    INSERT INTO purchase_items ({', '.join(item_fields)})
                    VALUES ({', '.join(['%s'] * len(item_fields))})
                """, item_values)
        else:
            # Copy all items as-is to correction
            cur.execute("""
                INSERT INTO purchase_items (
                    purchase_id, material_id, quantity, rate, amount,
                    gst_rate, gst_amount, transport_charges, handling_charges,
                    total_amount, landed_cost_per_unit
                )
                SELECT %s, material_id, quantity, rate, amount,
                       gst_rate, gst_amount, transport_charges, handling_charges,
                       total_amount, landed_cost_per_unit
                FROM purchase_items
                WHERE purchase_id = %s
            """, (correction_id, purchase_id))
        
        # Mark original as reversed
        cur.execute("""
            UPDATE purchases
            SET reversal_status = 'reversed',
                reversed_by = %s,
                status = 'reversed',
                edited_by = %s,
                edited_at = CURRENT_TIMESTAMP
            WHERE purchase_id = %s
        """, (reversal_id, user, purchase_id))
        
        # Log audit entries
        log_transaction_audit(
            conn, cur, 'purchases', purchase_id, 'REVERSED',
            original, None, user, reason
        )
        
        log_transaction_audit(
            conn, cur, 'purchases', reversal_id, 'REVERSAL_ENTRY',
            None, reversal_data, user, f'Reversal of {original["invoice_ref"]}'
        )
        
        log_transaction_audit(
            conn, cur, 'purchases', correction_id, 'CORRECTION_ENTRY',
            original, correction_data, user, f'Correction for {original["invoice_ref"]}'
        )
        
        conn.commit()
        
        # Net inventory effect is zero (negative + positive)
        
        return {
            'success': True,
            'original_id': purchase_id,
            'reversal_id': reversal_id,
            'correction_id': correction_id,
            'message': 'Purchase reversed and corrected successfully'
        }
        
    except Exception as e:
        conn.rollback()
        import traceback
        traceback.print_exc()
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

# ============================================
# ADJUSTMENT OPERATIONS
# ============================================

def create_adjustment_entry(transaction_type, transaction_id, adjustment_data, user='System'):
    """Create adjustment entry when reversal is not possible"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("BEGIN")
        
        # Generate adjustment code
        cur.execute("SELECT generate_return_code('ADJ')")
        adjustment_code = cur.fetchone()[0]
        
        # Calculate financial impact
        financial_impact = safe_decimal(adjustment_data.get('financial_impact', 0))
        
        # Create adjustment entry
        cur.execute("""
            INSERT INTO transaction_adjustments (
                adjustment_code, transaction_type, original_transaction_id,
                adjustment_type, adjustment_date, impact_description,
                financial_impact, inventory_impact, cannot_reverse_reason,
                notes, created_by, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING adjustment_id
        """, (
            adjustment_code,
            transaction_type,
            transaction_id,
            adjustment_data['adjustment_type'],
            parse_date(adjustment_data['adjustment_date']),
            adjustment_data.get('impact_description'),
            float(financial_impact),
            json.dumps(adjustment_data.get('inventory_impact', {})),
            adjustment_data.get('cannot_reverse_reason', 'Has downstream dependencies'),
            adjustment_data.get('notes'),
            user,
            'pending'
        ))
        
        adjustment_id = cur.fetchone()[0]
        
        # Update the original transaction's adjustment reference
        if transaction_type == 'purchase':
            # For purchases that can't be reversed, we just note the adjustment
            cur.execute("""
                UPDATE purchases
                SET edited_by = %s,
                    edited_at = CURRENT_TIMESTAMP
                WHERE purchase_id = %s
            """, (user, transaction_id))
        
        # Log audit
        log_transaction_audit(
            conn, cur, 'transaction_adjustments', adjustment_id, 'CREATE',
            None, adjustment_data, user, 'Adjustment created'
        )
        
        conn.commit()
        
        return {
            'success': True,
            'adjustment_id': adjustment_id,
            'adjustment_code': adjustment_code,
            'message': f'Adjustment {adjustment_code} created successfully'
        }
        
    except Exception as e:
        conn.rollback()
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

# ============================================
# WRITEOFF ADJUSTMENTS
# ============================================

def adjust_writeoff(writeoff_id, adjustment_data, user='System'):
    """
    Adjust writeoff - only certain fields can be modified
    Writeoffs cannot be reversed as inventory is already disposed
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get current writeoff
        cur.execute("""
            SELECT * FROM material_writeoffs
            WHERE writeoff_id = %s AND status = 'active'
        """, (writeoff_id,))
        
        columns = [desc[0] for desc in cur.description]
        row = cur.fetchone()
        
        if not row:
            return {'success': False, 'error': 'Writeoff not found or inactive'}
        
        old_values = dict(zip(columns, row))
        
        # Only allow safe field updates
        safe_fields = ['reason_code', 'reason_description', 'notes', 'scrap_value']
        allowed_updates = {}
        
        for field, value in adjustment_data.items():
            field_rule = get_field_classification('material_writeoffs', field, cur)
            if field_rule and field_rule['classification'] == 'SAFE':
                allowed_updates[field] = value
            elif field in safe_fields:  # Fallback for known safe fields
                allowed_updates[field] = value
        
        if not allowed_updates:
            return {
                'success': False,
                'error': 'No editable fields in update request'
            }
        
        cur.execute("BEGIN")
        
        # Recalculate net_loss if scrap_value changes
        if 'scrap_value' in allowed_updates:
            new_scrap = safe_float(allowed_updates['scrap_value'])
            total_cost = float(old_values['total_cost'])
            allowed_updates['net_loss'] = total_cost - new_scrap
        
        # Build update query
        set_clauses = [f"{field} = %s" for field in allowed_updates.keys()]
        set_clauses.append("edited_by = %s")
        set_clauses.append("edited_at = CURRENT_TIMESTAMP")
        
        values = list(allowed_updates.values())
        values.extend([user, writeoff_id])
        
        cur.execute(f"""
            UPDATE material_writeoffs
            SET {', '.join(set_clauses)}
            WHERE writeoff_id = %s
        """, values)
        
        # Log audit
        log_transaction_audit(
            conn, cur, 'material_writeoffs', writeoff_id, 'UPDATE',
            old_values, allowed_updates, user, 'Writeoff adjustment'
        )
        
        conn.commit()
        
        return {
            'success': True,
            'updated_fields': list(allowed_updates.keys()),
            'message': 'Writeoff adjusted successfully'
        }
        
    except Exception as e:
        conn.rollback()
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

# ============================================
# LIST OPERATIONS WITH STATUS
# ============================================

def list_purchases_with_correction_status(filters=None):
    """List purchases with return/reversal status"""
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
                p.reversal_status,
                p.created_at,
                CASE 
                    WHEN p.reversal_status = 'reversed' THEN 'reversed'
                    WHEN p.reversal_status IN ('reversal_entry', 'correction_entry') THEN 'system_entry'
                    WHEN p.boundary_crossed = true THEN 'locked'
                    WHEN EXISTS (
                        SELECT 1 FROM batch 
                        WHERE seed_purchase_code = p.traceable_code
                    ) THEN 'has_dependencies'
                    ELSE 'normal'
                END as correction_status,
                (SELECT COUNT(*) FROM purchase_returns 
                 WHERE original_purchase_id = p.purchase_id 
                 AND status NOT IN ('cancelled')) as return_count,
                (SELECT COALESCE(SUM(total_return_value), 0) 
                 FROM purchase_returns 
                 WHERE original_purchase_id = p.purchase_id 
                 AND status NOT IN ('cancelled')) as total_returned
            FROM purchases p
            JOIN suppliers s ON p.supplier_id = s.supplier_id
            WHERE p.status != 'deleted'
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
            if filters.get('show_reversed') == False:
                query += " AND p.reversal_status IS NULL"
        
        query += " ORDER BY p.purchase_date DESC, p.purchase_id DESC LIMIT 100"
        
        cur.execute(query, params)
        
        purchases = []
        for row in cur.fetchall():
            purchases.append({
                'purchase_id': row[0],
                'invoice_ref': row[1],
                'purchase_date': integer_to_date(row[2]),
                'supplier_name': row[3],
                'total_cost': float(row[4]) if row[4] else 0,
                'status': row[5],
                'boundary_crossed': row[6],
                'reversal_status': row[7],
                'created_at': row[8].isoformat() if row[8] else None,
                'correction_status': row[9],
                'return_count': row[10],
                'total_returned': float(row[11]) if row[11] else 0,
                'can_return': row[9] not in ['reversed', 'system_entry', 'locked'],
                'can_reverse': row[9] == 'normal',
                'can_adjust': row[9] == 'has_dependencies'
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

def list_purchase_returns(filters=None):
    """List purchase returns with details"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        query = """
            SELECT 
                pr.return_id,
                pr.return_code,
                pr.original_purchase_id,
                p.invoice_ref as original_invoice,
                pr.return_date,
                s.supplier_name,
                pr.return_type,
                pr.debit_note_number,
                pr.total_return_value,
                pr.status,
                pr.created_at,
                pr.created_by,
                COUNT(pri.return_item_id) as item_count
            FROM purchase_returns pr
            JOIN purchases p ON pr.original_purchase_id = p.purchase_id
            JOIN suppliers s ON pr.supplier_id = s.supplier_id
            LEFT JOIN purchase_return_items pri ON pr.return_id = pri.return_id
            WHERE 1=1
        """
        
        params = []
        if filters:
            if filters.get('supplier_id'):
                query += " AND pr.supplier_id = %s"
                params.append(filters['supplier_id'])
            if filters.get('start_date'):
                query += " AND pr.return_date >= %s"
                params.append(parse_date(filters['start_date']))
            if filters.get('end_date'):
                query += " AND pr.return_date <= %s"
                params.append(parse_date(filters['end_date']))
            if filters.get('status'):
                query += " AND pr.status = %s"
                params.append(filters['status'])
        
        query += """
            GROUP BY pr.return_id, pr.return_code, pr.original_purchase_id,
                     p.invoice_ref, pr.return_date, s.supplier_name,
                     pr.return_type, pr.debit_note_number, pr.total_return_value,
                     pr.status, pr.created_at, pr.created_by
            ORDER BY pr.return_date DESC, pr.return_id DESC
            LIMIT 100
        """
        
        cur.execute(query, params)
        
        returns = []
        for row in cur.fetchall():
            returns.append({
                'return_id': row[0],
                'return_code': row[1],
                'original_purchase_id': row[2],
                'original_invoice': row[3],
                'return_date': integer_to_date(row[4]),
                'supplier_name': row[5],
                'return_type': row[6],
                'debit_note_number': row[7],
                'total_return_value': float(row[8]) if row[8] else 0,
                'status': row[9],
                'created_at': row[10].isoformat() if row[10] else None,
                'created_by': row[11],
                'item_count': row[12]
            })
        
        return {
            'success': True,
            'returns': returns,
            'count': len(returns)
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

def list_writeoffs_with_status(filters=None):
    """List writeoffs with adjustment capability status"""
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
                w.reversal_status,
                'adjust_only' as correction_status  -- Writeoffs can only be adjusted
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
                'reversal_status': row[9],
                'correction_status': row[10],
                'can_adjust': True,  # Writeoffs can be adjusted (safe fields only)
                'can_reverse': False,  # Writeoffs cannot be reversed
                'can_return': False  # N/A for writeoffs
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
# GET OPERATIONS FOR UI
# ============================================

def get_purchase_for_correction(purchase_id):
    """Get purchase details with correction options"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get purchase with all details
        cur.execute("""
            SELECT 
                p.*,
                s.supplier_name,
                CASE 
                    WHEN p.reversal_status = 'reversed' THEN 'Already reversed'
                    WHEN p.boundary_crossed THEN 'Locked - invoice sent'
                    WHEN EXISTS (
                        SELECT 1 FROM batch 
                        WHERE seed_purchase_code = p.traceable_code
                    ) THEN 'Has dependencies - return or adjust only'
                    ELSE 'Can be reversed or returned'
                END as correction_options
            FROM purchases p
            JOIN suppliers s ON p.supplier_id = s.supplier_id
            WHERE p.purchase_id = %s
        """, (purchase_id,))
        
        columns = [desc[0] for desc in cur.description]
        row = cur.fetchone()
        
        if not row:
            return {'success': False, 'error': 'Purchase not found'}
        
        purchase = dict(zip(columns, row))
        
        # Convert dates for display
        if purchase['purchase_date']:
            purchase['purchase_date_display'] = integer_to_date(purchase['purchase_date'])
        
        # Get items
        cur.execute("""
            SELECT 
                pi.*,
                m.material_name,
                m.unit
            FROM purchase_items pi
            JOIN materials m ON pi.material_id = m.material_id
            WHERE pi.purchase_id = %s
            ORDER BY pi.item_id
        """, (purchase_id,))
        
        item_columns = [desc[0] for desc in cur.description]
        items = []
        for item_row in cur.fetchall():
            item = dict(zip(item_columns, item_row))
            
            # Check field editability for each item field
            item['field_editability'] = {}
            for field in item.keys():
                if field not in ['material_name', 'unit']:  # Skip joined fields
                    editability = check_field_editability('purchase_items', item['item_id'], field, cur)
                    item['field_editability'][field] = editability
            
            items.append(item)
        
        purchase['items'] = items
        
        # Check what corrections are available
        reversal_check = check_reversal_possibility('purchases', purchase_id, cur)
        
        # Get return history
        cur.execute("""
            SELECT return_code, return_date, total_return_value, status
            FROM purchase_returns
            WHERE original_purchase_id = %s
            ORDER BY return_date DESC
        """, (purchase_id,))
        
        returns = []
        for ret_row in cur.fetchall():
            returns.append({
                'return_code': ret_row[0],
                'return_date': integer_to_date(ret_row[1]),
                'total_value': float(ret_row[2]),
                'status': ret_row[3]
            })
        
        return {
            'success': True,
            'purchase': purchase,
            'correction_options': {
                'can_return': not purchase['boundary_crossed'] and purchase['reversal_status'] != 'reversed',
                'can_reverse': reversal_check['can_reverse'],
                'can_adjust': reversal_check['has_dependencies'],
                'reasons': reversal_check.get('reason', '')
            },
            'return_history': returns
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

def get_writeoff_for_adjustment(writeoff_id):
    """Get writeoff details with adjustment options"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get writeoff details
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
                END as unit
            FROM material_writeoffs w
            LEFT JOIN materials m ON w.material_id = m.material_id
            LEFT JOIN batch b ON w.reference_type IN ('oil_cake', 'sludge') 
                AND w.reference_id = b.batch_id
            LEFT JOIN sku_inventory si ON w.reference_type = 'sku' 
                AND w.reference_id = si.inventory_id
            LEFT JOIN sku_master sm ON si.sku_id = sm.sku_id
            WHERE w.writeoff_id = %s
        """, (writeoff_id,))
        
        columns = [desc[0] for desc in cur.description]
        row = cur.fetchone()
        
        if not row:
            return {'success': False, 'error': 'Writeoff not found'}
        
        writeoff = dict(zip(columns, row))
        
        # Convert dates
        if writeoff['writeoff_date']:
            writeoff['writeoff_date_display'] = integer_to_date(writeoff['writeoff_date'])
        
        # Check field editability
        writeoff['field_editability'] = {}
        for field in ['reason_code', 'reason_description', 'notes', 'scrap_value']:
            editability = check_field_editability('material_writeoffs', writeoff_id, field, cur)
            writeoff['field_editability'][field] = editability
        
        # Writeoffs can only be adjusted, not reversed
        adjustment_options = {
            'can_adjust': True,
            'can_reverse': False,
            'adjustable_fields': ['reason_code', 'reason_description', 'notes', 'scrap_value'],
            'reason': 'Writeoffs cannot be reversed - inventory already disposed'
        }
        
        return {
            'success': True,
            'writeoff': writeoff,
            'adjustment_options': adjustment_options
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

# ============================================
# APPROVAL WORKFLOWS
# ============================================

def approve_purchase_return(return_id, approver='System'):
    """Approve a purchase return and finalize inventory adjustment"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            UPDATE purchase_returns
            SET status = 'approved',
                approval_status = 'approved',
                approved_by = %s,
                approved_at = CURRENT_TIMESTAMP
            WHERE return_id = %s AND status = 'draft'
            RETURNING return_code
        """, (approver, return_id))
        
        result = cur.fetchone()
        if not result:
            return {'success': False, 'error': 'Return not found or already approved'}
        
        conn.commit()
        
        return {
            'success': True,
            'message': f'Return {result[0]} approved successfully'
        }
        
    except Exception as e:
        conn.rollback()
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)

# ============================================
# SUMMARY AND ANALYTICS
# ============================================

def get_correction_summary(date_from=None, date_to=None):
    """Get summary of all corrections in a period"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Default to current month if no dates provided
        if not date_from:
            date_from = get_current_day_number() - 30
        if not date_to:
            date_to = get_current_day_number()
        
        summary = {}
        
        # Purchase returns summary
        cur.execute("""
            SELECT 
                COUNT(*) as return_count,
                COALESCE(SUM(total_return_value), 0) as total_return_value,
                COUNT(DISTINCT supplier_id) as suppliers_affected
            FROM purchase_returns
            WHERE return_date BETWEEN %s AND %s
              AND status NOT IN ('cancelled')
        """, (date_from, date_to))
        
        row = cur.fetchone()
        summary['purchase_returns'] = {
            'count': row[0],
            'total_value': float(row[1]),
            'suppliers_affected': row[2]
        }
        
        # Reversals summary
        cur.execute("""
            SELECT 
                COUNT(*) as reversal_count,
                COALESCE(SUM(ABS(total_cost)), 0) as total_reversed
            FROM purchases
            WHERE reversal_status = 'reversal_entry'
              AND purchase_date BETWEEN %s AND %s
        """, (date_from, date_to))
        
        row = cur.fetchone()
        summary['reversals'] = {
            'count': row[0],
            'total_value': float(row[1])
        }
        
        # Adjustments summary
        cur.execute("""
            SELECT 
                COUNT(*) as adjustment_count,
                COALESCE(SUM(ABS(financial_impact)), 0) as total_impact
            FROM transaction_adjustments
            WHERE adjustment_date BETWEEN %s AND %s
        """, (date_from, date_to))
        
        row = cur.fetchone()
        summary['adjustments'] = {
            'count': row[0],
            'total_impact': float(row[1])
        }
        
        # Writeoff adjustments
        cur.execute("""
            SELECT COUNT(DISTINCT writeoff_id)
            FROM transaction_audit_log
            WHERE table_name = 'material_writeoffs'
              AND action = 'UPDATE'
              AND changed_at >= (DATE '1970-01-01' + %s * INTERVAL '1 day')
              AND changed_at <= (DATE '1970-01-01' + %s * INTERVAL '1 day')
        """, (date_from, date_to))
        
        writeoff_adjustments = cur.fetchone()[0]
        summary['writeoff_adjustments'] = writeoff_adjustments
        
        return {
            'success': True,
            'summary': summary,
            'period': {
                'from': integer_to_date(date_from),
                'to': integer_to_date(date_to)
            }
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}
    finally:
        close_connection(conn, cur)
