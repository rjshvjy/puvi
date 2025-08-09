// MRP History Component - Timeline view of MRP changes
// File Path: puvi-frontend/src/modules/SKUManagement/components/MRPHistory.js

import React, { useState, useEffect } from 'react';
import api, { skuDateUtils, formatUtils } from '../../../services/api';

const MRPHistory = () => {
  // State management
  const [skuList, setSKUList] = useState([]);
  const [selectedSKU, setSelectedSKU] = useState('');
  const [selectedSKUData, setSelectedSKUData] = useState(null);
  const [mrpHistory, setMrpHistory] = useState([]);
  const [currentMRP, setCurrentMRP] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Modal states for adding new MRP
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMRP, setNewMRP] = useState({
    mrp_amount: '',
    effective_from: new Date().toISOString().split('T')[0],
    change_reason: '',
    changed_by: 'User' // In production, get from auth context
  });
  const [errors, setErrors] = useState({});

  // Fetch SKUs on component mount
  useEffect(() => {
    fetchSKUs();
  }, []);

  // Fetch MRP history when SKU is selected
  useEffect(() => {
    if (selectedSKU) {
      fetchMRPHistory(selectedSKU);
      fetchCurrentMRP(selectedSKU);
    } else {
      setMrpHistory([]);
      setCurrentMRP(null);
    }
  }, [selectedSKU]);

  const fetchSKUs = async () => {
    try {
      const response = await api.sku.getMasterList({ is_active: true });
      
      if (response.success && response.skus) {
        setSKUList(response.skus);
        
        if (response.skus.length === 0) {
          setMessage({ type: 'warning', text: 'No active SKUs found. Please configure SKUs first.' });
        }
      } else {
        setSKUList([]);
      }
    } catch (error) {
      console.error('Error fetching SKUs:', error);
      setMessage({ type: 'error', text: 'Failed to load SKUs' });
      setSKUList([]);
    }
  };

  const fetchMRPHistory = async (skuId) => {
    setLoadingHistory(true);
    try {
      const response = await api.sku.getMRPHistory(skuId);
      
      if (response.success && response.mrp_history) {
        // Sort history by effective_from date (newest first)
        const sortedHistory = response.mrp_history.sort((a, b) => {
          const dateA = a.effective_from || 0;
          const dateB = b.effective_from || 0;
          return dateB - dateA; // Descending order
        });
        setMrpHistory(sortedHistory);
      } else {
        setMrpHistory([]);
      }
    } catch (error) {
      console.error('Error fetching MRP history:', error);
      setMessage({ type: 'error', text: 'Failed to load MRP history' });
      setMrpHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchCurrentMRP = async (skuId) => {
    try {
      const response = await api.sku.getCurrentMRP(skuId);
      
      if (response.success && response.current_mrp) {
        setCurrentMRP(response.current_mrp);
      } else {
        setCurrentMRP(null);
      }
    } catch (error) {
      console.error('Error fetching current MRP:', error);
      setCurrentMRP(null);
    }
  };

  const handleSKUChange = (e) => {
    const skuId = e.target.value;
    setSelectedSKU(skuId);
    
    if (skuId) {
      const sku = skuList.find(s => s.sku_id === parseInt(skuId));
      setSelectedSKUData(sku);
    } else {
      setSelectedSKUData(null);
    }
    
    // Clear any messages when changing SKU
    setMessage({ type: '', text: '' });
  };

  const handleOpenAddModal = () => {
    if (!selectedSKU) {
      setMessage({ type: 'error', text: 'Please select an SKU first' });
      return;
    }
    
    setShowAddModal(true);
    setErrors({});
    // Pre-fill with suggested new MRP based on current
    setNewMRP({
      mrp_amount: currentMRP?.mrp_amount || selectedSKUData?.mrp_current || '',
      effective_from: new Date().toISOString().split('T')[0],
      change_reason: '',
      changed_by: 'User'
    });
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setErrors({});
    setNewMRP({
      mrp_amount: '',
      effective_from: new Date().toISOString().split('T')[0],
      change_reason: '',
      changed_by: 'User'
    });
  };

  const validateNewMRP = () => {
    const newErrors = {};
    
    // MRP amount validation
    const amount = parseFloat(newMRP.mrp_amount);
    if (!newMRP.mrp_amount) {
      newErrors.mrp_amount = 'MRP amount is required';
    } else if (isNaN(amount) || amount <= 0) {
      newErrors.mrp_amount = 'MRP must be a positive number';
    } else if (amount > 10000) {
      newErrors.mrp_amount = 'MRP cannot exceed ₹10,000';
    }
    
    // Check if MRP is same as current
    if (amount === parseFloat(currentMRP?.mrp_amount || 0)) {
      newErrors.mrp_amount = 'New MRP must be different from current MRP';
    }
    
    // Effective date validation
    if (!newMRP.effective_from) {
      newErrors.effective_from = 'Effective date is required';
    } else {
      const effectiveDate = new Date(newMRP.effective_from);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Allow backdating up to 30 days
      const minDate = new Date();
      minDate.setDate(minDate.getDate() - 30);
      minDate.setHours(0, 0, 0, 0);
      
      if (effectiveDate < minDate) {
        newErrors.effective_from = 'Cannot backdate more than 30 days';
      }
    }
    
    // Change reason validation
    if (!newMRP.change_reason.trim()) {
      newErrors.change_reason = 'Change reason is required';
    } else if (newMRP.change_reason.trim().length < 10) {
      newErrors.change_reason = 'Change reason must be at least 10 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewMRP(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmitNewMRP = async (e) => {
    e.preventDefault();
    
    if (!validateNewMRP()) {
      return;
    }
    
    setLoading(true);
    try {
      // Update SKU with new MRP
      const response = await api.sku.updateSKU(selectedSKU, {
        ...selectedSKUData,
        mrp_current: parseFloat(newMRP.mrp_amount),
        mrp_effective_date: newMRP.effective_from,
        change_reason: newMRP.change_reason,
        changed_by: newMRP.changed_by
      });
      
      if (response.success) {
        setMessage({ 
          type: 'success', 
          text: `MRP updated successfully to ${formatUtils.currency(newMRP.mrp_amount)}` 
        });
        
        // Refresh data
        await fetchMRPHistory(selectedSKU);
        await fetchCurrentMRP(selectedSKU);
        await fetchSKUs(); // Refresh SKU list to get updated MRP
        
        handleCloseModal();
      } else {
        throw new Error(response.error || 'Failed to update MRP');
      }
    } catch (error) {
      console.error('Error updating MRP:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update MRP' });
    } finally {
      setLoading(false);
    }
  };

  // Calculate MRP change percentage
  const calculateChangePercentage = (newAmount, oldAmount) => {
    if (!oldAmount || oldAmount === 0) return null;
    const change = ((newAmount - oldAmount) / oldAmount) * 100;
    return change.toFixed(2);
  };

  // Get status color for timeline item
  const getTimelineColor = (item) => {
    if (item.is_current) return '#4CAF50'; // Green for current
    if (item.effective_to) return '#9E9E9E'; // Gray for historical
    return '#2196F3'; // Blue for scheduled future
  };

  return (
    <div className="mrp-history">
      <div className="header-section">
        <h2>MRP History Management</h2>
        <button 
          className="btn-primary" 
          onClick={handleOpenAddModal}
          disabled={!selectedSKU}
        >
          + Add New MRP
        </button>
      </div>

      {message.text && (
        <div className={`alert ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="close-alert">×</button>
        </div>
      )}

      {/* SKU Selection */}
      <div className="selection-section">
        <div className="form-group">
          <label>Select SKU:</label>
          <select value={selectedSKU} onChange={handleSKUChange} className="sku-select">
            <option value="">-- Select SKU --</option>
            {skuList.map(sku => (
              <option key={sku.sku_id} value={sku.sku_id}>
                {sku.sku_code} - {sku.product_name} ({sku.oil_type}, {sku.package_size})
              </option>
            ))}
          </select>
        </div>

        {selectedSKUData && (
          <div className="sku-info-panel">
            <div className="info-grid">
              <div className="info-item">
                <label>Product:</label>
                <span>{selectedSKUData.product_name}</span>
              </div>
              <div className="info-item">
                <label>Current MRP:</label>
                <span className="mrp-amount current">{formatUtils.currency(selectedSKUData.mrp_current)}</span>
              </div>
              <div className="info-item">
                <label>Effective Date:</label>
                <span>{skuDateUtils.formatDateForDisplay(selectedSKUData.mrp_effective_date)}</span>
              </div>
              <div className="info-item">
                <label>Shelf Life:</label>
                <span>{selectedSKUData.shelf_life_months || 'N/A'} months</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MRP History Timeline */}
      {selectedSKU && (
        <div className="history-section">
          <h3>MRP Change History</h3>
          
          {loadingHistory ? (
            <div className="loading">Loading MRP history...</div>
          ) : mrpHistory.length === 0 ? (
            <div className="no-data">
              <p>No MRP history found for this SKU.</p>
              <p>Click "Add New MRP" to create the first MRP record.</p>
            </div>
          ) : (
            <div className="timeline-container">
              {mrpHistory.map((item, index) => {
                const prevItem = mrpHistory[index + 1];
                const changePercent = prevItem ? 
                  calculateChangePercentage(item.mrp_amount, prevItem.mrp_amount) : null;
                
                return (
                  <div key={item.mrp_id} className="timeline-item">
                    <div 
                      className="timeline-marker" 
                      style={{ backgroundColor: getTimelineColor(item) }}
                    >
                      {item.is_current && <span className="current-indicator">✓</span>}
                    </div>
                    
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <div className="mrp-info">
                          <span className="mrp-amount">{formatUtils.currency(item.mrp_amount)}</span>
                          {changePercent && (
                            <span className={`change-percent ${parseFloat(changePercent) > 0 ? 'increase' : 'decrease'}`}>
                              {parseFloat(changePercent) > 0 ? '↑' : '↓'} {Math.abs(changePercent)}%
                            </span>
                          )}
                          {item.is_current && <span className="current-badge">CURRENT</span>}
                        </div>
                        <div className="timeline-date">
                          {skuDateUtils.formatDateForDisplay(item.effective_from)}
                        </div>
                      </div>
                      
                      <div className="timeline-details">
                        <p className="change-reason">{item.change_reason || 'No reason provided'}</p>
                        <div className="meta-info">
                          <span className="changed-by">Changed by: {item.changed_by || 'System'}</span>
                          {item.effective_to && (
                            <span className="effective-to">
                              Valid until: {skuDateUtils.formatDateForDisplay(item.effective_to)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add New MRP Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add New MRP</h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>
            
            <form onSubmit={handleSubmitNewMRP} className="modal-body">
              <div className="form-info">
                <p><strong>SKU:</strong> {selectedSKUData?.sku_code} - {selectedSKUData?.product_name}</p>
                <p><strong>Current MRP:</strong> {formatUtils.currency(currentMRP?.mrp_amount || selectedSKUData?.mrp_current)}</p>
              </div>
              
              <div className="form-group">
                <label>New MRP Amount (₹) <span className="required">*</span></label>
                <input
                  type="number"
                  name="mrp_amount"
                  value={newMRP.mrp_amount}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  max="10000"
                  className={errors.mrp_amount ? 'error' : ''}
                  placeholder="Enter new MRP amount"
                />
                {errors.mrp_amount && <span className="error-text">{errors.mrp_amount}</span>}
                {newMRP.mrp_amount && currentMRP?.mrp_amount && (
                  <span className="info-text">
                    Change: {calculateChangePercentage(newMRP.mrp_amount, currentMRP.mrp_amount)}%
                  </span>
                )}
              </div>
              
              <div className="form-group">
                <label>Effective From Date <span className="required">*</span></label>
                <input
                  type="date"
                  name="effective_from"
                  value={newMRP.effective_from}
                  onChange={handleInputChange}
                  className={errors.effective_from ? 'error' : ''}
                  min={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  max={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                />
                {errors.effective_from && <span className="error-text">{errors.effective_from}</span>}
                <span className="info-text">Date will be displayed as DD-MM-YYYY</span>
              </div>
              
              <div className="form-group">
                <label>Change Reason <span className="required">*</span></label>
                <textarea
                  name="change_reason"
                  value={newMRP.change_reason}
                  onChange={handleInputChange}
                  rows="3"
                  className={errors.change_reason ? 'error' : ''}
                  placeholder="Provide a detailed reason for the MRP change (minimum 10 characters)"
                />
                {errors.change_reason && <span className="error-text">{errors.change_reason}</span>}
                <span className="info-text">
                  {newMRP.change_reason.length}/100 characters
                </span>
              </div>
              
              <div className="form-group">
                <label>Changed By</label>
                <input
                  type="text"
                  name="changed_by"
                  value={newMRP.changed_by}
                  onChange={handleInputChange}
                  placeholder="Enter your name"
                />
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Updating...' : 'Update MRP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .mrp-history {
          padding: 20px;
        }

        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .header-section h2 {
          margin: 0;
          color: #2c3e50;
        }

        .alert {
          padding: 12px 40px 12px 20px;
          border-radius: 4px;
          margin-bottom: 20px;
          position: relative;
        }

        .alert.success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .alert.error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .alert.warning {
          background: #fff3cd;
          color: #856404;
          border: 1px solid #ffeaa7;
        }

        .close-alert {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: inherit;
        }

        .selection-section {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #555;
          font-weight: 500;
          font-size: 14px;
        }

        .sku-select {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .sku-info-panel {
          margin-top: 20px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 6px;
          border-left: 4px solid #4CAF50;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
        }

        .info-item label {
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
        }

        .info-item span {
          font-size: 14px;
          color: #333;
          font-weight: 500;
        }

        .mrp-amount.current {
          color: #4CAF50;
          font-size: 18px;
          font-weight: bold;
        }

        .history-section {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .history-section h3 {
          margin: 0 0 20px 0;
          color: #2c3e50;
        }

        .loading {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .no-data {
          text-align: center;
          padding: 40px;
          color: #999;
        }

        .no-data p {
          margin: 10px 0;
        }

        /* Timeline Styles */
        .timeline-container {
          position: relative;
          padding-left: 40px;
        }

        .timeline-container::before {
          content: '';
          position: absolute;
          left: 20px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: #e0e0e0;
        }

        .timeline-item {
          position: relative;
          margin-bottom: 30px;
        }

        .timeline-marker {
          position: absolute;
          left: -30px;
          top: 0;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #2196F3;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .current-indicator {
          color: white;
          font-size: 12px;
          font-weight: bold;
        }

        .timeline-content {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 15px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .mrp-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .mrp-amount {
          font-size: 20px;
          font-weight: bold;
          color: #2c3e50;
        }

        .change-percent {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .change-percent.increase {
          background: #ffebee;
          color: #c62828;
        }

        .change-percent.decrease {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .current-badge {
          background: #4CAF50;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: bold;
        }

        .timeline-date {
          color: #666;
          font-size: 14px;
        }

        .timeline-details {
          margin-top: 10px;
        }

        .change-reason {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 14px;
          line-height: 1.4;
        }

        .meta-info {
          display: flex;
          gap: 20px;
          font-size: 12px;
          color: #999;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e0e0e0;
        }

        .modal-header h3 {
          margin: 0;
          color: #2c3e50;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: #999;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          color: #333;
        }

        .modal-body {
          padding: 20px;
        }

        .form-info {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
        }

        .form-info p {
          margin: 5px 0;
          color: #555;
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .form-group input.error,
        .form-group textarea.error {
          border-color: #f44336;
        }

        .form-group textarea {
          resize: vertical;
        }

        .required {
          color: #f44336;
        }

        .error-text {
          color: #f44336;
          font-size: 12px;
          margin-top: 4px;
          display: block;
        }

        .info-text {
          color: #2196F3;
          font-size: 12px;
          margin-top: 4px;
          display: block;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 20px;
          border-top: 1px solid #e0e0e0;
        }

        .btn-primary,
        .btn-cancel {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          transition: background 0.2s;
        }

        .btn-primary {
          background: #4CAF50;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #45a049;
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-cancel {
          background: #f5f5f5;
          color: #333;
        }

        .btn-cancel:hover {
          background: #e0e0e0;
        }

        @media (max-width: 768px) {
          .info-grid {
            grid-template-columns: 1fr;
          }
          
          .timeline-container {
            padding-left: 30px;
          }
          
          .timeline-marker {
            left: -20px;
          }
          
          .modal-content {
            width: 95%;
          }
        }
      `}</style>
    </div>
  );
};

export default MRPHistory;
