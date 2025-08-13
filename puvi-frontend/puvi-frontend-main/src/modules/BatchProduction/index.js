// File Path: puvi-frontend/puvi-frontend-main/src/modules/BatchProduction/index.js
// BATCH PRODUCTION WITH STEP-BY-STEP COST MANAGEMENT - ALL FIXES APPLIED
// Fixed: Auto-save prevention, cost capture for defaults, date display

import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import CostCapture from '../CostManagement/CostCapture';
import TimeTracker from '../CostManagement/TimeTracker';
import './BatchProduction.css';

const BatchProduction = () => {
  // Step Management
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('new');
  
  // Data States
  const [availableSeeds, setAvailableSeeds] = useState([]);
  const [selectedSeed, setSelectedSeed] = useState(null);
  const [batchHistory, setBatchHistory] = useState([]);
  const [oilCakeRates, setOilCakeRates] = useState({});
  
  // Batch Data
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
    seed_purchase_code: '',
    traceable_code: ''
  });
  
  // Cost Management States
  const [stageCosts, setStageCosts] = useState({
    drying: [],
    crushing: [],
    filtering: [],
    general: []
  });
  
  // Time Tracking State
  const [timeTrackingData, setTimeTrackingData] = useState(null);
  
  // Report States
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [loadingReports, setLoadingReports] = useState({});
  const reportRef = useRef();

  // Load initial data
  useEffect(() => {
    if (activeTab === 'new') {
      fetchAvailableSeeds();
      fetchOilCakeRates();
    } else if (activeTab === 'history') {
      fetchBatchHistory();
    }
  }, [activeTab]);

  const fetchAvailableSeeds = async () => {
    try {
      const response = await api.batch.getSeedsForBatch();
      if (response.success) {
        setAvailableSeeds(response.seeds);
      }
    } catch (error) {
      console.error('Error fetching seeds:', error);
      setMessage('Failed to load available seeds');
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
      const response = await api.batch.getBatchHistory({ limit: 50 });
      if (response.success) {
        // Fix date formatting in batch history
        const formattedBatches = response.batches.map(batch => {
          // Fix date formatting - ensure it's a string
          let displayDate = 'N/A';
          if (batch.production_date) {
            // Convert to string if it's not already
            const dateStr = String(batch.production_date);
            
            // Handle different date formats
            if (dateStr.includes('/')) {
              // Already formatted
              displayDate = dateStr;
            } else if (dateStr.includes('-')) {
              // Format: "2025-08-13" to "13/08/2025"
              const parts = dateStr.split('-');
              if (parts.length === 3) {
                displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
              } else {
                displayDate = dateStr;
              }
            } else {
              displayDate = dateStr;
            }
          }
          
          return {
            ...batch,
            production_date: displayDate,
            batch_code: String(batch.batch_code || '').replace(/ \(Invalid Date\)/g, ''),
            traceable_code: String(batch.traceable_code || batch.batch_code || ''),
            // Ensure all numeric fields are properly converted
            seed_quantity_after: parseFloat(batch.seed_quantity_after || batch.seed_quantity_after_drying || 0),
            seed_quantity_after_drying: parseFloat(batch.seed_quantity_after_drying || batch.seed_quantity_after || 0),
            oil_yield: parseFloat(batch.oil_yield || 0),
            oil_yield_percent: parseFloat(batch.oil_yield_percent || 0),
            oil_cost_per_kg: parseFloat(batch.oil_cost_per_kg || 0)
          };
        });
        setBatchHistory(formattedBatches);
      }
    } catch (error) {
      console.error('Error fetching batch history:', error);
      setMessage('Failed to load batch history');
    }
  };

  // Handle seed selection (Step 1)
  const handleSeedSelection = (seed) => {
    setSelectedSeed(seed);
    const oilType = seed.material_name.replace(' Seeds', ' Oil').replace(' Seed', ' Oil');
    
    // Get default rates for this oil type
    const defaultRates = oilCakeRates[oilType.split(' ')[0]] || { cake_rate: 30, sludge_rate: 10 };
    
    setBatchData({
      ...batchData,
      material_id: seed.material_id,
      oil_type: oilType,
      seed_purchase_code: seed.latest_purchase_code || '',
      cake_estimated_rate: defaultRates.cake_rate.toString(),
      sludge_estimated_rate: defaultRates.sludge_rate.toString()
    });
  };

  // Calculate metrics
  const calculateDryingLoss = () => {
    const before = parseFloat(batchData.seed_quantity_before_drying) || 0;
    const after = parseFloat(batchData.seed_quantity_after_drying) || 0;
    const loss = before - after;
    const lossPercent = before > 0 ? (loss / before) * 100 : 0;
    return { loss, lossPercent };
  };

  const calculateYieldPercentages = () => {
    const seedAfter = parseFloat(batchData.seed_quantity_after_drying) || 0;
    const oilYield = parseFloat(batchData.oil_yield) || 0;
    const cakeYield = parseFloat(batchData.cake_yield) || 0;
    const sludgeYield = parseFloat(batchData.sludge_yield) || 0;
    
    return {
      oilPercent: seedAfter > 0 ? (oilYield / seedAfter) * 100 : 0,
      cakePercent: seedAfter > 0 ? (cakeYield / seedAfter) * 100 : 0,
      sludgePercent: seedAfter > 0 ? (sludgeYield / seedAfter) * 100 : 0,
      totalPercent: seedAfter > 0 ? ((oilYield + cakeYield + sludgeYield) / seedAfter) * 100 : 0
    };
  };

  // Handle cost updates from CostCapture component - FIXED to capture ALL costs
  const handleCostsUpdate = (stage, costs) => {
    // Store all costs passed from CostCapture, including defaults
    setStageCosts(prev => ({
      ...prev,
      [stage]: costs
    }));
    
    // Log to verify all costs are captured
    console.log(`Costs captured for ${stage}:`, costs);
  };

  // Handle time tracking update
  const handleTimeCalculated = (timeData) => {
    setTimeTrackingData(timeData);
  };

  // Navigate between steps
  const goToStep = (step) => {
    if (step < currentStep || completedSteps.includes(currentStep)) {
      setCurrentStep(step);
    }
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      setCompletedSteps(prev => [...prev, currentStep]);
      setCurrentStep(prev => Math.min(prev + 1, 6));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Validate current step before proceeding
  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1: // Seed Selection
        if (!selectedSeed) {
          setMessage('Please select a seed material');
          return false;
        }
        if (!batchData.seed_quantity_before_drying) {
          setMessage('Please enter seed quantity');
          return false;
        }
        setMessage('');
        return true;
      
      case 2: // Drying
        if (!batchData.seed_quantity_after_drying) {
          setMessage('Please enter seed quantity after drying');
          return false;
        }
        if (parseFloat(batchData.seed_quantity_after_drying) > parseFloat(batchData.seed_quantity_before_drying)) {
          setMessage('Seed quantity after drying cannot exceed quantity before drying');
          return false;
        }
        setMessage('');
        return true;
      
      case 3: // Crushing
        if (!timeTrackingData || !timeTrackingData.start_datetime || !timeTrackingData.end_datetime) {
          setMessage('Please enter crushing start and end times');
          return false;
        }
        setMessage('');
        return true;
      
      case 4: // Filtering
        setMessage('');
        return true;
      
      case 5: // Production Output
        if (!batchData.oil_yield || !batchData.cake_yield) {
          setMessage('Please enter oil and cake yields');
          return false;
        }
        if (!batchData.cake_estimated_rate) {
          setMessage('Please enter estimated cake rate');
          return false;
        }
        setMessage('');
        return true;
      
      default:
        return true;
    }
  };

  // Calculate total costs including seed cost
  const calculateTotalCost = () => {
    if (!selectedSeed) return 0;
    
    const seedQty = parseFloat(batchData.seed_quantity_before_drying) || 0;
    const seedCost = seedQty * selectedSeed.weighted_avg_cost;
    
    // Sum up costs from all stages
    let otherCosts = 0;
    Object.values(stageCosts).forEach(stageCostArray => {
      stageCostArray.forEach(cost => {
        otherCosts += cost.total_cost || 0;
      });
    });
    
    return seedCost + otherCosts;
  };

  // Generate complete cost details array for submission - FIXED to ensure all costs are included
  const generateCostDetailsForSubmission = () => {
    const allCostDetails = [];
    
    // Process costs from each stage
    Object.entries(stageCosts).forEach(([stage, costs]) => {
      if (costs && costs.length > 0) {  // Only if costs exist
        costs.forEach(cost => {
          const costDetail = {
            element_name: cost.element_name,
            master_rate: cost.default_rate || cost.rate,
            quantity: cost.quantity || 1,  // Default quantity if missing
            total_cost: cost.total_cost || ((cost.quantity || 1) * (cost.rate || 0))
          };
          
          // Only include override_rate if different
          if (cost.overrideRate !== null && 
              cost.overrideRate !== undefined && 
              cost.overrideRate !== '' && 
              cost.overrideRate !== cost.default_rate) {
            costDetail.override_rate = cost.overrideRate;
          } else {
            costDetail.override_rate = cost.default_rate || cost.rate;
          }
          
          allCostDetails.push(costDetail);
        });
      }
    });
    
    // Log to verify what's being sent
    console.log('Cost details being submitted:', allCostDetails);
    
    return allCostDetails;
  };

  // Generate batch report
  const generateBatchReport = async (batchId, batchCode, traceableCode = null) => {
    setLoadingReports(prev => ({ ...prev, [batchId]: true }));
    
    try {
      const response = await api.costManagement.getBatchSummary(batchId);
      if (response.success && response.summary) {
        const summary = response.summary;
        
        // Use traceable code from: 1) summary, 2) passed parameter, 3) fallback to batch code
        const actualTraceableCode = summary.traceable_code || traceableCode || batchCode;
        
        const transformedData = {
          batch_code: summary.batch_code || batchCode,
          traceable_code: actualTraceableCode,
          
          batch_details: {
            batch_code: summary.batch_code || batchCode,
            oil_type: summary.oil_type || 'N/A',
            production_date: summary.production_date || 'N/A',
            seed_purchase_code: summary.seed_purchase_code || batchData.seed_purchase_code || selectedSeed?.latest_purchase_code || 'N/A',
            traceable_code: actualTraceableCode
          },
          
          production_summary: {
            seed_quantity_before_drying: summary.seed_quantity_before_drying || summary.seed_quantity || 0,
            seed_quantity_after_drying: summary.seed_quantity_after_drying || summary.seed_quantity || 0,
            drying_loss_kg: summary.drying_loss || 0,
            drying_loss_percent: summary.drying_loss_percent || '0.00',
            oil_yield: summary.oil_yield || 0,
            oil_yield_percent: summary.oil_yield_percent || '0.00',
            cake_yield: summary.cake_yield || summary.oil_cake_yield || 0,
            sludge_yield: summary.sludge_yield || 0
          },
          
          cost_summary: {
            total_production_cost: summary.total_production_cost || 0,
            base_production_cost: summary.base_production_cost || 0,
            extended_costs: summary.total_extended_costs || 0,
            net_oil_cost: summary.net_oil_cost || 0,
            oil_cost_per_kg: summary.oil_cost_per_kg || 0
          },
          
          extended_costs: summary.extended_costs || [],
          time_tracking: summary.time_tracking || timeTrackingData,
          validation: summary.validation || { has_warnings: false, warning_count: 0, warnings: [] },
          
          // Add rates for by-product calculations
          cake_rate: summary.cake_estimated_rate || batchData.cake_estimated_rate || 30,
          sludge_rate: summary.sludge_estimated_rate || batchData.sludge_estimated_rate || 10,
          seed_cost_per_kg: selectedSeed?.weighted_avg_cost || 0
        };
        
        setReportData(transformedData);
        setShowReport(true);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      setMessage('Failed to generate batch report');
    } finally {
      setLoadingReports(prev => {
        const newState = { ...prev };
        delete newState[batchId];
        return newState;
      });
    }
  };

  // Print report
  const handlePrintReport = () => {
    const printContent = reportRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=900,height=650');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Batch Report - ${reportData?.batch_code || ''}</title>
          <style>
            body { 
              font-family: 'Times New Roman', Times, serif; 
              padding: 20px;
              color: #333;
              margin: 0;
            }
            .report-header {
              border-bottom: 3px solid #2c3e50;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              text-align: center;
              color: #2c3e50;
              margin-bottom: 10px;
            }
            .report-title {
              font-size: 18px;
              text-align: center;
              margin-bottom: 10px;
            }
            .traceable-code {
              text-align: center;
              font-size: 16px;
              color: #2196F3;
              font-weight: bold;
              margin: 10px 0;
            }
            .report-date {
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            .section {
              margin-bottom: 25px;
              page-break-inside: avoid;
            }
            .section-title {
              background: #f8f9fa;
              padding: 8px 12px;
              font-size: 16px;
              font-weight: bold;
              color: #2c3e50;
              border-left: 4px solid #4CAF50;
              margin-bottom: 15px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            thead {
              background: #e9ecef;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background: #f8f9fa;
              font-weight: bold;
              color: #555;
            }
            .text-right {
              text-align: right;
            }
            .highlight {
              color: #2196F3;
              font-weight: bold;
            }
            .total-row {
              background: #f8f9fa;
              font-weight: bold;
            }
            .total-row td {
              font-weight: bold;
            }
            ul {
              margin: 10px 0;
              padding-left: 25px;
            }
            li {
              margin: 5px 0;
            }
            .signature-section {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
            }
            .signature-box {
              text-align: center;
              width: 30%;
            }
            .signature-line {
              border-bottom: 2px solid #333;
              margin-bottom: 5px;
              height: 40px;
            }
            @media print {
              body { margin: 0; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  // Submit batch - FIXED: Removed auto-save logic
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateCurrentStep()) {
      return;
    }
    
    // Removed auto-save logic - form submit no longer saves automatically
  };
  
  // Save batch after confirmation - Called only by button click
  const saveBatch = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      // Calculate seed cost
      const seedCost = parseFloat(batchData.seed_quantity_before_drying) * selectedSeed.weighted_avg_cost;
      
      // Get all cost details with proper format
      const allCostDetails = generateCostDetailsForSubmission();
      
      // Prepare submission data
      const submitData = {
        ...batchData,
        seed_cost_total: seedCost,
        cost_details: allCostDetails,
        time_tracking: timeTrackingData,
        seed_purchase_code: selectedSeed?.latest_purchase_code || batchData.seed_purchase_code || '',
        created_by: 'Production Operator'
      };
      
      const response = await api.batch.createBatch(submitData);
      
      if (response.success) {
        setMessage(`✅ Batch created successfully! 
          Batch Code: ${response.batch_code}
          Traceable Code: ${response.traceable_code}
          Oil Cost: ₹${response.oil_cost_per_kg?.toFixed(2)}/kg`);
        
        // Save time tracking if available
        if (timeTrackingData && response.batch_id) {
          await api.costManagement.saveTimeTracking({
            ...timeTrackingData,
            batch_id: response.batch_id,
            process_type: 'crushing'
          });
        }
        
        // Reset form
        resetForm();
        
        // Show report with traceable code
        generateBatchReport(response.batch_id, response.batch_code, response.traceable_code);
      } else {
        setMessage(`Error: ${response.error || 'Failed to create batch'}`);
      }
    } catch (error) {
      console.error('Error submitting batch:', error);
      setMessage('Failed to create batch. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setCompletedSteps([]);
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
      seed_purchase_code: '',
      traceable_code: ''
    });
    setSelectedSeed(null);
    setStageCosts({
      drying: [],
      crushing: [],
      filtering: [],
      general: []
    });
    setTimeTrackingData(null);
  };

  const { loss, lossPercent } = calculateDryingLoss();
  const yields = calculateYieldPercentages();
  const totalCost = calculateTotalCost();

  // Step Progress Indicator
  const StepIndicator = () => (
    <div className="step-indicator">
      {[1, 2, 3, 4, 5, 6].map(step => (
        <div
          key={step}
          className={`step ${currentStep === step ? 'active' : ''} ${completedSteps.includes(step) ? 'completed' : ''}`}
          onClick={() => goToStep(step)}
        >
          <div className="step-number">{step}</div>
          <div className="step-label">
            {step === 1 && 'Seed Selection'}
            {step === 2 && 'Drying'}
            {step === 3 && 'Crushing'}
            {step === 4 && 'Filtering'}
            {step === 5 && 'Output'}
            {step === 6 && 'Review & Confirm'}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="batch-production-container">
      {/* Module Header */}
      <div className="module-header">
        <h1>Batch Production</h1>
        <p>Step-by-step oil extraction with cost tracking</p>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'new' ? 'active' : ''}`}
          onClick={() => setActiveTab('new')}
        >
          New Batch
        </button>
        <button 
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Batch History & Reports
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : message.includes('⚠️') ? 'warning' : 'error'}`}>
          {message}
        </div>
      )}

      {/* New Batch Tab with Step Navigation */}
      {activeTab === 'new' && (
        <div className="batch-form-container">
          <StepIndicator />
          
          <form onSubmit={handleSubmit}>
            {/* Step 1: Seed Selection */}
            {currentStep === 1 && (
              <>
                <div className="form-card">
                  <h3 className="card-title">Step 1: Basic Information & Seed Selection</h3>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Production Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={batchData.production_date}
                        onChange={(e) => setBatchData({...batchData, production_date: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Batch Description</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g., Morning Batch"
                        value={batchData.batch_description}
                        onChange={(e) => setBatchData({...batchData, batch_description: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="form-card">
                  <h3 className="card-title">Select Seed Material</h3>
                  
                  <div className="seed-selection-container">
                    {availableSeeds.length === 0 ? (
                      <div className="no-seeds">No seeds available in inventory</div>
                    ) : (
                      <div className="seed-cards-grid">
                        {availableSeeds.map(seed => (
                          <div 
                            key={seed.material_id}
                            className={`seed-card ${selectedSeed?.material_id === seed.material_id ? 'selected' : ''}`}
                            onClick={() => handleSeedSelection(seed)}
                          >
                            <div className="seed-name">
                              {seed.material_name}
                            </div>
                            <div className="seed-details">
                              <span className="seed-quantity">
                                Available: {seed.available_quantity} kg
                              </span>
                              <span className="seed-rate">
                                ₹{seed.weighted_avg_cost}/kg
                              </span>
                            </div>
                            {seed.latest_purchase_code && (
                              <div className="seed-code">
                                Seed Code: {seed.latest_purchase_code}
                              </div>
                            )}
                            {selectedSeed?.material_id === seed.material_id && (
                              <div className="seed-selected-badge">✓</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {selectedSeed && (
                    <>
                      <div className="selected-seed-info">
                        <strong>Selected:</strong> {selectedSeed.material_name} - 
                        {selectedSeed.available_quantity} kg available @ ₹{selectedSeed.weighted_avg_cost}/kg
                      </div>
                      {selectedSeed.latest_purchase_code && (
                        <div className="traceable-code-display">
                          Seed Purchase Traceable Code: {selectedSeed.latest_purchase_code}
                        </div>
                      )}
                      
                      <div className="form-row mt-20">
                        <div className="form-group">
                          <label>Seed Quantity to Process (kg)</label>
                          <input
                            type="number"
                            className="form-control"
                            value={batchData.seed_quantity_before_drying}
                            onChange={(e) => setBatchData({...batchData, seed_quantity_before_drying: e.target.value})}
                            max={selectedSeed?.available_quantity}
                            step="0.01"
                            required
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* Step 2: Drying Process */}
            {currentStep === 2 && (
              <>
                <div className="form-card">
                  <h3 className="card-title">Step 2: Drying Process</h3>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Seed Quantity Before Drying (kg)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={batchData.seed_quantity_before_drying}
                        disabled
                        step="0.01"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Seed Quantity After Drying (kg)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={batchData.seed_quantity_after_drying}
                        onChange={(e) => setBatchData({...batchData, seed_quantity_after_drying: e.target.value})}
                        max={batchData.seed_quantity_before_drying}
                        step="0.01"
                        required
                      />
                    </div>
                  </div>
                  
                  {batchData.seed_quantity_before_drying && batchData.seed_quantity_after_drying && (
                    <div className="drying-loss-info">
                      <strong>Drying Loss:</strong> {loss.toFixed(2)} kg ({lossPercent.toFixed(2)}%)
                    </div>
                  )}
                </div>

                {/* Drying Costs */}
                <CostCapture
                  module="batch"
                  stage="drying"
                  quantity={parseFloat(batchData.seed_quantity_before_drying) || 0}
                  oilYield={0}
                  crushingHours={0}
                  onCostsUpdate={(costs) => handleCostsUpdate('drying', costs)}
                  showSummary={true}
                  allowOverride={true}
                />
              </>
            )}

            {/* Step 3: Crushing Process */}
            {currentStep === 3 && (
              <>
                <div className="form-card">
                  <h3 className="card-title">Step 3: Crushing Process</h3>
                  
                  <TimeTracker
                    batchId={null}
                    onTimeCalculated={handleTimeCalculated}
                    showCostBreakdown={true}
                  />
                </div>

                {/* Crushing Costs */}
                <CostCapture
                  module="batch"
                  stage="crushing"
                  quantity={parseFloat(batchData.seed_quantity_after_drying) || 0}
                  oilYield={0}
                  crushingHours={timeTrackingData?.rounded_hours || 0}
                  onCostsUpdate={(costs) => handleCostsUpdate('crushing', costs)}
                  showSummary={true}
                  allowOverride={true}
                />
              </>
            )}

            {/* Step 4: Filtering Process */}
            {currentStep === 4 && (
              <>
                <div className="form-card">
                  <h3 className="card-title">Step 4: Filtering Process</h3>
                  <p className="step-description">
                    Capture filtering-specific costs for the batch
                  </p>
                </div>

                {/* Filtering Costs */}
                <CostCapture
                  module="batch"
                  stage="filtering"
                  quantity={parseFloat(batchData.seed_quantity_after_drying) || 0}
                  oilYield={parseFloat(batchData.oil_yield) || 0}
                  crushingHours={0}
                  onCostsUpdate={(costs) => handleCostsUpdate('filtering', costs)}
                  showSummary={true}
                  allowOverride={true}
                />
              </>
            )}

            {/* Step 5: Production Output */}
            {currentStep === 5 && (
              <div className="form-card">
                <h3 className="card-title">Step 5: Production Output</h3>
                
                {/* Production Yields Table */}
                <div className="output-table-container">
                  <table className="output-table">
                    <thead>
                      <tr>
                        <th>Output Type</th>
                        <th>Quantity (kg)</th>
                        <th>Yield %</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <label htmlFor="oil-yield">Oil Yield</label>
                        </td>
                        <td>
                          <input
                            id="oil-yield"
                            type="number"
                            className="form-control table-input"
                            value={batchData.oil_yield}
                            onChange={(e) => setBatchData({...batchData, oil_yield: e.target.value})}
                            step="0.01"
                            required
                          />
                        </td>
                        <td className="yield-cell">
                          {batchData.oil_yield ? `${yields.oilPercent.toFixed(2)}%` : '-'}
                        </td>
                        <td>
                          {batchData.oil_yield && (
                            <span className={`status-badge ${yields.oilPercent > 30 ? 'good' : 'low'}`}>
                              {yields.oilPercent > 30 ? 'Good' : 'Low'}
                            </span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <label htmlFor="cake-yield">Oil Cake Yield</label>
                        </td>
                        <td>
                          <input
                            id="cake-yield"
                            type="number"
                            className="form-control table-input"
                            value={batchData.cake_yield}
                            onChange={(e) => setBatchData({...batchData, cake_yield: e.target.value})}
                            step="0.01"
                            required
                          />
                        </td>
                        <td className="yield-cell">
                          {batchData.cake_yield ? `${yields.cakePercent.toFixed(2)}%` : '-'}
                        </td>
                        <td>
                          {batchData.cake_yield && (
                            <span className="status-badge normal">Normal</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <label htmlFor="sludge-yield">Sludge Yield (Optional)</label>
                        </td>
                        <td>
                          <input
                            id="sludge-yield"
                            type="number"
                            className="form-control table-input"
                            value={batchData.sludge_yield}
                            onChange={(e) => setBatchData({...batchData, sludge_yield: e.target.value})}
                            step="0.01"
                          />
                        </td>
                        <td className="yield-cell">
                          {batchData.sludge_yield ? `${yields.sludgePercent.toFixed(2)}%` : '-'}
                        </td>
                        <td>
                          {batchData.sludge_yield && (
                            <span className="status-badge optional">Optional</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="total-row">
                        <td><strong>Total Output</strong></td>
                        <td>
                          <strong>
                            {(parseFloat(batchData.oil_yield || 0) + 
                              parseFloat(batchData.cake_yield || 0) + 
                              parseFloat(batchData.sludge_yield || 0)).toFixed(2)} kg
                          </strong>
                        </td>
                        <td>
                          <strong>{yields.totalPercent.toFixed(2)}%</strong>
                        </td>
                        <td>
                          {yields.totalPercent > 100 && (
                            <span className="status-badge warning">⚠️ >100%</span>
                          )}
                          {yields.totalPercent > 95 && yields.totalPercent <= 100 && (
                            <span className="status-badge good">✓ Optimal</span>
                          )}
                          {yields.totalPercent <= 95 && yields.totalPercent > 0 && (
                            <span className="status-badge normal">Acceptable</span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                
                {/* By-product Rates Table */}
                <div className="byproduct-section">
                  <h4 className="subsection-title">By-product Estimated Rates</h4>
                  <table className="rates-table">
                    <thead>
                      <tr>
                        <th>By-product</th>
                        <th>Master Rate (₹/kg)</th>
                        <th>Override Rate (₹/kg)</th>
                        <th>Estimated Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Oil Cake</td>
                        <td className="rate-cell">
                          ₹{oilCakeRates[batchData.oil_type?.split(' ')[0]]?.cake_rate || 30}/kg
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control table-input"
                            value={batchData.cake_estimated_rate}
                            onChange={(e) => setBatchData({...batchData, cake_estimated_rate: e.target.value})}
                            step="0.01"
                            required
                            placeholder="Enter rate"
                          />
                        </td>
                        <td className="value-cell">
                          ₹{(parseFloat(batchData.cake_yield || 0) * 
                             parseFloat(batchData.cake_estimated_rate || 0)).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td>Sludge</td>
                        <td className="rate-cell">
                          ₹{oilCakeRates[batchData.oil_type?.split(' ')[0]]?.sludge_rate || 10}/kg
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control table-input"
                            value={batchData.sludge_estimated_rate}
                            onChange={(e) => setBatchData({...batchData, sludge_estimated_rate: e.target.value})}
                            step="0.01"
                            placeholder="Enter rate"
                          />
                        </td>
                        <td className="value-cell">
                          ₹{(parseFloat(batchData.sludge_yield || 0) * 
                             parseFloat(batchData.sludge_estimated_rate || 0)).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="total-row">
                        <td colSpan="3"><strong>Total By-product Value</strong></td>
                        <td className="value-cell">
                          <strong>
                            ₹{((parseFloat(batchData.cake_yield || 0) * parseFloat(batchData.cake_estimated_rate || 0)) +
                               (parseFloat(batchData.sludge_yield || 0) * parseFloat(batchData.sludge_estimated_rate || 0))).toFixed(2)}
                          </strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Step 6: Complete Cost Review & Confirmation (IN-PAGE, NOT POPUP) */}
            {currentStep === 6 && (
              <>
                <div className="form-card confirmation-section">
                  <h3 className="card-title">Step 6: Final Review & Confirmation</h3>
                  
                  {/* Traceability Information */}
                  <div className="traceable-info-box">
                    <h4>🔗 Traceability Chain</h4>
                    <div className="traceable-chain">
                      <div className="chain-item">
                        <span className="chain-label">Source Seed Code:</span>
                        <span className="chain-value">{batchData.seed_purchase_code || selectedSeed?.latest_purchase_code || 'N/A'}</span>
                      </div>
                      <div className="chain-arrow">→</div>
                      <div className="chain-item">
                        <span className="chain-label">Batch Traceable Code:</span>
                        <span className="chain-value highlight">Will be generated on submission</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Production Summary */}
                  <div className="production-summary-section">
                    <h4>📊 Production Summary</h4>
                    <table className="summary-table">
                      <tbody>
                        <tr>
                          <td className="label">Oil Type:</td>
                          <td className="value">{batchData.oil_type}</td>
                          <td className="label">Production Date:</td>
                          <td className="value">{batchData.production_date}</td>
                        </tr>
                        <tr>
                          <td className="label">Batch Description:</td>
                          <td className="value" colSpan="3">{batchData.batch_description}</td>
                        </tr>
                        <tr>
                          <td className="label">Seed Used:</td>
                          <td className="value">{batchData.seed_quantity_before_drying} kg</td>
                          <td className="label">After Drying:</td>
                          <td className="value">{batchData.seed_quantity_after_drying} kg</td>
                        </tr>
                        <tr>
                          <td className="label">Oil Yield:</td>
                          <td className="value highlight">{batchData.oil_yield} kg ({yields.oilPercent.toFixed(2)}%)</td>
                          <td className="label">Cake Yield:</td>
                          <td className="value">{batchData.cake_yield} kg</td>
                        </tr>
                        {timeTrackingData && (
                          <tr>
                            <td className="label">Crushing Time:</td>
                            <td className="value">{timeTrackingData.rounded_hours} hours</td>
                            <td className="label">Operator:</td>
                            <td className="value">{timeTrackingData.operator_name || 'Not specified'}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Complete Cost Breakdown Table */}
                  <div className="cost-breakdown-section">
                    <h4>💰 Complete Cost Breakdown</h4>
                    <table className="cost-breakdown-table">
                      <thead>
                        <tr>
                          <th>Stage</th>
                          <th>Cost Element</th>
                          <th>Quantity</th>
                          <th>Master Rate</th>
                          <th>Applied Rate</th>
                          <th>Total Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Seed Cost */}
                        <tr className="stage-header">
                          <td colSpan="6"><strong>Material Cost</strong></td>
                        </tr>
                        <tr>
                          <td>Seeds</td>
                          <td>{selectedSeed?.material_name || 'Seeds'}</td>
                          <td>{batchData.seed_quantity_before_drying} kg</td>
                          <td>₹{selectedSeed?.weighted_avg_cost || 0}/kg</td>
                          <td>₹{selectedSeed?.weighted_avg_cost || 0}/kg</td>
                          <td className="amount-cell">
                            ₹{(parseFloat(batchData.seed_quantity_before_drying || 0) * (selectedSeed?.weighted_avg_cost || 0)).toFixed(2)}
                          </td>
                        </tr>
                        
                        {/* Drying Costs */}
                        {stageCosts.drying.length > 0 && (
                          <>
                            <tr className="stage-header">
                              <td colSpan="6"><strong>Drying Stage</strong></td>
                            </tr>
                            {stageCosts.drying.map((cost, index) => (
                              <tr key={`drying-${index}`}>
                                <td>Drying</td>
                                <td>{cost.element_name}</td>
                                <td>{cost.quantity} {cost.unit || 'units'}</td>
                                <td>₹{cost.default_rate || cost.rate}</td>
                                <td>
                                  {cost.overrideRate && cost.overrideRate !== cost.default_rate ? (
                                    <span className="override-rate">₹{cost.overrideRate}</span>
                                  ) : (
                                    `₹${cost.rate || cost.default_rate}`
                                  )}
                                </td>
                                <td className="amount-cell">₹{cost.total_cost.toFixed(2)}</td>
                              </tr>
                            ))}
                          </>
                        )}
                        
                        {/* Crushing Costs */}
                        {stageCosts.crushing.length > 0 && (
                          <>
                            <tr className="stage-header">
                              <td colSpan="6"><strong>Crushing Stage</strong></td>
                            </tr>
                            {stageCosts.crushing.map((cost, index) => (
                              <tr key={`crushing-${index}`}>
                                <td>Crushing</td>
                                <td>{cost.element_name}</td>
                                <td>{cost.quantity} {cost.unit || 'units'}</td>
                                <td>₹{cost.default_rate || cost.rate}</td>
                                <td>
                                  {cost.overrideRate && cost.overrideRate !== cost.default_rate ? (
                                    <span className="override-rate">₹{cost.overrideRate}</span>
                                  ) : (
                                    `₹${cost.rate || cost.default_rate}`
                                  )}
                                </td>
                                <td className="amount-cell">₹{cost.total_cost.toFixed(2)}</td>
                              </tr>
                            ))}
                          </>
                        )}
                        
                        {/* Time-based Costs */}
                        {timeTrackingData && timeTrackingData.costs?.breakdown && (
                          <>
                            <tr className="stage-header">
                              <td colSpan="6"><strong>Time-based Costs</strong></td>
                            </tr>
                            <tr>
                              <td>Time</td>
                              <td>Crushing Time Cost</td>
                              <td>{timeTrackingData.rounded_hours} hours</td>
                              <td>-</td>
                              <td>-</td>
                              <td className="amount-cell">₹{(timeTrackingData.costs?.total || 0).toFixed(2)}</td>
                            </tr>
                          </>
                        )}
                        
                        {/* Filtering Costs */}
                        {stageCosts.filtering.length > 0 && (
                          <>
                            <tr className="stage-header">
                              <td colSpan="6"><strong>Filtering Stage</strong></td>
                            </tr>
                            {stageCosts.filtering.map((cost, index) => (
                              <tr key={`filtering-${index}`}>
                                <td>Filtering</td>
                                <td>{cost.element_name}</td>
                                <td>{cost.quantity} {cost.unit || 'units'}</td>
                                <td>₹{cost.default_rate || cost.rate}</td>
                                <td>
                                  {cost.overrideRate && cost.overrideRate !== cost.default_rate ? (
                                    <span className="override-rate">₹{cost.overrideRate}</span>
                                  ) : (
                                    `₹${cost.rate || cost.default_rate}`
                                  )}
                                </td>
                                <td className="amount-cell">₹{cost.total_cost.toFixed(2)}</td>
                              </tr>
                            ))}
                          </>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="total-row">
                          <td colSpan="5"><strong>Total Production Cost</strong></td>
                          <td className="amount-cell"><strong>₹{totalCost.toFixed(2)}</strong></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  
                  {/* By-product Value Offset */}
                  {(batchData.cake_yield || batchData.sludge_yield) && (
                    <div className="byproduct-offset-section">
                      <h4>📦 By-product Value Offset</h4>
                      <table className="offset-table">
                        <tbody>
                          <tr>
                            <td className="label">Estimated Cake Value:</td>
                            <td className="value">
                              ₹{(parseFloat(batchData.cake_yield || 0) * parseFloat(batchData.cake_estimated_rate || 0)).toFixed(2)}
                            </td>
                          </tr>
                          {batchData.sludge_yield && (
                            <tr>
                              <td className="label">Estimated Sludge Value:</td>
                              <td className="value">
                                ₹{(parseFloat(batchData.sludge_yield || 0) * parseFloat(batchData.sludge_estimated_rate || 0)).toFixed(2)}
                              </td>
                            </tr>
                          )}
                          <tr className="total-row">
                            <td className="label"><strong>Net Oil Cost (after by-products):</strong></td>
                            <td className="value">
                              <strong>₹{(
                                totalCost - 
                                (parseFloat(batchData.cake_yield || 0) * parseFloat(batchData.cake_estimated_rate || 0)) -
                                (parseFloat(batchData.sludge_yield || 0) * parseFloat(batchData.sludge_estimated_rate || 0))
                              ).toFixed(2)}</strong>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  {/* Final Cost Per KG */}
                  {batchData.oil_yield && (
                    <div className="final-cost-section">
                      <div className="final-cost-box">
                        <span className="final-cost-label">FINAL OIL COST PER KG:</span>
                        <span className="final-cost-value">
                          ₹{(
                            (totalCost - 
                             (parseFloat(batchData.cake_yield || 0) * parseFloat(batchData.cake_estimated_rate || 0)) -
                             (parseFloat(batchData.sludge_yield || 0) * parseFloat(batchData.sludge_estimated_rate || 0))
                            ) / parseFloat(batchData.oil_yield)
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Action Summary */}
                  <div className="action-summary">
                    <h4>⚠️ This action will:</h4>
                    <ul>
                      <li>Save the batch production record permanently</li>
                      <li>Deduct {batchData.seed_quantity_before_drying} kg from seed inventory</li>
                      <li>Add {batchData.oil_yield} kg to oil inventory</li>
                      <li>Add {batchData.cake_yield} kg to cake inventory</li>
                      <li>Generate a unique traceable code for this batch</li>
                      <li>Record all cost elements for cost analysis</li>
                    </ul>
                  </div>
                </div>
              </>
            )}

            {/* Navigation Buttons - FIXED button type and handler for Step 6 */}
            <div className="form-actions">
              <button 
                type="button"
                className="btn-secondary"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                ← Previous
              </button>
              
              {currentStep < 6 ? (
                <button 
                  type="button"
                  className="btn-primary"
                  onClick={nextStep}
                >
                  Next →
                </button>
              ) : (
                <button 
                  type="button"  // Changed from "submit" to "button"
                  className="btn-submit btn-confirm-save"
                  onClick={saveBatch}  // Direct onClick handler
                  disabled={loading}
                >
                  {loading ? 'Saving Batch...' : '✅ Confirm & Save Batch'}
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="history-container">
          <div className="history-header">
            <h3>Batch History & Reports</h3>
            <button 
              className="btn-refresh"
              onClick={fetchBatchHistory}
            >
              🔄 Refresh
            </button>
          </div>
          
          <div className="table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Batch Code</th>
                  <th>Traceable Code</th>
                  <th>Oil Type</th>
                  <th>Production Date</th>
                  <th>Seed Used (kg)</th>
                  <th>Oil Yield (kg)</th>
                  <th>Yield %</th>
                  <th>Cost/kg</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {batchHistory.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center">No batches found</td>
                  </tr>
                ) : (
                  batchHistory.map((batch) => (
                    <tr key={batch.batch_id}>
                      <td className="batch-code">{String(batch.batch_code || '')}</td>
                      <td className="traceable-code-cell">{String(batch.traceable_code || '')}</td>
                      <td>{String(batch.oil_type || '')}</td>
                      <td>{String(batch.production_date || 'N/A')}</td>
                      <td className="text-right">{Number(batch.seed_quantity_after || batch.seed_quantity_after_drying || 0).toFixed(2)}</td>
                      <td className="text-right">{Number(batch.oil_yield || 0).toFixed(2)}</td>
                      <td>
                        <span className={`yield-badge ${batch.oil_yield_percent > 30 ? 'high' : 'low'}`}>
                          {Number(batch.oil_yield_percent || 0).toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-right">₹{Number(batch.oil_cost_per_kg || 0).toFixed(2)}</td>
                      <td className="text-center">
                        <button 
                          onClick={() => generateBatchReport(batch.batch_id, batch.batch_code, batch.traceable_code)}
                          className="btn-view-report"
                          disabled={loadingReports[batch.batch_id]}
                        >
                          {loadingReports[batch.batch_id] ? 'Loading...' : '📄 View Report'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
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
                  <div className="traceable-code primary">
                    Traceable Code: {reportData.traceable_code || reportData.batch_code}
                  </div>
                  <div className="report-date">
                    Generated: {new Date().toLocaleString('en-IN')}
                  </div>
                </div>
                
                {/* Batch Information */}
                <div className="section">
                  <div className="section-title">Batch Information</div>
                  <table>
                    <tbody>
                      <tr>
                        <th>Batch Code</th>
                        <td>{reportData.batch_details?.batch_code}</td>
                        <th>Production Date</th>
                        <td>{reportData.batch_details?.production_date}</td>
                      </tr>
                      <tr>
                        <th>Oil Type</th>
                        <td>{reportData.batch_details?.oil_type}</td>
                        <th>Batch Traceable Code</th>
                        <td className="traceable-highlight">{reportData.batch_details?.traceable_code || reportData.traceable_code}</td>
                      </tr>
                      <tr>
                        <th>Source Seed Code</th>
                        <td colSpan="3" className="source-highlight">{reportData.batch_details?.seed_purchase_code}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* Production Summary */}
                <div className="section">
                  <div className="section-title">Production Summary</div>
                  <table>
                    <tbody>
                      <tr>
                        <th>Seed Before Drying</th>
                        <td>{reportData.production_summary?.seed_quantity_before_drying} kg</td>
                        <th>Seed After Drying</th>
                        <td>{reportData.production_summary?.seed_quantity_after_drying} kg</td>
                      </tr>
                      <tr>
                        <th>Drying Loss</th>
                        <td>{reportData.production_summary?.drying_loss_kg} kg ({reportData.production_summary?.drying_loss_percent}%)</td>
                        <th>Oil Yield</th>
                        <td className="highlight">
                          {reportData.production_summary?.oil_yield} kg 
                          ({reportData.production_summary?.oil_yield_percent}%)
                        </td>
                      </tr>
                      <tr>
                        <th>Oil Cake Yield</th>
                        <td>{reportData.production_summary?.cake_yield} kg</td>
                        <th>Sludge Yield</th>
                        <td>{reportData.production_summary?.sludge_yield} kg</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* Time Tracking */}
                {reportData.time_tracking && reportData.time_tracking.rounded_hours && (
                  <div className="section">
                    <div className="section-title">Time Tracking</div>
                    <table>
                      <tbody>
                        <tr>
                          <th>Process</th>
                          <td>Crushing</td>
                          <th>Duration</th>
                          <td>{reportData.time_tracking.rounded_hours} hours</td>
                        </tr>
                        {reportData.time_tracking.operator_name && (
                          <tr>
                            <th>Operator</th>
                            <td colSpan="3">{reportData.time_tracking.operator_name}</td>
                          </tr>
                        )}
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
                        <th>Base Production Cost</th>
                        <td>₹{reportData.cost_summary?.base_production_cost?.toFixed(2) || '0.00'}</td>
                      </tr>
                      <tr>
                        <th>Extended Costs</th>
                        <td>₹{reportData.cost_summary?.extended_costs?.toFixed(2) || '0.00'}</td>
                      </tr>
                      <tr className="total-row">
                        <th>Total Production Cost</th>
                        <td>₹{reportData.cost_summary?.total_production_cost?.toFixed(2) || '0.00'}</td>
                      </tr>
                      <tr>
                        <th>Net Oil Cost</th>
                        <td className="highlight">₹{reportData.cost_summary?.net_oil_cost?.toFixed(2) || '0.00'}</td>
                      </tr>
                      <tr>
                        <th>Cost per kg Oil</th>
                        <td className="highlight">₹{reportData.cost_summary?.oil_cost_per_kg?.toFixed(2) || '0.00'}/kg</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* Detailed Cost Breakdown */}
                <div className="section">
                  <div className="section-title">Detailed Cost Breakdown</div>
                  <table>
                    <thead>
                      <tr>
                        <th>Cost Element</th>
                        <th>Category</th>
                        <th>Quantity</th>
                        <th>Rate</th>
                        <th>Total Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Seed Cost */}
                      <tr>
                        <td><strong>Seed Material</strong></td>
                        <td>Raw Material</td>
                        <td>{reportData.production_summary?.seed_quantity_before_drying || 0} kg</td>
                        <td>-</td>
                        <td className="text-right">
                          ₹{((reportData.production_summary?.seed_quantity_before_drying || 0) * 
                             (reportData.seed_cost_per_kg || selectedSeed?.weighted_avg_cost || 0)).toFixed(2)}
                        </td>
                      </tr>
                      
                      {/* Extended Costs from backend */}
                      {reportData.extended_costs && reportData.extended_costs.map((cost, index) => (
                        <tr key={`cost-${index}`}>
                          <td>{cost.element_name}</td>
                          <td>{cost.category || cost.activity || 'General'}</td>
                          <td>{cost.quantity || 1} {cost.unit || 'units'}</td>
                          <td>₹{cost.rate || 0}</td>
                          <td className="text-right">₹{(cost.total_cost || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                      
                      {/* Time Tracking Costs if available */}
                      {reportData.time_tracking && reportData.time_tracking.costs && (
                        <tr>
                          <td>Time-based Costs</td>
                          <td>Labor</td>
                          <td>{reportData.time_tracking.rounded_hours || 0} hours</td>
                          <td>-</td>
                          <td className="text-right">₹{(reportData.time_tracking.costs.total || 0).toFixed(2)}</td>
                        </tr>
                      )}
                      
                      <tr className="total-row">
                        <td colSpan="4"><strong>Total Production Cost</strong></td>
                        <td className="text-right">
                          <strong>₹{reportData.cost_summary?.total_production_cost?.toFixed(2) || '0.00'}</strong>
                        </td>
                      </tr>
                      
                      {/* By-product Value Deduction */}
                      <tr>
                        <td colSpan="4">Less: Oil Cake Value (@₹{reportData.cake_rate || 30}/kg)</td>
                        <td className="text-right">
                          -₹{((reportData.production_summary?.cake_yield || 0) * (reportData.cake_rate || 30)).toFixed(2)}
                        </td>
                      </tr>
                      {reportData.production_summary?.sludge_yield > 0 && (
                        <tr>
                          <td colSpan="4">Less: Sludge Value (@₹{reportData.sludge_rate || 10}/kg)</td>
                          <td className="text-right">
                            -₹{((reportData.production_summary?.sludge_yield || 0) * (reportData.sludge_rate || 10)).toFixed(2)}
                          </td>
                        </tr>
                      )}
                      
                      <tr className="total-row">
                        <td colSpan="4"><strong>Net Oil Cost</strong></td>
                        <td className="text-right">
                          <strong>₹{reportData.cost_summary?.net_oil_cost?.toFixed(2) || '0.00'}</strong>
                        </td>
                      </tr>
                      
                      <tr className="highlight">
                        <td colSpan="4">
                          <strong>Oil Cost per KG</strong> 
                          (Net Cost ÷ {reportData.production_summary?.oil_yield || 0} kg oil)
                        </td>
                        <td className="text-right">
                          <strong>₹{reportData.cost_summary?.oil_cost_per_kg?.toFixed(2) || '0.00'}/kg</strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* Validation Warnings if any */}
                {reportData.validation && reportData.validation.has_warnings && (
                  <div className="section">
                    <div className="section-title">Cost Validation Notes</div>
                    <ul>
                      {reportData.validation.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Signature Section */}
                <div className="signature-section">
                  <div className="signature-box">
                    <div className="signature-line"></div>
                    <div>Production Operator</div>
                  </div>
                  <div className="signature-box">
                    <div className="signature-line"></div>
                    <div>Quality Controller</div>
                  </div>
                  <div className="signature-box">
                    <div className="signature-line"></div>
                    <div>Production Manager</div>
                  </div>
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
