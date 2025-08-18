// File Path: puvi-frontend/puvi-frontend-main/src/services/api/index.js
// Consolidated API Service for PUVI Oil Manufacturing System
// Version: 2.0 - Complete SKU module integration with MRP & Expiry
// This file consolidates all API services and utilities

const API_URL = process.env.REACT_APP_API_URL || 'https://puvi-backend.onrender.com';

// ============================================
// BASE API CONFIGURATION
// ============================================

// Helper function for API calls
const apiCall = async (url, options = {}) => {
  try {
    const response = await fetch(`${API_URL}${url}`, {
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

// Helper methods for different HTTP verbs
const get = (url, params) => {
  const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiCall(url + queryString);
};

const post = (url, data) => apiCall(url, { method: 'POST', body: JSON.stringify(data) });
const put = (url, data) => apiCall(url, { method: 'PUT', body: JSON.stringify(data) });
const del = (url) => apiCall(url, { method: 'DELETE' });

// ============================================
// MAIN API OBJECT
// ============================================

const api = {
  // ============================================
  // SKU MODULE - Complete with MRP & Expiry
  // ============================================
  sku: {
    // ---------- SKU Master CRUD (from sku_management.py) ----------
    
    // Get list of all SKUs with filters and pagination
    getMasterList: async (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.oil_type) params.append('oil_type', filters.oil_type);
      if (filters.package_size) params.append('package_size', filters.package_size);
      if (filters.is_active !== undefined) params.append('is_active', filters.is_active);
      if (filters.page) params.append('page', filters.page);
      if (filters.per_page) params.append('per_page', filters.per_page);
      if (filters.search) params.append('search', filters.search);
      
      const queryString = params.toString();
      return apiCall(`/api/sku/master${queryString ? `?${queryString}` : ''}`);
    },

    // Get single SKU details
    getDetails: async (skuId) => {
      return apiCall(`/api/sku/master/${skuId}`);
    },

    // Create new SKU with MRP and shelf life
    create: async (skuData) => {
      return post('/api/sku/master', skuData);
    },

    // Update existing SKU
    update: async (skuId, skuData) => {
      return put(`/api/sku/master/${skuId}`, skuData);
    },

    // Delete/Deactivate SKU
    delete: async (skuId) => {
      return del(`/api/sku/master/${skuId}`);
    },

    // Reactivate deactivated SKU
    activate: async (skuId) => {
      return post(`/api/sku/master/activate/${skuId}`, {});
    },

    // Bulk update SKUs (e.g., MRP update)
    bulkUpdate: async (updates) => {
      return post('/api/sku/master/bulk-update', updates);
    },

    // Export SKUs to CSV format
    export: async (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.is_active !== undefined) params.append('is_active', filters.is_active);
      const queryString = params.toString();
      return apiCall(`/api/sku/master/export${queryString ? `?${queryString}` : ''}`);
    },

    // Legacy naming support (maps to new names)
    getSKUDetails: async (skuId) => api.sku.getDetails(skuId),
    getSKUMasterList: async (filters) => api.sku.getMasterList(filters),
    createSKU: async (data) => api.sku.create(data),
    updateSKU: async (skuId, data) => api.sku.update(skuId, data),

    // ---------- BOM Configuration (from sku_management.py) ----------
    
    // Get current BOM for a SKU
    getBOM: async (skuId) => {
      return apiCall(`/api/sku/bom/${skuId}`);
    },

    // Create or update BOM
    saveBOM: async (bomData) => {
      return post('/api/sku/bom', bomData);
    },

    // Get BOM version history
    getBOMHistory: async (skuId) => {
      return apiCall(`/api/sku/bom-history/${skuId}`);
    },

    // Get materials for BOM configuration
    getMaterialsForBOM: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.category) queryParams.append('category', params.category);
      if (params.search) queryParams.append('search', params.search);
      
      const queryString = queryParams.toString();
      return apiCall(`/api/sku/materials${queryString ? `?${queryString}` : ''}`);
    },

    // Get cost preview for production
    getCostPreview: async (previewData) => {
      return post('/api/sku/cost-preview', previewData);
    },

    // Legacy naming support
    getSKUBOM: async (skuId) => api.sku.getBOM(skuId),
    createOrUpdateBOM: async (data) => api.sku.saveBOM(data),

    // ---------- MRP Management (from sku_production.py) ----------
    
    // Get MRP change history for a SKU
    getMRPHistory: async (skuId) => {
      return apiCall(`/api/sku/mrp-history/${skuId}`);
    },

    // Get current applicable MRP for a SKU
    getCurrentMRP: async (skuId) => {
      return apiCall(`/api/sku/current-mrp/${skuId}`);
    },

    // ---------- Production Operations (from sku_production.py) ----------
    
    // Create SKU production with MRP capture and expiry calculation
    createProduction: async (productionData) => {
      // Map oil allocations to correct format if needed
      if (productionData.oil_allocations) {
        productionData.oil_allocations = productionData.oil_allocations.map(alloc => ({
          source_type: alloc.source_type,
          source_id: alloc.source_id,
          traceable_code: alloc.traceable_code || alloc.source_traceable_code,
          quantity_allocated: alloc.quantity_allocated || alloc.quantity,
          oil_cost_per_kg: alloc.oil_cost_per_kg,
          allocation_cost: alloc.allocation_cost
        }));
      }
      return post('/api/sku/production', productionData);
    },

    // Get production history with filters
    getProductionHistory: async (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.sku_id) params.append('sku_id', filters.sku_id);
      if (filters.oil_type) params.append('oil_type', filters.oil_type);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.expiry_status) params.append('expiry_status', filters.expiry_status);
      if (filters.limit) params.append('limit', filters.limit);
      
      const queryString = params.toString();
      return apiCall(`/api/sku/production/history${queryString ? `?${queryString}` : ''}`);
    },

    // Get production plan with availability check
    getProductionPlan: async (planData) => {
      return post('/api/sku/production/plan', planData);
    },

    // Allocate oil for production using FIFO
    allocateOil: async (allocationData) => {
      return post('/api/sku/production/allocate-oil', allocationData);
    },

    // Get printable production summary report
    getProductionSummary: async (productionId) => {
      return apiCall(`/api/sku/production-summary/${productionId}`);
    },

    // Legacy naming support
    calculateOilAllocation: async (data) => api.sku.allocateOil(data),
    getProductionSummaryReport: async (id) => api.sku.getProductionSummary(id),
    getProductionDetails: async (id) => api.sku.getProductionSummary(id),

    // ---------- Expiry Management (from sku_production.py) ----------
    
    // Get items nearing expiry with configurable threshold
    getExpiryAlerts: async (params = {}) => {
      const queryParams = new URLSearchParams();
      const days = params.days || params.threshold_days || 30;
      queryParams.append('days', days);
      
      return apiCall(`/api/sku/expiry-alerts?${queryParams.toString()}`);
    },

    // Get summary of items by expiry status
    getExpirySummary: async () => {
      return apiCall('/api/sku/expiry-summary');
    },

    // Get FEFO (First Expiry First Out) allocation for SKU sales
    getFEFOAllocation: async (skuId, quantityNeeded) => {
      return post(`/api/sku/fefo-allocation/${skuId}`, { 
        quantity_needed: quantityNeeded 
      });
    }
  },

  // ============================================
  // OTHER MODULES (Placeholders for existing modules)
  // ============================================
  
  // Purchase module
  purchase: {
    getMaterials: async (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      const queryString = params.toString();
      return apiCall(`/api/materials${queryString ? `?${queryString}` : ''}`);
    }
  },

  // Cost Management module
  costManagement: {
    getCostElementsMaster: async () => {
      return apiCall('/api/cost-elements/master');
    }
  },

  // Blending module (for oil sources)
  blending: {
    getBatchesForOilType: async (oilType) => {
      return apiCall(`/api/blending/batches/${oilType}`);
    }
  }
};

// ============================================
// DATE UTILITIES
// ============================================

export const skuDateUtils = {
  // Format date for API (convert to backend format)
  formatForAPI: (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  },

  // Parse date from API (integer to display format)
  parseFromAPI: (dateInt) => {
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
  formatForDisplay: (dateValue) => {
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

  // Alias for backward compatibility
  formatDateForDisplay: function(dateValue) {
    return this.formatForDisplay(dateValue);
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
  },

  // Calculate expiry date from production date and shelf life
  calculateExpiryDate: (productionDate, shelfLifeMonths) => {
    if (!productionDate || !shelfLifeMonths) return null;
    
    const prodDate = new Date(productionDate);
    const expiryDate = new Date(prodDate);
    expiryDate.setMonth(expiryDate.getMonth() + parseInt(shelfLifeMonths));
    
    return expiryDate.toISOString().split('T')[0];
  }
};

// ============================================
// EXPIRY UTILITIES
// ============================================

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

  // Legacy naming support
  getExpiryStatus: function(days) { return this.getStatus(days); },
  getExpiryStatusColor: function(status) { return this.getStatusColor(status); }
};

// ============================================
// FORMAT UTILITIES
// ============================================

export const formatUtils = {
  // Format currency
  currency: (amount) => {
    if (amount === null || amount === undefined) return '₹0.00';
    return `₹${parseFloat(amount).toFixed(2)}`;
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
  },

  // Generate production code
  generateProductionCode: (skuCode, productionDate, shiftNumber = 1) => {
    const date = new Date(productionDate);
    const dateStr = `${String(date.getDate()).padStart(2, '0')}${String(date.getMonth() + 1).padStart(2, '0')}${date.getFullYear()}`;
    return `${skuCode}-${dateStr}-${shiftNumber}`;
  },

  // Legacy naming support
  formatCurrency: function(amount) { return this.currency(amount); }
};

// ============================================
// VALIDATION UTILITIES
// ============================================

export const validationUtils = {
  // Validate required fields
  validateRequiredFields: (data, requiredFields) => {
    const missingFields = [];
    
    for (const field of requiredFields) {
      if (!data[field] && data[field] !== 0) {
        missingFields.push(field);
      }
    }
    
    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  },

  // Safe decimal conversion
  safeDecimal: (value, defaultValue = 0) => {
    const num = parseFloat(value);
    return isNaN(num) ? defaultValue : num;
  },

  // Safe integer conversion
  safeInt: (value, defaultValue = 0) => {
    const num = parseInt(value);
    return isNaN(num) ? defaultValue : num;
  }
};

// ============================================
// BACKWARD COMPATIBILITY EXPORTS
// ============================================

// Export the entire SKU API as skuAPI for backward compatibility
export const skuAPI = api.sku;

// Export the default skuService object for legacy imports
export const skuService = {
  ...api.sku,
  // Add utility functions that were in skuService
  formatDateForAPI: skuDateUtils.formatForAPI,
  parseDateFromAPI: skuDateUtils.parseFromAPI,
  formatDateForDisplay: skuDateUtils.formatForDisplay,
  calculateDaysToExpiry: skuDateUtils.calculateDaysToExpiry,
  calculateExpiryDate: skuDateUtils.calculateExpiryDate,
  getExpiryStatus: expiryUtils.getStatus,
  getExpiryStatusColor: expiryUtils.getStatusColor,
  validateShelfLife: expiryUtils.validateShelfLife,
  formatCurrency: formatUtils.currency,
  validateMRP: formatUtils.validateMRP,
  generateProductionCode: formatUtils.generateProductionCode
};

// ============================================
// DEFAULT EXPORT
// ============================================

export default api;
