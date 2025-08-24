// File Path: puvi-frontend/puvi-frontend-main/src/utils/dateUtils.js
// Centralized date formatting utilities for PUVI system
// ENHANCED: Proper DD-MM-YYYY handling for Indian format

/**
 * Parse DD-MM-YYYY string to JavaScript Date object
 * This is the core fix for the NaN days issue
 */
export function parseDDMMYYYYToDate(dateString) {
  if (!dateString) return null;
  
  // If already a Date object, return it
  if (dateString instanceof Date) {
    return isNaN(dateString.getTime()) ? null : dateString;
  }
  
  // Convert to string if needed
  const dateStr = String(dateString).trim();
  
  // Handle DD-MM-YYYY format (primary format for India)
  if (dateStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
    const [day, month, year] = dateStr.split('-');
    const date = new Date(year, month - 1, day);
    return isNaN(date.getTime()) ? null : date;
  }
  
  // Handle DD/MM/YYYY format (alternative Indian format)
  if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [day, month, year] = dateStr.split('/');
    const date = new Date(year, month - 1, day);
    return isNaN(date.getTime()) ? null : date;
  }
  
  // Handle YYYY-MM-DD format (ISO format from date inputs)
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }
  
  return null;
}

/**
 * Calculate age in days from a date
 * Fixes the NaN issue in batch age calculations
 */
export function calculateDaysFromDate(dateInput) {
  if (!dateInput) return null;
  
  const date = parseDDMMYYYYToDate(dateInput);
  if (!date) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  const diffTime = today.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Format any input to DD-MM-YYYY string
 */
export function formatDateToDDMMYYYY(input) {
  if (!input) return 'N/A';
  
  let date = null;
  const strInput = String(input).trim();
  
  // Case 1: Already formatted correctly
  if (strInput.match(/^\d{2}-\d{2}-\d{4}$/)) {
    return strInput;
  }
  
  // Case 2: YYYY-MM-DD or YYYY/MM/DD (from backend or date inputs)
  if (strInput.match(/^\d{4}[-\/]\d{2}[-\/]\d{2}$/)) {
    const separator = strInput.includes('/') ? '/' : '-';
    const [year, month, day] = strInput.split(separator);
    return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
  }
  
  // Case 3: Integer string like '20082025' (DDMMYYYY)
  if (strInput.length === 8 && !isNaN(strInput)) {
    const day = strInput.substring(0, 2);
    const month = strInput.substring(2, 4);
    const year = strInput.substring(4, 8);
    return `${day}-${month}-${year}`;
  }
  
  // Case 4: Try to parse as Date object
  date = parseDDMMYYYYToDate(strInput);
  if (date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }
  
  // Fallback
  return strInput === '' ? 'N/A' : strInput;
}

/**
 * Extract and format date from batch/blend/production codes
 */
export function extractDateFromBatchCode(batchCode) {
  if (!batchCode) return '';
  
  // Extract DDMMYYYY from codes like "BATCH-20082025-Test" or "BLEND-20082025-Oil"
  const parts = batchCode.split('-');
  if (parts.length >= 2 && parts[1].length === 8 && !isNaN(parts[1])) {
    const dateStr = parts[1];
    // Parse DDMMYYYY format
    const day = dateStr.substring(0, 2);
    const month = dateStr.substring(2, 4);
    const year = dateStr.substring(4, 8);
    
    // Validate the date components
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    
    if (dayNum >= 1 && dayNum <= 31 && 
        monthNum >= 1 && monthNum <= 12 && 
        yearNum >= 2020 && yearNum <= 2099) {
      return `${day}-${month}-${year}`;
    }
  }
  return '';
}

/**
 * Parse any date format to JS Date object
 * Enhanced version with better error handling
 */
export function parseToDate(input) {
  if (!input) return null;
  
  // Use our enhanced parser
  const date = parseDDMMYYYYToDate(input);
  if (date && !isNaN(date.getTime())) {
    return date;
  }
  
  // Try parsing the formatted version
  const formatted = formatDateToDDMMYYYY(input);
  if (formatted !== 'N/A' && formatted !== input) {
    return parseDDMMYYYYToDate(formatted);
  }
  
  return null;
}

/**
 * Extract date from any traceable code
 */
export function extractDateFromTraceableCode(traceableCode) {
  if (!traceableCode) return '';
  
  const parts = traceableCode.split('-');
  
  // Find the DDMMYYYY date part in the code
  for (let part of parts) {
    if (part.length === 8 && !isNaN(part)) {
      // Found the date part - it's in DDMMYYYY format
      const day = part.substring(0, 2);
      const month = part.substring(2, 4);
      const year = part.substring(4, 8);
      
      // Validate it's a reasonable date
      const dayNum = parseInt(day, 10);
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);
      
      if (dayNum >= 1 && dayNum <= 31 && 
          monthNum >= 1 && monthNum <= 12 && 
          yearNum >= 2020 && yearNum <= 2099) {
        return `${day}-${month}-${year}`;
      }
    }
  }
  
  return '';
}

/**
 * Convert DD-MM-YYYY to YYYY-MM-DD for HTML date inputs
 */
export function formatForHTMLInput(dateStr) {
  if (!dateStr) return '';
  
  // If already in YYYY-MM-DD format
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }
  
  // Parse and convert
  const date = parseDDMMYYYYToDate(dateStr);
  if (date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return '';
}

/**
 * Format date with month name
 */
export function formatDateWithMonth(input) {
  const date = parseToDate(input);
  if (!date) return '';
  
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day}-${month}-${year}`;
}

/**
 * Validate if a string is in DDMMYYYY format
 */
export function isValidDDMMYYYY(dateStr) {
  if (!dateStr || dateStr.length !== 8) return false;
  
  const day = parseInt(dateStr.substring(0, 2), 10);
  const month = parseInt(dateStr.substring(2, 4), 10);
  const year = parseInt(dateStr.substring(4, 8), 10);
  
  return day >= 1 && day <= 31 && 
         month >= 1 && month <= 12 && 
         year >= 2020 && year <= 2099;
}

/**
 * Get today's date in DDMMYYYY format (no separators)
 */
export function getTodayDDMMYYYY() {
  const today = new Date();
  const day = today.getDate().toString().padStart(2, '0');
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const year = today.getFullYear();
  
  return `${day}${month}${year}`;
}

/**
 * Get today's date in DD-MM-YYYY format (with separators)
 */
export function getTodayFormatted() {
  const today = new Date();
  const day = today.getDate().toString().padStart(2, '0');
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const year = today.getFullYear();
  
  return `${day}-${month}-${year}`;
}

/**
 * Compare two dates for sorting (useful for FIFO/FEFO)
 * Returns: -1 if date1 < date2, 1 if date1 > date2, 0 if equal
 */
export function compareDates(date1, date2) {
  const d1 = parseDDMMYYYYToDate(date1);
  const d2 = parseDDMMYYYYToDate(date2);
  
  // Handle null/invalid dates
  if (!d1 && !d2) return 0;
  if (!d1) return 1;  // null dates sort to end
  if (!d2) return -1;
  
  const time1 = d1.getTime();
  const time2 = d2.getTime();
  
  if (time1 < time2) return -1;
  if (time1 > time2) return 1;
  return 0;
}

/**
 * Calculate days between two dates
 */
export function daysBetween(date1, date2) {
  const d1 = parseDDMMYYYYToDate(date1);
  const d2 = parseDDMMYYYYToDate(date2);
  
  if (!d1 || !d2) return null;
  
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Add days to a date
 */
export function addDays(dateInput, days) {
  const date = parseDDMMYYYYToDate(dateInput);
  if (!date) return null;
  
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return formatDateToDDMMYYYY(result);
}

/**
 * Check if a date is in the past
 */
export function isPastDate(dateInput) {
  const date = parseDDMMYYYYToDate(dateInput);
  if (!date) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  return date < today;
}

/**
 * Check if a date is in the future
 */
export function isFutureDate(dateInput) {
  const date = parseDDMMYYYYToDate(dateInput);
  if (!date) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  return date > today;
}

/**
 * Get financial year for Indian format (April to March)
 */
export function getFinancialYear(dateInput) {
  const date = parseDDMMYYYYToDate(dateInput) || new Date();
  
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  
  if (month >= 4) {
    return `${year}-${(year + 1).toString().slice(2)}`;
  } else {
    return `${year - 1}-${year.toString().slice(2)}`;
  }
}

// Export all functions as a service object for convenience
export const dateService = {
  parse: parseDDMMYYYYToDate,
  format: formatDateToDDMMYYYY,
  calculateAge: calculateDaysFromDate,
  parseToDate,
  extractFromBatch: extractDateFromBatchCode,
  extractFromTraceable: extractDateFromTraceableCode,
  toHTMLInput: formatForHTMLInput,
  withMonth: formatDateWithMonth,
  validate: isValidDDMMYYYY,
  today: getTodayDDMMYYYY,
  todayFormatted: getTodayFormatted,
  compare: compareDates,
  daysBetween,
  addDays,
  isPast: isPastDate,
  isFuture: isFutureDate,
  financialYear: getFinancialYear
};

// Default export for backward compatibility
export default {
  formatDateToDDMMYYYY,
  extractDateFromBatchCode,
  parseToDate,
  extractDateFromTraceableCode,
  formatForHTMLInput,
  formatDateWithMonth,
  isValidDDMMYYYY,
  getTodayDDMMYYYY,
  compareDates,
  daysBetween,
  // New enhanced functions
  parseDDMMYYYYToDate,
  calculateDaysFromDate,
  dateService
};
