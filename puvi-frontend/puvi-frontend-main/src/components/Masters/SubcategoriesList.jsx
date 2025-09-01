// File Path: puvi-frontend/puvi-frontend-main/src/components/Masters/SubcategoriesList.jsx
// Subcategories List Component for Oil Types & Blends Management
// Uses the existing /api/subcategories endpoints
// UPDATED: Added GST Rate column display

import React, { useState, useEffect } from 'react';

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

const SubcategoriesList = ({ onAdd, onEdit, refreshTrigger = 0 }) => {
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  // Load subcategories
  useEffect(() => {
    loadSubcategories();
  }, [refreshTrigger]);

  const loadSubcategories = async () => {
    setLoading(true);
    try {
      const response = await apiCall('/api/subcategories');
      
      if (response.success) {
        setSubcategories(response.subcategories || []);
      }
    } catch (error) {
      showToast('error', `Failed to load subcategories: ${error.message}`);
      setSubcategories([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter subcategories based on search
  const filteredSubcategories = subcategories.filter(subcategory => {
    const searchLower = searchTerm.toLowerCase();
    return (
      subcategory.subcategory_name.toLowerCase().includes(searchLower) ||
      subcategory.subcategory_code?.toLowerCase().includes(searchLower) ||
      subcategory.oil_type?.toLowerCase().includes(searchLower) ||
      subcategory.category_name?.toLowerCase().includes(searchLower)
    );
  });

  // Group subcategories by category
  const groupedSubcategories = filteredSubcategories.reduce((acc, subcategory) => {
    const category = subcategory.category_name || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(subcategory);
    return acc;
  }, {});

  // Handle delete (soft delete by setting is_active = false)
  const handleDelete = async (subcategoryId) => {
    if (!window.confirm('Are you sure you want to delete this subcategory?')) {
      return;
    }

    try {
      // Since generic delete endpoint might not exist, we'll use update to set is_active = false
      const response = await apiCall(`/api/masters/subcategories/${subcategoryId}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: false })
      });

      if (response.success) {
        showToast('success', 'Subcategory deleted successfully');
        loadSubcategories();
      }
    } catch (error) {
      // If generic endpoint fails, show message
      showToast('warning', 'Delete not available. Edit the subcategory and set it as inactive.');
    }
  };

  // Show toast message
  const showToast = (type, text) => {
    setMessage({ type, text });
    if (type === 'error') {
      console.error(text);
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // Format field value for display
  const formatFieldValue = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'boolean') {
      return value ? '✅' : '❌';
    }
    return value;
  };

  return (
    <div className="masters-list-container">
      {/* Header Section */}
      <div className="masters-list-header">
        <div className="masters-list-header-content">
          <h2 className="masters-list-title">
            🛢️ Oil Types & Blends Management
          </h2>
          
          <div className="masters-list-controls">
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search oil types, codes, or categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="masters-search-input"
              style={{ minWidth: '300px' }}
            />
            
            {/* Action Buttons */}
            <button
              onClick={onAdd}
              className="masters-btn-add"
            >
              + Add Oil Type
            </button>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#fef3c7',
        borderLeft: '4px solid #f59e0b',
        marginBottom: '20px',
        borderRadius: '4px'
      }}>
        <strong>ℹ️ About Oil Types & Blends:</strong>
        <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
          <li>Define oil types that can be produced from seeds (e.g., Groundnut, Sesame)</li>
          <li>Create blend types for mixed oils (e.g., Deepam Oil, Cooking Blend)</li>
          <li>These oil types will appear in batch production and blending modules</li>
          <li>Seeds must have <code>produces_oil_type</code> set to enable auto-detection</li>
        </ul>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`alert alert-${message.type}`} style={{
          padding: '10px',
          marginBottom: '10px',
          borderRadius: '4px',
          backgroundColor: message.type === 'error' ? '#fee' : message.type === 'success' ? '#efe' : '#ffe',
          color: message.type === 'error' ? '#c00' : message.type === 'success' ? '#060' : '#a60',
          border: `1px solid ${message.type === 'error' ? '#fcc' : message.type === 'success' ? '#cfc' : '#ffc'}`
        }}>
          {message.text}
        </div>
      )}

      {/* Table Section */}
      <div className="masters-table-wrapper">
        {loading ? (
          <div className="masters-loading">
            <div className="masters-loading-spinner"></div>
            <p>Loading oil types...</p>
          </div>
        ) : filteredSubcategories.length === 0 ? (
          <div className="masters-empty">
            <div className="masters-empty-icon">🛢️</div>
            <div className="masters-empty-text">
              {searchTerm ? 'No oil types found matching your search' : 'No oil types configured yet'}
              <br />
              <small>Click "Add Oil Type" to create your first oil type or blend</small>
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            {/* Group by Category */}
            {Object.entries(groupedSubcategories).map(([categoryName, categorySubcategories]) => (
              <div key={categoryName} style={{ marginBottom: '30px' }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '12px',
                  padding: '8px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '4px'
                }}>
                  📂 {categoryName}
                </h3>
                
                <table className="masters-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Subcategory Name</th>
                      <th>Code</th>
                      <th>Oil Type</th>
                      <th>GST Rate</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categorySubcategories.map((subcategory) => (
                      <tr key={subcategory.subcategory_id}>
                        <td>{subcategory.subcategory_id}</td>
                        <td>
                          <strong>{subcategory.subcategory_name}</strong>
                        </td>
                        <td>
                          <code style={{
                            padding: '2px 6px',
                            backgroundColor: '#e5e7eb',
                            borderRadius: '3px',
                            fontSize: '12px'
                          }}>
                            {formatFieldValue(subcategory.subcategory_code)}
                          </code>
                        </td>
                        <td>
                          {subcategory.oil_type ? (
                            <span style={{
                              padding: '4px 8px',
                              backgroundColor: '#dbeafe',
                              color: '#1e40af',
                              borderRadius: '4px',
                              fontSize: '13px',
                              fontWeight: '500'
                            }}>
                              {subcategory.oil_type}
                            </span>
                          ) : (
                            <span style={{ color: '#9ca3af' }}>-</span>
                          )}
                        </td>
                        <td>
                          {subcategory.gst_rate !== null && subcategory.gst_rate !== undefined ? (
                            <span style={{
                              padding: '4px 8px',
                              backgroundColor: '#f0f4f8',
                              color: '#1a365d',
                              borderRadius: '4px',
                              fontSize: '13px',
                              fontWeight: '500'
                            }}>
                              {subcategory.gst_rate}%
                            </span>
                          ) : (
                            <span style={{ color: '#9ca3af' }}>-</span>
                          )}
                        </td>
                        <td>
                          {subcategory.is_active ? (
                            <span className="masters-status-badge masters-status-active">
                              ✅ Active
                            </span>
                          ) : (
                            <span className="masters-status-badge masters-status-inactive">
                              ❌ Inactive
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="masters-actions">
                            <button
                              onClick={() => onEdit(subcategory)}
                              className="masters-btn-edit"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            {subcategory.is_active && (
                              <button
                                onClick={() => handleDelete(subcategory.subcategory_id)}
                                className="masters-btn-delete"
                                title="Delete"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Statistics Footer */}
      {!loading && subcategories.length > 0 && (
        <div style={{
          marginTop: '20px',
          padding: '12px',
          backgroundColor: '#f9fafb',
          borderRadius: '4px',
          fontSize: '14px',
          color: '#6b7280'
        }}>
          <strong>Statistics:</strong> {' '}
          Total {subcategories.length} oil types configured | {' '}
          {subcategories.filter(s => s.is_active).length} active | {' '}
          {subcategories.filter(s => s.oil_type).length} with oil type mapping | {' '}
          {subcategories.filter(s => s.gst_rate !== null).length} with GST rates configured
        </div>
      )}
    </div>
  );
};

export default SubcategoriesList;
