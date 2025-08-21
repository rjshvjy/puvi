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
    // FIXED: Convert category_id to integer when it comes from select dropdown
    if (fieldName === 'category_id' && value !== '') {
      value = parseInt(value, 10);
    }
    
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
      // Generate code based on common patterns:
      // Simple oils: Take first letters (Sesame Oil -> SO)
      // Deepam oils: Prefix with D (Deepam Sesame Oil -> DSO)
      let code = '';
      const name = value.toUpperCase();
      
      if (name.startsWith('DEEPAM ')) {
        // Deepam brand pattern
        const afterDeepam = name.replace('DEEPAM ', '');
        if (afterDeepam.includes(' OIL')) {
          // Take first letter of each word
          code = 'D' + afterDeepam.split(' ').map(w => w[0]).join('');
        } else {
          code = 'D' + afterDeepam.substring(0, 2);
        }
      } else if (name.includes(' OIL')) {
        // Simple oil pattern - take first letters
        code = name.split(' ').map(w => w[0]).join('');
      } else {
        // Default: first 3-4 characters
        code = name.replace(/[^A-Z0-9]/g, '').substring(0, 4);
      }
      
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
    } else if (!/^[A-Z0-9\-]+$/.test(formData.subcategory_code)) {
      newErrors.subcategory_code = 'Code must contain only uppercase letters, numbers, and hyphens';
    } else if (formData.subcategory_code.length < 2) {
      newErrors.subcategory_code = 'Code must be at least 2 characters (e.g., SO, CO, DSO)';
    }
    
    if (!formData.category_id) {
      newErrors.category_id = 'Category is required';
    }
    
    // Oil type is critical for production flow
    if (!formData.oil_type || formData.oil_type.trim() === '') {
      console.warn('⚠️ No oil_type specified! This subcategory cannot be used in batch production.');
      console.warn('Seeds with produces_oil_type will not link to this subcategory.');
      console.warn('To fix: Set oil_type to match produces_oil_type in seed materials (e.g., "Groundnut", "Sesame")');
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
      
      // FIXED: Prepare data with proper types
      const submitData = {
        ...formData,
        // Ensure category_id is integer if it exists
        category_id: formData.category_id ? parseInt(formData.category_id, 10) : null
      };
      
      // Add debug logging to see what's being sent
      console.log('Submitting subcategory data:', JSON.stringify(submitData, null, 2));
      
      if (isEditMode) {
        // Update existing subcategory
        // Try generic endpoint first
        try {
          response = await apiCall(`/api/masters/subcategories/${editData.subcategory_id}`, {
            method: 'PUT',
            body: JSON.stringify(submitData)
          });
        } catch (error) {
          console.log('Update subcategory error:', error.message);
          
          // Parse backend validation errors if available
          let errorMessage = error.message;
          
          // Common validation error patterns
          if (errorMessage.includes('category_id')) {
            errorMessage = 'Invalid category selected. Please select a valid category.';
          } else if (errorMessage.includes('unique') && errorMessage.includes('subcategory_code')) {
            errorMessage = `Code "${submitData.subcategory_code}" already exists. Try a different code.`;
          } else if (errorMessage.includes('validation')) {
            errorMessage = 'Validation failed. Check all required fields are filled correctly.';
          }
          
          response = { 
            success: false, 
            message: errorMessage 
          };
        }
      } else {
        // Create new subcategory
        // Try generic endpoint first
        try {
          response = await apiCall('/api/masters/subcategories', {
            method: 'POST',
            body: JSON.stringify(submitData)
          });
        } catch (error) {
          // Log the actual error for debugging
          console.log('Create subcategory error:', error.message);
          
          // Parse backend validation errors if available
          let errorMessage = error.message;
          
          // Common validation error patterns
          if (errorMessage.includes('category_id')) {
            errorMessage = 'Invalid category selected. Please select a valid category.';
          } else if (errorMessage.includes('unique') && errorMessage.includes('subcategory_code')) {
            errorMessage = `Code "${submitData.subcategory_code}" already exists. Try a different code.`;
          } else if (errorMessage.includes('validation')) {
            errorMessage = 'Validation failed. Check all required fields are filled correctly.';
          }
          
          response = { 
            success: false, 
            message: errorMessage 
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
          {/* Quick Reference Guide */}
          <div style={{
            padding: '10px',
            backgroundColor: '#f0f9ff',
            borderRadius: '4px',
            marginBottom: '15px',
            fontSize: '13px',
            color: '#0369a1'
          }}>
            <strong>📋 Quick Reference - Existing Patterns:</strong>
            <div style={{ marginTop: '5px', fontFamily: 'monospace', fontSize: '12px' }}>
              • Simple oils: SO (Sesame Oil), CO (Coconut Oil), MO (Mustard Oil)<br/>
              • Deepam brand: DSO (Deepam Sesame), DCO (Deepam Coconut), DGO (Deepam Ghee)<br/>
              • Oil types in use: Groundnut, Sesame, Mustard, Coconut
            </div>
          </div>

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
              placeholder="e.g., Sesame Oil, Coconut Oil, Deepam Sesame Oil"
              disabled={saving}
            />
            {errors.subcategory_name && (
              <div className="form-error">{errors.subcategory_name}</div>
            )}
            <div className="form-help">
              <strong>What:</strong> Full name of the oil product or blend<br/>
              <strong>Examples:</strong> "Sesame Oil", "Mustard Oil", "Deepam Coconut Oil", "VCO"<br/>
              <strong>Why:</strong> This name appears in production batches and sales records
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
              placeholder="e.g., SO, CO, DSO, DEEPAM-PUVI"
              maxLength="20"
              disabled={saving}
            />
            {errors.subcategory_code && (
              <div className="form-error">{errors.subcategory_code}</div>
            )}
            <div className="form-help">
              <strong>What:</strong> Short code for quick identification (2-11 characters)<br/>
              <strong>Format:</strong> Simple oils: 2-3 letters (SO=Sesame Oil, CO=Coconut Oil, MO=Mustard Oil)<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Deepam brand: Start with 'D' (DSO=Deepam Sesame, DGO=Deepam Ghee)<br/>
              <strong>Why:</strong> Used in inventory tracking and batch codes
            </div>
          </div>

          {/* Category Selection */}
          <div className="form-group">
            <label className="form-label">
              Category <span style={{ color: 'red' }}>*</span>
            </label>
            {categories.length === 0 ? (
              <div style={{
                padding: '10px',
                backgroundColor: '#fee',
                color: '#c00',
                borderRadius: '4px',
                fontSize: '14px'
              }}>
                ⚠️ No categories available. Please create categories first (Seeds, Oil, etc.)
              </div>
            ) : (
              <>
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
                  <strong>What:</strong> Parent category that groups similar products<br/>
                  <strong>Select:</strong> "Seeds" for oil products, "Oil" for refined oils<br/>
                  <strong>Why:</strong> Links subcategory to materials and determines production flow
                </div>
              </>
            )}
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
              Oil Type <span style={{ color: '#f59e0b' }}>⚠️ Critical for Production</span>
            </label>
            <input
              type="text"
              className="form-control"
              value={formData.oil_type}
              onChange={(e) => handleFieldChange('oil_type', e.target.value)}
              placeholder="e.g., Groundnut, Sesame, Mustard, Coconut"
              list="oil-types-list"
              disabled={saving}
            />
            <datalist id="oil-types-list">
              {existingOilTypes.map(type => (
                <option key={type} value={type} />
              ))}
            </datalist>
            <div className="form-help" style={{ marginTop: '8px', color: '#92400e' }}>
              <strong>🔑 Critical:</strong> This MUST match the <code>produces_oil_type</code> in seed materials!<br/>
              <strong>What:</strong> The type of oil produced (one word, no "Oil" suffix)<br/>
              <strong>Examples:</strong> "Groundnut", "Sesame", "Mustard", "Coconut"<br/>
              <strong>How it works:</strong><br/>
              • Seeds with <code>produces_oil_type="Groundnut"</code> → Produce oil with <code>oil_type="Groundnut"</code><br/>
              • Batch production auto-detects oil type from the seed's <code>produces_oil_type</code><br/>
              • Leave empty ONLY for non-oil products
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
              <strong>What:</strong> Controls visibility in dropdown menus<br/>
              <strong>Uncheck if:</strong> Discontinuing this oil type or temporarily not producing<br/>
              <strong>Effect:</strong> Inactive items won't appear in batch production or blending options
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
            <strong>💡 Production Flow Example:</strong>
            <ol style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
              <li>Create subcategory "Sesame Oil" with <code>oil_type="Sesame"</code></li>
              <li>Material "Sesame Seeds White" has <code>produces_oil_type="Sesame"</code></li>
              <li>When crushing sesame seeds in batch, system auto-produces "Sesame Oil"</li>
              <li>Blending module uses these oil types for creating new blends</li>
            </ol>
            <div style={{ marginTop: '8px', fontSize: '13px' }}>
              <strong>Current Oil Types in System:</strong> Groundnut, Sesame, Mustard, Coconut, etc.
            </div>
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

          {/* Debug Info - Only in development */}
          {process.env.NODE_ENV === 'development' && (
            <div style={{
              marginTop: '20px',
              padding: '10px',
              backgroundColor: '#f3f4f6',
              borderRadius: '4px',
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#6b7280'
            }}>
              <strong>Debug Info:</strong><br/>
              category_id: {formData.category_id} (type: {typeof formData.category_id})<br/>
              oil_type: "{formData.oil_type}"<br/>
              code: "{formData.subcategory_code}"<br/>
              Active categories: {categories.length}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default SubcategoryForm;
