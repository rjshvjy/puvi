import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
// API Configuration for PUVI Oil Manufacturing System
// File Path: puvi-frontend/puvi-frontend-main/src/services/api/index.js
// This file handles all API communications with the backend

// API Base URL Configuration
// Uses environment variable if available, otherwise uses production URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://puvi-backend.onrender.com';

// Debug logging (remove in production if not needed)
console.log('API Base URL:', API_BASE_URL);
console.log('Environment:', process.env.NODE_ENV);

// Helper function to handle API responses
const handleResponse = async (response) => {
  // Check if response is ok (status in the range 200-299)
  if (!response.ok) {
    // Try to get error message from response
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch (e) {
      // Response wasn't JSON
      console.error('Error parsing error response:', e);
    }
    throw new Error(errorMessage);
  }
  
  // Try to parse JSON response
  try {
    const data = await response.json();
    return data;
  } catch (e) {
    // Response wasn't JSON, return null
    console.warn('Response was not JSON:', e);
    return null;
  }
};

// Main API call function
export const apiCall = async (endpoint, options = {}) => {
  // Ensure endpoint starts with /
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Construct full URL
  const url = `${API_BASE_URL}${cleanEndpoint}`;
  
  // Debug logging
  console.log('API Call:', options.method || 'GET', url);
  
  // Default options
  const defaultOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'omit', // Don't send cookies for CORS
  };
  
  // Merge options
  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };
  
  // If body is an object, stringify it
  if (finalOptions.body && typeof finalOptions.body === 'object') {
    finalOptions.body = JSON.stringify(finalOptions.body);
  }
  
  try {
    const response = await fetch(url, finalOptions);
    return await handleResponse(response);
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

// Convenience methods for different HTTP methods
export const api = {
  // GET request
  get: (endpoint, params = {}) => {
    // Build query string if params provided
    const queryString = Object.keys(params).length 
      ? '?' + new URLSearchParams(params).toString()
      : '';
    return apiCall(`${endpoint}${queryString}`, {
      method: 'GET',
    });
  },
  
  // POST request
  post: (endpoint, data = {}) => {
    return apiCall(endpoint, {
      method: 'POST',
      body: data,
    });
  },
  
  // PUT request
  put: (endpoint, data = {}) => {
    return apiCall(endpoint, {
      method: 'PUT',
      body: data,
    });
  },
  
  // DELETE request
  delete: (endpoint) => {
    return apiCall(endpoint, {
      method: 'DELETE',
    });
  },
  
  // PATCH request
  patch: (endpoint, data = {}) => {
    return apiCall(endpoint, {
      method: 'PATCH',
      body: data,
    });
  },
};

// Masters API endpoints
export const mastersAPI = {
  // Get list of items for a master type
  getList: (masterType, params = {}) => {
    return api.get(`/api/masters/${masterType}`, params);
  },
  
  // Get schema for a master type
  getSchema: (masterType) => {
    return api.get(`/api/masters/${masterType}/schema`);
  },
  
  // Get single item
  getItem: (masterType, id) => {
    return api.get(`/api/masters/${masterType}/${id}`);
  },
  
  // Create new item
  create: (masterType, data) => {
    return api.post(`/api/masters/${masterType}`, data);
  },
  
  // Update item
  update: (masterType, id, data) => {
    return api.put(`/api/masters/${masterType}/${id}`, data);
  },
  
  // Delete item
  delete: (masterType, id) => {
    return api.delete(`/api/masters/${masterType}/${id}`);
  },
  
  // Check dependencies
  checkDependencies: (masterType, id) => {
    return api.get(`/api/masters/${masterType}/${id}/dependencies`);
  },
  
  // Export data
  export: (masterType) => {
    return api.get(`/api/masters/${masterType}/export`);
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
  getProduction: () => api.get('/api/sku/production'),
  createProduction: (data) => api.post('/api/sku/production', data),
  getProductionById: (id) => api.get(`/api/sku/production/${id}`),
  
  // MRP
  getMRPHistory: (skuId) => api.get(`/api/sku/mrp/history/${skuId}`),
  updateMRP: (skuId, data) => api.post(`/api/sku/mrp/update/${skuId}`, data),
  
  // Expiry
  getExpiryAlerts: () => api.get('/api/sku/expiry/alerts'),
  getExpiryStatus: () => api.get('/api/sku/expiry/status'),
};

// Material Writeoff API endpoints
export const writeoffAPI = {
  // Get inventory for writeoff
  getInventory: () => api.get('/api/inventory_for_writeoff'),
  
  // Get writeoff reasons
  getReasons: () => api.get('/api/writeoff_reasons'),
  
  // Create writeoff
  create: (data) => api.post('/api/material_writeoff', data),
  
  // Get writeoff history
  getHistory: () => api.get('/api/writeoff_history'),
};

// Blending API endpoints
export const blendingAPI = {
  // Get available oils
  getAvailableOils: () => api.get('/api/available_oils_for_blending'),
  
  // Create blend
  create: (data) => api.post('/api/create_blend', data),
  
  // Get blend history
  getHistory: () => api.get('/api/blend_history'),
  
  // Get blend by ID
  getById: (id) => api.get(`/api/blend/${id}`),
};

// Opening Balance API endpoints
export const openingBalanceAPI = {
  // Check initialization status
  checkStatus: () => api.get('/api/system/initialization_status'),
  
  // Initialize system
  initialize: (data) => api.post('/api/system/initialize', data),
  
  // Get opening balances
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
};
