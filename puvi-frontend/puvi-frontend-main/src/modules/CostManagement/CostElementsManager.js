// File Path: puvi-frontend/puvi-frontend-main/src/modules/CostManagement/CostElementsManager.js
// Purpose: Comprehensive cost elements management with CRUD, bulk operations, and analytics
// This file consolidates patterns from all modules to minimize dependencies in next session

import React, { useState, useEffect, useCallback } from 'react';

// =====================================================
// API CONFIGURATION - Consolidated from api/index.js
// =====================================================
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://puvi-backend.onrender.com';

const apiCall = async (url, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
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

// Cost Management API endpoints
const costAPI = {
  // Masters CRUD endpoints
  getAll: (params) => apiCall('/api/masters/cost_elements' + (params ? `?${new URLSearchParams(params)}` : '')),
  getById: (id) => apiCall(`/api/masters/cost_elements/${id}`),
  create: (data) => apiCall('/api/masters/cost_elements', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiCall(`/api/masters/cost_elements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiCall(`/api/masters/cost_elements/${id}`, { method: 'DELETE' }),
  restore: (id) => apiCall(`/api/masters/cost_elements/${id}/restore`, { method: 'POST' }),
  checkDependencies: (id) => apiCall(`/api/masters/cost_elements/${id}/dependencies`),
  export: (params) => apiCall('/api/masters/cost_elements/export' + (params ? `?${new URLSearchParams(params)}` : '')),
  import: (data) => apiCall('/api/masters/cost_elements/import', { method: 'POST', body: JSON.stringify(data) }),
  
  // Cost management specific endpoints
  getMaster: () => apiCall('/api/cost_elements/master'),
  getByActivity: (activity, module) => apiCall(`/api/cost_elements/by_activity?activity=${activity}&module=${module}`),
  getByStage: (stage) => apiCall(`/api/cost_elements/by_stage?stage=${stage}`),
  getValidationReport: (days) => apiCall(`/api/cost_elements/validation_report?days=${days}`),
  bulkUpdateRates: (data) => apiCall('/api/cost_elements/bulk_update', { method: 'POST', body: JSON.stringify(data) }),
  getRateHistory: (elementId) => apiCall(`/api/cost_elements/${elementId}/rate_history`),
  getUsageStats: () => apiCall('/api/cost_elements/usage_stats')
};

// =====================================================
// MAIN COMPONENT
// =====================================================
const CostElementsManager = ({ embedded = false, onClose = null }) => {
  // State Management
  const [activeView, setActiveView] = useState('dashboard'); // dashboard, list, form, bulk, history
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info'); // info, success, warning, error
  
  // Data states
  const [costElements, setCostElements] = useState([]);
  const [filteredElements, setFilteredElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [editingElement, setEditingElement] = useState(null);
  const [statistics, setStatistics] = useState({
    totalElements: 0,
    activeElements: 0,
    byCategory: {},
    byActivity: {},
    recentChanges: [],
    validationWarnings: []
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    activity: 'all',
    module: 'all',
    isOptional: 'all',
    showInactive: false
  });
  
  // Form states
  const [formData, setFormData] = useState({
    element_name: '',
    category: 'Labor',
    activity: 'General',
    unit_type: 'per_kg',
    default_rate: '',
    calculation_method: 'per_kg',
    is_optional: false,
    applicable_to: 'all',
    display_order: 0,
    module_specific: '',
    notes: ''
  });
  
  // Bulk operation states
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  // Configuration from backend
  const categories = ['Labor', 'Utilities', 'Consumables', 'Transport', 'Quality', 'Maintenance', 'Overhead', 'Fixed', 'Variable'];
  const activities = ['Drying', 'Crushing', 'Filtering', 'Common', 'Quality', 'Transport', 'Maintenance', 'General'];
  const unitTypes = ['per_kg', 'per_hour', 'per_bag', 'per_unit', 'fixed', 'percentage', 'actual'];
  const calculationMethods = ['per_kg', 'per_hour', 'per_bag', 'fixed', 'actual', 'formula'];
  const modules = ['all', 'batch', 'sku', 'blend', 'sales'];

  // =====================================================
  // LIFECYCLE & DATA LOADING
  // =====================================================
  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, costElements]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadCostElements(),
        loadStatistics(),
        loadValidationReport()
      ]);
    } catch (error) {
      showMessage(`Error loading data: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCostElements = async () => {
    try {
      const response = await costAPI.getAll({ include_inactive: filters.showInactive });
      if (response.success) {
        setCostElements(response.data || response.cost_elements || []);
      }
    } catch (error) {
      console.error('Error loading cost elements:', error);
      throw error;
    }
  };

  const loadStatistics = async () => {
    try {
      const [master, usage, validation] = await Promise.all([
        costAPI.getMaster(),
        costAPI.getUsageStats().catch(() => ({ usage_stats: [] })),
        costAPI.getValidationReport(7)
      ]);
      
      // Process statistics
      const stats = {
        totalElements: master.cost_elements?.length || 0,
        activeElements: master.cost_elements?.filter(e => !e.is_optional).length || 0,
        byCategory: {},
        byActivity: {},
        recentChanges: [],
        validationWarnings: validation.batches_with_warnings || []
      };
      
      // Count by category and activity
      master.cost_elements?.forEach(element => {
        stats.byCategory[element.category] = (stats.byCategory[element.category] || 0) + 1;
        stats.byActivity[element.activity || 'General'] = (stats.byActivity[element.activity || 'General'] || 0) + 1;
      });
      
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const loadValidationReport = async () => {
    try {
      const response = await costAPI.getValidationReport(30);
      if (response.success && response.batches_with_warnings) {
        setStatistics(prev => ({
          ...prev,
          validationWarnings: response.batches_with_warnings
        }));
      }
    } catch (error) {
      console.error('Error loading validation report:', error);
    }
  };

  // =====================================================
  // FILTERING & SEARCH
  // =====================================================
  const applyFilters = () => {
    let filtered = [...costElements];
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(e => 
        e.element_name.toLowerCase().includes(searchLower) ||
        e.category?.toLowerCase().includes(searchLower) ||
        e.activity?.toLowerCase().includes(searchLower)
      );
    }
    
    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(e => e.category === filters.category);
    }
    
    // Activity filter
    if (filters.activity !== 'all') {
      filtered = filtered.filter(e => e.activity === filters.activity);
    }
    
    // Module filter
    if (filters.module !== 'all') {
      filtered = filtered.filter(e => 
        e.applicable_to === filters.module || e.applicable_to === 'all'
      );
    }
    
    // Optional filter
    if (filters.isOptional !== 'all') {
      filtered = filtered.filter(e => e.is_optional === (filters.isOptional === 'optional'));
    }
    
    // Active filter
    if (!filters.showInactive) {
      filtered = filtered.filter(e => e.is_active !== false);
    }
    
    setFilteredElements(filtered);
  };

  // =====================================================
  // CRUD OPERATIONS
  // =====================================================
  const handleCreate = async () => {
    try {
      setLoading(true);
      const response = await costAPI.create(formData);
      if (response.success) {
        showMessage('Cost element created successfully', 'success');
        await loadCostElements();
        setActiveView('list');
        resetForm();
      }
    } catch (error) {
      showMessage(`Error creating element: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingElement) return;
    
    try {
      setLoading(true);
      const response = await costAPI.update(editingElement.element_id, formData);
      if (response.success) {
        showMessage('Cost element updated successfully', 'success');
        await loadCostElements();
        setActiveView('list');
        setEditingElement(null);
        resetForm();
      }
    } catch (error) {
      showMessage(`Error updating element: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (elementId) => {
    if (!window.confirm('Are you sure you want to delete this cost element?')) return;
    
    try {
      setLoading(true);
      
      // Check dependencies first
      const deps = await costAPI.checkDependencies(elementId);
      if (deps.has_dependencies && !deps.can_soft_delete) {
        showMessage(`Cannot delete: ${deps.message}`, 'warning');
        return;
      }
      
      const response = await costAPI.delete(elementId);
      if (response.success) {
        showMessage('Cost element deleted successfully', 'success');
        await loadCostElements();
      }
    } catch (error) {
      showMessage(`Error deleting element: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (elementId) => {
    try {
      setLoading(true);
      const response = await costAPI.restore(elementId);
      if (response.success) {
        showMessage('Cost element restored successfully', 'success');
        await loadCostElements();
      }
    } catch (error) {
      showMessage(`Error restoring element: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // BULK OPERATIONS
  // =====================================================
  const handleBulkUpdate = async () => {
    if (selectedIds.length === 0) {
      showMessage('Please select elements to update', 'warning');
      return;
    }
    
    try {
      setLoading(true);
      const updates = selectedIds.map(id => ({
        element_id: id,
        rate: parseFloat(prompt('Enter new rate:') || 0)
      }));
      
      const response = await costAPI.bulkUpdateRates({ updates });
      if (response.success) {
        showMessage(`Updated ${selectedIds.length} elements successfully`, 'success');
        await loadCostElements();
        setBulkMode(false);
        setSelectedIds([]);
      }
    } catch (error) {
      showMessage(`Error in bulk update: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const response = await costAPI.export({ 
        format: 'csv',
        include_inactive: filters.showInactive 
      });
      
      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cost_elements_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      
      showMessage('Export completed successfully', 'success');
    } catch (error) {
      showMessage(`Export failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (file) => {
    try {
      setLoading(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const csv = e.target.result;
        const response = await costAPI.import({ csv_data: csv });
        if (response.success) {
          showMessage(`Imported ${response.imported_count} elements successfully`, 'success');
          await loadCostElements();
        }
      };
      reader.readAsText(file);
    } catch (error) {
      showMessage(`Import failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================
  const showMessage = (text, type = 'info') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const resetForm = () => {
    setFormData({
      element_name: '',
      category: 'Labor',
      activity: 'General',
      unit_type: 'per_kg',
      default_rate: '',
      calculation_method: 'per_kg',
      is_optional: false,
      applicable_to: 'all',
      display_order: 0,
      module_specific: '',
      notes: ''
    });
  };

  const formatCurrency = (amount) => {
    return `₹${(amount || 0).toFixed(2)}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB');
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Labor': '#d4edda',
      'Utilities': '#cce5ff',
      'Consumables': '#fff3cd',
      'Transport': '#f8d7da',
      'Quality': '#e2e3e5',
      'Maintenance': '#d1ecf1',
      'Overhead': '#e7e3f4',
      'Fixed': '#ffeeba',
      'Variable': '#bee5eb'
    };
    return colors[category] || '#f8f9fa';
  };

  const getActivityColor = (activity) => {
    const colors = {
      'Drying': '#ffc107',
      'Crushing': '#17a2b8',
      'Filtering': '#6c757d',
      'Common': '#28a745',
      'Quality': '#6610f2',
      'Transport': '#dc3545',
      'Maintenance': '#fd7e14',
      'General': '#6c757d'
    };
    return colors[activity] || '#6c757d';
  };

  // =====================================================
  // STYLES (Consolidated from all modules)
  // =====================================================
  const styles = {
    container: {
      padding: embedded ? '10px' : '20px',
      maxWidth: embedded ? '100%' : '1400px',
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      marginBottom: '20px',
      borderBottom: '2px solid #dee2e6',
      paddingBottom: '15px'
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#333',
      marginBottom: '10px'
    },
    subtitle: {
      fontSize: '14px',
      color: '#6c757d'
    },
    message: {
      padding: '15px',
      marginBottom: '20px',
      borderRadius: '4px',
      backgroundColor: 
        messageType === 'success' ? '#d4edda' : 
        messageType === 'warning' ? '#fff3cd' : 
        messageType === 'error' ? '#f8d7da' : '#cce5ff',
      color: 
        messageType === 'success' ? '#155724' : 
        messageType === 'warning' ? '#856404' : 
        messageType === 'error' ? '#721c24' : '#004085',
      border: `1px solid ${
        messageType === 'success' ? '#c3e6cb' : 
        messageType === 'warning' ? '#ffeaa7' : 
        messageType === 'error' ? '#f5c6cb' : '#b8daff'
      }`
    },
    viewNav: {
      display: 'flex',
      gap: '10px',
      marginBottom: '25px',
      flexWrap: 'wrap'
    },
    viewButton: {
      padding: '10px 20px',
      border: '1px solid #dee2e6',
      backgroundColor: 'white',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      color: '#495057',
      borderRadius: '4px',
      transition: 'all 0.2s'
    },
    activeViewButton: {
      backgroundColor: '#007bff',
      color: 'white',
      borderColor: '#007bff'
    },
    content: {
      backgroundColor: '#f8f9fa',
      padding: '25px',
      borderRadius: '8px',
      minHeight: embedded ? '300px' : '500px'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      marginBottom: '30px'
    },
    statCard: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      borderLeft: '4px solid #007bff'
    },
    statValue: {
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#333',
      marginBottom: '5px'
    },
    statLabel: {
      fontSize: '14px',
      color: '#6c757d',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    filterBar: {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px',
      padding: '15px',
      backgroundColor: 'white',
      borderRadius: '5px',
      flexWrap: 'wrap',
      alignItems: 'center'
    },
    filterInput: {
      padding: '8px 12px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      fontSize: '14px',
      minWidth: '150px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      backgroundColor: 'white',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    th: {
      padding: '12px',
      textAlign: 'left',
      borderBottom: '2px solid #dee2e6',
      backgroundColor: '#e9ecef',
      fontWeight: '600',
      fontSize: '14px',
      color: '#495057',
      position: 'sticky',
      top: 0
    },
    td: {
      padding: '12px',
      borderBottom: '1px solid #e9ecef',
      fontSize: '14px'
    },
    badge: {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600',
      display: 'inline-block'
    },
    button: {
      padding: '8px 16px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'background-color 0.2s'
    },
    secondaryButton: {
      padding: '8px 16px',
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500'
    },
    dangerButton: {
      padding: '8px 16px',
      backgroundColor: '#dc3545',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500'
    },
    form: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    formGroup: {
      marginBottom: '15px'
    },
    formLabel: {
      display: 'block',
      marginBottom: '5px',
      fontWeight: '600',
      color: '#495057',
      fontSize: '14px'
    },
    formInput: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      fontSize: '15px'
    },
    formSelect: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      fontSize: '15px',
      backgroundColor: 'white'
    },
    formCheckbox: {
      marginRight: '8px',
      width: '18px',
      height: '18px'
    },
    formActions: {
      display: 'flex',
      gap: '10px',
      marginTop: '20px',
      paddingTop: '20px',
      borderTop: '1px solid #dee2e6'
    },
    pagination: {
      display: 'flex',
      justifyContent: 'center',
      gap: '5px',
      marginTop: '20px'
    },
    pageButton: {
      padding: '5px 10px',
      border: '1px solid #dee2e6',
      backgroundColor: 'white',
      cursor: 'pointer',
      borderRadius: '3px'
    },
    activePage: {
      backgroundColor: '#007bff',
      color: 'white',
      borderColor: '#007bff'
    }
  };

  // =====================================================
  // RENDER FUNCTIONS
  // =====================================================
  const renderDashboard = () => (
    <div>
      {/* Statistics Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{statistics.totalElements}</div>
          <div style={styles.statLabel}>Total Elements</div>
        </div>
        <div style={{...styles.statCard, borderLeftColor: '#28a745'}}>
          <div style={styles.statValue}>{statistics.activeElements}</div>
          <div style={styles.statLabel}>Required Elements</div>
        </div>
        <div style={{...styles.statCard, borderLeftColor: '#ffc107'}}>
          <div style={styles.statValue}>{statistics.validationWarnings.length}</div>
          <div style={styles.statLabel}>Validation Warnings</div>
        </div>
        <div style={{...styles.statCard, borderLeftColor: '#17a2b8'}}>
          <div style={styles.statValue}>{Object.keys(statistics.byCategory).length}</div>
          <div style={styles.statLabel}>Categories</div>
        </div>
      </div>

      {/* Category Distribution */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>📊 Elements by Category</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {Object.entries(statistics.byCategory).map(([category, count]) => (
            <div
              key={category}
              style={{
                ...styles.badge,
                backgroundColor: getCategoryColor(category),
                color: '#495057',
                padding: '8px 12px',
                fontSize: '14px'
              }}
            >
              {category}: {count}
            </div>
          ))}
        </div>
      </div>

      {/* Activity Distribution */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>🎯 Elements by Activity</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {Object.entries(statistics.byActivity).map(([activity, count]) => (
            <div
              key={activity}
              style={{
                ...styles.badge,
                backgroundColor: getActivityColor(activity),
                color: 'white',
                padding: '8px 12px',
                fontSize: '14px'
              }}
            >
              {activity}: {count}
            </div>
          ))}
        </div>
      </div>

      {/* Validation Warnings */}
      {statistics.validationWarnings.length > 0 && (
        <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '5px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>
            ⚠️ Recent Batches with Missing Cost Elements
          </h3>
          <ul style={{ marginBottom: 0 }}>
            {statistics.validationWarnings.slice(0, 5).map((batch, idx) => (
              <li key={idx}>
                {batch.batch_code} - {batch.missing_count} elements missing
                ({batch.production_date})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderList = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedElements = filteredElements.slice(startIndex, endIndex);
    const totalPages = Math.ceil(filteredElements.length / itemsPerPage);

    return (
      <div>
        {/* Filter Bar */}
        <div style={styles.filterBar}>
          <input
            type="text"
            placeholder="Search elements..."
            style={styles.filterInput}
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
          />
          <select
            style={styles.filterInput}
            value={filters.category}
            onChange={(e) => setFilters({...filters, category: e.target.value})}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            style={styles.filterInput}
            value={filters.activity}
            onChange={(e) => setFilters({...filters, activity: e.target.value})}
          >
            <option value="all">All Activities</option>
            {activities.map(act => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>
          <select
            style={styles.filterInput}
            value={filters.module}
            onChange={(e) => setFilters({...filters, module: e.target.value})}
          >
            <option value="all">All Modules</option>
            {modules.map(mod => (
              <option key={mod} value={mod}>{mod}</option>
            ))}
          </select>
          <select
            style={styles.filterInput}
            value={filters.isOptional}
            onChange={(e) => setFilters({...filters, isOptional: e.target.value})}
          >
            <option value="all">All Types</option>
            <option value="required">Required Only</option>
            <option value="optional">Optional Only</option>
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input
              type="checkbox"
              checked={filters.showInactive}
              onChange={(e) => setFilters({...filters, showInactive: e.target.checked})}
            />
            Show Inactive
          </label>
          {bulkMode && (
            <button
              style={styles.secondaryButton}
              onClick={handleBulkUpdate}
              disabled={selectedIds.length === 0}
            >
              Update Selected ({selectedIds.length})
            </button>
          )}
        </div>

        {/* Actions Bar */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <button
            style={styles.button}
            onClick={() => {
              resetForm();
              setActiveView('form');
            }}
          >
            ➕ Add New Element
          </button>
          <button
            style={styles.secondaryButton}
            onClick={() => setBulkMode(!bulkMode)}
          >
            {bulkMode ? '✖ Cancel Bulk' : '☑️ Bulk Mode'}
          </button>
          <button
            style={styles.secondaryButton}
            onClick={handleExport}
          >
            📥 Export CSV
          </button>
          <label style={styles.secondaryButton}>
            📤 Import CSV
            <input
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files[0] && handleImport(e.target.files[0])}
            />
          </label>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                {bulkMode && (
                  <th style={styles.th}>
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(paginatedElements.map(e => e.element_id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                    />
                  </th>
                )}
                <th style={styles.th}>Element Name</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Activity</th>
                <th style={styles.th}>Unit Type</th>
                <th style={styles.th}>Default Rate</th>
                <th style={styles.th}>Method</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Module</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedElements.map(element => (
                <tr key={element.element_id}>
                  {bulkMode && (
                    <td style={styles.td}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(element.element_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds([...selectedIds, element.element_id]);
                          } else {
                            setSelectedIds(selectedIds.filter(id => id !== element.element_id));
                          }
                        }}
                      />
                    </td>
                  )}
                  <td style={styles.td}>
                    <strong>{element.element_name}</strong>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: getCategoryColor(element.category),
                      color: '#495057'
                    }}>
                      {element.category}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: getActivityColor(element.activity || 'General'),
                      color: 'white'
                    }}>
                      {element.activity || 'General'}
                    </span>
                  </td>
                  <td style={styles.td}>{element.unit_type}</td>
                  <td style={styles.td}>
                    <strong>{formatCurrency(element.default_rate)}</strong>
                  </td>
                  <td style={styles.td}>{element.calculation_method}</td>
                  <td style={styles.td}>
                    {element.is_optional ? (
                      <span style={{ color: '#ffc107' }}>Optional</span>
                    ) : (
                      <span style={{ color: '#28a745' }}>Required</span>
                    )}
                  </td>
                  <td style={styles.td}>{element.applicable_to}</td>
                  <td style={styles.td}>
                    {element.is_active !== false ? (
                      <span style={{ color: '#28a745' }}>✓ Active</span>
                    ) : (
                      <span style={{ color: '#dc3545' }}>✗ Inactive</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        style={{ ...styles.button, padding: '4px 8px', fontSize: '12px' }}
                        onClick={() => {
                          setEditingElement(element);
                          setFormData(element);
                          setActiveView('form');
                        }}
                      >
                        Edit
                      </button>
                      {element.is_active !== false ? (
                        <button
                          style={{ ...styles.dangerButton, padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => handleDelete(element.element_id)}
                        >
                          Delete
                        </button>
                      ) : (
                        <button
                          style={{ ...styles.secondaryButton, padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => handleRestore(element.element_id)}
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={styles.pagination}>
            <button
              style={styles.pageButton}
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              First
            </button>
            <button
              style={styles.pageButton}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  style={{
                    ...styles.pageButton,
                    ...(currentPage === pageNum ? styles.activePage : {})
                  }}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              style={styles.pageButton}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
            <button
              style={styles.pageButton}
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Last
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderForm = () => (
    <div style={styles.form}>
      <h3 style={{ marginBottom: '20px' }}>
        {editingElement ? '✏️ Edit Cost Element' : '➕ Add New Cost Element'}
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Element Name *</label>
          <input
            type="text"
            style={styles.formInput}
            value={formData.element_name}
            onChange={(e) => setFormData({...formData, element_name: e.target.value})}
            placeholder="e.g., Drying Labour"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Category *</label>
          <select
            style={styles.formSelect}
            value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Activity</label>
          <select
            style={styles.formSelect}
            value={formData.activity}
            onChange={(e) => setFormData({...formData, activity: e.target.value})}
          >
            {activities.map(act => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Unit Type *</label>
          <select
            style={styles.formSelect}
            value={formData.unit_type}
            onChange={(e) => setFormData({...formData, unit_type: e.target.value})}
          >
            {unitTypes.map(unit => (
              <option key={unit} value={unit}>{unit.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Default Rate *</label>
          <input
            type="number"
            step="0.01"
            style={styles.formInput}
            value={formData.default_rate}
            onChange={(e) => setFormData({...formData, default_rate: e.target.value})}
            placeholder="0.00"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Calculation Method *</label>
          <select
            style={styles.formSelect}
            value={formData.calculation_method}
            onChange={(e) => setFormData({...formData, calculation_method: e.target.value})}
          >
            {calculationMethods.map(method => (
              <option key={method} value={method}>{method.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Applicable To</label>
          <select
            style={styles.formSelect}
            value={formData.applicable_to}
            onChange={(e) => setFormData({...formData, applicable_to: e.target.value})}
          >
            {modules.map(mod => (
              <option key={mod} value={mod}>{mod}</option>
            ))}
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Display Order</label>
          <input
            type="number"
            style={styles.formInput}
            value={formData.display_order}
            onChange={(e) => setFormData({...formData, display_order: parseInt(e.target.value) || 0})}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Module Specific</label>
          <input
            type="text"
            style={styles.formInput}
            value={formData.module_specific || ''}
            onChange={(e) => setFormData({...formData, module_specific: e.target.value})}
            placeholder="batch, sku, blend"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={{ ...styles.formLabel, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              style={styles.formCheckbox}
              checked={formData.is_optional}
              onChange={(e) => setFormData({...formData, is_optional: e.target.checked})}
            />
            Optional Element
          </label>
        </div>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.formLabel}>Notes</label>
        <textarea
          style={{ ...styles.formInput, minHeight: '80px' }}
          value={formData.notes || ''}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          placeholder="Additional notes or instructions..."
        />
      </div>

      <div style={styles.formActions}>
        <button
          style={styles.button}
          onClick={editingElement ? handleUpdate : handleCreate}
          disabled={!formData.element_name || !formData.default_rate}
        >
          {editingElement ? 'Update Element' : 'Create Element'}
        </button>
        <button
          style={styles.secondaryButton}
          onClick={() => {
            setActiveView('list');
            setEditingElement(null);
            resetForm();
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );

  // =====================================================
  // MAIN RENDER
  // =====================================================
  return (
    <div style={styles.container}>
      {!embedded && (
        <div style={styles.header}>
          <h2 style={styles.title}>
            ⚙️ Cost Elements Management
            {embedded && (
              <button
                style={{ ...styles.secondaryButton, marginLeft: '20px' }}
                onClick={onClose}
              >
                ✕ Close
              </button>
            )}
          </h2>
          <p style={styles.subtitle}>
            Configure cost elements, rates, activities, and calculation methods for the production system
          </p>
        </div>
      )}

      {message && (
        <div style={styles.message}>
          {message}
        </div>
      )}

      {/* View Navigation */}
      <div style={styles.viewNav}>
        <button
          style={{
            ...styles.viewButton,
            ...(activeView === 'dashboard' ? styles.activeViewButton : {})
          }}
          onClick={() => setActiveView('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          style={{
            ...styles.viewButton,
            ...(activeView === 'list' ? styles.activeViewButton : {})
          }}
          onClick={() => setActiveView('list')}
        >
          📋 Elements List
        </button>
        <button
          style={{
            ...styles.viewButton,
            ...(activeView === 'form' ? styles.activeViewButton : {})
          }}
          onClick={() => setActiveView('form')}
        >
          {editingElement ? '✏️ Edit Element' : '➕ New Element'}
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div>Loading...</div>
          </div>
        )}

        {!loading && activeView === 'dashboard' && renderDashboard()}
        {!loading && activeView === 'list' && renderList()}
        {!loading && activeView === 'form' && renderForm()}
      </div>
    </div>
  );
};

export default CostElementsManager;
