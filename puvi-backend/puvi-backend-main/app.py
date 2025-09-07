# File Path: puvi-backend/puvi-backend-main/app.py
"""
Main Flask Application for PUVI Oil Manufacturing System
Integrates all modules including Cost Management, SKU, Masters, Opening Balance, and SKU Outbound
Version: 11.0.0 - Enhanced with SKU Outbound, Locations, and Customers modules
"""

import re
import sys
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
from db_utils import get_db_connection, close_connection, synchronize_all_sequences


# Import all module blueprints
from modules.purchase import purchase_bp
from modules.material_writeoff import writeoff_bp
from modules.writeoff_analytics import writeoff_analytics_bp
from modules.batch_production import batch_bp
from modules.blending import blending_bp
from modules.material_sales import material_sales_bp
from modules.cost_management import cost_management_bp
from modules.sku_management import sku_management_bp
from modules.sku_production import sku_production_bp
from modules.masters_crud import masters_crud_bp
from modules.opening_balance import opening_balance_bp
from modules.system_config import system_config_bp
from modules.package_sizes import package_sizes_bp
# NEW: SKU Outbound module imports
from modules.locations import locations_bp
from modules.customers import customers_bp
from modules.sku_outbound import sku_outbound_bp

# Create Flask app
app = Flask(__name__)

# Enable CORS for all routes with proper preflight handling
# FIXED: Changed from r"/api/*" to r"/*" to ensure CORS applies to all routes
CORS(app, resources={
    r"/*": {  # Changed from r"/api/*" to cover all routes
        "origins": [
            "http://localhost:3000",
            "http://localhost:3001",
            "https://puvi-frontend.vercel.app",  # Your production frontend
            re.compile(r"^https://puvi-frontend-.*\.vercel\.app$"),
            re.compile(r"^https://.*-rajeshs-projects-8be31e4e\.vercel\.app$"),
            re.compile(r"^https://.*\.vercel\.app$")
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        "allow_headers": ["Content-Type", "Authorization", "Access-Control-Allow-Origin", "X-Requested-With"],
        "expose_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "max_age": 3600,
        "send_wildcard": False,
        "always_send": True
    }
})

# Add explicit OPTIONS handler for all routes (preflight handling)
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", request.headers.get("Origin", "*"))
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With")
        response.headers.add("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,PATCH")
        response.headers.add("Access-Control-Max-Age", "3600")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        return response, 200

# ADDED: Ensure CORS headers are always present as a backup
@app.after_request
def ensure_cors_headers(response):
    """Fallback to ensure CORS headers are always present"""
    origin = request.headers.get('Origin')
    
    # Only add if not already set by Flask-CORS
    if 'Access-Control-Allow-Origin' not in response.headers:
        if origin:
            # Allow known origins
            if 'puvi-frontend.vercel.app' in origin or 'localhost' in origin or '.vercel.app' in origin:
                response.headers['Access-Control-Allow-Origin'] = origin
            else:
                response.headers['Access-Control-Allow-Origin'] = 'https://puvi-frontend.vercel.app'
        else:
            response.headers['Access-Control-Allow-Origin'] = 'https://puvi-frontend.vercel.app'
    
    # Ensure other CORS headers are set
    if 'Access-Control-Allow-Methods' not in response.headers:
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
    if 'Access-Control-Allow-Headers' not in response.headers:
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
    if 'Access-Control-Allow-Credentials' not in response.headers:
        response.headers['Access-Control-Allow-Credentials'] = 'true'
    
    return response

# Register all blueprints
app.register_blueprint(purchase_bp)
app.register_blueprint(writeoff_bp)
app.register_blueprint(writeoff_analytics_bp)
app.register_blueprint(batch_bp)
app.register_blueprint(blending_bp)
app.register_blueprint(material_sales_bp)
app.register_blueprint(cost_management_bp)
app.register_blueprint(sku_management_bp)
app.register_blueprint(sku_production_bp)
app.register_blueprint(masters_crud_bp)
app.register_blueprint(opening_balance_bp)
app.register_blueprint(system_config_bp)
app.register_blueprint(package_sizes_bp)
# NEW: Register SKU Outbound related blueprints
app.register_blueprint(locations_bp)
app.register_blueprint(customers_bp)
app.register_blueprint(sku_outbound_bp)

# Configuration
app.config['JSON_SORT_KEYS'] = False
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = True

# Store sequence sync results for health endpoint
sequence_sync_results = {
    'last_run': None,
    'status': 'not_run',
    'summary': {}
}

# Root endpoint - ADDED: Debug info for CORS
@app.route('/', methods=['GET'])
def home():
    """Root endpoint to verify API is running"""
    # Check Flask-CORS version for debugging
    try:
        import flask_cors
        cors_version = flask_cors.__version__
    except:
        cors_version = "Not installed"
    
    return jsonify({
        'status': 'PUVI Backend API is running!',
        'version': '11.0.0',
        'cors_version': cors_version,  # ADDED: Show Flask-CORS version
        'features': {
            'sequence_sync': 'Automatic sequence synchronization enabled',
            'self_healing': 'Database sequences auto-repair on startup',
            'sku_outbound': 'Complete SKU outbound with internal transfers and sales'
        },
        'modules': {
            'core': ['Masters', 'Opening Balance', 'Locations', 'Customers'],
            'transactions': ['Purchase', 'Writeoff', 'Batch', 'Blending', 'Sales'],
            'advanced': ['Cost Management', 'SKU Management v2.0', 'SKU Outbound'],
            'total_modules': 13
        },
        'endpoints': {
            'masters': '/api/masters/*',
            'opening_balance': '/api/opening_balance/*',
            'purchase': '/api/add_purchase, /api/purchase_history',
            'writeoff': '/api/add_writeoff, /api/writeoff_history',
            'batch': '/api/add_batch, /api/batch_history',
            'blending': '/api/add_blending, /api/blending_history',
            'sales': '/api/add_material_sale, /api/sales_history',
            'cost': '/api/cost_management/*',
            'sku': '/api/sku/*',
            'sku_outbound': '/api/sku/outbound/*',
            'locations': '/api/locations/*',
            'customers': '/api/customers/*',
            'system': '/api/sequence_status (NEW)'
        },
        'timestamp': datetime.now().isoformat(),
        'database': 'PostgreSQL',
        'status_check': '/api/health'
    })

# Health check endpoint - Enhanced with sequence sync status
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint for monitoring"""
    conn = None
    try:
        # Test database connection
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        db_status = "healthy"
        close_connection(conn, cur)
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
        if conn:
            close_connection(conn, None)
    
    return jsonify({
        'status': 'running',
        'database': db_status,
        'sequence_sync': {
            'enabled': True,
            'last_run': sequence_sync_results.get('last_run'),
            'status': sequence_sync_results.get('status'),
            'sequences_fixed': sequence_sync_results.get('summary', {}).get('sequences_fixed', 0)
        },
        'timestamp': datetime.now().isoformat(),
        'modules_loaded': 13,
        'version': '11.0.0'
    })

# ADDED: Test endpoint to verify CORS
@app.route('/api/test-cors', methods=['GET', 'OPTIONS'])
def test_cors():
    """Test endpoint to verify CORS is working"""
    return jsonify({
        'success': True,
        'message': 'CORS is working!',
        'origin': request.headers.get('Origin', 'No origin header'),
        'timestamp': datetime.now().isoformat()
    })

# New endpoint to check sequence synchronization status
@app.route('/api/sequence_status', methods=['GET'])
def sequence_status():
    """Get detailed status of sequence synchronization"""
    return jsonify({
        'success': True,
        'sequence_sync': {
            'enabled': True,
            'last_run': sequence_sync_results.get('last_run'),
            'status': sequence_sync_results.get('status'),
            'summary': sequence_sync_results.get('summary', {}),
            'description': 'Sequences are automatically synchronized at startup to prevent duplicate key errors'
        },
        'timestamp': datetime.now().isoformat()
    })

# Manual sequence sync endpoint (for emergency fixes)
@app.route('/api/sync_sequences', methods=['POST'])
def manual_sync_sequences():
    """Manually trigger sequence synchronization"""
    try:
        print("\n" + "="*60)
        print("MANUAL SEQUENCE SYNCHRONIZATION TRIGGERED")
        print("="*60)
        
        summary = synchronize_all_sequences()
        
        # Update global results
        sequence_sync_results['last_run'] = datetime.now().isoformat()
        sequence_sync_results['status'] = 'success' if not summary.get('errors') else 'completed_with_errors'
        sequence_sync_results['summary'] = summary
        
        return jsonify({
            'success': True,
            'message': f"Sequence synchronization completed. Fixed {summary.get('sequences_fixed', 0)} sequences.",
            'summary': summary,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to synchronize sequences'
        }), 500

# System info endpoint
@app.route('/api/system_info', methods=['GET'])
def system_info():
    """Get system configuration and module status"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Check if system is initialized
        cur.execute("""
            SELECT config_value 
            FROM system_configuration 
            WHERE config_key = 'is_initialized'
        """)
        result = cur.fetchone()
        is_initialized = result[0] == 'true' if result else False
        
        # Get module statistics - Enhanced with SKU Outbound stats
        cur.execute("""
            SELECT 
                (SELECT COUNT(*) FROM suppliers WHERE is_active = true) as active_suppliers,
                (SELECT COUNT(*) FROM materials WHERE is_active = true) as active_materials,
                (SELECT COUNT(*) FROM purchases) as total_purchases,
                (SELECT COUNT(*) FROM batch) as total_batches,
                (SELECT COUNT(*) FROM sku_master WHERE is_active = true) as active_skus,
                (SELECT COUNT(*) FROM sku_production) as total_productions,
                (SELECT COUNT(*) FROM locations_master WHERE is_active = true) as active_locations,
                (SELECT COUNT(*) FROM customers WHERE is_active = true) as active_customers,
                (SELECT COUNT(*) FROM sku_outbound) as total_outbounds
        """)
        stats = cur.fetchone()
        
        return jsonify({
            'success': True,
            'system': {
                'initialized': is_initialized,
                'version': '11.0.0',
                'sequence_sync_enabled': True,
                'sequence_sync_status': sequence_sync_results.get('status'),
                'modules': {
                    'masters': 'active',
                    'opening_balance': 'active',
                    'purchase': 'active',
                    'production': 'active',
                    'sales': 'active',
                    'sku': 'active',
                    'sku_outbound': 'active',
                    'locations': 'active',
                    'customers': 'active'
                }
            },
            'statistics': {
                'suppliers': stats[0] if stats else 0,
                'materials': stats[1] if stats else 0,
                'purchases': stats[2] if stats else 0,
                'batches': stats[3] if stats else 0,
                'skus': stats[4] if stats else 0,
                'productions': stats[5] if stats else 0,
                'locations': stats[6] if stats else 0,
                'customers': stats[7] if stats else 0,
                'outbounds': stats[8] if stats else 0
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        close_connection(conn, cur)

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Endpoint not found',
        'status': 404,
        'message': 'The requested endpoint does not exist'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'error': 'Internal server error',
        'status': 500,
        'message': 'An unexpected error occurred'
    }), 500

def startup_sequence_sync():
    """
    Run sequence synchronization at application startup.
    This ensures all sequences are properly aligned with their table data.
    """
    global sequence_sync_results
    
    try:
        print("\n" + "="*60)
        print("PUVI BACKEND STARTUP SEQUENCE")
        print("="*60)
        print("Initializing automatic sequence synchronization...")
        
        # Run the synchronization
        summary = synchronize_all_sequences()
        
        # Store results
        sequence_sync_results['last_run'] = datetime.now().isoformat()
        sequence_sync_results['status'] = 'success' if not summary.get('errors') else 'completed_with_errors'
        sequence_sync_results['summary'] = summary
        
        if summary.get('sequences_fixed', 0) > 0:
            print(f"\n✅ STARTUP SUCCESS: Fixed {summary['sequences_fixed']} sequences")
            print("Your database is now protected against duplicate key errors!")
        else:
            print("\n✅ STARTUP SUCCESS: All sequences are properly synchronized")
            print("No fixes needed - database is healthy!")
            
        if summary.get('errors'):
            print(f"\n⚠️  WARNING: {len(summary['errors'])} errors occurred during sync")
            for error in summary['errors'][:5]:  # Show first 5 errors
                print(f"   - {error}")
                
        print("="*60)
        print("Application ready to serve requests")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n❌ CRITICAL ERROR during startup sequence sync: {str(e)}")
        print("Application will continue but may experience duplicate key errors")
        print("Please run manual sync using POST /api/sync_sequences\n")
        
        sequence_sync_results['last_run'] = datetime.now().isoformat()
        sequence_sync_results['status'] = 'failed'
        sequence_sync_results['summary'] = {'error': str(e)}

# ADDED: Debug log for Flask-CORS
print("="*60, file=sys.stderr)
print("PUVI Backend initializing with Flask-CORS", file=sys.stderr)
try:
    import flask_cors
    print(f"Flask-CORS version: {flask_cors.__version__}", file=sys.stderr)
except:
    print("WARNING: Flask-CORS not found! CORS will not work!", file=sys.stderr)
print("="*60, file=sys.stderr)

if __name__ == '__main__':
    # Run sequence synchronization before starting the server
    startup_sequence_sync()
    
    # Start the Flask application
    app.run(debug=True, port=5000)
