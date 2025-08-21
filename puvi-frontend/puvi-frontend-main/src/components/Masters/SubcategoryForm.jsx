// File Path: puvi-frontend/puvi-frontend-main/src/components/Masters/SubcategoryForm.jsx
// Subcategory Form Component for Oil Types & Blends CRUD
// FIXED: Now only shows Seeds and Oil categories for oil production management
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
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      // If not JSON, fall back to text
      const text = await response.text();
      console.log('Backend non-JSON response:', text);
      throw new Error(text || `API call failed: ${response.status}`);
    }
    if (!response.ok) {
      console.log('Backend response data:', data); // Log raw data for debugging
      throw new Error(data.message || data.error || JSON.stringify(data) || `API call failed: ${response.status}`);
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
  
  // FIXED: Load ONLY oil-related categories (Seeds and Oil)
  const loadCategories = async () => {
    try {
      const response = await apiCall('/api/categories');
      if (response.success) {
        // FILTER to only Seeds and Oil categories for oil production management
        const oilRelatedCategories = (response.categories || [])
          .filter(c => ['Seeds', 'Oil'].includes(c.category_name));
        
        setCategories(oilRelatedCategories);
       
        // Auto-select "Seeds" category for new entries
        const seedsCategory = oilRelatedCategories.find(c => c.category_name === 'Seeds');
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
    // Convert category_id to integer when it comes from select dropdown
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
      } else if (name.includes('SEED')) {
        // Seed pattern - take first letters
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
      newErrors.subcategory_name = 'Name is required';
    }
   
    if (!formData.subcategory_code || formData.subcategory_code.trim() === '') {
      newErrors.subcategory_code = 'Code is required';
    } else if (!/^[A-Z0-9\-]+$/.test(formData.subcategory_code)) {
      newErrors.subcategory_code = 'Code must contain only uppercase letters, numbers, and hyphens';
    } else if (formData.subcategory_code.length < 2) {
      newErrors.subcategory_code = 'Code must be at least 2 characters';
    } else if (formData.subcategory_code.length > 20) {
      newErrors.subcategory_code = 'Code must not exceed 20 characters';
    }
   
    if (!formData.category_id) {
      newErrors.category_id = 'Category is required';
    }
   
    // Oil type validation - only for Oil/Seeds categories
    const selectedCategory = categories.find(c => c.category_id === formData.category_id);
    if (selectedCategory && ['Oil', 'Seeds'].includes(selectedCategory.category_name)) {
      if (!formData.oil_type || formData.oil_type.trim() === '') {
        console.warn('⚠️ No oil_type specified for Oil/Seeds subcategory!');
        console.warn('This subcategory cannot be used in batch production.');
        console.warn('Set oil_type to match produces_oil_type in seed materials (e.g., "Groundnut", "Sesame")');
        // Don't block submission, but warn
      }
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
     
      // Prepare data with proper types
      const submitData = {
        ...formData,
        // Ensure category_id is integer if it exists
        category_id: formData.category_id ? parseInt(formData.category_id, 10) : null
      };
     
      // Add debug logging to see what's being sent
      console.log('=== Submitting Subcategory ===');
      console.log('Data being sent:', JSON.stringify(submitData, null, 2));
      console.log('Category ID:', submitData.category_id, 'Type:', typeof submitData.category_id);
      console.log('========================');
     
      if (isEditMode) {
        // Update existing subcategory
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
        try {
          response = await apiCall('/api/masters/subcategories', {
            method: 'POST',
            body: JSON.stringify(submitData)
          });
        } catch (error) {
          // Log the actual error for debugging
          console.log('Create subcategory error:', error.message);
          console.error('Full error object:', error);
         
          // Try to parse the error message for specific issues
          let errorMessage = error.message || 'Failed to create subcategory';
         
          // Check for specific validation errors from backend
          if (errorMessage.includes('category_id')) {
            errorMessage = 'Invalid category selected. Please select a valid category.';
          } else if (errorMessage.includes('duplicate key') || errorMessage.includes('already exists')) {
            if (errorMessage.includes('subcategory_code')) {
              errorMessage = `Code "${submitData.subcategory_code}" already exists. Please use a different code.`;
            } else if (errorMessage.includes('subcategory_name')) {
              errorMessage = `Name "${submitData.subcategory_name}" already exists. Please use a different name.`;
            } else {
              errorMessage = 'A subcategory with these details already exists.';
            }
          } else if (errorMessage.includes('unique') && errorMessage.includes('subcategory_code')) {
            errorMessage = `Code "${submitData.subcategory_code}" already exists. Please use a different code.`;
          } else if (errorMessage.includes('unique') && errorMessage.includes('subcategory_name')) {
            errorMessage = `Name "${submitData.subcategory_name}" already exists. Please use a different name.`;
          } else if (errorMessage.includes('foreign key') || errorMessage.includes('violates foreign key')) {
            errorMessage = 'Selected category does not exist. Please refresh and try again.';
          } else if (errorMessage.includes('validation failed') || errorMessage.includes('validation error')) {
            errorMessage = 'Please check all required fields are filled correctly.';
          } else if (errorMessage.includes('Invalid master type')) {
            errorMessage = 'Backend configuration issue. Please contact support.';
          } else if (errorMessage.includes('not found')) {
            errorMessage = 'The API endpoint is not available. Please check backend deployment.';
          }
         
          // Show the actual backend error in console for debugging
          console.error('Backend error details:', errorMessage);
         
          response = {
            success: false,
            message: errorMessage
          };
        }
      }
     
      if (response.success) {
        onSave(response);
      } else {
        setErrors({ submit: response.message || 'Failed to save' });
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
            {isEditMode ? 'Edit Oil Type/Blend' : 'Add New Oil Type or Seed Variety'}
          </h2>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
            Configure oil production: Map seeds to oil types or define finished oil products
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="masters-form-body">
          {/* SIMPLIFIED Context-Sensitive Help for Oil Production Only */}
          {formData.category_id ? (
            <div style={{
              padding: '10px',
              backgroundColor: '#f0f9ff',
              borderRadius: '4px',
              marginBottom: '15px',
              fontSize: '13px',
              color: '#0369a1'
            }}>
              <strong>📋 Creating {categories.find(c => c.category_id === formData.category_id)?.category_name} Subcategory</strong>
              <div style={{ marginTop: '5px', fontSize: '12px' }}>
                {categories.find(c => c.category_id === formData.category_id)?.category_name === 'Oil' && (
                  <>• Define finished oil products (Sesame Oil, Coconut Oil, Deepam Oil, etc.)<br/>
                  • Set oil_type to match what seeds produce (e.g., "Groundnut", "Sesame")<br/>
                  • Used in blending and SKU production</>
                )}
                {categories.find(c => c.category_id === formData.category_id)?.category_name === 'Seeds' && (
                  <>• Define seed varieties that produce specific oil types<br/>
                  • Set oil_type to specify what oil this seed produces<br/>
                  • Enables auto-detection in batch production</>
                )}
              </div>
            </div>
          ) : (
            <div style={{
              padding: '10px',
              backgroundColor: '#f0f9ff',
              borderRadius: '4px',
              marginBottom: '15px',
              fontSize: '13px',
              color: '#0369a1'
            }}>
              <strong>📋 Oil Production Configuration</strong>
              <div style={{ marginTop: '5px', fontSize: '12px' }}>
                • <strong>Seeds:</strong> Define what oil type each seed variety produces<br/>
                • <strong>Oil:</strong> Define finished oil products and blends
              </div>
            </div>
          )}
          
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
          
          {/* Name Field */}
          <div className="form-group">
            <label className="form-label">
              Name <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              className={`form-control ${errors.subcategory_name ? 'error' : ''}`}
              value={formData.subcategory_name}
              onChange={(e) => handleFieldChange('subcategory_name', e.target.value)}
              placeholder={
                formData.category_id ?
                  (categories.find(c => c.category_id === formData.category_id)?.category_name === 'Oil' ?
                    "e.g., Sesame Oil, Coconut Oil, Deepam Oil" :
                    "e.g., Groundnut Seed, Sesame Seed") :
                  "Select a category first"
              }
              disabled={saving}
            />
            {errors.subcategory_name && (
              <div className="form-error">{errors.subcategory_name}</div>
            )}
            <div className="form-help">
              {categories.find(c => c.category_id === formData.category_id)?.category_name === 'Oil' ? 
                "Name of the finished oil product or blend" :
                "Name of the seed variety"}
            </div>
          </div>
          
          {/* Code Field */}
          <div className="form-group">
            <label className="form-label">
              Code <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              className={`form-control ${errors.subcategory_code ? 'error' : ''}`}
              value={formData.subcategory_code}
              onChange={(e) => handleFieldChange('subcategory_code', e.target.value.toUpperCase())}
              placeholder="e.g., SO, CO, DSO, GNS"
              maxLength="20"
              disabled={saving}
            />
            {errors.subcategory_code && (
              <div className="form-error">{errors.subcategory_code}</div>
            )}
            <div className="form-help">
              Short unique code (2-20 characters). Auto-generates from name if left empty.
            </div>
          </div>
          
          {/* Category Selection - ONLY Seeds and Oil */}
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
                ⚠️ No oil-related categories available. Please ensure Seeds and Oil categories exist.
              </div>
            ) : (
              <div>
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
                    </option>
                  ))}
                </select>
                {errors.category_id && (
                  <div className="form-error">{errors.category_id}</div>
                )}
                <div className="form-help">
                  <strong>Seeds:</strong> For seed varieties that produce oil<br/>
                  <strong>Oil:</strong> For finished oil products and blends
                </div>
              </div>
            )}
          </div>
          
          {/* Oil Type - Critical for Production */}
          {formData.category_id && ['Oil', 'Seeds'].includes(
            categories.find(c => c.category_id === formData.category_id)?.category_name
          ) ? (
            <div className="form-group" style={{
              padding: '12px',
              backgroundColor: '#fef3c7',
              borderRadius: '4px',
              border: '1px solid #f59e0b'
            }}>
              <label className="form-label">
                Oil Type <span style={{ color: '#f59e0b' }}>⚠️ Required for Production</span>
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
                <strong>🔑 Critical:</strong> Must match exactly between seeds and oil products<br/>
                <strong>Format:</strong> Single word (Groundnut, Sesame, Mustard, Coconut)<br/>
                <strong>Example:</strong> Seed with oil_type="Groundnut" → Oil with oil_type="Groundnut"
              </div>
            </div>
          ) : null}
          
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
              Uncheck to hide from dropdowns without deleting
            </div>
          </div>
          
          {/* Production Flow Info Box */}
          <div style={{
            padding: '12px',
            backgroundColor: '#dbeafe',
            borderRadius: '4px',
            marginTop: '20px',
            fontSize: '14px',
            color: '#1e40af'
          }}>
            <strong>💡 Oil Production Flow:</strong>
            <ol style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
              <li>Create seed variety with oil_type (e.g., "Groundnut")</li>
              <li>Create oil product with matching oil_type</li>
              <li>Purchase seeds → Materials get produces_oil_type</li>
              <li>Batch production auto-detects and produces correct oil</li>
              <li>Blending module uses these oil types</li>
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
