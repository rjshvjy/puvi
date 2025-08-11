"""
Opening Balance Module for PUVI Oil Manufacturing System
Handles system initialization, opening balance entry, and year-end processes
Critical for system go-live and financial year management
File Path: puvi-backend/puvi-backend-main/modules/opening_balance.py
"""

from flask import Blueprint, request, jsonify, send_file
from decimal import Decimal
from datetime import datetime, date, timedelta
import csv
import io
import json
from db_utils import get_db_connection, close_connection
from utils.date_utils import parse_date, integer_to_date, get_financial_year, get_current_day_number
from utils.validation import safe_decimal, safe_float, safe_int, validate_required_fields

# Create Blueprint
opening_balance_bp = Blueprint('opening_balance', __name__)

# =====================================================
# SYSTEM INITIALIZATION STATUS
# =====================================================

@opening_balance_bp.route('/api/opening_balance/status', methods=['GET'])
def get_system_status():
    """Check system initialization status and configuration"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get system configuration
        cur.execute("""
            SELECT 
                config_key,
                config_value,
                config_type,
                description
            FROM system_configuration
            WHERE config_key IN ('system_cutoff_date', 'is_initialized', 
                                'current_financial_year', 'allow_backdated_entries')
            ORDER BY config_key
        """)
        
        config = {}
        for row in cur.fetchall():
            config[row[0]] = {
                'value': row[1],
                'type': row[2],
                'description': row[3]
            }
        
        # Check if system is initialized
        is_initialized = config.get('is_initialized', {}).get('value') == 'true'
        cutoff_date = config.get('system_cutoff_date', {}).get('value')
        
        # Get opening balance statistics
        cur.execute("""
            SELECT 
                COUNT(DISTINCT material_id) as materials_with_opening,
                SUM(quantity * rate_per_unit) as total_opening_value,
                COUNT(*) FILTER (WHERE is_processed = true) as processed_count,
                COUNT(*) FILTER (WHERE is_processed = false) as pending_count
            FROM opening_balances
            WHERE entry_type = 'initial'
        """)
        
        stats = cur.fetchone()
        
        # Check if any transactions exist
        cur.execute("""
            SELECT 
                (SELECT COUNT(*) FROM purchases) as purchase_count,
                (SELECT COUNT(*) FROM batch) as batch_count,
                (SELECT COUNT(*) FROM material_writeoffs) as writeoff_count
        """)
        
        transaction_counts = cur.fetchone()
        has_transactions = any(count > 0 for count in transaction_counts if count)
        
        # Get last initialization info if initialized
        initialization_info = None
        if is_initialized:
            cur.execute("""
                SELECT 
                    MAX(entered_at) as initialized_date,
                    MAX(entered_by) as initialized_by
                FROM opening_balances
                WHERE is_processed = true
            """)
            init_data = cur.fetchone()
            if init_data[0]:
                initialization_info = {
                    'date': init_data[0].isoformat() if init_data[0] else None,
                    'by': init_data[1]
                }
        
        return jsonify({
            'success': True,
            'status': {
                'is_initialized': is_initialized,
                'cutoff_date': cutoff_date,
                'current_financial_year': config.get('current_financial_year', {}).get('value'),
                'allow_backdated_entries': config.get('allow_backdated_entries', {}).get('value') == 'true',
                'has_transactions': has_transactions,
                'can_initialize': not is_initialized and not has_transactions,
                'can_edit_opening': not is_initialized and not has_transactions
            },
            'statistics': {
                'materials_with_opening': stats[0] or 0,
                'total_opening_value': float(stats[1]) if stats[1] else 0,
                'processed_count': stats[2] or 0,
                'pending_count': stats[3] or 0
            },
            'initialization_info': initialization_info,
            'transaction_counts': {
                'purchases': transaction_counts[0] or 0,
                'batches': transaction_counts[1] or 0,
                'writeoffs': transaction_counts[2] or 0
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# =====================================================
# CONFIGURATION MANAGEMENT
# =====================================================

@opening_balance_bp.route('/api/opening_balance/config', methods=['GET', 'POST'])
def manage_configuration():
    """Get or update system configuration"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        if request.method == 'GET':
            # Get all configuration
            cur.execute("""
                SELECT config_key, config_value, config_type, description
                FROM system_configuration
                ORDER BY config_key
            """)
            
            configurations = []
            for row in cur.fetchall():
                configurations.append({
                    'key': row[0],
                    'value': row[1],
                    'type': row[2],
                    'description': row[3]
                })
            
            return jsonify({
                'success': True,
                'configurations': configurations
            })
            
        else:  # POST - Update configuration
            data = request.json
            
            # Check if system is already initialized
            cur.execute("""
                SELECT config_value 
                FROM system_configuration 
                WHERE config_key = 'is_initialized'
            """)
            
            is_initialized = cur.fetchone()
            if is_initialized and is_initialized[0] == 'true':
                # Can only update certain configs after initialization
                allowed_keys = ['allow_backdated_entries', 'current_financial_year']
                if data.get('key') not in allowed_keys:
                    return jsonify({
                        'success': False,
                        'error': 'Cannot modify this configuration after initialization'
                    }), 400
            
            # Update configuration
            cur.execute("""
                UPDATE system_configuration
                SET config_value = %s,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = %s
                WHERE config_key = %s
                RETURNING config_key
            """, (
                data['value'],
                data.get('updated_by', 'System'),
                data['key']
            ))
            
            if cur.rowcount == 0:
                # Insert if doesn't exist
                cur.execute("""
                    INSERT INTO system_configuration 
                    (config_key, config_value, config_type, description, updated_by)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    data['key'],
                    data['value'],
                    data.get('type', 'string'),
                    data.get('description', ''),
                    data.get('updated_by', 'System')
                ))
            
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': f'Configuration {data["key"]} updated successfully'
            })
            
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# =====================================================
# MATERIALS FOR OPENING BALANCE
# =====================================================

@opening_balance_bp.route('/api/opening_balance/materials', methods=['GET'])
def get_materials_for_opening():
    """Get all materials with their opening balance status"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get filter parameters
        category = request.args.get('category')
        has_opening = request.args.get('has_opening')
        
        # Build query
        query = """
            SELECT 
                m.material_id,
                m.material_name,
                m.category,
                m.unit,
                m.current_cost,
                m.short_code,
                s.supplier_name,
                COALESCE(ob.quantity, 0) as opening_quantity,
                COALESCE(ob.rate_per_unit, m.current_cost) as opening_rate,
                ob.balance_id IS NOT NULL as has_opening_balance,
                COALESCE(i.closing_stock, 0) as current_stock,
                ob.entered_at,
                ob.entered_by,
                ob.is_processed,
                EXISTS (
                    SELECT 1 FROM purchase_items pi 
                    WHERE pi.material_id = m.material_id
                ) as has_transactions
            FROM materials m
            LEFT JOIN suppliers s ON m.supplier_id = s.supplier_id
            LEFT JOIN opening_balances ob ON m.material_id = ob.material_id 
                AND ob.entry_type = 'initial'
            LEFT JOIN inventory i ON m.material_id = i.material_id
            WHERE m.is_active = true
        """
        
        params = []
        if category:
            query += " AND m.category = %s"
            params.append(category)
            
        if has_opening == 'true':
            query += " AND ob.balance_id IS NOT NULL"
        elif has_opening == 'false':
            query += " AND ob.balance_id IS NULL"
            
        query += " ORDER BY m.category, m.material_name"
        
        cur.execute(query, params)
        
        materials = []
        for row in cur.fetchall():
            materials.append({
                'material_id': row[0],
                'material_name': row[1],
                'category': row[2],
                'unit': row[3],
                'current_cost': float(row[4]),
                'short_code': row[5],
                'supplier_name': row[6],
                'opening_quantity': float(row[7]),
                'opening_rate': float(row[8]),
                'opening_value': float(row[7]) * float(row[8]),
                'has_opening_balance': row[9],
                'current_stock': float(row[10]),
                'entered_at': row[11].isoformat() if row[11] else None,
                'entered_by': row[12],
                'is_processed': row[13],
                'has_transactions': row[14],
                'can_edit': not row[13] and not row[14]  # Can edit if not processed and no transactions
            })
        
        # Get summary by category
        cur.execute("""
            SELECT 
                m.category,
                COUNT(DISTINCT m.material_id) as material_count,
                COUNT(DISTINCT ob.material_id) as with_opening_count,
                COALESCE(SUM(ob.quantity * ob.rate_per_unit), 0) as category_value
            FROM materials m
            LEFT JOIN opening_balances ob ON m.material_id = ob.material_id 
                AND ob.entry_type = 'initial'
            WHERE m.is_active = true
            GROUP BY m.category
            ORDER BY m.category
        """)
        
        summary_by_category = []
        for row in cur.fetchall():
            summary_by_category.append({
                'category': row[0],
                'material_count': row[1],
                'with_opening_count': row[2],
                'category_value': float(row[3])
            })
        
        return jsonify({
            'success': True,
            'materials': materials,
            'count': len(materials),
            'summary_by_category': summary_by_category
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# =====================================================
# SAVE OPENING BALANCES
# =====================================================

@opening_balance_bp.route('/api/opening_balance/save', methods=['POST'])
def save_opening_balances():
    """Save opening balance entries (before initialization)"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        # Validate required fields
        required = ['cutoff_date', 'entries']
        is_valid, missing = validate_required_fields(data, required)
        
        if not is_valid:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing)}'
            }), 400
        
        # Check if system is already initialized
        cur.execute("""
            SELECT config_value 
            FROM system_configuration 
            WHERE config_key = 'is_initialized'
        """)
        
        result = cur.fetchone()
        if result and result[0] == 'true':
            return jsonify({
                'success': False,
                'error': 'Cannot modify opening balances after system initialization'
            }), 400
        
        # Check for existing transactions
        cur.execute("""
            SELECT 
                (SELECT COUNT(*) FROM purchases) +
                (SELECT COUNT(*) FROM batch) +
                (SELECT COUNT(*) FROM material_writeoffs) as total_transactions
        """)
        
        if cur.fetchone()[0] > 0:
            return jsonify({
                'success': False,
                'error': 'Cannot set opening balances when transactions exist'
            }), 400
        
        cur.execute("BEGIN")
        
        # Parse cutoff date
        cutoff_date = parse_date(data['cutoff_date'])
        financial_year = get_financial_year(cutoff_date)
        
        # Update system configuration
        cur.execute("""
            INSERT INTO system_configuration (config_key, config_value, config_type, description)
            VALUES ('system_cutoff_date', %s, 'date', 'System cutoff date for opening balances')
            ON CONFLICT (config_key) 
            DO UPDATE SET config_value = EXCLUDED.config_value,
                         updated_at = CURRENT_TIMESTAMP,
                         updated_by = %s
        """, (data['cutoff_date'], data.get('entered_by', 'System')))
        
        # Process each entry
        saved_count = 0
        updated_count = 0
        total_value = Decimal('0')
        
        for entry in data['entries']:
            material_id = entry['material_id']
            quantity = safe_decimal(entry.get('quantity', 0))
            rate = safe_decimal(entry.get('rate_per_unit', 0))
            
            # Skip zero quantity entries
            if quantity <= 0:
                continue
            
            # Check if entry already exists
            cur.execute("""
                SELECT balance_id, is_processed 
                FROM opening_balances 
                WHERE material_id = %s AND entry_type = 'initial'
            """, (material_id,))
            
            existing = cur.fetchone()
            
            if existing:
                if existing[1]:  # is_processed
                    return jsonify({
                        'success': False,
                        'error': f'Material ID {material_id} opening balance is already processed'
                    }), 400
                
                # Update existing entry
                cur.execute("""
                    UPDATE opening_balances
                    SET quantity = %s,
                        rate_per_unit = %s,
                        balance_date = %s,
                        financial_year = %s,
                        notes = %s,
                        entered_by = %s,
                        entered_at = CURRENT_TIMESTAMP
                    WHERE balance_id = %s
                """, (
                    float(quantity),
                    float(rate),
                    cutoff_date,
                    financial_year,
                    entry.get('notes', ''),
                    data.get('entered_by', 'System'),
                    existing[0]
                ))
                updated_count += 1
            else:
                # Insert new entry
                cur.execute("""
                    INSERT INTO opening_balances (
                        material_id, balance_date, quantity, rate_per_unit,
                        entry_type, financial_year, notes, entered_by
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    material_id,
                    cutoff_date,
                    float(quantity),
                    float(rate),
                    'initial',
                    financial_year,
                    entry.get('notes', ''),
                    data.get('entered_by', 'System')
                ))
                saved_count += 1
            
            total_value += quantity * rate
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Opening balances saved successfully',
            'summary': {
                'saved_count': saved_count,
                'updated_count': updated_count,
                'total_entries': saved_count + updated_count,
                'total_value': float(total_value),
                'cutoff_date': data['cutoff_date'],
                'financial_year': financial_year
            }
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# =====================================================
# INITIALIZE SYSTEM
# =====================================================

@opening_balance_bp.route('/api/opening_balance/initialize', methods=['POST'])
def initialize_system():
    """One-time system initialization with opening balances"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        # Check if already initialized
        cur.execute("""
            SELECT config_value 
            FROM system_configuration 
            WHERE config_key = 'is_initialized'
        """)
        
        result = cur.fetchone()
        if result and result[0] == 'true':
            return jsonify({
                'success': False,
                'error': 'System is already initialized'
            }), 400
        
        # Check for existing transactions
        cur.execute("""
            SELECT 
                (SELECT COUNT(*) FROM purchases) +
                (SELECT COUNT(*) FROM batch) +
                (SELECT COUNT(*) FROM material_writeoffs) as total
        """)
        
        if cur.fetchone()[0] > 0:
            return jsonify({
                'success': False,
                'error': 'Cannot initialize system when transactions exist'
            }), 400
        
        # Check if there are opening balances to process
        cur.execute("""
            SELECT COUNT(*) 
            FROM opening_balances 
            WHERE entry_type = 'initial' AND is_processed = false
        """)
        
        if cur.fetchone()[0] == 0:
            return jsonify({
                'success': False,
                'error': 'No opening balances to process. Please enter opening balances first.'
            }), 400
        
        cur.execute("BEGIN")
        
        # Get all unprocessed opening balances
        cur.execute("""
            SELECT 
                material_id,
                quantity,
                rate_per_unit,
                balance_date
            FROM opening_balances
            WHERE entry_type = 'initial' AND is_processed = false
        """)
        
        materials_processed = 0
        total_value = Decimal('0')
        
        for row in cur.fetchall():
            material_id, quantity, rate, balance_date = row
            
            # Check if inventory record exists
            cur.execute("""
                SELECT inventory_id 
                FROM inventory 
                WHERE material_id = %s
            """, (material_id,))
            
            inv_exists = cur.fetchone()
            
            if inv_exists:
                # Update existing inventory record
                cur.execute("""
                    UPDATE inventory
                    SET opening_stock = %s,
                        closing_stock = %s,
                        weighted_avg_cost = %s,
                        last_updated = %s
                    WHERE material_id = %s
                """, (
                    float(quantity),
                    float(quantity),
                    float(rate),
                    balance_date,
                    material_id
                ))
            else:
                # Create new inventory record
                cur.execute("""
                    INSERT INTO inventory (
                        material_id,
                        opening_stock,
                        purchases,
                        consumption,
                        closing_stock,
                        weighted_avg_cost,
                        last_updated
                    ) VALUES (%s, %s, 0, 0, %s, %s, %s)
                """, (
                    material_id,
                    float(quantity),
                    float(quantity),
                    float(rate),
                    balance_date
                ))
            
            # Update material current cost
            cur.execute("""
                UPDATE materials
                SET current_cost = %s
                WHERE material_id = %s
            """, (float(rate), material_id))
            
            materials_processed += 1
            total_value += quantity * rate
        
        # Mark all opening balances as processed
        cur.execute("""
            UPDATE opening_balances
            SET is_processed = true,
                processed_at = CURRENT_TIMESTAMP
            WHERE entry_type = 'initial' AND is_processed = false
        """)
        
        # Update system configuration
        cur.execute("""
            UPDATE system_configuration
            SET config_value = 'true',
                updated_at = CURRENT_TIMESTAMP,
                updated_by = %s
            WHERE config_key = 'is_initialized'
        """, (data.get('initialized_by', 'System'),))
        
        # Log the initialization
        cur.execute("""
            INSERT INTO masters_audit_log (
                table_name, record_id, action, new_values,
                changed_by, reason
            ) VALUES (
                'system_configuration', 0, 'INITIALIZE',
                %s, %s, %s
            )
        """, (
            json.dumps({
                'materials_processed': materials_processed,
                'total_value': float(total_value),
                'initialized_at': datetime.now().isoformat()
            }),
            data.get('initialized_by', 'System'),
            'System initialization with opening balances'
        ))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'System initialized successfully!',
            'summary': {
                'materials_processed': materials_processed,
                'total_opening_value': float(total_value),
                'initialized_by': data.get('initialized_by', 'System'),
                'initialized_at': datetime.now().isoformat()
            }
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# =====================================================
# YEAR-END CLOSING
# =====================================================

@opening_balance_bp.route('/api/opening_balance/year_end_close', methods=['POST'])
def close_financial_year():
    """Close financial year and carry forward balances"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        # Validate required fields
        required = ['year_end_date', 'financial_year']
        is_valid, missing = validate_required_fields(data, required)
        
        if not is_valid:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing)}'
            }), 400
        
        year_end_date = parse_date(data['year_end_date'])
        new_year_date = year_end_date + 1  # Next day is new financial year
        new_financial_year = get_financial_year(new_year_date)
        
        cur.execute("BEGIN")
        
        # Check if year already closed
        cur.execute("""
            SELECT closing_id 
            FROM year_end_closing 
            WHERE financial_year = %s AND status = 'closed'
        """, (data['financial_year'],))
        
        if cur.fetchone():
            return jsonify({
                'success': False,
                'error': f'Financial year {data["financial_year"]} is already closed'
            }), 400
        
        # Get current closing balances
        cur.execute("""
            SELECT 
                i.material_id,
                m.material_name,
                m.category,
                m.unit,
                i.closing_stock,
                i.weighted_avg_cost,
                i.closing_stock * i.weighted_avg_cost as value
            FROM inventory i
            JOIN materials m ON i.material_id = m.material_id
            WHERE i.closing_stock > 0
            ORDER BY m.category, m.material_name
        """)
        
        materials_closed = 0
        total_closing_value = Decimal('0')
        
        for row in cur.fetchall():
            material_id, material_name, category, unit, quantity, rate, value = row
            
            # Save to year_end_closing table
            cur.execute("""
                INSERT INTO year_end_closing (
                    financial_year, closing_date, material_id,
                    material_name, category, unit,
                    closing_quantity, weighted_avg_cost, closing_value,
                    closed_by, notes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING closing_id
            """, (
                data['financial_year'],
                year_end_date,
                material_id,
                material_name,
                category,
                unit,
                float(quantity),
                float(rate),
                float(value),
                data.get('closed_by', 'System'),
                data.get('notes', f'Year-end closing for {data["financial_year"]}')
            ))
            
            closing_id = cur.fetchone()[0]
            
            # Create opening balance for new year
            cur.execute("""
                INSERT INTO opening_balances (
                    material_id, balance_date, quantity, rate_per_unit,
                    entry_type, financial_year, notes, entered_by, is_processed
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, true)
                RETURNING balance_id
            """, (
                material_id,
                new_year_date,
                float(quantity),
                float(rate),
                'yearend_carryforward',
                new_financial_year,
                f'Carried forward from {data["financial_year"]}',
                data.get('closed_by', 'System')
            ))
            
            new_opening_id = cur.fetchone()[0]
            
            # Update year_end_closing with new opening reference
            cur.execute("""
                UPDATE year_end_closing
                SET carried_forward = true,
                    new_year_opening_id = %s
                WHERE closing_id = %s
            """, (new_opening_id, closing_id))
            
            materials_closed += 1
            total_closing_value += value
        
        # Reset serial numbers for new financial year
        cur.execute("""
            INSERT INTO serial_number_tracking (
                material_id, supplier_id, financial_year, current_serial
            )
            SELECT DISTINCT 
                material_id, 
                supplier_id, 
                %s, 
                0
            FROM serial_number_tracking
            WHERE financial_year = %s
            ON CONFLICT (material_id, supplier_id, financial_year) DO NOTHING
        """, (new_financial_year, data['financial_year']))
        
        # Update system configuration
        cur.execute("""
            UPDATE system_configuration
            SET config_value = %s,
                updated_at = CURRENT_TIMESTAMP,
                updated_by = %s
            WHERE config_key = 'current_financial_year'
        """, (new_financial_year, data.get('closed_by', 'System')))
        
        # Log the year-end closing
        cur.execute("""
            INSERT INTO masters_audit_log (
                table_name, record_id, action, new_values,
                changed_by, reason
            ) VALUES (
                'year_end_closing', 0, 'YEAR_END_CLOSE',
                %s, %s, %s
            )
        """, (
            json.dumps({
                'financial_year': data['financial_year'],
                'materials_closed': materials_closed,
                'total_closing_value': float(total_closing_value),
                'new_financial_year': new_financial_year
            }),
            data.get('closed_by', 'System'),
            f'Year-end closing for {data["financial_year"]}'
        ))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': f'Financial year {data["financial_year"]} closed successfully',
            'summary': {
                'financial_year_closed': data['financial_year'],
                'new_financial_year': new_financial_year,
                'materials_processed': materials_closed,
                'total_closing_value': float(total_closing_value),
                'closed_by': data.get('closed_by', 'System'),
                'closed_at': datetime.now().isoformat()
            }
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# =====================================================
# CSV IMPORT/EXPORT
# =====================================================

@opening_balance_bp.route('/api/opening_balance/template', methods=['GET'])
def download_template():
    """Download CSV template for bulk opening balance upload"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get all active materials
        cur.execute("""
            SELECT 
                m.material_id,
                m.material_name,
                m.category,
                m.unit,
                m.current_cost,
                s.supplier_name,
                COALESCE(ob.quantity, 0) as current_opening_qty,
                COALESCE(ob.rate_per_unit, m.current_cost) as current_opening_rate
            FROM materials m
            LEFT JOIN suppliers s ON m.supplier_id = s.supplier_id
            LEFT JOIN opening_balances ob ON m.material_id = ob.material_id 
                AND ob.entry_type = 'initial'
            WHERE m.is_active = true
            ORDER BY m.category, m.material_name
        """)
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write headers
        writer.writerow([
            'Material ID',
            'Material Name',
            'Category',
            'Unit',
            'Current Cost',
            'Supplier',
            'Opening Quantity',
            'Opening Rate',
            'Notes'
        ])
        
        # Write data rows
        for row in cur.fetchall():
            writer.writerow([
                row[0],  # material_id
                row[1],  # material_name
                row[2],  # category
                row[3],  # unit
                row[4],  # current_cost
                row[5],  # supplier_name
                row[6],  # current_opening_qty (editable)
                row[7],  # current_opening_rate (editable)
                ''       # notes (empty for user to fill)
            ])
        
        # Prepare file for download
        output.seek(0)
        output_bytes = io.BytesIO(output.getvalue().encode('utf-8'))
        output_bytes.seek(0)
        
        return send_file(
            output_bytes,
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'opening_balance_template_{datetime.now().strftime("%Y%m%d")}.csv'
        )
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@opening_balance_bp.route('/api/opening_balance/import', methods=['POST'])
def import_opening_balances():
    """Import opening balances from CSV file"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Check if system is already initialized
        cur.execute("""
            SELECT config_value 
            FROM system_configuration 
            WHERE config_key = 'is_initialized'
        """)
        
        result = cur.fetchone()
        if result and result[0] == 'true':
            return jsonify({
                'success': False,
                'error': 'Cannot import opening balances after system initialization'
            }), 400
        
        # Get file from request
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file uploaded'
            }), 400
        
        file = request.files['file']
        cutoff_date = parse_date(request.form.get('cutoff_date'))
        
        if not cutoff_date:
            return jsonify({
                'success': False,
                'error': 'Cutoff date is required'
            }), 400
        
        financial_year = get_financial_year(cutoff_date)
        
        # Read CSV file
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        csv_reader = csv.DictReader(stream)
        
        cur.execute("BEGIN")
        
        imported_count = 0
        skipped_count = 0
        error_rows = []
        
        for row_num, row in enumerate(csv_reader, start=2):  # Start from 2 (header is row 1)
            try:
                material_id = safe_int(row.get('Material ID'))
                quantity = safe_decimal(row.get('Opening Quantity', 0))
                rate = safe_decimal(row.get('Opening Rate', 0))
                notes = row.get('Notes', '')
                
                # Skip if quantity is zero
                if quantity <= 0:
                    skipped_count += 1
                    continue
                
                # Validate material exists
                cur.execute("""
                    SELECT material_name 
                    FROM materials 
                    WHERE material_id = %s AND is_active = true
                """, (material_id,))
                
                if not cur.fetchone():
                    error_rows.append({
                        'row': row_num,
                        'error': f'Material ID {material_id} not found'
                    })
                    continue
                
                # Insert or update opening balance
                cur.execute("""
                    INSERT INTO opening_balances (
                        material_id, balance_date, quantity, rate_per_unit,
                        entry_type, financial_year, notes, entered_by
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (material_id, balance_date)
                    DO UPDATE SET
                        quantity = EXCLUDED.quantity,
                        rate_per_unit = EXCLUDED.rate_per_unit,
                        notes = EXCLUDED.notes,
                        entered_at = CURRENT_TIMESTAMP
                """, (
                    material_id,
                    cutoff_date,
                    float(quantity),
                    float(rate),
                    'initial',
                    financial_year,
                    notes,
                    request.form.get('imported_by', 'CSV Import')
                ))
                
                imported_count += 1
                
            except Exception as e:
                error_rows.append({
                    'row': row_num,
                    'error': str(e)
                })
        
        if error_rows:
            conn.rollback()
            return jsonify({
                'success': False,
                'error': 'Import failed due to errors',
                'error_rows': error_rows
            }), 400
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Opening balances imported successfully',
            'summary': {
                'imported_count': imported_count,
                'skipped_count': skipped_count,
                'cutoff_date': integer_to_date(cutoff_date),
                'financial_year': financial_year
            }
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)
