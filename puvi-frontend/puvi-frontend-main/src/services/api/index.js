// File Path: puvi-frontend/puvi-frontend-main/src/services/api/index.js
// Main API Service Module - COMPLETE with Category Management APIs
// Version: FINAL FIXED - All SKU module errors resolved

// Import utilities
import { skuDateUtils, expiryUtils, formatUtils } from './skuUtilities';

// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://puvi-backend.onrender.com';

console.log('API Base URL:', API_BASE_URL);
console.log('Environment:', process.env.NODE_ENV);

// Base API helper
const apiCall = async (url, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `API call failed: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// API wrapper with common methods
const api = {
  get: (url, params) => {
    const queryString = params ? 
      `?${new URLSearchParams(params).toString()}` : '';
    return apiCall(`${url}${queryString}`);
  },
  
  post: (url, data) => {
    return apiCall(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  put: (url, data) => {
    return apiCall(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  
  delete: (url) => {
    return apiCall(url, {
      method: 'DELETE'
    });
  },
  
  // Specific module endpoints
  purchase: {
    getMaterials: (params) => api.get('/api/materials', params),
    getSuppliers: () => api.get('/api/suppliers'),
    getPurchaseHistory: (params) => api.get('/api/purchase_history', params),
    addPurchase: (data) => api.post('/api/add_purchase', data)
  },
  
  batch: {
    getSeedsForBatch: () => api.get('/api/seeds_for_batch'),
    getCostElements: () => api.get('/api/cost_elements_for_batch'),
    getCostElementsForBatch: () => api.get('/api/cost_elements_for_batch'), // Alias for compatibility
    getExtendedCostElements: () => api.get('/api/extended_cost_elements'),
    getOilCakeRates: () => api.get('/api/oil_cake_rates'),
    addBatch: (data) => api.post('/api/add_batch', data),
    createBatch: (data) => api.post('/api/add_batch', data),
    getBatchHistory: (params) => api.get('/api/batch_history', params),
    // FIXED: Add missing batch cost endpoints
    calculateBatchCosts: (batchId) => api.post('/api/cost_elements/calculate', { batch_id: batchId }),
    getBatchCostSummary: (batchId) => api.get(`/api/cost_elements/batch_summary/${batchId}`),
    // FIX ADDED: Missing getOilTypes function
    getOilTypes: () => api.get('/api/oil_types')
  },
  
  sku: {
    getMasterList: (filters) => api.get('/api/sku/master', filters),
    createSKU: (data) => api.post('/api/sku/master', data),
    updateSKU: (id, data) => api.put(`/api/sku/master/${id}`, data),
    deleteSKU: (id) => api.delete(`/api/sku/master/${id}`),
    getBOM: (skuId) => api.get(`/api/sku/bom/${skuId}`),
    saveBOM: (data) => api.post('/api/sku/bom', data),
    getAllocateOil: (data) => api.post('/api/sku/allocate_oil', data),
    getMaterials: () => api.get('/api/sku/materials_for_sku'),
    createProduction: (data) => api.post('/api/sku/production', data),
    getProductionHistory: (params) => api.get('/api/sku/production/history', params), // FIXED: Added /history
    getProductionSummary: (id) => api.get(`/api/sku/production_summary/${id}`),
    // FIX ADDED: Missing getSKUDetails function
    getSKUDetails: (skuId) => api.get(`/api/sku/master/${skuId}`),
    // FIX ADDED: Missing MRP functions that ProductionEntry.js needs
    getCurrentMRP: (skuId) => api.get(`/api/sku/current-mrp/${skuId}`),
    getMRPHistory: (skuId) => api.get(`/api/sku/mrp-history/${skuId}`)
  },
  
  sales: {
    // FIXED: Added all Material Sales endpoints needed by the component
    getByproductTypes: () => api.get('/api/byproduct_types'),
    getMaterialSalesInventory: (params) => api.get('/api/material_sales_inventory', params),
    addMaterialSale: (data) => api.post('/api/add_material_sale', data),
    getMaterialSalesHistory: (params) => api.get('/api/material_sales_history', params),
    getCostReconciliationReport: () => api.get('/api/cost_reconciliation_report'),
    // Keep old functions for backward compatibility
    getByproductInventory: (type) => api.get(`/api/byproduct_inventory/${type}`),
    recordSale: (data) => api.post('/api/material_sales', data),
    getSalesHistory: () => api.get('/api/material_sales_history')
  },
  
  writeoff: {
    // FIXED: Corrected endpoint URLs to match backend
    getMaterials: () => api.get('/api/inventory_for_writeoff'),  // Fixed from /api/materials_for_writeoff
    getReasons: () => api.get('/api/writeoff_reasons'),
    recordWriteoff: (data) => api.post('/api/add_writeoff', data),  // Fixed from /api/material_writeoff
    getHistory: () => api.get('/api/writeoff_history')
  },
  
  blending: {
    getAvailableOils: () => api.get('/api/oil_types_for_blending'),  // Changed to match backend
    createBlend: (data) => api.post('/api/create_blend', data),  // Changed to match backend
    getHistory: () => api.get('/api/blend_history'),  // Changed to match backend
    // FIX CRITICAL: Corrected endpoint name to match backend
    getBatchesForOilType: (oilType) => {
      const params = oilType ? { oil_type: oilType } : {};
      return api.get('/api/batches_for_oil_type', params);  // FIXED: Was /api/available_oils_for_blend
    }
  },
  
  costManagement: {
    // FIXED: Use correct endpoints from cost_management module
    getCostElementsMaster: () => api.get('/api/cost_elements/master'),
    getCostElementsByCategory: (category) => api.get(`/api/cost_elements/${category}`),
    getCostElementsByStage: (stage) => api.get('/api/cost_elements/by_stage', { stage }),
    // BUG FIX: Added missing getCostElementsByActivity method
    getCostElementsByActivity: (activity, module) => api.get('/api/cost_elements/by_activity', { activity, module }),
    getCostElementsForBatch: () => api.get('/api/cost_elements_for_batch'), // For batch module
    addCostElement: (data) => api.post('/api/cost_elements', data),
    updateCostElement: (id, data) => api.put(`/api/cost_elements/${id}`, data),
    deleteCostElement: (id) => api.delete(`/api/cost_elements/${id}`),
    getCostAnalysis: (params) => api.get('/api/cost_analysis', params),
    // FIXED: Correct endpoints for time tracking and batch costs
    saveTimeTracking: (data) => api.post('/api/cost_elements/time_tracking', data),
    saveBatchCosts: (data) => api.post('/api/cost_elements/save_batch_costs', data),
    // FIXED: Add missing validation and summary endpoints
    getValidationReport: (days) => api.get('/api/cost_elements/validation_report', { days }),
    getBatchSummary: (batchId) => api.get(`/api/cost_elements/batch_summary/${batchId}`)
  },
  
  masters: {
    getSuppliers: () => api.get('/api/suppliers'),
    getMaterials: () => api.get('/api/materials'),
    getCostElements: () => api.get('/api/cost_elements/master') // FIXED: Use master endpoint
  },
  
  // NEW: Category Management APIs - REQUIRED FOR DYNAMIC OIL TYPES
  categories: {
    // Get all categories with their subcategory requirements
    getAll: async () => {
      const response = await fetch(`${API_BASE_URL}/api/categories`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch categories');
      }
      return data;
    },
    
    // Get subcategories, optionally filtered by category_id
    getSubcategories: async (categoryId = null) => {
      const url = categoryId 
        ? `${API_BASE_URL}/api/subcategories?category_id=${categoryId}`
        : `${API_BASE_URL}/api/subcategories`;
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch subcategories');
      }
      return data;
    },
    
    // Get single subcategory details by ID
    getSubcategoryDetails: async (subcategoryId) => {
      const response = await fetch(`${API_BASE_URL}/api/subcategories/${subcategoryId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch subcategory details');
      }
      return data;
    }
  },
  
  // NEW: Material Management API - REQUIRED FOR PURCHASE MODULE
  materials: {
    // Create new material with category/subcategory support
    create: async (materialData) => {
      const response = await fetch(`${API_BASE_URL}/api/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(materialData)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create material');
      }
      return data;
    },
    
    // Get materials (existing endpoint for compatibility)
    getAll: () => api.get('/api/materials'),
    
    // Get materials by supplier
    getBySupplier: (supplierId) => api.get('/api/materials', { supplier_id: supplierId })
  },
  
  openingBalance: {
    getMaterials: () => api.get('/api/materials'),
    getOpeningBalances: () => api.get('/api/opening_balances'),
    setOpeningBalance: (data) => api.post('/api/opening_balance', data),
    updateOpeningBalance: (id, data) => api.put(`/api/opening_balance/${id}`, data),
    deleteOpeningBalance: (id) => api.delete(`/api/opening_balance/${id}`)
  }
};

// Masters API endpoints
export const mastersAPI = {
  // Get all records for a master type
  getAll: (masterType, params = {}) => {
    return api.get(`/api/masters/${masterType}`, params);
  },
  
  // Get single record
  getById: (masterType, id) => {
    return api.get(`/api/masters/${masterType}/${id}`);
  },
  
  // Get schema for a master type
  getSchema: (masterType) => {
    return api.get(`/api/masters/${masterType}/schema`);
  },
  
  // Create record
  create: (masterType, data) => {
    return api.post(`/api/masters/${masterType}`, data);
  },
  
  // Update record
  update: (masterType, id, data) => {
    return api.put(`/api/masters/${masterType}/${id}`, data);
  },
  
  // Delete record
  delete: (masterType, id) => {
    return api.delete(`/api/masters/${masterType}/${id}`);
  },
  
  // Restore deleted record
  restore: (masterType, id) => {
    return api.post(`/api/masters/${masterType}/${id}/restore`);
  },
  
  // Check dependencies
  checkDependencies: (masterType, id) => {
    return api.get(`/api/masters/${masterType}/${id}/dependencies`);
  },
  
  // Export data
  export: (masterType, params = {}) => {
    return api.get(`/api/masters/${masterType}/export`, params);
  },
  
  // Import data
  import: (masterType, data) => {
    return api.post(`/api/masters/${masterType}/import`, data);
  },
};

// Purchase API endpoints
export const purchaseAPI = {
  // Get all purchases
  getAll: (params = {}) => api.get('/api/purchases', params),
  
  // Get single purchase
  getById: (id) => api.get(`/api/purchases/${id}`),
  
  // Create purchase
  create: (data) => api.post('/api/add_purchase', data),
  
  // Update purchase
  update: (id, data) => api.put(`/api/purchases/${id}`, data),
  
  // Delete purchase
  delete: (id) => api.delete(`/api/purchases/${id}`),
  
  // Get materials
  getMaterials: () => api.get('/api/materials'),
  
  // Get suppliers
  getSuppliers: () => api.get('/api/suppliers'),
};

// Batch Production API endpoints
export const batchAPI = {
  // Get all batches
  getAll: () => api.get('/api/batch_production'),
  
  // Create batch
  create: (data) => api.post('/api/batch_production', data),
  
  // Get batch by ID
  getById: (id) => api.get(`/api/batch_production/${id}`),
  
  // Update batch
  update: (id, data) => api.put(`/api/batch_production/${id}`, data),
  
  // Get seed materials
  getSeedMaterials: () => api.get('/api/seed_materials_for_batch'),
  
  // Get oil types
  getOilTypes: () => api.get('/api/oil_types'),
};

// SKU Management API endpoints
export const skuAPI = {
  // SKU Master
  getSKUs: () => api.get('/api/sku/master'),
  createSKU: (data) => api.post('/api/sku/master', data),
  updateSKU: (id, data) => api.put(`/api/sku/master/${id}`, data),
  deleteSKU: (id) => api.delete(`/api/sku/master/${id}`),
  
  // BOM
  getBOM: (skuId) => api.get(`/api/sku/bom/${skuId}`),
  createBOM: (data) => api.post('/api/sku/bom', data),
  updateBOM: (id, data) => api.put(`/api/sku/bom/${id}`, data),
  
  // Production
  createProduction: (data) => api.post('/api/sku/production', data),
  getProductionHistory: () => api.get('/api/sku/production/history'),  // FIXED: Added /history
  getProductionDetails: (id) => api.get(`/api/sku/production/${id}`),
  
  // Oil allocation
  allocateOil: (data) => api.post('/api/sku/allocate_oil', data),
  
  // Materials
  getMaterialsForSKU: () => api.get('/api/sku/materials_for_sku'),
  
  // FIX ADDED: MRP endpoints for backward compatibility
  getCurrentMRP: (skuId) => api.get(`/api/sku/current-mrp/${skuId}`),
  getMRPHistory: (skuId) => api.get(`/api/sku/mrp-history/${skuId}`)
};

// Material Writeoff API endpoints
export const writeoffAPI = {
  // FIXED: Corrected endpoint URLs to match backend
  // Get materials for writeoff
  getMaterials: () => api.get('/api/inventory_for_writeoff'),  // Fixed from /api/materials_for_writeoff
  
  // Get writeoff reasons
  getReasons: () => api.get('/api/writeoff_reasons'),
  
  // Create writeoff
  create: (data) => api.post('/api/add_writeoff', data),  // Fixed from /api/material_writeoff
  
  // Get writeoff history
  getHistory: () => api.get('/api/writeoff_history'),
  
  // Additional alias for backward compatibility
  recordWriteoff: (data) => api.post('/api/add_writeoff', data)  // Added alias
};

// Oil Blending API endpoints
export const blendingAPI = {
  // Get available oils - FIXED to match backend
  getOils: () => api.get('/api/oil_types_for_blending'),
  
  // Create blend - FIXED to match backend
  create: (data) => api.post('/api/create_blend', data),
  
  // Get blending history - FIXED to match backend
  getHistory: () => api.get('/api/blend_history'),
  
  // Get batches for oil type - FIXED to match backend
  getBatchesForOilType: (oilType) => {
    const params = oilType ? { oil_type: oilType } : {};
    return api.get('/api/batches_for_oil_type', params);
  }
};

// Opening Balance API endpoints
export const openingBalanceAPI = {
  // Get all balances
  getBalances: () => api.get('/api/opening_balance'),
  
  // Save opening balance
  saveBalance: (data) => api.post('/api/opening_balance', data),
  
  // Update opening balance
  updateBalance: (id, data) => api.put(`/api/opening_balance/${id}`, data),
  
  // Delete opening balance
  deleteBalance: (id) => api.delete(`/api/opening_balance/${id}`),
  
  // Import CSV
  importCSV: (data) => api.post('/api/opening_balance/import', data),
  
  // Export CSV
  exportCSV: () => api.get('/api/opening_balance/export'),
};

// Material Sales API endpoints
export const salesAPI = {
  // FIXED: Added all Material Sales endpoints needed by the component
  // Get byproduct types
  getByproductTypes: () => api.get('/api/byproduct_types'),
  
  // Get material sales inventory
  getMaterialSalesInventory: (params) => api.get('/api/material_sales_inventory', params),
  
  // Add material sale
  addMaterialSale: (data) => api.post('/api/add_material_sale', data),
  
  // Get material sales history
  getMaterialSalesHistory: (params) => api.get('/api/material_sales_history', params),
  
  // Get cost reconciliation report
  getCostReconciliationReport: () => api.get('/api/cost_reconciliation_report'),
  
  // Old functions for backward compatibility
  getInventory: () => api.get('/api/oil_cake_inventory'),
  create: (data) => api.post('/api/oil_cake_sale', data),
  getHistory: () => api.get('/api/oil_cake_sales'),
  getById: (id) => api.get(`/api/oil_cake_sale/${id}`),
};

// Cost Management API endpoints
export const costAPI = {
  // FIXED: Use correct endpoints from cost_management module
  getElements: () => api.get('/api/cost_elements/master'),
  
  // Create cost element
  createElement: (data) => api.post('/api/cost_elements', data),
  
  // Update cost element
  updateElement: (id, data) => api.put(`/api/cost_elements/${id}`, data),
  
  // Delete cost element
  deleteElement: (id) => api.delete(`/api/cost_elements/${id}`),
  
  // Get cost analysis
  getAnalysis: (params) => api.get('/api/cost_analysis', params),
  
  // FIXED: Add missing cost management endpoints
  getCostElementsByStage: (stage) => api.get('/api/cost_elements/by_stage', { stage }),
  saveTimeTracking: (data) => api.post('/api/cost_elements/time_tracking', data),
  saveBatchCosts: (data) => api.post('/api/cost_elements/save_batch_costs', data),
  calculateBatchCosts: (batchId) => api.post('/api/cost_elements/calculate', { batch_id: batchId }),
  getBatchSummary: (batchId) => api.get(`/api/cost_elements/batch_summary/${batchId}`),
  getValidationReport: (days) => api.get('/api/cost_elements/validation_report', { days })
};

// NEW: Category API endpoints - EXPORTED FOR DIRECT USE
export const categoryAPI = {
  // Get all categories
  getCategories: () => api.categories.getAll(),
  
  // Get subcategories by category
  getSubcategories: (categoryId) => api.categories.getSubcategories(categoryId),
  
  // Get all subcategories
  getAllSubcategories: () => api.categories.getSubcategories(),
  
  // Get subcategory details
  getSubcategoryDetails: (id) => api.categories.getSubcategoryDetails(id)
};

// ===================================================================
// NEW CONFIGURATION API SECTION - Added for Dynamic Values from DB
// ===================================================================
export const configAPI = {
  // Get BOM material categories from database
  getBOMCategories: () => api.get('/api/config/bom_categories'),
  
  // Get filtered materials for BOM based on category
  getBOMMaterials: (bomCategory) => {
    const params = bomCategory ? { bom_category: bomCategory } : {};
    return api.get('/api/config/bom_materials', params);
  },
  
  // Get material categories from database
  getMaterialCategories: () => api.get('/api/materials/categories'),
  
  // Get material units from database
  getMaterialUnits: () => api.get('/api/materials/units'),
  
  // Get writeoff reasons from database
  getWriteoffReasons: () => api.get('/api/config/writeoff_reasons'),
  
  // Get labor rates from cost_elements_master
  getLaborRates: (activity) => {
    const params = activity ? { activity } : {};
    return api.get('/api/config/labor_rates', params);
  },
  
  // Get package sizes from SKU master
  getPackageSizes: () => api.get('/api/config/package_sizes'),
  
  // Get oil types from available_oil_types table
  getOilTypes: () => api.get('/api/config/oil_types'),
  
  // Get GST rates from materials
  getGSTRates: () => api.get('/api/config/gst_rates'),
  
  // Get density values from materials
  getDensityValues: () => api.get('/api/config/density_values'),
  
  // Get cost elements from cost_elements_master
  getCostElements: () => api.get('/api/config/cost_elements'),
  
  // Get bottle types from SKU master
  getBottleTypes: () => api.get('/api/config/bottle_types'),
  
  // Get suppliers with their details
  getSuppliers: () => api.get('/api/config/suppliers'),
  
  // Get units used in materials
  getUnits: () => api.get('/api/config/units'),
  
  // Generic config endpoint for any config type
  getConfig: (configType) => api.get(`/api/config/${configType}`)
};

// Export the API base URL for components that need it directly
export const API_URL = API_BASE_URL;

// Export the SKU utilities - including formatDateForDisplay for ProductionEntry
export { 
  skuDateUtils, 
  expiryUtils, 
  formatUtils,
  // Add alias for components expecting formatDateForDisplay
  skuDateUtils as dateUtils
};

// Create a formatDateForDisplay alias for backward compatibility
export const formatDateForDisplay = skuDateUtils.formatForDisplay;

// Default export - THIS IS CRITICAL FOR THE PURCHASE MODULE TO WORK
export default api;

// Also export the apiCall function for direct use
export { apiCall, API_BASE_URL };
