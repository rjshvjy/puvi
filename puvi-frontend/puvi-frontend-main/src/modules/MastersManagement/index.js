import React, { useState } from 'react';
import MastersList from '../../components/Masters/MastersList';
import MasterForm from '../../components/Masters/MasterForm';

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
    <div>
      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4 border-b">
        {masterTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 ${
              activeTab === tab.id 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-600'
            }`}
          >
            {tab.icon} {tab.label}
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
