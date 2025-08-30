// File Path: puvi-frontend/puvi-frontend-main/src/modules/MasterData/CustomerManager.js
// Customer Manager Component - Manage customers and ship-to locations
// Handles GST/PAN validation, 3-letter codes, and nested location management

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './CustomerManager.css';

const CustomerManager = () => {
  // State management
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add', 'edit', 'ship-to'
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // Ship-to locations state
  const [shipToLocations, setShipToLocations] = useState([]);
  const [showShipToModal, setShowShipToModal] = useState(false);
  const [shipToMode, setShipToMode] = useState('add');
  const [selectedShipTo, setSelectedShipTo] = useState(null);
  
  // Form data for customer
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_type: '',
    gst_number: '',
    pan_number: '',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    is_active: true
  });
  
  // Form data for ship-to location
  const [shipToFormData, setShipToFormData] = useState({
    location_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    contact_person: '',
    contact_phone: '',
    is_default: false,
    is_active: true
  });
  
  // Validation errors
  const [errors, setErrors] = useState({});
  const [shipToErrors, setShipToErrors] = useState({});
  
  // Search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [includeInactive, setIncludeInactive] = useState(false);
  
  // Delete confirmation
  const [deleteModal, setDeleteModal] = useState({
    show: false,
    customer: null,
    dependencies: null
  });
  
  // Expanded rows for ship-to locations
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Customer type options
  const customerTypes = [
    'Retail',
    'Wholesale',
    'Distributor',
    'Online',
    'Export',
    'Institutional'
  ];

  // Indian states for dropdown
  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli',
    'Daman and Diu', 'Delhi', 'Lakshadweep', 'Puducherry'
  ];

  // Load data on mount
  useEffect(() => {
    loadCustomers();
  }, [includeInactive, filterType]);

  // Load customers from API
  const loadCustomers = async () => {
    setLoading(true);
    try {
      const params = {
        include_inactive: includeInactive,
        customer_type: filterType !== 'all' ? filterType : undefined
      };
      
      const response = await api.customers.getAll(params);
      if (response.success) {
        setCustomers(response.customers || []);
      }
    } catch (error) {
      showMessage('error', 'Failed to load customers: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Load ship-to locations for a customer
  const loadShipToLocations = async (customerId) => {
    try {
      const response = await api.customers.getShipTo(customerId);
      if (response.success) {
        setShipToLocations(response.ship_to_locations || []);
      }
    } catch (error) {
      console.error('Failed to load ship-to locations:', error);
      setShipToLocations([]);
    }
  };

  // Show message helper
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // Filter customers based on search
  const filteredCustomers = customers.filter(customer => 
    customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.customer_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.gst_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle expanded row
  const toggleExpandRow = async (customerId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId);
    } else {
      newExpanded.add(customerId);
      // Load ship-to locations when expanding
      await loadShipToLocations(customerId);
    }
    setExpandedRows(newExpanded);
  };

  // Open add customer modal
  const handleAdd = () => {
    setFormData({
      customer_name: '',
      customer_type: '',
      gst_number: '',
      pan_number: '',
      contact_person: '',
      contact_phone: '',
      contact_email: '',
      is_active: true
    });
    setErrors({});
    setModalMode('add');
    setShowModal(true);
  };

  // Open edit customer modal
  const handleEdit = (customer) => {
    setFormData({
      customer_name: customer.customer_name,
      customer_type: customer.customer_type || '',
      gst_number: customer.gst_number || '',
      pan_number: customer.pan_number || '',
      contact_person: customer.contact_person || '',
      contact_phone: customer.contact_phone || '',
      contact_email: customer.contact_email || '',
      is_active: customer.is_active
    });
    setErrors({});
    setSelectedCustomer(customer);
    setModalMode('edit');
    setShowModal(true);
  };

  // Handle form field change
  const handleFieldChange = (field, value) => {
    // Special handling for GST and PAN - convert to uppercase
    if (field === 'gst_number' || field === 'pan_number') {
      value = value.toUpperCase();
    }
    
    // Special handling for phone - only digits
    if (field === 'contact_phone') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Validate GST number
  const validateGST = (gst) => {
    if (!gst) return '';
    
    if (gst.length !== 15) {
      return 'GST number must be exactly 15 characters';
    }
    
    // GST pattern: 2 digits + 10 alphanumeric + 1 digit + 1 letter + 1 letter/digit
    const gstPattern = /^[0-9]{2}[A-Z0-9]{10}[0-9]{1}[A-Z]{1}[A-Z0-9]{1}$/;
    if (!gstPattern.test(gst)) {
      return 'Invalid GST format (e.g., 22AAAAA0000A1Z5)';
    }
    
    return '';
  };

  // Validate PAN number
  const validatePAN = (pan) => {
    if (!pan) return '';
    
    if (pan.length !== 10) {
      return 'PAN number must be exactly 10 characters';
    }
    
    // PAN pattern: 5 letters + 4 digits + 1 letter
    const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panPattern.test(pan)) {
      return 'Invalid PAN format (e.g., AAAPA1234A)';
    }
    
    return '';
  };

  // Validate email
  const validateEmail = (email) => {
    if (!email) return '';
    
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return 'Invalid email format';
    }
    
    return '';
  };

  // Validate phone
  const validatePhone = (phone) => {
    if (!phone) return '';
    
    if (phone.length !== 10) {
      return 'Phone number must be 10 digits';
    }
    
    return '';
  };

  // Validate customer form
  const validateCustomerForm = () => {
    const newErrors = {};
    
    if (!formData.customer_name) {
      newErrors.customer_name = 'Customer name is required';
    }
    
    if (formData.gst_number) {
      const gstError = validateGST(formData.gst_number);
      if (gstError) newErrors.gst_number = gstError;
    }
    
    if (formData.pan_number) {
      const panError = validatePAN(formData.pan_number);
      if (panError) newErrors.pan_number = panError;
    }
    
    if (formData.contact_email) {
      const emailError = validateEmail(formData.contact_email);
      if (emailError) newErrors.contact_email = emailError;
    }
    
    if (formData.contact_phone) {
      const phoneError = validatePhone(formData.contact_phone);
      if (phoneError) newErrors.contact_phone = phoneError;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save customer
  const handleSaveCustomer = async () => {
    if (!validateCustomerForm()) return;
    
    setLoading(true);
    try {
      let response;
      if (modalMode === 'add') {
        response = await api.customers.create(formData);
      } else {
        response = await api.customers.update(selectedCustomer.customer_id, formData);
      }
      
      if (response.success) {
        showMessage('success', response.message || `Customer ${modalMode === 'add' ? 'created' : 'updated'} successfully`);
        setShowModal(false);
        loadCustomers();
      }
    } catch (error) {
      showMessage('error', 'Failed to save: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Open add ship-to modal
  const handleAddShipTo = (customer) => {
    setSelectedCustomer(customer);
    setShipToFormData({
      location_name: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      pincode: '',
      contact_person: '',
      contact_phone: '',
      is_default: false,
      is_active: true
    });
    setShipToErrors({});
    setShipToMode('add');
    setShowShipToModal(true);
  };

  // Open edit ship-to modal
  const handleEditShipTo = (customer, shipTo) => {
    setSelectedCustomer(customer);
    setSelectedShipTo(shipTo);
    setShipToFormData({
      location_name: shipTo.location_name,
      address_line1: shipTo.address_line1 || '',
      address_line2: shipTo.address_line2 || '',
      city: shipTo.city,
      state: shipTo.state,
      pincode: shipTo.pincode || '',
      contact_person: shipTo.contact_person || '',
      contact_phone: shipTo.contact_phone || '',
      is_default: shipTo.is_default,
      is_active: shipTo.is_active
    });
    setShipToErrors({});
    setShipToMode('edit');
    setShowShipToModal(true);
  };

  // Handle ship-to field change
  const handleShipToFieldChange = (field, value) => {
    // Special handling for phone and pincode
    if (field === 'contact_phone') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    if (field === 'pincode') {
      value = value.replace(/\D/g, '').slice(0, 6);
    }
    
    setShipToFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (shipToErrors[field]) {
      setShipToErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Validate ship-to form
  const validateShipToForm = () => {
    const newErrors = {};
    
    if (!shipToFormData.location_name) {
      newErrors.location_name = 'Location name is required';
    }
    
    if (!shipToFormData.city) {
      newErrors.city = 'City is required';
    }
    
    if (!shipToFormData.state) {
      newErrors.state = 'State is required';
    }
    
    if (shipToFormData.pincode && shipToFormData.pincode.length !== 6) {
      newErrors.pincode = 'Pincode must be 6 digits';
    }
    
    if (shipToFormData.contact_phone) {
      const phoneError = validatePhone(shipToFormData.contact_phone);
      if (phoneError) newErrors.contact_phone = phoneError;
    }
    
    setShipToErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save ship-to location
  const handleSaveShipTo = async () => {
    if (!validateShipToForm()) return;
    
    setLoading(true);
    try {
      let response;
      if (shipToMode === 'add') {
        response = await api.customers.createShipTo(selectedCustomer.customer_id, shipToFormData);
      } else {
        response = await api.customers.updateShipTo(
          selectedCustomer.customer_id, 
          selectedShipTo.ship_to_id, 
          shipToFormData
        );
      }
      
      if (response.success) {
        showMessage('success', response.message || 'Ship-to location saved successfully');
        setShowShipToModal(false);
        // Reload ship-to locations
        await loadShipToLocations(selectedCustomer.customer_id);
        // Reload customers to update ship_to_count
        loadCustomers();
      }
    } catch (error) {
      showMessage('error', 'Failed to save ship-to location: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete ship-to location
  const handleDeleteShipTo = async (customer, shipTo) => {
    if (!window.confirm(`Delete ship-to location "${shipTo.location_name}"?`)) {
      return;
    }
    
    try {
      const response = await api.customers.deleteShipTo(customer.customer_id, shipTo.ship_to_id);
      if (response.success) {
        showMessage('success', 'Ship-to location deleted successfully');
        await loadShipToLocations(customer.customer_id);
        loadCustomers();
      }
    } catch (error) {
      showMessage('error', 'Failed to delete: ' + error.message);
    }
  };

  // Check dependencies and delete customer
  const handleDeleteClick = (customer) => {
    setDeleteModal({
      show: true,
      customer: customer,
      dependencies: {
        transactions: customer.transaction_count || 0,
        ship_to_locations: customer.ship_to_count || 0
      }
    });
  };

  // Perform delete
  const handleDelete = async () => {
    if (!deleteModal.customer) return;
    
    setLoading(true);
    try {
      const response = await api.customers.delete(deleteModal.customer.customer_id);
      if (response.success) {
        showMessage('success', response.message || 'Customer deleted successfully');
        setDeleteModal({ show: false, customer: null, dependencies: null });
        loadCustomers();
      }
    } catch (error) {
      showMessage('error', 'Failed to delete: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Restore customer
  const handleRestore = async (customer) => {
    try {
      const response = await api.customers.restore(customer.customer_id);
      if (response.success) {
        showMessage('success', response.message || 'Customer restored successfully');
        loadCustomers();
      }
    } catch (error) {
      showMessage('error', 'Failed to restore: ' + error.message);
    }
  };

  // Format phone number for display
  const formatPhone = (phone) => {
    if (!phone || phone.length !== 10) return phone;
    return `${phone.slice(0, 5)} ${phone.slice(5)}`;
  };

  return (
    <div className="customers-container">
      {/* Header */}
      <div className="customers-header">
        <div className="customers-header-content">
          <div>
            <h2 className="customers-title">👥 Customer Management</h2>
            <p className="customers-subtitle">
              Manage customers, GST/PAN details, and ship-to locations
            </p>
          </div>
          
          <div className="customers-controls">
            <button onClick={handleAdd} className="btn btn-primary">
              + Add Customer
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="customers-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search customers..."
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
            {customerTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
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

      {/* Customers Table */}
      <div className="customers-table-wrapper">
        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Loading customers...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <div className="empty-text">
              {searchTerm ? 'No customers found matching your search' : 'No customers found'}
            </div>
            <div className="empty-subtext">
              Click "Add Customer" to create your first customer
            </div>
          </div>
        ) : (
          <table className="customers-table">
            <thead>
              <tr>
                <th width="40"></th>
                <th>Code</th>
                <th>Customer Name</th>
                <th>Type</th>
                <th>GST Number</th>
                <th>Contact</th>
                <th>Ship-To</th>
                <th>Transactions</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <React.Fragment key={customer.customer_id}>
                  <tr className={expandedRows.has(customer.customer_id) ? 'expanded' : ''}>
                    <td>
                      <button
                        onClick={() => toggleExpandRow(customer.customer_id)}
                        className="expand-btn"
                        title={expandedRows.has(customer.customer_id) ? 'Collapse' : 'Expand'}
                      >
                        {expandedRows.has(customer.customer_id) ? '▼' : '▶'}
                      </button>
                    </td>
                    <td>
                      <span className="customer-code">{customer.customer_code}</span>
                    </td>
                    <td>
                      <div className="customer-name-cell">
                        <div className="customer-name">{customer.customer_name}</div>
                        {customer.contact_person && (
                          <div className="customer-contact-person">
                            👤 {customer.contact_person}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{customer.customer_type || '-'}</td>
                    <td>
                      <div className="gst-pan-cell">
                        {customer.gst_number && (
                          <div className="gst-number" title="GST Number">
                            {customer.gst_number}
                          </div>
                        )}
                        {customer.pan_number && (
                          <div className="pan-number" title="PAN Number">
                            PAN: {customer.pan_number}
                          </div>
                        )}
                        {!customer.gst_number && !customer.pan_number && '-'}
                      </div>
                    </td>
                    <td>
                      <div className="contact-cell">
                        {customer.contact_phone && (
                          <div className="contact-phone">
                            📞 {formatPhone(customer.contact_phone)}
                          </div>
                        )}
                        {customer.contact_email && (
                          <div className="contact-email" title={customer.contact_email}>
                            ✉️ {customer.contact_email}
                          </div>
                        )}
                        {!customer.contact_phone && !customer.contact_email && '-'}
                      </div>
                    </td>
                    <td>
                      <span className="count-badge">
                        {customer.ship_to_count || 0}
                      </span>
                    </td>
                    <td>
                      <span className="count-badge primary">
                        {customer.transaction_count || 0}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${customer.is_active ? 'active' : 'inactive'}`}>
                        {customer.is_active ? '✓ Active' : '✗ Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="btn-icon"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleAddShipTo(customer)}
                          className="btn-icon"
                          title="Add Ship-To Location"
                        >
                          📍
                        </button>
                        {customer.is_active ? (
                          <button
                            onClick={() => handleDeleteClick(customer)}
                            className="btn-icon"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRestore(customer)}
                            className="btn-icon"
                            title="Restore"
                          >
                            ♻️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded row for ship-to locations */}
                  {expandedRows.has(customer.customer_id) && (
                    <tr className="expanded-content">
                      <td colSpan="10">
                        <div className="ship-to-section">
                          <div className="ship-to-header">
                            <h4>Ship-To Locations</h4>
                            <button
                              onClick={() => handleAddShipTo(customer)}
                              className="btn btn-sm btn-secondary"
                            >
                              + Add Location
                            </button>
                          </div>
                          
                          {shipToLocations.length === 0 ? (
                            <div className="ship-to-empty">
                              No ship-to locations defined
                            </div>
                          ) : (
                            <div className="ship-to-grid">
                              {shipToLocations.map((shipTo) => (
                                <div key={shipTo.ship_to_id} className="ship-to-card">
                                  <div className="ship-to-card-header">
                                    <span className="ship-to-code">{shipTo.location_code}</span>
                                    {shipTo.is_default && (
                                      <span className="badge badge-success">Default</span>
                                    )}
                                    <div className="ship-to-actions">
                                      <button
                                        onClick={() => handleEditShipTo(customer, shipTo)}
                                        className="btn-icon-sm"
                                        title="Edit"
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        onClick={() => handleDeleteShipTo(customer, shipTo)}
                                        className="btn-icon-sm"
                                        title="Delete"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </div>
                                  <div className="ship-to-card-body">
                                    <div className="ship-to-name">{shipTo.location_name}</div>
                                    <div className="ship-to-address">
                                      {shipTo.address_line1 && <div>{shipTo.address_line1}</div>}
                                      {shipTo.address_line2 && <div>{shipTo.address_line2}</div>}
                                      <div>
                                        {shipTo.city}, {shipTo.state}
                                        {shipTo.pincode && ` - ${shipTo.pincode}`}
                                      </div>
                                    </div>
                                    {(shipTo.contact_person || shipTo.contact_phone) && (
                                      <div className="ship-to-contact">
                                        {shipTo.contact_person && <span>👤 {shipTo.contact_person}</span>}
                                        {shipTo.contact_phone && <span>📞 {formatPhone(shipTo.contact_phone)}</span>}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Customer Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">
                {modalMode === 'add' ? 'Add New Customer' : 'Edit Customer'}
              </h3>
              <button onClick={() => setShowModal(false)} className="modal-close">
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    Customer Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => handleFieldChange('customer_name', e.target.value)}
                    className={`form-input ${errors.customer_name ? 'error' : ''}`}
                    placeholder="e.g., ABC Enterprises"
                  />
                  {errors.customer_name && (
                    <span className="error-text">{errors.customer_name}</span>
                  )}
                </div>
                
                <div className="form-group">
                  <label className="form-label">Customer Type</label>
                  <select
                    value={formData.customer_type}
                    onChange={(e) => handleFieldChange('customer_type', e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select Type</option>
                    {customerTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    GST Number
                    <span className="form-help">15 characters (e.g., 22AAAAA0000A1Z5)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.gst_number}
                    onChange={(e) => handleFieldChange('gst_number', e.target.value)}
                    className={`form-input ${errors.gst_number ? 'error' : ''}`}
                    placeholder="22AAAAA0000A1Z5"
                    maxLength="15"
                  />
                  {errors.gst_number && (
                    <span className="error-text">{errors.gst_number}</span>
                  )}
                </div>
                
                <div className="form-group">
                  <label className="form-label">
                    PAN Number
                    <span className="form-help">10 characters (e.g., AAAPA1234A)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.pan_number}
                    onChange={(e) => handleFieldChange('pan_number', e.target.value)}
                    className={`form-input ${errors.pan_number ? 'error' : ''}`}
                    placeholder="AAAPA1234A"
                    maxLength="10"
                  />
                  {errors.pan_number && (
                    <span className="error-text">{errors.pan_number}</span>
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
                    onChange={(e) => handleFieldChange('contact_phone', e.target.value)}
                    className={`form-input ${errors.contact_phone ? 'error' : ''}`}
                    placeholder="9876543210"
                    maxLength="10"
                  />
                  {errors.contact_phone && (
                    <span className="error-text">{errors.contact_phone}</span>
                  )}
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleFieldChange('contact_email', e.target.value)}
                  className={`form-input ${errors.contact_email ? 'error' : ''}`}
                  placeholder="contact@example.com"
                />
                {errors.contact_email && (
                  <span className="error-text">{errors.contact_email}</span>
                )}
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
            
            <div className="modal-footer">
              <button
                onClick={() => setShowModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomer}
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : (modalMode === 'add' ? 'Create' : 'Update')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ship-To Location Add/Edit Modal */}
      {showShipToModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">
                {shipToMode === 'add' ? 'Add Ship-To Location' : 'Edit Ship-To Location'}
                <span className="modal-subtitle">
                  for {selectedCustomer?.customer_name} ({selectedCustomer?.customer_code})
                </span>
              </h3>
              <button onClick={() => setShowShipToModal(false)} className="modal-close">
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">
                  Location Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={shipToFormData.location_name}
                  onChange={(e) => handleShipToFieldChange('location_name', e.target.value)}
                  className={`form-input ${shipToErrors.location_name ? 'error' : ''}`}
                  placeholder="e.g., Main Warehouse, Head Office"
                />
                {shipToErrors.location_name && (
                  <span className="error-text">{shipToErrors.location_name}</span>
                )}
              </div>
              
              <div className="form-group">
                <label className="form-label">Address Line 1</label>
                <input
                  type="text"
                  value={shipToFormData.address_line1}
                  onChange={(e) => handleShipToFieldChange('address_line1', e.target.value)}
                  className="form-input"
                  placeholder="Street address, building, floor"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Address Line 2</label>
                <input
                  type="text"
                  value={shipToFormData.address_line2}
                  onChange={(e) => handleShipToFieldChange('address_line2', e.target.value)}
                  className="form-input"
                  placeholder="Area, landmark"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    City <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={shipToFormData.city}
                    onChange={(e) => handleShipToFieldChange('city', e.target.value)}
                    className={`form-input ${shipToErrors.city ? 'error' : ''}`}
                    placeholder="e.g., Chennai"
                  />
                  {shipToErrors.city && (
                    <span className="error-text">{shipToErrors.city}</span>
                  )}
                </div>
                
                <div className="form-group">
                  <label className="form-label">
                    State <span className="required">*</span>
                  </label>
                  <select
                    value={shipToFormData.state}
                    onChange={(e) => handleShipToFieldChange('state', e.target.value)}
                    className={`form-select ${shipToErrors.state ? 'error' : ''}`}
                  >
                    <option value="">Select State</option>
                    {indianStates.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                  {shipToErrors.state && (
                    <span className="error-text">{shipToErrors.state}</span>
                  )}
                </div>
                
                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <input
                    type="text"
                    value={shipToFormData.pincode}
                    onChange={(e) => handleShipToFieldChange('pincode', e.target.value)}
                    className={`form-input ${shipToErrors.pincode ? 'error' : ''}`}
                    placeholder="600001"
                    maxLength="6"
                  />
                  {shipToErrors.pincode && (
                    <span className="error-text">{shipToErrors.pincode}</span>
                  )}
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Contact Person</label>
                  <input
                    type="text"
                    value={shipToFormData.contact_person}
                    onChange={(e) => handleShipToFieldChange('contact_person', e.target.value)}
                    className="form-input"
                    placeholder="e.g., John Doe"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Contact Phone</label>
                  <input
                    type="text"
                    value={shipToFormData.contact_phone}
                    onChange={(e) => handleShipToFieldChange('contact_phone', e.target.value)}
                    className={`form-input ${shipToErrors.contact_phone ? 'error' : ''}`}
                    placeholder="9876543210"
                    maxLength="10"
                  />
                  {shipToErrors.contact_phone && (
                    <span className="error-text">{shipToErrors.contact_phone}</span>
                  )}
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={shipToFormData.is_default}
                      onChange={(e) => handleShipToFieldChange('is_default', e.target.checked)}
                    />
                    Set as default ship-to location
                  </label>
                </div>
                
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={shipToFormData.is_active}
                      onChange={(e) => handleShipToFieldChange('is_active', e.target.checked)}
                    />
                    Active
                  </label>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button
                onClick={() => setShowShipToModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveShipTo}
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : (shipToMode === 'add' ? 'Create' : 'Update')}
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
              <p style={{ marginBottom: '16px' }}>
                Are you sure you want to delete <strong>{deleteModal.customer?.customer_name}</strong>?
              </p>
              
              {(deleteModal.dependencies?.transactions > 0 || deleteModal.dependencies?.ship_to_locations > 0) ? (
                <div className="alert alert-warning">
                  <p>This customer has dependencies:</p>
                  <ul>
                    {deleteModal.dependencies.transactions > 0 && (
                      <li>Transactions: {deleteModal.dependencies.transactions}</li>
                    )}
                    {deleteModal.dependencies.ship_to_locations > 0 && (
                      <li>Ship-To Locations: {deleteModal.dependencies.ship_to_locations}</li>
                    )}
                  </ul>
                  <p>The customer will be marked as inactive instead of deleted.</p>
                </div>
              ) : (
                <p className="text-danger">
                  This action cannot be undone.
                </p>
              )}
            </div>
            
            <div className="modal-footer">
              <button
                onClick={() => setDeleteModal({ show: false, customer: null, dependencies: null })}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn btn-danger"
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

export default CustomerManager;
