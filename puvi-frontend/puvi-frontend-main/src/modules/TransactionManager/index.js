// File Path: puvi-frontend/puvi-frontend-main/src/modules/TransactionManager/index.js
// Transaction Management Console - Centralized Edit/Delete Interface
// Version: 1.0.0 - Complete implementation with boundary crossing visualization

import React, { useState, useEffect, useCallback } from 'react';
import './TransactionManager.css';

// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://puvi-backend.onrender.com';

// ============================================
// UTILITY FUNCTIONS
// ============================================

// API helper
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

// Date formatting utilities
const formatDateForDisplay = (dateValue) => {
  if (!dateValue) return 'N/A';
  
  let date;
  
  // Handle integer days since epoch
  if (typeof dateValue === 'number') {
    const epochDate = new Date('1970-01-01');
    epochDate.setDate(epochDate.getDate() + dateValue);
    date = epochDate;
  } else if (typeof dateValue === 'string') {
    // Check if already in DD-MM-YYYY format
    if (String(dateValue).match(/^\d{2}-\d{2}-\d{4}$/)) {
      return dateValue;
    }
    date = new Date(dateValue);
  } else {
    date = new Date(dateValue);
  }
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}-${month}-${year}`;
};

const formatDateForAPI = (dateString) => {
  if (!dateString) return null;
  
  // If in DD-MM-YYYY format, convert to YYYY-MM-DD
  if (String(dateString).match(/^\d{2}-\d{2}-\d{4}$/)) {
    const [day, month, year] = dateString.split('-');
    return `${year}-${month}-${day}`;
  }
  
  return dateString;
};

// ============================================
// MODULE CONFIGURATION
// ============================================

const MODULE_CONFIG = {
  purchases: {
    icon: '🛒',
    label: 'Purchases',
    primaryField: 'invoice_ref',
    dateField: 'purchase_date',
    valueField: 'total_cost',
    group: 'input'
  },
  material_writeoffs: {
    icon: '❌',
    label: 'Material Writeoffs',
    primaryField: 'material_name',
    dateField: 'writeoff_date',
    valueField: 'total_cost',
    group: 'input'
  },
  batch: {
    icon: '🏭',
    label: 'Batch Production',
    primaryField: 'traceable_code',
    dateField: 'production_date',
    valueField: 'total_cost',
    group: 'production'
  },
  blend_batches: {
    icon: '🔄',
    label: 'Blend Batches',
    primaryField: 'traceable_code',
    dateField: 'blend_date',
    valueField: 'total_quantity',
    group: 'production'
  },
  sku_production: {
    icon: '📦',
    label: 'SKU Production',
    primaryField: 'production_code',
    dateField: 'production_date',
    valueField: 'bottles_produced',
    group: 'output'
  },
  sku_outbound: {
    icon: '🚚',
    label: 'SKU Outbound',
    primaryField: 'outbound_number',
    dateField: 'transaction_date',
    valueField: 'total_value',
    group: 'output'
  },
  oil_cake_sales: {
    icon: '💰',
    label: 'Oil Cake Sales',
    primaryField: 'sale_number',
    dateField: 'sale_date',
    valueField: 'total_amount',
    group: 'output'
  }
};

// ============================================
// SUB-COMPONENTS
// ============================================

// Status Badge Component
const StatusBadge = ({ status, editStatus, boundaryMissed }) => {
  const getStatusConfig = () => {
    if (boundaryMissed) {
      return { label: '🔒 Locked', className: 'status-locked' };
    }
    
    switch (editStatus) {
      case 'locked':
        return { label: '🔒 Locked', className: 'status-locked' };
      case 'partial':
        return { label: '⚠️ Limited Edit', className: 'status-partial' };
      case 'editable':
        return { label: '✅ Editable', className: 'status-editable' };
      default:
        return { label: status === 'deleted' ? '🗑️ Deleted' : '✅ Active', className: 'status-active' };
    }
  };
  
  const config = getStatusConfig();
  
  return (
    <span className={`status-badge ${config.className}`}>
      {config.label}
    </span>
  );
};

// Action Buttons Component
const ActionButtons = ({ record, permissions, onEdit, onDelete, onViewAudit }) => {
  return (
    <div className="action-buttons">
      {permissions.can_edit && (
        <button
          className="btn-action btn-edit"
          onClick={() => onEdit(record)}
          title={permissions.editable_fields === 'all' ? 'Full Edit' : 'Limited Edit'}
        >
          ✏️
        </button>
      )}
      
      {permissions.can_delete && (
        <button
          className="btn-action btn-delete"
          onClick={() => onDelete(record)}
          title="Delete"
        >
          🗑️
        </button>
      )}
      
      <button
        className="btn-action btn-audit"
        onClick={() => onViewAudit(record)}
        title="View Audit Trail"
      >
        📋
      </button>
      
      {!permissions.can_edit && !permissions.can_delete && (
        <span className="no-actions" title={permissions.reason}>
          🔒
        </span>
      )}
    </div>
  );
};

// Delete Confirmation Modal
const DeleteModal = ({ isOpen, record, onConfirm, onCancel, loading }) => {
  const [reason, setReason] = useState('');
  
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Confirm Delete</h3>
        </div>
        
        <div className="modal-body">
          <p>Are you sure you want to delete this record?</p>
          <p className="modal-warning">
            ⚠️ This will perform a soft delete. The record will be marked as deleted but can be restored if needed.
          </p>
          
          <div className="form-group">
            <label>Reason for deletion:</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for deletion (optional)"
              rows={3}
              className="form-control"
            />
          </div>
        </div>
        
        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={() => onConfirm(reason)}
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Audit Trail Modal
const AuditModal = ({ isOpen, record, module, onClose }) => {
  const [auditData, setAuditData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (isOpen && record) {
      fetchAuditTrail();
    }
  }, [isOpen, record]);
  
  const fetchAuditTrail = async () => {
    setLoading(true);
    try {
      const primaryKey = getPrimaryKey(module);
      const recordId = record[primaryKey];
      const response = await apiCall(`/api/transaction-manager/audit/${module}/${recordId}`);
      
      if (response.success) {
        setAuditData(response.audit_trail || []);
      }
    } catch (error) {
      console.error('Error fetching audit trail:', error);
      setAuditData([]);
    } finally {
      setLoading(false);
    }
  };
  
  const getPrimaryKey = (module) => {
    const keys = {
      purchases: 'purchase_id',
      material_writeoffs: 'writeoff_id',
      batch: 'batch_id',
      blend_batches: 'blend_id',
      sku_production: 'production_id',
      sku_outbound: 'outbound_id',
      oil_cake_sales: 'sale_id'
    };
    return keys[module] || 'id';
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay">
      <div className="modal-content modal-large">
        <div className="modal-header">
          <h3>Audit Trail</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {loading ? (
            <div className="loading">Loading audit trail...</div>
          ) : auditData.length === 0 ? (
            <div className="no-data">No audit trail available</div>
          ) : (
            <div className="audit-timeline">
              {auditData.map((audit, index) => (
                <div key={audit.audit_id || index} className="audit-entry">
                  <div className="audit-marker"></div>
                  <div className="audit-content">
                    <div className="audit-header">
                      <span className="audit-action">{audit.action}</span>
                      <span className="audit-date">
                        {formatDateForDisplay(audit.created_at)}
                      </span>
                    </div>
                    <div className="audit-details">
                      <div className="audit-user">By: {audit.changed_by || 'System'}</div>
                      {audit.change_reason && (
                        <div className="audit-reason">Reason: {audit.change_reason}</div>
                      )}
                      {audit.old_values && (
                        <details className="audit-changes">
                          <summary>View Changes</summary>
                          <pre>{JSON.stringify(audit.old_values, null, 2)}</pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Edit Form Modal
const EditModal = ({ isOpen, record, module, permissions, onSave, onCancel }) => {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  useEffect(() => {
    if (isOpen && record) {
      setFormData(record);
      setErrors({});
    }
  }, [isOpen, record]);
  
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  const isFieldEditable = (field) => {
    if (!permissions) return false;
    if (permissions.editable_fields === 'all') return true;
    if (Array.isArray(permissions.editable_fields)) {
      return permissions.editable_fields.includes(field);
    }
    return false;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  const config = MODULE_CONFIG[module];
  
  return (
    <div className="modal-overlay">
      <div className="modal-content modal-large">
        <div className="modal-header">
          <h3>Edit {config.label} Record</h3>
          <button className="modal-close" type="button" onClick={onCancel}>
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errors.submit && (
              <div className="alert alert-error">{errors.submit}</div>
            )}
            
            {permissions.reason && (
              <div className="alert alert-warning">
                ⚠️ {permissions.reason}
              </div>
            )}
            
            <div className="form-grid">
              {Object.entries(formData).map(([field, value]) => {
                // Skip system fields
                if (['created_at', 'updated_at', 'status', 'boundary_crossed'].includes(field)) {
                  return null;
                }
                
                const isEditable = isFieldEditable(field);
                const isDate = field.includes('date');
                
                return (
                  <div key={field} className="form-group">
                    <label className={!isEditable ? 'field-readonly' : ''}>
                      {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      {!isEditable && ' (Read Only)'}
                    </label>
                    
                    {isDate ? (
                      <input
                        type="date"
                        value={formatDateForAPI(value) || ''}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                        disabled={!isEditable || loading}
                        className="form-control"
                      />
                    ) : (
                      <input
                        type={typeof value === 'number' ? 'number' : 'text'}
                        value={value || ''}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                        disabled={!isEditable || loading}
                        className="form-control"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const TransactionManager = () => {
  // State management
  const [activeModule, setActiveModule] = useState('purchases');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Filter states
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    status: 'active'
  });
  
  // Modal states
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    record: null
  });
  
  const [editModal, setEditModal] = useState({
    isOpen: false,
    record: null,
    permissions: null
  });
  
  const [auditModal, setAuditModal] = useState({
    isOpen: false,
    record: null
  });
  
  // Statistics state
  const [stats, setStats] = useState({});
  
  // Load data on module change or filter change
  useEffect(() => {
    loadRecords();
    loadStats();
  }, [activeModule, filters]);
  
  // Load records for current module
  const loadRecords = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.status) params.append('status', filters.status);
      
      const queryString = params.toString();
      const response = await apiCall(
        `/api/transaction-manager/${activeModule}/list${queryString ? `?${queryString}` : ''}`
      );
      
      if (response.success) {
        setRecords(response.records || response.data || []);
      }
    } catch (err) {
      setError(err.message);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Load statistics
  const loadStats = async () => {
    try {
      const response = await apiCall('/api/transaction-manager/stats');
      if (response.success) {
        setStats(response.statistics || {});
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };
  
  // Check permissions for a record
  const checkPermissions = async (record) => {
    const primaryKey = getPrimaryKey(activeModule);
    const recordId = record[primaryKey];
    
    try {
      const response = await apiCall(
        `/api/transaction-manager/${activeModule}/${recordId}/permissions`
      );
      
      if (response.success) {
        return response.permissions;
      }
    } catch (err) {
      console.error('Error checking permissions:', err);
      return { can_edit: false, can_delete: false, reason: 'Error checking permissions' };
    }
  };
  
  const getPrimaryKey = (module) => {
    const keys = {
      purchases: 'purchase_id',
      material_writeoffs: 'writeoff_id',
      batch: 'batch_id',
      blend_batches: 'blend_id',
      sku_production: 'production_id',
      sku_outbound: 'outbound_id',
      oil_cake_sales: 'sale_id'
    };
    return keys[module] || 'id';
  };
  
  // Handle edit
  const handleEdit = async (record) => {
    const permissions = await checkPermissions(record);
    
    if (!permissions.can_edit) {
      showMessage('error', permissions.reason || 'Cannot edit this record');
      return;
    }
    
    // Get full record data for editing
    const primaryKey = getPrimaryKey(activeModule);
    const recordId = record[primaryKey];
    
    try {
      const response = await apiCall(
        `/api/transaction-manager/${activeModule}/${recordId}`
      );
      
      if (response.success) {
        setEditModal({
          isOpen: true,
          record: response.data || response.record,
          permissions
        });
      }
    } catch (err) {
      showMessage('error', 'Failed to load record for editing');
    }
  };
  
  // Handle save edit
  const handleSaveEdit = async (updatedData) => {
    const primaryKey = getPrimaryKey(activeModule);
    const recordId = updatedData[primaryKey];
    
    try {
      const response = await apiCall(
        `/api/transaction-manager/${activeModule}/${recordId}/edit`,
        {
          method: 'POST',
          body: JSON.stringify(updatedData)
        }
      );
      
      if (response.success) {
        showMessage('success', 'Record updated successfully');
        setEditModal({ isOpen: false, record: null, permissions: null });
        loadRecords();
      }
    } catch (err) {
      throw err;
    }
  };
  
  // Handle delete
  const handleDelete = async (record) => {
    const permissions = await checkPermissions(record);
    
    if (!permissions.can_delete) {
      showMessage('error', permissions.reason || 'Cannot delete this record');
      return;
    }
    
    setDeleteModal({
      isOpen: true,
      record
    });
  };
  
  // Confirm delete
  const handleConfirmDelete = async (reason) => {
    const primaryKey = getPrimaryKey(activeModule);
    const recordId = deleteModal.record[primaryKey];
    
    try {
      const response = await apiCall(
        `/api/transaction-manager/${activeModule}/${recordId}/delete`,
        {
          method: 'POST',
          body: JSON.stringify({ reason })
        }
      );
      
      if (response.success) {
        showMessage('success', 'Record deleted successfully');
        setDeleteModal({ isOpen: false, record: null });
        loadRecords();
      }
    } catch (err) {
      showMessage('error', err.message);
    }
  };
  
  // Handle view audit
  const handleViewAudit = (record) => {
    setAuditModal({
      isOpen: true,
      record
    });
  };
  
  // Show message
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };
  
  // Handle filter change
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };
  
  // Module groups for tabs
  const moduleGroups = {
    input: ['purchases', 'material_writeoffs'],
    production: ['batch', 'blend_batches'],
    output: ['sku_production', 'sku_outbound', 'oil_cake_sales']
  };
  
  const config = MODULE_CONFIG[activeModule];
  const moduleStats = stats[activeModule] || {};
  
  return (
    <div className="transaction-manager">
      {/* Header */}
      <div className="tm-header">
        <h1 className="tm-title">Transaction Management Console</h1>
        <p className="tm-subtitle">
          Centralized edit and delete operations with complete audit trail
        </p>
      </div>
      
      {/* Module Stats */}
      {Object.keys(moduleStats).length > 0 && (
        <div className="tm-stats">
          <div className="stat-card">
            <span className="stat-label">Total Records</span>
            <span className="stat-value">{moduleStats.total || 0}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Active</span>
            <span className="stat-value">{moduleStats.active || 0}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Today's Entries</span>
            <span className="stat-value">{moduleStats.created_today || 0}</span>
          </div>
          {moduleStats.locked !== undefined && (
            <div className="stat-card">
              <span className="stat-label">Locked</span>
              <span className="stat-value">{moduleStats.locked || 0}</span>
            </div>
          )}
          <div className="stat-card">
            <span className="stat-label">Deleted</span>
            <span className="stat-value">{moduleStats.deleted || 0}</span>
          </div>
        </div>
      )}
      
      {/* Module Tabs */}
      <div className="tm-tabs">
        {Object.entries(moduleGroups).map(([group, modules]) => (
          <div key={group} className="tab-group">
            <div className="tab-group-label">
              {group.charAt(0).toUpperCase() + group.slice(1)}
            </div>
            <div className="tab-buttons">
              {modules.map(module => (
                <button
                  key={module}
                  className={`tab-button ${activeModule === module ? 'active' : ''}`}
                  onClick={() => setActiveModule(module)}
                >
                  <span className="tab-icon">{MODULE_CONFIG[module].icon}</span>
                  <span className="tab-label">{MODULE_CONFIG[module].label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* Filters */}
      <div className="tm-filters">
        <div className="filter-group">
          <label>Start Date:</label>
          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => handleFilterChange('start_date', e.target.value)}
            className="filter-input"
          />
        </div>
        <div className="filter-group">
          <label>End Date:</label>
          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => handleFilterChange('end_date', e.target.value)}
            className="filter-input"
          />
        </div>
        <div className="filter-group">
          <label>Status:</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="filter-select"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="deleted">Deleted</option>
          </select>
        </div>
        <button
          className="btn btn-primary"
          onClick={loadRecords}
        >
          🔄 Refresh
        </button>
      </div>
      
      {/* Messages */}
      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}
      
      {/* Records Table */}
      <div className="tm-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <div>Loading records...</div>
          </div>
        ) : error ? (
          <div className="error-container">
            <div className="error-message">{error}</div>
            <button className="btn btn-primary" onClick={loadRecords}>
              Retry
            </button>
          </div>
        ) : records.length === 0 ? (
          <div className="empty-container">
            <div className="empty-icon">{config.icon}</div>
            <div className="empty-message">No records found</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="tm-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{config.primaryField.replace(/_/g, ' ').toUpperCase()}</th>
                  <th>Date</th>
                  <th>Value</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <tr key={record[getPrimaryKey(activeModule)] || index}>
                    <td className="td-id">
                      {record[getPrimaryKey(activeModule)]}
                    </td>
                    <td className="td-primary">
                      {record[config.primaryField] || 'N/A'}
                    </td>
                    <td className="td-date">
                      {formatDateForDisplay(record[config.dateField])}
                    </td>
                    <td className="td-value">
                      {config.valueField.includes('cost') || config.valueField.includes('amount') || config.valueField.includes('value')
                        ? `₹${parseFloat(record[config.valueField] || 0).toFixed(2)}`
                        : record[config.valueField] || 'N/A'
                      }
                    </td>
                    <td className="td-status">
                      <StatusBadge
                        status={record.status}
                        editStatus={record.edit_status}
                        boundaryMissed={record.boundary_crossed}
                      />
                    </td>
                    <td className="td-actions">
                      <ActionButtons
                        record={record}
                        permissions={{
                          can_edit: record.edit_status !== 'locked',
                          can_delete: record.edit_status === 'editable' && record.status === 'active',
                          editable_fields: record.edit_status === 'partial' ? 'limited' : 'all',
                          reason: record.boundary_crossed ? 'Invoice sent - record locked' : null
                        }}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onViewAudit={handleViewAudit}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Delete Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        record={deleteModal.record}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, record: null })}
        loading={false}
      />
      
      {/* Edit Modal */}
      <EditModal
        isOpen={editModal.isOpen}
        record={editModal.record}
        module={activeModule}
        permissions={editModal.permissions}
        onSave={handleSaveEdit}
        onCancel={() => setEditModal({ isOpen: false, record: null, permissions: null })}
      />
      
      {/* Audit Modal */}
      <AuditModal
        isOpen={auditModal.isOpen}
        record={auditModal.record}
        module={activeModule}
        onClose={() => setAuditModal({ isOpen: false, record: null })}
      />
      
      {/* Footer */}
      <div className="tm-footer">
        <div className="footer-info">
          <span>Transaction Manager v1.0</span>
          <span className="separator">•</span>
          <span>Centralized Edit/Delete with Boundary Crossing</span>
          <span className="separator">•</span>
          <span>All changes are audited</span>
        </div>
      </div>
    </div>
  );
};

export default TransactionManager;
