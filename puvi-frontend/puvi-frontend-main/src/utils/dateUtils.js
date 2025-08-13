// File Path: puvi-frontend/puvi-frontend-main/src/utils/dateUtils.js
// Centralized date formatting utilities for PUVI system
// Handles all date format conversions to DD-MM-YYYY

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
  // Case 2: Integer string like '20250813' (YYYYMMDD from batch codes)
  else if (strInput.length === 8 && !isNaN(strInput)) {
    year = strInput.substring(0, 4);
    month = strInput.substring(4, 6);
    day = strInput.substring(6, 8);
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
  
  // Extract YYYYMMDD from "BATCH-20250813-Test"
  const parts = batchCode.split('-');
  if (parts.length >= 2 && parts[1].length === 8 && !isNaN(parts[1])) {
    return formatDateToDDMMYYYY(parts[1]);
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
