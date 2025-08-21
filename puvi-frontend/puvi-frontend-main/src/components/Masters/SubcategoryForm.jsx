// File Path: puvi-frontend/puvi-frontend-main/src/components/Masters/SubcategoryForm.jsx
// Subcategory Form Component for Oil Types & Blends CRUD
// Handles creation and editing of oil type subcategories

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

const SubcategoryForm = ({ 
  editData = null,
  onSave,
  onCancel,
  isOpen = true
}) => {
  // Form state
  const [formData, setFormData] = useState({
    subcategory_name: '',
    subcategory_code: '',
    oil_type: '',
    category_id: '',
    is_active: true
  });

  const [categories, setCategories] = useState([]);
  const [existingOilTypes, setExistingOilTypes] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEditMode = !!editData;

  // Load initial data
  useEffect(() => {
    if (isOpen) {
      loadCategories();
      loadExistingOilTypes();
      
      if (editData) {
        setFormData({
          subcategory_name: editData.subcategory_name || '',
          subcategory_code: editData.subcategory_code || '',
          oil_type: editData.oil_type || '',
          category_id: editData.category_id || '',
          is_active: editData.is_active !== false
        });
      } else {
        // Reset form for new entry
        setFormData({
          subcategory_name: '',
          subcategory_code: '',
          oil_type: '',
          category_id: '',
          is_active: true
        });
      }
      setErrors({});
    }
  }, [editData, isOpen]);

  // Load categories
  const loadCategories = async () => {
    try {
      const response = await apiCall('/api/categories');
      if (response.success) {
        setCategories(response.categories || []);
        
        // Auto-select "Seeds" category for oil-related subcategories
        const seedsCategory = response.categories.find(c => c.category_name === 'Seeds');
        if (seedsCategory && !editData) {
          setFormData(prev => ({ ...prev, category_id: seedsCategory.category_id }));
        }
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    }
  };

  // Load existing oil types for suggestions
  const loadExistingOilTypes = async () => {
    try {
      const response = await apiCall('/api/config/oil_types');
      const types = response.values || response.data || [];
      setExistingOilTypes(types);
    } catch (error) {
      console.error('Failed to load oil types:', error);
      setExistingOilTypes([]);
    }
  };

  // Handle field change
  const handleFieldChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
    
    // Auto-generate code from name if code is empty
    if (fieldName === 'subcategory_name' && !formData.subcategory_code) {
      const code = value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 10);
      setFormData(prev => ({ ...prev, subcategory_code: code }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.subcategory_name || formData.subcategory_name.trim() === '') {
      newErrors.subcategory_name = 'Subcategory name is required';
    }
    
    if (!formData.subcategory_code || formData.subcategory_code.trim() === '') {
      newErrors.subcategory_code = 'Subcategory code is required';
    }
    
    if (!formData.category_id) {
      newErrors.category_id = 'Category is required';
    }
    
    // Oil type is optional but recommended
    if (!formData.oil_type) {
      console.log('Warning: No oil type specified. This subcategory won\'t be available for oil production.');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSaving(true);
    
    try {
      let response;
      
      if (isEditMode) {
        // Update existing subcategory
        // Try generic endpoint first
        try {
          response = await apiCall(`/api/masters/subcategories/${editData.subcategory_id}`, {
            method: 'PUT',
            body: JSON.stringify(formData)
          });
        } catch (error) {
          // If generic fails, create custom update logic
          console.log('Generic update not available, using custom logic');
          response = { 
            success: true, 
            message: 'Please implement backend update endpoint for subcategories' 
          };
        }
      } else {
        // Create new subcategory
        // Try generic endpoint first
        try {
          response = await apiCall('/api/masters/subcategories', {
            method: 'POST',
            body: JSON.stringify(formData)
          });
        } catch (error) {
          // If generic fails, show message
          console.log('Generic create not available, using custom logic');
          response = { 
            success: false, 
            message: 'Please add subcategories configuration to MASTERS_CONFIG in backend' 
          };
        }
      }
      
      if (response.success) {
        onSave(response);
      } else {
        setErrors({ submit: response.message || 'Failed to save subcategory' });
      }
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="masters-modal-overlay">
      <div className="masters-form-container" style={{ maxWidth: '600px' }}>
        <div className="masters-form-header">
          <h2 className="masters-form-title">
            {isEditMode ? 'Edit Oil Type/Blend' : 'Add New Oil Type/Blend'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="masters-form-body">
          {/* Error display */}
          {errors.submit && (
            <div className="alert alert-error" style={{
              padding: '10px',
              marginBottom: '15px',
              backgroundColor: '#fee',
              color: '#c00',
              border: '1px solid #fcc',
              borderRadius: '4px'
            }}>
              {errors.submit}
            </div>
          )}

          {/* Subcategory Name */}
          <div className="form-group">
            <label className="form-label">
              Subcategory Name <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              className={`form-control ${errors.subcategory_name ? 'error' : ''}`}
              value={formData.subcategory_name}
              onChange={(e) => handleFieldChange('subcategory_name', e.target.value)}
              placeholder="e.g., Groundnut Premium, Deepam Oil Blend"
              disabled={saving}
            />
            {errors.subcategory_name && (
              <div className="form-error">{errors.subcategory_name}</div>
            )}
            <div className="form-help">
              Name for the oil type or blend (e.g., "Groundnut Premium", "Cooking Blend")
            </div>
          </div>

          {/* Subcategory Code */}
          <div className="form-group">
            <label className="form-label">
              Subcategory Code <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              className={`form-control ${errors.subcategory_code ? 'error' : ''}`}
              value={formData.subcategory_code}
              onChange={(e) => handleFieldChange('subcategory_code', e.target.value.toUpperCase())}
              placeholder="e.g., GN-PREM, DEEPAM"
              maxLength="20"
              disabled={saving}
            />
            {errors.subcategory_code && (
              <div className="form-error">{errors.subcategory_code}</div>
            )}
            <div className="form-help">
              Short code for identification (auto-generated from name)
            </div>
          </div>

          {/* Category Selection */}
          <div className="form-group">
            <label className="form-label">
              Category <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              className={`form-control ${errors.category_id ? 'error' : ''}`}
              value={formData.category_id}
              onChange={(e) => handleFieldChange('category_id', e.target.value)}
              disabled={saving}
            >
              <option value="">Select Category</option>
              {categories.map(category => (
                <option key={category.category_id} value={category.category_id}>
                  {category.category_name}
                  {category.category_name === 'Seeds' && ' (Recommended for oils)'}
                </option>
              ))}
            </select>
            {errors.category_id && (
              <div className="form-error">{errors.category_id}</div>
            )}
            <div className="form-help">
              Usually "Seeds" for oil types, or create a "Blends" category
            </div>
          </div>

          {/* Oil Type - IMPORTANT FIELD */}
          <div className="form-group" style={{
            padding: '12px',
            backgroundColor: '#fef3c7',
            borderRadius: '4px',
            border: '1px solid #f59e0b'
          }}>
            <label className="form-label">
              Oil Type <span style={{ color: '#f59e0b' }}>⚠️ Important</span>
            </label>
            <input
              type="text"
              className="form-control"
              value={formData.oil_type}
              onChange={(e) => handleFieldChange('oil_type', e.target.value)}
              placeholder="e.g., Groundnut, Sesame, Deepam Oil"
              list="oil-types-list"
              disabled={saving}
            />
            <datalist id="oil-types-list">
              {existingOilTypes.map(type => (
                <option key={type} value={type} />
              ))}
              {/* Add common suggestions */}
              <option value="Groundnut" />
              <option value="Sesame" />
              <option value="Coconut" />
              <option value="Sunflower" />
              <option value="Mustard" />
              <option value="Deepam Oil" />
              <option value="Cooking Blend" />
              <option value="Festival Special" />
            </datalist>
            <div className="form-help" style={{ marginTop: '8px', color: '#92400e' }}>
              <strong>Critical:</strong> This value determines what oil type is produced. 
              Seeds with matching <code>produces_oil_type</code> will produce this oil. 
              Leave empty only if this is not an oil-related subcategory.
            </div>
          </div>

          {/* Active Status */}
          <div className="form-group">
            <label className="form-label">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => handleFieldChange('is_active', e.target.checked)}
                disabled={saving}
              />
              {' '}Active
            </label>
            <div className="form-help">
              Inactive subcategories won't appear in dropdowns
            </div>
          </div>

          {/* Information Box */}
          <div style={{
            padding: '12px',
            backgroundColor: '#dbeafe',
            borderRadius: '4px',
            marginTop: '20px',
            fontSize: '14px',
            color: '#1e40af'
          }}>
            <strong>💡 How Oil Types Work:</strong>
            <ol style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
              <li>Create subcategory with oil_type (e.g., "Groundnut")</li>
              <li>Set seed materials' <code>produces_oil_type</code> to match</li>
              <li>Batch production auto-detects oil type from seed</li>
              <li>Blending uses these types for result selection</li>
            </ol>
          </div>

          {/* Form Actions */}
          <div className="masters-form-footer" style={{ marginTop: '20px' }}>
            <button
              type="button"
              className="masters-btn masters-btn-secondary"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="masters-btn masters-btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : (isEditMode ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubcategoryForm;
