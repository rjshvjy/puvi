// File Path: puvi-frontend/puvi-frontend-main/src/modules/SKUOutbound/index.js
// SKU Outbound Module Main Component
// Manages tab navigation between OutboundHistory and OutboundEntry

import React, { useState } from 'react';
import OutboundEntry from './OutboundEntry';
import OutboundHistory from './OutboundHistory';
import './SKUOutbound.css';

const SKUOutbound = () => {
  // State management
  const [activeTab, setActiveTab] = useState('history');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Tab configuration
  const tabs = [
    { 
      id: 'history', 
      label: 'Outbound History', 
      icon: '📋',
      description: 'View and manage outbound transactions'
    },
    { 
      id: 'new', 
      label: 'New Outbound', 
      icon: '➕',
      description: 'Create transfer or sales transaction'
    }
  ];

  // Handle successful outbound creation
  const handleOutboundCreated = (outboundData) => {
    // Switch to history tab to see the new entry
    setActiveTab('history');
    // Trigger refresh of history
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle tab change
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  // Render active component based on selected tab
  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'new':
        return (
          <OutboundEntry 
            onSuccess={handleOutboundCreated}
            onCancel={() => setActiveTab('history')}
          />
        );
      
      case 'history':
      default:
        return (
          <OutboundHistory 
            onRefresh={refreshTrigger}
          />
        );
    }
  };

  return (
    <div className="sku-outbound-module">
      {/* Module Header */}
      <div className="module-header">
        <div className="module-title">
          <h1>SKU Outbound Management</h1>
          <p className="module-subtitle">
            Manage inventory transfers and sales transactions
          </p>
        </div>
        
        {/* Quick Stats (optional - can be populated from API) */}
        <div className="module-stats">
          <div className="stat-item">
            <span className="stat-label">Today's Transactions</span>
            <span className="stat-value">-</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Pending Dispatch</span>
            <span className="stat-value">-</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="module-tabs">
        <div className="tabs-container">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <div className="tab-content">
                <span className="tab-label">{tab.label}</span>
                <span className="tab-description">{tab.description}</span>
              </div>
              {/* Show indicator for active tab */}
              {activeTab === tab.id && (
                <div className="tab-indicator"></div>
              )}
            </button>
          ))}
        </div>
        
        {/* Tab Actions (context-sensitive) */}
        <div className="tab-actions">
          {activeTab === 'history' && (
            <button 
              className="action-button primary"
              onClick={() => setActiveTab('new')}
            >
              <span>➕</span> Create New Outbound
            </button>
          )}
          {activeTab === 'new' && (
            <button 
              className="action-button secondary"
              onClick={() => setActiveTab('history')}
            >
              <span>←</span> Back to History
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="module-content">
        <div className="content-wrapper">
          {renderActiveComponent()}
        </div>
      </div>

      {/* Module Footer (optional - for additional info) */}
      <div className="module-footer">
        <div className="footer-info">
          <span className="info-item">
            💡 Tip: Use FEFO allocation for products with expiry dates
          </span>
          <span className="info-item">
            📊 Export history data to CSV for reporting
          </span>
        </div>
      </div>
    </div>
  );
};

export default SKUOutbound;
