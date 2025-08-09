# =====================================================
# PUVI System - Expiry Management Utilities
# File: puvi-backend/utils/expiry_utils.py
# Purpose: Handle expiry date calculations and status checks
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
            
        # Convert integer to date
        production_date = integer_to_date(production_date_int)
        
        # Add months using relativedelta for accurate month addition
        expiry_date = production_date + relativedelta(months=int(shelf_life_months))
        
        # Convert back to integer (days since epoch)
        epoch = datetime(1970, 1, 1)
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
    Matches the SQL function get_expiry_status() in database.
    
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


def check_near_expiry_items(connection, days_threshold=30):
    """
    Get list of items nearing expiry within specified days.
    
    Args:
        connection: Database connection
        days_threshold: Number of days to check ahead (default 30)
        
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
                et.expiry_date - (EXTRACT(EPOCH FROM CURRENT_DATE)::INTEGER / 86400) as days_to_expiry
            FROM sku_expiry_tracking et
            JOIN sku_production p ON et.production_id = p.production_id
            JOIN sku_master s ON et.sku_id = s.sku_id
            WHERE et.quantity_remaining > 0
            AND et.status != 'expired'
            AND et.expiry_date - (EXTRACT(EPOCH FROM CURRENT_DATE)::INTEGER / 86400) <= %s
            ORDER BY et.expiry_date ASC
        """
        cursor.execute(query, (days_threshold,))
        
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
                          expiry_date_int, quantity_produced):
    """
    Create or update expiry tracking record for a production.
    
    Args:
        connection: Database connection
        production_id: Production ID
        sku_id: SKU ID
        production_date_int: Production date as integer
        expiry_date_int: Expiry date as integer
        quantity_produced: Quantity produced
        
    Returns:
        Tracking ID if successful, None otherwise
    """
    try:
        cursor = connection.cursor()
        
        # Check if tracking already exists
        check_query = """
            SELECT tracking_id FROM sku_expiry_tracking 
            WHERE production_id = %s
        """
        cursor.execute(check_query, (production_id,))
        existing = cursor.fetchone()
        
        if existing:
            # Update existing record
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
            status = get_expiry_status(expiry_date_int)
            cursor.execute(update_query, (
                expiry_date_int,
                quantity_produced,
                quantity_produced,  # Initially, remaining = produced
                status,
                production_id
            ))
        else:
            # Insert new record
            insert_query = """
                INSERT INTO sku_expiry_tracking (
                    production_id, sku_id, production_date, expiry_date,
                    quantity_produced, quantity_remaining, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING tracking_id
            """
            status = get_expiry_status(expiry_date_int)
            cursor.execute(insert_query, (
                production_id,
                sku_id,
                production_date_int,
                expiry_date_int,
                quantity_produced,
                quantity_produced,  # Initially, remaining = produced
                status
            ))
        
        tracking_id = cursor.fetchone()[0]
        connection.commit()
        cursor.close()
        
        return tracking_id
        
    except Exception as e:
        if connection:
            connection.rollback()
        print(f"Error updating expiry tracking: {str(e)}")
        return None


def get_fefo_allocation(connection, sku_id, quantity_needed):
    """
    Get FEFO (First Expiry First Out) allocation for SKU sales.
    
    Args:
        connection: Database connection
        sku_id: SKU ID
        quantity_needed: Quantity to allocate
        
    Returns:
        List of allocations from different batches
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
                p.mrp_at_production
            FROM sku_expiry_tracking et
            JOIN sku_production p ON et.production_id = p.production_id
            WHERE et.sku_id = %s
            AND et.quantity_remaining > 0
            AND et.status != 'expired'
            ORDER BY et.expiry_date ASC, et.production_id ASC
        """
        cursor.execute(query, (sku_id,))
        
        allocations = []
        remaining_needed = Decimal(str(quantity_needed))
        
        for row in cursor.fetchall():
            if remaining_needed <= 0:
                break
                
            tracking_id, production_id, expiry_date, qty_available, prod_code, trace_code, mrp = row
            
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
                'mrp': float(mrp) if mrp else None
            })
            
            remaining_needed -= allocation_qty
        
        cursor.close()
        
        # Check if we could fulfill the entire quantity
        if remaining_needed > 0:
            return {
                'success': False,
                'allocations': allocations,
                'shortage': float(remaining_needed),
                'message': f"Insufficient stock. Short by {remaining_needed} units"
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


def get_expiry_alert_summary(connection):
    """
    Get summary of items by expiry status for dashboard.
    
    Args:
        connection: Database connection
        
    Returns:
        Dictionary with counts by status
    """
    try:
        cursor = connection.cursor()
        
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
            GROUP BY status
        """
        cursor.execute(query)
        
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
