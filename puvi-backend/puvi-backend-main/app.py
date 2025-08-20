# File Path: puvi-backend/puvi-backend-main/app.py
"""
Main Flask Application for PUVI Oil Manufacturing System
Integrates all modules including Cost Management, SKU, Masters, and Opening Balance
Version: 9.0.0 - Complete with Masters and Opening Balance Integration
"""

import re
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
from db_utils import get_db_connection, close_connection

# Import all module blueprints
from modules.purchase import purchase_bp
from modules.material_writeoff import writeoff_bp
from modules.batch_production import batch_bp
from modules.blending import blending_bp
from modules.material_sales import material_sales_bp
from modules.cost_management import cost_management_bp
from modules.sku_management import sku_management_bp
from modules.sku_production import sku_production_bp
from modules.masters_crud import masters_crud_bp
from modules.opening_balance import opening_balance_bp
from modules.system_config import system_config_bp

# Create Flask app
app = Flask(__name__)

# Enable CORS for all routes with proper preflight handling
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:3000",
            "http://localhost:3001",
            "https://puvi-frontend.vercel.app",
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
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,PATCH")
        response.headers.add("Access-Control-Max-Age", "3600")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        return response, 200

# Register all blueprints
app.register_blueprint(purchase_bp)
app.register_blueprint(writeoff_bp)
app.register_blueprint(batch_bp)
app.register_blueprint(blending_bp)
app.register_blueprint(material_sales_bp)
app.register_blueprint(cost_management_bp)
app.register_blueprint(sku_management_bp)
app.register_blueprint(sku_production_bp)
app.register_blueprint(masters_crud_bp)
app.register_blueprint(opening_balance_bp)
app.register_blueprint(system_config_bp)

# Configuration
app.config['JSON_SORT_KEYS'] = False
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = True

# Root endpoint
@app.route('/', methods=['GET'])
def home():
    """Root endpoint to verify API is running"""
    return jsonify({
        'status': 'PUVI Backend API is running!',
        'version': '9.0.0',
        'modules': {
            'core': ['Masters', 'Opening Balance'],
            'transactions': ['Purchase', 'Writeoff', 'Batch', 'Blending', 'Sales'],
            'advanced': ['Cost Management', 'SKU Management v2.0'],
            'total_modules': 10
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
            'sku': '/api/sku/*'
        },
        'timestamp': datetime.now().isoformat(),
        'database': 'PostgreSQL',
        'status_check': '/api/health'
    })

# Health check endpoint
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
        'timestamp': datetime.now().isoformat(),
        'modules_loaded': 10,
        'version': '9.0.0'
    })

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
        
        # Get module statistics
        cur.execute("""
            SELECT 
                (SELECT COUNT(*) FROM suppliers WHERE is_active = true) as active_suppliers,
                (SELECT COUNT(*) FROM materials WHERE is_active = true) as active_materials,
                (SELECT COUNT(*) FROM purchases) as total_purchases,
                (SELECT COUNT(*) FROM batch) as total_batches,
                (SELECT COUNT(*) FROM sku_master WHERE is_active = true) as active_skus
        """)
        stats = cur.fetchone()
        
        return jsonify({
            'success': True,
            'system': {
                'initialized': is_initialized,
                'version': '9.0.0',
                'modules': {
                    'masters': 'active',
                    'opening_balance': 'active',
                    'purchase': 'active',
                    'production': 'active',
                    'sales': 'active',
                    'sku': 'active'
                }
            },
            'statistics': {
                'suppliers': stats[0] if stats else 0,
                'materials': stats[1] if stats else 0,
                'purchases': stats[2] if stats else 0,
                'batches': stats[3] if stats else 0,
                'skus': stats[4] if stats else 0
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

if __name__ == '__main__':
    app.run(debug=True, port=5000)
