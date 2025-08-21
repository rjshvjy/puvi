/**
 * Blending Module Frontend Component
 * File Path: puvi-frontend/puvi-frontend-main/src/modules/Blending/index.js
 * Handles oil blending with automatic and manual oil type selection
 */

import React, { useState, useEffect } from 'react';

const Blending = () => {
  const [oilTypes, setOilTypes] = useState([]);
  const [blendHistory, setBlendHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Result oil type for mixed blends
  const [resultOilType, setResultOilType] = useState('');
  const [availableResultTypes, setAvailableResultTypes] = useState([]);
  
  // Blend form data
  const [blendData, setBlendData] = useState({
    blend_description: '',
    blend_date: new Date().toISOString().split('T')[0],
    total_quantity: '',
    created_by: ''
  });
  
  // Blend components - start with 2 rows
  const [components, setComponents] = useState([
    { id: 1, oil_type: '', batch_id: '', batch_code: '', available_quantity: 0, cost_per_kg: 0, percentage: '', source_type: '', traceable_code: '', actual_oil_type: '' },
    { id: 2, oil_type: '', batch_id: '', batch_code: '', available_quantity: 0, cost_per_kg: 0, percentage: '', source_type: '', traceable_code: '', actual_oil_type: '' }
  ]);
  
  // Available batches for each component
  const [batchesForComponents, setBatchesForComponents] = useState({});
  
  // API base URL
  const API_BASE = 'https://puvi-backend.onrender.com';
  
  useEffect(() => {
    fetchOilTypes();
  }, []);
  
  // Check if we need result oil type selection whenever components change
  useEffect(() => {
    checkResultOilTypeNeeded();
  }, [components]);
  
  const fetchOilTypes = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/oil_types_for_blending`);
      const data = await response.json();
      if (data.success) {
        setOilTypes(data.oil_types);
        // Also fetch all available oil types for result selection
        fetchAvailableResultTypes();
      }
    } catch (error) {
      console.error('Error fetching oil types:', error);
      setMessage('Error loading oil types');
    }
  };
  
  const fetchAvailableResultTypes = async () => {
    try {
      // Get all available oil types from subcategories for result type selection
      const response = await fetch(`${API_BASE}/api/oil_types_for_blending`);
      const data = await response.json();
      if (data.success) {
        setAvailableResultTypes(data.oil_types);
      }
    } catch (error) {
      console.error('Error fetching result types:', error);
    }
  };
  
  const checkResultOilTypeNeeded = () => {
    // Get unique actual oil types from selected components
    const validComponents = components.filter(c => c.oil_type && c.batch_id);
    const uniqueOilTypes = [...new Set(validComponents.map(c => {
      // Use actual_oil_type if available (from batch data), otherwise use oil_type
      return c.actual_oil_type || c.oil_type;
    }))];
    
    // If mixing different oil types, we need user to select result type
    if (uniqueOilTypes.length > 1) {
      // Keep existing selection if already made
      if (!resultOilType) {
        setMessage('ℹ️ Mixing different oil types - please select the result oil type below');
      }
    } else {
      // Same oil types or no valid components - clear result oil type
      setResultOilType('');
      if (uniqueOilTypes.length === 1) {
        setMessage('');
      }
    }
  };
  
  const fetchBatchesForOilType = async (oilType, componentId) => {
    try {
      const response = await fetch(`${API_BASE}/api/batches_for_oil_type?oil_type=${oilType}`);
      const data = await response.json();
      if (data.success) {
        setBatchesForComponents(prev => ({
          ...prev,
          [componentId]: data.batches
        }));
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };
  
  const fetchBlendHistory = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/blend_history?limit=20`);
      const data = await response.json();
      if (data.success) {
        setBlendHistory(data.blends);
      }
    } catch (error) {
      console.error('Error fetching blend history:', error);
    }
  };
  
  const handleOilTypeChange = (componentId, oilType) => {
    const updatedComponents = components.map(comp => {
      if (comp.id === componentId) {
        return { ...comp, oil_type: oilType, batch_id: '', batch_code: '', available_quantity: 0, cost_per_kg: 0, actual_oil_type: '' };
      }
      return comp;
    });
    setComponents(updatedComponents);
    
    if (oilType) {
      fetchBatchesForOilType(oilType, componentId);
    } else {
      setBatchesForComponents(prev => {
        const newBatches = { ...prev };
        delete newBatches[componentId];
        return newBatches;
      });
    }
  };
  
  const handleBatchChange = (componentId, batchId) => {
    const batches = batchesForComponents[componentId] || [];
    const selectedBatch = batches.find(b => String(b.batch_id) === String(batchId));
    
    if (selectedBatch) {
      const updatedComponents = components.map(comp => {
        if (comp.id === componentId) {
          return {
            ...comp,
            batch_id: selectedBatch.batch_id,
            batch_code: selectedBatch.batch_code,
            available_quantity: selectedBatch.available_quantity,
            cost_per_kg: selectedBatch.cost_per_kg,
            source_type: selectedBatch.source_type,
            traceable_code: selectedBatch.traceable_code || '',
            actual_oil_type: selectedBatch.oil_type // Store the actual oil type from batch
          };
        }
        return comp;
      });
      setComponents(updatedComponents);
    }
  };
  
  const handlePercentageChange = (componentId, percentage) => {
    const updatedComponents = components.map(comp => {
      if (comp.id === componentId) {
        return { ...comp, percentage };
      }
      return comp;
    });
    setComponents(updatedComponents);
  };
  
  const addComponent = () => {
    const newId = Math.max(...components.map(c => c.id)) + 1;
    setComponents([...components, {
      id: newId,
      oil_type: '',
      batch_id: '',
      batch_code: '',
      available_quantity: 0,
      cost_per_kg: 0,
      percentage: '',
      source_type: '',
      traceable_code: '',
      actual_oil_type: ''
    }]);
  };
  
  const removeComponent = (componentId) => {
    if (components.length > 2) {
      setComponents(components.filter(c => c.id !== componentId));
    }
  };
  
  // Calculate totals and validation
  const calculateTotals = () => {
    const totalPercentage = components.reduce((sum, comp) => {
      return sum + (parseFloat(comp.percentage) || 0);
    }, 0);
    
    const totalQuantity = parseFloat(blendData.total_quantity) || 0;
    let weightedCost = 0;
    
    if (totalQuantity > 0 && totalPercentage === 100) {
      components.forEach(comp => {
        const percentage = parseFloat(comp.percentage) || 0;
        const quantityUsed = (totalQuantity * percentage) / 100;
        const costPerKg = parseFloat(comp.cost_per_kg) || 0;
        weightedCost += (quantityUsed * costPerKg);
      });
      weightedCost = weightedCost / totalQuantity;
    }
    
    return {
      totalPercentage,
      weightedCost: weightedCost.toFixed(2),
      totalCost: (totalQuantity * weightedCost).toFixed(2),
      isValid: totalPercentage === 100
    };
  };
  
  // Check if mixing different oil types
  const isDifferentOilsMix = () => {
    const validComponents = components.filter(c => c.oil_type && c.batch_id);
    const uniqueOilTypes = [...new Set(validComponents.map(c => c.actual_oil_type || c.oil_type))];
    return uniqueOilTypes.length > 1;
  };
  
  const handleSubmit = async () => {
    const totals = calculateTotals();
    if (!totals.isValid) {
      setMessage('❌ Error: Percentages must sum to exactly 100%');
      return;
    }
    
    // Validate components
    const validComponents = components.filter(c => c.oil_type && c.batch_id && c.percentage);
    if (validComponents.length < 2) {
      setMessage('❌ Error: At least 2 components are required for blending');
      return;
    }
    
    if (!blendData.blend_description || !blendData.total_quantity) {
      setMessage('❌ Error: Please fill in all required fields');
      return;
    }
    
    // Check if result oil type is needed and provided
    const needsResultOilType = isDifferentOilsMix();
    if (needsResultOilType && !resultOilType) {
      setMessage('❌ Error: Please select the result oil type for this mixed blend');
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      const payload = {
        ...blendData,
        components: validComponents.map(comp => ({
          oil_type: comp.oil_type,
          batch_id: comp.batch_id,
          batch_code: comp.batch_code,
          percentage: parseFloat(comp.percentage),
          cost_per_kg: comp.cost_per_kg,
          source_type: comp.source_type,
          traceable_code: comp.traceable_code
        }))
      };
      
      // Add result_oil_type only if mixing different oils
      if (needsResultOilType) {
        payload.result_oil_type = resultOilType;
      }
      
      const response = await fetch(`${API_BASE}/api/create_blend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage(`✅ Blend created successfully!
Blend Code: ${data.blend_code}
Traceable Code: ${data.traceable_code}
Result Oil Type: ${data.result_oil_type}
Weighted Average Cost: ₹${data.weighted_avg_cost}/kg`);
        
        // Reset form
        setBlendData({
          blend_description: '',
          blend_date: new Date().toISOString().split('T')[0],
          total_quantity: '',
          created_by: ''
        });
        setComponents([
          { id: 1, oil_type: '', batch_id: '', batch_code: '', available_quantity: 0, cost_per_kg: 0, percentage: '', source_type: '', traceable_code: '', actual_oil_type: '' },
          { id: 2, oil_type: '', batch_id: '', batch_code: '', available_quantity: 0, cost_per_kg: 0, percentage: '', source_type: '', traceable_code: '', actual_oil_type: '' }
        ]);
        setBatchesForComponents({});
        setResultOilType('');
        
        // Refresh history if visible
        if (showHistory) {
          fetchBlendHistory();
        }
      } else {
        // Check if backend is asking for result oil type selection
        if (data.requires_selection && data.available_types) {
          setAvailableResultTypes(data.available_types.map(t => t.display_name || t.oil_type));
          setMessage(`❌ Error: ${data.error}
Mixing: ${data.mixed_oil_types ? data.mixed_oil_types.join(' + ') : 'different oils'}
Please select the result oil type below.`);
        } else {
          setMessage(`❌ Error: ${data.error}`);
        }
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const totals = calculateTotals();
  const needsResultOilType = isDifferentOilsMix();
  
  // Inline styles for professional UI
  const styles = {
    container: {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px'
    },
    title: {
      fontSize: '28px',
      fontWeight: '600',
      color: '#2c3e50'
    },
    historyBtn: {
      padding: '10px 20px',
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    message: {
      padding: '15px',
      marginBottom: '20px',
      borderRadius: '4px',
      whiteSpace: 'pre-line'
    },
    successMessage: {
      backgroundColor: '#d4edda',
      color: '#155724',
      border: '1px solid #c3e6cb'
    },
    errorMessage: {
      backgroundColor: '#f8d7da',
      color: '#721c24',
      border: '1px solid #f5c6cb'
    },
    infoMessage: {
      backgroundColor: '#d1ecf1',
      color: '#0c5460',
      border: '1px solid #bee5eb'
    },
    card: {
      backgroundColor: '#fff',
      padding: '30px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    },
    cardTitle: {
      fontSize: '20px',
      fontWeight: '600',
      marginBottom: '20px',
      color: '#495057'
    },
    formRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      marginBottom: '20px'
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column'
    },
    label: {
      marginBottom: '8px',
      fontWeight: '600',
      fontSize: '14px',
      color: '#495057'
    },
    input: {
      padding: '10px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      fontSize: '15px'
    },
    select: {
      padding: '10px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      fontSize: '15px',
      backgroundColor: 'white'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      backgroundColor: '#f8f9fa',
      padding: '12px',
      textAlign: 'left',
      fontWeight: '600',
      borderBottom: '2px solid #dee2e6'
    },
    td: {
      padding: '12px',
      borderBottom: '1px solid #e9ecef'
    },
    addBtn: {
      padding: '8px 16px',
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    removeBtn: {
      padding: '6px 12px',
      backgroundColor: '#dc3545',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '13px'
    },
    submitBtn: {
      padding: '12px 30px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '600'
    },
    submitBtnDisabled: {
      backgroundColor: '#6c757d',
      cursor: 'not-allowed'
    },
    summaryGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '15px'
    },
    summaryCard: {
      padding: '15px',
      borderRadius: '6px',
      textAlign: 'center'
    },
    resultOilTypeCard: {
      backgroundColor: '#fff3cd',
      border: '1px solid #ffeaa7',
      padding: '20px',
      borderRadius: '6px',
      marginBottom: '20px'
    }
  };
  
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Oil Blending Module</h2>
        <button
          onClick={() => {
            setShowHistory(!showHistory);
            if (!showHistory && blendHistory.length === 0) {
              fetchBlendHistory();
            }
          }}
          style={styles.historyBtn}
        >
          {showHistory ? 'Hide History' : 'View History'}
        </button>
      </div>
      
      {message && (
        <div style={{
          ...styles.message,
          ...(message.includes('✅') ? styles.successMessage : 
              message.includes('ℹ️') ? styles.infoMessage : 
              styles.errorMessage)
        }}>
          {message}
        </div>
      )}
      
      {!showHistory ? (
        <div>
          {/* Blend Information */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Blend Information</h3>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Blend Date *</label>
                <input
                  type="date"
                  value={blendData.blend_date}
                  onChange={(e) => setBlendData({ ...blendData, blend_date: e.target.value })}
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Description *</label>
                <input
                  type="text"
                  value={blendData.blend_description}
                  onChange={(e) => setBlendData({ ...blendData, blend_description: e.target.value })}
                  placeholder="e.g., Premium, Export"
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Total Quantity (kg) *</label>
                <input
                  type="number"
                  value={blendData.total_quantity}
                  onChange={(e) => setBlendData({ ...blendData, total_quantity: e.target.value })}
                  step="0.01"
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Created By</label>
                <input
                  type="text"
                  value={blendData.created_by}
                  onChange={(e) => setBlendData({ ...blendData, created_by: e.target.value })}
                  placeholder="Your name"
                  style={styles.input}
                />
              </div>
            </div>
          </div>
          
          {/* Blend Components */}
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={styles.cardTitle}>Blend Components</h3>
              <button onClick={addComponent} style={styles.addBtn}>+ Add Row</button>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Oil Type</th>
                    <th style={styles.th}>Batch</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Available (kg)</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Cost/kg</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Percentage (%)</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Quantity (kg)</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {components.map((comp) => {
                    const quantityUsed = blendData.total_quantity ? 
                      ((parseFloat(blendData.total_quantity) || 0) * (parseFloat(comp.percentage) || 0) / 100).toFixed(2) : 
                      '0.00';
                    
                    return (
                      <tr key={comp.id}>
                        <td style={styles.td}>
                          <select
                            value={comp.oil_type}
                            onChange={(e) => handleOilTypeChange(comp.id, e.target.value)}
                            style={styles.select}
                          >
                            <option value="">Select Oil Type</option>
                            {oilTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </td>
                        <td style={styles.td}>
                          <select
                            value={comp.batch_id}
                            onChange={(e) => handleBatchChange(comp.id, e.target.value)}
                            style={styles.select}
                            disabled={!comp.oil_type}
                          >
                            <option value="">Select Batch</option>
                            {(batchesForComponents[comp.id] || []).map(batch => (
                              <option key={batch.batch_id} value={batch.batch_id}>
                                {batch.display_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          {comp.available_quantity.toFixed(2)}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          ₹{comp.cost_per_kg.toFixed(2)}
                        </td>
                        <td style={styles.td}>
                          <input
                            type="number"
                            value={comp.percentage}
                            onChange={(e) => handlePercentageChange(comp.id, e.target.value)}
                            step="0.01"
                            min="0"
                            max="100"
                            style={{ ...styles.input, textAlign: 'center' }}
                          />
                        </td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          {quantityUsed}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          {components.length > 2 && (
                            <button onClick={() => removeComponent(comp.id)} style={styles.removeBtn}>
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Result Oil Type Selection - Only shown when mixing different oils */}
          {needsResultOilType && (
            <div style={styles.resultOilTypeCard}>
              <h3 style={styles.cardTitle}>Result Oil Type Selection</h3>
              <p style={{ marginBottom: '15px', color: '#856404' }}>
                You are mixing different oil types. Please select what the resulting blend should be classified as:
              </p>
              <div style={styles.formGroup}>
                <label style={styles.label}>Result Oil Type *</label>
                <select
                  value={resultOilType}
                  onChange={(e) => setResultOilType(e.target.value)}
                  style={{ ...styles.select, borderColor: '#ffc107', borderWidth: '2px' }}
                >
                  <option value="">-- Select Result Oil Type --</option>
                  {availableResultTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <small style={{ marginTop: '8px', color: '#856404' }}>
                  Mixing: {components
                    .filter(c => c.oil_type && c.batch_id)
                    .map(c => c.actual_oil_type || c.oil_type)
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .join(' + ')}
                </small>
              </div>
            </div>
          )}
          
          {/* Cost Summary */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Blend Summary</h3>
            <div style={styles.summaryGrid}>
              <div style={{
                ...styles.summaryCard,
                backgroundColor: totals.isValid ? '#d4edda' : '#f8d7da'
              }}>
                <div style={{ fontSize: '14px', color: '#666' }}>Total Percentage</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: totals.isValid ? '#28a745' : '#dc3545' }}>
                  {totals.totalPercentage.toFixed(2)}%
                </div>
              </div>
              <div style={{ ...styles.summaryCard, backgroundColor: '#cce5ff' }}>
                <div style={{ fontSize: '14px', color: '#666' }}>Weighted Avg Cost</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#004085' }}>
                  ₹{totals.weightedCost}/kg
                </div>
              </div>
              <div style={{ ...styles.summaryCard, backgroundColor: '#e7e8ea' }}>
                <div style={{ fontSize: '14px', color: '#666' }}>Total Cost</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#383d41' }}>
                  ₹{totals.totalCost}
                </div>
              </div>
              <div style={{ ...styles.summaryCard, backgroundColor: '#fff3cd' }}>
                <div style={{ fontSize: '14px', color: '#666' }}>Components</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#856404' }}>
                  {components.filter(c => c.oil_type && c.batch_id).length}
                </div>
              </div>
            </div>
          </div>
          
          {/* Submit Button */}
          <div style={{ textAlign: 'right' }}>
            <button
              onClick={handleSubmit}
              disabled={loading || !totals.isValid || (needsResultOilType && !resultOilType)}
              style={{
                ...styles.submitBtn,
                ...(loading || !totals.isValid || (needsResultOilType && !resultOilType) ? styles.submitBtnDisabled : {})
              }}
            >
              {loading ? 'Creating Blend...' : 'Create Blend'}
            </button>
          </div>
        </div>
      ) : (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Blend History</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Blend Code</th>
                  <th style={styles.th}>Components</th>
                  <th style={styles.th}>Result Type</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Quantity</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Avg Cost</th>
                  <th style={styles.th}>Traceable Code</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Count</th>
                </tr>
              </thead>
              <tbody>
                {blendHistory.map((blend) => (
                  <tr key={blend.blend_id}>
                    <td style={styles.td}>{blend.blend_date}</td>
                    <td style={styles.td}>{blend.blend_code}</td>
                    <td style={styles.td}>{blend.oil_types}</td>
                    <td style={styles.td}><strong>{blend.result_oil_type || 'Mixed'}</strong></td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>{blend.total_quantity} kg</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>₹{blend.weighted_avg_cost.toFixed(2)}</td>
                    <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: '12px' }}>{blend.traceable_code}</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>{blend.component_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Blending;
