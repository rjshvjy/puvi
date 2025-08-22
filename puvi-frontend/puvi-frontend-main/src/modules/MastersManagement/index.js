// File Path: puvi-frontend/puvi-frontend-main/src/modules/MastersManagement/index.js
// Masters Management Module with Categories and Subcategories Support
// Updated to include Oil Types & Blends management via subcategories
// MODIFIED: Added Package Sizes and UOM Management tabs

import React, { useState } from 'react';
import MastersList from '../../components/Masters/MastersList';
import MasterForm from '../../components/Masters/MasterForm';
import SubcategoriesList from '../../components/Masters/SubcategoriesList';
import SubcategoryForm from '../../components/Masters/SubcategoryForm';
import OilConfigurationDashboard from '../../components/Masters/OilConfigurationDashboard';
import PackageSizeManager from './components/PackageSizeManager';
import './MastersManagement.css';

const MastersManagement = () => {
  const [activeTab, setActiveTab] = useState('suppliers');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showOilConfig, setShowOilConfig] = useState(false);

  // Extended tabs to include package sizes and UOM
  const masterTabs = [
    { id: 'suppliers', label: 'Suppliers', icon: '🏢' },
    { id: 'materials', label: 'Materials', icon: '📦' },
    { id: 'categories', label: 'Categories', icon: '📂' },
    { id: 'package_sizes', label: 'Package Sizes', icon: '📏' },
    { id: 'uom', label: 'UOM', icon: '📐' },
    { id: 'subcategories', label: 'Oil Types & Blends', icon: '🛢️' },
    { id: 'tags', label: 'Tags', icon: '🏷️' },
    { id: 'writeoff_reasons', label: 'Writeoff Reasons', icon: '❌' },
    { id: 'cost_elements', label: 'Cost Elements', icon: '💰' }
  ];

  const handleAdd = () => {
    setEditData(null);
    setShowForm(true);
  };

  const handleEdit = (record) => {
    setEditData(record);
    setShowForm(true);
  };

  const handleSave = (response) => {
    setShowForm(false);
    setEditData(null);
    setRefreshTrigger(prev => prev + 1); // Refresh list
    // Show success toast
    alert(response.message || 'Saved successfully!');
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditData(null);
  };

  const handleOilConfigClose = () => {
    setShowOilConfig(false);
    setRefreshTrigger(prev => prev + 1); // Refresh lists after config changes
  };

  // Render appropriate list component based on active tab
  const renderListComponent = () => {
    // Show Oil Configuration Dashboard if active
    if (showOilConfig) {
      return (
        <div style={{ position: 'relative' }}>
          {/* Back button */}
          <div style={{ 
            marginBottom: '20px',
            padding: '10px',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <button
              onClick={handleOilConfigClose}
              className="masters-btn masters-btn-secondary"
              style={{
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              ← Back to Subcategories
            </button>
            <span style={{ color: '#6b7280' }}>
              Configure oil type mappings for production chain
            </span>
          </div>
          <OilConfigurationDashboard />
        </div>
      );
    }

    // Special handling for package_sizes
    if (activeTab === 'package_sizes') {
      return <PackageSizeManager />;
    }

    // Special handling for UOM
    if (activeTab === 'uom') {
      // UOM will use the generic MastersList with special configuration
      return (
        <MastersList
          masterType="uom"
          onAdd={handleAdd}
          onEdit={handleEdit}
          refreshTrigger={refreshTrigger}
        />
      );
    }

    // Special handling for subcategories which use different endpoints
    if (activeTab === 'subcategories') {
      return (
        <div>
          {/* Oil Configuration Section */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            padding: '16px',
            backgroundColor: '#fef3c7',
            borderRadius: '8px',
            border: '1px solid #f59e0b'
          }}>
            <div>
              <h3 style={{ margin: 0, color: '#92400e' }}>
                🛢️ Oil Types & Blends Configuration
              </h3>
              <p style={{ 
                color: '#78350f', 
                fontSize: '14px', 
                marginTop: '4px',
                marginBottom: 0
              }}>
                Manage oil types and product subcategories. Configure seed-to-oil mappings for production.
              </p>
            </div>
            <button
              onClick={() => setShowOilConfig(true)}
              className="masters-btn masters-btn-primary"
              style={{
                backgroundColor: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#d97706';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#f59e0b';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              🔧 Oil Configuration Manager
            </button>
          </div>

          {/* Existing SubcategoriesList component */}
          <SubcategoriesList
            onAdd={handleAdd}
            onEdit={handleEdit}
            refreshTrigger={refreshTrigger}
          />
        </div>
      );
    }
    
    // Special handling for categories which use different endpoints
    if (activeTab === 'categories') {
      // For now, use regular MastersList but it will need special handling
      // or we can create a CategoriesList component
      return (
        <div className="masters-list-container">
          <div className="masters-empty">
            <div className="masters-empty-icon">📂</div>
            <div className="masters-empty-text">
              Categories management coming soon.
              <br />
              <small>Categories are auto-populated from materials.</small>
            </div>
          </div>
        </div>
      );
    }

    // Default: Use generic MastersList for other master types
    return (
      <MastersList
        masterType={activeTab}
        onAdd={handleAdd}
        onEdit={handleEdit}
        refreshTrigger={refreshTrigger}
      />
    );
  };

  // Render appropriate form component based on active tab
  const renderFormComponent = () => {
    if (!showForm) return null;

    // Special form for subcategories
    if (activeTab === 'subcategories') {
      return (
        <SubcategoryForm
          editData={editData}
          onSave={handleSave}
          onCancel={handleCancel}
          isOpen={showForm}
        />
      );
    }

    // Default: Use generic MasterForm for other types
    return (
      <MasterForm
        masterType={activeTab}
        editData={editData}
        onSave={handleSave}
        onCancel={handleCancel}
        isOpen={showForm}
      />
    );
  };

  return (
    <div className="masters-management-container">
      {/* Tab Navigation */}
      <div className="masters-tabs">
        {masterTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setShowForm(false); // Close any open forms when switching tabs
              setEditData(null);
              setShowOilConfig(false); // Close oil config when switching tabs
            }}
            className={`masters-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            <span className="masters-tab-icon">{tab.icon}</span>
            <span className="masters-tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Dynamic List Component */}
      {renderListComponent()}

      {/* Dynamic Form Component */}
      {renderFormComponent()}
    </div>
  );
};

export default MastersManagement;
