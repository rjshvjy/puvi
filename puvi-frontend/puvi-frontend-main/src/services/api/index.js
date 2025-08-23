// File Path: puvi-frontend/puvi-frontend-main/src/services/api/index.js
// Consolidated API Service for PUVI Oil Manufacturing System
// Version: 2.2 - Complete with Material Sales and Material Writeoff modules
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
      // Handle both 'error' (string) and 'errors' (object) formats
      let errorMessage = '';
      
      if (data.error) {
        // Backend sends single error string
        errorMessage = data.error;
      } else if (data.errors) {
        // Backend sends validation errors as object
        if (typeof data.errors === 'object') {
          // Convert errors object to readable string
          const errorMessages = Object.entries(data.errors)
            .map(([field, message]) => `${field}: ${message}`)
            .join('; ');
          errorMessage = errorMessages;
        } else {
          errorMessage = data.errors;
        }
      } else {
        errorMessage = `API call failed: ${response.status}`;
      }
      
      throw new Error(errorMessage);
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
    
    // Additional function for components
    getSKUs: async (filters) => api.sku.getMasterList(filters),

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

    // Get items nearing expiry
    getExpiryAlerts: async (params = {}) => {
      const queryParams = new URLSearchParams();
      const days = params.days || params.threshold_days || 30;
      queryParams.append('days', days);
      return apiCall(`/api/sku/expiry-alerts?${queryParams.toString()}`);
    },

    // Get expiry summary
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
  // OTHER MODULES
  // ============================================
  
  // Purchase module - FIXED to support supplier_id filtering
  purchase: {
    getMaterials: async (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.supplier_id) params.append('supplier_id', filters.supplier_id); // ✅ FIXED: Added supplier_id support
      const queryString = params.toString();
      return apiCall(`/api/materials${queryString ? `?${queryString}` : ''}`);
    },
    
    getSuppliers: async () => {
      return apiCall('/api/suppliers');
    },
    
    create: async (data) => {
      return post('/api/add_purchase', data);
    },
    
    getHistory: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append('limit', params.limit);
      const queryString = queryParams.toString();
      return apiCall(`/api/purchase_history${queryString ? `?${queryString}` : ''}`);
    }
  },

  // Batch module - COMPLETE FIX WITH ALL METHODS
  batch: {
    // Get available oil types
    getOilTypes: async () => apiCall('/api/oil_types'),
    
    // Get available seeds for batch production
    getSeedsForBatch: async () => apiCall('/api/seeds_for_batch'),
    
    // Get cost elements specific to batch (from batch module, not cost management)
    getCostElementsForBatch: async (stage = null) => {
      const params = stage ? `?stage=${stage}` : '';
      return apiCall(`/api/cost_elements_for_batch${params}`);
    },
    
    // Get oil cake rates
    getOilCakeRates: async () => apiCall('/api/oil_cake_rates'),
    
    // Create new batch
    addBatch: async (batchData) => {
      return post('/api/add_batch', batchData);
    },
    
    // Get batch production history - THIS WAS MISSING!
    getBatchHistory: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.oil_type) queryParams.append('oil_type', params.oil_type);
      if (params.start_date) queryParams.append('start_date', params.start_date);
      if (params.end_date) queryParams.append('end_date', params.end_date);
      const queryString = queryParams.toString();
      return apiCall(`/api/batch_history${queryString ? `?${queryString}` : ''}`);
    },
    
    // Additional methods that might be needed
    getBatchById: async (batchId) => {
      return apiCall(`/api/batch/${batchId}`);
    },
    
    updateBatch: async (batchId, data) => {
      return put(`/api/batch/${batchId}`, data);
    }
  },
  
  // Cost Management module - COMPLETE FIX WITH ALL ENDPOINTS
  costManagement: {
    // Master data endpoint - FIXED to use correct endpoint
    getCostElementsMaster: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.applicable_to) queryParams.append('applicable_to', params.applicable_to);
      const queryString = queryParams.toString();
      return apiCall(`/api/cost_elements/master${queryString ? `?${queryString}` : ''}`);
    },
    
    // Get cost elements by stage (drying, crushing, filtering, batch, sales)
    getCostElementsByStage: async (stage) => {
      return apiCall(`/api/cost_elements/by_stage?stage=${stage}`);
    },
    
    // Get cost elements by activity and module
    getCostElementsByActivity: async (activity, module, includeCommon = true) => {
      const params = new URLSearchParams();
      params.append('activity', activity);
      params.append('module', module);
      params.append('include_common', includeCommon);
      return apiCall(`/api/cost_elements/by_activity?${params.toString()}`);
    },
    
    // Get validation report for batches with missing costs
    getValidationReport: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.days) queryParams.append('days', params.days);
      const queryString = queryParams.toString();
      return apiCall(`/api/cost_elements/validation_report${queryString ? `?${queryString}` : ''}`);
    },
    
    // Get complete cost summary for a batch
    getBatchSummary: async (batchId) => {
      return apiCall(`/api/cost_elements/batch_summary/${batchId}`);
    },
    
    // Save time tracking data
    saveTimeTracking: async (data) => {
      return post('/api/cost_elements/time_tracking', data);
    },
    
    // Calculate all costs for a batch
    calculateBatchCosts: async (data) => {
      return post('/api/cost_elements/calculate', data);
    },
    
    // Save extended costs for a batch
    saveBatchCosts: async (data) => {
      return post('/api/cost_elements/save_batch_costs', data);
    },
    
    // One-time endpoint to populate activity field
    populateActivities: async () => {
      return post('/api/cost_elements/populate_activities', {});
    },
    
    // Legacy naming support for backward compatibility
    getCostElementsForBatch: async (params) => {
      // This redirects to the batch module's endpoint for backward compatibility
      return apiCall('/api/cost_elements_for_batch');
    }
  },

  // Configuration Management module - FIXED: Added all missing methods
  config: {
    getConfig: async () => {
      return apiCall('/api/config');
    },
    updateConfig: async (config) => {
      return post('/api/config', config);
    },
    getSystemSettings: async () => {
      return apiCall('/api/config/system');
    },
    // NEW METHODS ADDED TO FIX THE ERROR:
    getPackageSizes: async () => {
      return apiCall('/api/config/package_sizes');
    },
    getOilTypes: async () => {
      return apiCall('/api/config/oil_types');
    },
    getGSTRates: async () => {
      return apiCall('/api/config/gst_rates');
    },
    getMaterialCategories: async () => {
      return apiCall('/api/config/material_categories');
    },
    getWriteoffReasons: async () => {
      return apiCall('/api/config/writeoff_reasons');
    },
    getCostElements: async () => {
      return apiCall('/api/config/cost_elements');
    },
    getSuppliers: async () => {
      return apiCall('/api/config/suppliers');
    },
    getLaborRates: async () => {
      return apiCall('/api/config/labor_rates');
    },
    getBOMCategories: async () => {
      return apiCall('/api/config/bom_categories');
    },
    getBOMMaterials: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.bom_category) queryParams.append('bom_category', params.bom_category);
      const queryString = queryParams.toString();
      return apiCall(`/api/config/bom_materials${queryString ? `?${queryString}` : ''}`);
    }
  },

  // Blending module - FIXED: Updated to use correct endpoint format
  blending: {
    getBatchesForOilType: async (oilType) => {
      try {
        // FIXED: Use query parameter format to match backend
        return await apiCall(`/api/batches_for_oil_type?oil_type=${encodeURIComponent(oilType)}`);
      } catch (error) {
        console.error('Error fetching batches:', error);
        // Return empty result on error
        return {
          success: true,
          batches: [],
          grouped_batches: {
            extraction: [],
            blended: [],
            outsourced: []
          },
          total_count: 0,
          message: 'No batches available for ' + oilType
        };
      }
    },
    getOilTypesForBlending: async () => {
      return apiCall('/api/oil_types_for_blending');
    },
    createBlend: async (blendData) => {
      return post('/api/create_blend', blendData);
    },
    getBlendHistory: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.oil_type) queryParams.append('oil_type', params.oil_type);
      if (params.start_date) queryParams.append('start_date', params.start_date);
      if (params.end_date) queryParams.append('end_date', params.end_date);
      const queryString = queryParams.toString();
      return apiCall(`/api/blend_history${queryString ? `?${queryString}` : ''}`);
    }
  },

  // ============================================
  // MATERIAL SALES MODULE - NEW ADDITION
  // ============================================
  sales: {
    // Get byproduct types (oil cake, sludge, gunny bags)
    getByproductTypes: async () => {
      return apiCall('/api/byproduct_types');
    },
    
    // Get available inventory for material sales
    getMaterialSalesInventory: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.type) queryParams.append('type', params.type);
      if (params.oil_type) queryParams.append('oil_type', params.oil_type);
      const queryString = queryParams.toString();
      return apiCall(`/api/material_sales_inventory${queryString ? `?${queryString}` : ''}`);
    },
    
    // Get material sales history with filters
    getMaterialSalesHistory: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.type) queryParams.append('type', params.type);
      if (params.start_date) queryParams.append('start_date', params.start_date);
      if (params.end_date) queryParams.append('end_date', params.end_date);
      const queryString = queryParams.toString();
      return apiCall(`/api/material_sales_history${queryString ? `?${queryString}` : ''}`);
    },
    
    // Get cost reconciliation report
    getCostReconciliationReport: async () => {
      return apiCall('/api/cost_reconciliation_report');
    },
    
    // Create a new material sale
    addMaterialSale: async (saleData) => {
      return post('/api/add_material_sale', saleData);
    },
    
    // Legacy naming support
    createSale: async (data) => api.sales.addMaterialSale(data)
  },

  // ============================================
  // MATERIAL WRITEOFF MODULE
  // ============================================
  writeoff: {
    // Get writeoff reason codes
    getReasons: async () => {
      return apiCall('/api/writeoff_reasons');
    },
    
    // Get materials with current inventory for writeoff selection
    getMaterials: async (category = null) => {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      const queryString = params.toString();
      return apiCall(`/api/inventory_for_writeoff${queryString ? `?${queryString}` : ''}`);
    },
    
    // Record a material writeoff
    recordWriteoff: async (writeoffData) => {
      return post('/api/add_writeoff', writeoffData);
    },
    
    // Get writeoff history with filters
    getHistory: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.material_id) queryParams.append('material_id', params.material_id);
      if (params.reason_code) queryParams.append('reason_code', params.reason_code);
      if (params.start_date) queryParams.append('start_date', params.start_date);
      if (params.end_date) queryParams.append('end_date', params.end_date);
      const queryString = queryParams.toString();
      return apiCall(`/api/writeoff_history${queryString ? `?${queryString}` : ''}`);
    }
  },

  // Masters module  
  masters: {
    // Existing methods
    getSuppliers: async () => apiCall('/api/masters/suppliers'),
    getMaterials: async () => apiCall('/api/masters/materials'),
    getCategories: async () => apiCall('/api/categories'),
    getSubcategories: async (categoryId) => apiCall(`/api/subcategories?category_id=${categoryId}`),
    
    // NEW: Package Sizes Management
    getPackageSizes: async (includeInactive = false) => {
      const params = includeInactive ? '?include_inactive=true' : '';
      return apiCall(`/api/masters/package_sizes${params}`);
    },
    
    getPackageSize: async (sizeId) => {
      return apiCall(`/api/masters/package_sizes/${sizeId}`);
    },
    
    createPackageSize: async (data) => {
      return apiCall('/api/masters/package_sizes', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    
    updatePackageSize: async (sizeId, data) => {
      return apiCall(`/api/masters/package_sizes/${sizeId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    
    deletePackageSize: async (sizeId) => {
      return apiCall(`/api/masters/package_sizes/${sizeId}`, {
        method: 'DELETE'
      });
    },
    
    getPackageSizesDropdown: async () => {
      return apiCall('/api/masters/package_sizes/dropdown');
    },
    
    validatePackageSize: async (sizeCode, excludeId = null) => {
      return apiCall('/api/masters/package_sizes/validate', {
        method: 'POST',
        body: JSON.stringify({ size_code: sizeCode, exclude_id: excludeId })
      });
    },
    
    bulkUpdatePackageSizes: async (updates) => {
      return apiCall('/api/masters/package_sizes/bulk-update', {
        method: 'POST',
        body: JSON.stringify({ updates })
      });
    }
  },

  // Inventory module
  inventory: {
    getStock: async () => apiCall('/api/inventory/stock'),
    updateStock: async (data) => post('/api/inventory/update', data)
  },

  // Reports module
  reports: {
    getProductionReport: async (params) => apiCall('/api/reports/production', params),
    getCostReport: async (params) => apiCall('/api/reports/cost', params)
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

// Export specific module APIs
export const skuAPI = api.sku;
export const configAPI = api.config;
export const batchAPI = api.batch;
export const mastersAPI = api.masters;
export const inventoryAPI = api.inventory;
export const reportsAPI = api.reports;
export const purchaseAPI = api.purchase;
export const blendingAPI = api.blending;
export const salesAPI = api.sales;  // NEW EXPORT
export const writeoffAPI = api.writeoff;  // NEW EXPORT

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
