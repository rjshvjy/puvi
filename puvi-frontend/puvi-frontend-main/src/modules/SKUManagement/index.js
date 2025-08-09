// File Path: puvi-frontend/src/modules/SKUManagement/index.js
// Main SKU Management Module with Complete Tab Navigation
// Integrates all SKU components including MRP & Expiry features

import React, { useState } from 'react';
import SKUMaster from './components/SKUMaster';
import BOMConfig from './components/BOMConfig';
import ProductionEntry from './components/ProductionEntry';
import ProductionHistory from './components/ProductionHistory';
import MRPHistory from './components/MRPHistory';
import ProductionSummaryReport from './components/ProductionSummaryReport';
import ExpiryAlert from './components/ExpiryAlert';
import './SKUManagement.css';

const SKUManagement = () => {
  const [activeTab, setActiveTab] = useState('sku-master');
  
  // Tab configuration with all components
  const tabs = [
    {
      id: 'sku-master',
      label: 'SKU Master',
      icon: '📦',
      component: SKUMaster,
      description: 'Manage SKUs with MRP and shelf life'
    },
    {
      id: 'bom',
      label: 'BOM Configuration',
      icon: '📋',
      component: BOMConfig,
      description: 'Configure Bill of Materials'
    },
    {
      id: 'production',
      label: 'Production Entry',
      icon: '🏭',
      component: ProductionEntry,
      description: 'Record new SKU production'
    },
    {
      id: 'history',
      label: 'Production History',
      icon: '📊',
      component: ProductionHistory,
      description: 'View past productions'
    },
    {
      id: 'mrp-history',
      label: 'MRP History',
      icon: '💰',
      component: MRPHistory,
      description: 'Track MRP changes over time'
    },
    {
      id: 'production-report',
      label: 'Production Report',
      icon: '📄',
      component: ProductionSummaryReport,
      description: 'Generate printable production reports'
    },
    {
      id: 'expiry-alert',
      label: 'Expiry Alerts',
      icon: '⚠️',
      component: ExpiryAlert,
      description: 'Monitor product expiry dates'
    }
  ];
  
  // Get active component
  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || SKUMaster;
  
  return (
    <div className="sku-management-container">
      {/* Module Header */}
      <div className="module-header">
        <h1>SKU Management</h1>
        <p className="module-description">
          Complete SKU lifecycle management with MRP tracking, shelf life monitoring, and production control
        </p>
      </div>
      
      {/* Tab Navigation */}
      <div className="tab-navigation">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            title={tab.description}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
            {activeTab === tab.id && (
              <span className="tab-indicator"></span>
            )}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <div className="tab-content">
        <ActiveComponent />
      </div>
      
      {/* Module Footer */}
      <div className="module-footer">
        <div className="footer-info">
          <span>SKU Module v2.0 | Complete MRP & Expiry Management System</span>
          <span className="separator">•</span>
          <span>All Features Active: MRP History | Shelf Life | FEFO | Expiry Alerts | Production Reports</span>
        </div>
      </div>
    </div>
  );
};

export default SKUManagement;
