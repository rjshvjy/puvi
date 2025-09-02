// File Path: puvi-frontend/puvi-frontend-main/src/modules/MasterData/LocationsManager.js
// Locations Manager Component - Manage factory, warehouse, and customer locations
// Handles ownership-based validation and inventory tracking
// Enhanced with GST number support for third-party warehouses

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './LocationsManager.css';

const LocationsManager = () => {
  // State management
  const [locations, setLocations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedLocation, setSelectedLocation] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    location_name: '',
    location_type: 'warehouse',
    ownership: 'own',
    customer_id: null,
    address: '',
    city: '',
    state: '',
    pincode: '',
    contact_person: '',
    contact_phone: '',
    gst_number: '',
    is_default: false,
    is_active: true
  });
  
  // Validation errors
  const [errors, setErrors] = useState({});
  
  // Search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterOwnership, setFilterOwnership] = useState('all');
  const [includeInactive, setIncludeInactive] = useState(false);
  
  // Delete confirmation
  const [deleteModal, setDeleteModal] = useState({
    show: false,
    location: null,
    dependencies: null,
    checking: false
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Location type options
  const locationTypes = [
    { value: 'factory', label: 'Factory', icon: '🏭' },
    { value: 'warehouse', label: 'Warehouse', icon: '🏬' },
    { value: 'customer_location', label: 'Customer Location', icon: '📍' }
  ];

  // Ownership options
  const ownershipOptions = [
    { value: 'own', label: 'Company Owned' },
    { value: 'third_party', label: 'Third Party' }
  ];

  // Load data on mount
  useEffect(() => {
    loadLocations();
    loadCustomers();
  }, [includeInactive, filterType, filterOwnership]);

  // Load locations from API
  const loadLocations = async () => {
    setLoading(true);
    try {
      const params = {
        is_active: !includeInactive ? true : undefined,
        type: filterType !== 'all' ? filterType : undefined,
        ownership: filterOwnership !== 'all' ? filterOwnership : undefined
      };
      
      const response = await api.locations.getAll(params);
      if (response.success) {
        setLocations(response.locations || []);
      }
    } catch (error) {
      showMessage('error', 'Failed to load locations: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Load customers for dropdown
  const loadCustomers = async () => {
    try {
      const response = await api.customers.dropdown();
      if (response.success) {
        setCustomers(response.customers || []);
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  // Show message helper
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // Filter locations based on search
  const filteredLocations = locations.filter(location => 
    location.location_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.location_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredLocations.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredLocations.length / itemsPerPage);

  // Open add modal
  const handleAdd = () => {
    setFormData({
      location_name: '',
      location_type: 'warehouse',
      ownership: 'own',
      customer_id: null,
      address: '',
      city: '',
      state: '',
      pincode: '',
      contact_person: '',
      contact_phone: '',
      gst_number: '',
      is_default: false,
      is_active: true
    });
    setErrors({});
    setModalMode('add');
    setShowModal(true);
  };

  // Open edit modal
  const handleEdit = (location) => {
    setFormData({
      location_name: location.location_name,
      location_type: location.location_type,
      ownership: location.ownership,
      customer_id: location.customer_id,
      address: location.address || '',
      city: location.city || '',
      state: location.state || '',
      pincode: location.pincode || '',
      contact_person: location.contact_person || '',
      contact_phone: location.contact_phone || '',
      gst_number: location.gst_number || '',
      is_default: location.is_default || false,
      is_active: location.is_active
    });
    setErrors({});
    setSelectedLocation(location);
    setModalMode('edit');
    setShowModal(true);
  };

  // Handle form field change
  const handleFieldChange = (field, value) => {
    // Convert GST to uppercase automatically
    if (field === 'gst_number') {
      value = value.toUpperCase();
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear customer_id if ownership changes to 'own'
    if (field === 'ownership' && value === 'own') {
      setFormData(prev => ({
        ...prev,
        customer_id: null
      }));
    }
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.location_name) {
      newErrors.location_name = 'Location name is required';
    }
    
    if (!formData.location_type) {
      newErrors.location_type = 'Location type is required';
    }
    
    if (formData.ownership === 'third_party' && !formData.customer_id) {
      newErrors.customer_id = 'Customer is required for third-party locations';
    }
    
    if (!formData.city) {
      newErrors.city = 'City is required';
    }
    
    if (!formData.state) {
      newErrors.state = 'State is required';
    }
    
    if (formData.contact_phone && !/^\d{10}$/.test(formData.contact_phone.replace(/[^0-9]/g, ''))) {
      newErrors.contact_phone = 'Phone number must be 10 digits';
    }
    
    if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = 'Pincode must be 6 digits';
    }
    
    // GST validation
    if (formData.gst_number) {
      const gstPattern = /^[0-9]{2}[A-Z0-9]{10}[0-9]{1}[A-Z]{1}[A-Z0-9]{1}$/;
      if (formData.gst_number.length !== 15) {
        newErrors.gst_number = 'GST must be exactly 15 characters';
      } else if (!gstPattern.test(formData.gst_number)) {
        newErrors.gst_number = 'Invalid GST format';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save location
  const handleSave = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      let response;
      if (modalMode === 'add') {
        response = await api.locations.create(formData);
      } else {
        response = await api.locations.update(selectedLocation.location_id, formData);
      }
      
      if (response.success) {
        showMessage('success', response.message || `Location ${modalMode === 'add' ? 'created' : 'updated'} successfully`);
        setShowModal(false);
        loadLocations();
      }
    } catch (error) {
      showMessage('error', 'Failed to save: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Check dependencies before delete
  const handleDeleteClick = async (location) => {
    setDeleteModal({
      show: true,
      location: location,
      dependencies: null,
      checking: true
    });
    
    try {
      const response = await api.locations.checkDependencies(location.location_id);
      if (response.success) {
        setDeleteModal(prev => ({
          ...prev,
          dependencies: response.dependencies,
          checking: false
        }));
      }
    } catch (error) {
      showMessage('error', 'Failed to check dependencies: ' + error.message);
      setDeleteModal({ show: false, location: null, dependencies: null, checking: false });
    }
  };

  // Perform delete
  const handleDelete = async () => {
    if (!deleteModal.location) return;
    
    setLoading(true);
    try {
      const response = await api.locations.delete(deleteModal.location.location_id);
      if (response.success) {
        showMessage('success', response.message || 'Location deleted successfully');
        setDeleteModal({ show: false, location: null, dependencies: null, checking: false });
        loadLocations();
      }
    } catch (error) {
      showMessage('error', 'Failed to delete: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Get location type label
  const getLocationTypeLabel = (type) => {
    const found = locationTypes.find(t => t.value === type);
    return found ? `${found.icon} ${found.label}` : type;
  };

  // Get ownership badge
  const getOwnershipBadge = (ownership) => {
    if (ownership === 'own') {
      return <span className="badge badge-primary">Company</span>;
    }
    return <span className="badge badge-secondary">Third Party</span>;
  };

  return (
    <div className="locations-container">
      {/* Header */}
      <div className="locations-header">
        <div className="locations-header-content">
          <div>
            <h2 className="locations-title">📍 Locations Management</h2>
            <p className="locations-subtitle">
              Manage factories, warehouses, and customer locations for inventory tracking
            </p>
          </div>
          
          <div className="locations-controls">
            <button onClick={handleAdd} className="btn btn-primary">
              + Add Location
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="locations-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-input"
          />
        </div>
        
        <div className="filter-group">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            {locationTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <select
            value={filterOwnership}
            onChange={(e) => setFilterOwnership(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Ownership</option>
            <option value="own">Company Owned</option>
            <option value="third_party">Third Party</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
            />
            Show Inactive
          </label>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Locations Grid */}
      <div className="locations-grid">
        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Loading locations...</p>
          </div>
        ) : currentItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📍</div>
            <div className="empty-text">
              {searchTerm ? 'No locations found matching your search' : 'No locations found'}
            </div>
            <div className="empty-subtext">
              Click "Add Location" to create your first location
            </div>
          </div>
        ) : (
          <div className="locations-cards">
            {currentItems.map((location) => (
              <div key={location.location_id} className="location-card">
                <div className="card-header">
                  <div className="card-title">
                    <span className="location-code">{location.location_code}</span>
                    {location.is_default && (
                      <span className="badge badge-success">Default</span>
                    )}
                  </div>
                  <div className="card-actions">
                    <button
                      onClick={() => handleEdit(location)}
                      className="btn-icon"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteClick(location)}
                      className="btn-icon"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                <div className="card-body">
                  <h3 className="location-name">{location.location_name}</h3>
                  <div className="location-meta">
                    <span className="meta-item">
                      {getLocationTypeLabel(location.location_type)}
                    </span>
                    {getOwnershipBadge(location.ownership)}
                  </div>
                  
                  {location.customer_name && (
                    <div className="location-customer">
                      Customer: <strong>{location.customer_name}</strong>
                    </div>
                  )}
                  
                  {location.gst_number && (
                    <div className="location-customer">
                      GST: <strong>{location.gst_number}</strong>
                    </div>
                  )}
                  
                  <div className="location-address">
                    {location.city && `${location.city}, `}
                    {location.state}
                    {location.pincode && ` - ${location.pincode}`}
                  </div>
                  
                  {location.contact_person && (
                    <div className="location-contact">
                      Contact: {location.contact_person}
                      {location.contact_phone && ` (${location.contact_phone})`}
                    </div>
                  )}
                  
                  {location.inventory_summary && (
                    <div className="inventory-summary">
                      <div className="summary-title">Inventory:</div>
                      <div className="summary-items">
                        {location.inventory_summary.total_skus > 0 && (
                          <span className="summary-item">
                            SKUs: {location.inventory_summary.total_skus}
                          </span>
                        )}
                        {location.inventory_summary.total_quantity > 0 && (
                          <span className="summary-item">
                            Qty: {location.inventory_summary.total_quantity}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="card-footer">
                    <span className={`status-badge ${location.is_active ? 'active' : 'inactive'}`}>
                      {location.is_active ? '✓ Active' : '✗ Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <div className="pagination-info">
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredLocations.length)} of {filteredLocations.length} entries
          </div>
          <div className="pagination-controls">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              Previous
            </button>
            <span className="pagination-pages">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              Last
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">
                {modalMode === 'add' ? 'Add New Location' : 'Edit Location'}
              </h3>
              <button onClick={() => setShowModal(false)} className="modal-close">
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    Location Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.location_name}
                    onChange={(e) => handleFieldChange('location_name', e.target.value)}
                    className={`form-input ${errors.location_name ? 'error' : ''}`}
                    placeholder="e.g., Main Warehouse, Chennai Factory"
                  />
                  {errors.location_name && (
                    <span className="error-text">{errors.location_name}</span>
                  )}
                </div>
                
                <div className="form-group">
                  <label className="form-label">
                    Location Type <span className="required">*</span>
                  </label>
                  <select
                    value={formData.location_type}
                    onChange={(e) => handleFieldChange('location_type', e.target.value)}
                    className={`form-select ${errors.location_type ? 'error' : ''}`}
                  >
                    {locationTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                  {errors.location_type && (
                    <span className="error-text">{errors.location_type}</span>
                  )}
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    Ownership <span className="required">*</span>
                  </label>
                  <select
                    value={formData.ownership}
                    onChange={(e) => handleFieldChange('ownership', e.target.value)}
                    className="form-select"
                    disabled={modalMode === 'edit' && selectedLocation?.has_inventory}
                  >
                    {ownershipOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {modalMode === 'edit' && selectedLocation?.has_inventory && (
                    <small className="form-help">
                      Cannot change ownership - location has inventory
                    </small>
                  )}
                </div>
                
                {formData.ownership === 'third_party' && (
                  <div className="form-group">
                    <label className="form-label">
                      Customer <span className="required">*</span>
                    </label>
                    <select
                      value={formData.customer_id || ''}
                      onChange={(e) => handleFieldChange('customer_id', e.target.value || null)}
                      className={`form-select ${errors.customer_id ? 'error' : ''}`}
                    >
                      <option value="">Select Customer</option>
                      {customers.map(customer => (
                        <option key={customer.customer_id} value={customer.customer_id}>
                          {customer.customer_name} ({customer.customer_code})
                        </option>
                      ))}
                    </select>
                    {errors.customer_id && (
                      <span className="error-text">{errors.customer_id}</span>
                    )}
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  className="form-textarea"
                  rows="3"
                  placeholder="Street address, building, floor, etc."
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    City <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleFieldChange('city', e.target.value)}
                    className={`form-input ${errors.city ? 'error' : ''}`}
                    placeholder="e.g., Chennai"
                  />
                  {errors.city && (
                    <span className="error-text">{errors.city}</span>
                  )}
                </div>
                
                <div className="form-group">
                  <label className="form-label">
                    State <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleFieldChange('state', e.target.value)}
                    className={`form-input ${errors.state ? 'error' : ''}`}
                    placeholder="e.g., Tamil Nadu"
                  />
                  {errors.state && (
                    <span className="error-text">{errors.state}</span>
                  )}
                </div>
                
                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => handleFieldChange('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className={`form-input ${errors.pincode ? 'error' : ''}`}
                    placeholder="e.g., 600001"
                    maxLength="6"
                  />
                  {errors.pincode && (
                    <span className="error-text">{errors.pincode}</span>
                  )}
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => handleFieldChange('contact_person', e.target.value)}
                    className="form-input"
                    placeholder="e.g., John Doe"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.contact_phone}
                    onChange={(e) => handleFieldChange('contact_phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className={`form-input ${errors.contact_phone ? 'error' : ''}`}
                    placeholder="e.g., 9876543210"
                    maxLength="10"
                  />
                  {errors.contact_phone && (
                    <span className="error-text">{errors.contact_phone}</span>
                  )}
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  GST Number
                  <span className="form-help" style={{ marginLeft: '8px', fontWeight: 'normal' }}>
                    15 characters (optional)
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.gst_number}
                  onChange={(e) => handleFieldChange('gst_number', e.target.value)}
                  className={`form-input ${errors.gst_number ? 'error' : ''}`}
                  placeholder="e.g., 27AABCU9603R1ZM"
                  maxLength="15"
                />
                {errors.gst_number && (
                  <span className="error-text">{errors.gst_number}</span>
                )}
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.is_default}
                      onChange={(e) => handleFieldChange('is_default', e.target.checked)}
                    />
                    Set as default for this location type
                  </label>
                  <small className="form-help">
                    Only one location can be default per type
                  </small>
                </div>
                
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => handleFieldChange('is_active', e.target.checked)}
                    />
                    Active
                  </label>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button
                onClick={() => setShowModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn btn-primary"
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
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                Confirm Delete
              </h3>
            </div>
            
            <div className="modal-body">
              {deleteModal.checking ? (
                <p>Checking dependencies...</p>
              ) : (
                <>
                  <p style={{ marginBottom: '16px' }}>
                    Are you sure you want to delete <strong>{deleteModal.location?.location_name}</strong>?
                  </p>
                  
                  {deleteModal.dependencies && Object.keys(deleteModal.dependencies).length > 0 ? (
                    <div className="alert alert-warning">
                      <p>This location has dependencies:</p>
                      <ul>
                        {Object.entries(deleteModal.dependencies).map(([key, value]) => (
                          <li key={key}>{key}: {value}</li>
                        ))}
                      </ul>
                      <p>The location will be marked as inactive instead of deleted.</p>
                    </div>
                  ) : (
                    <p className="text-danger">
                      This action cannot be undone.
                    </p>
                  )}
                </>
              )}
            </div>
            
            <div className="modal-footer">
              <button
                onClick={() => setDeleteModal({ show: false, location: null, dependencies: null, checking: false })}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              {!deleteModal.checking && (
                <button
                  onClick={handleDelete}
                  className="btn btn-danger"
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationsManager;
