// File Path: puvi-frontend/puvi-frontend-main/src/components/Masters/MasterForm.jsx
// Professional Master Form Component with Enterprise UI
// Fixed: Categories dropdown and added produces_oil_type field
// UPDATED: Fixed unit dropdown to load from /api/materials/units

import React, { useState, useEffect, useRef } from 'react';
import './MasterForm.css';

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

// ==================== Sub-Components ====================

// Form Section Component
const FormSection = ({ title, description, children, className = '' }) => (
  <div className={`form-section ${className}`}>
    {title && (
      <div className="form-section-header">
        <h3 className="form-section-title">{title}</h3>
        {description && <p className="form-section-desc">{description}</p>}
      </div>
    )}
    <div className="form-section-body">
      {children}
    </div>
  </div>
);

// Guidelines Component
const Guidelines = ({ type, category, expanded, onToggle }) => {
  const getGuidelines = () => {
    if (type === 'supplier-short-code') {
      return {
        title: 'Supplier Short Code Guidelines',
        content: (
          <>
            <ul>
              <li>Must be exactly <strong>3 letters</strong></li>
              <li>Will be auto-converted to uppercase</li>
              <li>Must be unique across all suppliers</li>
              <li>Examples: <code>SKM</code>, <code>ABC</code>, <code>XYZ</code></li>
            </ul>
          </>
        )
      };
    }
    
    if (type === 'material-short-code') {
      const categoryExamples = {
        Seeds: 'Seed varieties: K=Kathiri, B=Bold, J=Java, R=Red, W=White',
        Packing: 'Packaging sizes: S=Small/500ml, 1=1L, 5=5L, L=Large',
        Chemical: 'Chemical grades: F=Food, I=Industrial, P=Premium',
        Oil: 'Oil types: G=Groundnut, C=Coconut, S=Sesame'
      };
      
      return {
        title: 'Material Short Code Format',
        content: (
          <>
            <p>Structure: <code>XXX-YY</code></p>
            <ul>
              <li><strong>XXX</strong>: Material type (3 letters)</li>
              <li><strong>YY</strong>: Variety/Grade (1-2 letters/numbers)</li>
            </ul>
            {category && categoryExamples[category] && (
              <p className="guidelines-info">{categoryExamples[category]}</p>
            )}
            <p>Examples: <code>GNS-K</code>, <code>PBS-5</code>, <code>CHM-F</code></p>
          </>
        )
      };
    }
    
    if (type === 'material-naming') {
      return {
        title: 'Material Naming Convention',
        content: (
          <>
            <p>Follow this pattern for consistency:</p>
            <p><code>[Material Type] [Variety] - [Supplier Code]</code></p>
            <ul>
              <li>Example: <code>Groundnut Seed Kathiri - SKM</code></li>
              <li>Example: <code>Plastic Bottle 1L - ABC</code></li>
            </ul>
            <p className="guidelines-warning">
              ⚠ Include supplier code at the end for easy identification
            </p>
          </>
        )
      };
    }
    
    return null;
  };
  
  const guidelines = getGuidelines();
  if (!guidelines) return null;
  
  return (
    <div className={`guidelines ${!expanded ? 'collapsed' : ''}`}>
      <div className="guidelines-header">
        <div className="guidelines-title">{guidelines.title}</div>
        <button 
          type="button"
          className="guidelines-toggle"
          onClick={() => onToggle(type)}
        >
          {expanded ? 'Hide' : 'Show'}
        </button>
      </div>
      {expanded && (
        <div className="guidelines-content">
          {guidelines.content}
        </div>
      )}
    </div>
  );
};

// Field Components
const TextField = ({ id, label, value, onChange, error, required, disabled, placeholder, help, maxLength, onBlur }) => (
  <div className="field">
    <label htmlFor={id} className="label">
      {label}
      {required && <span className="required">*</span>}
    </label>
    <input
      type="text"
      id={id}
      className={`input ${error ? 'error' : ''}`}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      disabled={disabled}
      placeholder={placeholder}
      maxLength={maxLength}
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined}
    />
    {error && <div id={`${id}-error`} className="form-error">{error}</div>}
    {help && !error && <div id={`${id}-help`} className="form-help">{help}</div>}
  </div>
);

const NumberField = ({ id, label, value, onChange, error, required, disabled, min, max, step, help }) => (
  <div className="field">
    <label htmlFor={id} className="label">
      {label}
      {required && <span className="required">*</span>}
    </label>
    <input
      type="number"
      id={id}
      className={`input ${error ? 'error' : ''}`}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      min={min}
      max={max}
      step={step}
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined}
    />
    {error && <div id={`${id}-error`} className="form-error">{error}</div>}
    {help && !error && <div id={`${id}-help`} className="form-help">{help}</div>}
  </div>
);

const SelectField = ({ id, label, value, onChange, options, error, required, disabled, help, loading = false }) => (
  <div className="field">
    <label htmlFor={id} className="label">
      {label}
      {required && <span className="required">*</span>}
      {loading && <span className="form-help" style={{ marginLeft: '10px' }}>(Loading...)</span>}
    </label>
    <select
      id={id}
      className={`select ${error ? 'error' : ''}`}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || loading}
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined}
    >
      <option value="">Select {label}</option>
      {!loading && options && options.map(option => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
    {error && <div id={`${id}-error`} className="form-error">{error}</div>}
    {help && !error && <div id={`${id}-help`} className="form-help">{help}</div>}
  </div>
);

const TextareaField = ({ id, label, value, onChange, error, required, disabled, placeholder, help, rows = 3 }) => (
  <div className="field">
    <label htmlFor={id} className="label">
      {label}
      {required && <span className="required">*</span>}
    </label>
    <textarea
      id={id}
      className={`textarea ${error ? 'error' : ''}`}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      rows={rows}
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined}
    />
    {error && <div id={`${id}-error`} className="form-error">{error}</div>}
    {help && !error && <div id={`${id}-help`} className="form-help">{help}</div>}
  </div>
);

const ReferenceField = ({ id, label, value, onChange, options, error, required, disabled, help }) => {
  const [filter, setFilter] = useState('');
  
  // Check if suppliers are loaded
  if (!options || options.length === 0) {
    return (
      <div className="field reference-field">
        <label htmlFor={id} className="label">
          {label}
          {required && <span className="required">*</span>}
        </label>
        <div className="inline-alert warning">
          <div className="inline-alert-icon"></div>
          <div className="inline-alert-content">
            <div className="inline-alert-message">
              No suppliers found. Please add suppliers first in the Suppliers master.
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  const filteredOptions = options.filter(opt => 
    opt.supplier_name.toLowerCase().includes(filter.toLowerCase()) ||
    opt.short_code.toLowerCase().includes(filter.toLowerCase())
  );
  
  const showFilter = options.length > 10;
  
  return (
    <div className="field reference-field">
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="required">*</span>}
      </label>
      {showFilter && (
        <div className="reference-filter">
          <span className="reference-filter-icon">🔍</span>
          <input
            type="text"
            className="reference-filter-input"
            placeholder="Filter suppliers..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      )}
      <select
        id={id}
        className={`select ${error ? 'error' : ''}`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined}
      >
        <option value="">Select {label}</option>
        {filteredOptions.map(supplier => (
          <option key={supplier.supplier_id} value={supplier.supplier_id}>
            {supplier.supplier_name} ({supplier.short_code})
          </option>
        ))}
      </select>
      {error && <div id={`${id}-error`} className="form-error">{error}</div>}
      {help && !error && <div id={`${id}-help`} className="form-help">{help}</div>}
    </div>
  );
};

// Inline Alert Component
const InlineAlert = ({ type, title, message, onRetry }) => (
  <div className={`inline-alert ${type}`}>
    <div className="inline-alert-icon"></div>
    <div className="inline-alert-content">
      {title && <div className="inline-alert-title">{title}</div>}
      <div className="inline-alert-message">{message}</div>
    </div>
    {onRetry && (
      <button type="button" className="btn btn-ghost" onClick={onRetry}>
        Retry
      </button>
    )}
  </div>
);

// Loading Skeleton Component
const FieldSkeleton = () => (
  <div className="field">
    <div className="skeleton skeleton-text"></div>
    <div className="skeleton skeleton-input"></div>
  </div>
);

// ==================== Utility Functions ====================

const formatSupplierShortCodeOnBlur = (value) => {
  return value
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3);
};

const formatMaterialShortCodeOnBlur = (value) => {
  let clean = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  clean = clean.replace(/-/g, '');
  
  if (clean.length > 3) {
    clean = clean.slice(0, 3) + '-' + clean.slice(3, 5);
  }
  
  return clean;
};

const validateField = (field, value, schema) => {
  // Required check
  if (field.required && (!value || value === '')) {
    return `${field.label} is required`;
  }
  
  // Skip further validation if empty and not required
  if (!value && !field.required) return '';
  
  // Pattern validation
  if (field.pattern) {
    const pattern = field.pattern.startsWith('^') ? field.pattern : `^${field.pattern}$`;
    const regex = new RegExp(pattern);
    if (!regex.test(value)) {
      if (field.name === 'short_code') {
        return field.masterType === 'suppliers' 
          ? 'Must be exactly 3 uppercase letters'
          : 'Format must be XXX-YY';
      }
      if (field.name === 'gst_number') {
        return 'GST number must be 15 characters (e.g., 22AAAAA0000A1Z5)';
      }
      return `${field.label} format is invalid`;
    }
  }
  
  // Email validation
  if (field.type === 'email' && value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
  }
  
  // Number validation
  if (field.type === 'decimal' || field.type === 'integer') {
    const num = parseFloat(value);
    if (isNaN(num)) {
      return 'Please enter a valid number';
    }
    if (field.min !== undefined && num < field.min) {
      return `Minimum value is ${field.min}`;
    }
    if (field.max !== undefined && num > field.max) {
      return `Maximum value is ${field.max}`;
    }
    if (field.type === 'integer' && !Number.isInteger(num)) {
      return 'Please enter a whole number';
    }
  }
  
  // Max length validation
  if (field.max_length && value.length > field.max_length) {
    return `Maximum length is ${field.max_length} characters`;
  }
  
  return '';
};

// ==================== Main Component ====================

const MasterForm = ({ 
  masterType,
  editData = null,
  onSave,
  onCancel,
  isOpen = true
}) => {
  // State
  const [formData, setFormData] = useState({});
  const [schema, setSchema] = useState(null);
  const [errors, setErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [alert, setAlert] = useState(null);
  const [expandedGuidelines, setExpandedGuidelines] = useState({
    'supplier-short-code': true,
    'material-short-code': true,
    'material-naming': true
  });
  
  // State for dynamic options
  const [dynamicOptions, setDynamicOptions] = useState({});
  const [loadingDynamicOptions, setLoadingDynamicOptions] = useState({});
  
  // NEW: State for categories and oil types
  const [categories, setCategories] = useState([]);
  const [oilTypes, setOilTypes] = useState([]);
  const [showProducesOilType, setShowProducesOilType] = useState(false);
  
  // Refs
  const firstErrorRef = useRef(null);
  const formRef = useRef(null);
  
  const isEditMode = !!editData;
  
  // Master type display names
  const masterDisplayNames = {
    suppliers: 'Supplier',
    materials: 'Material',
    tags: 'Tag',
    writeoff_reasons: 'Writeoff Reason',
    cost_elements: 'Cost Element',
    uom: 'Unit of Measure',
    categories: 'Category',
    subcategories: 'Subcategory',
    bom_category_mapping: 'BOM Category'
  };
  
  // Load schema and initial data
  useEffect(() => {
    if (isOpen && masterType) {
      loadSchema();
      loadReferences();
      if (editData) {
        setFormData(editData);
        // Check if editing a seed material
        if (masterType === 'materials' && editData.category === 'Seeds') {
          setShowProducesOilType(true);
        }
      } else {
        setFormData({});
        setShowProducesOilType(false);
      }
      setErrors({});
      setTouchedFields({});
      setAlert(null);
      setDynamicOptions({});
      setLoadingDynamicOptions({});
    }
  }, [masterType, editData, isOpen]);
  
  // Load dynamic options when schema changes
  useEffect(() => {
    if (schema && schema.fields) {
      loadDynamicOptions();
    }
  }, [schema]);
  
  // Load schema
  const loadSchema = async () => {
    setLoadingSchema(true);
    setAlert(null);
    try {
      const response = await apiCall(`/api/masters/${masterType}/schema`);
      if (response.success) {
        setSchema(response);
      }
    } catch (error) {
      setAlert({
        type: 'error',
        title: 'Failed to load form',
        message: error.message,
        onRetry: loadSchema
      });
    } finally {
      setLoadingSchema(false);
    }
  };
  
  // Load dynamic options for fields
  const loadDynamicOptions = async () => {
    if (!schema || !schema.fields) return;
    
    console.log('Loading dynamic options for schema:', schema);
    
    for (const field of schema.fields) {
      // FIXED: Special handling for category field
      if (field.name === 'category') {
        console.log('Loading categories from /api/categories');
        setLoadingDynamicOptions(prev => ({ ...prev, category: true }));
        
        try {
          // Use the correct categories endpoint
          const response = await apiCall('/api/categories');
          const categoryNames = response.categories ? 
            response.categories.map(cat => cat.category_name) : [];
          
          console.log('Loaded categories:', categoryNames);
          setCategories(response.categories || []);
          setDynamicOptions(prev => ({
            ...prev,
            category: categoryNames
          }));
        } catch (error) {
          console.error('Failed to load categories:', error);
          setDynamicOptions(prev => ({
            ...prev,
            category: []
          }));
        } finally {
          setLoadingDynamicOptions(prev => ({ ...prev, category: false }));
        }
        continue;
      }
      
      // UPDATED: Special handling for unit field
      if (field.name === 'unit') {
        console.log('Loading units from /api/materials/units');
        setLoadingDynamicOptions(prev => ({ ...prev, unit: true }));
        
        try {
          const response = await apiCall('/api/materials/units');
          console.log('Units API response:', response);
          
          // Handle the response structure properly
          const unitsData = response.units || response.data || [];
          
          console.log('Loaded units:', unitsData);
          setDynamicOptions(prev => ({
            ...prev,
            unit: unitsData
          }));
        } catch (error) {
          console.error('Failed to load units:', error);
          setDynamicOptions(prev => ({
            ...prev,
            unit: []
          }));
          setAlert({
            type: 'warning',
            message: 'Failed to load units. Please check if UOM master is configured.'
          });
        } finally {
          setLoadingDynamicOptions(prev => ({ ...prev, unit: false }));
        }
        continue;
      }
      
      // Handle other dynamic fields
      if (field.options === 'dynamic' && field.options_endpoint) {
        console.log(`Loading dynamic options for field: ${field.name} from ${field.options_endpoint}`);
        
        setLoadingDynamicOptions(prev => ({ ...prev, [field.name]: true }));
        
        try {
          let optionsData = [];
          
          // UPDATED: Better handling for units endpoint
          if (field.options_endpoint.includes('/api/materials/units')) {
            const response = await apiCall('/api/materials/units');
            console.log('Units response from options_endpoint:', response);
            optionsData = response.units || response.data || [];
          } else if (field.options_endpoint.includes('/api/config/gst_rates')) {
            const response = await apiCall('/api/config/gst_rates');
            optionsData = response.values || response.data || [];
          } else if (field.options_endpoint.includes('/api/config/density_values')) {
            const response = await apiCall('/api/config/density_values');
            optionsData = response.values || response.data || [];
          } else {
            const response = await apiCall(field.options_endpoint);
            optionsData = response.categories || response.units || response.values || 
                        response.options || response.data || response.items || [];
          }
          
          console.log(`Loaded options for ${field.name}:`, optionsData);
          
          setDynamicOptions(prev => ({
            ...prev,
            [field.name]: optionsData
          }));
        } catch (error) {
          console.error(`Failed to load dynamic options for ${field.name}:`, error);
          setDynamicOptions(prev => ({
            ...prev,
            [field.name]: []
          }));
        } finally {
          setLoadingDynamicOptions(prev => ({ ...prev, [field.name]: false }));
        }
      }
    }
    
    // Load oil types for materials form
    if (masterType === 'materials') {
      loadOilTypes();
    }
  };
  
  // NEW: Load oil types
  const loadOilTypes = async () => {
    try {
      console.log('Loading oil types from /api/config/oil_types');
      const response = await apiCall('/api/config/oil_types');
      const types = response.values || response.data || [];
      console.log('Loaded oil types:', types);
      setOilTypes(types);
    } catch (error) {
      console.error('Failed to load oil types:', error);
      setOilTypes([]);
    }
  };
  
  // Load references
  const loadReferences = async () => {
    try {
      if (masterType === 'materials') {
        console.log('Loading suppliers for materials form...');
        const response = await apiCall('/api/masters/suppliers?per_page=100&is_active=true');
        console.log('Suppliers response:', response);
        if (response.success) {
          setSuppliers(response.records || []);
          console.log('Loaded suppliers:', response.records);
        } else {
          console.error('Failed to load suppliers:', response);
          setSuppliers([]);
        }
      }
    } catch (error) {
      console.error('Error loading references:', error);
      setAlert({
        type: 'warning',
        message: 'Could not load suppliers. Please ensure suppliers are configured in the system.'
      });
    }
  };
  
  // Handle field change
  const handleFieldChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // NEW: Check if category changed to Seeds
    if (fieldName === 'category') {
      setShowProducesOilType(value === 'Seeds');
      if (value !== 'Seeds') {
        // Clear produces_oil_type if not Seeds
        setFormData(prev => ({
          ...prev,
          produces_oil_type: null
        }));
      }
    }
    
    // Clear error if field is modified
    if (errors[fieldName] && touchedFields[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };
  
  // Handle field blur (validation)
  const handleFieldBlur = (field) => {
    setTouchedFields(prev => ({ ...prev, [field.name]: true }));
    
    // Format short codes on blur
    if (field.name === 'short_code') {
      const formatted = masterType === 'suppliers'
        ? formatSupplierShortCodeOnBlur(formData[field.name] || '')
        : formatMaterialShortCodeOnBlur(formData[field.name] || '');
      
      handleFieldChange(field.name, formatted);
      
      // Validate after formatting
      const error = validateField(field, formatted, schema);
      if (error) {
        setErrors(prev => ({ ...prev, [field.name]: error }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field.name];
          return newErrors;
        });
      }
    } else {
      // Validate other fields
      const error = validateField(field, formData[field.name], schema);
      if (error) {
        setErrors(prev => ({ ...prev, [field.name]: error }));
      }
    }
  };
  
  // Toggle guidelines
  const toggleGuideline = (type) => {
    setExpandedGuidelines(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };
  
  // Validate entire form
  const validateForm = () => {
    if (!schema || !schema.fields) return {};
    
    const newErrors = {};
    schema.fields.forEach(field => {
      const error = validateField(field, formData[field.name], schema);
      if (error) {
        newErrors[field.name] = error;
      }
    });
    
    return newErrors;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setTouchedFields(
        schema.fields.reduce((acc, field) => ({ ...acc, [field.name]: true }), {})
      );
      
      // Scroll to first error
      const firstErrorField = Object.keys(validationErrors)[0];
      const element = document.getElementById(`${masterType}-${firstErrorField}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
      
      return;
    }
    
    // Save data
    setSaving(true);
    setAlert(null);
    
    try {
      const url = isEditMode
        ? `/api/masters/${masterType}/${editData[schema.primary_key]}`
        : `/api/masters/${masterType}`;
      
      const method = isEditMode ? 'PUT' : 'POST';
      
      // Only send fields defined in schema plus produces_oil_type if needed
      const dataToSend = {};
      schema.fields.forEach(field => {
        if (formData[field.name] !== undefined) {
          dataToSend[field.name] = formData[field.name];
        }
      });
      
      // NEW: Include produces_oil_type if it's a seed material
      if (masterType === 'materials' && formData.category === 'Seeds' && formData.produces_oil_type) {
        dataToSend.produces_oil_type = formData.produces_oil_type;
      }
      
      const response = await apiCall(url, {
        method,
        body: JSON.stringify(dataToSend)
      });
      
      if (response.success) {
        setAlert({
          type: 'success',
          message: `${masterDisplayNames[masterType]} ${isEditMode ? 'updated' : 'created'} successfully!`
        });
        
        // Call parent callback
        setTimeout(() => {
          onSave(response);
        }, 1000);
      }
    } catch (error) {
      setAlert({
        type: 'error',
        title: 'Save failed',
        message: error.message
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Render field based on schema
  const renderField = (field) => {
    const fieldId = `${masterType}-${field.name}`;
    const value = formData[field.name];
    const error = touchedFields[field.name] ? errors[field.name] : null;
    const commonProps = {
      id: fieldId,
      label: field.label,
      value,
      onChange: (val) => handleFieldChange(field.name, val),
      error,
      required: field.required,
      disabled: saving,
      onBlur: () => handleFieldBlur(field)
    };
    
    // Reference field (supplier dropdown)
    if (field.type === 'reference' || 
        field.reference_table === 'suppliers' || 
        field.name === 'supplier_id' ||
        (field.label && field.label.toLowerCase().includes('supplier'))) {
      return (
        <ReferenceField
          {...commonProps}
          options={suppliers}
          help={field.help || 'Select from existing suppliers'}
        />
      );
    }
    
    // FIXED: Handle category field specifically
    if (field.name === 'category') {
      return (
        <SelectField
          {...commonProps}
          options={dynamicOptions.category || []}
          loading={loadingDynamicOptions.category}
          help={field.help || (loadingDynamicOptions.category ? 'Loading categories...' : 'Select material category')}
        />
      );
    }
    
    // UPDATED: Handle unit field specifically
    if (field.name === 'unit') {
      const unitOptions = dynamicOptions.unit || [];
      const isLoadingUnits = loadingDynamicOptions.unit;
      
      // Show error if no units are available after loading
      if (!isLoadingUnits && unitOptions.length === 0 && field.required) {
        return (
          <div className="field">
            <label htmlFor={fieldId} className="label">
              {field.label}
              {field.required && <span className="required">*</span>}
            </label>
            <div className="inline-alert error">
              <div className="inline-alert-icon"></div>
              <div className="inline-alert-content">
                <div className="inline-alert-message">
                  No units available. Please check if UOM master is configured and the backend is deployed.
                </div>
              </div>
            </div>
          </div>
        );
      }
      
      return (
        <SelectField
          {...commonProps}
          options={unitOptions}
          loading={isLoadingUnits}
          help={field.help || (isLoadingUnits ? 'Loading units...' : 'Select unit of measure')}
        />
      );
    }
    
    // Handle other select fields
    if (field.type === 'select') {
      const isDynamic = field.options === 'dynamic';
      const isLoading = loadingDynamicOptions[field.name];
      
      let fieldOptions = [];
      
      if (isDynamic) {
        fieldOptions = dynamicOptions[field.name] || [];
      } else if (Array.isArray(field.options)) {
        fieldOptions = field.options;
      }
      
      return (
        <SelectField
          {...commonProps}
          options={fieldOptions}
          loading={isLoading}
          help={field.help || (isLoading ? 'Loading options...' : undefined)}
        />
      );
    }
    
    // Textarea field
    if (field.type === 'textarea') {
      return (
        <TextareaField
          {...commonProps}
          placeholder={field.placeholder}
          help={field.help}
          rows={field.rows || 3}
        />
      );
    }
    
    // Number fields
    if (field.type === 'decimal' || field.type === 'integer') {
      const isDensityField = field.name === 'density';
      return (
        <NumberField
          {...commonProps}
          min={field.min}
          max={field.max}
          step={field.type === 'decimal' ? 0.01 : 1}
          help={field.help || (isDensityField ? 'Density value (specific gravity)' : undefined)}
        />
      );
    }
    
    // Text/Email fields (DEFAULT)
    return (
      <TextField
        {...commonProps}
        placeholder={field.placeholder}
        help={field.help || (field.name === 'short_code' ? `Example: ${masterType === 'suppliers' ? 'SKM' : 'GNS-K'}` : '')}
        maxLength={field.max_length}
      />
    );
  };
  
  // NEW: Render produces_oil_type field
  const renderProducesOilTypeField = () => {
    if (!showProducesOilType || masterType !== 'materials') {
      return null;
    }
    
    return (
      <div className="field">
        <label htmlFor="produces_oil_type" className="label">
          Produces Oil Type
          <span className="form-help" style={{ marginLeft: '10px' }}>(For seed materials)</span>
        </label>
        <select
          id="produces_oil_type"
          className="select"
          value={formData.produces_oil_type || ''}
          onChange={(e) => handleFieldChange('produces_oil_type', e.target.value)}
          disabled={saving}
        >
          <option value="">Select oil type produced</option>
          {oilTypes.map(oilType => (
            <option key={oilType} value={oilType}>
              {oilType}
            </option>
          ))}
        </select>
        <div className="form-help">
          This seed material will produce {formData.produces_oil_type || '[selected oil]'} when processed in batch production
        </div>
      </div>
    );
  };
  
  // Group fields into sections
  const getFieldSections = () => {
    if (!schema || !schema.fields) return [];
    
    if (masterType === 'materials') {
      return [
        {
          title: 'Basic Information',
          description: 'Core material details',
          fields: schema.fields.filter(f => 
            ['material_name', 'description'].includes(f.name)
          )
        },
        {
          title: 'Classification',
          description: 'Category and measurement',
          fields: schema.fields.filter(f => 
            ['category', 'unit'].includes(f.name)
          ),
          // NEW: Add produces_oil_type after category
          extraContent: renderProducesOilTypeField()
        },
        {
          title: 'Cost & Pricing',
          description: 'Financial information',
          fields: schema.fields.filter(f => 
            ['current_cost', 'gst_rate'].includes(f.name)
          )
        },
        {
          title: 'Physical Properties',
          description: 'Material specifications',
          fields: schema.fields.filter(f => 
            ['density'].includes(f.name)
          )
        },
        {
          title: 'Supplier & Reference',
          description: 'Link to supplier',
          fields: schema.fields.filter(f => 
            ['supplier_id'].includes(f.name)
          )
        },
        {
          title: 'Identification',
          description: 'Unique codes and identifiers',
          fields: schema.fields.filter(f => 
            ['short_code'].includes(f.name)
          ),
          guidelines: ['material-short-code', 'material-naming']
        }
      ];
    }
    
    if (masterType === 'suppliers') {
      return [
        {
          title: 'Business Details',
          description: 'Company information',
          fields: schema.fields.filter(f => 
            ['supplier_name', 'gst_number'].includes(f.name)
          )
        },
        {
          title: 'Contact Information',
          description: 'Communication details',
          fields: schema.fields.filter(f => 
            ['contact_person', 'email', 'phone'].includes(f.name)
          )
        },
        {
          title: 'Address',
          description: 'Location details',
          fields: schema.fields.filter(f => 
            ['address', 'city', 'state', 'pincode'].includes(f.name)
          )
        },
        {
          title: 'Identification',
          description: 'Unique identifier',
          fields: schema.fields.filter(f => 
            ['short_code'].includes(f.name)
          ),
          guidelines: ['supplier-short-code']
        }
      ];
    }
    
    // Default single section for other master types
    return [{
      title: null,
      fields: schema.fields
    }];
  };
  
  // Render loading state
  if (loadingSchema) {
    return (
      <div className="form-container">
        <div className="page-header">
          <h2 className="page-title">Loading...</h2>
        </div>
        <div className="form-grid">
          <FormSection>
            <FieldSkeleton />
            <FieldSkeleton />
            <FieldSkeleton />
          </FormSection>
          <FormSection>
            <FieldSkeleton />
            <FieldSkeleton />
            <FieldSkeleton />
          </FormSection>
        </div>
      </div>
    );
  }
  
  // Render error state
  if (!schema && alert?.type === 'error') {
    return (
      <div className="form-container">
        <div className="page-header">
          <h2 className="page-title">Error</h2>
        </div>
        <InlineAlert {...alert} />
      </div>
    );
  }
  
  const sections = getFieldSections();
  const hasValidationErrors = Object.keys(errors).length > 0 && Object.keys(touchedFields).length > 0;
  
  return (
    <div className="form-container">
      {/* Accessibility: Live region for form status */}
      <div aria-live="polite" aria-atomic="true" className="visually-hidden">
        {saving && 'Saving form...'}
        {alert?.type === 'success' && alert.message}
        {Object.keys(loadingDynamicOptions).some(key => loadingDynamicOptions[key]) && 'Loading form options...'}
      </div>
      
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">
          {isEditMode ? 'Edit' : 'Add New'} {masterDisplayNames[masterType]}
        </h1>
        <p className="page-subtitle">
          {isEditMode 
            ? `Editing ${editData?.[schema?.name_field] || 'record'}`
            : `Create a new ${masterDisplayNames[masterType].toLowerCase()} record`}
        </p>
      </div>
      
      {/* Alert Messages */}
      {alert && <InlineAlert {...alert} />}
      
      {/* Show if dynamic options are being loaded */}
      {Object.keys(loadingDynamicOptions).some(key => loadingDynamicOptions[key]) && (
        <div className="inline-alert info">
          <div className="inline-alert-icon"></div>
          <div className="inline-alert-content">
            <div className="inline-alert-message">
              Loading dropdown options from database...
            </div>
          </div>
        </div>
      )}
      
      {/* Error Summary */}
      {hasValidationErrors && (
        <div className="error-summary">
          <div className="error-summary-title">Please correct the following errors:</div>
          <ul className="error-summary-list">
            {Object.entries(errors).map(([fieldName, error]) => {
              const field = schema.fields.find(f => f.name === fieldName);
              return (
                <li key={fieldName} className="error-summary-item">
                  {field?.label || fieldName}: {error}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      
      {/* Form */}
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          {sections.map((section, idx) => (
            <FormSection
              key={idx}
              title={section.title}
              description={section.description}
            >
              {/* Guidelines for this section */}
              {section.guidelines?.map(guidelineType => (
                <Guidelines
                  key={guidelineType}
                  type={guidelineType}
                  category={formData.category}
                  expanded={expandedGuidelines[guidelineType]}
                  onToggle={toggleGuideline}
                />
              ))}
              
              {/* Fields */}
              {section.fields.map(field => (
                <React.Fragment key={field.name}>
                  {renderField(field)}
                  {field.name === 'short_code' && formData[field.name] && !errors[field.name] && touchedFields[field.name] && (
                    <div className="form-success">Valid format</div>
                  )}
                </React.Fragment>
              ))}
              
              {/* NEW: Extra content (produces_oil_type) */}
              {section.extraContent}
            </FormSection>
          ))}
        </div>
        
        {/* Sticky Action Bar */}
        <div className="actions-sticky">
          <div className="actions">
            {saving && (
              <div className="actions-info">Saving changes...</div>
            )}
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || Object.keys(loadingDynamicOptions).some(key => loadingDynamicOptions[key])}
            >
              {saving ? (
                <>
                  <span className="btn-spinner"></span>
                  Saving...
                </>
              ) : (
                isEditMode ? 'Update' : 'Save'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default MasterForm;
