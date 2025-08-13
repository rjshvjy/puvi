// File Path: puvi-frontend/puvi-frontend-main/src/modules/BatchProduction/index.js
// Complete Batch Production Module - Rebuilt with Professional UI
// Version: 3.0 - Fixed report generation and restored proper UI

import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import './BatchProduction.css';

const BatchProduction = () => {
  // State Management
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('new');
  
  // Data States
  const [availableSeeds, setAvailableSeeds] = useState([]);
  const [selectedSeed, setSelectedSeed] = useState(null);
  const [costElements, setCostElements] = useState([]);
  const [batchHistory, setBatchHistory] = useState([]);
  
  // Report states
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [loadingReports, setLoadingReports] = useState({});
  const reportRef = useRef();
  
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
    seed_purchase_code: ''
  });

  // Load initial data
  useEffect(() => {
    fetchAvailableSeeds();
    fetchCostElements();
    if (activeTab === 'history') {
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

  // Handle seed selection
  const handleSeedSelection = (seed) => {
    setSelectedSeed(seed);
    setBatchData({
      ...batchData,
      material_id: seed.material_id,
      oil_type: seed.material_name.replace(' Seeds', ' Oil').replace(' Seed', ' Oil'),
      seed_purchase_code: seed.latest_purchase_code || ''
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

  // Calculate total cost
  const calculateTotalCost = () => {
    if (!selectedSeed) return 0;
    const seedQty = parseFloat(batchData.seed_quantity_before_drying) || 0;
    const seedCost = seedQty * selectedSeed.weighted_avg_cost;
    
    // Add other costs from cost elements
    let otherCosts = 0;
    costElements.forEach(element => {
      const quantity = element.calculation_method === 'per_batch' ? 1 : seedQty;
      otherCosts += quantity * element.default_rate;
    });
    
    return seedCost + otherCosts;
  };

  // FIXED: Generate batch report with proper data transformation
  const generateBatchReport = async (batchId, batchCode) => {
    setLoadingReports(prev => ({ ...prev, [batchId]: true }));
    
    try {
      const response = await api.costManagement.getBatchSummary(batchId);
      if (response.success && response.summary) {
        const summary = response.summary;
        
        // Transform the response to match report modal expectations
        const transformedData = {
          batch_code: summary.batch_code || batchCode,
          traceable_code: summary.traceable_code || batchCode,
          
          batch_details: {
            batch_code: summary.batch_code || batchCode,
            oil_type: summary.oil_type || 'N/A',
            production_date: summary.production_date || 'N/A',
            seed_purchase_code: 'N/A',
            traceable_code: summary.traceable_code || batchCode
          },
          
          production_summary: {
            seed_quantity_before_drying: summary.seed_quantity || 0,
            seed_quantity_after_drying: summary.seed_quantity || 0,
            drying_loss_kg: 0,
            drying_loss_percent: '0.00',
            oil_yield: summary.oil_yield || 0,
            oil_yield_percent: summary.seed_quantity > 0 
              ? ((summary.oil_yield / summary.seed_quantity) * 100).toFixed(2)
              : '0.00',
            cake_yield: summary.cake_yield || 0,
            sludge_yield: 0
          },
          
          cost_summary: {
            total_production_cost: summary.total_production_cost || 0,
            base_production_cost: summary.base_production_cost || 0,
            extended_costs: summary.total_extended_costs || 0,
            net_oil_cost: summary.net_oil_cost || 0,
            oil_cost_per_kg: summary.oil_cost_per_kg || 0
          },
          
          extended_costs: summary.extended_costs || [],
          time_tracking: summary.time_tracking || { total_hours: 0, rounded_hours: 0, labor_cost: 0 },
          validation: summary.validation || { has_warnings: false, warning_count: 0, warnings: [] }
        };
        
        setReportData(transformedData);
        setShowReport(true);
      } else {
        throw new Error('Failed to fetch batch report');
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
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th, td {
              padding: 8px 12px;
              text-align: left;
              border: 1px solid #ddd;
            }
            th {
              background: #f5f5f5;
              font-weight: bold;
            }
            .highlight {
              background: #fffbf0;
              font-weight: bold;
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
    
    if (!selectedSeed) {
      setMessage('Please select a seed material');
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      // Calculate seed cost
      const seedCost = parseFloat(batchData.seed_quantity_before_drying) * selectedSeed.weighted_avg_cost;
      
      // Prepare cost details
      const costDetails = costElements.map(element => ({
        element_name: element.element_name,
        master_rate: element.default_rate,
        override_rate: element.default_rate,
        quantity: element.calculation_method === 'per_batch' ? 1 : parseFloat(batchData.seed_quantity_before_drying),
        total_cost: element.calculation_method === 'per_batch' 
          ? element.default_rate 
          : element.default_rate * parseFloat(batchData.seed_quantity_before_drying)
      }));
      
      const submitData = {
        ...batchData,
        seed_cost_total: seedCost,
        cost_details: costDetails,
        created_by: 'Production Operator'
      };
      
      const response = await api.batch.createBatch(submitData);
      
      if (response.success) {
        setMessage(`✅ Batch created successfully! 
          Batch Code: ${response.batch_code}
          Oil Cost: ₹${response.oil_cost_per_kg?.toFixed(2)}/kg`);
        
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
          seed_purchase_code: ''
        });
        setSelectedSeed(null);
        
        // Refresh history if in history tab
        if (activeTab === 'history') {
          fetchBatchHistory();
        }
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

  const { loss, lossPercent } = calculateDryingLoss();
  const yields = calculateYieldPercentages();
  const totalCost = calculateTotalCost();

  return (
    <div className="batch-production-container">
      {/* Module Header */}
      <div className="module-header">
        <h1>Batch Production</h1>
        <p>Oil extraction and production tracking</p>
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
          Batch History
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {/* New Batch Tab */}
      {activeTab === 'new' && (
        <div className="batch-form-container">
          <form onSubmit={handleSubmit}>
            {/* Basic Information Card */}
            <div className="form-card">
              <h3 className="card-title">Basic Information</h3>
              
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

            {/* Seed Selection Card */}
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
                        <div className="seed-name">{seed.material_name}</div>
                        <div className="seed-details">
                          <span className="seed-quantity">Available: {seed.available_quantity} kg</span>
                          <span className="seed-rate">₹{seed.weighted_avg_cost}/kg</span>
                        </div>
                        {seed.latest_purchase_code && (
                          <div className="seed-code">Code: {seed.latest_purchase_code}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {selectedSeed && (
                <div className="selected-seed-info">
                  <strong>Selected:</strong> {selectedSeed.material_name} - 
                  {selectedSeed.available_quantity} kg available @ ₹{selectedSeed.weighted_avg_cost}/kg
                </div>
              )}
            </div>

            {/* Drying Process Card */}
            <div className="form-card">
              <h3 className="card-title">Drying Process</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Seed Quantity Before Drying (kg)</label>
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

            {/* Production Output Card */}
            <div className="form-card">
              <h3 className="card-title">Production Output</h3>
              
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
            </div>

            {/* By-product Rates Card */}
            <div className="form-card">
              <h3 className="card-title">By-product Estimated Rates</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Oil Cake Rate (₹/kg)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={batchData.cake_estimated_rate}
                    onChange={(e) => setBatchData({...batchData, cake_estimated_rate: e.target.value})}
                    step="0.01"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Sludge Rate (₹/kg)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={batchData.sludge_estimated_rate}
                    onChange={(e) => setBatchData({...batchData, sludge_estimated_rate: e.target.value})}
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            {/* Cost Summary Card */}
            <div className="form-card cost-summary">
              <h3 className="card-title">Cost Summary</h3>
              
              <div className="summary-grid">
                <div className="summary-item">
                  <span>Seed Cost:</span>
                  <strong>₹{(parseFloat(batchData.seed_quantity_before_drying || 0) * (selectedSeed?.weighted_avg_cost || 0)).toFixed(2)}</strong>
                </div>
                <div className="summary-item">
                  <span>Other Costs:</span>
                  <strong>₹{(totalCost - (parseFloat(batchData.seed_quantity_before_drying || 0) * (selectedSeed?.weighted_avg_cost || 0))).toFixed(2)}</strong>
                </div>
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
            </div>

            {/* Submit Button */}
            <div className="form-actions">
              <button 
                type="submit" 
                className="btn-submit"
                disabled={loading || !selectedSeed}
              >
                {loading ? 'Creating Batch...' : 'Create Batch'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="history-container">
          <div className="history-header">
            <h3>Recent Batches</h3>
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
                    <td colSpan="8" className="text-center">No batches found</td>
                  </tr>
                ) : (
                  batchHistory.map((batch) => (
                    <tr key={batch.batch_id}>
                      <td className="batch-code">{batch.batch_code}</td>
                      <td>{batch.oil_type}</td>
                      <td>{batch.production_date}</td>
                      <td className="text-right">{batch.seed_quantity_after_drying}</td>
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
                          {loadingReports[batch.batch_id] ? 'Loading...' : '📄 Report'}
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
                        <th width="25%">Seed Quantity</th>
                        <td width="25%">{reportData.production_summary?.seed_quantity_before_drying} kg</td>
                        <th width="25%">Oil Yield</th>
                        <td width="25%" className="highlight">
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
                
                {/* Validation Warnings if any */}
                {reportData.validation?.has_warnings && (
                  <div className="section">
                    <div className="section-title">⚠️ Validation Warnings</div>
                    <ul className="warning-list">
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
