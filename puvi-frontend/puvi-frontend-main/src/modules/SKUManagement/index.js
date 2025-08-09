// File Path: puvi-frontend/src/modules/SKUManagement/index.js
// Main SKU Management Module with Tab Navigation
// Integrates all SKU components

import React, { useState } from 'react';
import BOMConfig from './components/BOMConfig';
import ProductionEntry from './components/ProductionEntry';
import ProductionHistory from './components/ProductionHistory';
import './SKUManagement.css';

const SKUManagement = () => {
  const [activeTab, setActiveTab] = useState('production');
  
  // Tab configuration
  const tabs = [
    {
      id: 'production',
      label: 'Production Entry',
      icon: '🏭',
      component: ProductionEntry,
      description: 'Record new SKU production'
    },
    {
      id: 'bom',
      label: 'BOM Configuration',
      icon: '📋',
      component: BOMConfig,
      description: 'Configure Bill of Materials'
    },
    {
      id: 'history',
      label: 'Production History',
      icon: '📊',
      component: ProductionHistory,
      description: 'View past productions'
    }
  ];
  
  // Get active component
  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || ProductionEntry;
  
  return (
    <div className="sku-management-container">
      {/* Module Header */}
      <div className="module-header">
        <h1>SKU Management</h1>
        <p className="module-description">
          Manage SKU production, configure bill of materials, and track production history
        </p>
      </div>
      
      {/* Tab Navigation */}
      <div className="tab-navigation">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
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
          <span>SKU Module v1.1 | Simplified BOM (No Cartons)</span>
          <span className="separator">•</span>
          <span>Traceability: Material Varieties → Production</span>
        </div>
      </div>
    </div>
  );
};

export default SKUManagement;
