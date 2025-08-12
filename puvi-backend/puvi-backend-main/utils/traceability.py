"""
Traceability utilities for PUVI Oil Manufacturing System
Handles generation of traceable codes throughout the production cycle
File Path: puvi-backend/puvi-backend-main/utils/traceability.py
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


def get_next_batch_serial(seed_purchase_code, production_date, cur):
    """
    Get next serial number for batches from same seed purchase
    Uses a special tracking entry for batch production
    
    Args:
        seed_purchase_code: The traceable code from seed purchase
        production_date: Production date as integer (days since epoch)
        cur: Database cursor
    
    Returns:
        int: Next serial number for this seed purchase
    """
    # Get financial year from production date
    fy = get_financial_year(production_date)
    
    # Use special material_id = -1 and supplier_id = -1 for batch tracking
    # Store the seed_purchase_code in the notes field for reference
    cur.execute("""
        INSERT INTO serial_number_tracking
        (material_id, supplier_id, financial_year, current_serial)
        VALUES (-1, -1, %s, 1)
        ON CONFLICT (material_id, supplier_id, financial_year)
        DO UPDATE SET 
            current_serial = serial_number_tracking.current_serial + 1,
            last_updated = CURRENT_TIMESTAMP
        RETURNING current_serial
    """, (f"BATCH-{seed_purchase_code[:20]}",))  # Use first 20 chars as unique key
    
    return cur.fetchone()[0]


def generate_purchase_traceable_code(material_id, supplier_id, purchase_date, cur):
    """
    Generate traceable code for purchase
    Format: [Material]-[Supplier]-[Serial]-[Date]-[SupplierCode]
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
    Format: [OilType]-[SupplierTrace]-[BatchSerial]-[SeedPurchaseDate]-[ProductionUnit]
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
    # Extract info from seed purchase code
    # Example: GNS-K-1-05082025-SKM -> extract supplier trace and purchase date
    parts = seed_purchase_code.split('-')
    if len(parts) < 5:
        raise ValueError(f"Invalid seed purchase code format: {seed_purchase_code}")
    
    supplier_trace = parts[1]  # K
    purchase_date = parts[3]   # 05082025
    
    # Get oil material code (convert seed code to oil code)
    cur.execute("""
        SELECT short_code FROM materials
        WHERE material_id = %s
    """, (seed_material_id,))
    
    result = cur.fetchone()
    if not result or not result[0]:
        raise ValueError(f"Material short code not set for material ID: {seed_material_id}")
    
    seed_code = result[0]  # e.g., GNS-K
    
    # Convert seed code to oil code (GNS-K -> GNO-K)
    if 'S-' in seed_code:
        oil_code = seed_code.replace('S-', 'O-')
    else:
        # If not a standard seed code, use as is
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
    
    unit_code = result[0]  # PUV
    
    # Get batch serial number for this seed purchase
    batch_serial = get_next_batch_serial(seed_purchase_code, production_date, cur)
    
    # Generate code with batch serial: GNO-K-1-05082025-PUV
    return f"{oil_code}-{supplier_trace}-{batch_serial}-{purchase_date}-{unit_code}"


def generate_batch_traceable_code_alternative(seed_material_id, seed_purchase_code, production_date, batch_description, cur):
    """
    Alternative approach: Include production date and batch description
    Format: [OilType]-[SupplierTrace]-[ProductionDate]-[BatchDesc]-[ProductionUnit]
    Example: GNO-K-12082025-MORNING-PUV
    
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
    # Extract info from seed purchase code
    parts = seed_purchase_code.split('-')
    if len(parts) < 5:
        raise ValueError(f"Invalid seed purchase code format: {seed_purchase_code}")
    
    supplier_trace = parts[1]  # K
    
    # Get oil material code (convert seed code to oil code)
    cur.execute("""
        SELECT short_code FROM materials
        WHERE material_id = %s
    """, (seed_material_id,))
    
    result = cur.fetchone()
    if not result or not result[0]:
        raise ValueError(f"Material short code not set for material ID: {seed_material_id}")
    
    seed_code = result[0]
    
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
    clean_desc = re.sub(r'[^A-Z0-9]', '', batch_description.upper())[:6]
    
    # Generate code: GNO-K-12082025-MORN-PUV
    return f"{oil_code}-{supplier_trace}-{prod_date_str}-{clean_desc}-{unit_code}"


def generate_blend_traceable_code(blend_components, blend_date, cur):
    """
    Generate traceable code for oil blend
    Format: [OilType][SourceCodes]-[BlendDate]-[ProductionUnit]
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
    
    # Extract supplier codes from source oils
    supplier_codes = []
    oil_type = None
    
    for comp in sorted_components:
        # Parse traceable code
        # Could be: GNO-K-1-05082025-PUV (from extraction with new format)
        # Or: GNO-K-05082025-PUV (from extraction with old format)
        # Or: GNOKU-07082025-PUV (from previous blend)
        parts = comp['traceable_code'].split('-')
        
        if len(parts) == 5:  # New format with serial
            oil_type = parts[0]  # GNO
            supplier_codes.append(parts[1])  # K
        elif len(parts) == 4:  # Old format without serial
            oil_type = parts[0]  # GNO
            supplier_codes.append(parts[1])  # K
        elif len(parts) == 3:  # From blend
            # Extract oil type and supplier codes
            first_part = parts[0]  # GNOKU
            # Oil type is first 3 letters
            oil_type = first_part[:3]  # GNO
            # Rest are supplier codes
            supplier_codes.extend(list(first_part[3:]))  # K, U
    
    # Remove duplicates while preserving order
    seen = set()
    unique_suppliers = []
    for code in supplier_codes:
        if code not in seen:
            seen.add(code)
            unique_suppliers.append(code)
    
    # Join supplier codes
    suppliers = ''.join(unique_suppliers)
    
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
