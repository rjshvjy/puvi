// File Path: puvi-frontend/puvi-frontend-main/src/components/Masters/MasterForm.jsx
// Professional Master Form Component with Enterprise UI
// ENHANCED: Full support for cost_elements fields (activity, package_size_id, module_specific, display_order)
// Version: 2.1 - Robust package size loading & field-name compatibility

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
      let errorMessage = '';
      if (data.error) {
        errorMessage = data.error;
      } else if (data.errors) {
        if (typeof data.errors === 'object') {
          const errorMessages = Object.entries(data.errors)
            .map(([field, message]) => `${field}: ${message}`)
            .join('; ');
          errorMessage = errorMessages;
        } else {
          errorMessage = data.errors;
        }
      } else {
        errorMessage = `API call failed: ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// ==================== Sub-Components ====================

const FormSection = ({ title, description, children, className = '' }) => (
  <div className={`form-section ${className}`}>
    {title && (
      <div className="form-section-header">
        <h3 className="form-section-title">{title}</h3>
        {description && <p className="form-section-desc">{description}</p>}
      </div>
    )}
    <div className="form-section-body">{children}</div>
  </div>
);

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
            <p className="guidelines-warning">⚠ Include supplier code at the end for easy identification</p>
          </>
        )
      };
    }

    if (type === 'cost-element-activity') {
      return {
        title: 'Activity Classification',
        content: (
          <>
            <p>Activity determines when this cost is applied:</p>
            <ul>
              <li><strong>Drying:</strong> Costs during seed drying process</li>
              <li><strong>Crushing:</strong> Costs during oil extraction</li>
              <li><strong>Filtering:</strong> Costs during oil filtering</li>
              <li><strong>Packing:</strong> Packaging-related costs</li>
              <li><strong>Common:</strong> Shared across multiple activities</li>
              <li><strong>General:</strong> Not activity-specific</li>
            </ul>
            <p className="guidelines-info">Activity filtering helps in accurate cost allocation to batches</p>
          </>
        )
      };
    }

    if (type === 'cost-calculation-method') {
      return {
        title: 'Calculation Method Guide',
        content: (
          <>
            <p>How the cost is calculated:</p>
            <ul>
              <li><strong>per_kg:</strong> Rate × Weight in kg</li>
              <li><strong>per_hour:</strong> Rate × Hours worked</li>
              <li><strong>per_unit:</strong> Rate × Number of units</li>
              <li><strong>fixed:</strong> Flat amount (rate only)</li>
              <li><strong>actual:</strong> Manual entry required</li>
            </ul>
            <p className="guidelines-warning">⚠ Unit type and calculation method should align</p>
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
        <button type="button" className="guidelines-toggle" onClick={() => onToggle(type)}>
          {expanded ? 'Hide' : 'Show'}
        </button>
      </div>
      {expanded && <div className="guidelines-content">{guidelines.content}</div>}
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
        <option key={option.id || option.size_id || option.supplier_id} value={option.id || option.size_id || option.supplier_id}>
          {(option.name || option.code || '').toString()}
        </option>
      ))}
    </select>
    {error && <div id={`${id}-error`} className="form-error">{error}</div>}
    {help && !error && <div id={`${id}-help`} className="form-help">{help}</div>}
  </div>
);

const CheckboxField = ({ id, label, value, onChange, error, disabled, help }) => (
  <div className="field checkbox-field">
    <label htmlFor={id} className="checkbox-label">
      <input
        type="checkbox"
        id={id}
        className="checkbox"
        checked={value || false}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined}
      />
      <span className="checkbox-text">{label}</span>
    </label>
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

const ReferenceField = ({ id, label, value, onChange, options, error, required, disabled, help, displayField = 'name' }) => {
  const [filter, setFilter] = useState('');

  // Show a warning only when loaded & truly empty
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
              No {label.toLowerCase()} found. Please add {label.toLowerCase()} first.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredOptions = options.filter(opt => {
    const searchText = opt[displayField] || opt.name || opt.code || '';
    return (searchText || '').toLowerCase().includes(filter.toLowerCase());
  });

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
            placeholder={`Filter ${label.toLowerCase()}...`}
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
        {filteredOptions.map(option => {
          const optValue = option.id ?? option.size_id ?? option.supplier_id;
          const labelText = option[displayField] || option.name || option.code || '';
          const extra = option.code && option.name ? ` (${option.code})` : '';
          return (
            <option key={optValue} value={optValue}>
              {`${labelText}${extra}`}
            </option>
          );
        })}
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
  return (value || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3);
};

const formatMaterialShortCodeOnBlur = (value) => {
  let clean = (value || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
  clean = clean.replace(/-/g, '');
  if (clean.length > 3) {
    clean = clean.slice(0, 3) + '-' + clean.slice(3, 5);
  }
  return clean;
};

const validateField = (field, value) => {
  if (field.required && (!value || value === '')) return `${field.label} is required`;
  if (!value && !field.required) return '';

  if (field.pattern) {
    const pattern = field.pattern.startsWith('^') ? field.pattern : `^${field.pattern}$`;
    const regex = new RegExp(pattern);
    if (!regex.test(value)) {
      if (field.name === 'short_code') {
        return field.masterType === 'suppliers'
          ? 'Must be exactly 3 uppercase letters'
          : 'Format must be XXX-YY';
      }
      if (field.name === 'gst_number') return 'GST number must be 15 characters (e.g., 22AAAAA0000A1Z5)';
      return `${field.label} format is invalid`;
    }
  }

  if (field.type === 'email' && value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return 'Please enter a valid email address';
  }

  if (field.type === 'decimal' || field.type === 'integer') {
    const num = parseFloat(value);
    if (isNaN(num)) return 'Please enter a valid number';
    if (field.min !== undefined && num < field.min) return `Minimum value is ${field.min}`;
    if (field.max !== undefined && num > field.max) return `Maximum value is ${field.max}`;
    if (field.type === 'integer' && !Number.isInteger(num)) return 'Please enter a whole number';
  }

  if (field.max_length && value.length > field.max_length) {
    return `Maximum length is ${field.max_length} characters`;
  }

  return '';
};

// Normalize any package size list shape to [{ size_id, name, code }]
const normalizePackageSizes = (rawList = []) => {
  const normalized = rawList.map((item) => {
    // Some APIs return a join row; drill into nested "size" or "package_size" if present
    const src = item?.size || item?.package_size || item || {};
    const size_id =
      src.size_id ?? src.id ?? src.package_size_id ?? src.pk ?? null;
    const name =
      src.size_name ?? src.name ?? src.label ?? '';
    const code =
      src.size_code ?? src.code ?? '';
    return { size_id, name, code };
  }).filter(x => x.size_id && (x.name || x.code));

  return normalized;
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
  const [packageSizes, setPackageSizes] = useState([]);
  const [alert, setAlert] = useState(null);
  const [packageSizesLoaded, setPackageSizesLoaded] = useState(false);
  const [expandedGuidelines, setExpandedGuidelines] = useState({
    'supplier-short-code': true,
    'material-short-code': true,
    'material-naming': true,
    'cost-element-activity': true,
    'cost-calculation-method': false
  });

  // State for dynamic options
  const [dynamicOptions, setDynamicOptions] = useState({});
  const [loadingDynamicOptions, setLoadingDynamicOptions] = useState({});

  // State for categories and oil types
  const [categories, setCategories] = useState([]);
  const [oilTypes, setOilTypes] = useState([]);
  const [showProducesOilType, setShowProducesOilType] = useState(false);

  // Refs
  const formRef = useRef(null);

  const isEditMode = !!editData;

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
        if (masterType === 'materials' && editData.category === 'Seeds') {
          setShowProducesOilType(true);
        }
      } else {
        if (masterType === 'cost_elements') {
          setFormData({
            activity: 'General',
            module_specific: 'all',
            display_order: 0,
            is_optional: false,
            calculation_method: 'per_kg',
            unit_type: 'per_kg',
            applicable_to: 'all'
          });
        } else {
          setFormData({});
        }
        setShowProducesOilType(false);
      }
      setErrors({});
      setTouchedFields({});
      setAlert(null);
      setDynamicOptions({});
      setLoadingDynamicOptions({});
      if (masterType === 'cost_elements') setPackageSizesLoaded(false);
    }
  }, [masterType, editData, isOpen]);

  // Load dynamic options when schema changes
  useEffect(() => {
    if (schema && schema.fields) {
      loadDynamicOptions();
    }
  }, [schema]);

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

  const loadDynamicOptions = async () => {
    if (!schema || !schema.fields) return;

    for (const field of schema.fields) {
      // Materials: category
      if (field.name === 'category' && masterType === 'materials') {
        try {
          const response = await apiCall('/api/categories');
          const categoryNames = response.categories ? response.categories.map(cat => cat.category_name) : [];
          setCategories(response.categories || []);
          setDynamicOptions(prev => ({ ...prev, category: categoryNames }));
        } catch {
          setDynamicOptions(prev => ({ ...prev, category: [] }));
        } finally {
          setLoadingDynamicOptions(prev => ({ ...prev, category: false }));
        }
        continue;
      }

      // Units
      if (field.name === 'unit') {
        setLoadingDynamicOptions(prev => ({ ...prev, unit: true }));
        try {
          const response = await apiCall('/api/materials/units');
          const unitsData = response.units || response.data || [];
          setDynamicOptions(prev => ({ ...prev, unit: unitsData }));
        } catch {
          setDynamicOptions(prev => ({ ...prev, unit: [] }));
          setAlert({
            type: 'warning',
            message: 'Failed to load units. Please check if UOM master is configured.'
          });
        } finally {
          setLoadingDynamicOptions(prev => ({ ...prev, unit: false }));
        }
        continue;
      }

      // Generic dynamic options
      if (field.options === 'dynamic' && field.options_endpoint) {
        setLoadingDynamicOptions(prev => ({ ...prev, [field.name]: true }));
        try {
          let optionsData = [];
          if (masterType === 'cost_elements' && field.options_endpoint.includes('/api/masters/cost_elements/field-options/')) {
            const response = await apiCall(field.options_endpoint);
            optionsData = response.options || response.data || [];
          } else if (field.options_endpoint.includes('/api/materials/units')) {
            const response = await apiCall('/api/materials/units');
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
          setDynamicOptions(prev => ({ ...prev, [field.name]: optionsData }));
        } catch {
          setDynamicOptions(prev => ({ ...prev, [field.name]: [] }));
        } finally {
          setLoadingDynamicOptions(prev => ({ ...prev, [field.name]: false }));
        }
      }
    }

    // Materials-only
    if (masterType === 'materials') {
      loadOilTypes();
    }

    // Cost elements: package sizes
    if (masterType === 'cost_elements') {
      loadPackageSizes();
    }
  };

  const loadOilTypes = async () => {
    try {
      const response = await apiCall('/api/config/oil_types');
      const types = response.values || response.data || [];
      setOilTypes(types);
    } catch {
      setOilTypes([]);
    }
  };

  // ---- ROBUST package sizes loader & normalizer ----
  const loadPackageSizes = async () => {
    try {
      // Ask for many; tolerate different envelopes
      const response = await apiCall('/api/masters/package_sizes?per_page=1000&is_active=true');
      const raw = response.package_sizes || response.records || response.data || response.items || [];
      const normalized = normalizePackageSizes(raw);
      setPackageSizes(normalized);
      // console.debug('Normalized package sizes:', normalized);
    } catch (error) {
      console.error('Failed to load package sizes:', error);
      setPackageSizes([]);
    } finally {
      setPackageSizesLoaded(true);
    }
  };

  const loadReferences = async () => {
    try {
      if (masterType === 'materials') {
        const response = await apiCall('/api/masters/suppliers?per_page=100&is_active=true');
        if (response.success) {
          setSuppliers(response.records || []);
        } else {
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

  const handleFieldChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));

    if (fieldName === 'category' && masterType === 'materials') {
      setShowProducesOilType(value === 'Seeds');
      if (value !== 'Seeds') {
        setFormData(prev => ({ ...prev, produces_oil_type: null }));
      }
    }

    if (errors[fieldName] && touchedFields[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const handleFieldBlur = (field) => {
    setTouchedFields(prev => ({ ...prev, [field.name]: true }));
    if (field.name === 'short_code') {
      const formatted = masterType === 'suppliers'
        ? formatSupplierShortCodeOnBlur(formData[field.name] || '')
        : formatMaterialShortCodeOnBlur(formData[field.name] || '');
      handleFieldChange(field.name, formatted);
      const error = validateField(field, formatted);
      if (error) setErrors(prev => ({ ...prev, [field.name]: error }));
      else setErrors(prev => { const n = { ...prev }; delete n[field.name]; return n; });
    } else {
      const error = validateField(field, formData[field.name]);
      if (error) setErrors(prev => ({ ...prev, [field.name]: error }));
    }
  };

  const toggleGuideline = (type) => {
    setExpandedGuidelines(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const validateForm = () => {
    if (!schema || !schema.fields) return {};
    const newErrors = {};
    schema.fields.forEach(field => {
      const error = validateField(field, formData[field.name]);
      if (error) newErrors[field.name] = error;
    });
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setTouchedFields(schema.fields.reduce((acc, f) => ({ ...acc, [f.name]: true }), {}));
      const firstErrorField = Object.keys(validationErrors)[0];
      const element = document.getElementById(`${masterType}-${firstErrorField}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
      return;
    }

    setSaving(true);
    setAlert(null);

    try {
      const url = isEditMode
        ? `/api/masters/${masterType}/${editData[schema.primary_key]}`
        : `/api/masters/${masterType}`;
      const method = isEditMode ? 'PUT' : 'POST';

      const dataToSend = {};
      schema.fields.forEach(field => {
        if (formData[field.name] !== undefined) {
          dataToSend[field.name] = formData[field.name];
        }
      });

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
        setTimeout(() => onSave(response), 1000);
      }
    } catch (error) {
      setAlert({ type: 'error', title: 'Save failed', message: error.message });
    } finally {
      setSaving(false);
    }
  };

  // --------- FIELD RENDERING ---------
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

    // Supplier reference
    if (
      field.type === 'reference' ||
      field.reference_table === 'suppliers' ||
      field.name === 'supplier_id' ||
      (field.label && field.label.toLowerCase().includes('supplier'))
    ) {
      if (field.reference_table === 'suppliers' || field.name === 'supplier_id' || (field.label || '').toLowerCase().includes('supplier')) {
        return (
          <ReferenceField
            {...commonProps}
            options={suppliers}
            displayField="supplier_name"
            help={field.help || 'Select from existing suppliers'}
          />
        );
      }
    }

    // ---- Package size reference for multiple schema variants ----
    const isPackageSizeField =
      (masterType === 'cost_elements') && (
        field.name === 'package_size_id' ||
        field.name === 'package_size' ||
        field.reference_table === 'package_sizes' ||
        (field.options_endpoint && field.options_endpoint.includes('/package_sizes'))
      );

    if (isPackageSizeField) {
      if (!packageSizesLoaded) {
        return (
          <div className="field">
            <label htmlFor={fieldId} className="label">
              {field.label}
              {field.required && <span className="required">*</span>}
            </label>
            <div className="form-help">Loading package sizes...</div>
          </div>
        );
      }

      return (
        <ReferenceField
          {...commonProps}
          options={packageSizes}
          displayField="name"
          help={field.help_text || 'Link to specific package size (optional)'}
        />
      );
    }

    // Materials: category
    if (field.name === 'category' && masterType === 'materials') {
      return (
        <SelectField
          {...commonProps}
          options={dynamicOptions.category || []}
          loading={loadingDynamicOptions.category}
          help={field.help || (loadingDynamicOptions.category ? 'Loading categories...' : 'Select material category')}
        />
      );
    }

    // Units
    if (field.name === 'unit') {
      const unitOptions = dynamicOptions.unit || [];
      const isLoadingUnits = loadingDynamicOptions.unit;

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

    // Boolean
    if (field.type === 'boolean') {
      return <CheckboxField {...commonProps} help={field.help_text || field.help} />;
    }

    // Select (generic)
    if (field.type === 'select') {
      const isDynamic = field.options === 'dynamic';
      const isLoading = loadingDynamicOptions[field.name];
      let fieldOptions = [];
      if (isDynamic) fieldOptions = dynamicOptions[field.name] || [];
      else if (Array.isArray(field.options)) fieldOptions = field.options;

      return (
        <SelectField
          {...commonProps}
          options={fieldOptions}
          loading={isLoading}
          help={field.help_text || field.help || (isLoading ? 'Loading options...' : undefined)}
        />
      );
    }

    // Textarea
    if (field.type === 'textarea') {
      return (
        <TextareaField
          {...commonProps}
          placeholder={field.placeholder}
          help={field.help_text || field.help}
          rows={field.rows || 3}
        />
      );
    }

    // Number
    if (field.type === 'decimal' || field.type === 'integer') {
      const isDensityField = field.name === 'density';
      return (
        <NumberField
          {...commonProps}
          min={field.min}
          max={field.max}
          step={field.type === 'decimal' ? (field.decimal_places ? 1 / Math.pow(10, field.decimal_places) : 0.01) : 1}
          help={field.help_text || field.help || (isDensityField ? 'Density value (specific gravity)' : undefined)}
        />
      );
    }

    // Default text/email
    return (
      <TextField
        {...commonProps}
        placeholder={field.placeholder}
        help={field.help_text || field.help || (field.name === 'short_code' ? `Example: ${masterType === 'suppliers' ? 'SKM' : 'GNS-K'}` : '')}
        maxLength={field.max_length}
      />
    );
  };

  const renderProducesOilTypeField = () => {
    if (!showProducesOilType || masterType !== 'materials') return null;
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
            <option key={oilType} value={oilType}>{oilType}</option>
          ))}
        </select>
        <div className="form-help">
          This seed material will produce {formData.produces_oil_type || '[selected oil]'} when processed in batch production
        </div>
      </div>
    );
  };

  const getFieldSections = () => {
    if (!schema || !schema.fields) return [];

    if (masterType === 'cost_elements') {
      return [
        {
          title: 'Basic Information',
          description: 'Core cost element details',
          fields: schema.fields.filter(f => ['element_name', 'category'].includes(f.name))
        },
        {
          title: 'Activity & Module',
          description: 'When and where this cost applies',
          fields: schema.fields.filter(f => ['activity', 'module_specific', 'applicable_to'].includes(f.name)),
          guidelines: ['cost-element-activity']
        },
        {
          title: 'Calculation Settings',
          description: 'How the cost is calculated',
          fields: schema.fields.filter(f => ['unit_type', 'calculation_method', 'default_rate'].includes(f.name)),
          guidelines: ['cost-calculation-method']
        },
        {
          title: 'Package Association',
          description: 'Link to specific package sizes (optional)',
          fields: schema.fields.filter(f =>
            ['package_size_id', 'package_size'].includes(f.name) || f.reference_table === 'package_sizes'
          )
        },
        {
          title: 'Display Settings',
          description: 'UI presentation options',
          fields: schema.fields.filter(f => ['display_order', 'is_optional'].includes(f.name))
        },
        {
          title: 'Additional Information',
          description: 'Notes and documentation',
          fields: schema.fields.filter(f => ['notes'].includes(f.name))
        }
      ];
    }

    if (masterType === 'materials') {
      return [
        {
          title: 'Basic Information',
          description: 'Core material details',
          fields: schema.fields.filter(f => ['material_name', 'description'].includes(f.name))
        },
        {
          title: 'Classification',
          description: 'Category and measurement',
          fields: schema.fields.filter(f => ['category', 'unit'].includes(f.name)),
          extraContent: renderProducesOilTypeField()
        },
        {
          title: 'Cost & Pricing',
          description: 'Financial information',
          fields: schema.fields.filter(f => ['current_cost', 'gst_rate'].includes(f.name))
        },
        {
          title: 'Physical Properties',
          description: 'Material specifications',
          fields: schema.fields.filter(f => ['density'].includes(f.name))
        },
        {
          title: 'Supplier & Reference',
          description: 'Link to supplier',
          fields: schema.fields.filter(f => ['supplier_id'].includes(f.name))
        },
        {
          title: 'Identification',
          description: 'Unique codes and identifiers',
          fields: schema.fields.filter(f => ['short_code'].includes(f.name)),
          guidelines: ['material-short-code', 'material-naming']
        }
      ];
    }

    return [{ title: null, fields: schema.fields }];
  };

  if (loadingSchema) {
    return (
      <div className="form-container">
        <div className="page-header"><h2 className="page-title">Loading...</h2></div>
        <div className="form-grid">
          <FormSection><FieldSkeleton /><FieldSkeleton /><FieldSkeleton /></FormSection>
          <FormSection><FieldSkeleton /><FieldSkeleton /><FieldSkeleton /></FormSection>
        </div>
      </div>
    );
  }

  if (!schema && alert?.type === 'error') {
    return (
      <div className="form-container">
        <div className="page-header"><h2 className="page-title">Error</h2></div>
        <InlineAlert {...alert} />
      </div>
    );
  }

  const sections = getFieldSections();
  const hasValidationErrors = Object.keys(errors).length > 0 && Object.keys(touchedFields).length > 0;

  return (
    <div className="form-container">
      {/* Accessibility live region */}
      <div aria-live="polite" aria-atomic="true" className="visually-hidden">
        {saving && 'Saving form...'}
        {alert?.type === 'success' && alert.message}
        {Object.keys(loadingDynamicOptions).some(key => loadingDynamicOptions[key]) && 'Loading form options...'}
      </div>

      <div className="page-header">
        <h1 className="page-title">{isEditMode ? 'Edit' : 'Add New'} {masterDisplayNames[masterType]}</h1>
        <p className="page-subtitle">
          {isEditMode ? `Editing ${editData?.[schema?.name_field] || 'record'}` : `Create a new ${masterDisplayNames[masterType].toLowerCase()} record`}
        </p>
      </div>

      {alert && <InlineAlert {...alert} />}

      {Object.keys(loadingDynamicOptions).some(key => loadingDynamicOptions[key]) && (
        <div className="inline-alert info">
          <div className="inline-alert-icon"></div>
          <div className="inline-alert-content">
            <div className="inline-alert-message">Loading dropdown options from database...</div>
          </div>
        </div>
      )}

      {hasValidationErrors && (
        <div className="error-summary">
          <div className="error-summary-title">Please correct the following errors:</div>
          <ul className="error-summary-list">
            {Object.entries(errors).map(([fieldName, err]) => {
              const field = schema.fields.find(f => f.name === fieldName);
              return <li key={fieldName} className="error-summary-item">{field?.label || fieldName}: {err}</li>;
            })}
          </ul>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          {sections.map((section, idx) => (
            <FormSection key={idx} title={section.title} description={section.description}>
              {section.guidelines?.map(g => (
                <Guidelines key={g} type={g} category={formData.category} expanded={expandedGuidelines[g]} onToggle={toggleGuideline} />
              ))}
              {section.fields.map(field => (
                <React.Fragment key={field.name}>
                  {renderField(field)}
                  {field.name === 'short_code' && formData[field.name] && !errors[field.name] && touchedFields[field.name] && (
                    <div className="form-success">Valid format</div>
                  )}
                </React.Fragment>
              ))}
              {section.extraContent}
            </FormSection>
          ))}
        </div>

        <div className="actions-sticky">
          <div className="actions">
            {saving && <div className="actions-info">Saving changes...</div>}
            <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || Object.keys(loadingDynamicOptions).some(k => loadingDynamicOptions[k])}
            >
              {saving ? (<><span className="btn-spinner"></span>Saving...</>) : (isEditMode ? 'Update' : 'Save')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default MasterForm;
