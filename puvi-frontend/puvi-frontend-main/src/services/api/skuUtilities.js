// File Path: puvi-frontend/puvi-frontend-main/src/services/api/skuUtilities.js
// SKU Date and Utility Functions

// SKU Date Utilities
export const skuDateUtils = {
  // Convert date to backend integer format (days since epoch)
  dateToInteger: (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const epoch = new Date('1970-01-01');
    const diffTime = date - epoch;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  },

  // Convert backend integer to date string
  integerToDate: (daysSinceEpoch) => {
    if (!daysSinceEpoch && daysSinceEpoch !== 0) return null;
    const epoch = new Date('1970-01-01');
    epoch.setDate(epoch.getDate() + daysSinceEpoch);
    return epoch.toISOString().split('T')[0];
  },

  // Calculate days to expiry from expiry date
  calculateDaysToExpiry: (expiryDate) => {
    if (!expiryDate) return null;
    
    let expiry;
    // Handle both date string and integer format
    if (typeof expiryDate === 'number') {
      const epoch = new Date('1970-01-01');
      epoch.setDate(epoch.getDate() + expiryDate);
      expiry = epoch;
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
    expiryDate.setMonth(expiryDate.getMonth() + shelfLifeMonths);
    
    return expiryDate.toISOString().split('T')[0];
  },

  // Format date for display (DD-MM-YYYY)
  formatForDisplay: (dateValue) => {
    if (!dateValue) return 'N/A';
    
    let date;
    
    // Handle integer days since epoch
    if (typeof dateValue === 'number') {
      const epoch = new Date('1970-01-01');
      epoch.setDate(epoch.getDate() + dateValue);
      date = epoch;
    } else {
      date = new Date(dateValue);
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  },

  // Format date for API (YYYY-MM-DD)
  formatForAPI: (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  }
};

// Expiry Status Utilities
export const expiryUtils = {
  // Get expiry status based on days to expiry
  getStatus: (daysToExpiry) => {
    if (daysToExpiry === null || daysToExpiry === undefined) return 'unknown';
    if (daysToExpiry < 0) return 'expired';
    if (daysToExpiry <= 7) return 'critical';
    if (daysToExpiry <= 30) return 'warning';
    if (daysToExpiry <= 90) return 'caution';
    return 'normal';
  },

  // Get status color for UI
  getStatusColor: (status) => {
    const colors = {
      expired: '#dc2626',    // red
      critical: '#dc2626',   // red
      warning: '#f59e0b',    // orange
      caution: '#eab308',    // yellow
      normal: '#16a34a',     // green
      unknown: '#6b7280'     // gray
    };
    return colors[status] || colors.unknown;
  },

  // Get status label
  getStatusLabel: (status) => {
    const labels = {
      expired: 'Expired',
      critical: 'Critical - Expires Soon',
      warning: 'Warning - Near Expiry',
      caution: 'Caution',
      normal: 'OK',
      unknown: 'Unknown'
    };
    return labels[status] || labels.unknown;
  },

  // Format expiry message
  formatExpiryMessage: (daysToExpiry) => {
    if (daysToExpiry === null || daysToExpiry === undefined) return 'Expiry date unknown';
    if (daysToExpiry < 0) return `Expired ${Math.abs(daysToExpiry)} days ago`;
    if (daysToExpiry === 0) return 'Expires today';
    if (daysToExpiry === 1) return 'Expires tomorrow';
    if (daysToExpiry <= 7) return `Expires in ${daysToExpiry} days`;
    if (daysToExpiry <= 30) return `Expires in ${daysToExpiry} days`;
    
    const weeks = Math.floor(daysToExpiry / 7);
    if (weeks <= 12) return `Expires in ${weeks} week${weeks > 1 ? 's' : ''}`;
    
    const months = Math.floor(daysToExpiry / 30);
    return `Expires in ${months} month${months > 1 ? 's' : ''}`;
  }
};

// Format Utilities
export const formatUtils = {
  // Format currency
  currency: (amount) => {
    if (amount === null || amount === undefined) return '₹0.00';
    return `₹${parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  },

  // Format quantity with unit
  quantity: (value, unit = 'units') => {
    if (value === null || value === undefined) return '0 ' + unit;
    return `${parseFloat(value).toFixed(2)} ${unit}`;
  },

  // Format percentage
  percentage: (value, decimals = 2) => {
    if (value === null || value === undefined) return '0%';
    return `${parseFloat(value).toFixed(decimals)}%`;
  },

  // Format traceable code for display
  traceableCode: (code) => {
    if (!code) return 'N/A';
    // Format as XXX-XXX-XXXX
    if (code.length === 10 && !code.includes('-')) {
      return `${code.slice(0, 3)}-${code.slice(3, 6)}-${code.slice(6)}`;
    }
    return code;
  },

  // Format operator name
  operatorName: (name) => {
    if (!name) return 'Unknown';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  },

  // Format shift
  shift: (shiftNumber) => {
    const shifts = {
      1: 'Morning (6 AM - 2 PM)',
      2: 'Afternoon (2 PM - 10 PM)',
      3: 'Night (10 PM - 6 AM)'
    };
    return shifts[shiftNumber] || `Shift ${shiftNumber}`;
  },

  // Format bottle size
  bottleSize: (size) => {
    const sizes = {
      '500ml': '500 ML',
      '1L': '1 Liter',
      '5L': '5 Liters',
      '15L': '15 Liters'
    };
    return sizes[size] || size;
  },

  // Format production status
  productionStatus: (produced, planned) => {
    if (!planned || planned === 0) return 'N/A';
    const percentage = (produced / planned) * 100;
    if (percentage >= 100) return 'Completed';
    if (percentage >= 90) return 'Nearly Complete';
    if (percentage >= 50) return 'In Progress';
    return 'Started';
  }
};

// Export all utilities
export default {
  skuDateUtils,
  expiryUtils,
  formatUtils
};
