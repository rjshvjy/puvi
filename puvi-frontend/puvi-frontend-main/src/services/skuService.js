// File Path: puvi-frontend/puvi-frontend-main/src/services/skuService.js
// SKU Service - Comprehensive API service for SKU Management with MRP and Expiry
// Connects to backend v2.0 with enhanced endpoints

const API_URL = process.env.REACT_APP_API_URL || 'https://puvi-backend.onrender.com';

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

const skuService = {
  // ============================================
  // SKU MASTER MANAGEMENT WITH MRP & SHELF LIFE
  // ============================================
  
  // Get all SKUs with MRP and shelf life
  getSKUMasterList: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.oil_type) params.append('oil_type', filters.oil_type);
    if (filters.package_size) params.append('package_size', filters.package_size);
    if (filters.is_active !== undefined) params.append('is_active', filters.is_active);
    
    const queryString = params.toString();
    const url = `/api/sku/master${queryString ? `?${queryString}` : ''}`;
    
    return apiCall(url);
  },

  // Get specific SKU details with MRP and shelf life
  getSKUDetails: async (skuId) => {
    return apiCall(`/api/sku/master/${skuId}`);
  },

  // Create new SKU with MRP and shelf life
  createSKU: async (skuData) => {
    return apiCall('/api/sku/master', {
      method: 'POST',
      body: JSON.stringify(skuData)
    });
  },

  // Update SKU including MRP changes
  updateSKU: async (skuId, skuData) => {
    return apiCall(`/api/sku/master/${skuId}`, {
      method: 'PUT',
      body: JSON.stringify(skuData)
    });
  },

  // ============================================
  // MRP HISTORY MANAGEMENT
  // ============================================
  
  // Get MRP change history for a SKU
  getMRPHistory: async (skuId) => {
    return apiCall(`/api/sku/mrp-history/${skuId}`);
  },

  // Get current applicable MRP for a SKU
  getCurrentMRP: async (skuId) => {
    return apiCall(`/api/sku/current-mrp/${skuId}`);
  },

  // ============================================
  // PRODUCTION WITH MRP & EXPIRY
  // ============================================
  
  // Create SKU production with MRP capture and expiry calculation
  createProduction: async (productionData) => {
    return apiCall('/api/sku/production', {
      method: 'POST',
      body: JSON.stringify(productionData)
    });
  },

  // Get production plan with availability check
  getProductionPlan: async (planData) => {
    return apiCall('/api/sku/production/plan', {
      method: 'POST',
      body: JSON.stringify(planData)
    });
  },

  // Calculate oil allocation for production
  calculateOilAllocation: async (allocationData) => {
    return apiCall('/api/sku/production/allocate-oil', {
      method: 'POST',
      body: JSON.stringify(allocationData)
    });
  },

  // ============================================
  // PRODUCTION HISTORY WITH EXPIRY
  // ============================================
  
  // Get production history with MRP and expiry details
  getProductionHistory: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.sku_id) params.append('sku_id', filters.sku_id);
    if (filters.oil_type) params.append('oil_type', filters.oil_type);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.expiry_status) params.append('expiry_status', filters.expiry_status);
    
    const queryString = params.toString();
    const url = `/api/sku/production/history${queryString ? `?${queryString}` : ''}`;
    
    return apiCall(url);
  },

  // Get specific production details
  getProductionDetails: async (productionId) => {
    return apiCall(`/api/sku/production/${productionId}`);
  },

  // ============================================
  // EXPIRY MANAGEMENT
  // ============================================
  
  // Get items nearing expiry with configurable threshold
  getExpiryAlerts: async (daysThreshold = 30) => {
    return apiCall(`/api/sku/expiry-alerts?days=${daysThreshold}`);
  },

  // Get summary of items by expiry status
  getExpirySummary: async () => {
    return apiCall('/api/sku/expiry-summary');
  },

  // Get FEFO allocation for SKU sales
  getFEFOAllocation: async (skuId, quantityNeeded) => {
    return apiCall(`/api/sku/fefo-allocation/${skuId}`, {
      method: 'POST',
      body: JSON.stringify({ quantity_needed: quantityNeeded })
    });
  },

  // ============================================
  // PRODUCTION SUMMARY REPORT
  // ============================================
  
  // Get printable production summary for regulatory filing
  getProductionSummaryReport: async (productionId) => {
    return apiCall(`/api/sku/production-summary/${productionId}`);
  },

  // ============================================
  // BOM CONFIGURATION (Existing endpoints)
  // ============================================
  
  // Get current BOM for a SKU
  getSKUBOM: async (skuId) => {
    return apiCall(`/api/sku/bom/${skuId}`);
  },

  // Create or update BOM
  createOrUpdateBOM: async (bomData) => {
    return apiCall('/api/sku/bom', {
      method: 'POST',
      body: JSON.stringify(bomData)
    });
  },

  // Get BOM version history
  getBOMHistory: async (skuId) => {
    return apiCall(`/api/sku/bom-history/${skuId}`);
  },

  // ============================================
  // MATERIAL MANAGEMENT
  // ============================================
  
  // Get materials for BOM configuration
  getMaterialsForBOM: async (category = '', search = '') => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    
    const queryString = params.toString();
    const url = `/api/sku/materials${queryString ? `?${queryString}` : ''}`;
    
    return apiCall(url);
  },

  // ============================================
  // COST MANAGEMENT
  // ============================================
  
  // Get cost preview for production
  getCostPreview: async (previewData) => {
    return apiCall('/api/sku/cost-preview', {
      method: 'POST',
      body: JSON.stringify(previewData)
    });
  },

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  
  // Format date for API (convert to backend format)
  formatDateForAPI: (dateString) => {
    if (!dateString) return null;
    // Convert date string to YYYY-MM-DD format if needed
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

  // Get expiry status based on days remaining
  getExpiryStatus: (daysToExpiry) => {
    if (daysToExpiry === null || daysToExpiry === undefined) return 'unknown';
    
    if (daysToExpiry <= 0) return 'expired';
    if (daysToExpiry <= 30) return 'critical';
    if (daysToExpiry <= 60) return 'warning';
    if (daysToExpiry <= 90) return 'caution';
    
    return 'normal';
  },

  // Get expiry status color
  getExpiryStatusColor: (status) => {
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

  // Format currency
  formatCurrency: (amount) => {
    if (amount === null || amount === undefined) return '₹0.00';
    return `₹${parseFloat(amount).toFixed(2)}`;
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

  // Calculate expiry date from production date and shelf life
  calculateExpiryDate: (productionDate, shelfLifeMonths) => {
    if (!productionDate || !shelfLifeMonths) return null;
    
    const prodDate = new Date(productionDate);
    const expiryDate = new Date(prodDate);
    expiryDate.setMonth(expiryDate.getMonth() + parseInt(shelfLifeMonths));
    
    return expiryDate.toISOString().split('T')[0];
  }
};

export default skuService;
