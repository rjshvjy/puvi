# =====================================================
# PUVI System - Date Utilities Modifications
# File: puvi-backend/utils/date_utils.py
# ADD THESE FUNCTIONS TO YOUR EXISTING date_utils.py
# =====================================================

# Add these imports at the top of your existing date_utils.py
from dateutil.relativedelta import relativedelta

# ADD THESE NEW FUNCTIONS TO YOUR EXISTING date_utils.py:

def add_months_to_date(date_int, months):
    """
    Add months to a date stored as integer.
    
    Args:
        date_int: Date as integer (days since epoch)
        months: Number of months to add
        
    Returns:
        Integer representing new date (days since epoch)
    """
    try:
        if not date_int:
            return None
            
        # Convert integer to date
        base_date = integer_to_date(date_int)
        
        # Add months using relativedelta for accurate month addition
        new_date = base_date + relativedelta(months=int(months))
        
        # Convert back to integer
        epoch = datetime(1970, 1, 1)
        days_since_epoch = (new_date - epoch).days
        
        return days_since_epoch
        
    except Exception as e:
        print(f"Error adding months to date: {str(e)}")
        return None


def get_month_difference(date1_int, date2_int):
    """
    Calculate difference in months between two dates.
    
    Args:
        date1_int: First date as integer (days since epoch)
        date2_int: Second date as integer (days since epoch)
        
    Returns:
        Integer representing months difference
    """
    try:
        if not date1_int or not date2_int:
            return None
            
        # Convert integers to dates
        date1 = integer_to_date(date1_int)
        date2 = integer_to_date(date2_int)
        
        # Calculate difference using relativedelta
        delta = relativedelta(date2, date1)
        
        # Total months difference
        months_diff = delta.years * 12 + delta.months
        
        return months_diff
        
    except Exception as e:
        print(f"Error calculating month difference: {str(e)}")
        return None


def get_current_date_int():
    """
    Get current date as integer (days since epoch).
    
    Returns:
        Integer representing today's date
    """
    try:
        today = datetime.now().date()
        epoch = datetime(1970, 1, 1)
        days_since_epoch = (today - epoch.date()).days
        return days_since_epoch
    except Exception as e:
        print(f"Error getting current date as integer: {str(e)}")
        return None


def format_date_for_display(date_int, format_string="%d-%m-%Y"):
    """
    Format date integer for display with custom format.
    
    Args:
        date_int: Date as integer (days since epoch)
        format_string: Python date format string (default: DD-MM-YYYY)
        
    Returns:
        Formatted date string
    """
    try:
        if not date_int:
            return "N/A"
            
        date_obj = integer_to_date(date_int)
        return date_obj.strftime(format_string)
        
    except Exception as e:
        print(f"Error formatting date for display: {str(e)}")
        return "Invalid Date"


def is_date_in_past(date_int):
    """
    Check if a date is in the past.
    
    Args:
        date_int: Date as integer (days since epoch)
        
    Returns:
        Boolean: True if date is in the past, False otherwise
    """
    try:
        if not date_int:
            return False
            
        current_date_int = get_current_date_int()
        return date_int < current_date_int
        
    except Exception as e:
        print(f"Error checking if date is in past: {str(e)}")
        return False


def is_date_in_future(date_int):
    """
    Check if a date is in the future.
    
    Args:
        date_int: Date as integer (days since epoch)
        
    Returns:
        Boolean: True if date is in the future, False otherwise
    """
    try:
        if not date_int:
            return False
            
        current_date_int = get_current_date_int()
        return date_int > current_date_int
        
    except Exception as e:
        print(f"Error checking if date is in future: {str(e)}")
        return False


def get_date_range_int(start_date, end_date):
    """
    Convert date range to integer format.
    
    Args:
        start_date: Start date (string, datetime, or integer)
        end_date: End date (string, datetime, or integer)
        
    Returns:
        Tuple (start_int, end_int) or (None, None) if error
    """
    try:
        start_int = parse_date(start_date) if start_date else None
        end_int = parse_date(end_date) if end_date else None
        
        return (start_int, end_int)
        
    except Exception as e:
        print(f"Error converting date range: {str(e)}")
        return (None, None)


# NOTE: Make sure your existing date_utils.py has these functions:
# - parse_date(date_input) -> integer
# - integer_to_date(days) -> datetime
# - format_date_indian(date) -> "DD-MM-YYYY"
# These should already exist in your file
