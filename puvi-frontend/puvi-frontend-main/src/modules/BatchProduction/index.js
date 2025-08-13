// File Path: puvi-frontend/puvi-frontend-main/src/modules/BatchProduction/index.js
// Complete Batch Production Module with Fixed Individual Report Loading
// Version: 2.1 - Fixed per-batch report loading states

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
  
  // Report states - FIXED: Track loading per batch ID
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [loadingReports, setLoadingReports] = useState({}); // Changed from single state to object
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

  // FIXED: Generate comprehensive batch report with individual loading state
  const generateBatchReport = async (batchId, batchCode) => {
    // Set loading state for this specific batch
    setLoadingReports(prev => ({ ...prev, [batchId]: true }));
    
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
      // Clear loading state for this specific batch
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
              margin-bottom: 20px;
            }
            table th, table td {
              padding: 8px 12px;
              text-align: left;
              border: 1px solid #ddd;
            }
            table th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            .highlight {
              background-color: #fffbf0;
              font-weight: bold;
            }
            .summary-box {
              background-color: #f0f8ff;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 2px solid #e0e0e0;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            @media print {
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  const handleSeedSelection = (e) => {
    const seedId = e.target.value;
    const seed = availableSeeds.find(s => s.material_id === parseInt(seedId));
    
    if (seed) {
      setSelectedSeed(seed);
      setBatchData({
        ...batchData,
        material_id: seedId,
        oil_type: seed.material_name.replace(' Seed', ' Oil').replace(' Seeds', ' Oil'),
        seed_purchase_code: seed.latest_purchase_code
      });
      
      // Set default cake rate if available
      const oilType = seed.material_name.replace(' Seed', '').replace(' Seeds', '');
      if (oilCakeRates[oilType]) {
        setBatchData(prev => ({
          ...prev,
          cake_estimated_rate: oilCakeRates[oilType].current_rate
        }));
      }
    }
  };

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

  const calculateCosts = () => {
    if (!selectedSeed) return { seedCost: 0, extendedCosts: [], totalCost: 0 };
    
    const seedQty = parseFloat(batchData.seed_quantity_before_drying) || 0;
    const seedCost = seedQty * selectedSeed.weighted_avg_cost;
    
    // Calculate extended costs from all stages
    const allCosts = [...dryingCosts, ...crushingCosts, ...additionalCosts];
    const extendedCostsTotal = allCosts.reduce((sum, cost) => {
      const qty = parseFloat(cost.quantity) || 0;
      const rate = parseFloat(cost.override_rate || cost.rate || cost.default_rate) || 0;
      return sum + (qty * rate);
    }, 0);
    
    return {
      seedCost,
      extendedCosts: allCosts,
      extendedCostsTotal,
      totalCost: seedCost + extendedCostsTotal
    };
  };

  const handleSubmit = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const costs = calculateCosts();
      
      // Prepare batch data
      const payload = {
        ...batchData,
        material_id: parseInt(batchData.material_id),
        seed_quantity_before_drying: parseFloat(batchData.seed_quantity_before_drying),
        seed_quantity_after_drying: parseFloat(batchData.seed_quantity_after_drying),
        oil_yield: parseFloat(batchData.oil_yield),
        cake_yield: parseFloat(batchData.cake_yield),
        sludge_yield: parseFloat(batchData.sludge_yield) || 0,
        cake_estimated_rate: parseFloat(batchData.cake_estimated_rate) || 0,
        sludge_estimated_rate: parseFloat(batchData.sludge_estimated_rate) || 0,
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
                className={`progress-step ${currentStep === index + 1 ? 'active' : ''} ${currentStep > index + 1 ? 'completed' : ''}`}
              >
                <span className="step-number">{index + 1}</span>
                <span className="step-label">{step}</span>
              </div>
            ))}
          </div>

          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="form-section">
              <h3>Step 1: Basic Information</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Production Date</label>
                  <input
                    type="date"
                    value={batchData.production_date}
                    onChange={(e) => setBatchData({...batchData, production_date: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label>Batch Description</label>
                  <input
                    type="text"
                    placeholder="e.g., Morning Batch"
                    value={batchData.batch_description}
                    onChange={(e) => setBatchData({...batchData, batch_description: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Select Seed Material</label>
                <select
                  value={batchData.material_id}
                  onChange={handleSeedSelection}
                  className="seed-select"
                >
                  <option value="">-- Select Seed --</option>
                  {availableSeeds.map(seed => (
                    <option key={seed.material_id} value={seed.material_id}>
                      {seed.material_name} - {seed.available_quantity} kg @ ₹{seed.weighted_avg_cost}/kg
                      {seed.latest_purchase_code && ` (${seed.latest_purchase_code})`}
                    </option>
                  ))}
                </select>
              </div>

              {selectedSeed && (
                <div className="seed-info-box">
                  <h4>Selected Seed Information</h4>
                  <div className="info-grid">
                    <div>Material: {selectedSeed.material_name}</div>
                    <div>Available: {selectedSeed.available_quantity} kg</div>
                    <div>Rate: ₹{selectedSeed.weighted_avg_cost}/kg</div>
                    <div>Purchase Code: {selectedSeed.latest_purchase_code}</div>
                  </div>
                </div>
              )}

              <div className="form-navigation">
                <button 
                  className="btn-next"
                  onClick={() => setCurrentStep(2)}
                  disabled={!batchData.material_id}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Seed & Drying */}
          {currentStep === 2 && (
            <div className="form-section">
              <h3>Step 2: Seed Quantities & Drying</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Seed Quantity Before Drying (kg)</label>
                  <input
                    type="number"
                    value={batchData.seed_quantity_before_drying}
                    onChange={(e) => setBatchData({...batchData, seed_quantity_before_drying: e.target.value})}
                    max={selectedSeed?.available_quantity}
                  />
                </div>
                
                <div className="form-group">
                  <label>Seed Quantity After Drying (kg)</label>
                  <input
                    type="number"
                    value={batchData.seed_quantity_after_drying}
                    onChange={(e) => setBatchData({...batchData, seed_quantity_after_drying: e.target.value})}
                  />
                </div>
              </div>

              {batchData.seed_quantity_before_drying && batchData.seed_quantity_after_drying && (
                <div className="calculation-box">
                  <h4>Drying Loss Calculation</h4>
                  <div className="calc-row">
                    <span>Loss: {loss.toFixed(2)} kg ({lossPercent.toFixed(2)}%)</span>
                  </div>
                </div>
              )}

              {/* Drying Costs */}
              <div className="cost-capture-section">
                <h4>Drying Costs</h4>
                <CostCapture
                  costElements={extendedCostElements.filter(e => e.activity === 'Drying')}
                  capturedCosts={dryingCosts}
                  onCostsChange={setDryingCosts}
                  stage="drying"
                />
              </div>

              <div className="form-navigation">
                <button className="btn-prev" onClick={() => setCurrentStep(1)}>
                  ← Previous
                </button>
                <button 
                  className="btn-next"
                  onClick={() => setCurrentStep(3)}
                  disabled={!batchData.seed_quantity_after_drying}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Production Outputs */}
          {currentStep === 3 && (
            <div className="form-section">
              <h3>Step 3: Production Outputs & Processing</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Oil Yield (kg)</label>
                  <input
                    type="number"
                    value={batchData.oil_yield}
                    onChange={(e) => setBatchData({...batchData, oil_yield: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label>Oil Cake Yield (kg)</label>
                  <input
                    type="number"
                    value={batchData.cake_yield}
                    onChange={(e) => setBatchData({...batchData, cake_yield: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label>Sludge Yield (kg)</label>
                  <input
                    type="number"
                    value={batchData.sludge_yield}
                    onChange={(e) => setBatchData({...batchData, sludge_yield: e.target.value})}
                  />
                </div>
              </div>

              {/* Yield Percentages */}
              {batchData.oil_yield && (
                <div className="calculation-box">
                  <h4>Yield Analysis</h4>
                  <div className="yield-grid">
                    <div>Oil: {yields.oilPercent.toFixed(2)}%</div>
                    <div>Cake: {yields.cakePercent.toFixed(2)}%</div>
                    <div>Sludge: {yields.sludgePercent.toFixed(2)}%</div>
                    <div className={yields.totalPercent > 100 ? 'error' : ''}>
                      Total: {yields.totalPercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
              )}

              {/* Time Tracking */}
              <div className="time-tracking-section">
                <h4>Crushing Time Tracking</h4>
                <TimeTracker
                  onTimeData={setTimeTrackingData}
                  processType="crushing"
                />
              </div>

              {/* Crushing Costs */}
              <div className="cost-capture-section">
                <h4>Crushing & Processing Costs</h4>
                <CostCapture
                  costElements={extendedCostElements.filter(e => e.activity === 'Crushing')}
                  capturedCosts={crushingCosts}
                  onCostsChange={setCrushingCosts}
                  stage="crushing"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Estimated Cake Rate (₹/kg)</label>
                  <input
                    type="number"
                    value={batchData.cake_estimated_rate}
                    onChange={(e) => setBatchData({...batchData, cake_estimated_rate: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label>Estimated Sludge Rate (₹/kg)</label>
                  <input
                    type="number"
                    value={batchData.sludge_estimated_rate}
                    onChange={(e) => setBatchData({...batchData, sludge_estimated_rate: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-navigation">
                <button className="btn-prev" onClick={() => setCurrentStep(2)}>
                  ← Previous
                </button>
                <button className="btn-next" onClick={() => setCurrentStep(4)}>
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Cost Review & Submit */}
          {currentStep === 4 && (
            <div className="form-section">
              <h3>Step 4: Cost Review & Submit</h3>
              
              {/* Additional Costs */}
              <div className="cost-capture-section">
                <h4>Additional Costs</h4>
                <CostCapture
                  costElements={extendedCostElements.filter(e => 
                    e.activity !== 'Drying' && e.activity !== 'Crushing'
                  )}
                  capturedCosts={additionalCosts}
                  onCostsChange={setAdditionalCosts}
                  stage="additional"
                />
              </div>

              {/* Cost Summary */}
              <div className="cost-summary">
                <h4>Total Cost Breakdown</h4>
                <table className="summary-table">
                  <tbody>
                    <tr>
                      <td>Seed Cost:</td>
                      <td className="text-right">₹{costs.seedCost.toFixed(2)}</td>
                    </tr>
                    {dryingCosts.length > 0 && (
                      <tr>
                        <td>Drying Costs:</td>
                        <td className="text-right">
                          ₹{dryingCosts.reduce((sum, c) => sum + (c.quantity * (c.override_rate || c.rate)), 0).toFixed(2)}
                        </td>
                      </tr>
                    )}
                    {crushingCosts.length > 0 && (
                      <tr>
                        <td>Crushing Costs:</td>
                        <td className="text-right">
                          ₹{crushingCosts.reduce((sum, c) => sum + (c.quantity * (c.override_rate || c.rate)), 0).toFixed(2)}
                        </td>
                      </tr>
                    )}
                    {additionalCosts.length > 0 && (
                      <tr>
                        <td>Additional Costs:</td>
                        <td className="text-right">
                          ₹{additionalCosts.reduce((sum, c) => sum + (c.quantity * (c.override_rate || c.rate)), 0).toFixed(2)}
                        </td>
                      </tr>
                    )}
                    <tr className="total-row">
                      <td><strong>Total Production Cost:</strong></td>
                      <td className="text-right"><strong>₹{costs.totalCost.toFixed(2)}</strong></td>
                    </tr>
                    {batchData.oil_yield && (
                      <tr className="highlight-row">
                        <td><strong>Oil Cost per kg:</strong></td>
                        <td className="text-right">
                          <strong>₹{(costs.totalCost / parseFloat(batchData.oil_yield)).toFixed(2)}</strong>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="form-navigation">
                <button className="btn-prev" onClick={() => setCurrentStep(3)}>
                  ← Previous
                </button>
                <button 
                  className="btn-submit"
                  onClick={handleSubmit}
                  disabled={loading || !batchData.oil_yield}
                >
                  {loading ? 'Submitting...' : 'Submit Batch'}
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="batch-history">
          <h3>Batch Production History</h3>
          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Traceable Code</th>
                  <th>Oil Type</th>
                  <th>Oil Yield</th>
                  <th>Yield %</th>
                  <th>Cost/kg</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {batchHistory.map((batch) => (
                  <tr key={batch.batch_id}>
                    <td className="traceable-code">
                      {batch.traceable_code || batch.batch_code}
                    </td>
                    <td>{batch.oil_type}</td>
                    <td>{batch.oil_yield} kg</td>
                    <td>
                      <span className={`yield-badge ${batch.oil_yield_percent > 30 ? 'high' : 'low'}`}>
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
                        disabled={loadingReports[batch.batch_id]} // FIXED: Check specific batch loading state
                      >
                        {loadingReports[batch.batch_id] ? 'Loading...' : '📄 View Report'}
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
                        <td>{reportData.seed_purchase_code || 'N/A'}</td>
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
                
                {/* Cost Summary Section */}
                <div className="section">
                  <div className="section-title">Cost Summary</div>
                  <table>
                    <tbody>
                      <tr>
                        <th>Total Production Cost</th>
                        <td className="highlight">₹{reportData.total_production_cost?.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <th>Net Oil Cost</th>
                        <td>₹{reportData.net_oil_cost?.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <th>Cost per kg Oil</th>
                        <td className="highlight">₹{reportData.oil_cost_per_kg?.toFixed(2)}/kg</td>
                      </tr>
                    </tbody>
                  </table>
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
