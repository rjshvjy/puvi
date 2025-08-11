// MastersList Component - Dynamic table for all master types with CRUD operations
// File Path: puvi-frontend/puvi-frontend-main/src/components/Masters/MastersList.jsx
// Handles display, search, sort, pagination, and dependency management

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
  
  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 10,
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

  // Master type display configuration
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
  }, [pagination.page, sortConfig, includeInactive, searchTerm]);

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
        setPagination(response.pagination || {
          page: 1,
          per_page: 10,
          total_count: 0,
          total_pages: 0,
          has_next: false,
          has_prev: false
        });
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

  // Check dependencies before delete
  const checkDependencies = async (record) => {
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

  // Format field value for display
  const formatFieldValue = (value, fieldName) => {
    if (value === null || value === undefined) return '-';
    
    // Handle boolean values
    if (typeof value === 'boolean') {
      return value ? '✅' : '❌';
    }
    
    // Handle is_active field specially
    if (fieldName === 'is_active') {
      return value ? 
        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">Active</span> :
        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">Inactive</span>;
    }
    
    // Handle currency fields
    if (fieldName.includes('cost') || fieldName.includes('rate') || fieldName.includes('price')) {
      return typeof value === 'number' ? `₹${value.toFixed(2)}` : value;
    }
    
    // Handle GST rate
    if (fieldName === 'gst_rate') {
      return `${value}%`;
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
      return <span className="text-gray-400 ml-1">↕️</span>;
    }
    return sortConfig.direction === 'ASC' ? 
      <span className="text-blue-600 ml-1">↑</span> : 
      <span className="text-blue-600 ml-1">↓</span>;
  };

  // Get column label
  const getColumnLabel = (columnKey) => {
    if (columnKey === 'is_active') return 'Status';
    return columnKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="masters-list-container">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {masterDisplayConfig[masterType]?.icon} {masterType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </h2>
          
          <div className="flex flex-wrap gap-2">
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={handleSearch}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            {/* Include Inactive Toggle */}
            <label className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md cursor-pointer">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => {
                  setIncludeInactive(e.target.checked);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Show Inactive</span>
            </label>
            
            {/* Action Buttons */}
            <button
              onClick={onAdd}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              + Add New
            </button>
            
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              📥 Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : records.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">
              {searchTerm ? 'No records found matching your search' : 'No records found'}
            </div>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {getVisibleColumns().map(column => (
                      <th
                        key={column}
                        onClick={() => handleSort(column)}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      >
                        <div className="flex items-center">
                          {getColumnLabel(column)}
                          {renderSortIndicator(column)}
                        </div>
                      </th>
                    ))}
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.map((record, index) => (
                    <tr key={record[schema?.primary_key] || index} className="hover:bg-gray-50">
                      {getVisibleColumns().map(column => (
                        <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatFieldValue(record[column], column)}
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => onEdit(record)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        
                        {record.is_active ? (
                          <button
                            onClick={() => checkDependencies(record)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRestore(record)}
                            className="text-green-600 hover:text-green-900"
                            title="Restore"
                          >
                            ♻️
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="bg-gray-50 px-4 py-3 flex items-center justify-between sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.has_prev}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.has_next}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing page <span className="font-medium">{pagination.page}</span> of{' '}
                      <span className="font-medium">{pagination.total_pages}</span> |
                      Total <span className="font-medium">{pagination.total_count}</span> records
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => handlePageChange(1)}
                        disabled={pagination.page === 1}
                        className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        First
                      </button>
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={!pagination.has_prev}
                        className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={!pagination.has_next}
                        className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                      <button
                        onClick={() => handlePageChange(pagination.total_pages)}
                        disabled={pagination.page === pagination.total_pages}
                        className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Last
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Confirm Delete
              </h3>
              
              {deleteModal.checking ? (
                <div className="mt-2 py-3">
                  <p className="text-sm text-gray-500">Checking dependencies...</p>
                </div>
              ) : (
                <div className="mt-2 py-3">
                  {Object.keys(deleteModal.dependencies || {}).length > 0 ? (
                    <>
                      <p className="text-sm text-red-600 mb-2">
                        ⚠️ This record has dependencies and will be soft deleted:
                      </p>
                      <ul className="text-sm text-gray-600 list-disc list-inside">
                        {Object.entries(deleteModal.dependencies).map(([key, value]) => (
                          <li key={key}>
                            {key.replace(/_/g, ' ')}: {value} record(s)
                          </li>
                        ))}
                      </ul>
                      <p className="text-sm text-gray-500 mt-2">
                        The record will be marked as inactive and can be restored later.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">
                      This record has no dependencies and will be permanently deleted.
                      Are you sure you want to continue?
                    </p>
                  )}
                </div>
              )}
              
              <div className="items-center px-4 py-3">
                <button
                  onClick={() => setDeleteModal({ show: false, record: null, dependencies: null, checking: false })}
                  className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-24 mr-2 hover:bg-gray-600"
                >
                  Cancel
                </button>
                {!deleteModal.checking && (
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-24 hover:bg-red-700"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MastersList;
