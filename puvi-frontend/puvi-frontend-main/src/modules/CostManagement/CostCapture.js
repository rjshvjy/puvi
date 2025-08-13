// File Path: puvi-frontend/puvi-frontend-main/src/modules/CostManagement/CostCapture.js
// Cost Capture Component - ACTIVITY-BASED FILTERING VERSION
// Fixed: Removed name-based filtering, now uses activity field from backend
// UPDATED: Added hasChanges flag to calculateAllCosts to prevent infinite loops

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const CostCapture = ({ 
  module = 'batch',        
  stage = 'drying',        
  quantity = 0,            
  oilYield = 0,            
  crushingHours = 0,       
  batchId = null,          
  onCostsUpdate = null,    
  showSummary = true,      
  allowOverride = true     
}) => {
  const [costElements, setCostElements] = useState([]);
  const [costInputs, setCostInputs] = useState({});
  const [loading, setLoading] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [error, setError] = useState(null);

  // Map stage to activity
  const getActivityFromStage = (currentStage) => {
    const stageActivityMap = {
      'drying': 'Drying',
      'crushing': 'Crushing',
      'filtering': 'Filtering',
      'batch': 'all',  // Get all activities for complete batch
      'sales': 'General',
      'blending': 'Blending'
    };
    return stageActivityMap[currentStage] || 'General';
  };

  // Filter elements based on activity (backend already provides activity)
  const filterElementsByActivity = (elements, currentStage) => {
    if (currentStage === 'batch') {
      // Show all elements for complete batch view
      return elements;
    }
    
    const targetActivity = getActivityFromStage(currentStage);
    
    return elements.filter(element => {
      // Use activity field from backend instead of name matching
      const elementActivity = element.activity || 'General';
      
      // Include Common costs in all stages
      if (elementActivity === 'Common') {
        return true;
      }
      
      // For crushing stage, include time-based costs regardless of activity
      if (currentStage === 'crushing' && element.calculation_method === 'per_hour') {
        return true;
      }
      
      // Match activity for the stage
      return elementActivity === targetActivity;
    });
  };

  // Fetch applicable cost elements on mount or when stage changes
  useEffect(() => {
    console.log(`🔄 CostCapture [${stage}] mounting/updating - fetching cost elements`);
    fetchCostElements();
  }, [stage, module]);

  // Calculate costs - FIXED VERSION WITH hasChanges FLAG
  const calculateAllCosts = () => {
    if (!costElements || costElements.length === 0) {
      return;
    }

    let total = 0;
    const updatedInputs = { ...costInputs };
    const costsArray = [];
    let hasChanges = false;

    costElements.forEach(element => {
      // Check if input exists, if not create it
      let input = updatedInputs[element.element_id];
      if (!input) {
        input = {
          isApplied: !element.is_optional,
          overrideRate: null,
          actualCost: null,
          quantity: 0,
          totalCost: 0
        };
        updatedInputs[element.element_id] = input;
        hasChanges = true;  // New input created, mark as changed
      }

      let elementQuantity = 0;
      let elementCost = 0;
      const rate = input.overrideRate !== null && input.overrideRate !== '' 
        ? parseFloat(input.overrideRate) 
        : element.default_rate;

      // Calculate based on calculation method
      switch (element.calculation_method) {
        case 'per_kg':
          // Use activity to determine which quantity to use
          if (element.activity === 'Common' || element.element_name.toLowerCase().includes('common')) {
            elementQuantity = oilYield || 0;
          } else if (element.activity === 'Drying') {
            elementQuantity = quantity || 0;
          } else {
            elementQuantity = quantity || 0;
          }
          elementCost = elementQuantity * rate;
          break;

        case 'per_hour':
          elementQuantity = crushingHours || 0;
          elementCost = elementQuantity * rate;
          break;

        case 'fixed':
          elementQuantity = 1;
          elementCost = input.isApplied ? rate : 0;
          break;

        case 'actual':
          elementQuantity = 1;
          elementCost = input.actualCost || 0;
          break;

        case 'per_bag':
          elementQuantity = Math.ceil((quantity || 0) / 50);
          elementCost = elementQuantity * rate;
          break;

        default:
          elementQuantity = quantity || 0;
          elementCost = elementQuantity * rate;
      }

      // Check if values have changed
      if (input.quantity !== elementQuantity || input.totalCost !== elementCost) {
        hasChanges = true;
      }

      // Update the input with calculated values
      updatedInputs[element.element_id] = {
        ...input,
        quantity: elementQuantity,
        totalCost: elementCost
      };

      // Only add to total and array if applied
      if (input.isApplied) {
        total += elementCost;
        
        costsArray.push({
          element_id: element.element_id,
          element_name: element.element_name,
          category: element.category,
          activity: element.activity || 'General',
          quantity: elementQuantity,
          rate: rate,
          total_cost: elementCost,
          is_applied: true,
          is_optional: element.is_optional,
          calculation_method: element.calculation_method,
          overrideRate: input.overrideRate,
          default_rate: element.default_rate,
          totalCost: elementCost
        });
      }
    });

    setTotalCost(total);

    // Only update state if changes detected - THIS PREVENTS INFINITE LOOP
    if (hasChanges) {
      setCostInputs(updatedInputs);
    }

    // Debug logging to track cost emission
    console.log(`💰 CostCapture [${stage}] emitting ${costsArray.length} costs, Total: ₹${total.toFixed(2)}`);

    // Always send updated costs to parent - THIS ENSURES DEFAULTS ARE CAPTURED
    if (onCostsUpdate && typeof onCostsUpdate === 'function') {
      onCostsUpdate(costsArray);
    }
  };

  // Recalculate when relevant props change
  useEffect(() => {
    if (costElements.length > 0 && Object.keys(costInputs).length > 0) {
      console.log(`⚙️ CostCapture [${stage}] recalculating - qty:${quantity}, oil:${oilYield}, hours:${crushingHours}`);
      calculateAllCosts();
    }
  }, [quantity, oilYield, crushingHours, costInputs, costElements]);

  const fetchCostElements = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Determine which endpoint to use based on whether activity field is available
      let response;
      
      // Try activity-based endpoint first (new approach)
      try {
        const activity = getActivityFromStage(stage);
        if (activity === 'all') {
          // For batch stage, get all elements
          response = await api.costManagement.getCostElementsMaster({ applicable_to: module });
        } else {
          // Use new activity-based endpoint
          response = await api.costManagement.getCostElementsByActivity(activity, module);
        }
      } catch (activityError) {
        console.log('Activity endpoint not available, falling back to stage endpoint');
        // Fallback to stage-based endpoint if activity endpoint doesn't exist yet
        response = await api.costManagement.getCostElementsByStage(stage === 'batch' ? 'batch' : stage);
      }
      
      if (response.success && response.cost_elements) {
        // Filter elements based on activity
        const filteredElements = filterElementsByActivity(response.cost_elements, stage);
        
        // Initialize cost inputs for each element
        const initialInputs = {};
        filteredElements.forEach(element => {
          let shouldApply = false;
          
          if (!element.is_optional) {
            shouldApply = true;
          } else if (stage === 'drying' && element.activity === 'Drying') {
            // Auto-apply drying elements in drying stage
            shouldApply = true;
          }
          
          initialInputs[element.element_id] = {
            isApplied: shouldApply,
            overrideRate: null,
            actualCost: null,
            quantity: 0,
            totalCost: 0
          };
        });
        
        setCostElements(filteredElements);
        setCostInputs(initialInputs);
        
        // Debug logging
        console.log(`📋 CostCapture [${stage}] loaded ${filteredElements.length} cost elements`);
        
        // Auto-expand categories with costs
        const categories = [...new Set(filteredElements.map(e => e.category))];
        const expanded = {};
        categories.forEach(cat => expanded[cat] = true);
        setExpandedCategories(expanded);
      }
    } catch (error) {
      console.error('Error fetching cost elements:', error);
      setError('Failed to load cost elements');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (elementId) => {
    const element = costElements.find(e => e.element_id === elementId);
    const newState = !(costInputs[elementId]?.isApplied || false);
    console.log(`✅ CostCapture [${stage}] checkbox: ${element?.element_name} = ${newState}`);
    
    setCostInputs(prev => ({
      ...prev,
      [elementId]: {
        ...(prev[elementId] || {}),
        isApplied: newState
      }
    }));
  };

  const handleOverrideChange = (elementId, value) => {
    const element = costElements.find(e => e.element_id === elementId);
    const parsedValue = value === '' ? null : value;
    console.log(`💲 CostCapture [${stage}] override rate: ${element?.element_name} = ${parsedValue || 'default'}`);
    
    setCostInputs(prev => ({
      ...prev,
      [elementId]: {
        ...(prev[elementId] || {}),
        overrideRate: parsedValue
      }
    }));
  };

  const handleActualCostChange = (elementId, value) => {
    const parsedValue = value === '' ? 0 : parseFloat(value) || 0;
    setCostInputs(prev => ({
      ...prev,
      [elementId]: {
        ...(prev[elementId] || {}),
        actualCost: parsedValue
      }
    }));
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Group elements by category
  const elementsByCategory = costElements.reduce((acc, element) => {
    if (!acc[element.category]) {
      acc[element.category] = [];
    }
    acc[element.category].push(element);
    return acc;
  }, {});

  // Category colors
  const getCategoryColor = (category) => {
    const colors = {
      'Labor': '#d4edda',
      'Utilities': '#cce5ff',
      'Consumables': '#fff3cd',
      'Transport': '#f8d7da',
      'Quality': '#e2e3e5',
      'Maintenance': '#d1ecf1',
      'Overhead': '#e7e3f4'
    };
    return colors[category] || '#f8f9fa';
  };

  // Get activity badge color
  const getActivityColor = (activity) => {
    const colors = {
      'Drying': '#ffc107',
      'Crushing': '#17a2b8',
      'Filtering': '#6c757d',
      'Common': '#28a745',
      'Quality': '#6610f2',
      'Transport': '#dc3545',
      'General': '#6c757d'
    };
    return colors[activity] || '#6c757d';
  };

  // Get stage display name
  const getStageDisplayName = () => {
    switch (stage) {
      case 'drying':
        return 'Drying Stage';
      case 'crushing':
        return 'Crushing & Production';
      case 'batch':
        return 'Complete Batch';
      default:
        return stage.charAt(0).toUpperCase() + stage.slice(1);
    }
  };

  const styles = {
    container: {
      backgroundColor: '#ffffff',
      padding: '20px',
      borderRadius: '8px',
      border: '1px solid #dee2e6',
      marginBottom: '20px'
    },
    header: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '15px',
      color: '#495057',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    stageBadge: {
      padding: '4px 8px',
      backgroundColor: '#007bff',
      color: 'white',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 'normal'
    },
    activityBadge: {
      padding: '2px 6px',
      color: 'white',
      borderRadius: '3px',
      fontSize: '10px',
      fontWeight: '600',
      marginLeft: '8px'
    },
    categorySection: {
      marginBottom: '15px',
      border: '1px solid #dee2e6',
      borderRadius: '5px',
      overflow: 'hidden'
    },
    categoryHeader: {
      padding: '10px 15px',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontWeight: '600',
      fontSize: '14px'
    },
    categoryContent: {
      padding: '15px',
      backgroundColor: '#ffffff'
    },
    costItem: {
      display: 'grid',
      gridTemplateColumns: '30px 1fr 120px 120px 120px',
      gap: '10px',
      alignItems: 'center',
      padding: '8px 0',
      borderBottom: '1px solid #f0f0f0'
    },
    checkbox: {
      width: '18px',
      height: '18px',
      cursor: 'pointer'
    },
    elementName: {
      fontSize: '14px',
      color: '#495057',
      display: 'flex',
      alignItems: 'center'
    },
    input: {
      padding: '6px 10px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      fontSize: '14px',
      width: '100%'
    },
    calculated: {
      padding: '6px 10px',
      backgroundColor: '#e9ecef',
      borderRadius: '4px',
      fontSize: '14px',
      textAlign: 'right'
    },
    totalRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 120px',
      gap: '10px',
      alignItems: 'center',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderTop: '2px solid #dee2e6',
      marginTop: '20px'
    },
    totalLabel: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#495057',
      textAlign: 'right'
    },
    totalAmount: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#28a745',
      textAlign: 'right'
    },
    optional: {
      fontSize: '11px',
      color: '#6c757d',
      marginLeft: '5px'
    },
    required: {
      fontSize: '11px',
      color: '#dc3545',
      marginLeft: '5px'
    },
    unitInfo: {
      fontSize: '12px',
      color: '#6c757d',
      marginTop: '2px'
    },
    errorBox: {
      padding: '15px',
      backgroundColor: '#f8d7da',
      color: '#721c24',
      borderRadius: '4px',
      marginBottom: '15px'
    },
    emptyState: {
      padding: '20px',
      textAlign: 'center',
      color: '#6c757d'
    },
    quantityDisplay: {
      fontSize: '12px',
      color: '#6c757d',
      marginTop: '5px',
      padding: '5px',
      backgroundColor: '#f8f9fa',
      borderRadius: '3px'
    },
    infoBox: {
      padding: '10px',
      backgroundColor: '#e9ecef',
      borderRadius: '4px',
      marginBottom: '15px',
      fontSize: '13px',
      color: '#495057'
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          Loading cost elements for {getStageDisplayName()}...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBox}>
          ⚠️ {error}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h4 style={styles.header}>
        💰 Additional Cost Elements
        <span style={styles.stageBadge}>{getStageDisplayName()}</span>
      </h4>

      {/* Activity-based filtering info */}
      <div style={styles.infoBox}>
        ✅ Using activity-based filtering: Showing {costElements.length} elements for {getActivityFromStage(stage)} activity
      </div>

      {/* Display current quantities for reference */}
      {(quantity > 0 || oilYield > 0 || crushingHours > 0) && (
        <div style={styles.quantityDisplay}>
          📊 Current Values: 
          {quantity > 0 && ` Seed Qty: ${quantity} kg`}
          {oilYield > 0 && ` | Oil Yield: ${oilYield} kg`}
          {crushingHours > 0 && ` | Crushing Hours: ${crushingHours}`}
        </div>
      )}

      {Object.keys(elementsByCategory).length === 0 ? (
        <div style={styles.emptyState}>
          No cost elements available for {getStageDisplayName()}
        </div>
      ) : (
        <>
          {Object.entries(elementsByCategory).map(([category, elements]) => (
            <div key={category} style={styles.categorySection}>
              <div 
                style={{
                  ...styles.categoryHeader,
                  backgroundColor: getCategoryColor(category)
                }}
                onClick={() => toggleCategory(category)}
              >
                <span>
                  {category} Costs ({elements.length})
                  {elements.filter(e => costInputs[e.element_id]?.isApplied).length > 0 && 
                    ` - ${elements.filter(e => costInputs[e.element_id]?.isApplied).length} selected`}
                </span>
                <span>{expandedCategories[category] ? '▼' : '▶'}</span>
              </div>

              {expandedCategories[category] && (
                <div style={styles.categoryContent}>
                  {elements.map(element => {
                    const input = costInputs[element.element_id] || {};
                    const isActualCost = element.calculation_method === 'actual';
                    const effectiveRate = input.overrideRate !== null && input.overrideRate !== ''
                      ? parseFloat(input.overrideRate)
                      : element.default_rate;
                    
                    return (
                      <div key={element.element_id} style={styles.costItem}>
                        <input
                          type="checkbox"
                          style={styles.checkbox}
                          checked={input.isApplied || false}
                          onChange={() => handleCheckboxChange(element.element_id)}
                          disabled={!element.is_optional}
                        />
                        
                        <div style={styles.elementName}>
                          <span>
                            {element.element_name}
                            {element.is_optional ? (
                              <span style={styles.optional}>(Optional)</span>
                            ) : (
                              <span style={styles.required}>(Required)</span>
                            )}
                          </span>
                          {element.activity && (
                            <span style={{
                              ...styles.activityBadge,
                              backgroundColor: getActivityColor(element.activity)
                            }}>
                              {element.activity}
                            </span>
                          )}
                          <div style={styles.unitInfo}>
                            {isActualCost ? (
                              'Enter actual amount'
                            ) : (
                              `${element.unit_type} - ₹${element.default_rate}/${element.unit_type}`
                            )}
                          </div>
                        </div>

                        {isActualCost ? (
                          <input
                            type="number"
                            style={{
                              ...styles.input,
                              backgroundColor: input.isApplied ? 'white' : '#f8f9fa'
                            }}
                            placeholder="Enter actual cost"
                            value={input.actualCost || ''}
                            onChange={(e) => handleActualCostChange(element.element_id, e.target.value)}
                            disabled={!input.isApplied}
                          />
                        ) : allowOverride ? (
                          <input
                            type="number"
                            style={{
                              ...styles.input,
                              backgroundColor: input.isApplied ? 'white' : '#f8f9fa',
                              fontWeight: input.overrideRate ? 'bold' : 'normal',
                              borderColor: input.overrideRate ? '#ffc107' : '#ced4da'
                            }}
                            placeholder={element.default_rate?.toString() || '0'}
                            value={input.overrideRate || ''}
                            onChange={(e) => handleOverrideChange(element.element_id, e.target.value)}
                            disabled={!input.isApplied}
                            title="Override default rate"
                          />
                        ) : (
                          <div style={styles.calculated}>
                            ₹{element.default_rate || 0}
                          </div>
                        )}

                        <div style={styles.calculated}>
                          {(input.quantity || 0).toFixed(2)}
                          {element.calculation_method === 'per_hour' && ' hrs'}
                          {element.calculation_method === 'per_kg' && ' kg'}
                          {element.calculation_method === 'per_bag' && ' bags'}
                          {element.calculation_method === 'fixed' && ' unit'}
                        </div>

                        <div style={{
                          ...styles.calculated,
                          fontWeight: '600',
                          color: input.isApplied ? '#28a745' : '#6c757d',
                          backgroundColor: input.isApplied && input.totalCost > 0 ? '#d4edda' : '#e9ecef'
                        }}>
                          ₹{input.isApplied && input.totalCost ? input.totalCost.toFixed(2) : '0.00'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {showSummary && (
            <div style={styles.totalRow}>
              <div style={styles.totalLabel}>
                Total {getStageDisplayName()} Costs:
              </div>
              <div style={styles.totalAmount}>
                ₹{totalCost.toFixed(2)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CostCapture;
