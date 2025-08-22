// File Path: puvi-frontend/puvi-frontend-main/src/modules/MastersManagement/components/PackageSizeManager.js
// Package Size Manager Component with CRUD operations and auto packing cost element creation
// Follows the pattern of existing masters components in the system

import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../MastersManagement.css';

const PackageSizeManager = () => {
  // State management
  const [packageSizes, setPackageSizes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedSize, setSelectedSize] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    size_code: '',
    size_name: '',
    size_in_ml: '',
    display_order: 999,
    default_packing_rate: 1.00,
    is_active: true
  });
  
  // Validation errors
  const [errors, setErrors] = useState({});
  
  // Search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  
  // Delete confirmation
  const [deleteModal, setDeleteModal] = useState({
    show: false,
    size: null,
    checking: false
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Load package sizes on mount and when filters change
  useEffect(() => {
    loadPackageSizes();
  }, [includeInactive]);

  // Load package sizes from API
  const loadPackageSizes = async () => {
    setLoading(true);
    try {
      const response = await api.masters.getPackageSizes(includeInactive);
      if (response.success) {
        setPackageSizes(response.package_sizes || []);
      }
    } catch (error) {
      showMessage('error', 'Failed to load package sizes: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Show message helper
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // Filter package sizes based on search
  const filteredSizes = packageSizes.filter(size => 
    size.size_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    size.size_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSizes.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSizes.length / itemsPerPage);

  // Open add modal
  const handleAdd = () => {
    setFormData({
      size_code: '',
      size_name: '',
      size_in_ml: '',
      display_order: 999,
      default_packing_rate: 1.00,
      is_active: true
    });
    setErrors({});
    setModalMode('add');
    setShowModal(true);
  };

  // Open edit modal
  const handleEdit = (size) => {
    setFormData({
      size_code: size.size_code,
      size_name: size.size_name,
      size_in_ml: size.size_in_ml,
      display_order: size.display_order || 999,
      default_packing_rate: size.cost_element?.default_rate || 1.00,
      is_active: size.is_active
    });
    setErrors({});
    setSelectedSize(size);
    setModalMode('edit');
    setShowModal(true);
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.size_code) {
      newErrors.size_code = 'Size code is required';
    }
    if (!formData.size_name) {
      newErrors.size_name = 'Size name is required';
    }
    if (!formData.size_in_ml || formData.size_in_ml <= 0) {
      newErrors.size_in_ml = 'Size in ml must be greater than 0';
    }
    if (formData.default_packing_rate < 0) {
      newErrors.default_packing_rate = 'Packing rate cannot be negative';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save (create or update)
  const handleSave = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      let response;
      if (modalMode === 'add') {
        response = await api.masters.createPackageSize(formData);
      } else {
        response = await api.masters.updatePackageSize(selectedSize.size_id, formData);
      }
      
      if (response.success) {
        showMessage('success', response.message || `Package size ${modalMode === 'add' ? 'created' : 'updated'} successfully`);
        setShowModal(false);
        loadPackageSizes();
      }
    } catch (error) {
      showMessage('error', 'Failed to save: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete confirmation
  const handleDeleteClick = (size) => {
    setDeleteModal({
      show: true,
      size: size,
      checking: false
    });
  };

  // Perform delete
  const handleDelete = async () => {
    if (!deleteModal.size) return;
    
    setLoading(true);
    try {
      const response = await api.masters.deletePackageSize(deleteModal.size.size_id);
      if (response.success) {
        showMessage('success', response.message || 'Package size deleted successfully');
        setDeleteModal({ show: false, size: null, checking: false });
        loadPackageSizes();
      }
    } catch (error) {
      showMessage('error', 'Failed to delete: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Bulk update display order
  const handleBulkOrderUpdate = async () => {
    const updates = packageSizes.map((size, index) => ({
      size_id: size.size_id,
      display_order: index + 1
    }));
    
    try {
      const response = await api.masters.bulkUpdatePackageSizes(updates);
      if (response.success) {
        showMessage('success', 'Display order updated successfully');
        loadPackageSizes();
      }
    } catch (error) {
      showMessage('error', 'Failed to update order: ' + error.message);
    }
  };

  return (
    <div className="masters-list-container">
      {/* Header with title and controls */}
      <div className="masters-list-header">
        <div className="masters-list-header-content">
          <div>
            <h2 className="masters-list-title">Package Sizes</h2>
            <p className="masters-list-subtitle">
              Manage package sizes and their linked packing cost elements
            </p>
          </div>
          
          <div className="masters-list-controls">
            {/* Search */}
            <div className="masters-search">
              <input
                type="text"
                placeholder="Search package sizes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="masters-search-input"
              />
            </div>
            
            {/* Include Inactive Filter */}
            <div className="masters-filter">
              <label className="masters-checkbox-label">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(e) => setIncludeInactive(e.target.checked)}
                  className="masters-checkbox"
                />
                Show Inactive
              </label>
            </div>
            
            {/* Actions */}
            <div className="masters-actions-group">
              <button
                onClick={handleBulkOrderUpdate}
                className="masters-btn masters-btn-secondary"
                title="Update display order based on current sort"
              >
                Update Order
              </button>
              <button
                onClick={handleAdd}
                className="masters-btn masters-btn-primary"
              >
                + Add Package Size
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Message display */}
      {message.text && (
        <div className={`masters-message masters-message-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Table */}
      <div className="masters-table-wrapper">
        {loading ? (
          <div className="masters-loading">
            <div className="masters-loading-spinner"></div>
            <p>Loading package sizes...</p>
          </div>
        ) : currentItems.length === 0 ? (
          <div className="masters-empty">
            <div className="masters-empty-icon">📦</div>
            <div className="masters-empty-text">
              {searchTerm ? 'No package sizes found matching your search' : 'No package sizes found'}
            </div>
            <div className="masters-empty-subtext">
              Click "Add Package Size" to create your first package size
            </div>
          </div>
        ) : (
          <table className="masters-table">
            <thead>
              <tr>
                <th>Size Code</th>
                <th>Size Name</th>
                <th>Size (ml)</th>
                <th>Size (L)</th>
                <th>Packing Cost Element</th>
                <th>Rate (₹/unit)</th>
                <th>Display Order</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((size) => (
                <tr key={size.size_id}>
                  <td style={{ fontWeight: '600' }}>{size.size_code}</td>
                  <td>{size.size_name}</td>
                  <td>{size.size_in_ml}</td>
                  <td>{size.size_in_liters}L</td>
                  <td>
                    {size.cost_element ? (
                      <span style={{ color: '#059669' }}>
                        {size.cost_element.element_name}
                      </span>
                    ) : (
                      <span style={{ color: '#ef4444' }}>Not Configured</span>
                    )}
                  </td>
                  <td>
                    {size.cost_element ? (
                      `₹${size.cost_element.default_rate}`
                    ) : '-'}
                  </td>
                  <td>{size.display_order}</td>
                  <td>
                    <span className={`masters-status-badge masters-status-${size.is_active ? 'active' : 'inactive'}`}>
                      {size.is_active ? '✓ Active' : '✗ Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="masters-actions">
                      <button
                        onClick={() => handleEdit(size)}
                        className="masters-btn-edit"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteClick(size)}
                        className="masters-btn-delete"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="masters-pagination">
          <div className="masters-pagination-info">
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredSizes.length)} of {filteredSizes.length} entries
          </div>
          <div className="masters-pagination-controls">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="masters-pagination-btn"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="masters-pagination-btn"
            >
              Previous
            </button>
            <span className="masters-pagination-pages">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="masters-pagination-btn"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="masters-pagination-btn"
            >
              Last
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="masters-modal-overlay">
          <div className="masters-form-container">
            <div className="masters-form-header">
              <h3 className="masters-form-title">
                {modalMode === 'add' ? 'Add New Package Size' : 'Edit Package Size'}
              </h3>
            </div>
            
            <div className="masters-form-body">
              <div className="masters-form-group">
                <label className="masters-form-label">
                  Size Code <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.size_code}
                  onChange={(e) => setFormData({ ...formData, size_code: e.target.value.toUpperCase() })}
                  className={`masters-form-input ${errors.size_code ? 'error' : ''}`}
                  placeholder="e.g., 500ML, 1L, 5L"
                  disabled={modalMode === 'edit'}
                />
                {errors.size_code && (
                  <span className="masters-error-text">{errors.size_code}</span>
                )}
              </div>
              
              <div className="masters-form-group">
                <label className="masters-form-label">
                  Size Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.size_name}
                  onChange={(e) => setFormData({ ...formData, size_name: e.target.value })}
                  className={`masters-form-input ${errors.size_name ? 'error' : ''}`}
                  placeholder="e.g., 500 Milliliters, 1 Liter, 5 Liters"
                />
                {errors.size_name && (
                  <span className="masters-error-text">{errors.size_name}</span>
                )}
              </div>
              
              <div className="masters-form-group">
                <label className="masters-form-label">
                  Size in ML <span className="required">*</span>
                </label>
                <input
                  type="number"
                  value={formData.size_in_ml}
                  onChange={(e) => setFormData({ ...formData, size_in_ml: parseInt(e.target.value) || '' })}
                  className={`masters-form-input ${errors.size_in_ml ? 'error' : ''}`}
                  placeholder="e.g., 500, 1000, 5000"
                />
                {errors.size_in_ml && (
                  <span className="masters-error-text">{errors.size_in_ml}</span>
                )}
                {formData.size_in_ml && (
                  <small style={{ color: '#6b7280' }}>
                    = {(formData.size_in_ml / 1000).toFixed(3)} Liters
                  </small>
                )}
              </div>
              
              <div className="masters-form-group">
                <label className="masters-form-label">
                  Default Packing Rate (₹/unit)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.default_packing_rate}
                  onChange={(e) => setFormData({ ...formData, default_packing_rate: parseFloat(e.target.value) || 0 })}
                  className={`masters-form-input ${errors.default_packing_rate ? 'error' : ''}`}
                  placeholder="e.g., 1.50"
                />
                {errors.default_packing_rate && (
                  <span className="masters-error-text">{errors.default_packing_rate}</span>
                )}
                <small style={{ color: '#6b7280' }}>
                  This will be the default rate for the packing cost element
                </small>
              </div>
              
              <div className="masters-form-group">
                <label className="masters-form-label">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className="masters-form-input"
                  placeholder="e.g., 1"
                />
                <small style={{ color: '#6b7280' }}>
                  Lower numbers appear first in dropdowns
                </small>
              </div>
              
              <div className="masters-form-group">
                <label className="masters-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="masters-form-checkbox"
                  />
                  Active
                </label>
              </div>
              
              {modalMode === 'add' && (
                <div className="masters-info-box" style={{ 
                  padding: '12px', 
                  background: '#f0f9ff', 
                  border: '1px solid #0ea5e9',
                  borderRadius: '6px',
                  marginTop: '16px'
                }}>
                  <strong>Note:</strong> Creating a new package size will automatically create a corresponding 
                  packing cost element named "Packing Labour {size_code}" with the specified default rate.
                </div>
              )}
            </div>
            
            <div className="masters-form-footer">
              <button
                onClick={() => setShowModal(false)}
                className="masters-btn masters-btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="masters-btn masters-btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : (modalMode === 'add' ? 'Create' : 'Update')}
              </button>
            </div>
          </div>
        </div>
      )}

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
              <p style={{ marginBottom: '16px' }}>
                Are you sure you want to delete the package size <strong>{deleteModal.size?.size_code}</strong>?
              </p>
              <p style={{ color: '#ef4444', fontSize: '14px' }}>
                Note: If this package size is used in any SKUs, it will be marked as inactive instead of being deleted.
              </p>
            </div>
            
            <div className="masters-form-footer">
              <button
                onClick={() => setDeleteModal({ show: false, size: null, checking: false })}
                className="masters-btn masters-btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="masters-btn masters-btn-danger"
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackageSizeManager;
