/**
 * MaterialWriteoff Component v4.0.0
 * Simplified 3-tab version with unified dropdown
 * File Path: puvi-frontend/puvi-frontend-main/src/modules/MaterialWriteoff/index.js
 */

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './MaterialWriteoff.css';

const MaterialWriteoff = () => {
  // ============================================
  // STATE MANAGEMENT - SIMPLIFIED
  // ============================================
  
  // Tab navigation - Only 3 tabs now
  const [activeTab, setActiveTab] = useState('writeoff'); // writeoff | impact | history
  
  // Unified inventory management
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState({ 
    materials: [], 
    finished_products: [], 
    byproducts: [] 
  });
  const [selectedCategory, setSelectedCategory] = useState('');
  const [inventoryType, setInventoryType] = useState(''); // material | sku | oilcake | sludge
  
  // Common states
  const [writeoffReasons, setWriteoffReasons] = useState([]);
  const [writeoffHistory, setWriteoffHistory] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [summary, setSummary] = useState(null);
  
  // Impact analytics states
  const [impactData, setImpactData] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  const [refreshingMetrics, setRefreshingMetrics] = useState(false);
  
  // Writeoff form data
  const [writeoffData, setWriteoffData] = useState({
    quantity: '',
    scrap_value: '0',
    reason_code: '',
    reason_description: '',
    writeoff_date: new Date().toISOString().split('T')[0],
    notes: '',
    created_by: ''
  });

  // ============================================
  // LIFECYCLE HOOKS
  // ============================================
  
  useEffect(() => {
    fetchWriteoffReasons();
    fetchWriteoffHistory();
  }, []);

  // Fetch data when tab changes
  useEffect(() => {
    resetSelection();
    
    if (activeTab === 'writeoff') {
      fetchUnifiedCategories();
    } else if (activeTab === 'impact') {
      fetchImpactData();
    }
  }, [activeTab]);

  // ============================================
  // API CALLS - UNIFIED
  // ============================================
  
  const fetchUnifiedCategories = async () => {
    try {
      const response = await api.writeoff.getUnifiedInventory();
      if (response.success) {
        setCategories(response.categories || {
          materials: [],
          finished_products: [],
          byproducts: []
        });
      }
    } catch (error) {
      console.error('Error fetching unified categories:', error);
      setMessage('Error loading categories');
    }
  };

  const handleCategoryChange = async (value) => {
    setSelectedCategory(value);
    setSelectedItem(null);
    setInventory([]);
    
    if (!value) {
      setInventoryType('');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Determine type from category prefix
      let response;
      
      if (value.startsWith('sku_')) {
        setInventoryType('sku');
        // Unified inventory endpoint handles SKU filtering
        response = await api.writeoff.getUnifiedInventory(value);
      } else if (value.startsWith('oilcake_')) {
        setInventoryType('oilcake');
        response = await api.writeoff.getUnifiedInventory(value);
      } else if (value.startsWith('sludge_')) {
        setInventoryType('sludge');
        response = await api.writeoff.getUnifiedInventory(value);
      } else {
        setInventoryType('material');
        response = await api.writeoff.getUnifiedInventory(value);
      }

      if (response.success) {
        setInventory(response.inventory_items || []);
        if (response.inventory_items?.length === 0) {
          setMessage('No items available for writeoff in this category');
        }
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setMessage('Error loading inventory items');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // API CALLS - IMPACT ANALYTICS
  // ============================================
  
  const fetchImpactData = async () => {
    try {
      const [impact, dashboard, trends] = await Promise.all([
        api.writeoff.getImpactMetrics(),
        api.writeoff.getDashboard(),
        api.writeoff.getTrends()
      ]);
      
      setImpactData(impact.impact_data || null);
      setDashboardData(dashboard.dashboard || null);
      setTrendsData(trends.trends || []);
    } catch (error) {
      console.error('Error fetching impact data:', error);
      setMessage('Error loading impact analytics');
    }
  };

  const refreshMetrics = async () => {
    setRefreshingMetrics(true);
    try {
      await api.writeoff.refreshMetrics();
      await fetchImpactData();
      setMessage('✅ Metrics refreshed successfully');
    } catch (error) {
      setMessage('❌ Error refreshing metrics');
    } finally {
      setRefreshingMetrics(false);
    }
  };

  // ============================================
  // API CALLS - COMMON
  // ============================================
  
  const fetchWriteoffReasons = async () => {
    try {
      const response = await api.writeoff.getReasons();
      if (response.success) {
        setWriteoffReasons(response.reasons || []);
      }
    } catch (error) {
      console.error('Error fetching writeoff reasons:', error);
    }
  };

  const fetchWriteoffHistory = async () => {
    try {
      const response = await api.writeoff.getHistory();
      if (response.success) {
        setWriteoffHistory(response.writeoffs || []);
        setSummary(response.summary || null);
      }
    } catch (error) {
      console.error('Error fetching writeoff history:', error);
    }
  };

  // ============================================
  // HANDLERS
  // ============================================
  
  const resetSelection = () => {
    setSelectedItem(null);
    setWriteoffData({
      quantity: '',
      scrap_value: '0',
      reason_code: '',
      reason_description: '',
      writeoff_date: new Date().toISOString().split('T')[0],
      notes: '',
      created_by: ''
    });
    setMessage('');
  };

  const handleItemSelect = (item) => {
    setSelectedItem(item);
    setMessage('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setWriteoffData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'reason_code') {
      const selectedReason = writeoffReasons.find(r => r.reason_code === value);
      if (selectedReason) {
        setWriteoffData(prev => ({
          ...prev,
          reason_description: selectedReason.reason_description
        }));
      }
    }
  };

  const calculateWriteoffValue = () => {
    if (!selectedItem || !writeoffData.quantity) return { total: 0, scrap: 0, net: 0 };
    
    const qty = parseFloat(writeoffData.quantity) || 0;
    const avgCost = parseFloat(
      selectedItem.weighted_avg_cost || 
      selectedItem.estimated_rate || 
      selectedItem.production_cost || 
      0
    ) || 0;
    const scrapValue = parseFloat(writeoffData.scrap_value) || 0;
    
    const totalCost = qty * avgCost;
    const netLoss = totalCost - scrapValue;
    
    return {
      total: totalCost.toFixed(2),
      scrap: scrapValue.toFixed(2),
      net: netLoss.toFixed(2)
    };
  };

  // ============================================
  // SUBMIT HANDLER - UNIFIED
  // ============================================
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedItem) {
      setMessage('Please select an item first');
      return;
    }

    const qty = parseFloat(writeoffData.quantity);
    const availableQty = selectedItem.available_quantity || 
                        selectedItem.quantity_available || 
                        selectedItem.quantity_remaining;
    
    if (qty > availableQty) {
      const unit = selectedItem.unit || 'kg';
      setMessage(`Cannot write off more than available quantity (${availableQty} ${unit})`);
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      let response;
      
      // Call appropriate API based on inventory type
      if (inventoryType === 'sku') {
        response = await api.writeoff.addSKUWriteoff({
          ...writeoffData,
          sku_inventory_id: selectedItem.inventory_id
        });
      } else if (inventoryType === 'oilcake') {
        response = await api.writeoff.addOilCakeWriteoff({
          ...writeoffData,
          cake_inventory_id: selectedItem.inventory_id
        });
      } else if (inventoryType === 'sludge') {
        response = await api.writeoff.addSludgeWriteoff({
          ...writeoffData,
          batch_id: selectedItem.batch_id
        });
      } else {
        response = await api.writeoff.recordWriteoff({
          ...writeoffData,
          material_id: selectedItem.material_id
        });
      }

      if (response.success) {
        const itemName = selectedItem.material_name || 
                        selectedItem.product_name ||
                        `${selectedItem.oil_type} ${inventoryType === 'oilcake' ? 'Oil Cake' : 'Sludge'}`;
        
        setMessage(`✅ Writeoff recorded successfully! 
          Written off: ${response.quantity_written_off} ${response.unit || selectedItem.unit || 'kg'} of ${itemName}
          Net Loss: ₹${response.net_loss.toFixed(2)}
          New Balance: ${response.new_balance || response.new_stock_balance} ${response.unit || selectedItem.unit || 'kg'}`);
        
        resetSelection();
        
        // Refresh the current category inventory
        if (selectedCategory) {
          handleCategoryChange(selectedCategory);
        }
        
        fetchWriteoffHistory();
      } else {
        setMessage(`❌ Error: ${response.error || 'Failed to record writeoff'}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const values = calculateWriteoffValue();
  
  // Group reasons by category
  const reasonsByCategory = Array.isArray(writeoffReasons) 
    ? writeoffReasons.reduce((acc, reason) => {
        const category = reason.category || 'Other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(reason);
        return acc;
      }, {})
    : {};

  // ============================================
  // RENDER FUNCTIONS
  // ============================================
  
  const renderInventoryItem = (item) => {
    if (inventoryType === 'sku') {
      return (
        <>
          <strong>{item.product_name || item.sku_code}</strong>
          <div className="material-details">
            Batch: {item.batch_code}<br />
            Available: {item.quantity_available} bottles<br />
            MRP: ₹{item.mrp?.toFixed(2) || 'N/A'}<br />
            Expiry: {item.expiry_date || 'N/A'}
          </div>
        </>
      );
    } else if (inventoryType === 'oilcake' || inventoryType === 'sludge') {
      return (
        <>
          <strong>{item.batch_code} - {item.oil_type}</strong>
          <div className="material-details">
            Available: {item.quantity_remaining?.toFixed(2) || 0} kg<br />
            Rate: ₹{item.estimated_rate?.toFixed(2) || 0}/kg<br />
            Production: {item.production_date}<br />
            Traceable: {item.traceable_code}
          </div>
        </>
      );
    } else {
      return (
        <>
          <strong>{item.material_name}</strong>
          <div className="material-details">
            Available: {item.available_quantity} {item.unit}<br />
            Avg Cost: ₹{item.weighted_avg_cost?.toFixed(2) || 0}/{item.unit}
          </div>
        </>
      );
    }
  };

  const renderWriteoffTab = () => {
    return (
      <div className="writeoff-grid">
        {/* Left Panel - Selection */}
        <div className="panel">
          <h3 className="panel-title">Select Item for Write-off</h3>
          
          {/* Enhanced Category Dropdown */}
          <div className="form-group">
            <label className="form-label">Category:</label>
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="form-select"
              disabled={loading}
            >
              <option value="">-- Select Category --</option>
              
              {categories.materials?.length > 0 && (
                <optgroup label="═══ MATERIALS ═══">
                  {categories.materials.map(cat => (
                    <option key={cat.category} value={cat.category}>
                      {cat.display_name} ({cat.count} {cat.unit})
                    </option>
                  ))}
                </optgroup>
              )}
              
              {categories.finished_products?.length > 0 && (
                <optgroup label="═══ FINISHED PRODUCTS ═══">
                  {categories.finished_products.map(cat => (
                    <option key={cat.category} value={cat.category}>
                      {cat.display_name} ({cat.count.toFixed(0)} {cat.unit})
                    </option>
                  ))}
                </optgroup>
              )}
              
              {categories.byproducts?.length > 0 && (
                <optgroup label="═══ BY-PRODUCTS ═══">
                  {categories.byproducts.map(cat => (
                    <option key={cat.category} value={cat.category}>
                      {cat.display_name} ({cat.count.toFixed(0)} {cat.unit})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Single inventory list for all types */}
          {loading ? (
            <div className="empty-state-center">Loading inventory...</div>
          ) : inventory.length === 0 ? (
            <div className="empty-state-center">
              {selectedCategory ? 'No items available for writeoff' : 'Select a category to view items'}
            </div>
          ) : (
            <div className="material-list">
              {inventory.map(item => (
                <div
                  key={item.inventory_id || item.material_id}
                  onClick={() => handleItemSelect(item)}
                  className={`material-item ${selectedItem === item ? 'selected' : ''}`}
                >
                  {renderInventoryItem(item)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel - Single Form */}
        <div className="panel">
          <h3 className="panel-title">Write-off Details</h3>
          
          {!selectedItem ? (
            <p className="empty-state-center">
              Select an item from the left to record write-off
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="selected-material-info">
                <strong>Selected Item:</strong><br />
                {selectedItem.material_name || 
                 selectedItem.product_name ||
                 `${selectedItem.batch_code} - ${selectedItem.oil_type}`}<br />
                Available: {
                  selectedItem.available_quantity || 
                  selectedItem.quantity_available || 
                  selectedItem.quantity_remaining
                } {selectedItem.unit || 'kg'}<br />
                Cost: ₹{(
                  selectedItem.weighted_avg_cost || 
                  selectedItem.estimated_rate || 
                  selectedItem.production_cost || 
                  0
                ).toFixed(2)}/{selectedItem.unit || 'kg'}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Write-off Quantity ({selectedItem.unit || 'kg'}): *
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={writeoffData.quantity}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  max={
                    selectedItem.available_quantity || 
                    selectedItem.quantity_available || 
                    selectedItem.quantity_remaining
                  }
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Write-off Reason: *</label>
                <select
                  name="reason_code"
                  value={writeoffData.reason_code}
                  onChange={handleInputChange}
                  required
                  className="form-select"
                >
                  <option value="">Select Reason</option>
                  {Object.entries(reasonsByCategory).map(([category, reasons]) => (
                    <optgroup key={category} label={category}>
                      {Array.isArray(reasons) && reasons.map(reason => (
                        <option key={reason.reason_code} value={reason.reason_code}>
                          {reason.reason_description}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Scrap Recovery Value (₹):</label>
                <input
                  type="number"
                  name="scrap_value"
                  value={writeoffData.scrap_value}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Write-off Date: *</label>
                <input
                  type="date"
                  name="writeoff_date"
                  value={writeoffData.writeoff_date}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Authorized By:</label>
                <input
                  type="text"
                  name="created_by"
                  value={writeoffData.created_by}
                  onChange={handleInputChange}
                  placeholder="Name of person authorizing"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes:</label>
                <textarea
                  name="notes"
                  value={writeoffData.notes}
                  onChange={handleInputChange}
                  rows="3"
                  className="form-textarea"
                />
              </div>

              {writeoffData.quantity && (
                <div className="value-summary">
                  <div className="value-grid">
                    <span>Material Value:</span>
                    <span className="value-amount">₹{values.total}</span>
                    
                    <span>Less: Scrap Recovery:</span>
                    <span className="value-amount">₹{values.scrap}</span>
                    
                    <span className="value-total">Net Loss:</span>
                    <span className="value-amount value-total">₹{values.net}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`submit-button ${loading ? 'disabled' : ''}`}
              >
                {loading ? 'Recording...' : 'Record Write-off'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  };

  const renderImpactDashboard = () => {
    return (
      <div className="impact-dashboard">
        {/* Impact Metrics Cards */}
        {impactData && (
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-label">Total Writeoffs</div>
              <div className="summary-value error">
                ₹{impactData.total_writeoffs_value.toFixed(2)}
              </div>
            </div>
            
            <div className="summary-card">
              <div className="summary-label">Oil Produced</div>
              <div className="summary-value">
                {impactData.total_oil_produced_kg.toFixed(0)} kg
              </div>
            </div>
            
            <div className={`summary-card impact-${impactData.impact_level}`}>
              <div className="summary-label">Impact per kg</div>
              <div className="summary-value">
                ₹{impactData.impact_per_kg.toFixed(2)}
              </div>
              <div style={{fontSize: '12px', marginTop: '5px', color: impactData.impact_color}}>
                {impactData.impact_level.toUpperCase()}
              </div>
            </div>
            
            <div className="summary-card">
              <div className="summary-label">Writeoff %</div>
              <div className="summary-value">
                {impactData.writeoff_percentage.toFixed(2)}%
              </div>
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <div style={{textAlign: 'center', margin: '20px 0'}}>
          <button
            onClick={refreshMetrics}
            disabled={refreshingMetrics}
            className={`submit-button ${refreshingMetrics ? 'disabled' : ''}`}
            style={{width: 'auto', padding: '10px 30px'}}
          >
            {refreshingMetrics ? 'Refreshing...' : 'Refresh Metrics'}
          </button>
          <div style={{marginTop: '10px', fontStyle: 'italic', color: '#666'}}>
            {impactData?.note}
          </div>
        </div>

        {/* Recent Writeoffs and Top Reasons */}
        {dashboardData && (
          <div className="writeoff-grid">
            {/* Recent Writeoffs */}
            <div className="panel">
              <h3 className="panel-title">Recent Writeoffs</h3>
              <div className="table-container">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Item</th>
                      <th>Quantity</th>
                      <th>Net Loss</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.recent_writeoffs?.map((item) => (
                      <tr key={item.writeoff_id}>
                        <td>{item.date}</td>
                        <td>{item.item_name}</td>
                        <td>{item.quantity} {item.unit}</td>
                        <td className="net-loss">₹{item.net_loss.toFixed(2)}</td>
                        <td>{item.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Reasons */}
            <div className="panel">
              <h3 className="panel-title">Top Writeoff Reasons</h3>
              <div className="table-container">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Reason</th>
                      <th>Category</th>
                      <th>Count</th>
                      <th>Total Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.top_reasons?.map((reason) => (
                      <tr key={reason.reason_code}>
                        <td>{reason.reason}</td>
                        <td>{reason.category}</td>
                        <td className="text-center">{reason.count}</td>
                        <td className="net-loss">₹{reason.total_loss.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Alerts */}
        {dashboardData?.alerts?.length > 0 && (
          <div className="panel" style={{marginTop: '20px'}}>
            <h3 className="panel-title">Alerts</h3>
            {dashboardData.alerts.map((alert, index) => (
              <div
                key={index}
                className={`message-alert ${alert.level === 'critical' ? 'error' : 'warning'}`}
                style={{marginBottom: '10px'}}
              >
                {alert.message}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderHistoryTab = () => {
    return (
      <div>
        {summary && (
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-label">Total Write-offs</div>
              <div className="summary-value error">
                {summary.total_writeoffs}
              </div>
            </div>
            
            <div className="summary-card">
              <div className="summary-label">Total Cost</div>
              <div className="summary-value error">
                ₹{summary.total_cost.toFixed(2)}
              </div>
            </div>
            
            <div className="summary-card">
              <div className="summary-label">Scrap Recovered</div>
              <div className="summary-value success">
                ₹{summary.total_scrap_recovered.toFixed(2)}
              </div>
            </div>
            
            <div className="summary-card">
              <div className="summary-label">Net Loss</div>
              <div className="summary-value error">
                ₹{summary.total_net_loss.toFixed(2)}
              </div>
            </div>
          </div>
        )}

        <div className="panel">
          <h3 className="panel-title">Complete Write-off History</h3>
          <div className="table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Material/Batch</th>
                  <th>Category</th>
                  <th className="text-center">Quantity</th>
                  <th className="text-center">Reason</th>
                  <th className="text-right">Total Cost</th>
                  <th className="text-right">Scrap Value</th>
                  <th className="text-right">Net Loss</th>
                  <th>Authorized By</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(writeoffHistory) && writeoffHistory.map((writeoff) => (
                  <tr key={writeoff.writeoff_id}>
                    <td>{writeoff.writeoff_date_display}</td>
                    <td>
                      {writeoff.reference_type === 'oil_cake' ? 'Oil Cake' :
                       writeoff.reference_type === 'sludge' ? 'Sludge' :
                       writeoff.reference_type === 'sku' ? 'SKU' :
                       'Material'}
                    </td>
                    <td>{writeoff.material_name || writeoff.batch_code}</td>
                    <td>{writeoff.category}</td>
                    <td className="text-center">
                      {writeoff.quantity} {writeoff.unit}
                    </td>
                    <td className="text-center">
                      <span className="reason-badge">
                        {writeoff.reason_description || writeoff.reason_code}
                      </span>
                    </td>
                    <td className="text-right">
                      ₹{writeoff.total_cost.toFixed(2)}
                    </td>
                    <td className="text-right">
                      ₹{writeoff.scrap_value.toFixed(2)}
                    </td>
                    <td className="text-right net-loss">
                      ₹{writeoff.net_loss.toFixed(2)}
                    </td>
                    <td>{writeoff.created_by || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  
  return (
    <div className="writeoff-container">
      <h2 className="writeoff-title">Material Write-off Module</h2>

      {/* Tab Navigation - Only 3 tabs now */}
      <div className="tab-navigation">
        <button 
          onClick={() => setActiveTab('writeoff')}
          className={`tab-button ${activeTab === 'writeoff' ? 'active' : ''}`}
        >
          Write-off
        </button>
        <button 
          onClick={() => setActiveTab('impact')}
          className={`tab-button ${activeTab === 'impact' ? 'active' : ''}`}
        >
          Impact Analytics
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
        >
          History
        </button>
      </div>

      {message && (
        <div className={`message-alert ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'writeoff' && renderWriteoffTab()}
      {activeTab === 'impact' && renderImpactDashboard()}
      {activeTab === 'history' && renderHistoryTab()}
    </div>
  );
};

export default MaterialWriteoff;
