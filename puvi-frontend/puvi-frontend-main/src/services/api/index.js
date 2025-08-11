// File Path: puvi-frontend/puvi-frontend-main/src/services/api/index.js
// Main API Service Module

// Import utilities
import { skuDateUtils, expiryUtils, formatUtils } from './skuUtilities';

// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://puvi-backend.onrender.com';

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
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
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
    getExtendedCostElements: () => api.get('/api/extended_cost_elements'),
    createBatch: (data) => api.post('/api/batch_production', data),
    getBatchHistory: () => api.get('/api/batch_history')
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
    getProductionHistory: (params) => api.get('/api/sku/production_history', params),
    getProductionSummary: (id) => api.get(`/api/sku/production_summary/${id}`)
  },
  
  sales: {
    getByproductInventory: (type) => api.get(`/api/byproduct_inventory/${type}`),
    recordSale: (data) => api.post('/api/material_sales', data),
    getSalesHistory: () => api.get('/api/material_sales_history')
  },
  
  writeoff: {
    getMaterials: () => api.get('/api/materials_for_writeoff'),
    getReasons: () => api.get('/api/writeoff_reasons'),
    recordWriteoff: (data) => api.post('/api/material_writeoff', data),
    getHistory: () => api.get('/api/writeoff_history')
  },
  
  blending: {
    getAvailableOils: () => api.get('/api/available_oils_for_blend'),
    createBlend: (data) => api.post('/api/oil_blending', data),
    getHistory: () => api.get('/api/blending_history')
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
  getProductionHistory: () => api.get('/api/sku/production_history'),
  getProductionDetails: (id) => api.get(`/api/sku/production/${id}`),
  
  // Oil allocation
  allocateOil: (data) => api.post('/api/sku/allocate_oil', data),
  
  // Materials
  getMaterialsForSKU: () => api.get('/api/sku/materials_for_sku'),
};

// Material Writeoff API endpoints
export const writeoffAPI = {
  // Get materials for writeoff
  getMaterials: () => api.get('/api/materials_for_writeoff'),
  
  // Get writeoff reasons
  getReasons: () => api.get('/api/writeoff_reasons'),
  
  // Create writeoff
  create: (data) => api.post('/api/material_writeoff', data),
  
  // Get writeoff history
  getHistory: () => api.get('/api/writeoff_history'),
};

// Oil Blending API endpoints
export const blendingAPI = {
  // Get available oils
  getOils: () => api.get('/api/available_oils_for_blend'),
  
  // Create blend
  create: (data) => api.post('/api/oil_blending', data),
  
  // Get blending history
  getHistory: () => api.get('/api/blending_history'),
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
  // Get oil cake inventory
  getInventory: () => api.get('/api/oil_cake_inventory'),
  
  // Create sale
  create: (data) => api.post('/api/oil_cake_sale', data),
  
  // Get sales history
  getHistory: () => api.get('/api/oil_cake_sales'),
  
  // Get sale by ID
  getById: (id) => api.get(`/api/oil_cake_sale/${id}`),
};

// Cost Management API endpoints
export const costAPI = {
  // Get cost elements
  getElements: () => api.get('/api/cost_elements'),
  
  // Create cost element
  createElement: (data) => api.post('/api/cost_elements', data),
  
  // Update cost element
  updateElement: (id, data) => api.put(`/api/cost_elements/${id}`, data),
  
  // Delete cost element
  deleteElement: (id) => api.delete(`/api/cost_elements/${id}`),
  
  // Get cost analysis
  getAnalysis: (params) => api.get('/api/cost_analysis', params),
};

// Export the API base URL for components that need it directly
export const API_URL = API_BASE_URL;

// Export the SKU utilities
export { skuDateUtils, expiryUtils, formatUtils };

// Default export
export default {
  apiCall,
  api,
  mastersAPI,
  purchaseAPI,
  batchAPI,
  skuAPI,
  writeoffAPI,
  blendingAPI,
  openingBalanceAPI,
  salesAPI,
  costAPI,
  API_URL,
  // Include utilities in default export as well
  skuDateUtils,
  expiryUtils,
  formatUtils
};
