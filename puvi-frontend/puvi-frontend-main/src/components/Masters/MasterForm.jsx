// MasterForm Component - Dynamic form generation for all master types
// File Path: puvi-frontend/puvi-frontend-main/src/components/Masters/MasterForm.jsx
// Enhanced with auto-formatting and better guidelines

import React, { useState, useEffect } from 'react';

// API configuration
const API_BASE_URL = 'https://puvi-backend.onrender.com';

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
      throw new Error(data.error || data.errors || `API call failed: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Short Code Guidelines Component
const ShortCodeGuidelines = ({ masterType, category }) => {
  if (masterType === 'suppliers') {
    return (
      <div style={{ backgroundColor: '#f0f8ff', padding: '10px', borderRadius: '5px', marginBottom: '10px', fontSize: '13px' }}>
        <strong>📋 SUPPLIER SHORT CODE</strong>
        <ul style={{ marginTop: '5px', marginBottom: 0, paddingLeft: '20px' }}>
          <li>Must be EXACTLY 3 letters</li>
          <li>Will be auto-converted to uppercase</li>
          <li>Examples: SKM, ABC, XYZ</li>
        </ul>
      </div>
    );
  }
  
  if (masterType === 'materials') {
    let categoryHelp = '';
    if (category === 'Seeds') {
      categoryHelp = '💡 Seed varieties: K=Kathiri, B=Bold, J=Java, R=Red, W=White';
    } else if (category === 'Packing') {
      categoryHelp = '💡 Packaging sizes: S=Small/500ml, 1=1L, 5=5L, L=Large';
    } else if (category === 'Chemical') {
      categoryHelp = '💡 Chemical grades: F=Food, I=Industrial, P=Premium, S=Standard';
    }
    
    return (
      <div style={{ backgroundColor: '#f0f8ff', padding: '10px', borderRadius: '5px', marginBottom: '10px', fontSize: '13px' }}>
        <strong>📋 MATERIAL SHORT CODE FORMAT</strong>
        <div style={{ marginTop: '5px' }}>
          <div>Structure: <code>XXX-YY</code></div>
          <ul style={{ marginTop: '5px', marginBottom: '5px', paddingLeft: '20px' }}>
            <li>Before hyphen: Material type (1-3 chars)</li>
            <li>After hyphen: Variety/Grade (1-2 chars)</li>
            <li>Auto-uppercase applied</li>
          </ul>
          {categoryHelp && <div style={{ marginTop: '8px', color: '#0066cc' }}>{categoryHelp}</div>}
          <div style={{ marginTop: '8px' }}>
            <strong>Examples:</strong>
            {category === 'Seeds' && (
              <div>GNS-K (Groundnut Kathiri), SES-W (Sesame White)</div>
            )}
            {category === 'Packing' && (
              <div>PBS-5 (Plastic 500ml), GBS-1 (Glass 1L)</div>
            )}
            {category === 'Chemical' && (
              <div>CHM-F (Chemical Food Grade), CAU-P (Caustic Premium)</div>
            )}
            {!category && (
              <div>GNS-K, PBS-5, CHM-F</div>
            )}
          </div>
          <div style={{ marginTop: '8px', padding: '5px', backgroundColor: '#fffbf0', borderRadius: '3px' }}>
            <strong>⚠️ Important:</strong> Code describes the material, not the supplier. 
            Same variety gets same code regardless of supplier.
          </div>
        </div>
      </div>
    );
  }
  
  return null;
};

// Material Naming Guidelines Component
const MaterialNamingGuidelines = ({ masterType }) => {
  if (masterType !== 'materials') return null;
  
  return (
    <div style={{ backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '5px', marginBottom: '15px', fontSize: '13px', border: '1px solid #e0e0e0' }}>
      <strong>📋 MATERIAL NAMING CONVENTION</strong>
      <div style={{ marginTop: '8px' }}>
        Format: <code>[Product Type] [Variety] - [Supplier Code]</code>
      </div>
      <div style={{ marginTop: '8px' }}>
        <strong>Examples:</strong>
        <ul style={{ marginTop: '5px', marginBottom: 0, paddingLeft: '20px' }}>
          <li>Groundnut Seed Kathiri - SKM</li>
          <li>Plastic Bottle 500ml - ABC</li>
          <li>Chemical Food Grade - XYZ</li>
        </ul>
      </div>
      <div style={{ marginTop: '8px', padding: '5px', backgroundColor: '#fff0f0', borderRadius: '3px' }}>
        <strong>❌ Do NOT create entries for:</strong> Oil, Cake, Sludge (tracked in production)
      </div>
    </div>
  );
};

// Auto-formatting functions
const formatSupplierShortCode = (input) => {
  return input
    .toUpperCase()
    .replace(/[^A-Z]/g, '')  // Remove non-letters
    .slice(0, 3);            // Limit to 3 chars
};

const formatMaterialShortCode = (input) => {
  let clean = input.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  
  // Remove any existing hyphens first
  clean = clean.replace(/-/g, '');
  
  // Smart hyphen insertion based on length
  if (clean.length >= 2) {
    if (clean.length === 2) {
      // G-K format
      clean = clean[0] + '-' + clean[1];
    } else if (clean.length <= 4) {
      // GNS-K format (hyphen before last char)
      clean = clean.slice(0, -1) + '-' + clean.slice(-1);
    } else {
      // GNS-KU format (hyphen after 3 chars)
      clean = clean.slice(0, 3) + '-' + clean.slice(3, 5);
    }
  }
  
  // Validate format
  const parts = clean.split('-');
  if (parts.length === 2) {
    parts[0] = parts[0].slice(0, 3); // Max 3 before hyphen
    parts[1] = parts[1].slice(0, 2); // Max 2 after hyphen
    clean = parts.join('-');
  }
  
  return clean;
};

// Field Input Component - Renders different input types
const FieldInput = ({ field, value, onChange, error, disabled, masterType, formData }) => {
  const handleChange = (e) => {
    let newValue = e.target.value;
    
    // Apply auto-formatting for short codes
    if (field.name === 'short_code') {
      if (masterType === 'suppliers') {
        newValue = formatSupplierShortCode(newValue);
      } else if (masterType === 'materials') {
        newValue = formatMaterialShortCode(newValue);
      }
    }
    
    // Apply other transformations
    if (field.transform === 'uppercase' && field.name !== 'short_code') {
      newValue = newValue.toUpperCase();
    } else if (field.transform === 'lowercase') {
      newValue = newValue.toLowerCase();
    } else if (field.transform === 'capitalize') {
      newValue = newValue.charAt(0).toUpperCase() + newValue.slice(1);
    }
    
    onChange(field.name, newValue);
  };

  // Get placeholder based on field and master type
  const getPlaceholder = () => {
    if (field.name === 'short_code') {
      if (masterType === 'suppliers') return 'e.g., SKM';
      if (masterType === 'materials') return 'e.g., GNS-K';
    }
    if (field.name === 'material_name' && masterType === 'materials') {
      return 'e.g., Groundnut Seed Kathiri - SKM';
    }
    return field.placeholder || '';
  };

  // Render based on field type
  switch (field.type) {
    case 'select':
      return (
        <select
          value={value || ''}
          onChange={handleChange}
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: error ? '1px solid #dc3545' : '1px solid #ced4da' }}
        >
          <option value="">Select {field.label}</option>
          {field.options?.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );

    case 'textarea':
      return (
        <textarea
          value={value || ''}
          onChange={handleChange}
          disabled={disabled}
          placeholder={getPlaceholder()}
          rows={3}
          className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: error ? '1px solid #dc3545' : '1px solid #ced4da' }}
        />
      );

    case 'reference':
      // This would be handled specially in the main component
      return null;

    default: // text, email, decimal, integer
      return (
        <input
          type={field.type === 'email' ? 'email' : field.type === 'decimal' || field.type === 'integer' ? 'number' : 'text'}
          value={value || ''}
          onChange={handleChange}
          disabled={disabled}
          placeholder={getPlaceholder()}
          maxLength={field.max_length}
          pattern={field.pattern}
          step={field.type === 'decimal' ? '0.01' : field.type === 'integer' ? '1' : undefined}
          min={field.min}
          max={field.max}
          className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: error ? '1px solid #dc3545' : '1px solid #ced4da' }}
        />
      );
  }
};

// Main MasterForm Component
const MasterForm = ({ 
  masterType,
  editData = null,
  onSave,
  onCancel,
  isOpen = true
}) => {
  const [formData, setFormData] = useState({});
  const [schema, setSchema] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState([]); // For materials reference
  const [showGuidelines, setShowGuidelines] = useState(true);

  const isEditMode = !!editData;

  // Master type display names
  const masterDisplayNames = {
    suppliers: 'Supplier',
    materials: 'Material',
    tags: 'Tag',
    writeoff_reasons: 'Writeoff Reason',
    cost_elements: 'Cost Element'
  };

  // Load schema and initial data
  useEffect(() => {
    if (isOpen && masterType) {
      loadSchema();
      loadReferences();
      if (editData) {
        setFormData(editData);
      } else {
        setFormData({});
      }
      setErrors({});
    }
  }, [masterType, editData, isOpen]);

  // Load schema for current master type
  const loadSchema = async () => {
    setLoading(true);
    try {
      const response = await apiCall(`/api/masters/${masterType}/schema`);
      if (response.success) {
        setSchema(response);
      }
    } catch (error) {
      console.error('Error loading schema:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load reference data (suppliers for materials, etc.)
  const loadReferences = async () => {
    try {
      // Load suppliers if we're editing materials
      if (masterType === 'materials') {
        const response = await apiCall('/api/masters/suppliers?per_page=100');
        if (response.success) {
          setSuppliers(response.records);
        }
      }
    } catch (error) {
      console.error('Error loading references:', error);
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
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!schema || !schema.fields) return true;

    schema.fields.forEach(field => {
      const value = formData[field.name];
      
      // Required field check
      if (field.required && !value && value !== 0 && value !== false) {
        newErrors[field.name] = `${field.label} is required`;
        return;
      }

      // Skip further validation if field is empty and not required
      if (!value && !field.required) return;

      // Pattern validation for text fields
      if (field.pattern && value) {
        const regex = new RegExp(field.pattern);
        if (!regex.test(value)) {
          if (field.name === 'gst_number') {
            newErrors[field.name] = 'GST number must be 15 characters (e.g., 22AAAAA0000A1Z5)';
          } else if (field.name === 'short_code') {
            if (masterType === 'suppliers') {
              newErrors[field.name] = 'Short code must be exactly 3 uppercase letters';
            } else if (masterType === 'materials') {
              newErrors[field.name] = 'Format must be XXX-YY where XXX is material type and YY is variety/grade';
            }
          } else {
            newErrors[field.name] = `${field.label} format is invalid`;
          }
        }
      }

      // Email validation
      if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          newErrors[field.name] = 'Invalid email address';
        }
      }

      // Number validation
      if ((field.type === 'decimal' || field.type === 'integer') && value) {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          newErrors[field.name] = `${field.label} must be a number`;
        } else {
          if (field.min !== undefined && numValue < field.min) {
            newErrors[field.name] = `${field.label} must be at least ${field.min}`;
          }
          if (field.max !== undefined && numValue > field.max) {
            newErrors[field.name] = `${field.label} must not exceed ${field.max}`;
          }
        }
      }

      // Max length validation
      if (field.max_length && value && value.length > field.max_length) {
        newErrors[field.name] = `${field.label} must not exceed ${field.max_length} characters`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      let response;
      if (isEditMode) {
        const id = editData[schema.primary_key];
        response = await apiCall(`/api/masters/${masterType}/${id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        response = await apiCall(`/api/masters/${masterType}`, {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }

      if (response.success) {
        onSave(response);
      } else if (response.errors) {
        setErrors(response.errors);
      }
    } catch (error) {
      // Handle unique constraint errors
      if (error.message.includes('already exists')) {
        const field = error.message.includes('short_code') ? 'short_code' : 
                     error.message.includes('email') ? 'email' : 
                     error.message.includes('gst_number') ? 'gst_number' :
                     schema.name_field;
        setErrors({ [field]: error.message });
      } else {
        alert(`Error: ${error.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading form...</div>;
  }

  if (!schema) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>No schema available</div>;
  }

  return (
    <div style={{ maxHeight: '80vh', overflowY: 'auto' }}>
      <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
        <h2 style={{ marginBottom: '20px' }}>
          {isEditMode ? 'Edit' : 'Add New'} {masterDisplayNames[masterType] || masterType}
        </h2>

        {/* Show naming guidelines for materials */}
        {masterType === 'materials' && !isEditMode && showGuidelines && (
          <MaterialNamingGuidelines masterType={masterType} />
        )}

        {/* Render form fields */}
        {schema.fields.map(field => {
          // Special handling for reference fields
          if (field.type === 'reference' && field.reference_table === 'suppliers') {
            return (
              <div key={field.name} style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  {field.label} {field.required && <span style={{ color: 'red' }}>*</span>}
                </label>
                <select
                  value={formData[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  required={field.required}
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    borderRadius: '4px', 
                    border: errors[field.name] ? '1px solid #dc3545' : '1px solid #ced4da' 
                  }}
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.supplier_id} value={supplier.supplier_id}>
                      {supplier.supplier_name} ({supplier.short_code})
                    </option>
                  ))}
                </select>
                {errors[field.name] && (
                  <small style={{ color: '#dc3545' }}>{errors[field.name]}</small>
                )}
              </div>
            );
          }

          // Show guidelines before short code field
          const showGuidelinesBeforeField = field.name === 'short_code' && showGuidelines;

          return (
            <div key={field.name} style={{ marginBottom: '15px' }}>
              {showGuidelinesBeforeField && (
                <ShortCodeGuidelines 
                  masterType={masterType} 
                  category={formData.category}
                />
              )}
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                {field.label} {field.required && <span style={{ color: 'red' }}>*</span>}
              </label>
              <FieldInput
                field={field}
                value={formData[field.name]}
                onChange={handleFieldChange}
                error={errors[field.name]}
                disabled={saving}
                masterType={masterType}
                formData={formData}
              />
              {errors[field.name] && (
                <small style={{ color: '#dc3545', display: 'block', marginTop: '5px' }}>
                  {errors[field.name]}
                </small>
              )}
              {/* Show real-time validation for short codes */}
              {field.name === 'short_code' && formData[field.name] && !errors[field.name] && (
                <small style={{ color: '#28a745', display: 'block', marginTop: '5px' }}>
                  ✓ Valid format
                </small>
              )}
            </div>
          );
        })}

        {/* Form Actions */}
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1
            }}
          >
            {saving ? 'Saving...' : (isEditMode ? 'Update' : 'Save')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          {showGuidelines && (
            <button
              type="button"
              onClick={() => setShowGuidelines(false)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#ffc107',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginLeft: 'auto'
              }}
            >
              Hide Guidelines
            </button>
          )}
          {!showGuidelines && (
            <button
              type="button"
              onClick={() => setShowGuidelines(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginLeft: 'auto'
              }}
            >
              Show Guidelines
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default MasterForm;
