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
      
      // Clear oil_type if switching to non-oil category
      const selectedCategory = categories.find(c => c.category_id === value);
      if (selectedCategory && !['Oil', 'Seeds'].includes(selectedCategory.category_name)) {
        setFormData(prev => ({
          ...prev,
          category_id: value,
          oil_type: '' // Clear oil_type for non-oil categories
        }));
        return;
      }
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
      
      // FIXED: Prepare data with proper types
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
            {isEditMode ? 'Edit Subcategory' : 'Add New Subcategory'}
          </h2>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
            Create subcategories under main categories (e.g., oil types under Oil/Seeds, sub-types under Chemicals/Packaging)
          </div>
        </div>

        <form onSubmit={handleSubmit} className="masters-form-body">
          {/* Context-Sensitive Help */}
          {formData.category_id && (
            <div style={{
              padding: '10px',
              backgroundColor: '#f0f9ff',
              borderRadius: '4px',
              marginBottom: '15px',
              fontSize: '13px',
              color: '#0369a1'
            }}>
              <strong>📋 Creating Subcategory for: {categories.find(c => c.category_id === formData.category_id)?.category_name}</strong>
              <div style={{ marginTop: '5px', fontSize: '12px' }}>
                {categories.find(c => c.category_id === formData.category_id)?.category_name === 'Oil' && (
                  <>• Oil subcategories define finished oil products (Sesame Oil, Coconut Oil, etc.)<br/>
                  • Set oil_type to match what seeds produce (Groundnut, Sesame, etc.)</>
                )}
                {categories.find(c => c.category_id === formData.category_id)?.category_name === 'Seeds' && (
                  <>• Seeds usually don't need subcategories - add seeds directly as materials<br/>
                  • Only create if you need to group different seed types</>
                )}
                {['Chemicals', 'Consumables', 'Packaging'].includes(
                  categories.find(c => c.category_id === formData.category_id)?.category_name
                ) && (
                  <>• Optional - you can add materials directly to the category<br/>
                  • Create subcategories only if you need further grouping</>
                )}
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
              placeholder={
                formData.category_id ? 
                  (categories.find(c => c.category_id === formData.category_id)?.category_name === 'Oil' ? 
                    "e.g., Sesame Oil, Coconut Oil, Deepam Oil" : 
                    "Enter subcategory name") : 
                  "Select a category first"
              }
              disabled={saving}
            />
            {errors.subcategory_name && (
              <div className="form-error">{errors.subcategory_name}</div>
            )}
            <div className="form-help">
              <strong>What:</strong> Name for the subcategory type<br/>
              <strong>Examples by Category:</strong><br/>
              • Oil: "Sesame Oil", "Coconut Oil", "Deepam Sesame Oil"<br/>
              • Chemicals: "Acids", "Bases", "Solvents" (if needed)<br/>
              • Packaging: "Bottles", "Labels", "Boxes" (if needed)<br/>
              <strong>Note:</strong> This name appears in materials management and production
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
              placeholder={
                formData.category_id && formData.subcategory_name ? 
                  "Auto-generated from name" : 
                  "e.g., SO, CO, DSO, CHEM-01"
              }
              maxLength="20"
              disabled={saving}
            />
            {errors.subcategory_code && (
              <div className="form-error">{errors.subcategory_code}</div>
            )}
            <div className="form-help">
              <strong>What:</strong> Short code for identification (2-20 characters, MUST BE UNIQUE)<br/>
              <strong>Examples by Type:</strong><br/>
              • Oil products: SO (Sesame Oil), CO (Coconut Oil), MO (Mustard Oil)<br/>
              • Branded items: DSO (Deepam Sesame), DGO (Deepam Ghee)<br/>
              • Others: Create meaningful abbreviations<br/>
              <strong>⚠️ Note:</strong> Code must be unique across all subcategories<br/>
              <strong>Auto-generates</strong> from name if left empty
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
                  <strong>Purpose:</strong> Groups materials into specific types under this category<br/>
                  {formData.category_id && categories.find(c => c.category_id === formData.category_id)?.category_name === 'Oil' && (
                    <><strong>For Oil:</strong> Create different oil product types (Sesame Oil, Coconut Oil, etc.)<br/></>
                  )}
                  {formData.category_id && categories.find(c => c.category_id === formData.category_id)?.category_name === 'Seeds' && (
                    <><strong>For Seeds:</strong> Usually not needed - seeds are materials, not subcategories<br/></>
                  )}
                  {formData.category_id && ['Chemicals', 'Consumables', 'Packaging'].includes(
                    categories.find(c => c.category_id === formData.category_id)?.category_name
                  ) && (
                    <><strong>Note:</strong> Subcategories optional - materials can directly belong to category<br/></>
                  )}
                </div>
              </div>
            )}
          </div>
          </div>

          {/* Oil Type - ONLY FOR OIL PRODUCTS */}
          {formData.category_id && ['Oil', 'Seeds'].includes(
            categories.find(c => c.category_id === formData.category_id)?.category_name
          ) && (
            <div className="form-group" style={{
              padding: '12px',
              backgroundColor: '#fef3c7',
              borderRadius: '4px',
              border: '1px solid #f59e0b'
            }}>
              <label className="form-label">
                Oil Type <span style={{ color: '#f59e0b' }}>⚠️ Required for Oil Production</span>
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
                <strong>🔑 Critical for Production:</strong> Must match seed's <code>produces_oil_type</code><br/>
                <strong>Format:</strong> Single word (Groundnut, Sesame, Mustard, Coconut)<br/>
                <strong>NOT:</strong> Full product names like "Deepam Oil" or "Sesame Oil"<br/>
                <strong>Example:</strong> Seeds with produces_oil_type="Groundnut" → Oil with oil_type="Groundnut"
              </div>
            </div>
          )}

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

          {/* Information Box - Show relevant info based on category */}
          {formData.category_id && ['Oil', 'Seeds'].includes(
            categories.find(c => c.category_id === formData.category_id)?.category_name
          ) ? (
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
                <li>Create oil subcategory with matching <code>oil_type</code></li>
                <li>Seed materials have <code>produces_oil_type</code> set to same value</li>
                <li>Batch production auto-detects and produces the correct oil type</li>
                <li>Blending module uses these oil types for creating blends</li>
              </ol>
            </div>
          ) : (
            <div style={{
              padding: '12px',
              backgroundColor: '#e0e7ff',
              borderRadius: '4px',
              marginTop: '20px',
              fontSize: '14px',
              color: '#3730a3'
            }}>
              <strong>💡 Subcategory Usage:</strong>
              <div style={{ marginTop: '8px' }}>
                • Subcategories group materials into specific types<br/>
                • Materials will belong to Category → Subcategory<br/>
                • Only create if you need this extra level of organization<br/>
                • For simple materials, you can skip subcategories
              </div>
            </div>
          )}

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
      </div>
    </div>
  );
};

export default SubcategoryForm;
