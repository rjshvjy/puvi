// File Path: puvi-frontend/puvi-frontend-main/src/components/Masters/OilConfigurationDashboard.jsx
// Oil Configuration Dashboard - Manages oil type mappings between seeds and products
// Validates and fixes configuration issues with user review
// FIXED: Corrected CSS import path

import React, { useState, useEffect } from 'react';
import '../../modules/MastersManagement/MastersManagement.css'; // Fixed path to correct CSS location

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
      throw new Error(data.error || data.message || `API call failed: ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

const OilConfigurationDashboard = () => {
  // State management
  const [activeTab, setActiveTab] = useState('status');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Data states
  const [healthStatus, setHealthStatus] = useState(null);
  const [seedVarieties, setSeedVarieties] = useState([]);
  const [oilProducts, setOilProducts] = useState([]);
  const [productionFlow, setProductionFlow] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [editedSuggestions, setEditedSuggestions] = useState({});
  const [selectedSuggestions, setSelectedSuggestions] = useState(new Set());
  
  // Load data on mount and tab change
  useEffect(() => {
    loadDataForTab(activeTab);
  }, [activeTab]);
  
  // Load data based on active tab
  const loadDataForTab = async (tab) => {
    setLoading(true);
    setError('');
    
    try {
      switch (tab) {
        case 'status':
          await loadHealthStatus();
          break;
        case 'seeds':
          await loadSeedVarieties();
          break;
        case 'oils':
          await loadOilProducts();
          break;
        case 'flow':
          await loadProductionFlow();
          break;
        default:
          break;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Load health status
  const loadHealthStatus = async () => {
    const data = await apiCall('/api/oil-config/status');
    setHealthStatus(data);
  };
  
  // Load seed varieties
  const loadSeedVarieties = async () => {
    const data = await apiCall('/api/oil-config/seed-varieties');
    setSeedVarieties(data.seed_varieties || []);
  };
  
  // Load oil products
  const loadOilProducts = async () => {
    const data = await apiCall('/api/oil-config/oil-products');
    setOilProducts(data.oil_products || []);
  };
  
  // Load production flow
  const loadProductionFlow = async () => {
    const data = await apiCall('/api/oil-config/production-flow');
    setProductionFlow(data.production_flow || []);
  };
  
  // Validate and get suggestions
  const validateConfiguration = async () => {
    setLoading(true);
    setError('');
    setSuggestions([]);
    setEditedSuggestions({});
    setSelectedSuggestions(new Set());
    
    try {
      const data = await apiCall('/api/oil-config/validate', {
        method: 'POST',
        body: JSON.stringify({})
      });
      
      setSuggestions(data.suggestions || []);
      
      if (data.suggestions.length === 0) {
        setSuccessMessage('✅ Configuration is healthy! No issues found.');
      } else {
        // Auto-select high confidence suggestions
        const autoSelected = new Set();
        data.suggestions.forEach((s, index) => {
          if (s.confidence === 'high') {
            autoSelected.add(index);
          }
        });
        setSelectedSuggestions(autoSelected);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle suggestion value edit
  const handleSuggestionEdit = (index, newValue) => {
    setEditedSuggestions(prev => ({
      ...prev,
      [index]: newValue
    }));
  };
  
  // Toggle suggestion selection
  const toggleSuggestionSelection = (index) => {
    setSelectedSuggestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };
  
  // Apply selected suggestions
  const applySelectedSuggestions = async () => {
    if (selectedSuggestions.size === 0) {
      setError('Please select at least one suggestion to apply');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccessMessage('');
    
    const suggestionsToApply = [];
    suggestions.forEach((suggestion, index) => {
      if (selectedSuggestions.has(index)) {
        suggestionsToApply.push({
          entity_type: suggestion.entity_type,
          entity_id: suggestion.entity_id,
          field: suggestion.field,
          value: editedSuggestions[index] || suggestion.suggested_value,
          applied_by: 'User' // Should come from auth context
        });
      }
    });
    
    try {
      const data = await apiCall('/api/oil-config/apply-suggestions', {
        method: 'POST',
        body: JSON.stringify({
          suggestions: suggestionsToApply,
          applied_by: 'User'
        })
      });
      
      setSuccessMessage(`✅ Successfully applied ${data.applied_count} fixes!`);
      setSuggestions([]);
      setSelectedSuggestions(new Set());
      setEditedSuggestions({});
      
      // Reload current tab data
      await loadDataForTab(activeTab);
      
      // Reload health status if not on status tab
      if (activeTab !== 'status') {
        await loadHealthStatus();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Apply single suggestion
  const applySingleSuggestion = async (suggestion, index) => {
    setLoading(true);
    setError('');
    
    try {
      await apiCall('/api/oil-config/apply-suggestion', {
        method: 'POST',
        body: JSON.stringify({
          entity_type: suggestion.entity_type,
          entity_id: suggestion.entity_id,
          field: suggestion.field,
          value: editedSuggestions[index] || suggestion.suggested_value,
          applied_by: 'User'
        })
      });
      
      // Remove this suggestion from list
      setSuggestions(prev => prev.filter((_, i) => i !== index));
      setSuccessMessage(`✅ Fixed ${suggestion.entity_name}`);
      
      // Reload data
      await loadDataForTab(activeTab);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Get health score color
  const getHealthColor = (score) => {
    switch (score) {
      case 'healthy': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'critical': return '#ef4444';
      default: return '#6b7280';
    }
  };
  
  // Get confidence badge
  const getConfidenceBadge = (confidence) => {
    const colors = {
      high: { bg: '#dcfce7', text: '#166534', label: 'High ✓' },
      medium: { bg: '#fef3c7', text: '#92400e', label: 'Medium' },
      low: { bg: '#fee2e2', text: '#991b1b', label: 'Low' }
    };
    
    const style = colors[confidence] || colors.low;
    
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 'bold',
        backgroundColor: style.bg,
        color: style.text
      }}>
        {style.label}
      </span>
    );
  };
  
  // Render health status tab
  const renderStatusTab = () => {
    if (!healthStatus) return null;
    
    const stats = healthStatus.statistics || {};
    
    return (
      <div className="oil-config-status">
        {/* Health Score Card */}
        <div style={{
          padding: '20px',
          borderRadius: '8px',
          backgroundColor: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginTop: 0 }}>System Health</h3>
          <div style={{
            fontSize: '36px',
            fontWeight: 'bold',
            color: getHealthColor(healthStatus.health_score),
            textTransform: 'uppercase'
          }}>
            {healthStatus.health_score}
          </div>
          <div style={{ color: '#6b7280', marginTop: '10px' }}>
            {healthStatus.total_issues} configuration issues found
          </div>
        </div>
        
        {/* Statistics Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '15px',
          marginBottom: '20px'
        }}>
          <div className="stat-card" style={{
            padding: '15px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ color: '#6b7280', fontSize: '14px' }}>Seed Varieties</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {stats.total_seed_varieties}
            </div>
            {stats.unmapped_seed_varieties > 0 && (
              <div style={{ color: '#ef4444', fontSize: '12px' }}>
                {stats.unmapped_seed_varieties} missing oil_type
              </div>
            )}
          </div>
          
          <div className="stat-card" style={{
            padding: '15px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ color: '#6b7280', fontSize: '14px' }}>Oil Products</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {stats.total_oil_products}
            </div>
            {stats.unmapped_oil_products > 0 && (
              <div style={{ color: '#ef4444', fontSize: '12px' }}>
                {stats.unmapped_oil_products} missing oil_type
              </div>
            )}
          </div>
          
          <div className="stat-card" style={{
            padding: '15px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ color: '#6b7280', fontSize: '14px' }}>Materials Without Oil</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
              {stats.materials_without_oil_type || 0}
            </div>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div style={{
          padding: '20px',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h3>Quick Actions</h3>
          <button
            onClick={validateConfiguration}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading ? '⏳ Validating...' : '🔍 Validate & Get Fix Suggestions'}
          </button>
        </div>
      </div>
    );
  };
  
  // Render seeds tab
  const renderSeedsTab = () => {
    return (
      <div className="oil-config-seeds">
        <div style={{ marginBottom: '20px' }}>
          <h3>Seed Varieties Configuration</h3>
          <p style={{ color: '#6b7280' }}>
            Configure which oil type each seed variety produces
          </p>
        </div>
        
        <table className="masters-table">
          <thead>
            <tr>
              <th>Variety Name</th>
              <th>Code</th>
              <th>Produces Oil</th>
              <th>Materials</th>
              <th>Stock (kg)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {seedVarieties.map(variety => (
              <tr key={variety.subcategory_id}>
                <td>{variety.variety_name}</td>
                <td>
                  <code style={{
                    padding: '2px 6px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '3px'
                  }}>
                    {variety.code}
                  </code>
                </td>
                <td>
                  {variety.produces_oil === 'NOT CONFIGURED' ? (
                    <span style={{ color: '#ef4444' }}>❌ Not Set</span>
                  ) : (
                    <span style={{ color: '#10b981' }}>
                      ✅ {variety.produces_oil}
                    </span>
                  )}
                </td>
                <td>{variety.configured_materials}/{variety.total_materials}</td>
                <td>{variety.total_stock.toFixed(2)}</td>
                <td>
                  {variety.configuration_status === 'configured' ? (
                    <span style={{ color: '#10b981' }}>✓ Configured</span>
                  ) : (
                    <span style={{ color: '#f59e0b' }}>⚠ Needs Config</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  // Render oil products tab
  const renderOilsTab = () => {
    return (
      <div className="oil-config-oils">
        <div style={{ marginBottom: '20px' }}>
          <h3>Oil Products Configuration</h3>
          <p style={{ color: '#6b7280' }}>
            Configure oil types for finished oil products
          </p>
        </div>
        
        <table className="masters-table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Code</th>
              <th>Oil Type</th>
              <th>SKUs</th>
              <th>Batches</th>
              <th>Blends</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {oilProducts.map(product => (
              <tr key={product.subcategory_id}>
                <td>{product.product_name}</td>
                <td>
                  <code style={{
                    padding: '2px 6px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '3px'
                  }}>
                    {product.code}
                  </code>
                </td>
                <td>
                  {product.oil_type === 'NOT SET' ? (
                    <span style={{ color: '#ef4444' }}>❌ Not Set</span>
                  ) : (
                    <span style={{ color: '#10b981' }}>
                      ✅ {product.oil_type}
                    </span>
                  )}
                </td>
                <td>{product.sku_count}</td>
                <td>{product.batch_count}</td>
                <td>{product.blend_count}</td>
                <td>
                  {product.configuration_status === 'configured' ? (
                    <span style={{ color: '#10b981' }}>✓ Configured</span>
                  ) : (
                    <span style={{ color: '#f59e0b' }}>⚠ Needs Config</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  // Render production flow tab
  const renderFlowTab = () => {
    return (
      <div className="oil-config-flow">
        <div style={{ marginBottom: '20px' }}>
          <h3>Production Flow</h3>
          <p style={{ color: '#6b7280' }}>
            Visual representation of seed → oil → product relationships
          </p>
        </div>
        
        {productionFlow.map(flow => (
          <div key={flow.oil_type} style={{
            marginBottom: '30px',
            padding: '20px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h4 style={{
              color: '#1f2937',
              marginBottom: '15px',
              paddingBottom: '10px',
              borderBottom: '2px solid #e5e7eb'
            }}>
              {flow.oil_type} Oil Production Chain
            </h4>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: '20px',
              alignItems: 'start'
            }}>
              {/* Seeds Column */}
              <div>
                <h5 style={{ color: '#6b7280', marginBottom: '10px' }}>
                  Seeds ({flow.seeds.length})
                </h5>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {flow.seeds.map((seed, idx) => (
                    <li key={idx} style={{
                      padding: '5px 10px',
                      marginBottom: '5px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '4px'
                    }}>
                      {seed.name}
                      <span style={{
                        marginLeft: '10px',
                        fontSize: '12px',
                        color: '#6b7280'
                      }}>
                        ({seed.material_count} materials)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Arrow */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                color: '#9ca3af'
              }}>
                →
              </div>
              
              {/* Products Column */}
              <div>
                <h5 style={{ color: '#6b7280', marginBottom: '10px' }}>
                  Oil Products ({flow.products.length})
                </h5>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {flow.products.map((product, idx) => (
                    <li key={idx} style={{
                      padding: '5px 10px',
                      marginBottom: '5px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '4px'
                    }}>
                      {product.name}
                      <span style={{
                        marginLeft: '10px',
                        fontSize: '12px',
                        color: '#6b7280'
                      }}>
                        ({product.sku_count} SKUs)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Summary */}
            <div style={{
              marginTop: '15px',
              padding: '10px',
              backgroundColor: '#f3f4f6',
              borderRadius: '4px',
              fontSize: '14px',
              color: '#4b5563'
            }}>
              Total: {flow.total_materials} materials → {flow.total_skus} SKUs
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Render suggestions panel
  const renderSuggestions = () => {
    if (suggestions.length === 0) return null;
    
    return (
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        maxWidth: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        zIndex: 1000
      }}>
        <h3>Configuration Suggestions</h3>
        <p style={{ color: '#6b7280', marginBottom: '20px' }}>
          Review and apply suggested fixes. High confidence suggestions are pre-selected.
        </p>
        
        <table className="masters-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  checked={selectedSuggestions.size === suggestions.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedSuggestions(new Set(suggestions.map((_, i) => i)));
                    } else {
                      setSelectedSuggestions(new Set());
                    }
                  }}
                />
              </th>
              <th>Entity</th>
              <th>Field</th>
              <th>Current</th>
              <th>Suggested</th>
              <th>Confidence</th>
              <th>Reason</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {suggestions.map((suggestion, index) => (
              <tr key={index}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedSuggestions.has(index)}
                    onChange={() => toggleSuggestionSelection(index)}
                  />
                </td>
                <td>{suggestion.entity_name}</td>
                <td>{suggestion.field}</td>
                <td>
                  {suggestion.current_value || <span style={{ color: '#9ca3af' }}>(empty)</span>}
                </td>
                <td>
                  <input
                    type="text"
                    value={editedSuggestions[index] || suggestion.suggested_value}
                    onChange={(e) => handleSuggestionEdit(index, e.target.value)}
                    style={{
                      padding: '4px 8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      width: '120px'
                    }}
                  />
                </td>
                <td>{getConfidenceBadge(suggestion.confidence)}</td>
                <td style={{ fontSize: '12px', color: '#6b7280' }}>
                  {suggestion.reason}
                </td>
                <td>
                  <button
                    onClick={() => applySingleSuggestion(suggestion, index)}
                    style={{
                      padding: '4px 10px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Apply
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div style={{
          marginTop: '20px',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <button
            onClick={() => {
              setSuggestions([]);
              setSelectedSuggestions(new Set());
              setEditedSuggestions({});
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={applySelectedSuggestions}
            disabled={selectedSuggestions.size === 0 || loading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: selectedSuggestions.size === 0 || loading ? 'not-allowed' : 'pointer',
              opacity: selectedSuggestions.size === 0 || loading ? 0.5 : 1
            }}
          >
            Apply {selectedSuggestions.size} Selected Fixes
          </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="oil-config-dashboard">
      {/* Header */}
      <div style={{
        padding: '20px',
        backgroundColor: '#fff',
        borderBottom: '1px solid #e5e7eb',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: 0 }}>🛢️ Oil Configuration Manager</h2>
        <p style={{ color: '#6b7280', marginTop: '5px' }}>
          Manage oil type mappings between seeds, oil products, and SKUs
        </p>
      </div>
      
      {/* Messages */}
      {error && (
        <div style={{
          padding: '10px 15px',
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          borderRadius: '4px',
          marginBottom: '15px'
        }}>
          ❌ {error}
        </div>
      )}
      
      {successMessage && (
        <div style={{
          padding: '10px 15px',
          backgroundColor: '#dcfce7',
          color: '#166534',
          borderRadius: '4px',
          marginBottom: '15px'
        }}>
          {successMessage}
        </div>
      )}
      
      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid #e5e7eb',
        marginBottom: '20px'
      }}>
        {[
          { id: 'status', label: '📊 Health Status' },
          { id: 'seeds', label: '🌱 Seeds' },
          { id: 'oils', label: '🛢️ Oil Products' },
          { id: 'flow', label: '🔄 Production Flow' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === tab.id ? '#3b82f6' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#6b7280',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <div style={{ padding: '20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
            Loading...
          </div>
        ) : (
          <>
            {activeTab === 'status' && renderStatusTab()}
            {activeTab === 'seeds' && renderSeedsTab()}
            {activeTab === 'oils' && renderOilsTab()}
            {activeTab === 'flow' && renderFlowTab()}
          </>
        )}
      </div>
      
      {/* Suggestions Modal */}
      {renderSuggestions()}
    </div>
  );
};

export default OilConfigurationDashboard;
