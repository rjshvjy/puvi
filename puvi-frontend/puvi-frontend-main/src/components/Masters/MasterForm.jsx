// MasterForm Component - Dynamic form generation for all master types
// File Path: puvi-frontend/puvi-frontend-main/src/components/Masters/MasterForm.jsx
// Handles create/edit with field validation and transformation

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

// Field Input Component - Renders different input types
const FieldInput = ({ field, value, onChange, error, disabled }) => {
  const handleChange = (e) => {
    let newValue = e.target.value;
    
    // Apply transformations
    if (field.transform === 'uppercase') {
      newValue = newValue.toUpperCase();
    } else if (field.transform === 'lowercase') {
      newValue = newValue.toLowerCase();
    } else if (field.transform === 'capitalize') {
      newValue = newValue.charAt(0).toUpperCase() + newValue.slice(1);
    }
    
    onChange(field.name, newValue);
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
          placeholder={field.placeholder}
          rows={3}
          className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        />
      );

    case 'boolean':
      return (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => onChange(field.name, e.target.checked)}
            disabled={disabled}
            className="w-4 h-4"
          />
          <span className="text-sm">{field.label}</span>
        </label>
      );

    case 'email':
      return (
        <input
          type="email"
          value={value || ''}
          onChange={handleChange}
          disabled={disabled}
          placeholder={field.placeholder || 'email@example.com'}
          className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        />
      );

    case 'decimal':
    case 'number':
      return (
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(field.name, e.target.value)}
          disabled={disabled}
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          step={field.decimal_places ? `0.${'0'.repeat(field.decimal_places - 1)}1` : '1'}
          className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        />
      );

    case 'integer':
      return (
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(field.name, e.target.value)}
          disabled={disabled}
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          step="1"
          className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        />
      );

    default: // text and others
      return (
        <input
          type="text"
          value={value || ''}
          onChange={handleChange}
          disabled={disabled}
          placeholder={field.placeholder}
          maxLength={field.max_length}
          pattern={field.pattern}
          className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
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
  const [materials, setMaterials] = useState([]); // For other references

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
              newErrors[field.name] = 'Short code must be up to 6 uppercase letters/numbers';
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
                     'general';
        setErrors({ [field]: error.message });
      } else {
        setErrors({ general: error.message });
      }
    } finally {
      setSaving(false);
    }
  };

  // Group fields by category for better UX
  const groupFields = (fields) => {
    const basicFields = [];
    const contactFields = [];
    const configFields = [];
    const otherFields = [];

    fields.forEach(field => {
      if (['name', 'description', 'code', 'short_code'].some(n => field.name.includes(n))) {
        basicFields.push(field);
      } else if (['email', 'phone', 'contact', 'address'].some(n => field.name.includes(n))) {
        contactFields.push(field);
      } else if (['rate', 'cost', 'gst', 'calculation', 'method'].some(n => field.name.includes(n))) {
        configFields.push(field);
      } else {
        otherFields.push(field);
      }
    });

    return { basicFields, contactFields, configFields, otherFields };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-800">
            {isEditMode ? 'Edit' : 'Add New'} {masterDisplayNames[masterType] || 'Record'}
          </h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin text-3xl">⏳</div>
              <p>Loading form...</p>
            </div>
          ) : schema ? (
            <>
              {/* General Error */}
              {errors.general && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {errors.general}
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-4">
                {(() => {
                  const grouped = groupFields(schema.fields || []);
                  return (
                    <>
                      {/* Basic Information */}
                      {grouped.basicFields.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-700 mb-2">
                            Basic Information
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {grouped.basicFields.map(field => (
                              <div key={field.name}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  {field.label}
                                  {field.required && <span className="text-red-500"> *</span>}
                                </label>
                                <FieldInput
                                  field={field}
                                  value={formData[field.name]}
                                  onChange={handleFieldChange}
                                  error={errors[field.name]}
                                  disabled={saving}
                                />
                                {errors[field.name] && (
                                  <p className="text-red-500 text-xs mt-1">{errors[field.name]}</p>
                                )}
                                {field.help_text && (
                                  <p className="text-gray-500 text-xs mt-1">{field.help_text}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Contact Information */}
                      {grouped.contactFields.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-700 mb-2">
                            Contact Information
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {grouped.contactFields.map(field => (
                              <div key={field.name}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  {field.label}
                                  {field.required && <span className="text-red-500"> *</span>}
                                </label>
                                <FieldInput
                                  field={field}
                                  value={formData[field.name]}
                                  onChange={handleFieldChange}
                                  error={errors[field.name]}
                                  disabled={saving}
                                />
                                {errors[field.name] && (
                                  <p className="text-red-500 text-xs mt-1">{errors[field.name]}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Configuration */}
                      {grouped.configFields.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-700 mb-2">
                            Configuration
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {grouped.configFields.map(field => (
                              <div key={field.name}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  {field.label}
                                  {field.required && <span className="text-red-500"> *</span>}
                                </label>
                                <FieldInput
                                  field={field}
                                  value={formData[field.name]}
                                  onChange={handleFieldChange}
                                  error={errors[field.name]}
                                  disabled={saving}
                                />
                                {errors[field.name] && (
                                  <p className="text-red-500 text-xs mt-1">{errors[field.name]}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Other Fields */}
                      {grouped.otherFields.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-700 mb-2">
                            Additional Information
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {grouped.otherFields.map(field => (
                              <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  {field.label}
                                  {field.required && <span className="text-red-500"> *</span>}
                                </label>
                                <FieldInput
                                  field={field}
                                  value={formData[field.name]}
                                  onChange={handleFieldChange}
                                  error={errors[field.name]}
                                  disabled={saving}
                                />
                                {errors[field.name] && (
                                  <p className="text-red-500 text-xs mt-1">{errors[field.name]}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Unable to load form schema
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={saving || loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <span className="animate-spin">⏳</span>
                Saving...
              </>
            ) : (
              <>
                <span>💾</span>
                {isEditMode ? 'Update' : 'Create'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MasterForm;
