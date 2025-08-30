// File Path: puvi-frontend/puvi-frontend-main/src/modules/SKUOutbound/index.js
// SKU Outbound Module Main Component

import React, { useState, useEffect } from 'react';
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
    deliveredToday: 0
  });

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
  };

  // Fetch stats (you can implement this later with actual API calls)
  useEffect(() => {
    fetchStats();
  }, [refreshKey]);

  const fetchStats = async () => {
    // Placeholder for actual stats fetching
    // In production, this would call your API
    try {
      // const response = await api.skuOutbound.getStats();
      // setStats(response.stats);
      
      // For now, using placeholder values
      setStats({
        totalTransfers: 12,
        totalSales: 8,
        pendingDeliveries: 3,
        deliveredToday: 2
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

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
        return <OutboundHistory key={refreshKey} />;
    }
  };

  return (
    <div className="sku-outbound-module">
      {/* Module Header */}
      <div className="module-header">
        <h1 className="module-title">SKU Outbound Management</h1>
        <p className="module-subtitle">Manage inventory transfers and sales transactions</p>
      </div>

      {/* Statistics Bar */}
      <div className="module-stats">
        <div className="stat-card">
          <div className="stat-icon transfers">📦</div>
          <div className="stat-content">
            <div className="stat-label">Total Transfers</div>
            <div className="stat-value">{stats.totalTransfers}</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon sales">💰</div>
          <div className="stat-content">
            <div className="stat-label">Total Sales</div>
            <div className="stat-value">{stats.totalSales}</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon pending">⏳</div>
          <div className="stat-content">
            <div className="stat-label">Pending Deliveries</div>
            <div className="stat-value">{stats.pendingDeliveries}</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon delivered">✅</div>
          <div className="stat-content">
            <div className="stat-label">Delivered Today</div>
            <div className="stat-value">{stats.deliveredToday}</div>
          </div>
        </div>
      </div>

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
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        <div className="content-wrapper">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default SKUOutbound;
