// File Path: puvi-frontend/puvi-frontend-main/src/modules/MastersManagement/index.js
// Masters Management Module with Categories and Subcategories Support
// Updated to include Oil Types & Blends management via subcategories

import React, { useState } from 'react';
import MastersList from '../../components/Masters/MastersList';
import MasterForm from '../../components/Masters/MasterForm';
import SubcategoriesList from '../../components/Masters/SubcategoriesList';
import SubcategoryForm from '../../components/Masters/SubcategoryForm';
import './MastersManagement.css';

const MastersManagement = () => {
  const [activeTab, setActiveTab] = useState('suppliers');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  // Extended tabs to include categories and subcategories
  const masterTabs = [
    { id: 'suppliers', label: 'Suppliers', icon: '🏢' },
    { id: 'materials', label: 'Materials', icon: '📦' },
    { id: 'categories', label: 'Categories', icon: '📂' },
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

  // Render appropriate list component based on active tab
  const renderListComponent = () => {
    // Special handling for subcategories which use different endpoints
    if (activeTab === 'subcategories') {
      return (
        <SubcategoriesList
          onAdd={handleAdd}
          onEdit={handleEdit}
          refreshTrigger={refreshTrigger}
        />
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
