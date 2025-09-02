"""
Locations Master Module for PUVI Oil Manufacturing System
Handles CRUD operations for locations including warehouses, factories, and customer locations
Supports internal (own) and third-party location management with inventory validation
Enhanced with GST number support for third-party warehouses
File Path: puvi-backend/puvi-backend-main/modules/locations.py
"""

from flask import Blueprint, request, jsonify
from decimal import Decimal
from db_utils import get_db_connection, close_connection
from utils.date_utils import get_current_day_number, integer_to_date, format_date_indian
from utils.validation import validate_required_fields, safe_int
import re

# Create Blueprint
locations_bp = Blueprint('locations', __name__)

# ============================================
# HELPER FUNCTIONS
# ============================================

def validate_gst_number(gst_number):
    """
    Validate GST number format
    Format: 15 characters - ^[0-9]{2}[A-Z0-9]{10}[0-9]{1}[A-Z]{1}[A-Z0-9]{1}$
    
    Args:
        gst_number: GST number to validate
    
    Returns:
        tuple: (is_valid, error_message)
    """
    if not gst_number:
        # GST is optional
        return True, None
    
    # Convert to uppercase for validation and storage
    gst_number = gst_number.upper()
    
    # Check length
    if len(gst_number) != 15:
        return False, "GST number must be exactly 15 characters"
    
    # Check pattern
    pattern = r'^[0-9]{2}[A-Z0-9]{10}[0-9]{1}[A-Z]{1}[A-Z0-9]{1}$'
    if not re.match(pattern, gst_number):
        return False, "Invalid GST number format"
    
    return True, None


def generate_location_code(location_name, location_type, cur):
    """
    Generate unique location code
    Format: TYPE-XXX (e.g., FAC-001, WH-002, CUST-003)
    
    Args:
        location_name: Name of the location
        location_type: Type of location (factory/warehouse/customer)
        cur: Database cursor
    
    Returns:
        str: Generated location code
    """
    # Determine prefix based on type
    prefix_map = {
        'factory': 'FAC',
        'warehouse': 'WH',
        'customer': 'CUST'
    }
    prefix = prefix_map.get(location_type, 'LOC')
    
    # Get count of locations with same type
    cur.execute("""
        SELECT COUNT(*) FROM locations_master
        WHERE location_type = %s
    """, (location_type,))
    
    count = cur.fetchone()[0]
    
    # Generate code with sequential number
    code = f"{prefix}-{count + 1:03d}"
    
    # Ensure uniqueness
    cur.execute("""
        SELECT location_id FROM locations_master
        WHERE location_code = %s
    """, (code,))
    
    if cur.fetchone():
        # If exists, find the next available number
        cur.execute("""
            SELECT MAX(CAST(SUBSTRING(location_code FROM '[0-9]+$') AS INTEGER))
            FROM locations_master
            WHERE location_code LIKE %s
        """, (f"{prefix}-%",))
        
        max_num = cur.fetchone()[0] or 0
        code = f"{prefix}-{max_num + 1:03d}"
    
    return code


def check_location_dependencies(location_id, cur):
    """
    Check if location has dependencies that prevent deletion
    
    Args:
        location_id: Location ID to check
        cur: Database cursor
    
    Returns:
        dict: Dependencies information
    """
    dependencies = {
        'has_dependencies': False,
        'dependency_count': 0,
        'details': []
    }
    
    # Check SKU inventory
    cur.execute("""
        SELECT COUNT(*), SUM(quantity_available) 
        FROM sku_inventory 
        WHERE location_id = %s AND quantity_available > 0
    """, (location_id,))
    
    sku_count, sku_quantity = cur.fetchone()
    if sku_count and sku_count > 0:
        dependencies['has_dependencies'] = True
        dependencies['dependency_count'] += sku_count
        dependencies['details'].append({
            'type': 'sku_inventory',
            'count': sku_count,
            'quantity': float(sku_quantity) if sku_quantity else 0,
            'message': f'{sku_count} SKUs with {sku_quantity or 0} units in inventory'
        })
    
    # Check expiry tracking
    cur.execute("""
        SELECT COUNT(*) 
        FROM sku_expiry_tracking 
        WHERE location_id = %s AND quantity_remaining > 0
    """, (location_id,))
    
    expiry_count = cur.fetchone()[0]
    if expiry_count > 0:
        dependencies['has_dependencies'] = True
        dependencies['dependency_count'] += expiry_count
        dependencies['details'].append({
            'type': 'expiry_tracking',
            'count': expiry_count,
            'message': f'{expiry_count} active expiry tracking records'
        })
    
    # Check outbound transactions (from location)
    cur.execute("""
        SELECT COUNT(*) 
        FROM sku_outbound 
        WHERE from_location_id = %s OR to_location_id = %s
    """, (location_id, location_id))
    
    outbound_count = cur.fetchone()[0]
    if outbound_count > 0:
        dependencies['has_dependencies'] = True
        dependencies['dependency_count'] += outbound_count
        dependencies['details'].append({
            'type': 'outbound_transactions',
            'count': outbound_count,
            'message': f'{outbound_count} outbound transactions reference this location'
        })
    
    # Check if location is linked to customers (for third-party locations)
    cur.execute("""
        SELECT COUNT(*) 
        FROM customers 
        WHERE customer_id IN (
            SELECT customer_id FROM locations_master WHERE location_id = %s
        )
    """, (location_id,))
    
    customer_count = cur.fetchone()[0]
    if customer_count > 0:
        dependencies['details'].append({
            'type': 'customer_link',
            'count': customer_count,
            'message': 'Location is linked to a customer'
        })
    
    return dependencies


def validate_location_data(data, is_update=False):
    """
    Validate location data before insert/update
    
    Args:
        data: Location data dictionary
        is_update: Whether this is an update operation
    
    Returns:
        tuple: (is_valid, error_message)
    """
    errors = []
    
    # Check required fields for new locations
    if not is_update:
        required_fields = ['location_name', 'location_type', 'ownership']
        is_valid, missing = validate_required_fields(data, required_fields)
        if not is_valid:
            errors.append(f"Missing required fields: {', '.join(missing)}")
    
    # Validate location type
    if 'location_type' in data:
        valid_types = ['factory', 'warehouse', 'customer']
        if data['location_type'] not in valid_types:
            errors.append(f"Invalid location_type. Must be one of: {', '.join(valid_types)}")
    
    # Validate ownership
    if 'ownership' in data:
        valid_ownership = ['own', 'third_party']
        if data['ownership'] not in valid_ownership:
            errors.append(f"Invalid ownership. Must be one of: {', '.join(valid_ownership)}")
    
    # Validate third-party requirement
    if data.get('ownership') == 'third_party' and not data.get('customer_id'):
        errors.append("customer_id is required for third-party locations")
    
    # Validate GST number if provided
    if data.get('gst_number'):
        is_valid_gst, gst_error = validate_gst_number(data['gst_number'])
        if not is_valid_gst:
            errors.append(gst_error)
    
    # Validate email format if provided
    if data.get('contact_email'):
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, data['contact_email']):
            errors.append("Invalid email format")
    
    # Validate phone format if provided
    if data.get('contact_phone'):
        # Remove non-numeric characters for validation
        phone_digits = ''.join(filter(str.isdigit, data['contact_phone']))
        if len(phone_digits) < 10 or len(phone_digits) > 15:
            errors.append("Phone number should be 10-15 digits")
    
    # Validate pincode if provided
    if data.get('pincode'):
        if not data['pincode'].isdigit() or len(data['pincode']) != 6:
            errors.append("Pincode must be 6 digits")
    
    return len(errors) == 0, errors


# ============================================
# CRUD ENDPOINTS
# ============================================

@locations_bp.route('/api/locations', methods=['GET'])
def get_locations():
    """Get all locations with optional filters"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get filter parameters
        location_type = request.args.get('location_type')
        ownership = request.args.get('ownership')
        is_active = request.args.get('is_active', 'true').lower() == 'true'
        include_inactive = request.args.get('include_inactive', 'false').lower() == 'true'
        
        # Build query
        query = """
            SELECT 
                l.location_id,
                l.location_code,
                l.location_name,
                l.location_type,
                l.ownership,
                l.customer_id,
                c.customer_name,
                l.address_line1,
                l.address_line2,
                l.city,
                l.state,
                l.pincode,
                l.contact_person,
                l.contact_phone,
                l.contact_email,
                l.is_production_unit,
                l.is_sales_point,
                l.is_default,
                l.is_active,
                l.created_at,
                l.notes,
                (SELECT COUNT(*) FROM sku_inventory 
                 WHERE location_id = l.location_id 
                 AND quantity_available > 0) as inventory_count,
                l.gst_number
            FROM locations_master l
            LEFT JOIN customers c ON l.customer_id = c.customer_id
            WHERE 1=1
        """
        
        params = []
        
        if not include_inactive:
            query += " AND l.is_active = %s"
            params.append(is_active)
        
        if location_type:
            query += " AND l.location_type = %s"
            params.append(location_type)
        
        if ownership:
            query += " AND l.ownership = %s"
            params.append(ownership)
        
        query += " ORDER BY l.location_type, l.location_code"
        
        cur.execute(query, params)
        
        locations = []
        for row in cur.fetchall():
            location = {
                'location_id': row[0],
                'location_code': row[1],
                'location_name': row[2],
                'location_type': row[3],
                'ownership': row[4],
                'customer_id': row[5],
                'customer_name': row[6],
                'address': {
                    'line1': row[7],
                    'line2': row[8],
                    'city': row[9],
                    'state': row[10],
                    'pincode': row[11]
                },
                'contact': {
                    'person': row[12],
                    'phone': row[13],
                    'email': row[14]
                },
                'capabilities': {
                    'is_production_unit': row[15],
                    'is_sales_point': row[16],
                    'is_default': row[17]
                },
                'is_active': row[18],
                'created_at': row[19].isoformat() if row[19] else None,
                'notes': row[20],
                'inventory_count': row[21] or 0,
                'gst_number': row[22]
            }
            locations.append(location)
        
        return jsonify({
            'success': True,
            'locations': locations,
            'count': len(locations)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@locations_bp.route('/api/locations/<int:location_id>', methods=['GET'])
def get_location_details(location_id):
    """Get detailed information for a specific location"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT 
                l.*,
                c.customer_name,
                c.customer_code,
                (SELECT COUNT(*) FROM sku_inventory 
                 WHERE location_id = l.location_id 
                 AND quantity_available > 0) as inventory_count,
                (SELECT SUM(quantity_available) FROM sku_inventory 
                 WHERE location_id = l.location_id) as total_inventory
            FROM locations_master l
            LEFT JOIN customers c ON l.customer_id = c.customer_id
            WHERE l.location_id = %s
        """, (location_id,))
        
        row = cur.fetchone()
        
        if not row:
            return jsonify({'success': False, 'error': 'Location not found'}), 404
        
        columns = [desc[0] for desc in cur.description]
        location_data = dict(zip(columns, row))
        
        # Format response
        response = {
            'success': True,
            'location': {
                'location_id': location_data['location_id'],
                'location_code': location_data['location_code'],
                'location_name': location_data['location_name'],
                'location_type': location_data['location_type'],
                'ownership': location_data['ownership'],
                'customer': {
                    'customer_id': location_data['customer_id'],
                    'customer_name': location_data['customer_name'],
                    'customer_code': location_data['customer_code']
                } if location_data['customer_id'] else None,
                'address': {
                    'line1': location_data['address_line1'],
                    'line2': location_data['address_line2'],
                    'city': location_data['city'],
                    'state': location_data['state'],
                    'pincode': location_data['pincode']
                },
                'contact': {
                    'person': location_data['contact_person'],
                    'phone': location_data['contact_phone'],
                    'email': location_data['contact_email']
                },
                'capabilities': {
                    'is_production_unit': location_data['is_production_unit'],
                    'is_sales_point': location_data['is_sales_point'],
                    'is_default': location_data['is_default']
                },
                'inventory_summary': {
                    'sku_count': location_data['inventory_count'] or 0,
                    'total_quantity': float(location_data['total_inventory']) if location_data['total_inventory'] else 0
                },
                'gst_number': location_data['gst_number'],
                'is_active': location_data['is_active'],
                'created_at': location_data['created_at'].isoformat() if location_data['created_at'] else None,
                'updated_at': location_data['updated_at'].isoformat() if location_data['updated_at'] else None,
                'created_by': location_data['created_by'],
                'notes': location_data['notes']
            }
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@locations_bp.route('/api/locations', methods=['POST'])
def create_location():
    """Create a new location"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        # Validate data
        is_valid, errors = validate_location_data(data)
        if not is_valid:
            return jsonify({
                'success': False,
                'errors': errors
            }), 400
        
        # Convert GST to uppercase if provided
        if data.get('gst_number'):
            data['gst_number'] = data['gst_number'].upper()
        
        # Validate customer exists if third-party
        if data.get('ownership') == 'third_party':
            cur.execute("""
                SELECT customer_id, customer_name 
                FROM customers 
                WHERE customer_id = %s AND is_active = true
            """, (data['customer_id'],))
            
            customer = cur.fetchone()
            if not customer:
                return jsonify({
                    'success': False,
                    'error': 'Invalid or inactive customer_id'
                }), 400
        
        # Generate location code if not provided
        if not data.get('location_code'):
            data['location_code'] = generate_location_code(
                data['location_name'],
                data['location_type'],
                cur
            )
        else:
            # Check if code already exists
            cur.execute("""
                SELECT location_id FROM locations_master
                WHERE location_code = %s
            """, (data['location_code'],))
            
            if cur.fetchone():
                return jsonify({
                    'success': False,
                    'error': f"Location code '{data['location_code']}' already exists"
                }), 400
        
        # Insert location
        cur.execute("""
            INSERT INTO locations_master (
                location_code, location_name, location_type,
                ownership, customer_id,
                address_line1, address_line2, city, state, pincode,
                contact_person, contact_phone, contact_email,
                is_production_unit, is_sales_point, is_default,
                is_active, notes, gst_number, created_by, created_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP
            ) RETURNING location_id
        """, (
            data['location_code'],
            data['location_name'],
            data['location_type'],
            data['ownership'],
            data.get('customer_id'),
            data.get('address_line1'),
            data.get('address_line2'),
            data.get('city'),
            data.get('state'),
            data.get('pincode'),
            data.get('contact_person'),
            data.get('contact_phone'),
            data.get('contact_email'),
            data.get('is_production_unit', False),
            data.get('is_sales_point', False),
            data.get('is_default', False),
            data.get('is_active', True),
            data.get('notes'),
            data.get('gst_number'),
            data.get('created_by', 'System')
        ))
        
        location_id = cur.fetchone()[0]
        
        # If this is set as default, unset other defaults of same type
        if data.get('is_default'):
            cur.execute("""
                UPDATE locations_master 
                SET is_default = false 
                WHERE location_type = %s 
                    AND location_id != %s
                    AND is_default = true
            """, (data['location_type'], location_id))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'location_id': location_id,
            'location_code': data['location_code'],
            'message': f"Location '{data['location_name']}' created successfully"
        }), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@locations_bp.route('/api/locations/<int:location_id>', methods=['PUT'])
def update_location(location_id):
    """Update an existing location"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        # Check if location exists
        cur.execute("""
            SELECT location_id, ownership, location_type 
            FROM locations_master 
            WHERE location_id = %s
        """, (location_id,))
        
        existing = cur.fetchone()
        if not existing:
            return jsonify({'success': False, 'error': 'Location not found'}), 404
        
        current_ownership = existing[1]
        current_type = existing[2]
        
        # Validate data
        is_valid, errors = validate_location_data(data, is_update=True)
        if not is_valid:
            return jsonify({
                'success': False,
                'errors': errors
            }), 400
        
        # Convert GST to uppercase if provided
        if data.get('gst_number'):
            data['gst_number'] = data['gst_number'].upper()
        
        # Check if ownership is being changed
        if 'ownership' in data and data['ownership'] != current_ownership:
            # Check for inventory before allowing ownership change
            dependencies = check_location_dependencies(location_id, cur)
            if dependencies['has_dependencies']:
                return jsonify({
                    'success': False,
                    'error': 'Cannot change ownership - location has inventory or transactions',
                    'dependencies': dependencies
                }), 400
        
        # Build update query dynamically
        update_fields = []
        update_values = []
        
        allowed_fields = [
            'location_name', 'location_type', 'ownership', 'customer_id',
            'address_line1', 'address_line2', 'city', 'state', 'pincode',
            'contact_person', 'contact_phone', 'contact_email',
            'is_production_unit', 'is_sales_point', 'is_default',
            'is_active', 'notes', 'gst_number'
        ]
        
        for field in allowed_fields:
            if field in data:
                update_fields.append(f"{field} = %s")
                update_values.append(data[field])
        
        if not update_fields:
            return jsonify({
                'success': False,
                'error': 'No valid fields to update'
            }), 400
        
        # Add updated_at
        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        
        # Execute update
        query = f"""
            UPDATE locations_master 
            SET {', '.join(update_fields)}
            WHERE location_id = %s
        """
        update_values.append(location_id)
        
        cur.execute(query, update_values)
        
        # Handle default flag
        if data.get('is_default'):
            location_type = data.get('location_type', current_type)
            cur.execute("""
                UPDATE locations_master 
                SET is_default = false 
                WHERE location_type = %s 
                    AND location_id != %s
                    AND is_default = true
            """, (location_type, location_id))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Location updated successfully'
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@locations_bp.route('/api/locations/<int:location_id>', methods=['DELETE'])
def delete_location(location_id):
    """Delete or deactivate a location"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Check dependencies
        dependencies = check_location_dependencies(location_id, cur)
        
        if dependencies['has_dependencies']:
            # Soft delete only - deactivate
            cur.execute("""
                UPDATE locations_master 
                SET is_active = false,
                    updated_at = CURRENT_TIMESTAMP
                WHERE location_id = %s
                RETURNING location_name
            """, (location_id,))
            
            result = cur.fetchone()
            if not result:
                return jsonify({'success': False, 'error': 'Location not found'}), 404
            
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': f"Location '{result[0]}' deactivated due to existing dependencies",
                'soft_delete': True,
                'dependencies': dependencies
            })
        else:
            # Hard delete - no dependencies
            cur.execute("""
                DELETE FROM locations_master 
                WHERE location_id = %s
                RETURNING location_name
            """, (location_id,))
            
            result = cur.fetchone()
            if not result:
                return jsonify({'success': False, 'error': 'Location not found'}), 404
            
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': f"Location '{result[0]}' permanently deleted",
                'soft_delete': False
            })
            
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@locations_bp.route('/api/locations/<int:location_id>/check-dependencies', methods=['GET'])
def check_dependencies(location_id):
    """Check dependencies before deletion"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        dependencies = check_location_dependencies(location_id, cur)
        
        return jsonify({
            'success': True,
            'dependencies': dependencies
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@locations_bp.route('/api/locations/for-transfer', methods=['GET'])
def get_locations_for_transfer():
    """Get locations available for transfer operations"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        from_location_id = request.args.get('from_location_id', type=int)
        
        # Get all active locations except the source
        query = """
            SELECT 
                l.location_id,
                l.location_code,
                l.location_name,
                l.location_type,
                l.ownership,
                c.customer_name,
                l.city,
                l.state,
                l.gst_number
            FROM locations_master l
            LEFT JOIN customers c ON l.customer_id = c.customer_id
            WHERE l.is_active = true
        """
        
        params = []
        if from_location_id:
            query += " AND l.location_id != %s"
            params.append(from_location_id)
        
        query += " ORDER BY l.ownership DESC, l.location_type, l.location_name"
        
        cur.execute(query, params)
        
        locations = []
        for row in cur.fetchall():
            display_name = f"{row[2]} ({row[1]})"
            if row[5]:  # Has customer
                display_name += f" - {row[5]}"
            if row[6] and row[7]:  # Has city and state
                display_name += f" - {row[6]}, {row[7]}"
            
            locations.append({
                'location_id': row[0],
                'location_code': row[1],
                'location_name': row[2],
                'location_type': row[3],
                'ownership': row[4],
                'customer_name': row[5],
                'display_name': display_name,
                'transfer_type': 'internal' if row[4] == 'own' else 'third_party',
                'gst_number': row[8]
            })
        
        # Group by ownership for better UX
        grouped = {
            'internal': [l for l in locations if l['ownership'] == 'own'],
            'third_party': [l for l in locations if l['ownership'] == 'third_party']
        }
        
        return jsonify({
            'success': True,
            'locations': locations,
            'grouped': grouped,
            'count': len(locations)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@locations_bp.route('/api/locations/<int:location_id>/restore', methods=['POST'])
def restore_location(location_id):
    """Restore a deactivated location"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            UPDATE locations_master 
            SET is_active = true,
                updated_at = CURRENT_TIMESTAMP
            WHERE location_id = %s AND is_active = false
            RETURNING location_name
        """, (location_id,))
        
        result = cur.fetchone()
        if not result:
            return jsonify({
                'success': False,
                'error': 'Location not found or already active'
            }), 404
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': f"Location '{result[0]}' restored successfully"
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@locations_bp.route('/api/locations/dropdown', methods=['GET'])
def get_locations_dropdown():
    """Get simplified location list for dropdowns"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        location_type = request.args.get('type')
        ownership = request.args.get('ownership')
        
        query = """
            SELECT 
                location_id,
                location_code,
                location_name,
                location_type,
                ownership,
                is_default,
                is_production_unit,
                gst_number
            FROM locations_master
            WHERE is_active = true
        """
        
        params = []
        
        if location_type:
            query += " AND location_type = %s"
            params.append(location_type)
        
        if ownership:
            query += " AND ownership = %s"
            params.append(ownership)
        
        query += " ORDER BY is_default DESC, location_name"
        
        cur.execute(query, params)
        
        locations = []
        for row in cur.fetchall():
            locations.append({
                'value': row[0],
                'label': f"{row[2]} ({row[1]})",
                'location_id': row[0],
                'location_code': row[1],
                'location_name': row[2],
                'location_type': row[3],
                'ownership': row[4],
                'is_default': row[5],
                'is_production_unit': row[6],
                'gst_number': row[7]
            })
        
        return jsonify({
            'success': True,
            'locations': locations,
            'count': len(locations)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)
