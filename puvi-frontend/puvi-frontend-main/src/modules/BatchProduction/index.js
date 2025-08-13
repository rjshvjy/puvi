// File Path: puvi-frontend/puvi-frontend-main/src/modules/BatchProduction/index.js
// Complete Batch Production Module with Report Generation
// Version: 2.0 - Includes comprehensive batch reports with traceability

import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import TimeTracker from '../CostManagement/TimeTracker';
import CostCapture from '../CostManagement/CostCapture';
import './BatchProduction.css';

const BatchProduction = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [availableSeeds, setAvailableSeeds] = useState([]);
  const [costElements, setCostElements] = useState([]);
  const [oilCakeRates, setOilCakeRates] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [batchHistory, setBatchHistory] = useState([]);
  
  // Report states
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const reportRef = useRef();
  
  // Time tracking data
  const [timeTrackingData, setTimeTrackingData] = useState(null);
  const [extendedCostElements, setExtendedCostElements] = useState([]);
  
  // Cost capture states for different stages
  const [dryingCosts, setDryingCosts] = useState([]);
  const [crushingCosts, setCrushingCosts] = useState([]);
  const [additionalCosts, setAdditionalCosts] = useState([]);
  
  // Form data
  const [batchData, setBatchData] = useState({
    oil_type: '',
    batch_description: '',
    production_date: new Date().toISOString().split('T')[0],
    material_id: '',
    seed_quantity_before_drying: '',
    seed_quantity_after_drying: '',
    oil_yield: '',
    cake_yield: '',
    sludge_yield: '',
    cake_estimated_rate: '',
    sludge_estimated_rate: '',
    cost_overrides: {},
    seed_purchase_code: '',
    crushing_start: '',
    crushing_end: '',
    crushing_hours: 0
  });

  const [selectedSeed, setSelectedSeed] = useState(null);

  // Load initial data
  useEffect(() => {
    fetchAvailableSeeds();
    fetchCostElements();
    fetchOilCakeRates();
    fetchExtendedCostElements();
  }, []);

  const fetchAvailableSeeds = async () => {
    try {
      const response = await api.batch.getSeedsForBatch();
      if (response.success) {
        setAvailableSeeds(response.seeds);
      }
    } catch (error) {
      console.error('Error fetching seeds:', error);
    }
  };

  const fetchCostElements = async () => {
    try {
      const response = await api.batch.getCostElementsForBatch();
      if (response.success) {
        setCostElements(response.cost_elements);
      }
    } catch (error) {
      console.error('Error fetching cost elements:', error);
    }
  };

  const fetchExtendedCostElements = async () => {
    try {
      const response = await api.costManagement.getCostElementsByStage('batch');
      if (response.success) {
        setExtendedCostElements(response.cost_elements);
      }
    } catch (error) {
      console.error('Error fetching extended cost elements:', error);
    }
  };

  const fetchOilCakeRates = async () => {
    try {
      const response = await api.batch.getOilCakeRates();
      if (response.success) {
        setOilCakeRates(response.rates);
      }
    } catch (error) {
      console.error('Error fetching oil cake rates:', error);
    }
  };

  const fetchBatchHistory = async () => {
    try {
      const response = await api.batch.getBatchHistory({ limit: 20 });
      if (response.success) {
        setBatchHistory(response.batches);
      }
    } catch (error) {
      console.error('Error fetching batch history:', error);
    }
  };

  // Generate comprehensive batch report
  const generateBatchReport = async (batchId, batchCode) => {
    setLoadingReport(true);
    try {
      const response = await api.costManagement.getBatchSummary(batchId);
      if (response.success) {
        setReportData(response);
        setShowReport(true);
      } else {
        throw new Error('Failed to fetch batch report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      setMessage('❌ Failed to generate batch report');
    } finally {
      setLoadingReport(false);
    }
  };

  // Print report
  const handlePrintReport = () => {
    const printContent = reportRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=900,height=650');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Batch Report - ${reportData?.batch_code || ''}</title>
          <style>
            body { 
              font-family: 'Times New Roman', serif; 
              padding: 20px;
              color: #333;
            }
            .report-header {
              text-align: center;
              border-bottom: 3px solid #2c3e50;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .company-name {
              font-size: 28px;
              font-weight: bold;
              color: #2c3e50;
              margin-bottom: 10px;
            }
            .report-title {
              font-size: 20px;
              color: #555;
              margin-bottom: 10px;
            }
            .traceable-code {
              font-size: 18px;
              color: #2196F3;
              font-weight: bold;
              margin: 15px 0;
              padding: 10px;
              border: 2px solid #2196F3;
              border-radius: 5px;
              display: inline-block;
            }
            .section {
              margin: 25px 0;
              page-break-inside: avoid;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              color: #2c3e50;
              border-bottom: 2px solid #e0e0e0;
              padding-bottom: 5px;
              margin-bottom: 15px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
            }
            th, td {
              padding: 10px;
              text-align: left;
              border: 1px solid #ddd;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
              color: #555;
            }
            .highlight {
              background-color: #fffacd;
            }
            .cost-total {
              font-weight: bold;
              font-size: 16px;
              background-color: #e8f5e9;
            }
            .warning {
              color: #ff9800;
              font-weight: bold;
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 2px solid #e0e0e0;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            .signature-section {
              display: flex;
              justify-content: space-around;
              margin-top: 60px;
            }
            .signature-box {
              width: 200px;
              text-align: center;
            }
            .signature-line {
              border-bottom: 1px solid #333;
              margin-bottom: 5px;
              height: 40px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Helper function to safely parse numeric values
  const safeParseFloat = (value, defaultValue = 0) => {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  // Handle time tracking data
  const handleTimeTracking = (timeData) => {
    setTimeTrackingData(timeData);
    setBatchData(prev => ({
      ...prev,
      crushing_start: timeData.start_datetime,
      crushing_end: timeData.end_datetime,
      crushing_hours: timeData.rounded_hours
    }));
  };

  // Calculate all extended costs including overrides
  const calculateExtendedCosts = () => {
    const allCosts = [];
    
    // Add drying costs from Step 2
    if (dryingCosts && dryingCosts.length > 0) {
      dryingCosts.forEach(cost => {
        allCosts.push({
          element_id: cost.element_id,
          element_name: cost.element_name,
          category: cost.category || 'Drying',
          activity: cost.activity || 'Drying',
          quantity: safeParseFloat(cost.quantity, 0),
          rate: safeParseFloat(cost.rate || cost.default_rate, 0),
          override_rate: cost.overrideRate !== null && cost.overrideRate !== undefined && cost.overrideRate !== '' 
            ? safeParseFloat(cost.overrideRate, null) 
            : null,
          total_cost: safeParseFloat(cost.totalCost || cost.total_cost, 0),
          is_optional: cost.is_optional || false,
          calculation_method: cost.calculation_method,
          stage: 'drying'
        });
      });
    }
    
    // Add crushing costs from Step 3
    if (crushingCosts && crushingCosts.length > 0) {
      crushingCosts.forEach(cost => {
        allCosts.push({
          element_id: cost.element_id,
          element_name: cost.element_name,
          category: cost.category || 'Crushing',
          activity: cost.activity || 'Crushing',
          quantity: safeParseFloat(cost.quantity, 0),
          rate: safeParseFloat(cost.rate || cost.default_rate, 0),
          override_rate: cost.overrideRate !== null && cost.overrideRate !== undefined && cost.overrideRate !== '' 
            ? safeParseFloat(cost.overrideRate, null) 
            : null,
          total_cost: safeParseFloat(cost.totalCost || cost.total_cost, 0),
          is_optional: cost.is_optional || false,
          calculation_method: cost.calculation_method,
          stage: 'crushing'
        });
      });
    }
    
    // Add additional costs
    if (additionalCosts && additionalCosts.length > 0) {
      additionalCosts.forEach(cost => {
        const exists = allCosts.find(c => c.element_name === cost.element_name);
        if (!exists) {
          allCosts.push({
            element_id: cost.element_id,
            element_name: cost.element_name,
            category: cost.category || 'Additional',
            activity: cost.activity || 'General',
            quantity: safeParseFloat(cost.quantity, 0),
            rate: safeParseFloat(cost.rate || cost.default_rate, 0),
            override_rate: cost.overrideRate !== null && cost.overrideRate !== undefined && cost.overrideRate !== '' 
              ? safeParseFloat(cost.overrideRate, null) 
              : null,
            total_cost: safeParseFloat(cost.totalCost || cost.total_cost, 0),
            is_optional: cost.is_optional || false,
            calculation_method: cost.calculation_method,
            stage: 'additional'
          });
        }
      });
    }
    
    return allCosts;
  };

  // Calculate derived values
  const calculateDryingLoss = () => {
    const before = safeParseFloat(batchData.seed_quantity_before_drying);
    const after = safeParseFloat(batchData.seed_quantity_after_drying);
    const loss = before - after;
    const lossPercent = before > 0 ? (loss / before * 100) : 0;
    return { loss, lossPercent };
  };

  const calculateYieldPercentages = () => {
    const after = safeParseFloat(batchData.seed_quantity_after_drying);
    const oil = safeParseFloat(batchData.oil_yield);
    const cake = safeParseFloat(batchData.cake_yield);
    const sludge = safeParseFloat(batchData.sludge_yield);
    
    return {
      oilPercent: after > 0 ? (oil / after * 100) : 0,
      cakePercent: after > 0 ? (cake / after * 100) : 0,
      sludgePercent: after > 0 ? (sludge / after * 100) : 0,
      totalPercent: after > 0 ? ((oil + cake + sludge) / after * 100) : 0
    };
  };

  const calculateCosts = () => {
    if (!selectedSeed) return null;
    
    const seedQty = safeParseFloat(batchData.seed_quantity_before_drying);
    const seedCost = seedQty * selectedSeed.weighted_avg_cost;
    
    let totalBasicCost = seedCost;
    const basicCostDetails = [];
    
    // Calculate basic cost elements with overrides
    costElements.forEach(element => {
      let quantity = 0;
      
      const overrideValue = batchData.cost_overrides[element.element_id];
      let rate;
      if (overrideValue !== null && overrideValue !== undefined && overrideValue !== '') {
        rate = safeParseFloat(overrideValue);
      } else {
        rate = element.default_rate;
      }
      
      if (element.unit_type === 'Per Kg') {
        quantity = seedQty;
      } else if (element.unit_type === 'Per Bag') {
        quantity = seedQty / 50;
      } else if (element.calculation_method === 'per_hour') {
        quantity = timeTrackingData?.rounded_hours || 0;
      } else {
        quantity = 1;
      }
      
      const cost = quantity * rate;
      totalBasicCost += cost;
      
      basicCostDetails.push({
        element_id: element.element_id,
        element_name: element.element_name,
        master_rate: element.default_rate,
        override_rate: overrideValue !== null && overrideValue !== undefined && overrideValue !== '' 
          ? safeParseFloat(overrideValue) 
          : null,
        quantity: quantity,
        total_cost: cost
      });
    });
    
    const extendedCosts = calculateExtendedCosts();
    const extendedCostTotal = extendedCosts.reduce((sum, cost) => sum + (cost.total_cost || 0), 0);
    
    const cakeRevenue = safeParseFloat(batchData.cake_yield) * safeParseFloat(batchData.cake_estimated_rate);
    const sludgeRevenue = safeParseFloat(batchData.sludge_yield) * safeParseFloat(batchData.sludge_estimated_rate);
    
    const totalProductionCost = totalBasicCost + extendedCostTotal;
    const netOilCost = totalProductionCost - cakeRevenue - sludgeRevenue;
    const oilQty = safeParseFloat(batchData.oil_yield);
    const perKgOilCost = oilQty > 0 ? netOilCost / oilQty : 0;
    
    return {
      seedCost,
      basicCostDetails,
      extendedCosts,
      totalBasicCost,
      extendedCostTotal,
      totalProductionCost,
      cakeRevenue,
      sludgeRevenue,
      netOilCost,
      perKgOilCost
    };
  };

  const handleSeedSelection = (seed) => {
    setSelectedSeed(seed);
    setBatchData({
      ...batchData,
      material_id: seed.material_id,
      oil_type: seed.material_name.split(' ')[0],
      seed_purchase_code: seed.latest_purchase_code || ''
    });
    
    const oilType = seed.material_name.split(' ')[0];
    if (oilCakeRates[oilType]) {
      setBatchData(prev => ({
        ...prev,
        cake_estimated_rate: oilCakeRates[oilType].cake_rate.toString(),
        sludge_estimated_rate: oilCakeRates[oilType].sludge_rate.toString()
      }));
    }
  };

  const prepareDataForSubmission = () => {
    const cleanedData = { ...batchData };
    
    const numericFields = [
      'seed_quantity_before_drying',
      'seed_quantity_after_drying',
      'oil_yield',
      'cake_yield',
      'sludge_yield',
      'cake_estimated_rate',
      'sludge_estimated_rate'
    ];
    
    numericFields.forEach(field => {
      if (cleanedData[field] === '' || cleanedData[field] === null || cleanedData[field] === undefined) {
        cleanedData[field] = '0';
      }
    });
    
    return cleanedData;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const costs = calculateCosts();
      const cleanedBatchData = prepareDataForSubmission();
      
      const allCostDetails = [
        ...costs.basicCostDetails,
      ];
      
      const payload = {
        ...cleanedBatchData,
        seed_cost_total: costs.seedCost,
        cost_details: allCostDetails,
        estimated_cake_revenue: costs.cakeRevenue,
        estimated_sludge_revenue: costs.sludgeRevenue,
        time_tracking: timeTrackingData ? {
          start_datetime: timeTrackingData.start_datetime,
          end_datetime: timeTrackingData.end_datetime,
          operator_name: timeTrackingData.operator_name,
          notes: timeTrackingData.notes
        } : null
      };
      
      const response = await api.batch.addBatch(payload);
      
      if (response.success) {
        // Save extended costs
        if (costs.extendedCosts.length > 0 && response.batch_id) {
          await api.costManagement.saveBatchCosts({
            batch_id: response.batch_id,
            costs: costs.extendedCosts.map(cost => ({
              element_id: cost.element_id,
              element_name: cost.element_name,
              quantity: cost.quantity || 0,
              rate: cost.rate || 0,
              override_rate: cost.override_rate,
              is_applied: true,
              override_reason: cost.override_rate ? 'Manual adjustment during batch production' : null
            })),
            created_by: 'BatchProduction'
          });
        }
        
        // Save time tracking
        if (timeTrackingData && response.batch_id) {
          await api.costManagement.saveTimeTracking({
            batch_id: response.batch_id,
            process_type: 'crushing',
            start_datetime: timeTrackingData.start_datetime,
            end_datetime: timeTrackingData.end_datetime,
            operator_name: timeTrackingData.operator_name || '',
            notes: timeTrackingData.notes || ''
          });
        }
        
        setMessage(`✅ Batch created successfully!
Batch Code: ${response.batch_code}
Traceable Code: ${response.traceable_code}
Oil Cost: ₹${response.oil_cost_per_kg.toFixed(2)}/kg
Total Oil Produced: ${response.total_oil_produced} kg`);
        
        // Prompt for report generation
        setTimeout(() => {
          if (window.confirm('Batch created successfully! Would you like to view the production report?')) {
            generateBatchReport(response.batch_id, response.batch_code);
          }
        }, 1000);
        
        // Reset form
        setBatchData({
          oil_type: '',
          batch_description: '',
          production_date: new Date().toISOString().split('T')[0],
          material_id: '',
          seed_quantity_before_drying: '',
          seed_quantity_after_drying: '',
          oil_yield: '',
          cake_yield: '',
          sludge_yield: '',
          cake_estimated_rate: '',
          sludge_estimated_rate: '',
          cost_overrides: {},
          seed_purchase_code: '',
          crushing_start: '',
          crushing_end: '',
          crushing_hours: 0
        });
        setSelectedSeed(null);
        setTimeTrackingData(null);
        setDryingCosts([]);
        setCrushingCosts([]);
        setAdditionalCosts([]);
        setCurrentStep(1);
        
        if (showHistory) {
          fetchBatchHistory();
        }
      }
    } catch (error) {
      console.error('Error submitting batch:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const { loss, lossPercent } = calculateDryingLoss();
  const yields = calculateYieldPercentages();
  const costs = calculateCosts();

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB');
  };

  return (
    <div className="batch-production-container">
      <div className="batch-header">
        <h2>Batch Production Module</h2>
        <button
          className="view-history-btn"
          onClick={() => {
            setShowHistory(!showHistory);
            if (!showHistory && batchHistory.length === 0) {
              fetchBatchHistory();
            }
          }}
        >
          {showHistory ? 'Hide History' : 'View History'}
        </button>
      </div>

      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {!showHistory ? (
        <>
          {/* Progress Steps */}
          <div className="progress-steps">
            {['Basic Info', 'Seed & Drying', 'Outputs', 'Cost Review'].map((step, index) => (
              <div
                key={index}
                className={`progress-step ${currentStep === index + 1 ? 'active' : 'inactive'} ${currentStep > index + 1 ? 'clickable' : ''}`}
                onClick={() => currentStep > index + 1 && setCurrentStep(index + 1)}
              >
                {step}
              </div>
            ))}
          </div>

          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="step-content">
              <h3>Batch Identification</h3>
              
              <div className="form-group">
                <label>Production Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={batchData.production_date}
                  onChange={e => setBatchData({ ...batchData, production_date: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label>Batch Description *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., Morning, Premium, Test"
                  value={batchData.batch_description}
                  onChange={e => setBatchData({ ...batchData, batch_description: e.target.value })}
                />
                <small className="batch-code-preview">
                  Batch Code: BATCH-{batchData.production_date.replace(/-/g, '')}-{batchData.batch_description || '[Description]'}
                </small>
              </div>
              
              <div className="form-group">
                <label className="seed-selection-label">Select Seed Material *</label>
                <div className="seed-selection-container">
                  {availableSeeds.length === 0 ? (
                    <div className="seed-selection-empty">
                      <p>No seeds available in inventory</p>
                      <small>Please create a purchase first to add seed inventory</small>
                    </div>
                  ) : (
                    availableSeeds.map(seed => (
                      <div
                        key={seed.material_id}
                        onClick={() => handleSeedSelection(seed)}
                        className={`seed-item ${selectedSeed?.material_id === seed.material_id ? 'selected' : ''}`}
                      >
                        <strong>
                          {seed.material_name}
                          {seed.short_code && <span className="short-code">({seed.short_code})</span>}
                        </strong>
                        <div className="details">
                          Available: {seed.available_quantity} kg @ ₹{seed.weighted_avg_cost.toFixed(2)}/kg
                        </div>
                        {seed.latest_purchase_code && (
                          <div className="purchase-code">
                            Purchase Code: {seed.latest_purchase_code}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              <button
                onClick={() => setCurrentStep(2)}
                disabled={!selectedSeed || !batchData.batch_description}
                className="btn btn-primary"
              >
                Next: Seed & Drying
              </button>
            </div>
          )}

          {/* Step 2: Seed Input & Drying with CostCapture */}
          {currentStep === 2 && (
            <div className="step-content">
              <h3>Seed Input & Drying Process</h3>
              
              {selectedSeed && (
                <div className="selected-seed-info">
                  <strong>Selected Material:</strong> {selectedSeed.material_name}
                  {selectedSeed.short_code && <span className="short-code">({selectedSeed.short_code})</span>}
                  <br />
                  Available: {selectedSeed.available_quantity} kg @ ₹{selectedSeed.weighted_avg_cost.toFixed(2)}/kg
                  {batchData.seed_purchase_code && (
                    <>
                      <br />
                      <span className="purchase-code">
                        Tracing from: {batchData.seed_purchase_code}
                      </span>
                    </>
                  )}
                </div>
              )}
              
              <div className="form-row">
                <div className="form-group">
                  <label>Quantity Before Drying (kg) *</label>
                  <input
                    type="number"
                    className="form-control"
                    value={batchData.seed_quantity_before_drying}
                    onChange={e => setBatchData({ ...batchData, seed_quantity_before_drying: e.target.value })}
                    max={selectedSeed?.available_quantity}
                    step="0.01"
                  />
                </div>
                
                <div className="form-group">
                  <label>Quantity After Drying (kg) *</label>
                  <input
                    type="number"
                    className="form-control"
                    value={batchData.seed_quantity_after_drying}
                    onChange={e => setBatchData({ ...batchData, seed_quantity_after_drying: e.target.value })}
                    max={batchData.seed_quantity_before_drying}
                    step="0.01"
                  />
                </div>
              </div>
              
              {batchData.seed_quantity_before_drying && batchData.seed_quantity_after_drying && (
                <div className="drying-loss-info">
                  <strong>Drying Loss:</strong> {loss.toFixed(2)} kg ({lossPercent.toFixed(2)}%)
                </div>
              )}
              
              {batchData.seed_quantity_before_drying && (
                <CostCapture
                  module="batch"
                  stage="drying"
                  quantity={safeParseFloat(batchData.seed_quantity_before_drying)}
                  onCostsUpdate={(costs) => setDryingCosts(costs)}
                  showSummary={true}
                  allowOverride={true}
                />
              )}
              
              <div className="navigation-buttons">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="btn btn-secondary"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={!batchData.seed_quantity_before_drying || !batchData.seed_quantity_after_drying}
                  className="btn btn-primary"
                >
                  Next: Production Outputs
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Production Outputs with Time Tracking and Crushing Costs */}
          {currentStep === 3 && (
            <div className="step-content">
              <h3>Production Outputs & Time Tracking</h3>
              
              <TimeTracker 
                batchId={null}
                onTimeCalculated={handleTimeTracking}
                showCostBreakdown={true}
              />
              
              <div className="form-group">
                <label>Oil Yield (kg) *</label>
                <div className="yield-input-group">
                  <input
                    type="number"
                    className="form-control"
                    value={batchData.oil_yield}
                    onChange={e => setBatchData({ ...batchData, oil_yield: e.target.value })}
                    step="0.01"
                  />
                  <span className={`yield-percentage ${yields.oilPercent > 50 ? 'high' : 'normal'}`}>
                    {yields.oilPercent.toFixed(2)}%
                  </span>
                </div>
              </div>
              
              <div className="form-group">
                <label>Oil Cake Yield (kg) *</label>
                <div className="yield-input-group">
                  <input
                    type="number"
                    className="form-control"
                    value={batchData.cake_yield}
                    onChange={e => setBatchData({ ...batchData, cake_yield: e.target.value })}
                    step="0.01"
                  />
                  <span className="yield-percentage">
                    {yields.cakePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
              
              <div className="form-group">
                <label>Estimated Oil Cake Rate (₹/kg) *</label>
                <input
                  type="number"
                  className="form-control"
                  value={batchData.cake_estimated_rate}
                  onChange={e => setBatchData({ ...batchData, cake_estimated_rate: e.target.value })}
                  step="0.01"
                />
              </div>
              
              <div className="form-group">
                <label>Sludge Yield (kg) - Optional</label>
                <div className="yield-input-group">
                  <input
                    type="number"
                    className="form-control"
                    value={batchData.sludge_yield}
                    onChange={e => setBatchData({ ...batchData, sludge_yield: e.target.value })}
                    step="0.01"
                  />
                  <span className="yield-percentage">
                    {yields.sludgePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
              
              {batchData.sludge_yield && (
                <div className="form-group">
                  <label>Estimated Sludge Rate (₹/kg)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={batchData.sludge_estimated_rate}
                    onChange={e => setBatchData({ ...batchData, sludge_estimated_rate: e.target.value })}
                    step="0.01"
                  />
                </div>
              )}
              
              {yields.totalPercent > 0 && (
                <div className={`total-yield-info ${
                  yields.totalPercent > 110 ? 'high' : 
                  yields.totalPercent > 105 ? 'warning' : 
                  'good'
                }`}>
                  <strong>Total Yield:</strong> {yields.totalPercent.toFixed(2)}%
                  {yields.totalPercent > 110 && ' (Warning: Unusually high yield - please verify)'}
                  {yields.totalPercent > 100 && yields.totalPercent <= 110 && ' (Includes processing additions)'}
                </div>
              )}
              
              {batchData.oil_yield && timeTrackingData && (
                <div>
                  <h4>Crushing Stage Costs</h4>
                  <CostCapture
                    module="batch"
                    stage="crushing"
                    quantity={safeParseFloat(batchData.seed_quantity_after_drying)}
                    oilYield={safeParseFloat(batchData.oil_yield)}
                    crushingHours={timeTrackingData.rounded_hours || 0}
                    onCostsUpdate={(costs) => setCrushingCosts(costs)}
                    showSummary={true}
                    allowOverride={true}
                  />
                </div>
              )}
              
              <div>
                <h4>Additional Cost Elements</h4>
                <CostCapture
                  module="batch"
                  stage="filtering"
                  quantity={safeParseFloat(batchData.seed_quantity_after_drying)}
                  oilYield={safeParseFloat(batchData.oil_yield)}
                  onCostsUpdate={(costs) => setAdditionalCosts(costs)}
                  showSummary={false}
                  allowOverride={true}
                />
              </div>
              
              <div className="navigation-buttons">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="btn btn-secondary"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentStep(4)}
                  disabled={!batchData.oil_yield || !batchData.cake_yield || !batchData.cake_estimated_rate}
                  className="btn btn-primary"
                >
                  Next: Cost Review
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Complete Cost Review */}
          {currentStep === 4 && costs && (
            <div className="step-content">
              <h3>Complete Cost Review & Summary</h3>
              
              <h4>Basic Production Costs</h4>
              <table className="cost-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="text-center">Unit</th>
                    <th className="text-center">Master Rate</th>
                    <th className="text-center">Override</th>
                    <th className="text-center">Quantity</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{selectedSeed?.material_name}</td>
                    <td className="text-center">kg</td>
                    <td className="text-center">₹{safeParseFloat(selectedSeed?.weighted_avg_cost).toFixed(2)}</td>
                    <td className="text-center">-</td>
                    <td className="text-center">{batchData.seed_quantity_before_drying}</td>
                    <td className="text-right">₹{safeParseFloat(costs.seedCost).toFixed(2)}</td>
                  </tr>
                  
                  {costs.basicCostDetails.map((detail, idx) => (
                    <tr key={idx}>
                      <td>{detail.element_name}</td>
                      <td className="text-center">-</td>
                      <td className="text-center">₹{safeParseFloat(detail.master_rate).toFixed(2)}</td>
                      <td className="text-center">
                        {detail.override_rate !== null && detail.override_rate !== undefined ? (
                          <span className="override-warning">
                            ₹{safeParseFloat(detail.override_rate).toFixed(2)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="text-center">{safeParseFloat(detail.quantity).toFixed(2)}</td>
                      <td className="text-right">₹{safeParseFloat(detail.total_cost).toFixed(2)}</td>
                    </tr>
                  ))}
                  
                  <tr className="subtotal-row">
                    <td colSpan="5">Subtotal Basic Costs</td>
                    <td className="text-right">₹{safeParseFloat(costs.totalBasicCost).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              {costs.extendedCosts.length > 0 && (
                <>
                  <h4>Extended Cost Elements (All Stages)</h4>
                  <table className="extended-cost-table">
                    <thead>
                      <tr>
                        <th>Cost Element</th>
                        <th className="text-center">Stage</th>
                        <th className="text-center">Activity</th>
                        <th className="text-center">Category</th>
                        <th className="text-center">Qty/Hours</th>
                        <th className="text-center">Rate</th>
                        <th className="text-center">Override</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costs.extendedCosts.map((cost, idx) => {
                        const displayRate = cost.override_rate !== null && cost.override_rate !== undefined 
                          ? safeParseFloat(cost.override_rate) 
                          : safeParseFloat(cost.rate);
                        
                        return (
                          <tr key={idx} className={
                            cost.stage === 'drying' ? 'cost-row-drying' : 
                            cost.stage === 'crushing' ? 'cost-row-crushing' :
                            cost.override_rate !== null && cost.override_rate !== undefined ? 'cost-row-override' : 
                            ''
                          }>
                            <td>
                              {cost.element_name}
                              {cost.is_optional && <span className="optional-indicator">(Optional)</span>}
                            </td>
                            <td className="text-center">
                              <span className={`stage-badge ${cost.stage}`}>
                                {cost.stage}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className={`activity-badge ${cost.activity?.toLowerCase()}`}>
                                {cost.activity || 'General'}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className={`category-badge ${cost.category?.toLowerCase()}`}>
                                {cost.category}
                              </span>
                            </td>
                            <td className="text-center">
                              {safeParseFloat(cost.quantity).toFixed(2)}
                              {cost.calculation_method === 'per_hour' && ' hrs'}
                              {cost.calculation_method === 'per_kg' && ' kg'}
                            </td>
                            <td className="text-center">₹{safeParseFloat(cost.rate).toFixed(2)}</td>
                            <td className="text-center">
                              {cost.override_rate !== null && cost.override_rate !== undefined ? (
                                <span className="override-warning">
                                  ₹{safeParseFloat(cost.override_rate).toFixed(2)}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="text-right">₹{safeParseFloat(cost.total_cost).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                      <tr className="subtotal-row">
                        <td colSpan="7">Subtotal Extended Costs</td>
                        <td className="text-right">₹{safeParseFloat(costs.extendedCostTotal).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              <table className="cost-table">
                <tbody>
                  <tr className="total-row">
                    <td colSpan="4">Total Production Cost</td>
                    <td className="text-right">
                      ₹{safeParseFloat(costs.totalProductionCost).toFixed(2)}
                    </td>
                  </tr>
                  
                  <tr className="revenue-row">
                    <td>Less: Oil Cake Revenue</td>
                    <td colSpan="2" className="text-center">
                      {batchData.cake_yield} kg × ₹{batchData.cake_estimated_rate}
                    </td>
                    <td className="text-center">-</td>
                    <td className="text-right">₹{safeParseFloat(costs.cakeRevenue).toFixed(2)}</td>
                  </tr>
                  
                  {batchData.sludge_yield && (
                    <tr className="revenue-row">
                      <td>Less: Sludge Revenue</td>
                      <td colSpan="2" className="text-center">
                        {batchData.sludge_yield} kg × ₹{batchData.sludge_estimated_rate}
                      </td>
                      <td className="text-center">-</td>
                      <td className="text-right">₹{safeParseFloat(costs.sludgeRevenue).toFixed(2)}</td>
                    </tr>
                  )}
                  
                  <tr className="net-oil-row">
                    <td colSpan="4">Net Oil Cost</td>
                    <td className="text-right">₹{safeParseFloat(costs.netOilCost).toFixed(2)}</td>
                  </tr>
                  
                  <tr className="per-kg-row">
                    <td colSpan="4">
                      Cost per kg Oil ({batchData.oil_yield} kg)
                    </td>
                    <td className="text-right">
                      <span className="amount">₹{safeParseFloat(costs.perKgOilCost).toFixed(2)}/kg</span>
                    </td>
                  </tr>
                </tbody>
              </table>

              {costs.extendedCosts.filter(c => c.override_rate !== null && c.override_rate !== undefined).length > 0 && (
                <div className="override-info">
                  <strong>⚠️ Cost Overrides Applied:</strong>
                  <ul>
                    {costs.extendedCosts.filter(c => c.override_rate !== null && c.override_rate !== undefined).map((cost, idx) => (
                      <li key={idx}>
                        {cost.element_name}: ₹{safeParseFloat(cost.rate).toFixed(2)} → ₹{safeParseFloat(cost.override_rate).toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {timeTrackingData && (
                <div className="time-tracking-info">
                  <strong>⏱️ Time Tracking:</strong> {timeTrackingData.actual_hours} hours 
                  (Billed: {timeTrackingData.rounded_hours} hours)
                </div>
              )}
              
              <div className="navigation-buttons">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="btn btn-secondary"
                >
                  Previous
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn btn-success"
                >
                  {loading ? 'Creating Batch...' : 'Complete Batch Production'}
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="history-container">
          <h3>Batch Production History</h3>
          
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Batch Code</th>
                  <th>Traceable Code</th>
                  <th>Oil Type</th>
                  <th className="text-center">Oil Yield</th>
                  <th className="text-center">Yield %</th>
                  <th className="text-right">Cost/kg</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {batchHistory.map((batch) => (
                  <tr key={batch.batch_id}>
                    <td>{formatDate(batch.production_date)}</td>
                    <td>{batch.batch_code}</td>
                    <td className="traceable-code">
                      {batch.traceable_code || '-'}
                    </td>
                    <td>{batch.oil_type}</td>
                    <td className="text-center">
                      {batch.oil_yield} kg
                    </td>
                    <td className="text-center">
                      <span className={`yield-badge ${batch.oil_yield_percent > 40 ? 'high' : 'low'}`}>
                        {batch.oil_yield_percent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-right">
                      ₹{batch.oil_cost_per_kg.toFixed(2)}
                    </td>
                    <td className="text-center">
                      <button 
                        onClick={() => generateBatchReport(batch.batch_id, batch.batch_code)}
                        className="view-costs-btn"
                        disabled={loadingReport}
                      >
                        {loadingReport ? 'Loading...' : '📄 View Report'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReport && reportData && (
        <div className="report-modal-overlay">
          <div className="report-modal">
            <div className="report-modal-header">
              <h2>Batch Production Report</h2>
              <button 
                className="close-btn" 
                onClick={() => {
                  setShowReport(false);
                  setReportData(null);
                }}
              >
                ✕
              </button>
            </div>
            
            <div className="report-modal-content">
              <div className="report-actions">
                <button onClick={handlePrintReport} className="btn-print">
                  🖨️ Print Report
                </button>
              </div>
              
              <div ref={reportRef} className="report-content">
                {/* Report Header */}
                <div className="report-header">
                  <div className="company-name">PUVI OIL MANUFACTURING</div>
                  <div className="report-title">Batch Production Report</div>
                  <div className="traceable-code">
                    Traceable Code: {reportData.traceable_code || reportData.batch_code}
                  </div>
                  <div className="report-date">
                    Generated: {new Date().toLocaleString('en-IN')}
                  </div>
                </div>
                
                {/* Batch Details Section */}
                <div className="section">
                  <div className="section-title">Batch Information</div>
                  <table>
                    <tbody>
                      <tr>
                        <th width="25%">Batch Code</th>
                        <td width="25%">{reportData.batch_code}</td>
                        <th width="25%">Production Date</th>
                        <td width="25%">{reportData.production_date}</td>
                      </tr>
                      <tr>
                        <th>Oil Type</th>
                        <td>{reportData.oil_type}</td>
                        <th>Seed Purchase Code</th>
                        <td className="highlight">{reportData.seed_purchase_code || 'N/A'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* Production Summary Section */}
                <div className="section">
                  <div className="section-title">Production Summary</div>
                  <table>
                    <tbody>
                      <tr>
                        <th>Seed Before Drying</th>
                        <td>{reportData.seed_quantity_before_drying} kg</td>
                        <th>Seed After Drying</th>
                        <td>{reportData.seed_quantity_after_drying} kg</td>
                      </tr>
                      <tr>
                        <th>Oil Yield</th>
                        <td className="highlight">{reportData.oil_yield} kg</td>
                        <th>Oil Cake Yield</th>
                        <td>{reportData.cake_yield} kg</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* Activities & Costs */}
                {reportData.extended_costs && reportData.extended_costs.length > 0 && (
                  <div className="section">
                    <div className="section-title">Production Activities & Costs</div>
                    <table>
                      <thead>
                        <tr>
                          <th>Activity</th>
                          <th>Category</th>
                          <th>Quantity</th>
                          <th>Rate</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.extended_costs.map((cost, idx) => (
                          <tr key={idx}>
                            <td>{cost.element_name}</td>
                            <td>{cost.category}</td>
                            <td>{cost.quantity}</td>
                            <td>₹{cost.rate}</td>
                            <td>₹{cost.total_cost}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Time Tracking */}
                {reportData.time_tracking && reportData.time_tracking.length > 0 && (
                  <div className="section">
                    <div className="section-title">Time Tracking</div>
                    <table>
                      <thead>
                        <tr>
                          <th>Process</th>
                          <th>Start</th>
                          <th>End</th>
                          <th>Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.time_tracking.map((time, idx) => (
                          <tr key={idx}>
                            <td>{time.process_type}</td>
                            <td>{time.start_time}</td>
                            <td>{time.end_time}</td>
                            <td>{time.billed_hours} hrs</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Cost Summary */}
                <div className="section">
                  <div className="section-title">Cost Summary</div>
                  <table>
                    <tbody>
                      <tr>
                        <th>Total Production Cost</th>
                        <td>₹{reportData.total_production_cost}</td>
                      </tr>
                      <tr>
                        <th>Net Oil Cost</th>
                        <td>₹{reportData.net_oil_cost}</td>
                      </tr>
                      <tr className="cost-total highlight">
                        <th>Cost per kg Oil</th>
                        <td>₹{reportData.oil_cost_per_kg}/kg</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* Validation Warnings */}
                {reportData.validation && reportData.validation.warnings && reportData.validation.warnings.length > 0 && (
                  <div className="section">
                    <div className="section-title warning">⚠️ Validation Warnings</div>
                    <ul>
                      {reportData.validation.warnings.map((warning, idx) => (
                        <li key={idx} className="warning">{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Signature Section */}
                <div className="signature-section">
                  <div className="signature-box">
                    <div className="signature-line"></div>
                    <div>Production Supervisor</div>
                  </div>
                  <div className="signature-box">
                    <div className="signature-line"></div>
                    <div>Quality Control</div>
                  </div>
                  <div className="signature-box">
                    <div className="signature-line"></div>
                    <div>Plant Manager</div>
                  </div>
                </div>
                
                {/* Footer */}
                <div className="footer">
                  <p>System-generated report for regulatory compliance</p>
                  <p>Report ID: {reportData.batch_code}-{Date.now()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchProduction;
