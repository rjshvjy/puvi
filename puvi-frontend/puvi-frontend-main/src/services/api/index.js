// API Service for PUVI Oil Manufacturing System
// File Path: puvi-frontend/src/services/api/index.js

import axios from 'axios';
import qs from 'qs';

// Base configuration
const API_BASE_URL = 'https://puvi-backend.onrender.com';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
  // Use qs to serialize query parameters to fix material filtering issue
  paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' })
});

// Response interceptor to handle the standardized response format
apiClient.interceptors.response.use(
  (response) => {
    // Backend returns: { success: true/false, ...otherData }
    // We'll return the full response data, letting components handle it
    return response.data;
  },
  (error) => {
    // Handle network errors or other axios errors
    if (error.response && error.response.data) {
      // If backend sent an error response
      if (error.response.data.error) {
        return Promise.reject(new Error(error.response.data.error));
      }
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

// API service methods organized by module
const api = {
  // Purchase Module
  purchase: {
    getMaterials: (params) => apiClient.get('/api/materials', { params }),
    addPurchase: (data) => apiClient.post('/api/add_purchase', data),
    getPurchaseHistory: (params) => apiClient.get('/api/purchase_history', { params }),
    getSuppliers: () => apiClient.get('/api/suppliers'),
  },

  // Material Writeoff Module
  writeoff: {
    getWriteoffReasons: () => apiClient.get('/api/writeoff_reasons'),
    getInventoryForWriteoff: (params) => apiClient.get('/api/inventory_for_writeoff', { params }),
    addWriteoff: (data) => apiClient.post('/api/add_writeoff', data),
    getWriteoffHistory: (params) => apiClient.get('/api/writeoff_history', { params }),
  },

  // Batch Production Module
  batch: {
    getSeedsForBatch: () => apiClient.get('/api/seeds_for_batch'),
    getCostElementsForBatch: () => apiClient.get('/api/cost_elements_for_batch'),
    getOilCakeRates: () => apiClient.get('/api/oil_cake_rates'),
    addBatch: (data) => apiClient.post('/api/add_batch', data),
    getBatchHistory: (params) => apiClient.get('/api/batch_history', { params }),
  },

  // Blending Module
  blending: {
    getOilTypes: () => apiClient.get('/api/oil_types_for_blending'),
    getBatchesForOilType: (oilType) => apiClient.get('/api/batches_for_oil_type', { params: { oil_type: oilType } }),
    createBlend: (data) => apiClient.post('/api/create_blend', data),
    getBlendHistory: (params) => apiClient.get('/api/blend_history', { params }),
  },

  // Material Sales Module
  sales: {
    getByproductTypes: () => apiClient.get('/api/byproduct_types'),
    getMaterialSalesInventory: (params) => apiClient.get('/api/material_sales_inventory', { params }),
    addMaterialSale: (data) => apiClient.post('/api/add_material_sale', data),
    getMaterialSalesHistory: (params) => apiClient.get('/api/material_sales_history', { params }),
    getCostReconciliationReport: () => apiClient.get('/api/cost_reconciliation_report'),
  },

  // Cost Management Module
  costManagement: {
    // Get all cost elements or by stage
    getCostElementsMaster: (params) => apiClient.get('/api/cost_elements/master', { params }),
    getCostElementsByStage: (stage) => apiClient.get('/api/cost_elements/by_stage', { params: { stage } }),
    
    // Time tracking with datetime inputs
    saveTimeTracking: (data) => apiClient.post('/api/cost_elements/time_tracking', data),
    
    // Cost calculations and validation
    calculateBatchCosts: (data) => apiClient.post('/api/cost_elements/calculate', data),
    saveBatchCosts: (data) => apiClient.post('/api/cost_elements/save_batch_costs', data),
    
    // Get batch cost summary with validation warnings
    getBatchCostSummary: (batchId) => apiClient.get(`/api/cost_elements/batch_summary/${batchId}`),
    
    // Validation report for management
    getValidationReport: (params) => apiClient.get('/api/cost_elements/validation_report', { params }),
    
    // Utility function for cost validation summary
    getCostValidationSummary: () => apiClient.get('/api/cost_validation_summary'),
  },

  // SKU Management Module - NEW SECTION WITH MRP & EXPIRY
  sku: {
    // ============================================
    // SKU MASTER MANAGEMENT WITH MRP & SHELF LIFE
    // ============================================
    
    // Get all SKUs with MRP and shelf life
    getMasterList: (params) => apiClient.get('/api/sku/master', { params }),
    
    // Get specific SKU details with MRP and shelf life
    getSKUDetails: (skuId) => apiClient.get(`/api/sku/master/${skuId}`),
    
    // Create new SKU with MRP and shelf life
    createSKU: (data) => apiClient.post('/api/sku/master', data),
    
    // Update SKU including MRP changes
    updateSKU: (skuId, data) => apiClient.put(`/api/sku/master/${skuId}`, data),
    
    // ============================================
    // MRP HISTORY MANAGEMENT
    // ============================================
    
    // Get MRP change history for a SKU
    getMRPHistory: (skuId) => apiClient.get(`/api/sku/mrp-history/${skuId}`),
    
    // Get current applicable MRP for a SKU
    getCurrentMRP: (skuId) => apiClient.get(`/api/sku/current-mrp/${skuId}`),
    
    // ============================================
    // PRODUCTION WITH MRP & EXPIRY
    // ============================================
    
    // Create SKU production with MRP capture and expiry calculation
    createProduction: (data) => apiClient.post('/api/sku/production', data),
    
    // Get production plan with availability check
    getProductionPlan: (data) => apiClient.post('/api/sku/production/plan', data),
    
    // Calculate oil allocation for production
    calculateOilAllocation: (data) => apiClient.post('/api/sku/production/allocate-oil', data),
    
    // ============================================
    // PRODUCTION HISTORY WITH EXPIRY
    // ============================================
    
    // Get production history with MRP and expiry details
    getProductionHistory: (params) => apiClient.get('/api/sku/production/history', { params }),
    
    // Get specific production details
    getProductionDetails: (productionId) => apiClient.get(`/api/sku/production/${productionId}`),
    
    // ============================================
    // EXPIRY MANAGEMENT
    // ============================================
    
    // Get items nearing expiry with configurable threshold
    getExpiryAlerts: (params) => apiClient.get('/api/sku/expiry-alerts', { params }),
    
    // Get summary of items by expiry status
    getExpirySummary: () => apiClient.get('/api/sku/expiry-summary'),
    
    // Get FEFO allocation for SKU sales
    getFEFOAllocation: (skuId, data) => apiClient.post(`/api/sku/fefo-allocation/${skuId}`, data),
    
    // ============================================
    // PRODUCTION SUMMARY REPORT
    // ============================================
    
    // Get printable production summary for regulatory filing
    getProductionSummaryReport: (productionId) => apiClient.get(`/api/sku/production-summary/${productionId}`),
    
    // ============================================
    // BOM CONFIGURATION (Existing endpoints from sku_management.py)
    // ============================================
    
    // Get current BOM for a SKU
    getBOM: (skuId) => apiClient.get(`/api/sku/bom/${skuId}`),
    
    // Create or update BOM
    createOrUpdateBOM: (data) => apiClient.post('/api/sku/bom', data),
    
    // Get BOM version history
    getBOMHistory: (skuId) => apiClient.get(`/api/sku/bom-history/${skuId}`),
    
    // ============================================
    // MATERIAL MANAGEMENT FOR SKU
    // ============================================
    
    // Get materials for BOM configuration
    getMaterialsForBOM: (params) => apiClient.get('/api/sku/materials', { params }),
    
    // ============================================
    // COST MANAGEMENT FOR SKU
    // ============================================
    
    // Get cost preview for production
    getCostPreview: (data) => apiClient.post('/api/sku/cost-preview', data),
    
    // ============================================
    // LEGACY ENDPOINTS (from existing sku_management.py)
    // ============================================
    
    // These endpoints exist in sku_management.py but may need updating
    saveSKUProduction: (data) => apiClient.post('/api/sku/production/save', data), // Legacy endpoint
  },

  // System endpoints
  system: {
    health: () => apiClient.get('/api/health'),
    systemInfo: () => apiClient.get('/api/system_info'),
  },
};

// ============================================
// UTILITY FUNCTIONS FOR SKU MODULE
// ============================================

// Date utilities for SKU module
export const skuDateUtils = {
  // Format date for API (convert to backend format)
  formatDateForAPI: (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  },

  // Parse date from API (integer to display format)
  parseDateFromAPI: (dateInt) => {
    if (!dateInt) return null;
    
    // Handle integer days since epoch
    if (typeof dateInt === 'number') {
      const epochDate = new Date('1970-01-01');
      epochDate.setDate(epochDate.getDate() + dateInt);
      return epochDate.toISOString().split('T')[0];
    }
    
    return dateInt;
  },

  // Format date for display (DD-MM-YYYY)
  formatDateForDisplay: (dateValue) => {
    if (!dateValue) return 'N/A';
    
    let date;
    
    // Handle integer days since epoch
    if (typeof dateValue === 'number') {
      const epochDate = new Date('1970-01-01');
      epochDate.setDate(epochDate.getDate() + dateValue);
      date = epochDate;
    } else {
      date = new Date(dateValue);
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  },

  // Calculate expiry date from production date and shelf life
  calculateExpiryDate: (productionDate, shelfLifeMonths) => {
    if (!productionDate || !shelfLifeMonths) return null;
    
    const prodDate = new Date(productionDate);
    const expiryDate = new Date(prodDate);
    expiryDate.setMonth(expiryDate.getMonth() + parseInt(shelfLifeMonths));
    
    return expiryDate.toISOString().split('T')[0];
  },

  // Calculate days to expiry
  calculateDaysToExpiry: (expiryDate) => {
    if (!expiryDate) return null;
    
    let expiry;
    
    // Handle integer days since epoch
    if (typeof expiryDate === 'number') {
      const epochDate = new Date('1970-01-01');
      epochDate.setDate(epochDate.getDate() + expiryDate);
      expiry = epochDate;
    } else {
      expiry = new Date(expiryDate);
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }
};

// Expiry status utilities
export const expiryUtils = {
  // Get expiry status based on days remaining
  getStatus: (daysToExpiry) => {
    if (daysToExpiry === null || daysToExpiry === undefined) return 'unknown';
    
    if (daysToExpiry <= 0) return 'expired';
    if (daysToExpiry <= 30) return 'critical';
    if (daysToExpiry <= 60) return 'warning';
    if (daysToExpiry <= 90) return 'caution';
    
    return 'normal';
  },

  // Get expiry status color
  getStatusColor: (status) => {
    const colors = {
      expired: '#FF0000',     // Red
      critical: '#FFA500',    // Orange
      warning: '#FFFF00',     // Yellow
      caution: '#FFFFE0',     // Light Yellow
      normal: '#00FF00',      // Green
      unknown: '#808080'      // Gray
    };
    
    return colors[status] || colors.unknown;
  },

  // Get status badge class
  getStatusBadgeClass: (status) => {
    return `expiry-status-${status}`;
  }
};

// Validation utilities
export const skuValidation = {
  // Validate shelf life
  validateShelfLife: (months) => {
    if (!months) return { isValid: false, error: 'Shelf life is required' };
    
    const monthsNum = parseInt(months);
    
    if (isNaN(monthsNum)) {
      return { isValid: false, error: 'Shelf life must be a number' };
    }
    
    if (monthsNum < 1) {
      return { isValid: false, error: 'Shelf life must be at least 1 month' };
    }
    
    if (monthsNum > 60) {
      return { isValid: false, error: 'Shelf life cannot exceed 60 months' };
    }
    
    return { isValid: true, error: null };
  },

  // Validate MRP
  validateMRP: (amount, maxAmount = 10000) => {
    if (!amount && amount !== 0) {
      return { isValid: false, error: 'MRP is required' };
    }
    
    const mrp = parseFloat(amount);
    
    if (isNaN(mrp)) {
      return { isValid: false, error: 'MRP must be a number' };
    }
    
    if (mrp <= 0) {
      return { isValid: false, error: 'MRP must be greater than 0' };
    }
    
    if (mrp > maxAmount) {
      return { isValid: false, error: `MRP cannot exceed ₹${maxAmount}` };
    }
    
    return { isValid: true, error: null };
  }
};

// Format utilities
export const formatUtils = {
  // Format currency
  currency: (amount) => {
    if (amount === null || amount === undefined) return '₹0.00';
    return `₹${parseFloat(amount).toFixed(2)}`;
  },

  // Format percentage
  percentage: (value, decimals = 1) => {
    if (value === null || value === undefined) return '0%';
    return `${parseFloat(value).toFixed(decimals)}%`;
  },

  // Format quantity
  quantity: (value, unit = 'kg', decimals = 2) => {
    if (value === null || value === undefined) return `0 ${unit}`;
    return `${parseFloat(value).toFixed(decimals)} ${unit}`;
  }
};

export default api;
