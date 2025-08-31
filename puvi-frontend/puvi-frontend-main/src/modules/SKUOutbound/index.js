// File Path: puvi-frontend/puvi-frontend-main/src/modules/SKUOutbound/index.js
// SKU Outbound Module Main Component - ALIGNED WITH BACKEND

import React, { useState, useEffect, useCallback } from 'react';
import OutboundEntry from './OutboundEntry';
import OutboundHistory from './OutboundHistory';
import './SKUOutbound.css';

const SKUOutbound = () => {
  const [activeTab, setActiveTab] = useState('history');
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState({
    totalTransfers: 0,
    totalSales: 0,
    pendingDeliveries: 0,
    deliveredToday: 0,
    monthlySalesValue: 0,
    monthlyUnitsSold: 0,
    activeCustomers: 0,
    locationsPending: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Get API base URL from environment or use Render backend
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://puvi-backend.onrender.com';

  // Tab configuration
  const tabs = [
    { id: 'history', label: 'Outbound History', icon: '📋' },
    { id: 'new', label: 'New Outbound', icon: '➕' }
  ];

  // Handle tab change
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  // Handle refresh after successful creation
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    // Switch to history tab after successful creation
    setActiveTab('history');
    // Refresh stats as well
    fetchStats();
  };

  // Fetch real stats from database - ALIGNED WITH BACKEND
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Direct API call matching backend endpoint structure
      const response = await fetch(`${API_BASE_URL}/api/sku/outbound/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add auth token if you have authentication
          // 'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Match the exact structure from backend
      if (data.success) {
        const statsData = data.stats;
        setStats({
          totalTransfers: statsData.totalTransfers || 0,
          totalSales: statsData.totalSales || 0,
          pendingDeliveries: statsData.pendingDeliveries || 0,
          deliveredToday: statsData.deliveredToday || 0,
          monthlySalesValue: statsData.monthlySalesValue || 0,
          monthlyUnitsSold: statsData.monthlyUnitsSold || 0,
          activeCustomers: statsData.activeCustomers || 0,
          locationsPending: statsData.locationsPending || 0
        });
        
        // Use timestamp from backend if provided
        if (data.timestamp) {
          setLastUpdated(new Date(data.timestamp));
        } else {
          setLastUpdated(new Date());
        }
      } else {
        throw new Error(data.error || 'Failed to fetch stats');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      
      // Set user-friendly error message
      if (error.message.includes('404')) {
        setError('Stats endpoint not found. Please ensure backend is updated.');
      } else if (error.message.includes('500')) {
        setError('Server error. Please try again later.');
      } else if (error.message.includes('Failed to fetch')) {
        setError('Cannot connect to server. Please check if backend is running on ' + API_BASE_URL);
      } else {
        setError(error.message || 'An unexpected error occurred');
      }
      
      // Keep previous values if they exist, otherwise set to 0
      setStats(prev => ({
        totalTransfers: prev.totalTransfers || 0,
        totalSales: prev.totalSales || 0,
        pendingDeliveries: prev.pendingDeliveries || 0,
        deliveredToday: prev.deliveredToday || 0,
        monthlySalesValue: prev.monthlySalesValue || 0,
        monthlyUnitsSold: prev.monthlyUnitsSold || 0,
        activeCustomers: prev.activeCustomers || 0,
        locationsPending: prev.locationsPending || 0
      }));
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  // Fetch stats on component mount and when refreshKey changes
  useEffect(() => {
    fetchStats();
    
    // Set up auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(() => {
      fetchStats();
    }, 30000);
    
    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [refreshKey, fetchStats]);

  // Render the active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'new':
        return (
          <OutboundEntry 
            onSuccess={handleRefresh}
            onCancel={() => setActiveTab('history')}
          />
        );
      case 'history':
        return (
          <OutboundHistory 
            key={refreshKey}
            onRefresh={handleRefresh}
          />
        );
      default:
        return <OutboundHistory key={refreshKey} onRefresh={handleRefresh} />;
    }
  };

  // Format numbers with Indian comma system
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  // Format currency with Indian Rupee symbol
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format last updated time
  const formatLastUpdated = () => {
    if (!lastUpdated) return null;
    
    const now = new Date();
    const diff = Math.floor((now - lastUpdated) / 1000); // seconds
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return lastUpdated.toLocaleTimeString();
  };

  return (
    <div className="sku-outbound-module">
      {/* Module Header */}
      <div className="module-header">
        <h1 className="module-title">SKU Outbound Management</h1>
        <p className="module-subtitle">
          Manage inventory transfers and sales transactions
          {lastUpdated && (
            <span style={{ marginLeft: '10px', fontSize: '12px', color: '#95a5a6' }}>
              (Updated: {formatLastUpdated()})
            </span>
          )}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          background: '#fff5f5',
          border: '1px solid #ffcccc',
          color: '#cc0000',
          padding: '12px 15px',
          borderRadius: '6px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ marginRight: '10px' }}>⚠️</span>
            <span>{error}</span>
          </div>
          <button 
            onClick={fetchStats}
            style={{
              background: '#cc0000',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Statistics Bar */}
      <div className="module-stats">
        <div className="stat-card">
          <div className="stat-icon transfers">📦</div>
          <div className="stat-content">
            <div className="stat-label">Total Transfers</div>
            <div className="stat-value">
              {loading ? (
                <span style={{ fontSize: '14px', color: '#95a5a6' }}>Loading...</span>
              ) : (
                formatNumber(stats.totalTransfers)
              )}
            </div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon sales">💰</div>
          <div className="stat-content">
            <div className="stat-label">Total Sales</div>
            <div className="stat-value">
              {loading ? (
                <span style={{ fontSize: '14px', color: '#95a5a6' }}>Loading...</span>
              ) : (
                formatNumber(stats.totalSales)
              )}
            </div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon pending">⏳</div>
          <div className="stat-content">
            <div className="stat-label">Pending Deliveries</div>
            <div className="stat-value">
              {loading ? (
                <span style={{ fontSize: '14px', color: '#95a5a6' }}>Loading...</span>
              ) : (
                formatNumber(stats.pendingDeliveries)
              )}
            </div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon delivered">✅</div>
          <div className="stat-content">
            <div className="stat-label">Delivered Today</div>
            <div className="stat-value">
              {loading ? (
                <span style={{ fontSize: '14px', color: '#95a5a6' }}>Loading...</span>
              ) : (
                formatNumber(stats.deliveredToday)
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats Row (if we have monthly data) */}
      {(stats.monthlySalesValue > 0 || stats.monthlyUnitsSold > 0 || 
        stats.activeCustomers > 0 || stats.locationsPending > 0) && (
        <div className="module-stats" style={{ marginTop: '15px' }}>
          {stats.monthlySalesValue > 0 && (
            <div className="stat-card">
              <div className="stat-icon sales">📈</div>
              <div className="stat-content">
                <div className="stat-label">Monthly Sales Value</div>
                <div className="stat-value" style={{ fontSize: '18px' }}>
                  {formatCurrency(stats.monthlySalesValue)}
                </div>
              </div>
            </div>
          )}
          
          {stats.monthlyUnitsSold > 0 && (
            <div className="stat-card">
              <div className="stat-icon sales">📊</div>
              <div className="stat-content">
                <div className="stat-label">Units Sold (Month)</div>
                <div className="stat-value">
                  {formatNumber(stats.monthlyUnitsSold)}
                </div>
              </div>
            </div>
          )}
          
          {stats.activeCustomers > 0 && (
            <div className="stat-card">
              <div className="stat-icon transfers">👥</div>
              <div className="stat-content">
                <div className="stat-label">Active Customers</div>
                <div className="stat-value">
                  {formatNumber(stats.activeCustomers)}
                </div>
              </div>
            </div>
          )}
          
          {stats.locationsPending > 0 && (
            <div className="stat-card">
              <div className="stat-icon pending">📍</div>
              <div className="stat-content">
                <div className="stat-label">Locations Pending</div>
                <div className="stat-value">
                  {formatNumber(stats.locationsPending)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
        
        {/* Add Refresh Button */}
        <button
          className="tab-button"
          onClick={fetchStats}
          disabled={loading}
          style={{ marginLeft: 'auto' }}
          title="Refresh Statistics"
        >
          <span className="tab-icon" style={{
            display: 'inline-block',
            animation: loading ? 'spin 1s linear infinite' : 'none'
          }}>
            🔄
          </span>
          <span className="tab-label">
            {loading ? 'Refreshing...' : 'Refresh'}
          </span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        <div className="content-wrapper">
          {renderTabContent()}
        </div>
      </div>
      
      {/* Add CSS for spinner animation */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SKUOutbound;
