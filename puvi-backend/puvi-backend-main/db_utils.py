# File: puvi-backend/puvi-backend-main/db_utils.py
"""
Database Utilities for PUVI Oil Manufacturing System
Enhanced with automatic sequence synchronization to prevent duplicate key errors
Version: 2.0 - Self-healing sequence management
"""

import psycopg2
from config import DB_URL

def get_db_connection():
    """Get a new database connection"""
    return psycopg2.connect(DB_URL)

def close_connection(conn, cur):
    """Close database connection and cursor"""
    if cur:
        cur.close()
    if conn:
        conn.close()

def synchronize_all_sequences():
    """
    Synchronize all PostgreSQL sequences with their table's max ID.
    This prevents duplicate key errors after data imports, restores, or manual inserts.
    Runs automatically at application startup.
    
    Returns:
        dict: Summary of sequences checked and fixed
    """
    # Define all tables and their sequence mappings
    sequence_mappings = [
        # Core transaction tables
        ('batch', 'batch_id', 'batch_batch_id_seq'),
        ('purchases', 'purchase_id', 'purchases_purchase_id_seq'),
        ('purchase_items', 'item_id', 'purchase_items_item_id_seq'),
        ('materials', 'material_id', 'materials_material_id_seq'),
        ('suppliers', 'supplier_id', 'suppliers_supplier_id_seq'),
        ('inventory', 'inventory_id', 'inventory_inventory_id_seq'),
        ('products', 'product_id', 'products_product_id_seq'),
        ('recipes', 'recipe_id', 'recipes_recipe_id_seq'),
        
        # SKU Management tables
        ('sku_production', 'production_id', 'sku_production_production_id_seq'),
        ('sku_master', 'sku_id', 'sku_master_sku_id_seq'),
        ('sku_bom_master', 'bom_id', 'sku_bom_master_bom_id_seq'),
        ('sku_bom_details', 'detail_id', 'sku_bom_details_detail_id_seq'),
        ('sku_mrp_history', 'mrp_id', 'sku_mrp_history_mrp_id_seq'),
        ('sku_expiry_tracking', 'tracking_id', 'sku_expiry_tracking_tracking_id_seq'),
        ('sku_oil_allocation', 'allocation_id', 'sku_oil_allocation_allocation_id_seq'),
        ('sku_material_consumption', 'consumption_id', 'sku_material_consumption_consumption_id_seq'),
        ('sku_cost_overrides', 'override_id', 'sku_cost_overrides_override_id_seq'),
        ('sku_inventory', 'inventory_id', 'sku_inventory_inventory_id_seq'),
        
        # Blending and Production
        ('blend_batches', 'blend_id', 'blend_batches_blend_id_seq'),
        ('blend_batch_components', 'component_id', 'blend_batch_components_component_id_seq'),
        
        # Sales and Writeoffs
        ('oil_cake_sales', 'sale_id', 'oil_cake_sales_sale_id_seq'),
        ('oil_cake_sale_allocations', 'allocation_id', 'oil_cake_sale_allocations_allocation_id_seq'),
        ('oil_cake_inventory', 'cake_inventory_id', 'oil_cake_inventory_cake_inventory_id_seq'),
        ('material_writeoffs', 'writeoff_id', 'material_writeoffs_writeoff_id_seq'),
        
        # Cost Management
        ('cost_elements_master', 'element_id', 'cost_elements_master_element_id_seq'),
        ('batch_cost_details', 'cost_detail_id', 'batch_cost_details_cost_detail_id_seq'),
        ('batch_extended_costs', 'cost_id', 'batch_extended_costs_cost_id_seq'),
        ('batch_time_tracking', 'tracking_id', 'batch_time_tracking_tracking_id_seq'),
        ('cost_element_rate_history', 'history_id', 'cost_element_rate_history_history_id_seq'),
        ('cost_override_log', 'log_id', 'cost_override_log_log_id_seq'),
        
        # Master Data
        ('categories_master', 'category_id', 'categories_master_category_id_seq'),
        ('subcategories_master', 'subcategory_id', 'subcategories_master_subcategory_id_seq'),
        ('package_sizes_master', 'size_id', 'package_sizes_master_size_id_seq'),
        ('tags', 'tag_id', 'tags_tag_id_seq'),
        ('uom_master', 'uom_id', 'uom_master_uom_id_seq'),
        ('production_units', 'unit_id', 'production_units_unit_id_seq'),
        ('bom_category_mapping', 'mapping_id', 'bom_category_mapping_mapping_id_seq'),
        
        # System and Configuration
        ('system_configuration', 'config_id', 'system_configuration_config_id_seq'),
        ('opening_balances', 'balance_id', 'opening_balances_balance_id_seq'),
        ('year_end_closing', 'closing_id', 'year_end_closing_closing_id_seq'),
        ('yield_ranges', 'yield_id', 'yield_ranges_yield_id_seq'),
        ('masters_audit_log', 'audit_id', 'masters_audit_log_audit_id_seq'),
        ('serial_number_tracking', 'id', 'serial_number_tracking_id_seq'),
    ]
    
    conn = None
    cur = None
    summary = {
        'total_checked': 0,
        'sequences_fixed': 0,
        'errors': [],
        'fixed_sequences': []
    }
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        print("=" * 60)
        print("Starting sequence synchronization check...")
        print("=" * 60)
        
        for table_name, id_column, sequence_name in sequence_mappings:
            try:
                summary['total_checked'] += 1
                
                # Get the maximum ID from the table
                cur.execute(f"""
                    SELECT COALESCE(MAX({id_column}), 0) as max_id 
                    FROM {table_name}
                """)
                result = cur.fetchone()
                max_id = result[0] if result else 0
                
                # Get current sequence value
                cur.execute(f"""
                    SELECT last_value, is_called 
                    FROM {sequence_name}
                """)
                seq_result = cur.fetchone()
                
                if seq_result:
                    current_seq_value = seq_result[0]
                    is_called = seq_result[1]
                    
                    # If sequence has never been called, the next value will be 1
                    # If it has been called, the next value will be last_value + 1
                    next_seq_value = current_seq_value + 1 if is_called else current_seq_value
                    
                    # Check if sequence needs to be updated
                    if max_id >= next_seq_value:
                        new_seq_value = max_id + 1
                        
                        # Reset the sequence to the correct value
                        cur.execute(f"""
                            SELECT setval('{sequence_name}', %s, true)
                        """, (new_seq_value,))
                        
                        summary['sequences_fixed'] += 1
                        summary['fixed_sequences'].append({
                            'table': table_name,
                            'sequence': sequence_name,
                            'old_value': next_seq_value,
                            'new_value': new_seq_value,
                            'max_id_in_table': max_id
                        })
                        
                        print(f"✓ FIXED: {table_name}.{id_column} - "
                              f"Sequence was at {next_seq_value}, "
                              f"reset to {new_seq_value} (max ID: {max_id})")
                    else:
                        # Sequence is fine
                        print(f"  OK: {table_name}.{id_column} - "
                              f"Sequence at {next_seq_value}, max ID: {max_id}")
                        
            except Exception as e:
                error_msg = f"Error checking {table_name}: {str(e)}"
                summary['errors'].append(error_msg)
                print(f"✗ ERROR: {error_msg}")
                continue
        
        # Commit all sequence updates
        conn.commit()
        
        print("=" * 60)
        print(f"Sequence synchronization complete!")
        print(f"Total sequences checked: {summary['total_checked']}")
        print(f"Sequences fixed: {summary['sequences_fixed']}")
        if summary['errors']:
            print(f"Errors encountered: {len(summary['errors'])}")
        print("=" * 60)
        
        return summary
        
    except Exception as e:
        if conn:
            conn.rollback()
        error_msg = f"Critical error during sequence synchronization: {str(e)}"
        print(f"✗ CRITICAL: {error_msg}")
        summary['errors'].append(error_msg)
        return summary
        
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

def check_single_sequence(table_name, id_column, sequence_name):
    """
    Check and fix a single sequence.
    Useful for debugging specific sequence issues.
    
    Args:
        table_name: Name of the table
        id_column: Name of the ID column
        sequence_name: Name of the sequence
        
    Returns:
        dict: Status of the sequence check
    """
    conn = None
    cur = None
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get max ID
        cur.execute(f"SELECT COALESCE(MAX({id_column}), 0) FROM {table_name}")
        max_id = cur.fetchone()[0]
        
        # Get sequence value
        cur.execute(f"SELECT last_value, is_called FROM {sequence_name}")
        seq_result = cur.fetchone()
        
        if seq_result:
            current_value = seq_result[0]
            is_called = seq_result[1]
            next_value = current_value + 1 if is_called else current_value
            
            result = {
                'table': table_name,
                'max_id': max_id,
                'sequence_next_value': next_value,
                'needs_fix': max_id >= next_value
            }
            
            if result['needs_fix']:
                new_value = max_id + 1
                cur.execute(f"SELECT setval('{sequence_name}', %s, true)", (new_value,))
                conn.commit()
                result['fixed'] = True
                result['new_sequence_value'] = new_value
                print(f"✓ Fixed {sequence_name}: {next_value} -> {new_value}")
            else:
                print(f"✓ {sequence_name} is OK (next value: {next_value}, max ID: {max_id})")
                
            return result
            
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"✗ Error checking {sequence_name}: {str(e)}")
        return {'error': str(e)}
        
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

def get_sequence_health_report():
    """
    Generate a health report for all sequences.
    Useful for monitoring and maintenance.
    
    Returns:
        list: Health status of all sequences
    """
    conn = None
    cur = None
    report = []
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Query to get all sequences and their status
        cur.execute("""
            SELECT 
                schemaname,
                sequencename,
                last_value,
                increment_by,
                max_value,
                min_value,
                cache_value,
                is_cycled,
                is_called
            FROM pg_sequences 
            WHERE schemaname = 'public'
            ORDER BY sequencename
        """)
        
        sequences = cur.fetchall()
        
        for seq in sequences:
            # Try to find the associated table
            table_name = seq[1].replace('_seq', '').replace('_id', '')
            
            report.append({
                'sequence_name': seq[1],
                'current_value': seq[2],
                'increment_by': seq[3],
                'is_called': seq[8],
                'probable_table': table_name
            })
            
        return report
        
    except Exception as e:
        print(f"Error generating sequence health report: {str(e)}")
        return []
        
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# Additional utility functions for database management

def reset_all_sequences_to_max():
    """
    Force reset all sequences to their table's max ID + 1.
    Use this for emergency fixes or after major data imports.
    
    Returns:
        bool: Success status
    """
    summary = synchronize_all_sequences()
    return len(summary.get('errors', [])) == 0

def backup_sequence_values():
    """
    Backup current sequence values for all sequences.
    Useful before major operations.
    
    Returns:
        dict: Current sequence values
    """
    conn = None
    cur = None
    backup = {}
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT sequencename, last_value, is_called
            FROM pg_sequences
            WHERE schemaname = 'public'
        """)
        
        for row in cur.fetchall():
            backup[row[0]] = {
                'last_value': row[1],
                'is_called': row[2]
            }
            
        return backup
        
    except Exception as e:
        print(f"Error backing up sequences: {str(e)}")
        return {}
        
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()
