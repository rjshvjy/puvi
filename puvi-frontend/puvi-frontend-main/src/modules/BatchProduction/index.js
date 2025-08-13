// File Path: puvi-frontend/puvi-frontend-main/src/modules/BatchProduction/index.js
// BATCH PRODUCTION WITH STEP-BY-STEP COST MANAGEMENT - COMPLETE FIXED VERSION
// Fixed: Seed selection, report display, history, and by-product rates

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
        setBatchHistory(response.batches);
      }
    } catch (error) {
      console.error('Error fetching batch history:', error);
      setMessage('Failed to load batch history');
    }
  };

  // Handle seed selection (Step 1) - FIXED
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

  // Handle cost updates from CostCapture component
  const handleCostsUpdate = (stage, costs) => {
    setStageCosts(prev => ({
      ...prev,
      [stage]: costs
    }));
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
        setMessage(''); // Clear message
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

  // Generate batch report - ENHANCED
  const generateBatchReport = async (batchId, batchCode) => {
    setLoadingReports(prev => ({ ...prev, [batchId]: true }));
    
    try {
      const response = await api.costManagement.getBatchSummary(batchId);
      if (response.success && response.summary) {
        const summary = response.summary;
        
        const transformedData = {
          batch_code: summary.batch_code || batchCode,
          traceable_code: summary.traceable_code || batchCode,
          
          batch_details: {
            batch_code: summary.batch_code || batchCode,
            oil_type: summary.oil_type || 'N/A',
            production_date: summary.production_date || 'N/A',
            seed_purchase_code: summary.seed_purchase_code || batchData.seed_purchase_code || 'N/A',
            traceable_code: summary.traceable_code || batchCode
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
          validation: summary.validation || { has_warnings: false, warning_count: 0, warnings: [] }
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
              color: #495057;
              margin-bottom: 10px;
            }
            .traceable-code {
              font-size: 18px;
              color: #2196F3;
              font-weight: bold;
              margin: 20px auto;
              padding: 12px 24px;
              border: 3px solid #2196F3;
              border-radius: 8px;
              display: inline-block;
              background: #e3f2fd;
              font-family: monospace;
            }
            .report-date {
              font-size: 14px;
              color: #6c757d;
              margin-top: 10px;
            }
            .section {
              margin: 25px 0;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              color: #2c3e50;
              border-bottom: 2px solid #dee2e6;
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
              background: #f5f5f5;
              font-weight: bold;
              color: #2c3e50;
            }
            .highlight {
              background: #fffbf0;
              font-weight: bold;
            }
            .total-row {
              background: #e8f5e9;
              font-weight: bold;
            }
            .signature-section {
              display: flex;
              justify-content: space-around;
              margin-top: 60px;
              padding-top: 30px;
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
            }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  // Submit batch
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateCurrentStep()) {
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      // Calculate seed cost
      const seedCost = parseFloat(batchData.seed_quantity_before_drying) * selectedSeed.weighted_avg_cost;
      
      // Prepare all cost details from all stages
      const allCostDetails = [];
      
      // Add costs from each stage
      Object.entries(stageCosts).forEach(([stage, costs]) => {
        costs.forEach(cost => {
          allCostDetails.push({
            element_name: cost.element_name,
            master_rate: cost.default_rate || cost.rate,
            override_rate: cost.overrideRate || cost.rate,
            quantity: cost.quantity,
            total_cost: cost.total_cost
          });
        });
      });
      
      // Prepare submission data
      const submitData = {
        ...batchData,
        seed_cost_total: seedCost,
        cost_details: allCostDetails,
        time_tracking: timeTrackingData,
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
        
        // Show report
        generateBatchReport(response.batch_id, response.batch_code);
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
            {step === 6 && 'Summary'}
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
            {/* Step 1: Seed Selection - FIXED DISPLAY */}
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
                            style={{
                              display: 'block',
                              padding: '16px',
                              border: selectedSeed?.material_id === seed.material_id ? '3px solid #2f855a' : '2px solid #e2e8f0',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              background: selectedSeed?.material_id === seed.material_id ? 'linear-gradient(135deg, #e6f4ea 0%, #d4f1df 100%)' : '#ffffff',
                              boxShadow: selectedSeed?.material_id === seed.material_id ? '0 4px 12px rgba(47, 133, 90, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div className="seed-name" style={{fontSize: '16px', fontWeight: '600', color: '#2d3748', marginBottom: '8px'}}>
                              {seed.material_name}
                            </div>
                            <div className="seed-details" style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px'}}>
                              <span className="seed-quantity" style={{color: '#718096'}}>
                                Available: {seed.available_quantity} kg
                              </span>
                              <span className="seed-rate" style={{color: '#2f855a', fontWeight: '600'}}>
                                ₹{seed.weighted_avg_cost}/kg
                              </span>
                            </div>
                            {seed.latest_purchase_code && (
                              <div className="seed-code" style={{fontSize: '12px', color: '#718096', fontFamily: 'monospace', background: '#f7fafc', padding: '4px 8px', borderRadius: '4px'}}>
                                Traceable: {seed.latest_purchase_code}
                              </div>
                            )}
                            {selectedSeed?.material_id === seed.material_id && (
                              <div style={{position: 'absolute', top: '10px', right: '10px', background: '#2f855a', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                ✓
                              </div>
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
                        {selectedSeed.latest_purchase_code && (
                          <div style={{marginTop: '5px', fontSize: '12px'}}>
                            Traceable Code: {selectedSeed.latest_purchase_code}
                          </div>
                        )}
                      </div>
                      
                      <div className="form-row" style={{marginTop: '20px'}}>
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
                  <p style={{color: '#6c757d', marginBottom: '20px'}}>
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

            {/* Step 5: Production Output - WITH BY-PRODUCT RATES */}
            {currentStep === 5 && (
              <div className="form-card">
                <h3 className="card-title">Step 5: Production Output</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Oil Yield (kg)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={batchData.oil_yield}
                      onChange={(e) => setBatchData({...batchData, oil_yield: e.target.value})}
                      step="0.01"
                      required
                    />
                    {batchData.oil_yield && (
                      <small className="yield-percent">Yield: {yields.oilPercent.toFixed(2)}%</small>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label>Oil Cake Yield (kg)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={batchData.cake_yield}
                      onChange={(e) => setBatchData({...batchData, cake_yield: e.target.value})}
                      step="0.01"
                      required
                    />
                    {batchData.cake_yield && (
                      <small className="yield-percent">Yield: {yields.cakePercent.toFixed(2)}%</small>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label>Sludge Yield (kg)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={batchData.sludge_yield}
                      onChange={(e) => setBatchData({...batchData, sludge_yield: e.target.value})}
                      step="0.01"
                    />
                    {batchData.sludge_yield && (
                      <small className="yield-percent">Yield: {yields.sludgePercent.toFixed(2)}%</small>
                    )}
                  </div>
                </div>
                
                {batchData.oil_yield && batchData.cake_yield && (
                  <div className="total-yield-info">
                    <strong>Total Output Yield:</strong> {yields.totalPercent.toFixed(2)}%
                    {yields.totalPercent > 100 && (
                      <span className="warning"> ⚠️ Total exceeds 100%</span>
                    )}
                  </div>
                )}
                
                <h4 style={{marginTop: '30px', marginBottom: '15px'}}>By-product Estimated Rates (From Master)</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Oil Cake Rate (₹/kg)</label>
                    <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                      <input
                        type="number"
                        className="form-control"
                        value={batchData.cake_estimated_rate}
                        onChange={(e) => setBatchData({...batchData, cake_estimated_rate: e.target.value})}
                        step="0.01"
                        required
                        placeholder="Override master rate"
                      />
                      <small style={{color: '#6c757d', whiteSpace: 'nowrap'}}>
                        Master: ₹{oilCakeRates[batchData.oil_type?.split(' ')[0]]?.cake_rate || 30}/kg
                      </small>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>Sludge Rate (₹/kg)</label>
                    <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                      <input
                        type="number"
                        className="form-control"
                        value={batchData.sludge_estimated_rate}
                        onChange={(e) => setBatchData({...batchData, sludge_estimated_rate: e.target.value})}
                        step="0.01"
                        placeholder="Override master rate"
                      />
                      <small style={{color: '#6c757d', whiteSpace: 'nowrap'}}>
                        Master: ₹{oilCakeRates[batchData.oil_type?.split(' ')[0]]?.sludge_rate || 10}/kg
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Cost Summary & Submit */}
            {currentStep === 6 && (
              <>
                <div className="form-card cost-summary">
                  <h3 className="card-title">Step 6: Final Cost Summary & Review</h3>
                  
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span>Seed Cost:</span>
                      <strong>₹{(parseFloat(batchData.seed_quantity_before_drying || 0) * (selectedSeed?.weighted_avg_cost || 0)).toFixed(2)}</strong>
                    </div>
                    
                    {stageCosts.drying.length > 0 && (
                      <div className="summary-item">
                        <span>Drying Costs:</span>
                        <strong>₹{stageCosts.drying.reduce((sum, c) => sum + c.total_cost, 0).toFixed(2)}</strong>
                      </div>
                    )}
                    
                    {stageCosts.crushing.length > 0 && (
                      <div className="summary-item">
                        <span>Crushing Costs:</span>
                        <strong>₹{stageCosts.crushing.reduce((sum, c) => sum + c.total_cost, 0).toFixed(2)}</strong>
                      </div>
                    )}
                    
                    {timeTrackingData && (
                      <div className="summary-item">
                        <span>Time-Based Costs:</span>
                        <strong>₹{(timeTrackingData.costs?.total || 0).toFixed(2)}</strong>
                      </div>
                    )}
                    
                    {stageCosts.filtering.length > 0 && (
                      <div className="summary-item">
                        <span>Filtering Costs:</span>
                        <strong>₹{stageCosts.filtering.reduce((sum, c) => sum + c.total_cost, 0).toFixed(2)}</strong>
                      </div>
                    )}
                    
                    <div className="summary-item total">
                      <span>Total Production Cost:</span>
                      <strong>₹{totalCost.toFixed(2)}</strong>
                    </div>
                    
                    {batchData.oil_yield && (
                      <div className="summary-item highlight">
                        <span>Estimated Oil Cost/kg:</span>
                        <strong>₹{(totalCost / parseFloat(batchData.oil_yield)).toFixed(2)}</strong>
                      </div>
                    )}
                  </div>
                  
                  {/* Production Summary */}
                  <div style={{marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '5px'}}>
                    <h4 style={{marginBottom: '10px'}}>Production Summary</h4>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px'}}>
                      <div>Oil Type: <strong>{batchData.oil_type}</strong></div>
                      <div>Production Date: <strong>{batchData.production_date}</strong></div>
                      <div>Seed Used: <strong>{batchData.seed_quantity_before_drying} kg</strong></div>
                      <div>After Drying: <strong>{batchData.seed_quantity_after_drying} kg</strong></div>
                      <div>Oil Yield: <strong>{batchData.oil_yield} kg</strong></div>
                      <div>Cake Yield: <strong>{batchData.cake_yield} kg</strong></div>
                      {timeTrackingData && (
                        <div>Crushing Time: <strong>{timeTrackingData.rounded_hours} hours</strong></div>
                      )}
                      <div style={{gridColumn: 'span 2', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #dee2e6'}}>
                        <div style={{marginBottom: '5px'}}>
                          <span style={{color: '#6c757d'}}>System Traceable Code:</span> 
                          <strong style={{fontFamily: 'monospace', color: '#2196F3', marginLeft: '10px'}}>
                            {reportData?.traceable_code || 'Will be generated on submission'}
                          </strong>
                        </div>
                        {batchData.seed_purchase_code && (
                          <div>
                            <span style={{color: '#6c757d'}}>Source Seed Code:</span> 
                            <strong style={{fontFamily: 'monospace', marginLeft: '10px'}}>{batchData.seed_purchase_code}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Navigation Buttons */}
            <div className="form-actions" style={{display: 'flex', justifyContent: 'space-between', padding: '20px 0'}}>
              <button 
                type="button"
                className="btn-secondary"
                onClick={prevStep}
                disabled={currentStep === 1}
                style={{
                  padding: '10px 20px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentStep === 1 ? 0.5 : 1
                }}
              >
                ← Previous
              </button>
              
              {currentStep < 6 ? (
                <button 
                  type="button"
                  className="btn-primary"
                  onClick={nextStep}
                  style={{
                    padding: '10px 20px',
                    background: '#2f855a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Next →
                </button>
              ) : (
                <button 
                  type="submit" 
                  className="btn-submit"
                  disabled={loading}
                  style={{
                    padding: '10px 30px',
                    background: loading ? '#6c757d' : '#2f855a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {loading ? 'Creating Batch...' : '✓ Create Batch'}
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* History Tab - ENHANCED */}
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
                      <td className="batch-code">{batch.batch_code}</td>
                      <td style={{fontFamily: 'monospace', fontSize: '12px'}}>{batch.traceable_code}</td>
                      <td>{batch.oil_type}</td>
                      <td>{batch.production_date}</td>
                      <td className="text-right">{batch.seed_quantity_after || batch.seed_quantity_after_drying}</td>
                      <td className="text-right">{batch.oil_yield}</td>
                      <td>
                        <span className={`yield-badge ${batch.oil_yield_percent > 30 ? 'high' : 'low'}`}>
                          {batch.oil_yield_percent?.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-right">₹{batch.oil_cost_per_kg?.toFixed(2)}</td>
                      <td className="text-center">
                        <button 
                          onClick={() => generateBatchReport(batch.batch_id, batch.batch_code)}
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

      {/* Report Modal - ENHANCED DISPLAY */}
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
              
              <div ref={reportRef} className="report-content" style={{
                background: 'white',
                padding: '30px',
                maxWidth: '900px',
                margin: '0 auto',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                borderRadius: '8px'
              }}>
 reportData.batch_code}
                  </div>
                  <div className="report-date" style={{fontSize: '14px', color: '#6c757d', marginTop: '10px'}}>
                    Generated: {new Date().toLocaleString('en-IN')}
                  </div>
                </div>
                
                {/* Batch Information */}
                <div className="section" style={{margin: '25px 0'}}>
                  <div className="section-title" style={{fontSize: '18px', fontWeight: 'bold', color: '#2c3e50', borderBottom: '2px solid #dee2e6', paddingBottom: '5px', marginBottom: '15px'}}>
                    Batch Information
                  </div>
                  <table style={{width: '100%', borderCollapse: 'collapse'}}>
                    <tbody>
                      <tr>
                        <th style={{padding: '10px', textAlign: 'left', border: '1px solid #ddd', background: '#f5f5f5', width: '25%'}}>Batch Code</th>
                        <td style={{padding: '10px', border: '1px solid #ddd', width: '25%'}}>{reportData.batch_details?.batch_code}</td>
                        <th style={{padding: '10px', textAlign: 'left', border: '1px solid #ddd', background: '#f5f5f5', width: '25%'}}>Production Date</th>
                        <td style={{padding: '10px', border: '1px solid #ddd', width: '25%'}}>{reportData.batch_details?.production_date}</td>
                      </tr>
                      <tr>
                        <th style={{padding: '10px', textAlign: 'left', border: '1px solid #ddd', background: '#f5f5f5'}}>Oil Type</th>
                        <td style={{padding: '10px', border: '1px solid #ddd'}}>{reportData.batch_details?.oil_type}</td>
                        <th style={{padding: '10px', textAlign: 'left', border: '1px solid #ddd', background: '#f5f5f5'}}>Batch Traceable Code</th>
                        <td style={{padding: '10px', border: '1px solid #ddd', background: '#e3f2fd', fontWeight: 'bold', fontFamily: 'monospace'}}>{reportData.batch_details?.traceable_code || reportData.traceable_code}</td>
                      </tr>
                      <tr>
                        <th style={{padding: '10px', textAlign: 'left', border: '1px solid #ddd', background: '#f5f5f5'}}>Source Seed Code</th>
                        <td colSpan="3" style={{padding: '10px', border: '1px solid #ddd', fontFamily: 'monospace', fontSize: '13px'}}>{reportData.batch_details?.seed_purchase_code}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* Production Summary */}
                <div className="section" style={{margin: '25px 0'}}>
                  <div className="section-title" style={{fontSize: '18px', fontWeight: 'bold', color: '#2c3e50', borderBottom: '2px solid #dee2e6', paddingBottom: '5px', marginBottom: '15px'}}>
                    Production Summary
                  </div>
                  <table style={{width: '100%', borderCollapse: 'collapse'}}>
                    <tbody>
                      <tr>
                        <th style={{padding: '10px', textAlign: 'left', border: '1px solid #ddd', background: '#f5f5f5', width: '25%'}}>Seed Before Drying</th>
                        <td style={{padding: '10px', border: '1px solid #ddd', width: '25%'}}>{reportData.production_summary?.seed_quantity_before_drying} kg</td>
                        <th style={{padding: '10px', textAlign: 'left', border: '1px solid #ddd', background: '#f5f5f5', width: '25%'}}>Seed After Drying</th>
                        <td style={{padding: '10px', border: '1px solid #ddd', width: '25%'}}>{reportData.production_summary?.seed_quantity_after_drying} kg</td>
                      </tr>
                      <tr>
                        <th style={{padding: '10px', textAlign: 'left', border: '1px solid #ddd', background: '#f5f5f5'}}>Drying Loss</th>
                        <td style={{padding: '10px', border: '1px solid #ddd'}}>{reportData.production_summary?.drying_loss_kg} kg ({reportData.production_summary?.drying_loss_percent}%)</td>
                        <th style={{padding: '10px', textAlign: 'left', border: '1px solid #ddd', background: '#f5f5f5'}}>Oil Yield</th>
                        <td style={{padding: '10px', border: '1px solid #ddd', background: '#fffbf0', fontWeight: 'bold'}}>
                          {reportData.production_summary?.oil_yield} kg 
                          ({reportData.production_summary?.oil_yield_percent}%)
                        </td>
                      </tr>
                      <tr>
                        <th style={{padding: '10px', textAlign: 'left', border: '1px solid #ddd', background: '#f5f5f5'}}>Oil Cake Yield</th>
                        <td style={{padding: '10px', border: '1px solid #ddd'}}>{reportData.production_summary?.cake_yield} kg</td>
                        <th style={{padding: '10px', textAlign: 'left', border: '1px solid #ddd', background: '#f5f5f5'}}>Sludge Yield</th>
                        <td style={{padding: '10px', border: '1px solid #ddd'}}>{reportData.production_summary?.sludge_yield} kg</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* Time Tracking */}
                {reportData.time_tracking && reportData.time_tracking.rounded_hours && (
                  <div className="section" style={{margin: '25px 0'}}>
                    <div className="section-title" style={{fontSize: '18px', fontWeight: 'bold', color: '#2c3e50', borderBottom: '2px solid #dee2e6', paddingBottom: '5px', marginBottom: '15px'}}>
                      Time Tracking
                    </div>
                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                      <tbody>
                        <tr>
                          <th style={{padding: '10px', textAlign: 'left', border: '1px solid #ddd', background: '#f5f5f5', width: '25%'}}>Process</th>
                          <td style={{padding: '10px', border: '1px solid #ddd', width: '25%'}}>Crushing</td>
                          <th style={{padding: '10px', textAlign: 'left', border: '1px solid #ddd', background: '#f5f5f5', width: '25%'}}>Duration</th>
                          <td style={{padding: '10px', border: '1px solid #ddd', width: '25%'}}>{reportData.time_tracking.rounded_hours} hours</td>
                        </tr>
                        {reportData.time_tracking.operator_name && (
                          <tr>
                            <th style={{padding: '10px', textAlign: 'left', border: '1px solid #ddd', background: '#f5f5f5'}}>Operator</th>
                            <td colSpan="3" style={{padding: '10px', border: '1px solid #ddd'}}>{reportData.time_tracking.operator_name}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Cost Summary */}
                <div className="section" style={{margin: '25px 0'}}>
                  <div className="section-title" style={{fontSize: '18px', fontWeight: 'bold', color: '#2c3e50', borderBottom: '2px solid #dee2e6', paddingBottom: '5px', marginBottom: '15px'}}>
                    Cost Summary
                  </div>
                  <table style={{width: '100%', borderCollapse: 'collapse'}}>
                    <tbody>
                      <tr>
                        <th style={{padding: '10px', textAlign: 'left', border: '1px solid #ddd', background: '#f5f5f5', width: '40%'}}>Base Production Cost</th>
                        <td style={{padding: '10px', border: '1px solid #ddd', width: '60%'}}>₹{reportData.cost_summary?.base_production_cost?.toFixed(2) || '0.00'}</td>
                      </tr>
                      <tr>
                        <th style={{padding: '10px', textAlign: 'left', border: '1px solid #ddd', background: '#f5f5f5'}}>Extended Costs</th>
                        <td style={{padding: '10px', border: '1px solid #ddd'}}>₹{reportData.cost_summary?.extended_costs?.toFixed(2) || '0.00'}</td>
                      </tr>
                      <tr style={{background: '#e8f5e9'}}>
                        <th style={{padding: '10px', textAlign: 'left', border: '1px solid #ddd', fontWeight: 'bold'}}>Total Production Cost</th>
                        <td style={{padding: '10px', border: '1px solid #ddd', fontWeight: 'bold'}}>₹{reportData.cost_summary?.total_production_cost?.toFixed(2) || '0.00'}</td>
                      </tr>
                      <tr>
                        <th style={{padding: '10px', textAlign: 'left', border: '1px solid #ddd', background: '#f5f5f5'}}>Net Oil Cost</th>
                        <td style={{padding: '10px', border: '1px solid #ddd', background: '#fffbf0', fontWeight: 'bold'}}>₹{reportData.cost_summary?.net_oil_cost?.toFixed(2) || '0.00'}</td>
                      </tr>
                      <tr>
                        <th style={{padding: '10px', textAlign: 'left', border: '1px solid #ddd', background: '#f5f5f5'}}>Cost per kg Oil</th>
                        <td style={{padding: '10px', border: '1px solid #ddd', background: '#fffbf0', fontWeight: 'bold'}}>₹{reportData.cost_summary?.oil_cost_per_kg?.toFixed(2) || '0.00'}/kg</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* Signature Section */}
                <div className="signature-section" style={{display: 'flex', justifyContent: 'space-around', marginTop: '60px', paddingTop: '30px'}}>
                  <div className="signature-box" style={{width: '200px', textAlign: 'center'}}>
                    <div className="signature-line" style={{borderBottom: '1px solid #333', marginBottom: '5px', height: '40px'}}></div>
                    <div style={{fontSize: '14px', color: '#6c757d'}}>Production Operator</div>
                  </div>
                  <div className="signature-box" style={{width: '200px', textAlign: 'center'}}>
                    <div className="signature-line" style={{borderBottom: '1px solid #333', marginBottom: '5px', height: '40px'}}></div>
                    <div style={{fontSize: '14px', color: '#6c757d'}}>Quality Controller</div>
                  </div>
                  <div className="signature-box" style={{width: '200px', textAlign: 'center'}}>
                    <div className="signature-line" style={{borderBottom: '1px solid #333', marginBottom: '5px', height: '40px'}}></div>
                    <div style={{fontSize: '14px', color: '#6c757d'}}>Production Manager</div>
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
