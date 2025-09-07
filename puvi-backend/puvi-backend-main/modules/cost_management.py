"""
Cost Management Module for PUVI Oil Manufacturing System
Handles cost analytics, validation, time tracking, and monitoring
CRUD operations have been moved to Masters module
File Path: puvi-backend/puvi-backend-main/modules/cost_management.py
Version: 2.0 - Post-consolidation (Analytics Only)
"""

from flask import Blueprint, request, jsonify, redirect
from decimal import Decimal
from datetime import datetime, timedelta
from db_utils import get_db_connection, close_connection
from utils.date_utils import parse_date, integer_to_date
from utils.validation import safe_decimal, safe_float

# Create Blueprint
cost_management_bp = Blueprint('cost_management', __name__)

class CostValidationWarning:
    """Class to handle cost validation warnings (Phase 1)"""
    def __init__(self):
        self.warnings = []
        self.unallocated_costs = Decimal('0')
        
    def add_warning(self, message, amount=None):
        """Add a warning message"""
        warning = {
            'message': message,
            'amount': float(amount) if amount else None,
            'type': 'warning'
        }
        self.warnings.append(warning)
        if amount:
            self.unallocated_costs += Decimal(str(amount))
    
    def get_summary(self):
        """Get validation summary"""
        return {
            'has_warnings': len(self.warnings) > 0,
            'warning_count': len(self.warnings),
            'warnings': self.warnings,
            'total_unallocated': float(self.unallocated_costs)
        }


# =====================================================
# REDIRECT TO MASTERS FOR CONFIGURATION
# =====================================================

@cost_management_bp.route('/api/cost_elements/master', methods=['GET', 'POST', 'PUT', 'DELETE'])
def redirect_to_masters():
    """
    Cost element configuration has moved to Masters module.
    This endpoint redirects to the appropriate Masters endpoint.
    """
    method = request.method
    
    if method == 'GET':
        # Redirect GET requests to Masters with same parameters
        return jsonify({
            'success': False,
            'message': 'Cost element configuration has moved to Masters',
            'redirect_url': '/api/masters/cost_elements',
            'note': 'Please update your application to use the Masters endpoint'
        }), 301
    else:
        # For POST, PUT, DELETE - inform about the move
        return jsonify({
            'success': False,
            'error': 'Cost element CRUD operations have moved to Masters module',
            'message': 'Please use /api/masters/cost_elements for configuration',
            'configuration_url': '/masters?tab=cost_elements'
        }), 410  # 410 Gone - indicates the resource has been intentionally removed


@cost_management_bp.route('/api/cost_elements/configure', methods=['GET'])
def configuration_info():
    """Provide information about where to configure cost elements"""
    return jsonify({
        'success': True,
        'message': 'Cost element configuration is managed in Masters',
        'configuration_url': '/masters?tab=cost_elements',
        'api_endpoint': '/api/masters/cost_elements',
        'features_available': [
            'Create new cost elements',
            'Edit existing elements',
            'Set activity associations',
            'Configure package-specific costs',
            'Manage display order',
            'Bulk rate updates'
        ],
        'monitoring_features_here': [
            'Validation reports',
            'Usage statistics',
            'Batch cost summaries',
            'Rate history tracking'
        ]
    })


# =====================================================
# ANALYTICS & MONITORING ENDPOINTS (KEPT)
# =====================================================

@cost_management_bp.route('/api/cost_elements/by_stage', methods=['GET'])
def get_cost_elements_by_stage():
    """Get cost elements applicable to a specific production stage with activity filtering"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        stage = request.args.get('stage', 'batch')  # drying, crushing, batch, sales
        
        # Include activity field in response
        cur.execute("""
            SELECT 
                element_id,
                element_name,
                category,
                unit_type,
                default_rate,
                calculation_method,
                is_optional,
                activity,
                display_order
            FROM cost_elements_master
            WHERE is_active = true 
                AND applicable_to IN (%s, 'all')
            ORDER BY display_order, category, element_name
        """, (stage,))
        
        cost_elements = []
        for row in cur.fetchall():
            cost_elements.append({
                'element_id': row[0],
                'element_name': row[1],
                'category': row[2],
                'unit_type': row[3],
                'default_rate': float(row[4]),
                'calculation_method': row[5],
                'is_optional': row[6],
                'activity': row[7] if row[7] else 'General',
                'display_order': row[8]
            })
        
        return jsonify({
            'success': True,
            'stage': stage,
            'cost_elements': cost_elements,
            'count': len(cost_elements)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@cost_management_bp.route('/api/cost_elements/by_activity', methods=['GET'])
def get_cost_elements_by_activity():
    """
    Get cost elements filtered by activity
    This provides activity-based filtering for modules that need it
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        activity = request.args.get('activity', 'General')  # Drying, Crushing, Filtering, Common, General
        module = request.args.get('module', 'batch')  # batch, sku, sales, blending
        include_common = request.args.get('include_common', 'true').lower() == 'true'
        
        # Build query based on parameters
        if include_common:
            query = """
                SELECT 
                    element_id,
                    element_name,
                    category,
                    unit_type,
                    default_rate,
                    calculation_method,
                    is_optional,
                    applicable_to,
                    display_order,
                    activity,
                    module_specific
                FROM cost_elements_master
                WHERE is_active = true 
                    AND (activity = %s OR activity = 'Common')
                    AND applicable_to IN (%s, 'all')
                ORDER BY display_order, category, element_name
            """
            cur.execute(query, (activity, module))
        else:
            query = """
                SELECT 
                    element_id,
                    element_name,
                    category,
                    unit_type,
                    default_rate,
                    calculation_method,
                    is_optional,
                    applicable_to,
                    display_order,
                    activity,
                    module_specific
                FROM cost_elements_master
                WHERE is_active = true 
                    AND activity = %s
                    AND applicable_to IN (%s, 'all')
                ORDER BY display_order, category, element_name
            """
            cur.execute(query, (activity, module))
        
        cost_elements = []
        for row in cur.fetchall():
            cost_elements.append({
                'element_id': row[0],
                'element_name': row[1],
                'category': row[2],
                'unit_type': row[3],
                'default_rate': float(row[4]),
                'calculation_method': row[5],
                'is_optional': row[6],
                'applicable_to': row[7],
                'display_order': row[8],
                'activity': row[9] if row[9] else 'General',
                'module_specific': row[10]
            })
        
        # Group by category for UI
        by_category = {}
        for element in cost_elements:
            category = element['category']
            if category not in by_category:
                by_category[category] = []
            by_category[category].append(element)
        
        return jsonify({
            'success': True,
            'activity': activity,
            'module': module,
            'cost_elements': cost_elements,
            'by_category': by_category,
            'count': len(cost_elements)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@cost_management_bp.route('/api/cost_elements/time_tracking', methods=['POST'])
def save_time_tracking():
    """Save time tracking data for a batch with user-entered times"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        
        # Required fields
        batch_id = data.get('batch_id')
        process_type = data.get('process_type', 'crushing')
        start_datetime = data.get('start_datetime')  # Format: "2025-08-06 10:30"
        end_datetime = data.get('end_datetime')      # Format: "2025-08-06 15:45"
        
        if not all([batch_id, start_datetime, end_datetime]):
            return jsonify({
                'success': False,
                'error': 'batch_id, start_datetime, and end_datetime are required'
            }), 400
        
        # Parse datetime strings
        start_dt = datetime.strptime(start_datetime, '%Y-%m-%d %H:%M')
        end_dt = datetime.strptime(end_datetime, '%Y-%m-%d %H:%M')
        
        # Validate end time is after start time
        if end_dt <= start_dt:
            return jsonify({
                'success': False,
                'error': 'End time must be after start time'
            }), 400
        
        # Calculate duration
        duration = end_dt - start_dt
        total_hours = Decimal(str(duration.total_seconds() / 3600))
        rounded_hours = int(total_hours.quantize(Decimal('1'), rounding='ROUND_UP'))
        
        # Begin transaction
        cur.execute("BEGIN")
        
        # Insert time tracking record
        cur.execute("""
            INSERT INTO batch_time_tracking (
                batch_id, process_type, start_datetime, end_datetime,
                total_hours, rounded_hours, operator_name, notes
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING tracking_id
        """, (
            batch_id,
            process_type,
            start_dt,
            end_dt,
            float(total_hours),
            rounded_hours,
            data.get('operator_name', ''),
            data.get('notes', '')
        ))
        
        tracking_id = cur.fetchone()[0]
        
        # Calculate time-based costs automatically
        time_costs = calculate_time_based_costs(cur, rounded_hours)
        
        # Save time-based costs to batch_extended_costs
        for cost in time_costs:
            cur.execute("""
                INSERT INTO batch_extended_costs (
                    batch_id, element_id, element_name,
                    quantity_or_hours, rate_used, total_cost,
                    is_applied, created_by
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                batch_id,
                cost['element_id'],
                cost['element_name'],
                rounded_hours,
                cost['rate'],
                cost['total_cost'],
                True,
                data.get('created_by', 'System')
            ))
        
        # Commit transaction
        conn.commit()
        
        return jsonify({
            'success': True,
            'tracking_id': tracking_id,
            'total_hours': float(total_hours),
            'rounded_hours': rounded_hours,
            'time_costs': time_costs,
            'total_time_cost': sum(c['total_cost'] for c in time_costs),
            'message': f'Time tracking saved: {total_hours:.2f} hours (billed as {rounded_hours} hours)'
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@cost_management_bp.route('/api/cost_elements/calculate', methods=['POST'])
def calculate_batch_costs():
    """Calculate all costs for a batch with Phase 1 validation warnings"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        batch_id = data.get('batch_id')
        
        if not batch_id:
            return jsonify({'success': False, 'error': 'batch_id is required'}), 400
        
        # Initialize validation warnings
        validator = CostValidationWarning()
        
        # Get batch details
        cur.execute("""
            SELECT 
                batch_code, oil_type, seed_quantity_before_drying,
                seed_quantity_after_drying, oil_yield, oil_cake_yield,
                sludge_yield, total_production_cost
            FROM batch
            WHERE batch_id = %s
        """, (batch_id,))
        
        batch = cur.fetchone()
        if not batch:
            return jsonify({'success': False, 'error': 'Batch not found'}), 404
        
        batch_data = {
            'batch_code': batch[0],
            'oil_type': batch[1],
            'seed_qty_before': float(batch[2]),
            'seed_qty_after': float(batch[3]),
            'oil_yield': float(batch[4]),
            'cake_yield': float(batch[5]),
            'sludge_yield': float(batch[6]) if batch[6] else 0,
            'base_production_cost': float(batch[7])
        }
        
        # Get all applicable cost elements with activity
        cur.execute("""
            SELECT 
                element_id,
                element_name,
                category,
                unit_type,
                default_rate,
                calculation_method,
                is_optional,
                activity
            FROM cost_elements_master
            WHERE is_active = true 
                AND applicable_to IN ('batch', 'all')
            ORDER BY display_order
        """)
        
        cost_elements = cur.fetchall()
        cost_breakdown = []
        total_extended_costs = Decimal('0')
        
        # Check for time tracking
        cur.execute("""
            SELECT SUM(rounded_hours) as total_hours
            FROM batch_time_tracking
            WHERE batch_id = %s
        """, (batch_id,))
        
        time_result = cur.fetchone()
        total_hours = time_result[0] if time_result[0] else 0
        
        # Process each cost element
        for element in cost_elements:
            element_id, element_name, category, unit_type, default_rate, calc_method, is_optional, activity = element
            
            # Check if this cost has been captured
            cur.execute("""
                SELECT quantity_or_hours, rate_used, total_cost
                FROM batch_extended_costs
                WHERE batch_id = %s AND element_id = %s
            """, (batch_id, element_id))
            
            existing_cost = cur.fetchone()
            
            if calc_method == 'per_hour':
                if total_hours > 0:
                    if not existing_cost:
                        # Time tracked but cost not calculated - WARNING
                        cost = float(total_hours) * float(default_rate)
                        validator.add_warning(
                            f"{element_name}: {total_hours} hours tracked but cost not recorded (₹{cost:.2f})",
                            cost
                        )
                else:
                    # No time tracking - WARNING
                    validator.add_warning(f"{element_name}: No time tracking recorded")
                    
            elif calc_method == 'per_kg':
                expected_cost = float(batch_data['seed_qty_before']) * float(default_rate)
                if not existing_cost and not is_optional:
                    validator.add_warning(
                        f"{element_name}: Not recorded (Expected: ₹{expected_cost:.2f})",
                        expected_cost
                    )
                    
            elif calc_method == 'fixed':
                if not existing_cost and not is_optional:
                    validator.add_warning(
                        f"{element_name}: Fixed cost not recorded (₹{default_rate})",
                        default_rate
                    )
            
            # Add to breakdown if exists
            if existing_cost:
                cost_breakdown.append({
                    'element_name': element_name,
                    'category': category,
                    'activity': activity if activity else 'General',
                    'quantity': float(existing_cost[0]),
                    'rate': float(existing_cost[1]),
                    'total_cost': float(existing_cost[2])
                })
                total_extended_costs += Decimal(str(existing_cost[2]))
        
        # Check for common costs allocation
        cur.execute("""
            SELECT SUM(total_cost) 
            FROM batch_extended_costs bec
            JOIN cost_elements_master cem ON bec.element_id = cem.element_id
            WHERE bec.batch_id = %s AND cem.element_name = 'Common Costs'
        """, (batch_id,))
        
        common_costs_result = cur.fetchone()
        if not common_costs_result or not common_costs_result[0]:
            # Get Common Costs rate from database instead of hardcoding
            cur.execute("""
                SELECT default_rate, calculation_method, unit_type
                FROM cost_elements_master
                WHERE element_name = 'Common Costs' 
                    AND is_active = true
            """)
            
            common_cost_config = cur.fetchone()
            if common_cost_config:
                common_rate = float(common_cost_config[0])
                calc_method = common_cost_config[1]
                unit_type = common_cost_config[2]
                
                # Calculate expected cost based on calculation method
                if calc_method == 'per_kg':
                    expected_common = float(batch_data['oil_yield']) * common_rate
                    validator.add_warning(
                        f"Common Costs: Not allocated to this batch (₹{expected_common:.2f} @ ₹{common_rate}/{unit_type})",
                        expected_common
                    )
                elif calc_method == 'fixed':
                    expected_common = common_rate
                    validator.add_warning(
                        f"Common Costs: Not allocated to this batch (₹{expected_common:.2f} - fixed cost)",
                        expected_common
                    )
                else:
                    validator.add_warning("Common Costs: Not allocated to this batch")
        
        # Calculate total costs
        total_costs = batch_data['base_production_cost'] + float(total_extended_costs)
        
        # Get validation summary
        validation = validator.get_summary()
        
        # Calculate oil cost per kg
        if batch_data['oil_yield'] > 0:
            oil_cost_per_kg = total_costs / batch_data['oil_yield']
        else:
            oil_cost_per_kg = 0
        
        return jsonify({
            'success': True,
            'batch_code': batch_data['batch_code'],
            'cost_breakdown': cost_breakdown,
            'base_production_cost': batch_data['base_production_cost'],
            'extended_costs': float(total_extended_costs),
            'total_costs': total_costs,
            'oil_yield': batch_data['oil_yield'],
            'oil_cost_per_kg': oil_cost_per_kg,
            'validation': validation,
            'message': 'Cost calculation complete' + 
                      (f' with {validation["warning_count"]} warnings' if validation['has_warnings'] else '')
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@cost_management_bp.route('/api/cost_elements/save_batch_costs', methods=['POST'])
def save_batch_costs():
    """Save extended costs for a batch with override capability and activity tracking"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        data = request.json
        batch_id = data.get('batch_id')
        costs = data.get('costs', [])
        created_by = data.get('created_by', 'System')
        
        if not batch_id:
            return jsonify({'success': False, 'error': 'batch_id is required'}), 400
        
        # Begin transaction
        cur.execute("BEGIN")
        
        saved_costs = []
        total_saved = Decimal('0')
        
        for cost_item in costs:
            element_id = cost_item.get('element_id')
            element_name = cost_item.get('element_name')
            quantity = safe_decimal(cost_item.get('quantity', 0))
            rate = safe_decimal(cost_item.get('rate', 0))
            override_rate = cost_item.get('override_rate')
            is_applied = cost_item.get('is_applied', True)
            activity = cost_item.get('activity', 'General')
            
            # Use override rate if provided
            if override_rate is not None and override_rate != '':
                actual_rate = safe_decimal(override_rate)
                
                # Log the override
                cur.execute("""
                    INSERT INTO cost_override_log (
                        module_name, record_id, element_id, element_name,
                        original_rate, override_rate, reason, overridden_by
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    'batch',
                    batch_id,
                    element_id,
                    element_name,
                    float(rate),
                    float(actual_rate),
                    cost_item.get('override_reason', 'Manual adjustment'),
                    created_by
                ))
            else:
                actual_rate = rate
            
            total_cost = quantity * actual_rate
            
            # Check if cost already exists for this batch and element
            cur.execute("""
                SELECT cost_id FROM batch_extended_costs
                WHERE batch_id = %s AND element_id = %s
            """, (batch_id, element_id))
            
            existing = cur.fetchone()
            
            if existing:
                # Update existing cost
                cur.execute("""
                    UPDATE batch_extended_costs
                    SET quantity_or_hours = %s,
                        rate_used = %s,
                        total_cost = %s,
                        is_applied = %s,
                        created_by = %s
                    WHERE cost_id = %s
                """, (
                    float(quantity),
                    float(actual_rate),
                    float(total_cost),
                    is_applied,
                    created_by,
                    existing[0]
                ))
                action = 'updated'
            else:
                # Insert new cost
                cur.execute("""
                    INSERT INTO batch_extended_costs (
                        batch_id, element_id, element_name,
                        quantity_or_hours, rate_used, total_cost,
                        is_applied, created_by
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    batch_id,
                    element_id,
                    element_name,
                    float(quantity),
                    float(actual_rate),
                    float(total_cost),
                    is_applied,
                    created_by
                ))
                action = 'created'
            
            if is_applied:
                total_saved += total_cost
            
            saved_costs.append({
                'element_name': element_name,
                'activity': activity,
                'quantity': float(quantity),
                'rate': float(actual_rate),
                'total_cost': float(total_cost),
                'is_applied': is_applied,
                'action': action
            })
        
        # Commit transaction
        conn.commit()
        
        return jsonify({
            'success': True,
            'saved_costs': saved_costs,
            'total_saved_amount': float(total_saved),
            'count': len(saved_costs),
            'message': f'Successfully saved {len(saved_costs)} cost elements'
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@cost_management_bp.route('/api/cost_elements/validation_report', methods=['GET'])
def get_validation_report():
    """Get validation report for all recent batches (Phase 1 - Warnings only)"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get date range from parameters
        days = request.args.get('days', 30, type=int)
        
        cur.execute("""
            SELECT 
                b.batch_id,
                b.batch_code,
                b.oil_type,
                b.production_date,
                COUNT(DISTINCT bec.element_id) as costs_captured,
                COUNT(DISTINCT cem.element_id) as costs_expected
            FROM batch b
            CROSS JOIN cost_elements_master cem
            LEFT JOIN batch_extended_costs bec 
                ON b.batch_id = bec.batch_id 
                AND bec.element_id = cem.element_id
            WHERE cem.is_active = true 
                AND cem.applicable_to IN ('batch', 'all')
                AND cem.is_optional = false
                AND b.production_date >= (
                    SELECT MAX(production_date) - %s FROM batch
                )
            GROUP BY b.batch_id, b.batch_code, b.oil_type, b.production_date
            HAVING COUNT(DISTINCT bec.element_id) < COUNT(DISTINCT cem.element_id)
            ORDER BY b.production_date DESC
        """, (days,))
        
        batches_with_warnings = []
        for row in cur.fetchall():
            batches_with_warnings.append({
                'batch_id': row[0],
                'batch_code': row[1],
                'oil_type': row[2],
                'production_date': integer_to_date(row[3]),
                'costs_captured': row[4],
                'costs_expected': row[5],
                'missing_count': row[5] - row[4]
            })
        
        return jsonify({
            'success': True,
            'report_period_days': days,
            'batches_with_warnings': batches_with_warnings,
            'total_batches_with_warnings': len(batches_with_warnings),
            'message': 'Phase 1 Validation - Warnings only, operations not blocked'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@cost_management_bp.route('/api/cost_elements/batch_summary/<int:batch_id>', methods=['GET'])
def get_batch_cost_summary(batch_id):
    """Get complete cost summary for a batch with validation warnings and activity info"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get batch basic info
        cur.execute("""
            SELECT 
                b.batch_code,
                b.oil_type,
                b.production_date,
                b.seed_quantity_before_drying,
                b.oil_yield,
                b.oil_cake_yield,
                b.total_production_cost,
                b.net_oil_cost,
                b.oil_cost_per_kg,
                b.cake_estimated_rate,
                b.cake_actual_rate
            FROM batch b
            WHERE b.batch_id = %s
        """, (batch_id,))
        
        batch = cur.fetchone()
        if not batch:
            return jsonify({'success': False, 'error': 'Batch not found'}), 404
        
        # Get extended costs with activity
        cur.execute("""
            SELECT 
                bec.element_name,
                cem.category,
                cem.activity,
                bec.quantity_or_hours,
                bec.rate_used,
                bec.total_cost,
                bec.is_applied
            FROM batch_extended_costs bec
            LEFT JOIN cost_elements_master cem ON bec.element_id = cem.element_id
            WHERE bec.batch_id = %s
            ORDER BY cem.display_order
        """, (batch_id,))
        
        extended_costs = []
        total_extended = Decimal('0')
        
        for row in cur.fetchall():
            extended_costs.append({
                'element_name': row[0],
                'category': row[1],
                'activity': row[2] if row[2] else 'General',
                'quantity': float(row[3]),
                'rate': float(row[4]),
                'total_cost': float(row[5]),
                'is_applied': row[6]
            })
            if row[6]:  # If applied
                total_extended += Decimal(str(row[5]))
        
        # Get time tracking
        cur.execute("""
            SELECT 
                process_type,
                start_datetime,
                end_datetime,
                total_hours,
                rounded_hours
            FROM batch_time_tracking
            WHERE batch_id = %s
            ORDER BY start_datetime
        """, (batch_id,))
        
        time_tracking = []
        for row in cur.fetchall():
            time_tracking.append({
                'process_type': row[0],
                'start_time': row[1].strftime('%Y-%m-%d %H:%M') if row[1] else None,
                'end_time': row[2].strftime('%Y-%m-%d %H:%M') if row[2] else None,
                'actual_hours': float(row[3]) if row[3] else 0,
                'billed_hours': row[4] if row[4] else 0
            })
        
        # Run validation check
        validator = CostValidationWarning()
        
        # Check for missing costs by activity
        cur.execute("""
            SELECT element_name, default_rate, calculation_method, is_optional, activity
            FROM cost_elements_master
            WHERE is_active = true 
                AND applicable_to IN ('batch', 'all')
                AND element_id NOT IN (
                    SELECT element_id FROM batch_extended_costs WHERE batch_id = %s
                )
        """, (batch_id,))
        
        for missing in cur.fetchall():
            if not missing[3]:  # If not optional
                activity_info = f" [{missing[4]}]" if missing[4] else ""
                validator.add_warning(f"{missing[0]}{activity_info}: Not captured (Default: ₹{missing[1]})")
        
        # Prepare summary
        summary = {
            'batch_code': batch[0],
            'oil_type': batch[1],
            'production_date': integer_to_date(batch[2], '%d-%m-%Y'),
            'seed_quantity': float(batch[3]),
            'oil_yield': float(batch[4]),
            'cake_yield': float(batch[5]),
            'base_production_cost': float(batch[6]),
            'extended_costs': extended_costs,
            'total_extended_costs': float(total_extended),
            'total_production_cost': float(batch[6]) + float(total_extended),
            'net_oil_cost': float(batch[7]),
            'oil_cost_per_kg': float(batch[8]),
            'cake_estimated_rate': float(batch[9]) if batch[9] else 0,
            'cake_actual_rate': float(batch[10]) if batch[10] else 0,
            'time_tracking': time_tracking,
            'validation': validator.get_summary()
        }
        
        return jsonify({
            'success': True,
            'summary': summary
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@cost_management_bp.route('/api/cost_elements/usage_stats', methods=['GET'])
def get_usage_stats():
    """Get usage statistics for all cost elements from the view"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Query the usage stats view
        cur.execute("""
            SELECT 
                element_id,
                element_name,
                category,
                default_rate,
                times_used,
                avg_rate_used,
                total_cost_incurred,
                override_count
            FROM cost_element_usage_stats
            ORDER BY times_used DESC, element_name
        """)
        
        stats = []
        total_cost_all = Decimal('0')
        total_overrides = 0
        
        for row in cur.fetchall():
            times_used = row[4] if row[4] else 0
            override_count = row[7] if row[7] else 0
            total_cost_all += Decimal(str(row[6] if row[6] else 0))
            total_overrides += override_count
            
            stats.append({
                'element_id': row[0],
                'element_name': row[1],
                'category': row[2],
                'default_rate': float(row[3]) if row[3] else 0,
                'times_used': times_used,
                'avg_rate_used': float(row[5]) if row[5] else 0,
                'total_cost_incurred': float(row[6]) if row[6] else 0,
                'override_count': override_count,
                'override_percentage': round((override_count / times_used * 100) if times_used > 0 else 0, 1)
            })
        
        # Get category summary
        cur.execute("""
            SELECT 
                category,
                COUNT(*) as element_count,
                SUM(times_used) as total_uses,
                SUM(total_cost_incurred) as category_cost
            FROM cost_element_usage_stats
            GROUP BY category
            ORDER BY category_cost DESC
        """)
        
        category_summary = []
        for row in cur.fetchall():
            category_summary.append({
                'category': row[0],
                'element_count': row[1],
                'total_uses': row[2] if row[2] else 0,
                'total_cost': float(row[3]) if row[3] else 0
            })
        
        return jsonify({
            'success': True,
            'usage_stats': stats,
            'summary': {
                'total_elements': len(stats),
                'total_cost_incurred': float(total_cost_all),
                'total_overrides': total_overrides,
                'elements_never_used': len([s for s in stats if s['times_used'] == 0])
            },
            'category_summary': category_summary
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@cost_management_bp.route('/api/cost_elements/bulk_update', methods=['POST'])
def bulk_update_cost_elements():
    """
    Bulk update cost element rates.
    Note: This is kept for compatibility but users should use Masters for rate updates.
    This endpoint will proxy to Masters in future versions.
    """
    return jsonify({
        'success': False,
        'message': 'Bulk rate updates should be performed through Masters module',
        'redirect_url': '/api/masters/cost_elements/bulk_update',
        'configuration_url': '/masters?tab=cost_elements'
    }), 301


@cost_management_bp.route('/api/cost_elements/<int:element_id>/rate_history', methods=['GET'])
def get_rate_history(element_id):
    """Get rate change history for a specific cost element"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get element details
        cur.execute("""
            SELECT element_name, category, default_rate, activity
            FROM cost_elements_master
            WHERE element_id = %s
        """, (element_id,))
        
        element = cur.fetchone()
        if not element:
            return jsonify({'success': False, 'error': 'Cost element not found'}), 404
        
        element_info = {
            'element_id': element_id,
            'element_name': element[0],
            'category': element[1],
            'current_rate': float(element[2]),
            'activity': element[3] if element[3] else 'General'
        }
        
        # Get rate history
        cur.execute("""
            SELECT 
                history_id,
                old_rate,
                new_rate,
                effective_from,
                effective_to,
                changed_by,
                change_reason,
                created_at
            FROM cost_element_rate_history
            WHERE element_id = %s
            ORDER BY created_at DESC
        """, (element_id,))
        
        history = []
        for row in cur.fetchall():
            old_rate = float(row[1]) if row[1] else 0
            new_rate = float(row[2]) if row[2] else 0
            
            history.append({
                'history_id': row[0],
                'old_rate': old_rate,
                'new_rate': new_rate,
                'effective_from': row[3].strftime('%Y-%m-%d') if row[3] else None,
                'effective_to': row[4].strftime('%Y-%m-%d') if row[4] else None,
                'changed_by': row[5],
                'change_reason': row[6],
                'change_date': row[7].strftime('%Y-%m-%d %H:%M') if row[7] else None,
                'percentage_change': round(((new_rate - old_rate) / old_rate * 100) if old_rate > 0 else 0, 2)
            })
        
        # Get usage summary for context
        cur.execute("""
            SELECT 
                COUNT(*) as times_used,
                AVG(rate_used) as avg_rate_used,
                MIN(rate_used) as min_rate,
                MAX(rate_used) as max_rate
            FROM batch_extended_costs
            WHERE element_id = %s
        """, (element_id,))
        
        usage = cur.fetchone()
        usage_summary = {
            'times_used': usage[0] if usage[0] else 0,
            'avg_rate_used': float(usage[1]) if usage[1] else 0,
            'min_rate': float(usage[2]) if usage[2] else 0,
            'max_rate': float(usage[3]) if usage[3] else 0
        }
        
        return jsonify({
            'success': True,
            'element': element_info,
            'history': history,
            'usage_summary': usage_summary,
            'history_count': len(history)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


# =====================================================
# Helper Functions
# =====================================================

def calculate_time_based_costs(cur, hours):
    """Calculate costs for time-based elements"""
    cur.execute("""
        SELECT 
            element_id,
            element_name,
            default_rate
        FROM cost_elements_master
        WHERE calculation_method = 'per_hour'
            AND applicable_to IN ('batch', 'all')
            AND is_active = true
    """)
    
    costs = []
    for row in cur.fetchall():
        costs.append({
            'element_id': row[0],
            'element_name': row[1],
            'rate': float(row[2]),
            'hours': hours,
            'total_cost': float(row[2]) * hours
        })
    
    return costs
