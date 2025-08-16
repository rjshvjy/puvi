// Configuration Service for centralized values
// File Path: puvi-frontend/puvi-frontend-main/src/services/configService.js
// Purpose: Replaces hardcoded arrays throughout the application with database-driven configs

// Import from existing API service
import { apiCall, API_BASE_URL } from './api';

// Cache configuration
const configCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Generic config fetcher using existing apiCall
export const getConfig = async (configType) => {
  const cached = configCache[configType];
  
  // Return cached if valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  try {
    // Use existing apiCall function from api/index.js
    const data = await apiCall(`/api/config/${configType}`);
    
    if (data.success) {
      configCache[configType] = {
        data: data.values || data.data,
        timestamp: Date.now()
      };
      return data.values || data.data;
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching config ${configType}:`, error);
    return cached?.data || [];
  }
};

// Specific config getters matching PUVI's needs
export const getOilTypes = () => getConfig('oil_types');
export const getPackageSizes = () => getConfig('package_sizes');
export const getGSTRates = () => getConfig('gst_rates');
export const getMaterialCategories = () => getConfig('material_categories');
export const getWriteoffReasons = () => getConfig('writeoff_reasons');
export const getCostElements = () => getConfig('cost_elements');
export const getSuppliers = () => getConfig('suppliers');

// Get config from masters API (alternative approach using existing endpoints)
export const getFromMasters = async (masterType) => {
  try {
    const data = await apiCall(`/api/masters/${masterType}`);
    return data.success ? data.data : [];
  } catch (error) {
    console.error(`Error fetching master ${masterType}:`, error);
    return [];
  }
};

// Clear cache when needed
export const clearConfigCache = (configType = null) => {
  if (configType) {
    delete configCache[configType];
  } else {
    Object.keys(configCache).forEach(key => delete configCache[key]);
  }
};

// Preload critical configs on app start
export const preloadConfigs = async () => {
  const criticalConfigs = ['oil_types', 'package_sizes', 'gst_rates'];
  await Promise.all(criticalConfigs.map(config => getConfig(config)));
};

// Export for components that need direct access
export default {
  getConfig,
  getOilTypes,
  getPackageSizes,
  getGSTRates,
  getMaterialCategories,
  getWriteoffReasons,
  getCostElements,
  getSuppliers,
  getFromMasters,
  clearConfigCache,
  preloadConfigs
};
