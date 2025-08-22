// MastersList Component - Dynamic table for all master types with CRUD operations
// File Path: puvi-frontend/puvi-frontend-main/src/components/Masters/MastersList.jsx
// Handles display, search, sort, pagination, and dependency management
// UPDATED: Added UOM master display configuration with system protection

import React, { useState, useEffect, useCallback } from 'react';

// API configuration
const API_BASE_URL = 'https://puvi-backend.onrender.com';

// API helper function
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

// Main MastersList Component
const MastersList = ({ 
  masterType, 
  onAdd, 
  onEdit, 
  refreshTrigger = 0 
}) => {
  // State management
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [schema, setSchema] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ASC' });
  const [includeInactive, setIncludeInactive] = useState(false);
  
  // Pagination state - FIXED: Changed default per_page from 10 to 20
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,  // Changed from 10 to 20
    total_count: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false
  });

  // Delete confirmation state
  const [deleteModal, setDeleteModal] = useState({
    show: false,
    record: null,
    dependencies: null,
    checking: false
  });

  // Toast message state
  const [message, setMessage] = useState({ type: '', text: '' });

  // Master type display configuration - UPDATED: Added UOM configuration
  const masterDisplayConfig = {
    suppliers: {
      icon: '🏢',
      primaryField: 'supplier_name',
      columns: ['supplier_id', 'supplier_name', 'contact_person', 'phone', 'email', 'gst_number', 'short_code', 'is_active']
    },
    materials: {
      icon: '📦',
      primaryField: 'material_name',
      columns: ['material_id', 'material_name', 'category', 'unit', 'current_cost', 'gst_rate', 'short_code', 'is_active']
    },
    uom: {
      icon: '📏',
      primaryField: 'uom_name',
      columns: ['uom_id', 'uom_code', 'uom_name', 'uom_symbol', 'uom_category', 'display_order', 'is_system', 'is_active']
    },
    categories: {
      icon: '📂',
      primaryField: 'category_name',
      columns: ['category_id', 'category_name', 'requires_subcategory', 'is_active']
    },
    subcategories: {
      icon: '🛢️',
      primaryField: 'subcategory_name',
      columns: ['subcategory_id', 'subcategory_name', 'subcategory_code', 'category_name', 'oil_type', 'is_active']
    },
    bom_category_mapping: {
      icon: '📋',
      primaryField: 'bom_category',
      columns: ['mapping_id', 'bom_category', 'material_categories', 'keywords', 'display_order', 'is_active']
    },
    tags: {
      icon: '🏷️',
      primaryField: 'tag_name',
      columns: ['tag_id', 'tag_name', 'tag_category', 'description', 'is_active']
    },
    writeoff_reasons: {
      icon: '❌',
      primaryField: 'reason_description',
      columns: ['reason_code', 'reason_description', 'category', 'is_active']
    },
    cost_elements: {
      icon: '💰',
      primaryField: 'element_name',
      columns: ['element_id', 'element_name', 'category', 'unit_type', 'default_rate', 'is_active']
    }
  };

  // Load schema and data
  useEffect(() => {
    if (masterType) {
      loadSchema();
      loadData();
    }
  }, [masterType, refreshTrigger]);

  // Reload data when pagination or filters change
  useEffect(() => {
    if (masterType) {
      loadData();
    }
  }, [pagination.page, pagination.per_page, sortConfig, includeInactive, searchTerm]); // Added pagination.per_page

  // Load schema for current master type
  const loadSchema = async () => {
    try {
      const response = await apiCall(`/api/masters/${masterType}/schema`);
      if (response.success) {
        setSchema(response);
      }
    } catch (error) {
      showToast('error', `Failed to load schema: ${error.message}`);
    }
  };

  // Load data with current filters
  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        per_page: pagination.per_page,
        include_inactive: includeInactive,
        ...(searchTerm && { search: searchTerm }),
        ...(sortConfig.key && { 
          sort_by: sortConfig.key,
          sort_order: sortConfig.direction 
        })
      });

      const response = await apiCall(`/api/masters/${masterType}?${params}`);
      
      if (response.success) {
        setRecords(response.records || []);
        // FIXED: Properly handle pagination response
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            ...response.pagination,
            // Calculate has_next and has_prev if not provided
            has_next: response.pagination.has_next !== undefined ? 
              response.pagination.has_next : 
              response.pagination.page < response.pagination.pages,
            has_prev: response.pagination.has_prev !== undefined ? 
              response.pagination.has_prev : 
              response.pagination.page > 1,
            total_pages: response.pagination.pages || response.pagination.total_pages || 
              Math.ceil((response.pagination.total || response.pagination.total_count || 0) / prev.per_page)
          }));
        }
      }
    } catch (error) {
      showToast('error', `Failed to load data: ${error.message}`);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  // Handle sort
  const handleSort = (columnKey) => {
    setSortConfig(prev => ({
      key: columnKey,
      direction: prev.key === columnKey && prev.direction === 'ASC' ? 'DESC' : 'ASC'
    }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // ADDED: Handle items per page change
  const handlePerPageChange = (newPerPage) => {
    setPagination(prev => ({ 
      ...prev, 
      per_page: parseInt(newPerPage),
      page: 1 // Reset to first page when changing items per page
    }));
  };

  // Check dependencies before delete
  const checkDependencies = async (record) => {
    // NEW: Check if it's a system UOM
    if (masterType === 'uom' && record.is_system) {
      showToast('error', 'System UOMs cannot be deleted');
      return;
    }

    setDeleteModal({ 
      show: true, 
      record, 
      dependencies: null, 
      checking: true 
    });

    try {
      const id = record[schema.primary_key];
      const response = await apiCall(`/api/masters/${masterType}/${id}/dependencies`);
      
      setDeleteModal(prev => ({
        ...prev,
        checking: false,
        dependencies: response.dependencies || {}
      }));
    } catch (error) {
      showToast('error', `Failed to check dependencies: ${error.message}`);
      setDeleteModal({ show: false, record: null, dependencies: null, checking: false });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteModal.record || !schema) return;

    const id = deleteModal.record[schema.primary_key];
    
    try {
      const response = await apiCall(`/api/masters/${masterType}/${id}`, {
        method: 'DELETE'
      });

      if (response.success) {
        showToast('success', response.message || 'Record deleted successfully');
        setDeleteModal({ show: false, record: null, dependencies: null, checking: false });
        loadData(); // Refresh data
      }
    } catch (error) {
      showToast('error', `Failed to delete: ${error.message}`);
    }
  };

  // Handle restore
  const handleRestore = async (record) => {
    if (!schema) return;

    const id = record[schema.primary_key];
    
    try {
      const response = await apiCall(`/api/masters/${masterType}/${id}/restore`, {
        method: 'POST'
      });

      if (response.success) {
        showToast('success', 'Record restored successfully');
        loadData(); // Refresh data
      }
    } catch (error) {
      showToast('error', `Failed to restore: ${error.message}`);
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        include_inactive: includeInactive,
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(
        `${API_BASE_URL}/api/masters/${masterType}/export?${params}`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get filename from content-disposition header or use default
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : `${masterType}_export_${new Date().toISOString().split('T')[0]}.csv`;

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast('success', 'Export completed successfully');
    } catch (error) {
      showToast('error', `Export failed: ${error.message}`);
    }
  };

  // Show toast message
  const showToast = (type, text) => {
    setMessage({ type, text });
    // For now using alert, can be replaced with proper toast library
    if (type === 'error') {
      alert(`Error: ${text}`);
    } else if (type === 'success') {
      alert(text);
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // Format field value for display - UPDATED: Added handling for UOM fields
  const formatFieldValue = (value, fieldName) => {
    if (value === null || value === undefined) return '-';
    
    // Handle boolean values
    if (typeof value === 'boolean') {
      return value ? '✅' : '❌';
    }
    
    // Handle is_active field specially
    if (fieldName === 'is_active') {
      return value ? 
        <span className="masters-status-badge masters-status-active">✅ Active</span> :
        <span className="masters-status-badge masters-status-inactive">❌ Inactive</span>;
    }
    
    // NEW: Handle is_system field for UOM
    if (fieldName === 'is_system') {
      return value ? 
        <span className="masters-status-badge" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>🔒 System</span> :
        <span className="masters-status-badge" style={{ backgroundColor: '#e0e7ff', color: '#3730a3' }}>✏️ Custom</span>;
    }
    
    // Handle currency fields
    if (fieldName.includes('cost') || fieldName.includes('rate') || fieldName.includes('price')) {
      return typeof value === 'number' ? `₹${value.toFixed(2)}` : value;
    }
    
    // Handle GST rate
    if (fieldName === 'gst_rate') {
      return `${value}%`;
    }
    
    // Handle arrays (for BOM category mapping)
    if (Array.isArray(value)) {
      return value.join(', ') || '-';
    }
    
    return value;
  };

  // Get visible columns
  const getVisibleColumns = () => {
    if (!masterDisplayConfig[masterType]) return [];
    return masterDisplayConfig[masterType].columns;
  };

  // Render sort indicator
  const renderSortIndicator = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <span className="masters-sort-indicator">↕️</span>;
    }
    return sortConfig.direction === 'ASC' ? 
      <span className="masters-sort-indicator active-asc">↑</span> : 
      <span className="masters-sort-indicator active-desc">↓</span>;
  };

  // Get column label - UPDATED: Added labels for UOM fields
  const getColumnLabel = (columnKey) => {
    if (columnKey === 'is_active') return 'Status';
    if (columnKey === 'is_system') return 'Type';
    if (columnKey === 'uom_code') return 'Code';
    if (columnKey === 'uom_name') return 'Name';
    if (columnKey === 'uom_symbol') return 'Symbol';
    if (columnKey === 'uom_category') return 'Category';
    if (columnKey === 'display_order') return 'Order';
    return columnKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // NEW: Check if record can be edited (for system UOMs)
  const canEdit = (record) => {
    // System UOMs have restricted editing
    if (masterType === 'uom' && record.is_system) {
      return true; // Still allow editing, but form will restrict fields
    }
    return true;
  };

  // NEW: Check if record can be deleted
  const canDelete = (record) => {
    // System UOMs cannot be deleted
    if (masterType === 'uom' && record.is_system) {
      return false;
    }
    return record.is_active;
  };

  return (
    <div className="masters-list-container">
      {/* Header Section */}
      <div className="masters-list-header">
        <div className="masters-list-header-content">
          <h2 className="masters-list-title">
            {masterDisplayConfig[masterType]?.icon} {masterType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </h2>
          
          <div className="masters-list-controls">
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={handleSearch}
              className="masters-search-input"
            />
            
            {/* Include Inactive Toggle */}
            <label className="masters-filter-checkbox">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => {
                  setIncludeInactive(e.target.checked);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
              />
              <span>Show Inactive</span>
            </label>
            
            {/* Action Buttons */}
            <button
              onClick={onAdd}
              className="masters-btn-add"
            >
              + Add New
            </button>
            
            <button
              onClick={handleExport}
              className="masters-btn-export"
            >
              📥 Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="masters-table-wrapper">
        {loading ? (
          <div className="masters-loading">
            <div className="masters-loading-spinner"></div>
          </div>
        ) : records.length === 0 ? (
          <div className="masters-empty">
            <div className="masters-empty-icon">📋</div>
            <div className="masters-empty-text">
              {searchTerm ? 'No records found matching your search' : 'No records found'}
            </div>
          </div>
        ) : (
          <>
            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table className="masters-table">
                <thead>
                  <tr>
                    {getVisibleColumns().map(column => (
                      <th
                        key={column}
                        onClick={() => handleSort(column)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {getColumnLabel(column)}
                          {renderSortIndicator(column)}
                        </div>
                      </th>
                    ))}
                    <th style={{ textAlign: 'right' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, index) => (
                    <tr key={record[schema?.primary_key] || index}>
                      {getVisibleColumns().map(column => (
                        <td key={column}>
                          {formatFieldValue(record[column], column)}
                        </td>
                      ))}
                      <td>
                        <div className="masters-actions">
                          <button
                            onClick={() => onEdit(record)}
                            className="masters-btn-edit"
                            title={masterType === 'uom' && record.is_system ? "Edit (Limited)" : "Edit"}
                          >
                            ✏️
                          </button>
                          
                          {record.is_active ? (
                            canDelete(record) ? (
                              <button
                                onClick={() => checkDependencies(record)}
                                className="masters-btn-delete"
                                title="Delete"
                              >
                                🗑️
                              </button>
                            ) : (
                              <button
                                className="masters-btn-delete"
                                title="System UOM - Cannot Delete"
                                style={{ opacity: 0.5, cursor: 'not-allowed' }}
                                disabled
                              >
                                🔒
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => handleRestore(record)}
                              className="masters-btn-edit"
                              title="Restore"
                              style={{ color: '#10b981', borderColor: '#10b981' }}
                            >
                              ♻️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* FIXED: Pagination - Always show pagination controls */}
            <div className="masters-pagination">
              <div className="masters-pagination-info" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div>
                  Showing page <span style={{ fontWeight: '600' }}>{pagination.page || 1}</span> of{' '}
                  <span style={{ fontWeight: '600' }}>{pagination.total_pages || 1}</span> |
                  Total <span style={{ fontWeight: '600' }}>{pagination.total_count || pagination.total || records.length}</span> records
                </div>
                
                {/* ADDED: Items per page selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '14px', color: '#6b7280' }}>Show:</label>
                  <select
                    value={pagination.per_page}
                    onChange={(e) => handlePerPageChange(e.target.value)}
                    style={{
                      padding: '4px 8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="999">All</option>
                  </select>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>per page</span>
                </div>
              </div>
              
              <div className="masters-pagination-controls">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={pagination.page === 1}
                  className="masters-pagination-btn"
                >
                  First
                </button>
                <button
                  onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
                  disabled={pagination.page <= 1}
                  className="masters-pagination-btn"
                >
                  Previous
                </button>
                
                {/* ADDED: Page number display */}
                {pagination.total_pages > 1 && (
                  <span style={{ 
                    padding: '4px 12px', 
                    fontSize: '14px',
                    color: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {/* Show page numbers for quick navigation */}
                    {[...Array(Math.min(5, pagination.total_pages))].map((_, i) => {
                      let pageNum;
                      if (pagination.total_pages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.total_pages - 2) {
                        pageNum = pagination.total_pages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }
                      
                      if (pageNum < 1 || pageNum > pagination.total_pages) return null;
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className="masters-pagination-btn"
                          style={{
                            backgroundColor: pageNum === pagination.page ? '#2563eb' : 'white',
                            color: pageNum === pagination.page ? 'white' : '#374151',
                            fontWeight: pageNum === pagination.page ? '600' : '400',
                            minWidth: '32px'
                          }}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </span>
                )}
                
                <button
                  onClick={() => handlePageChange(Math.min(pagination.total_pages || 1, pagination.page + 1))}
                  disabled={pagination.page >= (pagination.total_pages || 1)}
                  className="masters-pagination-btn"
                >
                  Next
                </button>
                <button
                  onClick={() => handlePageChange(pagination.total_pages || 1)}
                  disabled={pagination.page === (pagination.total_pages || 1)}
                  className="masters-pagination-btn"
                >
                  Last
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="masters-modal-overlay">
          <div className="masters-form-container" style={{ maxWidth: '400px' }}>
            <div className="masters-form-header">
              <h3 className="masters-form-title">
                Confirm Delete
              </h3>
            </div>
            
            <div className="masters-form-body">
              {deleteModal.checking ? (
                <div style={{ padding: '12px 0' }}>
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>Checking dependencies...</p>
                </div>
              ) : (
                <div style={{ padding: '12px 0' }}>
                  {Object.keys(deleteModal.dependencies || {}).length > 0 ? (
                    <>
                      <p style={{ color: '#dc2626', fontSize: '14px', marginBottom: '8px' }}>
                        ⚠️ This record has dependencies and will be soft deleted:
                      </p>
                      <ul style={{ fontSize: '14px', color: '#4b5563', listStyle: 'disc', paddingLeft: '20px' }}>
                        {Object.entries(deleteModal.dependencies).map(([key, value]) => (
                          <li key={key}>
                            {key.replace(/_/g, ' ')}: {value} record(s)
                          </li>
                        ))}
                      </ul>
                      <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
                        The record will be marked as inactive and can be restored later.
                      </p>
                    </>
                  ) : (
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>
                      This record has no dependencies and will be permanently deleted.
                      Are you sure you want to continue?
                    </p>
                  )}
                </div>
              )}
            </div>
            
            <div className="masters-form-footer">
              <button
                onClick={() => setDeleteModal({ show: false, record: null, dependencies: null, checking: false })}
                className="masters-btn masters-btn-secondary"
              >
                Cancel
              </button>
              {!deleteModal.checking && (
                <button
                  onClick={handleDelete}
                  className="masters-btn masters-btn-danger"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MastersList;
