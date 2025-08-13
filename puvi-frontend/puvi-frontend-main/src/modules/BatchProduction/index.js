// File Path: puvi-frontend/puvi-frontend-main/src/modules/BatchProduction/index.js
// Complete Batch Production Module with Fixed Report Data Mapping
// Version: 3.0 - Fixed response structure mapping for reports

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
  
  // Report states - Track loading per batch ID
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [loadingReports, setLoadingReports] = useState({});
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

  // FIXED: Generate comprehensive batch report with proper data mapping
  const generateBatchReport = async (batchId, batchCode) => {
    // Set loading state for this specific batch
    setLoadingReports(prev => ({ ...prev, [batchId]: true }));
    
    try {
      const response = await api.costManagement.getBatchSummary(batchId);
      if (response.success && response.summary) {
        const summary = response.summary;
        
        // Transform the response to match the expected structure for the report modal
        const transformedData = {
          // Root level fields
          batch_code: batchCode,
          traceable_code: summary.traceable_code || batchCode,
          
          // Batch details section
          batch_details: {
            batch_code: summary.batch_code || batchCode,
            oil_type: summary.oil_type || 'N/A',
            production_date: summary.production_date || 'N/A',
            seed_purchase_code: summary.seed_purchase_code || 'N/A',
            traceable_code: summary.traceable_code || batchCode
          },
          
          // Production summary section
          production_summary: {
            seed_quantity_before_drying: summary.seed_quantity || 0,
            seed_quantity_after_drying: summary.seed_quantity || 0,
            drying_loss_kg: 0, // Calculate if both before and after are available
            drying_loss_percent: '0.00',
            oil_yield: summary.oil_yield || 0,
            oil_yield_percent: summary.seed_quantity > 0 
              ? ((summary.oil_yield / summary.seed_quantity) * 100).toFixed(2)
              : '0.00',
            cake_yield: summary.cake_yield || 0,
            sludge_yield: summary.sludge_yield || 0
          },
          
          // Cost breakdown section
          cost_breakdown: summary.extended_costs || [],
          extended_costs: summary.extended_costs || [],
          
          // Cost summary section
          cost_summary: {
            total_production_cost: summary.total_production_cost || 0,
            base_production_cost: summary.base_production_cost || 0,
            extended_costs: summary.total_extended_costs || 0,
            net_oil_cost: summary.net_oil_cost || 0,
            oil_cost_per_kg: summary.oil_cost_per_kg || 0
          },
          
          // Time tracking section
          time_tracking: summary.time_tracking || {
            total_hours: 0,
            rounded_hours: 0,
            labor_cost: 0
          },
          
          // Validation section
          validation: summary.validation || {
            has_warnings: false,
            warning_count: 0,
            warnings: []
          }
        };
        
        setReportData(transformedData);
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
              margin: 10px 0;
            }
            th {
              background: #f5f5f5;
              padding: 8px;
              text-align: left;
              font-weight: bold;
            }
            td {
              padding: 8px;
              border-bottom: 1px solid #e0e0e0;
            }
            .highlight {
              background: #fffbf0;
              font-weight: bold;
            }
            .cost-row {
              background: #f9f9f9;
            }
            .total-row {
              background: #e8f4ff;
              font-weight: bold;
            }
            .signature-section {
              display: flex;
              justify-content: space-around;
              margin-top: 60px;
              page-break-inside: avoid;
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
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  // Handle seed selection
  const handleSeedSelection = (seed) => {
    setSelectedSeed(seed);
    setBatchData(prev => ({
      ...prev,
      material_id: seed.material_id,
      oil_type: seed.material_name.replace(' Seeds', ' Oil'),
      seed_purchase_code: seed.latest_purchase_code || ''
    }));
  };

  // Calculate totals
  const calculateTotals = () => {
    let totalCost = 0;
    
    // Add seed cost
    if (selectedSeed && batchData.seed_quantity_before_drying) {
      totalCost += parseFloat(batchData.seed_quantity_before_drying) * selectedSeed.weighted_avg_cost;
    }
    
    // Add other costs
    dryingCosts.forEach(cost => {
      if (cost.is_applied) {
        totalCost += cost.total_cost;
      }
    });
    
    crushingCosts.forEach(cost => {
      if (cost.is_applied) {
        totalCost += cost.total_cost;
      }
    });
    
    additionalCosts.forEach(cost => {
      if (cost.is_applied) {
        totalCost += cost.total_cost;
      }
    });
    
    return totalCost;
  };

  // Submit batch
  const handleSubmit = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      // Prepare cost details
      const allCosts = [...dryingCosts, ...crushingCosts, ...additionalCosts];
      
      // Calculate seed cost
      const seedCost = selectedSeed 
        ? parseFloat(batchData.seed_quantity_before_drying) * selectedSeed.weighted_avg_cost
        : 0;
      
      const submitData = {
        ...batchData,
        seed_cost_total: seedCost,
        cost_details: allCosts.filter(cost => cost.is_applied),
        time_tracking: timeTrackingData,
        created_by: 'Production Operator'
      };
      
      const response = await api.batch.createBatch(submitData);
      
      if (response.success) {
        setMessage('✅ Batch created successfully!');
        // Reset form
        setCurrentStep(1);
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
        setDryingCosts([]);
        setCrushingCosts([]);
        setAdditionalCosts([]);
        setTimeTrackingData(null);
        
        // Refresh history
        fetchBatchHistory();
      } else {
        setMessage(`❌ Error: ${response.error}`);
      }
    } catch (error) {
      console.error('Error creating batch:', error);
      setMessage('❌ Failed to create batch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="batch-production-container">
      <h1>Batch Production</h1>
      
      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
      
      {/* Step Navigation */}
      <div className="step-navigation">
        <div className={`step ${currentStep === 1 ? 'active' : ''}`}>
          1. Select Seed & Basic Info
        </div>
        <div className={`step ${currentStep === 2 ? 'active' : ''}`}>
          2. Drying Process
        </div>
        <div className={`step ${currentStep === 3 ? 'active' : ''}`}>
          3. Crushing Process
        </div>
        <div className={`step ${currentStep === 4 ? 'active' : ''}`}>
          4. Additional Costs
        </div>
        <div className={`step ${currentStep === 5 ? 'active' : ''}`}>
          5. Review & Submit
        </div>
      </div>
      
      {/* Step Content */}
      {currentStep === 1 && (
        <div className="step-content">
          <h2>Select Seed Material</h2>
          
          <div className="seed-selection-container">
            {availableSeeds.map(seed => (
              <div 
                key={seed.material_id}
                className={`seed-card ${selectedSeed?.material_id === seed.material_id ? 'selected' : ''}`}
                onClick={() => handleSeedSelection(seed)}
              >
                <div className="seed-name">{seed.material_name}</div>
                <div className="seed-info">
                  <span>Available: {seed.available_quantity} {seed.unit}</span>
                  <span>Rate: ₹{seed.weighted_avg_cost}/kg</span>
                </div>
                {seed.latest_purchase_code && (
                  <div className="purchase-code">
                    Purchase Code: {seed.latest_purchase_code}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {selectedSeed && (
            <div className="basic-info-form">
              <h3>Basic Information</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Oil Type</label>
                  <input 
                    type="text" 
                    value={batchData.oil_type}
                    readOnly
                  />
                </div>
                
                <div className="form-group">
                  <label>Batch Description</label>
                  <input 
                    type="text"
                    value={batchData.batch_description}
                    onChange={(e) => setBatchData({...batchData, batch_description: e.target.value})}
                    placeholder="e.g., Morning, Evening"
                  />
                </div>
                
                <div className="form-group">
                  <label>Production Date</label>
                  <input 
                    type="date"
                    value={batchData.production_date}
                    onChange={(e) => setBatchData({...batchData, production_date: e.target.value})}
                  />
                </div>
              </div>
              
              <button 
                className="btn-next"
                onClick={() => setCurrentStep(2)}
                disabled={!batchData.batch_description}
              >
                Next: Drying Process →
              </button>
            </div>
          )}
        </div>
      )}
      
      {currentStep === 2 && (
        <div className="step-content">
          <h2>Drying Process</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label>Seed Quantity Before Drying (kg)</label>
              <input 
                type="number"
                value={batchData.seed_quantity_before_drying}
                onChange={(e) => setBatchData({...batchData, seed_quantity_before_drying: e.target.value})}
                placeholder="Enter quantity"
              />
            </div>
            
            <div className="form-group">
              <label>Seed Quantity After Drying (kg)</label>
              <input 
                type="number"
                value={batchData.seed_quantity_after_drying}
                onChange={(e) => setBatchData({...batchData, seed_quantity_after_drying: e.target.value})}
                placeholder="Enter quantity"
              />
            </div>
            
            {batchData.seed_quantity_before_drying && batchData.seed_quantity_after_drying && (
              <div className="form-group">
                <label>Drying Loss</label>
                <div className="calculated-value">
                  {(parseFloat(batchData.seed_quantity_before_drying) - parseFloat(batchData.seed_quantity_after_drying)).toFixed(2)} kg
                  ({((1 - parseFloat(batchData.seed_quantity_after_drying) / parseFloat(batchData.seed_quantity_before_drying)) * 100).toFixed(2)}%)
                </div>
              </div>
            )}
          </div>
          
          <CostCapture 
            stage="drying"
            costElements={extendedCostElements.filter(el => el.activity === 'Drying')}
            onCostsUpdate={setDryingCosts}
            batchData={batchData}
          />
          
          <div className="navigation-buttons">
            <button className="btn-prev" onClick={() => setCurrentStep(1)}>
              ← Previous
            </button>
            <button 
              className="btn-next"
              onClick={() => setCurrentStep(3)}
              disabled={!batchData.seed_quantity_after_drying}
            >
              Next: Crushing →
            </button>
          </div>
        </div>
      )}
      
      {currentStep === 3 && (
        <div className="step-content">
          <h2>Crushing Process</h2>
          
          <TimeTracker 
            onTimeUpdate={(data) => setTimeTrackingData(data)}
            initialData={timeTrackingData}
          />
          
          <div className="form-row">
            <div className="form-group">
              <label>Oil Yield (kg)</label>
              <input 
                type="number"
                value={batchData.oil_yield}
                onChange={(e) => setBatchData({...batchData, oil_yield: e.target.value})}
                placeholder="Enter oil quantity"
              />
            </div>
            
            <div className="form-group">
              <label>Oil Cake Yield (kg)</label>
              <input 
                type="number"
                value={batchData.cake_yield}
                onChange={(e) => setBatchData({...batchData, cake_yield: e.target.value})}
                placeholder="Enter cake quantity"
              />
            </div>
            
            <div className="form-group">
              <label>Sludge Yield (kg)</label>
              <input 
                type="number"
                value={batchData.sludge_yield}
                onChange={(e) => setBatchData({...batchData, sludge_yield: e.target.value})}
                placeholder="Enter sludge quantity"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Oil Cake Estimated Rate (₹/kg)</label>
              <input 
                type="number"
                value={batchData.cake_estimated_rate}
                onChange={(e) => setBatchData({...batchData, cake_estimated_rate: e.target.value})}
                placeholder="Enter rate"
              />
            </div>
            
            <div className="form-group">
              <label>Sludge Estimated Rate (₹/kg)</label>
              <input 
                type="number"
                value={batchData.sludge_estimated_rate}
                onChange={(e) => setBatchData({...batchData, sludge_estimated_rate: e.target.value})}
                placeholder="Enter rate"
              />
            </div>
          </div>
          
          <CostCapture 
            stage="crushing"
            costElements={extendedCostElements.filter(el => el.activity === 'Crushing')}
            onCostsUpdate={setCrushingCosts}
            batchData={batchData}
          />
          
          <div className="navigation-buttons">
            <button className="btn-prev" onClick={() => setCurrentStep(2)}>
              ← Previous
            </button>
            <button 
              className="btn-next"
              onClick={() => setCurrentStep(4)}
              disabled={!batchData.oil_yield || !batchData.cake_yield}
            >
              Next: Additional Costs →
            </button>
          </div>
        </div>
      )}
      
      {currentStep === 4 && (
        <div className="step-content">
          <h2>Additional Costs</h2>
          
          <CostCapture 
            stage="additional"
            costElements={extendedCostElements.filter(el => 
              !['Drying', 'Crushing'].includes(el.activity)
            )}
            onCostsUpdate={setAdditionalCosts}
            batchData={batchData}
          />
          
          <div className="navigation-buttons">
            <button className="btn-prev" onClick={() => setCurrentStep(3)}>
              ← Previous
            </button>
            <button 
              className="btn-next"
              onClick={() => setCurrentStep(5)}
            >
              Next: Review →
            </button>
          </div>
        </div>
      )}
      
      {currentStep === 5 && (
        <div className="step-content">
          <h2>Review & Submit</h2>
          
          <div className="review-section">
            <h3>Production Summary</h3>
            <table className="review-table">
              <tbody>
                <tr>
                  <td>Oil Type:</td>
                  <td>{batchData.oil_type}</td>
                  <td>Production Date:</td>
                  <td>{batchData.production_date}</td>
                </tr>
                <tr>
                  <td>Seed Before Drying:</td>
                  <td>{batchData.seed_quantity_before_drying} kg</td>
                  <td>Seed After Drying:</td>
                  <td>{batchData.seed_quantity_after_drying} kg</td>
                </tr>
                <tr>
                  <td>Oil Yield:</td>
                  <td>{batchData.oil_yield} kg</td>
                  <td>Cake Yield:</td>
                  <td>{batchData.cake_yield} kg</td>
                </tr>
                <tr>
                  <td>Total Production Cost:</td>
                  <td colSpan="3">₹{calculateTotals().toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="navigation-buttons">
            <button className="btn-prev" onClick={() => setCurrentStep(4)}>
              ← Previous
            </button>
            <button 
              className="btn-submit"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Creating Batch...' : 'Submit Batch'}
            </button>
          </div>
        </div>
      )}
      
      {/* View History Button */}
      <div className="history-toggle">
        <button 
          className="btn-history"
          onClick={() => {
            setShowHistory(!showHistory);
            if (!showHistory) fetchBatchHistory();
          }}
        >
          {showHistory ? 'Hide' : 'View'} Batch History
        </button>
      </div>
      
      {/* Batch History */}
      {showHistory && (
        <div className="batch-history">
          <h2>Recent Batches</h2>
          <div className="table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Batch Code</th>
                  <th>Oil Type</th>
                  <th>Production Date</th>
                  <th>Seed Used</th>
                  <th>Oil Yield</th>
                  <th>Yield %</th>
                  <th>Cost/kg</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {batchHistory.map((batch) => (
                  <tr key={batch.batch_id}>
                    <td>{batch.batch_code}</td>
                    <td>{batch.oil_type}</td>
                    <td>{batch.production_date}</td>
                    <td>{batch.seed_quantity_after_drying} kg</td>
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
                        disabled={loadingReports[batch.batch_id]}
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
                
                {/* Batch Information */}
                <div className="section">
                  <div className="section-title">Batch Information</div>
                  <table>
                    <tbody>
                      <tr>
                        <th width="25%">Batch Code</th>
                        <td width="25%">{reportData.batch_details?.batch_code}</td>
                        <th width="25%">Production Date</th>
                        <td width="25%">{reportData.batch_details?.production_date}</td>
                      </tr>
                      <tr>
                        <th>Oil Type</th>
                        <td>{reportData.batch_details?.oil_type}</td>
                        <th>Seed Purchase Code</th>
                        <td className="highlight">{reportData.batch_details?.seed_purchase_code}</td>
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
                        <th width="25%">Seed Before Drying</th>
                        <td width="25%">{reportData.production_summary?.seed_quantity_before_drying} kg</td>
                        <th width="25%">Seed After Drying</th>
                        <td width="25%">{reportData.production_summary?.seed_quantity_after_drying} kg</td>
                      </tr>
                      <tr>
                        <th>Oil Yield</th>
                        <td className="highlight">
                          {reportData.production_summary?.oil_yield} kg 
                          ({reportData.production_summary?.oil_yield_percent}%)
                        </td>
                        <th>Oil Cake Yield</th>
                        <td>{reportData.production_summary?.cake_yield} kg</td>
                      </tr>
                      <tr>
                        <th>Sludge Yield</th>
                        <td>{reportData.production_summary?.sludge_yield} kg</td>
                        <th>Drying Loss</th>
                        <td>
                          {reportData.production_summary?.drying_loss_kg} kg
                          ({reportData.production_summary?.drying_loss_percent}%)
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* Cost Summary */}
                <div className="section">
                  <div className="section-title">Cost Summary</div>
                  <table>
                    <tbody>
                      <tr>
                        <th width="40%">Base Production Cost</th>
                        <td width="60%">₹{reportData.cost_summary?.base_production_cost?.toFixed(2) || '0.00'}</td>
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
                
                {/* Extended Costs Breakdown */}
                {reportData.extended_costs && reportData.extended_costs.length > 0 && (
                  <div className="section">
                    <div className="section-title">Extended Costs Breakdown</div>
                    <table>
                      <thead>
                        <tr>
                          <th>Cost Element</th>
                          <th>Activity</th>
                          <th>Quantity</th>
                          <th>Rate</th>
                          <th>Total Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.extended_costs.map((cost, index) => (
                          <tr key={index} className="cost-row">
                            <td>{cost.element_name}</td>
                            <td>{cost.activity || 'General'}</td>
                            <td>{cost.quantity || '-'}</td>
                            <td>₹{cost.rate?.toFixed(2) || '0.00'}</td>
                            <td>₹{cost.total_cost?.toFixed(2) || '0.00'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Time Tracking */}
                {reportData.time_tracking && reportData.time_tracking.total_hours > 0 && (
                  <div className="section">
                    <div className="section-title">Time Tracking</div>
                    <table>
                      <tbody>
                        <tr>
                          <th width="40%">Total Hours Tracked</th>
                          <td width="60%">{reportData.time_tracking.total_hours} hours</td>
                        </tr>
                        <tr>
                          <th>Rounded Hours (for billing)</th>
                          <td>{reportData.time_tracking.rounded_hours} hours</td>
                        </tr>
                        <tr>
                          <th>Labor Cost</th>
                          <td>₹{reportData.time_tracking.labor_cost?.toFixed(2) || '0.00'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Validation Warnings */}
                {reportData.validation && reportData.validation.has_warnings && (
                  <div className="section">
                    <div className="section-title">⚠️ Cost Validation Warnings</div>
                    <div className="warning-box">
                      <p>The following cost elements may be missing or incomplete:</p>
                      <ul>
                        {reportData.validation.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                      <p className="warning-note">
                        Total potential missing costs: ₹{reportData.validation.total_missing_cost?.toFixed(2) || '0.00'}
                      </p>
                    </div>
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
