# File Path: puvi-backend/app.py
"""
Main Flask Application for PUVI Oil Manufacturing System
Integrates all modules including Cost Management and SKU modules
Version: 8.0.1 - Fixed CORS preflight handling
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

# Configuration
app.config['JSON_SORT_KEYS'] = False
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = True

# Root endpoint
@app.route('/', methods=['GET'])
def home():
    """Root endpoint to verify API is running"""
    return jsonify({
        'status': 'PUVI Backend API is running!',
        'version': '8.0.1',
        'modules': [
            'Purchase Management',
            'Material Writeoff',
            'Batch Production',
            'Blending',
            'Material Sales',
            'Cost Management',
            'SKU Management',
            'SKU Production'
        ],
        'timestamp': datetime.now().isoformat()
    })

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint with database connection test and module stats"""
    conn = get_db_connection()
    
    if not conn:
        return jsonify({
            'status': 'unhealthy',
            'database': 'disconnected',
            'error': 'Could not connect to database'
        }), 503
    
    try:
        cur = conn.cursor()
        
        # Test database connection
        cur.execute("SELECT 1")
        
        # Get record counts
        queries = {
            'purchases': "SELECT COUNT(*) FROM purchases",
            'batches': "SELECT COUNT(*) FROM batch",
            'writeoffs': "SELECT COUNT(*) FROM material_writeoffs",
            'blends': "SELECT COUNT(*) FROM blend_batches",
            'material_sales': "SELECT COUNT(*) FROM oil_cake_sales",
            'cost_elements': "SELECT COUNT(*) FROM cost_elements_master",
            'time_tracking': "SELECT COUNT(*) FROM batch_time_tracking",
            'sku_master': "SELECT COUNT(*) FROM sku_master",
            'sku_productions': "SELECT COUNT(*) FROM sku_production",
            'sku_boms': "SELECT COUNT(*) FROM sku_bom_master",
            'inventory_items': "SELECT COUNT(*) FROM inventory WHERE closing_stock > 0"
        }
        
        counts = {}
        for key, query in queries.items():
            try:
                cur.execute(query)
                counts[key] = cur.fetchone()[0]
            except:
                counts[key] = 0
        
        # Check database size
        cur.execute("""
            SELECT pg_database_size(current_database())
        """)
        db_size = cur.fetchone()[0]
        
        # Check for cost elements validation
        cur.execute("""
            SELECT COUNT(*)
            FROM cost_elements_master
            WHERE active = true
            AND default_rate <= 0
        """)
        invalid_cost_elements = cur.fetchone()[0]
        
        validation_warnings = []
        if invalid_cost_elements > 0:
            validation_warnings.append(f"{invalid_cost_elements} cost elements have invalid rates")
        
        # Check for SKUs without BOM
        cur.execute("""
            SELECT COUNT(DISTINCT s.sku_id)
            FROM sku_master s
            LEFT JOIN sku_bom_master b ON s.sku_id = b.sku_id AND b.is_current = true
            WHERE s.is_active = true
            AND b.bom_id IS NULL
        """)
        skus_without_bom = cur.fetchone()[0]
        
        # Get active modules
        active_modules = []
        for rule in app.url_map.iter_rules():
            if '/api/' in rule.rule:
                module = rule.rule.split('/')[2] if len(rule.rule.split('/')) > 2 else 'core'
                if module not in active_modules and module != 'health':
                    active_modules.append(module)
        
        close_connection(conn, cur)
        
        return jsonify({
            'status': 'healthy',
            'database': 'connected',
            'version': '8.0.1',
            'counts': counts,
            'database_size_mb': round(db_size / 1024 / 1024, 2),
            'active_modules': sorted(active_modules),
            'cost_validation_warnings': validation_warnings,
            'skus_without_bom': skus_without_bom,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'database': 'error',
            'error': str(e)
        }), 503

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found',
        'message': 'The requested endpoint does not exist'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error',
        'message': 'An unexpected error occurred'
    }), 500

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({
        'success': False,
        'error': 'Method not allowed',
        'message': 'The HTTP method is not allowed for this endpoint'
    }), 405

# Main execution
if __name__ == '__main__':
    # For local development
    app.run(debug=True, host='0.0.0.0', port=5000)
    
# For production (Render), the app object is used directly
