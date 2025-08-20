// File Path: puvi-frontend/puvi-frontend-main/src/utils/dateUtils.js
// Centralized date formatting utilities for PUVI system
// UPDATED: All codes now use DDMMYYYY format consistently

export function formatDateToDDMMYYYY(input) {
  if (!input) return 'N/A';
  
  let year, month, day;
  const strInput = String(input).trim();
  
  // Case 1: YYYY/MM/DD or YYYY-MM-DD (from backend integer_to_date)
  if (strInput.includes('/') || strInput.includes('-')) {
    const separator = strInput.includes('/') ? '/' : '-';
    const parts = strInput.split(separator);
    
    if (parts.length === 3) {
      // Check if already DD-MM-YYYY or DD/MM/YYYY
      if (parts[0].length <= 2 && parts[2].length === 4) {
        day = parts[0].padStart(2, '0');
        month = parts[1].padStart(2, '0');
        year = parts[2];
        return `${day}-${month}-${year}`;
      }
      // It's YYYY-MM-DD or YYYY/MM/DD
      else if (parts[0].length === 4) {
        year = parts[0];
        month = parts[1].padStart(2, '0');
        day = parts[2].padStart(2, '0');
        return `${day}-${month}-${year}`;
      }
    }
  }
  // Case 2: Integer string like '20082025' (DDMMYYYY from all codes now)
  else if (strInput.length === 8 && !isNaN(strInput)) {
    // All codes now use DDMMYYYY format
    day = strInput.substring(0, 2);
    month = strInput.substring(2, 4);
    year = strInput.substring(4, 8);
    return `${day}-${month}-${year}`;
  }
  
  // Case 3: Already formatted correctly
  if (strInput.match(/^\d{2}-\d{2}-\d{4}$/)) {
    return strInput;
  }
  
  // Fallback
  return strInput;
}

// Extract and format date from batch code
export function extractDateFromBatchCode(batchCode) {
  if (!batchCode) return '';
  
  // All codes now use DDMMYYYY format
  // Extract DDMMYYYY from "BATCH-20082025-Test" or "BLEND-20082025-Oil"
  const parts = batchCode.split('-');
  if (parts.length >= 2 && parts[1].length === 8 && !isNaN(parts[1])) {
    const dateStr = parts[1];
    // Parse DDMMYYYY format
    const day = dateStr.substring(0, 2);
    const month = dateStr.substring(2, 4);
    const year = dateStr.substring(4, 8);
    return `${day}-${month}-${year}`;
  }
  return '';
}

// Parse any date format to JS Date object
export function parseToDate(input) {
  if (!input) return null;
  
  const formatted = formatDateToDDMMYYYY(input);
  if (formatted === 'N/A' || formatted === 'Invalid Date') return null;
  
  const [day, month, year] = formatted.split('-');
  return new Date(year, month - 1, day);
}

// Extract date from any traceable code (batch, blend, purchase)
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

// Convert date from DD-MM-YYYY to YYYY-MM-DD (for HTML date inputs)
export function formatForHTMLInput(dateStr) {
  if (!dateStr) return '';
  
  // If already in YYYY-MM-DD format
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }
  
  // Convert from DD-MM-YYYY to YYYY-MM-DD
  const formatted = formatDateToDDMMYYYY(dateStr);
  if (formatted === 'N/A') return '';
  
  const [day, month, year] = formatted.split('-');
  return `${year}-${month}-${day}`;
}

// Format date for display with month name
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

// Validate if a string is in DDMMYYYY format
export function isValidDDMMYYYY(dateStr) {
  if (!dateStr || dateStr.length !== 8) return false;
  
  const day = parseInt(dateStr.substring(0, 2), 10);
  const month = parseInt(dateStr.substring(2, 4), 10);
  const year = parseInt(dateStr.substring(4, 8), 10);
  
  return day >= 1 && day <= 31 && 
         month >= 1 && month <= 12 && 
         year >= 2020 && year <= 2099;
}

// Get today's date in DDMMYYYY format
export function getTodayDDMMYYYY() {
  const today = new Date();
  const day = today.getDate().toString().padStart(2, '0');
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const year = today.getFullYear();
  
  return `${day}${month}${year}`;
}

// Compare two dates in DD-MM-YYYY format
export function compareDates(date1, date2) {
  const d1 = parseToDate(date1);
  const d2 = parseToDate(date2);
  
  if (!d1 || !d2) return 0;
  
  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
}

// Calculate days between two dates
export function daysBetween(date1, date2) {
  const d1 = parseToDate(date1);
  const d2 = parseToDate(date2);
  
  if (!d1 || !d2) return null;
  
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
