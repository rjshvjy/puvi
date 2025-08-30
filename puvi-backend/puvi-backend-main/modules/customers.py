"""
Customer Management Module for PUVI Oil Manufacturing System
Handles CRUD operations for customers and their ship-to locations
Supports sales transactions and third-party location management
File Path: puvi-backend/puvi-backend-main/modules/customers.py
"""

from flask import Blueprint, request, jsonify
from db_utils import get_db_connection, close_connection
from utils.validation import validate_required_fields

# Create Blueprint
customers_bp = Blueprint('customers', __name__)

# ============================================
# HELPER FUNCTIONS
# ============================================

def generate_customer_code(customer_name, cur):
    """
    Generate unique 3-letter customer code
    Examples: Amazon -> AMZ, Walmart -> WMT, Big Bazaar -> BIG
    
    Args:
        customer_name: Name of the customer
        cur: Database cursor
    
    Returns:
        str: Generated 3-letter code
    """
    # Remove common suffixes and clean name
    name = customer_name.upper()
    for suffix in [' PVT LTD', ' PRIVATE LIMITED', ' LTD', ' LIMITED', ' INC', ' CORPORATION', ' CORP']:
        name = name.replace(suffix, '')
    
    # Remove special characters and extra spaces
    name = ''.join(c for c in name if c.isalnum() or c.isspace())
    words = name.split()
    
    code = ''
    
    # Strategy 1: First letter of each word (up to 3 words)
    if len(words) >= 3:
        code = ''.join(word[0] for word in words[:3])
    elif len(words) == 2:
        # Two words: first letter + first two letters of second word
        code = words[0][0] + words[1][:2]
    elif len(words) == 1:
        # Single word: first 3 letters
        code = words[0][:3]
    
    # Ensure code is exactly 3 characters
    code = code[:3].ljust(3, 'X')
    
    # Check uniqueness and adjust if needed
    original_code = code
    counter = 1
    
    while True:
        cur.execute("""
            SELECT customer_id FROM customers 
            WHERE customer_code = %s
        """, (code,))
        
        if not cur.fetchone():
            break
        
        # Try variations: last char becomes a number
        if counter <= 9:
            code = original_code[:2] + str(counter)
        else:
            # Use middle variations
            code = original_code[0] + str(counter % 10) + original_code[2]
        
        counter += 1
        
        if counter > 99:
            # Fallback to random-ish code
            import random
            code = original_code[0] + ''.join(random.choices('0123456789', k=2))
    
    return code


def validate_customer_data(data, is_update=False):
    """
    Validate customer data before insert/update
    
    Args:
        data: Customer data dictionary
        is_update: Whether this is an update operation
    
    Returns:
        tuple: (is_valid, error_messages)
    """
    errors = []
    
    if not is_update:
        required_fields = ['customer_name']
        is_valid, missing = validate_required_fields(data, required_fields)
        if not is_valid:
            errors.append(f"Missing required fields: {', '.join(missing)}")
    
    # Validate GST number format if provided
    if data.get('gst_number'):
        gst = data['gst_number'].upper()
        if len(gst) != 15:
            errors.append("GST number must be exactly 15 characters")
        elif not gst[:2].isdigit() or not gst[2:12].isalnum() or not gst[12].isdigit():
            errors.append("Invalid GST number format")
    
    # Validate PAN number format if provided
    if data.get('pan_number'):
        pan = data['pan_number'].upper()
        if len(pan) != 10:
            errors.append("PAN number must be exactly 10 characters")
        elif not pan[:5].isalpha() or not pan[5:9].isdigit() or not pan[9].isalpha():
            errors.append("Invalid PAN number format")
    
    # Validate email if provided
    if data.get('contact_email'):
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, data['contact_email']):
            errors.append("Invalid email format")
    
    # Validate phone if provided
    if data.get('contact_phone'):
        phone_digits = ''.join(filter(str.isdigit, data['contact_phone']))
        if len(phone_digits) < 10 or len(phone_digits) > 15:
            errors.append("Phone number should be 10-15 digits")
    
    return len(errors) == 0, errors


def generate_ship_to_code(customer_code, cur):
    """
    Generate ship-to location code
    Format: CUST-ST-001 (e.g., AMZ-ST-001)
    
    Args:
        customer_code: Parent customer code
        cur: Database cursor
    
    Returns:
        str: Generated ship-to code
    """
    # Get count of ship-to locations for this customer
    cur.execute("""
        SELECT COUNT(*) FROM customer_ship_to_locations
        WHERE customer_id IN (
            SELECT customer_id FROM customers WHERE customer_code = %s
        )
    """, (customer_code,))
    
    count = cur.fetchone()[0]
    return f"{customer_code}-ST-{count + 1:03d}"


# ============================================
# CUSTOMER CRUD ENDPOINTS
# ============================================

@customers_bp.route('/api/customers', methods=['GET'])
def get_customers():
    """Get all customers with optional filters"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get filter parameters
        is_active = request.args.get('is_active', 'true').lower() == 'true'
        include_inactive = request.args.get('include_inactive', 'false').lower() == 'true'
        customer_type = request.args.get('customer_type')
        
        query = """
            SELECT 
                c.customer_id,
                c.customer_code,
                c.customer_name,
                c.customer_type,
                c.gst_number,
                c.pan_number,
                c.contact_person,
                c.contact_phone,
                c.contact_email,
                c.is_active,
                c.created_at,
                c.created_by,
                COUNT(DISTINCT stl.ship_to_id) as ship_to_count,
                COUNT(DISTINCT so.outbound_id) as transaction_count
            FROM customers c
            LEFT JOIN customer_ship_to_locations stl ON c.customer_id = stl.customer_id
            LEFT JOIN sku_outbound so ON c.customer_id = so.customer_id
            WHERE 1=1
        """
        
        params = []
        
        if not include_inactive:
            query += " AND c.is_active = %s"
            params.append(is_active)
        
        if customer_type:
            query += " AND c.customer_type = %s"
            params.append(customer_type)
        
        query += """
            GROUP BY c.customer_id, c.customer_code, c.customer_name,
                     c.customer_type, c.gst_number, c.pan_number,
                     c.contact_person, c.contact_phone, c.contact_email,
                     c.is_active, c.created_at, c.created_by
            ORDER BY c.customer_name
        """
        
        cur.execute(query, params)
        
        customers = []
        for row in cur.fetchall():
            customers.append({
                'customer_id': row[0],
                'customer_code': row[1],
                'customer_name': row[2],
                'customer_type': row[3],
                'gst_number': row[4],
                'pan_number': row[5],
                'contact_person': row[6],
                'contact_phone': row[7],
                'contact_email': row[8],
                'is_active': row[9],
                'created_at': row[10].isoformat() if row[10] else None,
                'created_by': row[11],
                'ship_to_count': row[12] or 0,
                'transaction_count': row[13] or 0
            })
        
        return jsonify({
            'success': True,
            'customers': customers,
            'count': len(customers)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@customers_bp.route('/api/customers/<int:customer_id>', methods=['GET'])
def get_customer_details(customer_id):
    """Get detailed information for a specific customer including ship-to locations"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get customer details
        cur.execute("""
            SELECT 
                c.*,
                COUNT(DISTINCT so.outbound_id) as total_transactions,
                SUM(so.grand_total) as total_business_value
            FROM customers c
            LEFT JOIN sku_outbound so ON c.customer_id = so.customer_id
            WHERE c.customer_id = %s
            GROUP BY c.customer_id
        """, (customer_id,))
        
        row = cur.fetchone()
        if not row:
            return jsonify({'success': False, 'error': 'Customer not found'}), 404
        
        columns = [desc[0] for desc in cur.description]
        customer_data = dict(zip(columns, row))
        
        # Get ship-to locations
        cur.execute("""
            SELECT 
                ship_to_id,
                location_code,
                location_name,
                address_line1,
                address_line2,
                city,
                state,
                pincode,
                contact_person,
                contact_phone,
                is_active,
                is_default
            FROM customer_ship_to_locations
            WHERE customer_id = %s
            ORDER BY is_default DESC, location_name
        """, (customer_id,))
        
        ship_to_locations = []
        for stl_row in cur.fetchall():
            ship_to_locations.append({
                'ship_to_id': stl_row[0],
                'location_code': stl_row[1],
                'location_name': stl_row[2],
                'address': {
                    'line1': stl_row[3],
                    'line2': stl_row[4],
                    'city': stl_row[5],
                    'state': stl_row[6],
                    'pincode': stl_row[7]
                },
                'contact_person': stl_row[8],
                'contact_phone': stl_row[9],
                'is_active': stl_row[10],
                'is_default': stl_row[11]
            })
        
        response = {
            'success': True,
            'customer': {
                'customer_id': customer_data['customer_id'],
                'customer_code': customer_data['customer_code'],
                'customer_name': customer_data['customer_name'],
                'customer_type': customer_data['customer_type'],
                'gst_number': customer_data['gst_number'],
                'pan_number': customer_data['pan_number'],
                'contact_person': customer_data['contact_person'],
                'contact_phone': customer_data['contact_phone'],
                'contact_email': customer_data['contact_email'],
                'is_active': customer_data['is_active'],
                'created_at': customer_data['created_at'].isoformat() if customer_data['created_at'] else None,
                'created_by': customer_data['created_by'],
                'business_summary': {
                    'total_transactions': customer_data['total_transactions'] or 0,
                    'total_business_value': float(customer_data['total_business_value']) if customer_data['total_business_value'] else 0
                },
                'ship_to_locations': ship_to_locations
            }
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@customers_bp.route('/api/customers', methods=['POST'])
def create_customer():
    """Create a new customer"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        # Validate data
        is_valid, errors = validate_customer_data(data)
        if not is_valid:
            return jsonify({'success': False, 'errors': errors}), 400
        
        # Generate customer code if not provided
        if not data.get('customer_code'):
            data['customer_code'] = generate_customer_code(data['customer_name'], cur)
        else:
            # Check uniqueness
            cur.execute("""
                SELECT customer_id FROM customers 
                WHERE customer_code = %s
            """, (data['customer_code'],))
            
            if cur.fetchone():
                return jsonify({
                    'success': False,
                    'error': f"Customer code '{data['customer_code']}' already exists"
                }), 400
        
        # Insert customer
        cur.execute("""
            INSERT INTO customers (
                customer_code, customer_name, customer_type,
                gst_number, pan_number,
                contact_person, contact_phone, contact_email,
                is_active, created_by, created_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP
            ) RETURNING customer_id
        """, (
            data['customer_code'],
            data['customer_name'],
            data.get('customer_type'),
            data.get('gst_number'),
            data.get('pan_number'),
            data.get('contact_person'),
            data.get('contact_phone'),
            data.get('contact_email'),
            data.get('is_active', True),
            data.get('created_by', 'System')
        ))
        
        customer_id = cur.fetchone()[0]
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'customer_id': customer_id,
            'customer_code': data['customer_code'],
            'message': f"Customer '{data['customer_name']}' created successfully"
        }), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@customers_bp.route('/api/customers/<int:customer_id>', methods=['PUT'])
def update_customer(customer_id):
    """Update an existing customer"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        # Check if customer exists
        cur.execute("""
            SELECT customer_id FROM customers 
            WHERE customer_id = %s
        """, (customer_id,))
        
        if not cur.fetchone():
            return jsonify({'success': False, 'error': 'Customer not found'}), 404
        
        # Validate data
        is_valid, errors = validate_customer_data(data, is_update=True)
        if not is_valid:
            return jsonify({'success': False, 'errors': errors}), 400
        
        # Build update query
        update_fields = []
        update_values = []
        
        allowed_fields = [
            'customer_name', 'customer_type', 'gst_number', 'pan_number',
            'contact_person', 'contact_phone', 'contact_email', 'is_active'
        ]
        
        for field in allowed_fields:
            if field in data:
                update_fields.append(f"{field} = %s")
                update_values.append(data[field])
        
        if not update_fields:
            return jsonify({'success': False, 'error': 'No valid fields to update'}), 400
        
        # Execute update
        query = f"""
            UPDATE customers 
            SET {', '.join(update_fields)}
            WHERE customer_id = %s
        """
        update_values.append(customer_id)
        
        cur.execute(query, update_values)
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Customer updated successfully'
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@customers_bp.route('/api/customers/<int:customer_id>', methods=['DELETE'])
def delete_customer(customer_id):
    """Delete or deactivate a customer"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Check for dependencies
        cur.execute("""
            SELECT COUNT(*) FROM sku_outbound 
            WHERE customer_id = %s
        """, (customer_id,))
        
        transaction_count = cur.fetchone()[0]
        
        if transaction_count > 0:
            # Soft delete only
            cur.execute("""
                UPDATE customers 
                SET is_active = false 
                WHERE customer_id = %s
                RETURNING customer_name
            """, (customer_id,))
            
            result = cur.fetchone()
            if not result:
                return jsonify({'success': False, 'error': 'Customer not found'}), 404
            
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': f"Customer '{result[0]}' deactivated (has {transaction_count} transactions)",
                'soft_delete': True
            })
        else:
            # Hard delete
            cur.execute("""
                DELETE FROM customer_ship_to_locations 
                WHERE customer_id = %s
            """, (customer_id,))
            
            cur.execute("""
                DELETE FROM customers 
                WHERE customer_id = %s
                RETURNING customer_name
            """, (customer_id,))
            
            result = cur.fetchone()
            if not result:
                return jsonify({'success': False, 'error': 'Customer not found'}), 404
            
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': f"Customer '{result[0]}' permanently deleted",
                'soft_delete': False
            })
            
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# ============================================
# SHIP-TO LOCATION ENDPOINTS
# ============================================

@customers_bp.route('/api/customers/<int:customer_id>/ship-to', methods=['GET'])
def get_ship_to_locations(customer_id):
    """Get all ship-to locations for a customer"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT 
                ship_to_id,
                location_code,
                location_name,
                address_line1,
                address_line2,
                city,
                state,
                pincode,
                contact_person,
                contact_phone,
                is_active,
                is_default,
                created_at
            FROM customer_ship_to_locations
            WHERE customer_id = %s
            ORDER BY is_default DESC, location_name
        """, (customer_id,))
        
        locations = []
        for row in cur.fetchall():
            locations.append({
                'ship_to_id': row[0],
                'location_code': row[1],
                'location_name': row[2],
                'address_line1': row[3],
                'address_line2': row[4],
                'city': row[5],
                'state': row[6],
                'pincode': row[7],
                'contact_person': row[8],
                'contact_phone': row[9],
                'is_active': row[10],
                'is_default': row[11],
                'created_at': row[12].isoformat() if row[12] else None
            })
        
        return jsonify({
            'success': True,
            'ship_to_locations': locations,
            'count': len(locations)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@customers_bp.route('/api/customers/<int:customer_id>/ship-to', methods=['POST'])
def create_ship_to_location(customer_id):
    """Create a new ship-to location for a customer"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['location_name', 'city', 'state']
        is_valid, missing = validate_required_fields(data, required_fields)
        if not is_valid:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing)}'
            }), 400
        
        # Get customer code
        cur.execute("""
            SELECT customer_code FROM customers 
            WHERE customer_id = %s
        """, (customer_id,))
        
        result = cur.fetchone()
        if not result:
            return jsonify({'success': False, 'error': 'Customer not found'}), 404
        
        customer_code = result[0]
        
        # Generate location code
        location_code = generate_ship_to_code(customer_code, cur)
        
        # Insert ship-to location
        cur.execute("""
            INSERT INTO customer_ship_to_locations (
                customer_id, location_code, location_name,
                address_line1, address_line2, city, state, pincode,
                contact_person, contact_phone,
                is_active, is_default, created_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP
            ) RETURNING ship_to_id
        """, (
            customer_id,
            location_code,
            data['location_name'],
            data.get('address_line1'),
            data.get('address_line2'),
            data['city'],
            data['state'],
            data.get('pincode'),
            data.get('contact_person'),
            data.get('contact_phone'),
            data.get('is_active', True),
            data.get('is_default', False)
        ))
        
        ship_to_id = cur.fetchone()[0]
        
        # If set as default, unset other defaults
        if data.get('is_default'):
            cur.execute("""
                UPDATE customer_ship_to_locations 
                SET is_default = false 
                WHERE customer_id = %s AND ship_to_id != %s
            """, (customer_id, ship_to_id))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'ship_to_id': ship_to_id,
            'location_code': location_code,
            'message': 'Ship-to location created successfully'
        }), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@customers_bp.route('/api/customers/dropdown', methods=['GET'])
def get_customers_dropdown():
    """Get simplified customer list for dropdowns"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT 
                customer_id,
                customer_code,
                customer_name,
                customer_type
            FROM customers
            WHERE is_active = true
            ORDER BY customer_name
        """)
        
        customers = []
        for row in cur.fetchall():
            customers.append({
                'value': row[0],
                'label': f"{row[2]} ({row[1]})",
                'customer_code': row[1],
                'customer_name': row[2],
                'customer_type': row[3]
            })
        
        return jsonify({
            'success': True,
            'customers': customers,
            'count': len(customers)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@customers_bp.route('/api/customers/<int:customer_id>/restore', methods=['POST'])
def restore_customer(customer_id):
    """Restore a deactivated customer"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            UPDATE customers 
            SET is_active = true
            WHERE customer_id = %s AND is_active = false
            RETURNING customer_name
        """, (customer_id,))
        
        result = cur.fetchone()
        if not result:
            return jsonify({
                'success': False,
                'error': 'Customer not found or already active'
            }), 404
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': f"Customer '{result[0]}' restored successfully"
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)
