// File Path: puvi-frontend/puvi-frontend-main/src/modules/SKUManagement/components/SKUMaster.js
// ENHANCED VERSION - Includes packaged weight management for cost allocation
// Updated: Weight-based cost allocation support

import React, { useState, useEffect } from 'react';
import api, { skuAPI, configAPI } from '../../../services/api';
import './SKUMaster.css';

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
  
  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  // Oil types and package sizes - NOW BOTH DYNAMIC
  const [oilTypes, setOilTypes] = useState([]);
  const [packageSizes, setPackageSizes] = useState([]);
  const [loadingPackageSizes, setLoadingPackageSizes] = useState(false);
  
  // Form states - ENHANCED with packaged_weight_kg
  const [formData, setFormData] = useState({
    sku_code: '',
    product_name: '',
    oil_type: '',
    package_size: '',
    density: 0.91,
    mrp_current: '',
    shelf_life_months: 9,
    mrp_effective_date: new Date().toISOString().split('T')[0],
    packaged_weight_kg: '', // NEW: Added weight field
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

  // Fetch data on component mount
  useEffect(() => {
    fetchSKUs();
    fetchOilTypes();
    fetchPackageSizes();
  }, []);

  // Apply filters whenever filter values or SKU list changes
  useEffect(() => {
    applyFilters();
  }, [searchTerm, filterOilType, filterPackageSize, filterActive, skuList]);

  // Calculate estimated weight based on package size and density
  const calculateEstimatedWeight = (packageSize, density) => {
    if (!packageSize || !density) return '';
    
    const size = packageSize.toUpperCase();
    let liters = 0;
    
    if (size.includes('ML')) {
      liters = parseFloat(size.replace('ML', '')) / 1000;
    } else if (size.includes('L')) {
      liters = parseFloat(size.replace('L', ''));
    }
    
    if (liters > 0) {
      // Oil weight + 10% for packaging
      const weight = (liters * density * 1.1).toFixed(3);
      return weight;
    }
    
    return '';
  };

  // Handle package size or density change to auto-calculate weight
  const handlePackageSizeOrDensityChange = (e) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    
    // Auto-calculate weight if not manually set
    if (!formData.packaged_weight_kg || formData.packaged_weight_kg === '') {
      const packageSize = name === 'package_size' ? value : formData.package_size;
      const density = name === 'density' ? value : formData.density;
      const estimatedWeight = calculateEstimatedWeight(packageSize, density);
      
      if (estimatedWeight) {
        newFormData.packaged_weight_kg = estimatedWeight;
      }
    }
    
    setFormData(newFormData);
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Fetch package sizes from API
  const fetchPackageSizes = async () => {
    setLoadingPackageSizes(true);
    try {
      const response = await configAPI.getPackageSizes();
      
      if (response.success && response.values && response.values.length > 0) {
        setPackageSizes(response.values);
        
        if (response.values.length > 0 && !formData.package_size) {
          setFormData(prev => ({
            ...prev,
            package_size: response.values.includes('1L') ? '1L' : response.values[0]
          }));
        }
      } else if (response.success && response.data && response.data.length > 0) {
        setPackageSizes(response.data);
        
        if (response.data.length > 0 && !formData.package_size) {
          setFormData(prev => ({
            ...prev,
            package_size: response.data.includes('1L') ? '1L' : response.data[0]
          }));
        }
      } else {
        console.warn('No package sizes available in database');
        setPackageSizes([]);
        setMessage({ 
          type: 'warning', 
          text: 'No package sizes configured. Please configure package sizes in the system.' 
        });
      }
    } catch (error) {
      console.error('Error fetching package sizes:', error);
      setPackageSizes([]);
      setMessage({ 
        type: 'warning', 
        text: 'Could not load package sizes. Please ensure package sizes are configured in the system.' 
      });
    } finally {
      setLoadingPackageSizes(false);
    }
  };

  // Fetch oil types from API
  const fetchOilTypes = async () => {
    try {
      const response = await api.batch.getOilTypes();
      
      if (response.success && response.oil_types && response.oil_types.length > 0) {
        const formattedOilTypes = response.oil_types.map(type => `${type} Oil`);
        setOilTypes(formattedOilTypes);
        window.rawOilTypes = response.oil_types;
      } else {
        console.warn('No oil types available in database');
        setOilTypes([]);
        window.rawOilTypes = [];
      }
    } catch (error) {
      console.error('Error fetching oil types:', error);
      setOilTypes([]);
      window.rawOilTypes = [];
      setMessage({ 
        type: 'warning', 
        text: 'Could not load oil types. Please ensure oil types are configured in the system.' 
      });
    }
  };

  // Fetch SKUs from API - ENHANCED to include weight
  const fetchSKUs = async () => {
    setLoading(true);
    try {
      const response = await skuAPI.getSKUs();
      
      if (response.success) {
        const skusWithFormattedOilTypes = (response.skus || []).map(sku => ({
          ...sku,
          oil_type: sku.oil_type && !sku.oil_type.includes(' Oil') 
            ? `${sku.oil_type} Oil` 
            : sku.oil_type,
          // Ensure weight is included
          packaged_weight_kg: sku.packaged_weight_kg || null
        }));
        setSKUList(skusWithFormattedOilTypes);
      } else {
        throw new Error(response.error || 'Failed to fetch SKUs');
      }
    } catch (error) {
      console.error('Error fetching SKUs:', error);
      setMessage({ type: 'error', text: 'Failed to load SKUs' });
      setSKUList([]);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters to SKU list
  const applyFilters = () => {
    let filtered = [...skuList];
    
    if (searchTerm) {
      filtered = filtered.filter(sku =>
        sku.sku_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sku.product_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterOilType) {
      filtered = filtered.filter(sku => sku.oil_type === filterOilType);
    }
    
    if (filterPackageSize) {
      filtered = filtered.filter(sku => sku.package_size === filterPackageSize);
    }
    
    if (filterActive === 'active') {
      filtered = filtered.filter(sku => sku.is_active);
    } else if (filterActive === 'inactive') {
      filtered = filtered.filter(sku => !sku.is_active);
    }
    
    setFilteredList(filtered);
    setCurrentPage(1);
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredList.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredList.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Format date for display
  const formatDateForDisplay = (dateInt) => {
    if (!dateInt) return 'N/A';
    
    try {
      if (typeof dateInt === 'number') {
        const dateStr = dateInt.toString();
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6));
        const day = parseInt(dateStr.substring(6, 8));
        return `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`;
      } else if (typeof dateInt === 'string') {
        const date = new Date(dateInt);
        return date.toLocaleDateString('en-IN');
      }
      return 'N/A';
    } catch (error) {
      return 'N/A';
    }
  };

  // Helper function to convert display oil type to backend format
  const toBackendOilType = (displayOilType) => {
    return displayOilType ? displayOilType.replace(' Oil', '') : '';
  };

  // Helper function to convert backend oil type to display format
  const toDisplayOilType = (backendOilType) => {
    return backendOilType && !backendOilType.includes(' Oil') 
      ? `${backendOilType} Oil` 
      : backendOilType;
  };

  // Handle modal open - ENHANCED to include weight
  const handleOpenModal = (mode, sku = null) => {
    setModalMode(mode);
    setSelectedSKU(sku);
    
    if (mode === 'edit' && sku) {
      setFormData({
        sku_code: sku.sku_code,
        product_name: sku.product_name,
        oil_type: sku.oil_type,
        package_size: sku.package_size,
        density: sku.density || 0.91,
        mrp_current: sku.mrp_current || '',
        shelf_life_months: sku.shelf_life_months || 9,
        mrp_effective_date: sku.mrp_effective_date || new Date().toISOString().split('T')[0],
        packaged_weight_kg: sku.packaged_weight_kg || '', // Include weight
        is_active: sku.is_active !== undefined ? sku.is_active : true
      });
    } else {
      // Reset form for add mode
      const defaultPackageSize = packageSizes.length > 0 
        ? (packageSizes.includes('1L') ? '1L' : packageSizes[0]) 
        : '';
      const estimatedWeight = calculateEstimatedWeight(defaultPackageSize, 0.91);
      
      setFormData({
        sku_code: '',
        product_name: '',
        oil_type: '',
        package_size: defaultPackageSize,
        density: 0.91,
        mrp_current: '',
        shelf_life_months: 9,
        mrp_effective_date: new Date().toISOString().split('T')[0],
        packaged_weight_kg: estimatedWeight, // Auto-calculate initial weight
        is_active: true
      });
    }
    
    setErrors({});
    setShowModal(true);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedSKU(null);
    setFormData({
      sku_code: '',
      product_name: '',
      oil_type: '',
      package_size: packageSizes.length > 0 
        ? (packageSizes.includes('1L') ? '1L' : packageSizes[0]) 
        : '',
      density: 0.91,
      mrp_current: '',
      shelf_life_months: 9,
      mrp_effective_date: new Date().toISOString().split('T')[0],
      packaged_weight_kg: '',
      is_active: true
    });
    setErrors({});
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate form - ENHANCED with weight validation
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.sku_code) newErrors.sku_code = 'SKU Code is required';
    if (!formData.product_name) newErrors.product_name = 'Product Name is required';
    if (!formData.oil_type) newErrors.oil_type = 'Oil Type is required';
    if (!formData.package_size) newErrors.package_size = 'Package Size is required';
    if (!formData.mrp_current || formData.mrp_current <= 0) {
      newErrors.mrp_current = 'Valid MRP is required';
    }
    if (!formData.shelf_life_months || formData.shelf_life_months <= 0) {
      newErrors.shelf_life_months = 'Valid shelf life is required';
    }
    // Weight validation
    if (!formData.packaged_weight_kg || parseFloat(formData.packaged_weight_kg) <= 0) {
      newErrors.packaged_weight_kg = 'Valid weight is required (kg)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit - ENHANCED to include weight
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      // Prepare data with backend oil type format and weight
      const submitData = {
        ...formData,
        oil_type: toBackendOilType(formData.oil_type),
        packaged_weight_kg: parseFloat(formData.packaged_weight_kg) // Ensure numeric
      };
      
      let response;
      if (modalMode === 'add') {
        response = await skuAPI.createSKU(submitData);
      } else {
        response = await skuAPI.updateSKU(selectedSKU.sku_id, submitData);
      }
      
      if (response.success) {
        setMessage({
          type: 'success',
          text: modalMode === 'add' 
            ? 'SKU created successfully with weight information' 
            : 'SKU updated successfully'
        });
        handleCloseModal();
        fetchSKUs(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to save SKU');
      }
    } catch (error) {
      console.error('Error saving SKU:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = (sku) => {
    setDeleteTarget(sku);
    setShowDeleteConfirm(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    
    setLoading(true);
    try {
      const submitData = {
        ...deleteTarget,
        oil_type: toBackendOilType(deleteTarget.oil_type),
        is_active: false
      };
      
      const response = await skuAPI.updateSKU(deleteTarget.sku_id, submitData);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'SKU deactivated successfully' });
        fetchSKUs();
      } else {
        throw new Error(response.error || 'Failed to deactivate SKU');
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

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterOilType('');
    setFilterPackageSize('');
    setFilterActive('all');
  };

  return (
    <div className="sku-master-container">
      {/* Header with Add Button */}
      <div className="sku-header">
        <h2>SKU Master Management</h2>
        <button 
          className="btn-add-sku" 
          onClick={() => handleOpenModal('add')}
          disabled={oilTypes.length === 0 || packageSizes.length === 0}
        >
          + Add New SKU
        </button>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })}>×</button>
        </div>
      )}

      {/* Warning if configurations are missing */}
      {(oilTypes.length === 0 || packageSizes.length === 0) && (
        <div className="message warning">
          ⚠️ SKU creation is disabled. 
          {oilTypes.length === 0 && ' No oil types configured.'}
          {packageSizes.length === 0 && ' No package sizes configured.'}
          Please configure these in the system first.
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-row">
          <div className="filter-group search-group">
            <input
              type="text"
              placeholder="Search by SKU Code or Product Name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-group">
            <select
              value={filterOilType}
              onChange={(e) => setFilterOilType(e.target.value)}
              disabled={oilTypes.length === 0}
            >
              <option value="">
                {oilTypes.length === 0 ? 'No Oil Types' : 'All Oil Types'}
              </option>
              {oilTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <select
              value={filterPackageSize}
              onChange={(e) => setFilterPackageSize(e.target.value)}
              disabled={packageSizes.length === 0 || loadingPackageSizes}
            >
              <option value="">
                {loadingPackageSizes ? 'Loading...' : 
                 packageSizes.length === 0 ? 'No Package Sizes' : 'All Sizes'}
              </option>
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
          
          <button className="btn-clear-filters" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      </div>

      {/* SKU Table - ENHANCED with weight column */}
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
                  <th>Weight (kg)</th>
                  <th>MRP (₹)</th>
                  <th>Shelf Life</th>
                  <th>MRP Effective</th>
                  <th>Density</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="empty-cell">
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
                      <td className="number-cell">
                        {sku.packaged_weight_kg 
                          ? parseFloat(sku.packaged_weight_kg).toFixed(3) 
                          : <span style={{ color: '#ff6b6b' }}>Not Set</span>}
                      </td>
                      <td className="number-cell">
                        {sku.mrp_current ? `₹${sku.mrp_current}` : 'N/A'}
                      </td>
                      <td>
                        {sku.shelf_life_months ? `${sku.shelf_life_months} months` : 'N/A'}
                      </td>
                      <td>{formatDateForDisplay(sku.mrp_effective_date)}</td>
                      <td className="number-cell">
                        {sku.density ? sku.density.toFixed(2) : '0.91'}
                      </td>
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

      {/* Add/Edit Modal - ENHANCED with weight field */}
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
                    className={errors.oil_type ? 'error' : ''}
                    disabled={oilTypes.length === 0}
                  >
                    <option value="">
                      {oilTypes.length === 0 ? 'No oil types configured' : 'Select Oil Type'}
                    </option>
                    {oilTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {errors.oil_type && <span className="error-text">{errors.oil_type}</span>}
                </div>
                
                <div className="form-group">
                  <label>
                    Package Size <span className="required">*</span>
                    {loadingPackageSizes && <span style={{ fontSize: '12px', color: '#999' }}> (Loading...)</span>}
                  </label>
                  <select
                    name="package_size"
                    value={formData.package_size}
                    onChange={handlePackageSizeOrDensityChange}
                    className={errors.package_size ? 'error' : ''}
                    disabled={packageSizes.length === 0 || loadingPackageSizes}
                  >
                    {packageSizes.length === 0 && !loadingPackageSizes && (
                      <option value="">No package sizes configured</option>
                    )}
                    {packageSizes.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                  {errors.package_size && <span className="error-text">{errors.package_size}</span>}
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
                    min="0"
                    step="0.01"
                    className={errors.mrp_current ? 'error' : ''}
                  />
                  {errors.mrp_current && <span className="error-text">{errors.mrp_current}</span>}
                </div>
                
                <div className="form-group">
                  <label>MRP Effective Date</label>
                  <input
                    type="date"
                    name="mrp_effective_date"
                    value={formData.mrp_effective_date}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Shelf Life (Months) <span className="required">*</span></label>
                  <input
                    type="number"
                    name="shelf_life_months"
                    value={formData.shelf_life_months}
                    onChange={handleInputChange}
                    min="1"
                    max="36"
                    className={errors.shelf_life_months ? 'error' : ''}
                  />
                  {errors.shelf_life_months && <span className="error-text">{errors.shelf_life_months}</span>}
                </div>
                
                <div className="form-group">
                  <label>Density</label>
                  <input
                    type="number"
                    name="density"
                    value={formData.density}
                    onChange={handlePackageSizeOrDensityChange}
                    min="0.1"
                    max="2"
                    step="0.01"
                  />
                </div>
              </div>
              
              {/* NEW: Weight field section */}
              <div className="form-row">
                <div className="form-group">
                  <label>Packaged Weight (kg) <span className="required">*</span></label>
                  <input
                    type="number"
                    step="0.001"
                    name="packaged_weight_kg"
                    value={formData.packaged_weight_kg}
                    onChange={handleInputChange}
                    required
                    min="0.001"
                    max="999"
                    placeholder="Complete weight including packaging"
                    className={errors.packaged_weight_kg ? 'error' : ''}
                  />
                  <small className="field-help">
                    Actual weight of packaged product (oil + bottle + cap + label)
                    {formData.package_size && formData.density && (
                      <span style={{ display: 'block', color: '#666', marginTop: '4px' }}>
                        Estimated: {calculateEstimatedWeight(formData.package_size, formData.density)} kg
                      </span>
                    )}
                  </small>
                  {errors.packaged_weight_kg && <span className="error-text">{errors.packaged_weight_kg}</span>}
                </div>
                
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
                </div>
              </div>
              
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? 'Saving...' : (modalMode === 'add' ? 'Create SKU' : 'Update SKU')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content small">
            <div className="modal-header">
              <h3>Confirm Deactivation</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to deactivate this SKU?</p>
              <p><strong>{deleteTarget?.sku_code} - {deleteTarget?.product_name}</strong></p>
              <p className="warning-text">This will mark the SKU as inactive.</p>
              
              <div className="form-actions">
                <button 
                  className="btn-cancel" 
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteTarget(null);
                  }}
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
        </div>
      )}
    </div>
  );
};

export default SKUMaster;
