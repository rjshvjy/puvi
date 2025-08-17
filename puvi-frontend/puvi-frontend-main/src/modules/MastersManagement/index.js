// File Path: puvi-frontend/puvi-frontend-main/src/modules/MastersManagement/index.js

import React, { useState } from 'react';
import MastersList from '../../components/Masters/MastersList';
import MasterForm from '../../components/Masters/MasterForm';
import './MastersManagement.css'; // Added CSS import

const MastersManagement = () => {
  const [activeTab, setActiveTab] = useState('suppliers');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const masterTabs = [
    { id: 'suppliers', label: 'Suppliers', icon: '🏢' },
    { id: 'materials', label: 'Materials', icon: '📦' },
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

  return (
    <div className="masters-management-container">
      {/* Tab Navigation - Updated className */}
      <div className="masters-tabs">
        {masterTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`masters-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            <span className="masters-tab-icon">{tab.icon}</span>
            <span className="masters-tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Masters List */}
      <MastersList
        masterType={activeTab}
        onAdd={handleAdd}
        onEdit={handleEdit}
        refreshTrigger={refreshTrigger}
      />

      {/* Master Form Modal */}
      <MasterForm
        masterType={activeTab}
        editData={editData}
        onSave={handleSave}
        onCancel={handleCancel}
        isOpen={showForm}
      />
    </div>
  );
};

export default MastersManagement;
