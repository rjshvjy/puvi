// Expiry Alert Component - Dashboard for monitoring product expiry dates
// File Path: puvi-frontend/src/modules/SKUManagement/components/ExpiryAlert.js

import React, { useState, useEffect } from 'react';
import api, { skuDateUtils, formatUtils, expiryUtils } from '../../../services/api';

const ExpiryAlert = () => {
  // State management
  const [expiryData, setExpiryData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [summary, setSummary] = useState({
    expired: { count: 0, quantity: 0 },
    critical: { count: 0, quantity: 0 },
    warning: { count: 0, quantity: 0 },
    caution: { count: 0, quantity: 0 },
    normal: { count: 0, quantity: 0 }
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    sku_id: '',
    daysThreshold: 90,
    searchTerm: ''
  });
  
  // SKU list for filter dropdown
  const [skuList, setSKUList] = useState([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Refresh interval
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);

  // Fetch data on mount
  useEffect(() => {
    fetchSKUs();
    fetchExpirySummary();
    fetchExpiryAlerts();
  }, []);

  // Apply filters when data or filters change
  useEffect(() => {
    applyFilters();
  }, [expiryData, filters]);

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchExpiryAlerts();
        fetchExpirySummary();
      }, 60000); // Refresh every minute
      setRefreshInterval(interval);
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh]);

  const fetchSKUs = async () => {
    try {
      const response = await api.sku.getMasterList({ is_active: true });
      if (response.success && response.skus) {
        setSKUList(response.skus);
      } else {
        setSKUList([]);
      }
    } catch (error) {
      console.error('Error fetching SKUs:', error);
      setSKUList([]);
    }
  };

  const fetchExpirySummary = async () => {
    try {
      const response = await api.sku.getExpirySummary();
      
      if (response.success && response.summary) {
        setSummary(response.summary);
      } else if (response.summary) {
        setSummary(response.summary);
      }
    } catch (error) {
      console.error('Error fetching expiry summary:', error);
      setMessage({ type: 'error', text: 'Failed to load expiry summary' });
    }
  };

  const fetchExpiryAlerts = async () => {
    setLoading(true);
    try {
      const params = {
        threshold_days: filters.daysThreshold
      };
      
      const response = await api.sku.getExpiryAlerts(params);
      
      if (response.success && response.alerts) {
        // Process alerts to add calculated fields
        const processedAlerts = response.alerts.map(alert => {
          const daysToExpiry = alert.days_to_expiry !== undefined ? 
            alert.days_to_expiry : 
            skuDateUtils.calculateDaysToExpiry(alert.expiry_date);
          
          const status = alert.expiry_status || expiryUtils.getStatus(daysToExpiry);
          
          return {
            ...alert,
            days_to_expiry: daysToExpiry,
            expiry_status: status
          };
        });
        
        // Sort by days to expiry (most urgent first)
        processedAlerts.sort((a, b) => a.days_to_expiry - b.days_to_expiry);
        
        setExpiryData(processedAlerts);
      } else {
        setExpiryData([]);
      }
    } catch (error) {
      console.error('Error fetching expiry alerts:', error);
      setMessage({ type: 'error', text: 'Failed to load expiry alerts' });
      setExpiryData([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...expiryData];
    
    // Status filter
    if (filters.status) {
      filtered = filtered.filter(item => item.expiry_status === filters.status);
    }
    
    // SKU filter
    if (filters.sku_id) {
      filtered = filtered.filter(item => item.sku_id === parseInt(filters.sku_id));
    }
    
    // Search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.production_code?.toLowerCase().includes(searchLower) ||
        item.traceable_code?.toLowerCase().includes(searchLower) ||
        item.sku_code?.toLowerCase().includes(searchLower) ||
        item.product_name?.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredData(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      status: '',
      sku_id: '',
      daysThreshold: 90,
      searchTerm: ''
    });
  };

  const handleRefresh = () => {
    fetchExpiryAlerts();
    fetchExpirySummary();
    setMessage({ type: 'success', text: 'Data refreshed successfully' });
  };

  const handleExportToExcel = () => {
    // Prepare CSV content
    const headers = [
      'Production Code',
      'Traceable Code',
      'SKU Code',
      'Product Name',
      'Package Size',
      'Production Date',
      'Expiry Date',
      'Days to Expiry',
      'Status',
      'Quantity Remaining',
      'MRP'
    ];
    
    const rows = filteredData.map(item => [
      item.production_code || '',
      item.traceable_code || '',
      item.sku_code || '',
      item.product_name || '',
      item.package_size || '',
      skuDateUtils.formatDateForDisplay(item.production_date),
      skuDateUtils.formatDateForDisplay(item.expiry_date),
      item.days_to_expiry || 0,
      item.expiry_status || '',
      item.quantity_remaining || 0,
      item.mrp || 0
    ]);
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expiry_alerts_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    setMessage({ type: 'success', text: 'Exported to CSV successfully' });
  };

  // Get status card style
  const getStatusCardStyle = (status) => {
    const styles = {
      expired: { 
        background: 'linear-gradient(135deg, #FF6B6B 0%, #FF0000 100%)',
        icon: '☠️' 
      },
      critical: { 
        background: 'linear-gradient(135deg, #FF9F43 0%, #FFA500 100%)',
        icon: '🚨' 
      },
      warning: { 
        background: 'linear-gradient(135deg, #FFD93D 0%, #FFFF00 100%)',
        icon: '⚠️' 
      },
      caution: { 
        background: 'linear-gradient(135deg, #FFF5B4 0%, #FFFFE0 100%)',
        icon: '📍' 
      },
      normal: { 
        background: 'linear-gradient(135deg, #6BCF63 0%, #00FF00 100%)',
        icon: '✅' 
      }
    };
    return styles[status] || { background: '#ccc', icon: '❓' };
  };

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="expiry-alert">
      <div className="header-section">
        <h2>Expiry Management Dashboard</h2>
        <div className="header-actions">
          <label className="auto-refresh">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button className="btn-refresh" onClick={handleRefresh}>
            🔄 Refresh
          </button>
          <button 
            className="btn-export" 
            onClick={handleExportToExcel}
            disabled={filteredData.length === 0}
          >
            📊 Export to Excel
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`alert ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="close-alert">×</button>
        </div>
      )}

      {/* Summary Dashboard Cards */}
      <div className="summary-dashboard">
        {Object.entries(summary).map(([status, data]) => {
          const style = getStatusCardStyle(status);
          return (
            <div 
              key={status}
              className={`status-card ${status}`}
              style={{ background: style.background }}
              onClick={() => handleFilterChange('status', status)}
            >
              <div className="card-icon">{style.icon}</div>
              <div className="card-content">
                <h3>{status.charAt(0).toUpperCase() + status.slice(1)}</h3>
                <div className="card-stats">
                  <div className="stat">
                    <span className="stat-value">{data.count}</span>
                    <span className="stat-label">Items</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{data.quantity}</span>
                    <span className="stat-label">Bottles</span>
                  </div>
                </div>
                {status === 'expired' && data.count > 0 && (
                  <div className="card-alert">Immediate action required!</div>
                )}
                {status === 'critical' && data.count > 0 && (
                  <div className="card-alert">Expiring within 30 days</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="filter-row">
          <div className="filter-group">
            <label>Status Filter:</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="expired">Expired</option>
              <option value="critical">Critical (≤30 days)</option>
              <option value="warning">Warning (31-60 days)</option>
              <option value="caution">Caution (61-90 days)</option>
              <option value="normal">Normal (>90 days)</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>SKU:</label>
            <select
              value={filters.sku_id}
              onChange={(e) => handleFilterChange('sku_id', e.target.value)}
            >
              <option value="">All SKUs</option>
              {skuList.map(sku => (
                <option key={sku.sku_id} value={sku.sku_id}>
                  {sku.sku_code} - {sku.product_name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Days Threshold:</label>
            <input
              type="number"
              value={filters.daysThreshold}
              onChange={(e) => handleFilterChange('daysThreshold', e.target.value)}
              min="1"
              max="365"
            />
          </div>
          
          <div className="filter-group search-group">
            <label>Search:</label>
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              placeholder="Search by code or product..."
            />
          </div>
          
          <button className="btn-clear" onClick={handleClearFilters}>
            Clear Filters
          </button>
        </div>
      </div>

      {/* Expiry Alerts Table */}
      <div className="alerts-table-section">
        <h3>Expiry Alerts Detail ({filteredData.length} items)</h3>
        
        {loading ? (
          <div className="loading">Loading expiry alerts...</div>
        ) : currentItems.length === 0 ? (
          <div className="no-data">
            {expiryData.length === 0 
              ? "No production items found in the system."
              : "No items match the current filters."}
          </div>
        ) : (
          <>
            <table className="alerts-table">
              <thead>
                <tr>
                  <th>Production Code</th>
                  <th>Traceable Code</th>
                  <th>Product</th>
                  <th>Package</th>
                  <th>Production Date</th>
                  <th>Expiry Date</th>
                  <th>Days to Expiry</th>
                  <th>Status</th>
                  <th>Qty Remaining</th>
                  <th>MRP</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((item, index) => (
                  <tr 
                    key={index} 
                    className={`expiry-row ${item.expiry_status}`}
                  >
                    <td className="code-cell">{item.production_code}</td>
                    <td className="code-cell">{item.traceable_code}</td>
                    <td>{item.product_name}</td>
                    <td>{item.package_size}</td>
                    <td>{skuDateUtils.formatDateForDisplay(item.production_date)}</td>
                    <td className="expiry-date">
                      {skuDateUtils.formatDateForDisplay(item.expiry_date)}
                    </td>
                    <td className="days-cell">
                      <span className={`days-badge ${item.expiry_status}`}>
                        {item.days_to_expiry > 0 ? 
                          `${item.days_to_expiry} days` : 
                          item.days_to_expiry === 0 ? 
                          'Today' : 
                          `${Math.abs(item.days_to_expiry)} days ago`
                        }
                      </span>
                    </td>
                    <td>
                      <span 
                        className="status-badge"
                        style={{
                          backgroundColor: expiryUtils.getStatusColor(item.expiry_status),
                          color: item.expiry_status === 'warning' || item.expiry_status === 'caution' ? '#000' : '#fff'
                        }}
                      >
                        {item.expiry_status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="quantity-cell">{item.quantity_remaining || 0}</td>
                    <td className="mrp-cell">{formatUtils.currency(item.mrp)}</td>
                    <td className="actions-cell">
                      {item.expiry_status === 'expired' && (
                        <button 
                          className="btn-action writeoff"
                          title="Write off expired stock"
                        >
                          Write Off
                        </button>
                      )}
                      {(item.expiry_status === 'critical' || item.expiry_status === 'warning') && (
                        <button 
                          className="btn-action priority"
                          title="Mark for priority sale"
                        >
                          Priority
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  Previous
                </button>
                
                <span className="pagination-info">
                  Page {currentPage} of {totalPages} | Total: {filteredData.length} items
                </span>
                
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Summary Statistics */}
      <div className="statistics-section">
        <h3>Summary Statistics</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <label>Total Items Monitored:</label>
            <span className="stat-value">{expiryData.length}</span>
          </div>
          <div className="stat-item">
            <label>Urgent Action Required:</label>
            <span className="stat-value urgent">
              {summary.expired.count + summary.critical.count}
            </span>
          </div>
          <div className="stat-item">
            <label>Total Bottles at Risk:</label>
            <span className="stat-value">
              {summary.expired.quantity + summary.critical.quantity + summary.warning.quantity}
            </span>
          </div>
          <div className="stat-item">
            <label>Average Days to Expiry:</label>
            <span className="stat-value">
              {expiryData.length > 0 
                ? Math.round(expiryData.reduce((sum, item) => sum + (item.days_to_expiry || 0), 0) / expiryData.length)
                : 0} days
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .expiry-alert {
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

        .header-actions {
          display: flex;
          gap: 15px;
          align-items: center;
        }

        .auto-refresh {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 14px;
          color: #666;
        }

        .auto-refresh input {
          cursor: pointer;
        }

        .btn-refresh,
        .btn-export {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: background 0.2s;
        }

        .btn-refresh {
          background: #2196F3;
          color: white;
        }

        .btn-refresh:hover {
          background: #1976D2;
        }

        .btn-export {
          background: #4CAF50;
          color: white;
        }

        .btn-export:hover:not(:disabled) {
          background: #45a049;
        }

        .btn-export:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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

        /* Summary Dashboard */
        .summary-dashboard {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .status-card {
          border-radius: 12px;
          padding: 20px;
          color: white;
          cursor: pointer;
          transition: transform 0.3s, box-shadow 0.3s;
          position: relative;
          overflow: hidden;
        }

        .status-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.2);
        }

        .status-card.expired {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.8; }
          100% { opacity: 1; }
        }

        .card-icon {
          font-size: 36px;
          margin-bottom: 10px;
        }

        .card-content h3 {
          margin: 0 0 15px 0;
          font-size: 18px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .card-stats {
          display: flex;
          justify-content: space-around;
        }

        .stat {
          text-align: center;
        }

        .stat-value {
          display: block;
          font-size: 24px;
          font-weight: bold;
        }

        .stat-label {
          display: block;
          font-size: 12px;
          opacity: 0.9;
          margin-top: 5px;
        }

        .card-alert {
          position: absolute;
          bottom: 10px;
          right: 10px;
          font-size: 11px;
          background: rgba(255,255,255,0.2);
          padding: 4px 8px;
          border-radius: 4px;
        }

        /* Filters Section */
        .filters-section {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .filter-row {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
          align-items: flex-end;
        }

        .filter-group {
          flex: 1;
          min-width: 150px;
        }

        .search-group {
          flex: 2;
        }

        .filter-group label {
          display: block;
          margin-bottom: 5px;
          color: #555;
          font-weight: 500;
          font-size: 14px;
        }

        .filter-group input,
        .filter-group select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .btn-clear {
          padding: 8px 16px;
          background: #f44336;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          white-space: nowrap;
        }

        .btn-clear:hover {
          background: #d32f2f;
        }

        /* Alerts Table */
        .alerts-table-section {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }

        .alerts-table-section h3 {
          margin: 0 0 20px 0;
          color: #2c3e50;
        }

        .loading,
        .no-data {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .alerts-table {
          width: 100%;
          border-collapse: collapse;
        }

        .alerts-table th,
        .alerts-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e0e0e0;
        }

        .alerts-table th {
          background: #f5f5f5;
          font-weight: 600;
          color: #555;
          font-size: 14px;
          position: sticky;
          top: 0;
        }

        .alerts-table tbody tr:hover {
          background: #f8f9fa;
        }

        .expiry-row.expired {
          background: #ffebee;
        }

        .expiry-row.critical {
          background: #fff3e0;
        }

        .expiry-row.warning {
          background: #fff9c4;
        }

        .expiry-row.caution {
          background: #fffde7;
        }

        .code-cell {
          font-family: monospace;
          font-weight: 500;
        }

        .expiry-date {
          font-weight: 500;
        }

        .days-cell {
          text-align: center;
        }

        .days-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .days-badge.expired {
          background: #ff5252;
          color: white;
        }

        .days-badge.critical {
          background: #ff9800;
          color: white;
        }

        .days-badge.warning {
          background: #ffc107;
          color: black;
        }

        .days-badge.caution {
          background: #ffeb3b;
          color: black;
        }

        .days-badge.normal {
          background: #4caf50;
          color: white;
        }

        .status-badge {
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: bold;
        }

        .quantity-cell,
        .mrp-cell {
          text-align: right;
        }

        .actions-cell {
          display: flex;
          gap: 5px;
        }

        .btn-action {
          padding: 4px 8px;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
        }

        .btn-action.writeoff {
          background: #f44336;
          color: white;
        }

        .btn-action.priority {
          background: #ff9800;
          color: white;
        }

        .btn-action:hover {
          opacity: 0.8;
        }

        /* Pagination */
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 20px;
          margin-top: 20px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 4px;
        }

        .pagination-btn {
          padding: 8px 16px;
          background: #2196F3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }

        .pagination-btn:hover:not(:disabled) {
          background: #1976D2;
        }

        .pagination-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .pagination-info {
          color: #666;
          font-size: 14px;
        }

        /* Statistics Section */
        .statistics-section {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .statistics-section h3 {
          margin: 0 0 20px 0;
          color: #2c3e50;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }

        .stat-item {
          padding: 15px;
          background: #f8f9fa;
          border-radius: 6px;
          border-left: 4px solid #2196F3;
        }

        .stat-item label {
          display: block;
          color: #666;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .stat-item .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #2c3e50;
        }

        .stat-value.urgent {
          color: #f44336;
        }

        @media (max-width: 768px) {
          .header-section {
            flex-direction: column;
            gap: 15px;
          }

          .header-actions {
            width: 100%;
            justify-content: space-between;
          }

          .filter-row {
            flex-direction: column;
          }

          .filter-group {
            width: 100%;
          }

          .summary-dashboard {
            grid-template-columns: 1fr;
          }

          .alerts-table {
            font-size: 12px;
          }

          .alerts-table th,
          .alerts-table td {
            padding: 8px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default ExpiryAlert;
