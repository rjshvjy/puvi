"""
Traceability utilities for PUVI Oil Manufacturing System
Handles generation of traceable codes throughout the production cycle
File Path: puvi-backend/puvi-backend-main/utils/traceability.py
FIXED: Proper batch serial tracking from database
"""

from datetime import date, timedelta

def get_financial_year(date_int):
    """
    Get financial year from date integer
    Financial year runs from April 1 to March 31
    
    Args:
        date_int: Number of days since epoch (1970-01-01)
    
    Returns:
        str: Financial year in format 'YYYY-YY' (e.g., '2025-26')
    """
    dt = date(1970, 1, 1) + timedelta(days=date_int)
    if dt.month >= 4:
        return f"{dt.year}-{str(dt.year + 1)[2:]}"
    else:
        return f"{dt.year - 1}-{str(dt.year)[2:]}"


def get_next_serial(material_id, supplier_id, financial_year, cur):
    """
    Get next serial number for material-supplier combination
    Automatically increments and creates entry if doesn't exist
    
    Args:
        material_id: ID of the material
        supplier_id: ID of the supplier
        financial_year: Financial year string (e.g., '2025-26')
        cur: Database cursor
    
    Returns:
        int: Next serial number
    """
    cur.execute("""
        INSERT INTO serial_number_tracking
        (material_id, supplier_id, financial_year, current_serial)
        VALUES (%s, %s, %s, 1)
        ON CONFLICT (material_id, supplier_id, financial_year)
        DO UPDATE SET 
            current_serial = serial_number_tracking.current_serial + 1,
            last_updated = CURRENT_TIMESTAMP
        RETURNING current_serial
    """, (material_id, supplier_id, financial_year))
    
    return cur.fetchone()[0]


def get_next_batch_serial(seed_material_id, seed_purchase_code, production_date, cur):
    """
    Get next serial number for batches from same seed purchase
    by checking actual batch records in database
    
    Args:
        seed_material_id: The material ID of the seed
        seed_purchase_code: The traceable code from seed purchase
        production_date: Production date as integer (days since epoch)
        cur: Database cursor
    
    Returns:
        int: Next serial number for this seed purchase
    """
    # Parse the seed purchase code to extract the purchase date
    # Format: GNS-K-1-05082025-SKM or GNS-K-05082025-SKM
    parts = seed_purchase_code.split('-')
    
    if len(parts) >= 5:
        # New format: GNS-K-1-05082025-SKM
        purchase_date_str = parts[3]  # 05082025
        seed_material_code = f"{parts[0]}-{parts[1]}"  # GNS-K
    elif len(parts) == 4:
        # Older format: GNS-K-05082025-SKM
        purchase_date_str = parts[2]  # 05082025
        seed_material_code = f"{parts[0]}-{parts[1]}"  # GNS-K
    else:
        raise ValueError(f"Invalid seed purchase code format: {seed_purchase_code}")
    
    # Convert seed code to oil code for searching
    oil_material_code = seed_material_code.replace('S-', 'O-') if 'S-' in seed_material_code else seed_material_code
    
    # Query all batch traceable codes that were created from this seed purchase
    # Pattern: GNO-K-[SERIAL]-05082025-PUV
    # We look for batches with the same material code and purchase date
    search_pattern = f"{oil_material_code}-%%-{purchase_date_str}-%%"
    
    cur.execute("""
        SELECT traceable_code 
        FROM batch 
        WHERE traceable_code LIKE %s
        ORDER BY batch_id DESC
    """, (search_pattern,))
    
    existing_codes = cur.fetchall()
    max_serial = 0
    
    # Extract serial numbers from existing codes
    for (code,) in existing_codes:
        if code:
            code_parts = code.split('-')
            # Find the serial number (between material code and date)
            # Format: GNO-K-[SERIAL]-05082025-PUV
            if len(code_parts) >= 5:
                # Check if this code has our purchase date
                for i, part in enumerate(code_parts):
                    if part == purchase_date_str and i >= 2:
                        # The part before the date should be the serial
                        try:
                            serial_str = code_parts[i-1]
                            serial = int(serial_str)
                            max_serial = max(max_serial, serial)
                        except (ValueError, IndexError):
                            # Not a valid serial, skip
                            continue
                        break
    
    # Also check if there's a stored seed purchase record
    # This ensures we track across database sessions
    cur.execute("""
        INSERT INTO seed_batch_tracking
        (seed_purchase_code, last_batch_serial, material_id)
        VALUES (%s, %s, %s)
        ON CONFLICT (seed_purchase_code)
        DO UPDATE SET 
            last_batch_serial = GREATEST(
                seed_batch_tracking.last_batch_serial,
                %s
            ),
            last_updated = CURRENT_TIMESTAMP
        RETURNING last_batch_serial
    """, (seed_purchase_code, max_serial, seed_material_id, max_serial))
    
    result = cur.fetchone()
    if result:
        stored_serial = result[0]
        max_serial = max(max_serial, stored_serial)
    
    # Return next serial
    next_serial = max_serial + 1
    
    # Update the tracking table with the new serial
    cur.execute("""
        UPDATE seed_batch_tracking 
        SET last_batch_serial = %s, last_updated = CURRENT_TIMESTAMP
        WHERE seed_purchase_code = %s
    """, (next_serial, seed_purchase_code))
    
    return next_serial


def generate_batch_code(production_date, batch_description, cur):
    """
    Generate unique batch code with automatic serial numbering
    Format: BATCH-YYYYMMDD-Description or BATCH-YYYYMMDD-Description-1, -2, etc.
    
    Args:
        production_date: Production date as integer (days since epoch)
        batch_description: Description from user (e.g., 'Morning', 'Evening')
        cur: Database cursor
    
    Returns:
        str: Generated unique batch code
    """
    # Format date as YYYYMMDD
    dt = date(1970, 1, 1) + timedelta(days=production_date)
    date_str = dt.strftime('%Y%m%d')
    
    # Clean the description - remove any special characters that might cause issues
    import re
    clean_description = re.sub(r'[^A-Za-z0-9]', '', batch_description) if batch_description else 'PROD'
    
    # Base batch code without serial
    base_code = f"BATCH-{date_str}-{clean_description}"
    
    # Check if this base code exists
    cur.execute("SELECT batch_code FROM batch WHERE batch_code = %s", (base_code,))
    if not cur.fetchone():
        # Base code doesn't exist, use it
        return base_code
    
    # Base code exists, find the highest serial number for this pattern
    # Pattern: BATCH-YYYYMMDD-Description-N where N is a number
    search_pattern = f"{base_code}-%"
    cur.execute("""
        SELECT batch_code 
        FROM batch 
        WHERE batch_code = %s OR batch_code LIKE %s
        ORDER BY batch_id DESC
    """, (base_code, search_pattern))
    
    existing_codes = cur.fetchall()
    max_serial = 0
    
    for (code,) in existing_codes:
        if code == base_code:
            # Base code exists without serial, so we need at least serial 1
            max_serial = max(max_serial, 0)
        elif code.startswith(f"{base_code}-"):
            # Extract serial number from codes like BATCH-20250813-Morning-1
            try:
                serial_part = code[len(base_code)+1:]  # Get part after base_code-
                serial = int(serial_part)
                max_serial = max(max_serial, serial)
            except (ValueError, IndexError):
                # Not a valid serial, skip
                continue
    
    # Return next serial
    next_serial = max_serial + 1
    return f"{base_code}-{next_serial}"


def generate_purchase_traceable_code(material_id, supplier_id, purchase_date, cur):
    """
    Generate traceable code for purchase
    Format: [MaterialCode]-[Serial]-[Date]-[SupplierCode]
    Example: GNS-K-1-05082025-SKM
    
    Args:
        material_id: ID of the material being purchased
        supplier_id: ID of the supplier
        purchase_date: Purchase date as integer (days since epoch)
        cur: Database cursor
    
    Returns:
        str: Generated traceable code
    """
    # Get material and supplier short codes
    cur.execute("""
        SELECT m.short_code, s.short_code
        FROM materials m
        JOIN suppliers s ON s.supplier_id = %s
        WHERE m.material_id = %s
    """, (supplier_id, material_id))
    
    result = cur.fetchone()
    if not result or not result[0] or not result[1]:
        raise ValueError(f"Material or supplier short codes not set. Material ID: {material_id}, Supplier ID: {supplier_id}")
    
    material_code, supplier_code = result
    
    # Get serial number
    fy = get_financial_year(purchase_date)
    serial = get_next_serial(material_id, supplier_id, fy, cur)
    
    # Format date as DDMMYYYY
    dt = date(1970, 1, 1) + timedelta(days=purchase_date)
    date_str = dt.strftime('%d%m%Y')
    
    # Generate code: GNS-K-1-05082025-SKM
    return f"{material_code}-{serial}-{date_str}-{supplier_code}"


def generate_batch_traceable_code(seed_material_id, seed_purchase_code, production_date, cur):
    """
    Generate traceable code for batch production
    Format: [OilMaterialCode]-[BatchSerial]-[SeedPurchaseDate]-[ProductionUnit]
    Example: GNO-K-1-05082025-PUV (first batch from this seed purchase)
    Example: GNO-K-2-05082025-PUV (second batch from same seed purchase)
    
    Args:
        seed_material_id: ID of the seed material used
        seed_purchase_code: Traceable code from seed purchase
        production_date: Production date as integer
        cur: Database cursor
    
    Returns:
        str: Generated traceable code
    """
    # Parse seed purchase code: GNS-K-1-05082025-SKM
    parts = seed_purchase_code.split('-')
    
    # Handle different formats
    if len(parts) >= 5:
        # New format with serial: GNS-K-1-05082025-SKM
        seed_material_code = f"{parts[0]}-{parts[1]}"  # GNS-K
        purchase_date_str = parts[3]  # 05082025
    elif len(parts) == 4:
        # Older format: GNS-K-05082025-SKM
        seed_material_code = f"{parts[0]}-{parts[1]}"  # GNS-K
        purchase_date_str = parts[2]  # 05082025
    else:
        raise ValueError(f"Invalid seed purchase code format: {seed_purchase_code}")
    
    # Convert seed material code to oil material code
    # GNS-K -> GNO-K (replace S with O for oil)
    if 'S-' in seed_material_code:
        oil_material_code = seed_material_code.replace('S-', 'O-')
    else:
        # If not a standard seed code, try to get from database
        cur.execute("""
            SELECT short_code FROM materials WHERE material_id = %s
        """, (seed_material_id,))
        result = cur.fetchone()
        if result and result[0]:
            seed_material_code = result[0]
            if 'S-' in seed_material_code:
                oil_material_code = seed_material_code.replace('S-', 'O-')
            else:
                oil_material_code = seed_material_code
        else:
            oil_material_code = seed_material_code
    
    # Get production unit code
    cur.execute("""
        SELECT short_code FROM production_units
        WHERE is_own_unit = true
        ORDER BY unit_id
        LIMIT 1
    """)
    
    result = cur.fetchone()
    if not result:
        raise ValueError("No production unit configured")
    
    unit_code = result[0]  # PUV
    
    # Get batch serial number for this seed purchase
    batch_serial = get_next_batch_serial(seed_material_id, seed_purchase_code, production_date, cur)
    
    # Generate code: GNO-K-1-05082025-PUV
    traceable_code = f"{oil_material_code}-{batch_serial}-{purchase_date_str}-{unit_code}"
    
    # Verify uniqueness (defensive check)
    cur.execute("SELECT 1 FROM batch WHERE traceable_code = %s", (traceable_code,))
    if cur.fetchone():
        # This should not happen with proper serial tracking, but if it does, log it
        raise ValueError(f"Generated traceable code {traceable_code} already exists. Database integrity issue.")
    
    return traceable_code


def generate_batch_traceable_code_alternative(seed_material_id, seed_purchase_code, production_date, batch_description, cur):
    """
    Alternative approach: Include production date and batch description
    Format: [OilMaterialCode]-[ProductionDate]-[BatchDesc]-[ProductionUnit]
    Example: GNO-K-12082025-MORN-PUV
    
    This ensures uniqueness even without serial numbers
    
    Args:
        seed_material_id: ID of the seed material used
        seed_purchase_code: Traceable code from seed purchase
        production_date: Production date as integer
        batch_description: Batch description (e.g., 'Morning', 'Evening')
        cur: Database cursor
    
    Returns:
        str: Generated traceable code
    """
    # Get oil material code from seed material
    cur.execute("""
        SELECT short_code FROM materials WHERE material_id = %s
    """, (seed_material_id,))
    
    result = cur.fetchone()
    if not result or not result[0]:
        raise ValueError(f"Material short code not set for material ID: {seed_material_id}")
    
    seed_code = result[0]  # e.g., GNS-K
    
    # Convert seed code to oil code
    if 'S-' in seed_code:
        oil_code = seed_code.replace('S-', 'O-')
    else:
        oil_code = seed_code
    
    # Get production unit code
    cur.execute("""
        SELECT short_code FROM production_units
        WHERE is_own_unit = true
        ORDER BY unit_id
        LIMIT 1
    """)
    
    result = cur.fetchone()
    if not result:
        raise ValueError("No production unit configured")
    
    unit_code = result[0]
    
    # Format production date as DDMMYYYY
    dt = date(1970, 1, 1) + timedelta(days=production_date)
    prod_date_str = dt.strftime('%d%m%Y')
    
    # Clean batch description (remove spaces, special chars, limit length)
    import re
    clean_desc = re.sub(r'[^A-Z0-9]', '', batch_description.upper())[:4]  # Limit to 4 chars
    
    # Generate code: GNO-K-12082025-MORN-PUV
    return f"{oil_code}-{prod_date_str}-{clean_desc}-{unit_code}"


def generate_blend_traceable_code(blend_components, blend_date, cur):
    """
    Generate traceable code for oil blend
    Format: [OilType][SupplierCodes]-[BlendDate]-[ProductionUnit]
    Example: GNOKU-07082025-PUV
    
    Args:
        blend_components: List of dicts with component details including traceable_code and percentage
        blend_date: Blending date as integer (days since epoch)
        cur: Database cursor
    
    Returns:
        str: Generated traceable code
    """
    # Sort components by percentage descending
    sorted_components = sorted(blend_components, 
                             key=lambda x: x['percentage'], 
                             reverse=True)
    
    # Extract oil type and supplier codes from source oils
    supplier_codes = []
    oil_type = None
    
    for comp in sorted_components:
        # Parse traceable code - handle multiple formats
        parts = comp['traceable_code'].split('-')
        
        if len(parts) >= 5:
            # Batch format: GNO-K-1-05082025-PUV
            material_code = f"{parts[0]}-{parts[1]}"  # GNO-K
            oil_type = parts[0][:3] if len(parts[0]) >= 3 else parts[0]
            if len(parts[1]) > 0:
                supplier_codes.append(parts[1][0])  # First letter of supplier part
        elif len(parts) == 4:
            # Older batch format: GNO-K-05082025-PUV
            material_code = f"{parts[0]}-{parts[1]}"
            oil_type = parts[0][:3] if len(parts[0]) >= 3 else parts[0]
            if len(parts[1]) > 0:
                supplier_codes.append(parts[1][0])
        elif len(parts) == 3:
            # Blend format: GNOKU-07082025-PUV
            first_part = parts[0]  # GNOKU
            oil_type = first_part[:3]  # GNO
            supplier_codes.extend(list(first_part[3:]))  # K, U
    
    # Remove duplicates while preserving order
    seen = set()
    unique_suppliers = []
    for code in supplier_codes:
        if code not in seen and code:  # Ensure code is not empty
            seen.add(code)
            unique_suppliers.append(code)
    
    # Join supplier codes (limit to avoid too long codes)
    suppliers = ''.join(unique_suppliers[:4])  # Max 4 supplier codes
    
    # Format date as DDMMYYYY
    dt = date(1970, 1, 1) + timedelta(days=blend_date)
    date_str = dt.strftime('%d%m%Y')
    
    # Get production unit
    cur.execute("""
        SELECT short_code FROM production_units
        WHERE is_own_unit = true
        ORDER BY unit_id
        LIMIT 1
    """)
    
    result = cur.fetchone()
    if not result:
        raise ValueError("No production unit configured")
    
    unit_code = result[0]
    
    # Generate code: GNOKU-07082025-PUV
    return f"{oil_type}{suppliers}-{date_str}-{unit_code}"


def extract_oil_type_from_code(traceable_code):
    """
    Extract oil type from any traceable code
    
    Args:
        traceable_code: Any traceable code from the system
    
    Returns:
        str: Oil type (e.g., 'Groundnut', 'Sesame')
    """
    # Extract the first part before any hyphen
    parts = traceable_code.split('-')
    if not parts:
        return None
    
    code_part = parts[0]
    
    # Map common oil codes to oil types
    oil_type_map = {
        'GNO': 'Groundnut',
        'GNS': 'Groundnut',
        'SEO': 'Sesame',
        'SES': 'Sesame',
        'COO': 'Coconut',
        'COS': 'Coconut',
        'MUO': 'Mustard',
        'MUS': 'Mustard'
    }
    
    # Check first 3 characters
    oil_code = code_part[:3].upper()
    return oil_type_map.get(oil_code, 'Unknown')


def validate_material_short_code(short_code):
    """
    Validate material short code format
    Must match pattern: XXX-YY or XXX-Y (1-3 letters, hyphen, 1-2 letters)
    
    Args:
        short_code: Code to validate
    
    Returns:
        bool: True if valid, False otherwise
    """
    import re
    pattern = r'^[A-Z]{1,3}-[A-Z]{1,2}$'
    return bool(re.match(pattern, short_code))


def validate_supplier_short_code(short_code):
    """
    Validate supplier short code format
    Must be exactly 3 uppercase letters
    
    Args:
        short_code: Code to validate
    
    Returns:
        bool: True if valid, False otherwise
    """
    import re
    pattern = r'^[A-Z]{3}$'
    return bool(re.match(pattern, short_code))


def validate_production_unit_code(short_code):
    """
    Validate production unit code format
    Must be 1-3 uppercase letters
    
    Args:
        short_code: Code to validate
    
    Returns:
        bool: True if valid, False otherwise
    """
    import re
    pattern = r'^[A-Z]{1,3}$'
    return bool(re.match(pattern, short_code))
