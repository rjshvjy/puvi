// SKU Master Management Component with MRP and Shelf Life
// File Path: puvi-frontend/src/modules/SKUManagement/components/SKUMaster.js

import React, { useState, useEffect } from 'react';

const SKUMaster = () => {
  // State management
  const [skuList, setSKUList] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedSKU, setSelectedSKU] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    sku_code: '',
    product_name: '',
    oil_type: 'Groundnut',
    package_size: '1L',
    density: 0.92,
    mrp_current: '',
    shelf_life_months: 12,
    mrp_effective_date: new Date().toISOString().split('T')[0],
    is_active: true
  });
  
  // Validation errors
  const [errors, setErrors] = useState({});
  
  // Search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOilType, setFilterOilType] = useState('');
  const [filterPackageSize, setFilterPackageSize] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Constants
  const oilTypes = ['Groundnut', 'Sesame', 'Coconut', 'Mustard', 'Sunflower'];
  const packageSizes = ['200ml', '500ml', '1L', '2L', '5L', '15L'];
  const maxMRP = 10000;

  useEffect(() => {
    fetchSKUs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filterOilType, filterPackageSize, filterActive, skuList]);

  const fetchSKUs = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://puvi-backend.onrender.com/api/sku/master');
      if (!response.ok) throw new Error('Failed to fetch SKUs');
      
      const data = await response.json();
      
      if (data.success) {
        setSKUList(data.skus || []);
      } else {
        throw new Error(data.error || 'Failed to fetch SKUs');
      }
    } catch (error) {
      console.error('Error fetching SKUs:', error);
      setMessage({ type: 'error', text: error.message });
      setSKUList([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...skuList];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(sku => 
        sku.sku_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sku.product_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Oil type filter
    if (filterOilType) {
      filtered = filtered.filter(sku => sku.oil_type === filterOilType);
    }
    
    // Package size filter
    if (filterPackageSize) {
      filtered = filtered.filter(sku => sku.package_size === filterPackageSize);
    }
    
    // Active status filter
    if (filterActive !== 'all') {
      filtered = filtered.filter(sku => 
        filterActive === 'active' ? sku.is_active : !sku.is_active
      );
    }
    
    setFilteredList(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const validateForm = () => {
    const newErrors = {};
    
    // SKU Code validation
    if (!formData.sku_code.trim()) {
      newErrors.sku_code = 'SKU Code is required';
    } else if (modalMode === 'add') {
      // Check for duplicate SKU code only in add mode
      const duplicate = skuList.find(s => 
        s.sku_code.toLowerCase() === formData.sku_code.toLowerCase()
      );
      if (duplicate) {
        newErrors.sku_code = 'SKU Code already exists';
      }
    }
    
    // Product name validation
    if (!formData.product_name.trim()) {
      newErrors.product_name = 'Product Name is required';
    }
    
    // MRP validation
    const mrp = parseFloat(formData.mrp_current);
    if (!formData.mrp_current) {
      newErrors.mrp_current = 'MRP is required';
    } else if (isNaN(mrp) || mrp <= 0) {
      newErrors.mrp_current = 'MRP must be a positive number';
    } else if (mrp > maxMRP) {
      newErrors.mrp_current = `MRP cannot exceed ₹${maxMRP}`;
    }
    
    // Shelf life validation
    const shelfLife = parseInt(formData.shelf_life_months);
    if (!formData.shelf_life_months) {
      newErrors.shelf_life_months = 'Shelf Life is required';
    } else if (isNaN(shelfLife) || shelfLife < 1 || shelfLife > 60) {
      newErrors.shelf_life_months = 'Shelf Life must be between 1 and 60 months';
    }
    
    // Density validation
    const density = parseFloat(formData.density);
    if (!formData.density) {
      newErrors.density = 'Density is required';
    } else if (isNaN(density) || density <= 0 || density > 2) {
      newErrors.density = 'Density must be between 0 and 2';
    }
    
    // MRP Effective Date validation
    if (!formData.mrp_effective_date) {
      newErrors.mrp_effective_date = 'MRP Effective Date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenModal = (mode, sku = null) => {
    setModalMode(mode);
    setShowModal(true);
    setErrors({});
    
    if (mode === 'edit' && sku) {
      setSelectedSKU(sku);
      setFormData({
        sku_code: sku.sku_code,
        product_name: sku.product_name,
        oil_type: sku.oil_type,
        package_size: sku.package_size,
        density: sku.density || 0.92,
        mrp_current: sku.mrp_current || '',
        shelf_life_months: sku.shelf_life_months || 12,
        mrp_effective_date: sku.mrp_effective_date || new Date().toISOString().split('T')[0],
        is_active: sku.is_active !== undefined ? sku.is_active : true
      });
    } else {
      setSelectedSKU(null);
      setFormData({
        sku_code: '',
        product_name: '',
        oil_type: 'Groundnut',
        package_size: '1L',
        density: 0.92,
        mrp_current: '',
        shelf_life_months: 12,
        mrp_effective_date: new Date().toISOString().split('T')[0],
        is_active: true
      });
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedSKU(null);
    setErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      const url = modalMode === 'add'
        ? 'https://puvi-backend.onrender.com/api/sku/master'
        : `https://puvi-backend.onrender.com/api/sku/master/${selectedSKU.sku_id}`;
      
      const method = modalMode === 'add' ? 'POST' : 'PUT';
      
      // Prepare data for submission
      const submitData = {
        ...formData,
        mrp_current: parseFloat(formData.mrp_current),
        shelf_life_months: parseInt(formData.shelf_life_months),
        density: parseFloat(formData.density)
      };
      
      // Add change reason for MRP updates
      if (modalMode === 'edit' && selectedSKU && 
          parseFloat(formData.mrp_current) !== parseFloat(selectedSKU.mrp_current)) {
        submitData.change_reason = 'MRP Update via SKU Master';
        submitData.changed_by = 'User'; // In production, get from auth context
      }
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setMessage({
          type: 'success',
          text: modalMode === 'add' 
            ? 'SKU created successfully' 
            : 'SKU updated successfully'
        });
        handleCloseModal();
        fetchSKUs(); // Refresh the list
      } else {
        throw new Error(data.error || 'Failed to save SKU');
      }
    } catch (error) {
      console.error('Error saving SKU:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (sku) => {
    setDeleteTarget(sku);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    
    setLoading(true);
    try {
      // For now, we'll just deactivate instead of deleting
      const response = await fetch(
        `https://puvi-backend.onrender.com/api/sku/master/${deleteTarget.sku_id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...deleteTarget, is_active: false })
        }
      );
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setMessage({ type: 'success', text: 'SKU deactivated successfully' });
        fetchSKUs();
      } else {
        throw new Error(data.error || 'Failed to deactivate SKU');
      }
    } catch (error) {
      console.error('Error deactivating SKU:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterOilType('');
    setFilterPackageSize('');
    setFilterActive('all');
  };

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredList.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredList.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Generate shelf life options (1-60 months)
  const shelfLifeOptions = Array.from({ length: 60 }, (_, i) => i + 1);

  return (
    <div className="sku-master">
      <div className="header-section">
        <h2>SKU Master Management</h2>
        <button className="btn-primary" onClick={() => handleOpenModal('add')}>
          + Add New SKU
        </button>
      </div>

      {message.text && (
        <div className={`alert ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="close-alert">×</button>
        </div>
      )}

      {/* Filters Section */}
      <div className="filters-section">
        <div className="filter-row">
          <div className="filter-group search-group">
            <input
              type="text"
              placeholder="Search by SKU Code or Product Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-group">
            <select
              value={filterOilType}
              onChange={(e) => setFilterOilType(e.target.value)}
            >
              <option value="">All Oil Types</option>
              {oilTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <select
              value={filterPackageSize}
              onChange={(e) => setFilterPackageSize(e.target.value)}
            >
              <option value="">All Sizes</option>
              {packageSizes.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
          
          <button className="btn-secondary" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      </div>

      {/* SKU Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading">Loading SKUs...</div>
        ) : (
          <>
            <table className="sku-table">
              <thead>
                <tr>
                  <th>SKU Code</th>
                  <th>Product Name</th>
                  <th>Oil Type</th>
                  <th>Package Size</th>
                  <th>MRP (₹)</th>
                  <th>Shelf Life</th>
                  <th>Density</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="empty-cell">
                      {searchTerm || filterOilType || filterPackageSize || filterActive !== 'all'
                        ? 'No SKUs match the current filters'
                        : 'No SKUs found. Add your first SKU to get started.'}
                    </td>
                  </tr>
                ) : (
                  currentItems.map(sku => (
                    <tr key={sku.sku_id}>
                      <td className="code-cell">{sku.sku_code}</td>
                      <td>{sku.product_name}</td>
                      <td>{sku.oil_type}</td>
                      <td>{sku.package_size}</td>
                      <td className="number-cell">₹{sku.mrp_current || 'N/A'}</td>
                      <td>{sku.shelf_life_months || 'N/A'} months</td>
                      <td className="number-cell">{sku.density || 0.92}</td>
                      <td>
                        <span className={`status-badge ${sku.is_active ? 'active' : 'inactive'}`}>
                          {sku.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button
                          className="btn-edit"
                          onClick={() => handleOpenModal('edit', sku)}
                          title="Edit SKU"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(sku)}
                          title="Deactivate SKU"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  Previous
                </button>
                
                <span className="pagination-info">
                  Page {currentPage} of {totalPages} | Total: {filteredList.length} SKUs
                </span>
                
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{modalMode === 'add' ? 'Add New SKU' : 'Edit SKU'}</h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>SKU Code <span className="required">*</span></label>
                  <input
                    type="text"
                    name="sku_code"
                    value={formData.sku_code}
                    onChange={handleInputChange}
                    disabled={modalMode === 'edit'}
                    className={errors.sku_code ? 'error' : ''}
                  />
                  {errors.sku_code && <span className="error-text">{errors.sku_code}</span>}
                </div>
                
                <div className="form-group">
                  <label>Product Name <span className="required">*</span></label>
                  <input
                    type="text"
                    name="product_name"
                    value={formData.product_name}
                    onChange={handleInputChange}
                    className={errors.product_name ? 'error' : ''}
                  />
                  {errors.product_name && <span className="error-text">{errors.product_name}</span>}
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Oil Type <span className="required">*</span></label>
                  <select
                    name="oil_type"
                    value={formData.oil_type}
                    onChange={handleInputChange}
                  >
                    {oilTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Package Size <span className="required">*</span></label>
                  <select
                    name="package_size"
                    value={formData.package_size}
                    onChange={handleInputChange}
                  >
                    {packageSizes.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>MRP (₹) <span className="required">*</span></label>
                  <input
                    type="number"
                    name="mrp_current"
                    value={formData.mrp_current}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    max={maxMRP}
                    className={errors.mrp_current ? 'error' : ''}
                  />
                  {errors.mrp_current && <span className="error-text">{errors.mrp_current}</span>}
                  {modalMode === 'edit' && selectedSKU && 
                   parseFloat(formData.mrp_current) !== parseFloat(selectedSKU.mrp_current) && (
                    <span className="info-text">MRP change will be tracked in history</span>
                  )}
                </div>
                
                <div className="form-group">
                  <label>Shelf Life (months) <span className="required">*</span></label>
                  <select
                    name="shelf_life_months"
                    value={formData.shelf_life_months}
                    onChange={handleInputChange}
                    className={errors.shelf_life_months ? 'error' : ''}
                  >
                    {shelfLifeOptions.map(month => (
                      <option key={month} value={month}>
                        {month} {month === 1 ? 'month' : 'months'}
                      </option>
                    ))}
                  </select>
                  {errors.shelf_life_months && <span className="error-text">{errors.shelf_life_months}</span>}
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Density (kg/L) <span className="required">*</span></label>
                  <input
                    type="number"
                    name="density"
                    value={formData.density}
                    onChange={handleInputChange}
                    step="0.001"
                    min="0"
                    max="2"
                    className={errors.density ? 'error' : ''}
                  />
                  {errors.density && <span className="error-text">{errors.density}</span>}
                </div>
                
                <div className="form-group">
                  <label>MRP Effective Date <span className="required">*</span></label>
                  <input
                    type="date"
                    name="mrp_effective_date"
                    value={formData.mrp_effective_date}
                    onChange={handleInputChange}
                    className={errors.mrp_effective_date ? 'error' : ''}
                  />
                  {errors.mrp_effective_date && <span className="error-text">{errors.mrp_effective_date}</span>}
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                    />
                    Active Status
                  </label>
                  <span className="info-text">
                    Inactive SKUs cannot be used in production
                  </span>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : (modalMode === 'add' ? 'Create SKU' : 'Update SKU')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content small">
            <div className="modal-header">
              <h3>Confirm Deactivation</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to deactivate this SKU?</p>
              <p><strong>{deleteTarget?.sku_code} - {deleteTarget?.product_name}</strong></p>
              <p className="warning-text">This SKU will no longer be available for production.</p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-cancel" 
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-danger" 
                onClick={confirmDelete}
                disabled={loading}
              >
                {loading ? 'Deactivating...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .sku-master {
          padding: 20px;
        }

        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .header-section h2 {
          margin: 0;
          color: #2c3e50;
        }

        .alert {
          padding: 12px 40px 12px 20px;
          border-radius: 4px;
          margin-bottom: 20px;
          position: relative;
        }

        .alert.success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .alert.error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .close-alert {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: inherit;
        }

        .filters-section {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 6px;
          margin-bottom: 20px;
        }

        .filter-row {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
          align-items: center;
        }

        .filter-group {
          flex: 1;
          min-width: 150px;
        }

        .search-group {
          flex: 2;
        }

        .filter-group input,
        .filter-group select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .search-input {
          width: 100%;
        }

        .table-container {
          background: white;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .sku-table {
          width: 100%;
          border-collapse: collapse;
        }

        .sku-table th,
        .sku-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e0e0e0;
        }

        .sku-table th {
          background: #f5f5f5;
          font-weight: 600;
          color: #555;
          font-size: 14px;
        }

        .sku-table tbody tr:hover {
          background: #f8f9fa;
        }

        .code-cell {
          font-family: monospace;
          font-weight: 500;
        }

        .number-cell {
          text-align: right;
        }

        .status-badge {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-badge.active {
          background: #d4edda;
          color: #155724;
        }

        .status-badge.inactive {
          background: #f8d7da;
          color: #721c24;
        }

        .actions-cell {
          display: flex;
          gap: 8px;
        }

        .btn-edit,
        .btn-delete {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .btn-edit:hover {
          background: #e3f2fd;
        }

        .btn-delete:hover {
          background: #ffebee;
        }

        .empty-cell {
          text-align: center;
          color: #999;
          font-style: italic;
          padding: 40px;
        }

        .loading {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 20px;
          padding: 20px;
          background: #f8f9fa;
        }

        .pagination-btn {
          padding: 8px 16px;
          background: #2196F3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }

        .pagination-btn:hover:not(:disabled) {
          background: #1976D2;
        }

        .pagination-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .pagination-info {
          color: #666;
          font-size: 14px;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 700px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-content.small {
          max-width: 500px;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e0e0e0;
        }

        .modal-header h3 {
          margin: 0;
          color: #2c3e50;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: #999;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          color: #333;
        }

        .modal-body {
          padding: 20px;
        }

        .form-row {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
        }

        .form-group {
          flex: 1;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          color: #555;
          font-weight: 500;
          font-size: 14px;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .form-group input.error,
        .form-group select.error {
          border-color: #f44336;
        }

        .required {
          color: #f44336;
        }

        .error-text {
          color: #f44336;
          font-size: 12px;
          margin-top: 4px;
          display: block;
        }

        .info-text {
          color: #2196F3;
          font-size: 12px;
          margin-top: 4px;
          display: block;
        }

        .warning-text {
          color: #ff9800;
          font-size: 14px;
          margin-top: 10px;
        }

        .checkbox-group {
          display: flex;
          flex-direction: column;
        }

        .checkbox-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 20px;
          border-top: 1px solid #e0e0e0;
        }

        .btn-primary,
        .btn-secondary,
        .btn-cancel,
        .btn-danger {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          transition: background 0.2s;
        }

        .btn-primary {
          background: #4CAF50;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #45a049;
        }

        .btn-secondary {
          background: #607d8b;
          color: white;
        }

        .btn-secondary:hover {
          background: #546e7a;
        }

        .btn-cancel {
          background: #f5f5f5;
          color: #333;
        }

        .btn-cancel:hover {
          background: #e0e0e0;
        }

        .btn-danger {
          background: #f44336;
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background: #d32f2f;
        }

        .btn-primary:disabled,
        .btn-danger:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .filter-row {
            flex-direction: column;
          }
          
          .form-row {
            flex-direction: column;
          }
          
          .modal-content {
            width: 95%;
          }
        }
      `}</style>
    </div>
  );
};

export default SKUMaster;
