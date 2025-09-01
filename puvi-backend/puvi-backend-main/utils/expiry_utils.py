# =====================================================
# PUVI System - Expiry Management Utilities
# File: puvi-backend/utils/expiry_utils.py
# Purpose: Handle expiry date calculations and status checks
# Version: 3.0 - FIXED: Added location_id support throughout
# =====================================================

from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
import psycopg2
from decimal import Decimal
from utils.date_utils import integer_to_date, parse_date

def calculate_expiry_date(production_date_int, shelf_life_months):
    """
    Calculate expiry date from production date and shelf life.
    Matches the SQL function calculate_expiry_date() in database.
    
    Args:
        production_date_int: Production date as integer (days since epoch)
        shelf_life_months: Shelf life in months
        
    Returns:
        Integer representing expiry date (days since epoch)
    """
    try:
        if not production_date_int or not shelf_life_months:
            return None
        
        from datetime import date
        
        # Convert integer to date object (not string)
        if isinstance(production_date_int, int):
            production_date = date(1970, 1, 1) + timedelta(days=production_date_int)
        elif isinstance(production_date_int, str):
            # If it's a string date, parse it first
            production_date_int = parse_date(production_date_int)
            production_date = date(1970, 1, 1) + timedelta(days=production_date_int)
        else:
            production_date = production_date_int
        
        # Add months using relativedelta for accurate month addition
        expiry_date = production_date + relativedelta(months=int(shelf_life_months))
        
        # Convert back to integer (days since epoch)
        epoch = date(1970, 1, 1)
        days_since_epoch = (expiry_date - epoch).days
        
        return days_since_epoch
        
    except Exception as e:
        print(f"Error calculating expiry date: {str(e)}")
        return None


def get_days_to_expiry(expiry_date_int):
    """
    Calculate days remaining until expiry.
    
    Args:
        expiry_date_int: Expiry date as integer (days since epoch)
        
    Returns:
        Integer representing days until expiry (negative if expired)
    """
    try:
        if not expiry_date_int:
            return None
            
        # Get current date as integer
        today = datetime.now().date()
        epoch = datetime(1970, 1, 1)
        today_int = (today - epoch.date()).days
        
        # Calculate difference
        days_to_expiry = expiry_date_int - today_int
        
        return days_to_expiry
        
    except Exception as e:
        print(f"Error calculating days to expiry: {str(e)}")
        return None


def get_expiry_status(expiry_date_int):
    """
    Get expiry status based on days remaining.
    Returns display status for UI purposes.
    
    Args:
        expiry_date_int: Expiry date as integer (days since epoch)
        
    Returns:
        String status: 'expired', 'critical', 'warning', 'caution', 'normal'
    """
    try:
        days_to_expiry = get_days_to_expiry(expiry_date_int)
        
        if days_to_expiry is None:
            return 'unknown'
            
        if days_to_expiry <= 0:
            return 'expired'
        elif days_to_expiry <= 30:
            return 'critical'
        elif days_to_expiry <= 60:
            return 'warning'
        elif days_to_expiry <= 90:
            return 'caution'
        else:
            return 'normal'
            
    except Exception as e:
        print(f"Error getting expiry status: {str(e)}")
        return 'unknown'


def get_database_status(expiry_date_int):
    """
    Get database-compatible status based on expiry date.
    Maps display statuses to allowed database values.
    
    Database allows: 'active', 'near_expiry', 'expired', 'consumed'
    
    Args:
        expiry_date_int: Expiry date as integer (days since epoch)
        
    Returns:
        String status compatible with database constraint
    """
    display_status = get_expiry_status(expiry_date_int)
    
    # Map display status to database status
    if display_status == 'expired':
        return 'expired'
    elif display_status in ['critical', 'warning', 'caution']:
        return 'near_expiry'
    else:  # 'normal' or 'unknown'
        return 'active'


def validate_shelf_life(shelf_life_months):
    """
    Validate shelf life is within acceptable range.
    
    Args:
        shelf_life_months: Shelf life in months
        
    Returns:
        Tuple (is_valid, error_message)
    """
    try:
        if shelf_life_months is None:
            return (False, "Shelf life is required")
            
        months = int(shelf_life_months)
        
        if months < 1:
            return (False, "Shelf life must be at least 1 month")
        elif months > 60:
            return (False, "Shelf life cannot exceed 60 months")
        else:
            return (True, None)
            
    except (ValueError, TypeError):
        return (False, "Shelf life must be a valid number")


def check_near_expiry_items(connection, days_threshold=30, location_id=None):
    """
    Get list of items nearing expiry within specified days.
    FIXED: Added location_id filter support
    
    Args:
        connection: Database connection
        days_threshold: Number of days to check ahead (default 30)
        location_id: Optional location filter
        
    Returns:
        List of items nearing expiry
    """
    try:
        cursor = connection.cursor()
        
        query = """
            SELECT 
                et.tracking_id,
                et.production_id,
                p.production_code,
                p.traceable_code,
                s.sku_code,
                s.product_name,
                et.expiry_date,
                et.quantity_remaining,
                et.expiry_date - (EXTRACT(EPOCH FROM CURRENT_DATE)::INTEGER / 86400) as days_to_expiry,
                et.location_id,
                l.location_name
            FROM sku_expiry_tracking et
            JOIN sku_production p ON et.production_id = p.production_id
            JOIN sku_master s ON et.sku_id = s.sku_id
            LEFT JOIN locations_master l ON et.location_id = l.location_id
            WHERE et.quantity_remaining > 0
            AND et.status != 'expired'
            AND et.expiry_date - (EXTRACT(EPOCH FROM CURRENT_DATE)::INTEGER / 86400) <= %s
        """
        
        params = [days_threshold]
        
        # Add location filter if provided
        if location_id:
            query += " AND et.location_id = %s"
            params.append(location_id)
        
        query += " ORDER BY et.expiry_date ASC"
        
        cursor.execute(query, params)
        
        columns = [desc[0] for desc in cursor.description]
        results = []
        for row in cursor.fetchall():
            results.append(dict(zip(columns, row)))
            
        cursor.close()
        return results
        
    except Exception as e:
        print(f"Error checking near expiry items: {str(e)}")
        return []


def update_expiry_tracking(connection, production_id, sku_id, production_date_int, 
                          expiry_date_int, quantity_produced, location_id):
    """
    Create or update expiry tracking record for a production.
    FIXED: Now includes location_id parameter and handling
    
    Args:
        connection: Database connection
        production_id: Production ID
        sku_id: SKU ID
        production_date_int: Production date as integer
        expiry_date_int: Expiry date as integer
        quantity_produced: Quantity produced
        location_id: Location ID where inventory is created
        
    Returns:
        Tracking ID if successful, None otherwise
    """
    try:
        cursor = connection.cursor()
        
        # Check if tracking already exists
        check_query = """
            SELECT tracking_id, location_id FROM sku_expiry_tracking 
            WHERE production_id = %s
        """
        cursor.execute(check_query, (production_id,))
        existing = cursor.fetchone()
        
        # Use database-compatible status
        status = get_database_status(expiry_date_int)
        
        if existing:
            tracking_id = existing[0]
            existing_location = existing[1]
            
            # Update existing record, including location if it was NULL
            if existing_location is None:
                # Location was missing, add it
                update_query = """
                    UPDATE sku_expiry_tracking
                    SET expiry_date = %s,
                        quantity_produced = %s,
                        quantity_remaining = %s,
                        status = %s,
                        location_id = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE production_id = %s
                    RETURNING tracking_id
                """
                cursor.execute(update_query, (
                    expiry_date_int,
                    quantity_produced,
                    quantity_produced,  # Initially, remaining = produced
                    status,
                    location_id,
                    production_id
                ))
                print(f"Updated expiry tracking {tracking_id} with location {location_id}")
            else:
                # Location exists, normal update
                update_query = """
                    UPDATE sku_expiry_tracking
                    SET expiry_date = %s,
                        quantity_produced = %s,
                        quantity_remaining = %s,
                        status = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE production_id = %s
                    RETURNING tracking_id
                """
                cursor.execute(update_query, (
                    expiry_date_int,
                    quantity_produced,
                    quantity_produced,
                    status,
                    production_id
                ))
        else:
            # Insert new record with location_id
            insert_query = """
                INSERT INTO sku_expiry_tracking (
                    production_id, sku_id, production_date, expiry_date,
                    quantity_produced, quantity_remaining, status, location_id
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING tracking_id
            """
            cursor.execute(insert_query, (
                production_id,
                sku_id,
                production_date_int,
                expiry_date_int,
                quantity_produced,
                quantity_produced,  # Initially, remaining = produced
                status,
                location_id  # FIXED: Now included
            ))
            print(f"Created new expiry tracking with location {location_id}")
        
        tracking_id = cursor.fetchone()[0]
        connection.commit()
        cursor.close()
        
        return tracking_id
        
    except Exception as e:
        if connection:
            connection.rollback()
        print(f"Error updating expiry tracking: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


def get_fefo_allocation(connection, sku_id, quantity_needed, location_id=None):
    """
    Get FEFO (First Expiry First Out) allocation for SKU sales.
    FIXED: Added location_id filter support
    
    Args:
        connection: Database connection
        sku_id: SKU ID
        quantity_needed: Quantity to allocate
        location_id: Optional location filter for allocation
        
    Returns:
        Dictionary with allocation details
    """
    try:
        cursor = connection.cursor()
        
        # Get available inventory ordered by expiry date (FEFO)
        query = """
            SELECT 
                et.tracking_id,
                et.production_id,
                et.expiry_date,
                et.quantity_remaining,
                p.production_code,
                p.traceable_code,
                p.mrp_at_production,
                et.location_id,
                l.location_name
            FROM sku_expiry_tracking et
            JOIN sku_production p ON et.production_id = p.production_id
            LEFT JOIN locations_master l ON et.location_id = l.location_id
            WHERE et.sku_id = %s
            AND et.quantity_remaining > 0
            AND et.status != 'expired'
        """
        
        params = [sku_id]
        
        # Add location filter if provided
        if location_id:
            query += " AND et.location_id = %s"
            params.append(location_id)
        
        query += " ORDER BY et.expiry_date ASC, et.production_id ASC"
        
        cursor.execute(query, params)
        
        allocations = []
        remaining_needed = Decimal(str(quantity_needed))
        
        for row in cursor.fetchall():
            if remaining_needed <= 0:
                break
                
            tracking_id, production_id, expiry_date, qty_available, prod_code, trace_code, mrp, loc_id, loc_name = row
            
            # Calculate allocation from this batch
            allocation_qty = min(remaining_needed, Decimal(str(qty_available)))
            
            allocations.append({
                'tracking_id': tracking_id,
                'production_id': production_id,
                'production_code': prod_code,
                'traceable_code': trace_code,
                'expiry_date': expiry_date,
                'quantity_allocated': float(allocation_qty),
                'quantity_available': float(qty_available),
                'mrp': float(mrp) if mrp else None,
                'location_id': loc_id,
                'location_name': loc_name
            })
            
            remaining_needed -= allocation_qty
        
        cursor.close()
        
        # Check if we could fulfill the entire quantity
        if remaining_needed > 0:
            location_msg = f" at location {location_id}" if location_id else ""
            return {
                'success': False,
                'allocations': allocations,
                'shortage': float(remaining_needed),
                'message': f"Insufficient stock{location_msg}. Short by {remaining_needed} units"
            }
        else:
            return {
                'success': True,
                'allocations': allocations,
                'shortage': 0,
                'message': "Full quantity allocated"
            }
            
    except Exception as e:
        print(f"Error in FEFO allocation: {str(e)}")
        return {
            'success': False,
            'allocations': [],
            'shortage': quantity_needed,
            'message': f"Error: {str(e)}"
        }


def format_expiry_date_display(expiry_date_int):
    """
    Format expiry date for display (DD-MM-YYYY).
    
    Args:
        expiry_date_int: Expiry date as integer (days since epoch)
        
    Returns:
        Formatted date string
    """
    try:
        if not expiry_date_int:
            return "N/A"
            
        expiry_date = integer_to_date(expiry_date_int)
        return expiry_date.strftime("%d-%m-%Y")
        
    except Exception as e:
        print(f"Error formatting expiry date: {str(e)}")
        return "Invalid Date"


def get_expiry_alert_summary(connection, location_id=None):
    """
    Get summary of items by expiry status for dashboard.
    FIXED: Added location filter support
    
    Args:
        connection: Database connection
        location_id: Optional location filter
        
    Returns:
        Dictionary with counts by status
    """
    try:
        cursor = connection.cursor()
        
        # Use GROUP BY 1 to group by the first column (the CASE expression)
        query = """
            SELECT 
                CASE 
                    WHEN expiry_date - (EXTRACT(EPOCH FROM CURRENT_DATE)::INTEGER / 86400) <= 0 THEN 'expired'
                    WHEN expiry_date - (EXTRACT(EPOCH FROM CURRENT_DATE)::INTEGER / 86400) <= 30 THEN 'critical'
                    WHEN expiry_date - (EXTRACT(EPOCH FROM CURRENT_DATE)::INTEGER / 86400) <= 60 THEN 'warning'
                    WHEN expiry_date - (EXTRACT(EPOCH FROM CURRENT_DATE)::INTEGER / 86400) <= 90 THEN 'caution'
                    ELSE 'normal'
                END as status,
                COUNT(*) as count,
                SUM(quantity_remaining) as total_quantity
            FROM sku_expiry_tracking
            WHERE quantity_remaining > 0
        """
        
        params = []
        
        # Add location filter if provided
        if location_id:
            query += " AND location_id = %s"
            params.append(location_id)
        
        query += " GROUP BY 1"
        
        cursor.execute(query, params)
        
        summary = {
            'expired': {'count': 0, 'quantity': 0},
            'critical': {'count': 0, 'quantity': 0},
            'warning': {'count': 0, 'quantity': 0},
            'caution': {'count': 0, 'quantity': 0},
            'normal': {'count': 0, 'quantity': 0}
        }
        
        for row in cursor.fetchall():
            status, count, quantity = row
            summary[status] = {
                'count': count,
                'quantity': float(quantity) if quantity else 0
            }
        
        cursor.close()
        return summary
        
    except Exception as e:
        print(f"Error getting expiry alert summary: {str(e)}")
        return {}


def update_expiry_tracking_on_transfer(connection, tracking_ids, new_location_id):
    """
    Update location for expiry tracking records during transfers.
    Used when inventory is moved between locations.
    
    Args:
        connection: Database connection
        tracking_ids: List of tracking IDs to update
        new_location_id: New location ID
        
    Returns:
        Number of records updated
    """
    try:
        if not tracking_ids:
            return 0
            
        cursor = connection.cursor()
        
        query = """
            UPDATE sku_expiry_tracking
            SET location_id = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE tracking_id = ANY(%s)
        """
        
        cursor.execute(query, (new_location_id, tracking_ids))
        
        updated_count = cursor.rowcount
        connection.commit()
        cursor.close()
        
        print(f"Updated {updated_count} expiry tracking records to location {new_location_id}")
        return updated_count
        
    except Exception as e:
        if connection:
            connection.rollback()
        print(f"Error updating expiry tracking location: {str(e)}")
        return 0


def repair_missing_locations(connection, default_location_id=None):
    """
    Utility function to repair existing records with missing location_id.
    Used for fixing data after deploying the location fix.
    
    Args:
        connection: Database connection
        default_location_id: Location ID to use for repair (if not provided, uses production location)
        
    Returns:
        Dictionary with repair results
    """
    try:
        cursor = connection.cursor()
        
        # If no default location provided, get the production location
        if not default_location_id:
            cursor.execute("""
                SELECT location_id, location_name 
                FROM locations_master 
                WHERE is_production_unit = true AND is_active = true
                ORDER BY is_default DESC
                LIMIT 1
            """)
            result = cursor.fetchone()
            if not result:
                return {
                    'success': False,
                    'error': 'No production location configured'
                }
            default_location_id = result[0]
            location_name = result[1]
        else:
            cursor.execute("SELECT location_name FROM locations_master WHERE location_id = %s", (default_location_id,))
            result = cursor.fetchone()
            location_name = result[0] if result else "Unknown"
        
        # Count records with missing location
        cursor.execute("SELECT COUNT(*) FROM sku_expiry_tracking WHERE location_id IS NULL")
        missing_count = cursor.fetchone()[0]
        
        if missing_count == 0:
            return {
                'success': True,
                'message': 'No records with missing location_id found',
                'records_fixed': 0
            }
        
        # Update records with missing location
        cursor.execute("""
            UPDATE sku_expiry_tracking
            SET location_id = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE location_id IS NULL
        """, (default_location_id,))
        
        fixed_count = cursor.rowcount
        
        # Also fix sku_inventory table
        cursor.execute("""
            UPDATE sku_inventory
            SET location_id = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE location_id IS NULL
        """, (default_location_id,))
        
        inventory_fixed = cursor.rowcount
        
        connection.commit()
        cursor.close()
        
        return {
            'success': True,
            'message': f'Successfully repaired missing locations using {location_name}',
            'records_fixed': {
                'expiry_tracking': fixed_count,
                'sku_inventory': inventory_fixed,
                'total': fixed_count + inventory_fixed
            },
            'location_used': {
                'id': default_location_id,
                'name': location_name
            }
        }
        
    except Exception as e:
        if connection:
            connection.rollback()
        print(f"Error repairing missing locations: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }
