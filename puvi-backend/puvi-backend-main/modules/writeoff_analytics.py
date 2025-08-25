"""
Writeoff Analytics Module for PUVI Oil Manufacturing System
Provides impact tracking and analytics for material writeoffs
File Path: puvi-backend/puvi-backend-main/modules/writeoff_analytics.py
Version: 1.0 - Information-only metrics (never modifies batch costs)
"""

from flask import Blueprint, request, jsonify
from db_utils import get_db_connection, close_connection
from utils.date_utils import integer_to_date, get_current_day_number
from decimal import Decimal

# Create Blueprint
writeoff_analytics_bp = Blueprint('writeoff_analytics', __name__)

# ============================================
# IMPACT METRICS ENDPOINTS
# ============================================

@writeoff_analytics_bp.route('/api/writeoff_impact', methods=['GET'])
def get_writeoff_impact():
    """Get current writeoff impact metrics (informational only)"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get latest impact tracking record
        cur.execute("""
            SELECT 
                tracking_id,
                calculation_date,
                total_writeoffs_value,
                total_oil_produced_kg,
                impact_per_kg,
                writeoff_percentage,
                material_writeoffs,
                oilcake_writeoffs,
                sludge_writeoffs,
                damage_writeoffs,
                expiry_writeoffs,
                quality_writeoffs,
                process_loss_writeoffs,
                other_writeoffs,
                created_at
            FROM writeoff_impact_tracking
            ORDER BY tracking_id DESC
            LIMIT 1
        """)
        
        latest_record = cur.fetchone()
        
        # If no record exists, calculate fresh metrics
        if not latest_record:
            cur.execute("SELECT * FROM calculate_writeoff_impact()")
            fresh_metrics = cur.fetchone()
            
            if fresh_metrics:
                # Insert new tracking record
                current_day = get_current_day_number()
                cur.execute("SELECT update_writeoff_impact_tracking()")
                conn.commit()
                
                # Fetch the newly created record
                cur.execute("""
                    SELECT * FROM writeoff_impact_tracking 
                    ORDER BY tracking_id DESC LIMIT 1
                """)
                latest_record = cur.fetchone()
        
        if latest_record:
            # Format the response
            impact_data = {
                'tracking_id': latest_record[0],
                'calculation_date': integer_to_date(latest_record[1]),
                'total_writeoffs_value': float(latest_record[2]),
                'total_oil_produced_kg': float(latest_record[3]),
                'impact_per_kg': float(latest_record[4]),
                'writeoff_percentage': float(latest_record[5]),
                'breakdown_by_type': {
                    'materials': float(latest_record[6]),
                    'oil_cake': float(latest_record[7]),
                    'sludge': float(latest_record[8])
                },
                'breakdown_by_reason': {
                    'damage': float(latest_record[9]),
                    'expiry': float(latest_record[10]),
                    'quality': float(latest_record[11]),
                    'process_loss': float(latest_record[12]),
                    'other': float(latest_record[13])
                },
                'last_updated': latest_record[14].isoformat() if latest_record[14] else None
            }
            
            # Determine impact level (for frontend display)
            impact_per_kg = float(latest_record[4])
            if impact_per_kg <= 0.5:
                impact_level = 'low'
                impact_color = 'green'
            elif impact_per_kg <= 1.0:
                impact_level = 'moderate'
                impact_color = 'yellow'
            elif impact_per_kg <= 2.0:
                impact_level = 'high'
                impact_color = 'orange'
            else:
                impact_level = 'critical'
                impact_color = 'red'
            
            impact_data['impact_level'] = impact_level
            impact_data['impact_color'] = impact_color
            
            # Add informational note
            impact_data['note'] = 'These metrics are for information only and do not affect actual batch costs'
            
            return jsonify({
                'success': True,
                'impact_data': impact_data
            })
        else:
            # No writeoffs recorded yet
            return jsonify({
                'success': True,
                'impact_data': {
                    'total_writeoffs_value': 0,
                    'total_oil_produced_kg': 0,
                    'impact_per_kg': 0,
                    'writeoff_percentage': 0,
                    'breakdown_by_type': {
                        'materials': 0,
                        'oil_cake': 0,
                        'sludge': 0
                    },
                    'breakdown_by_reason': {
                        'damage': 0,
                        'expiry': 0,
                        'quality': 0,
                        'process_loss': 0,
                        'other': 0
                    },
                    'impact_level': 'none',
                    'impact_color': 'gray',
                    'note': 'No writeoffs recorded yet'
                }
            })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@writeoff_analytics_bp.route('/api/writeoff_trends', methods=['GET'])
def get_writeoff_trends():
    """Get monthly writeoff trends (last 12 months)"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get trend data from view
        cur.execute("""
            SELECT 
                month_year,
                month_display,
                month_writeoffs,
                month_oil_production,
                month_impact_per_kg,
                cumulative_impact_per_kg,
                month_writeoff_count,
                top_writeoff_reason,
                top_reason_value,
                prev_month_writeoffs,
                month_change_percent
            FROM v_writeoff_trends
            ORDER BY month_year DESC
        """)
        
        trends = []
        for row in cur.fetchall():
            trends.append({
                'month_year': row[0],
                'month_display': row[1],
                'month_writeoffs': float(row[2]),
                'month_oil_production': float(row[3]),
                'month_impact_per_kg': float(row[4]),
                'cumulative_impact_per_kg': float(row[5]),
                'month_writeoff_count': row[6],
                'top_writeoff_reason': row[7],
                'top_reason_value': float(row[8]) if row[8] else 0,
                'prev_month_writeoffs': float(row[9]) if row[9] else None,
                'month_change_percent': float(row[10]) if row[10] else 0
            })
        
        # Calculate trend direction
        if len(trends) >= 2:
            current_month = trends[0]
            previous_month = trends[1]
            
            if current_month['month_writeoffs'] > previous_month['month_writeoffs']:
                trend_direction = 'increasing'
                trend_icon = '↑'
            elif current_month['month_writeoffs'] < previous_month['month_writeoffs']:
                trend_direction = 'decreasing'
                trend_icon = '↓'
            else:
                trend_direction = 'stable'
                trend_icon = '→'
        else:
            trend_direction = 'insufficient_data'
            trend_icon = '-'
        
        # Get year-to-date summary
        current_year = int(str(get_current_day_number())[:4])
        cur.execute("""
            SELECT 
                COALESCE(SUM(month_writeoffs), 0) as ytd_writeoffs,
                COALESCE(SUM(month_oil_production), 0) as ytd_production,
                COALESCE(AVG(month_impact_per_kg), 0) as ytd_avg_impact
            FROM writeoff_monthly_summary
            WHERE month_year >= %s
        """, (current_year * 100 + 1,))
        
        ytd_stats = cur.fetchone()
        
        return jsonify({
            'success': True,
            'trends': trends,
            'trend_summary': {
                'direction': trend_direction,
                'icon': trend_icon,
                'months_analyzed': len(trends),
                'ytd_writeoffs': float(ytd_stats[0]) if ytd_stats else 0,
                'ytd_production': float(ytd_stats[1]) if ytd_stats else 0,
                'ytd_avg_impact': float(ytd_stats[2]) if ytd_stats else 0
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@writeoff_analytics_bp.route('/api/writeoff_dashboard', methods=['GET'])
def get_writeoff_dashboard():
    """Get combined dashboard data for writeoff analytics"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        dashboard_data = {}
        
        # 1. Current Impact Metrics
        cur.execute("""
            SELECT 
                total_writeoffs_value,
                total_oil_produced_kg,
                impact_per_kg,
                writeoff_percentage
            FROM writeoff_impact_tracking
            ORDER BY tracking_id DESC
            LIMIT 1
        """)
        
        impact = cur.fetchone()
        if impact:
            dashboard_data['current_impact'] = {
                'total_writeoffs': float(impact[0]),
                'total_production': float(impact[1]),
                'impact_per_kg': float(impact[2]),
                'percentage': float(impact[3])
            }
        else:
            dashboard_data['current_impact'] = {
                'total_writeoffs': 0,
                'total_production': 0,
                'impact_per_kg': 0,
                'percentage': 0
            }
        
        # 2. Recent Writeoffs (last 10)
        cur.execute("""
            SELECT 
                w.writeoff_id,
                w.writeoff_date,
                COALESCE(m.material_name, 
                    CASE 
                        WHEN w.reference_type = 'oil_cake' THEN 'Oil Cake'
                        WHEN w.reference_type = 'sludge' THEN 'Sludge'
                        ELSE 'Unknown'
                    END
                ) as item_name,
                w.quantity,
                COALESCE(m.unit, 'kg') as unit,
                w.net_loss,
                w.reason_code,
                wr.reason_description
            FROM material_writeoffs w
            LEFT JOIN materials m ON w.material_id = m.material_id
            LEFT JOIN writeoff_reasons wr ON w.reason_code = wr.reason_code
            ORDER BY w.writeoff_date DESC, w.writeoff_id DESC
            LIMIT 10
        """)
        
        recent_writeoffs = []
        for row in cur.fetchall():
            recent_writeoffs.append({
                'writeoff_id': row[0],
                'date': integer_to_date(row[1]),
                'item_name': row[2],
                'quantity': float(row[3]),
                'unit': row[4],
                'net_loss': float(row[5]),
                'reason_code': row[6],
                'reason': row[7] or row[6]
            })
        
        dashboard_data['recent_writeoffs'] = recent_writeoffs
        
        # 3. Top Writeoff Reasons (all time)
        cur.execute("""
            SELECT 
                w.reason_code,
                wr.reason_description,
                wr.category,
                COUNT(*) as occurrence_count,
                COALESCE(SUM(w.net_loss), 0) as total_loss
            FROM material_writeoffs w
            LEFT JOIN writeoff_reasons wr ON w.reason_code = wr.reason_code
            GROUP BY w.reason_code, wr.reason_description, wr.category
            ORDER BY total_loss DESC
            LIMIT 5
        """)
        
        top_reasons = []
        for row in cur.fetchall():
            top_reasons.append({
                'reason_code': row[0],
                'reason': row[1] or row[0],
                'category': row[2],
                'count': row[3],
                'total_loss': float(row[4])
            })
        
        dashboard_data['top_reasons'] = top_reasons
        
        # 4. Monthly Comparison (current vs previous month)
        current_month = int(integer_to_date(get_current_day_number(), '%Y%m'))
        
        # Calculate previous month
        year = current_month // 100
        month = current_month % 100
        if month == 1:
            previous_month = (year - 1) * 100 + 12
        else:
            previous_month = year * 100 + (month - 1)
        
        cur.execute("""
            SELECT 
                month_year,
                month_writeoffs,
                month_writeoff_count,
                month_impact_per_kg
            FROM writeoff_monthly_summary
            WHERE month_year IN (%s, %s)
            ORDER BY month_year DESC
        """, (current_month, previous_month))
        
        monthly_comparison = {}
        for row in cur.fetchall():
            month_data = {
                'writeoffs': float(row[1]),
                'count': row[2],
                'impact_per_kg': float(row[3])
            }
            if row[0] == current_month:
                monthly_comparison['current_month'] = month_data
            else:
                monthly_comparison['previous_month'] = month_data
        
        # Calculate change percentages
        if 'current_month' in monthly_comparison and 'previous_month' in monthly_comparison:
            prev_value = monthly_comparison['previous_month']['writeoffs']
            curr_value = monthly_comparison['current_month']['writeoffs']
            
            if prev_value > 0:
                change_percent = ((curr_value - prev_value) / prev_value) * 100
            else:
                change_percent = 100 if curr_value > 0 else 0
            
            monthly_comparison['change_percent'] = round(change_percent, 2)
        else:
            monthly_comparison['change_percent'] = 0
        
        dashboard_data['monthly_comparison'] = monthly_comparison
        
        # 5. Writeoff by Type Distribution
        cur.execute("""
            SELECT 
                CASE 
                    WHEN reference_type = 'oil_cake' THEN 'Oil Cake'
                    WHEN reference_type = 'sludge' THEN 'Sludge'
                    ELSE 'Materials'
                END as type,
                COUNT(*) as count,
                COALESCE(SUM(net_loss), 0) as total_loss
            FROM material_writeoffs
            GROUP BY reference_type
        """)
        
        type_distribution = []
        for row in cur.fetchall():
            type_distribution.append({
                'type': row[0],
                'count': row[1],
                'total_loss': float(row[2])
            })
        
        dashboard_data['type_distribution'] = type_distribution
        
        # 6. Alert Thresholds
        impact_per_kg = dashboard_data['current_impact']['impact_per_kg']
        
        alerts = []
        if impact_per_kg > 2.0:
            alerts.append({
                'level': 'critical',
                'message': f'Critical: Writeoff impact exceeds ₹2/kg (current: ₹{impact_per_kg:.2f}/kg)'
            })
        elif impact_per_kg > 1.0:
            alerts.append({
                'level': 'warning',
                'message': f'Warning: Writeoff impact exceeds ₹1/kg (current: ₹{impact_per_kg:.2f}/kg)'
            })
        
        # Check for increasing trend
        if monthly_comparison.get('change_percent', 0) > 50:
            alerts.append({
                'level': 'warning',
                'message': f'Writeoffs increased by {monthly_comparison["change_percent"]}% this month'
            })
        
        dashboard_data['alerts'] = alerts
        
        # 7. Summary Statistics
        cur.execute("""
            SELECT 
                COUNT(DISTINCT material_id) as materials_affected,
                COUNT(DISTINCT reason_code) as unique_reasons,
                COUNT(*) as total_writeoff_events,
                MIN(writeoff_date) as first_writeoff_date,
                MAX(writeoff_date) as last_writeoff_date
            FROM material_writeoffs
        """)
        
        stats = cur.fetchone()
        if stats:
            dashboard_data['statistics'] = {
                'materials_affected': stats[0] or 0,
                'unique_reasons_used': stats[1],
                'total_events': stats[2],
                'first_writeoff': integer_to_date(stats[3]) if stats[3] else None,
                'last_writeoff': integer_to_date(stats[4]) if stats[4] else None
            }
        
        return jsonify({
            'success': True,
            'dashboard': dashboard_data,
            'generated_at': integer_to_date(get_current_day_number()),
            'note': 'All metrics are informational only and do not affect actual batch costs'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@writeoff_analytics_bp.route('/api/refresh_writeoff_metrics', methods=['POST'])
def refresh_writeoff_metrics():
    """Manually refresh writeoff impact metrics"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Update impact tracking
        cur.execute("SELECT update_writeoff_impact_tracking()")
        
        # Update current month summary
        current_month = int(integer_to_date(get_current_day_number(), '%Y%m'))
        cur.execute("SELECT update_writeoff_monthly_summary(%s)", (current_month,))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Writeoff metrics refreshed successfully',
            'updated_month': current_month
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)


@writeoff_analytics_bp.route('/api/writeoff_report/<int:writeoff_id>', methods=['GET'])
def get_writeoff_report(writeoff_id):
    """Generate printable writeoff certificate/report"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get writeoff details
        cur.execute("""
            SELECT 
                w.writeoff_id,
                w.material_id,
                w.writeoff_date,
                w.quantity,
                w.weighted_avg_cost,
                w.total_cost,
                w.scrap_value,
                w.net_loss,
                w.reason_code,
                w.reason_description,
                w.reference_type,
                w.reference_id,
                w.notes,
                w.created_by,
                w.created_at,
                m.material_name,
                m.unit,
                m.category,
                wr.reason_description as master_reason,
                wr.category as reason_category
            FROM material_writeoffs w
            LEFT JOIN materials m ON w.material_id = m.material_id
            LEFT JOIN writeoff_reasons wr ON w.reason_code = wr.reason_code
            WHERE w.writeoff_id = %s
        """, (writeoff_id,))
        
        row = cur.fetchone()
        if not row:
            return jsonify({
                'success': False,
                'error': 'Writeoff record not found'
            }), 404
        
        # Build report data
        report = {
            'company': 'PUVI Oil Manufacturing',
            'report_title': 'Material Writeoff Certificate',
            'writeoff_number': f'WO-{integer_to_date(row[2], "%Y")}-{str(row[0]).zfill(4)}',
            'writeoff_date': integer_to_date(row[2]),
            'material_details': {
                'name': row[15] if row[15] else self._get_byproduct_name(row[10], row[11]),
                'category': row[17] if row[17] else self._get_byproduct_category(row[10]),
                'quantity': float(row[3]),
                'unit': row[16] if row[16] else 'kg',
                'rate': float(row[4]),
                'total_value': float(row[5])
            },
            'writeoff_details': {
                'scrap_value': float(row[6]) if row[6] else 0,
                'net_loss': float(row[7]),
                'reference_type': row[10],
                'reference_id': row[11]
            },
            'reason': {
                'code': row[8],
                'description': row[18] or row[9] or row[8],
                'category': row[19]
            },
            'notes': row[12],
            'authorization': {
                'requested_by': row[13] if row[13] != 'System' else 'Store Manager',
                'approved_by': 'Plant Manager',
                'witness': 'Quality Control'
            },
            'timestamps': {
                'created_at': row[14].isoformat() if row[14] else None,
                'print_date': integer_to_date(get_current_day_number())
            }
        }
        
        # Add batch details if it's a byproduct writeoff
        if row[10] in ['oil_cake', 'sludge'] and row[11]:
            cur.execute("""
                SELECT batch_code, oil_type, traceable_code
                FROM batch
                WHERE batch_id = %s
            """, (row[11],))
            
            batch = cur.fetchone()
            if batch:
                report['batch_details'] = {
                    'batch_code': batch[0],
                    'oil_type': batch[1],
                    'traceable_code': batch[2]
                }
        
        return jsonify({
            'success': True,
            'report': report
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        close_connection(conn, cur)
    
    def _get_byproduct_name(self, reference_type, reference_id):
        """Helper to get byproduct name"""
        if reference_type == 'oil_cake':
            return 'Oil Cake'
        elif reference_type == 'sludge':
            return 'Sludge'
        return 'Unknown'
    
    def _get_byproduct_category(self, reference_type):
        """Helper to get byproduct category"""
        if reference_type in ['oil_cake', 'sludge']:
            return 'By-product'
        return 'Material'
