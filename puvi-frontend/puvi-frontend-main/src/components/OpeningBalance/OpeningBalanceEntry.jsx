// OpeningBalanceEntry.jsx - Material opening balance entry and management
// File Path: puvi-frontend/puvi-frontend-main/src/components/OpeningBalance/OpeningBalanceEntry.jsx
// Handles entry, editing, and management of opening balances

import React, { useState, useEffect, useCallback } from 'react';

// API configuration
const API_BASE_URL = 'https://puvi-backend.onrender.com';

// API helper function
const apiCall = async (url, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `API call failed: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

const OpeningBalanceEntry = ({ readOnly = false, onSave, onCancel }) => {
  // State management
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [openingBalances, setOpeningBalances] = useState({});
  const [originalBalances, setOriginalBalances] = useState({});
  const [systemStatus, setSystemStatus] = useState(null);
  
  // Filters and view
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyWithBalance, setShowOnlyWithBalance] = useState(false);
  const [editMode, setEditMode] = useState('single'); // 'single' or 'bulk'
  
  // Bulk edit
  const [bulkRate, setBulkRate] = useState('');
  const [selectedMaterials, setSelectedMaterials] = useState(new Set());
  
  // Configuration
  const [cutoffDate, setCutoffDate] = useState('');
  const [financialYear, setFinancialYear] = useState('');
  
  // Summary statistics
  const [summary, setSummary] = useState({
    totalMaterials: 0,
    materialsWithBalance: 0,
    totalValue: 0,
    modifiedCount: 0
  });
  
  // Messages
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [importProgress, setImportProgress] = useState(null);

  // Load initial data
  useEffect(() => {
    loadSystemStatus();
    loadMaterials();
  }, []);

  // Calculate summary when balances change
  useEffect(() => {
    calculateSummary();
  }, [openingBalances, materials]);

  // Load system status
  const loadSystemStatus = async () => {
    try {
      const response = await apiCall('/api/opening_balance/status');
      
      if (response.success) {
        setSystemStatus(response.status);
        if (response.status.cutoff_date) {
          setCutoffDate(response.status.cutoff_date);
          calculateFinancialYear(response.status.cutoff_date);
        }
      }
    } catch (err) {
      setError(`Failed to load system status: ${err.message}`);
    }
  };

  // Load materials with opening balances
  const loadMaterials = async () => {
    setLoading(true);
    try {
      const response = await apiCall('/api/opening_balance/materials');
      
      if (response.success) {
        setMaterials(response.materials || []);
        
        // Initialize opening balances
        const balances = {};
        response.materials.forEach(material => {
          if (material.opening_quantity > 0) {
            balances[material.material_id] = {
              quantity: material.opening_quantity,
              rate: material.opening_rate,
              originalQuantity: material.opening_quantity,
              originalRate: material.opening_rate
            };
          }
        });
        setOpeningBalances(balances);
        setOriginalBalances(JSON.parse(JSON.stringify(balances)));
      }
    } catch (err) {
      setError(`Failed to load materials: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Calculate financial year
  const calculateFinancialYear = (dateStr) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    if (month >= 4) {
      setFinancialYear(`${year}-${(year + 1).toString().slice(-2)}`);
    } else {
      setFinancialYear(`${year - 1}-${year.toString().slice(-2)}`);
    }
  };

  // Calculate summary statistics
  const calculateSummary = () => {
    const materialsWithBalance = Object.keys(openingBalances).filter(
      id => openingBalances[id].quantity > 0
    ).length;
    
    const totalValue = Object.keys(openingBalances).reduce((sum, id) => {
      const balance = openingBalances[id];
      return sum + (balance.quantity * balance.rate);
    }, 0);
    
    const modifiedCount = Object.keys(openingBalances).filter(id => {
      const current = openingBalances[id];
      const original = originalBalances[id];
      return original ? 
        (current.quantity !== original.originalQuantity || current.rate !== original.originalRate) :
        (current.quantity > 0);
    }).length;
    
    setSummary({
      totalMaterials: materials.length,
      materialsWithBalance,
      totalValue,
      modifiedCount
    });
  };

  // Handle balance change
  const handleBalanceChange = (materialId, field, value) => {
    const numValue = parseFloat(value) || 0;
    
    setOpeningBalances(prev => ({
      ...prev,
      [materialId]: {
        ...prev[materialId],
        [field]: numValue,
        originalQuantity: prev[materialId]?.originalQuantity ?? 0,
        originalRate: prev[materialId]?.originalRate ?? 0
      }
    }));
  };

  // Handle bulk selection
  const handleSelectMaterial = (materialId) => {
    setSelectedMaterials(prev => {
      const newSet = new Set(prev);
      if (newSet.has(materialId)) {
        newSet.delete(materialId);
      } else {
        newSet.add(materialId);
      }
      return newSet;
    });
  };

  // Select all visible materials
  const handleSelectAll = () => {
    const visibleMaterials = getFilteredMaterials();
    if (selectedMaterials.size === visibleMaterials.length) {
      setSelectedMaterials(new Set());
    } else {
      setSelectedMaterials(new Set(visibleMaterials.map(m => m.material_id)));
    }
  };

  // Apply bulk rate
  const applyBulkRate = () => {
    if (!bulkRate || selectedMaterials.size === 0) {
      setError('Please enter a rate and select materials');
      return;
    }
    
    const rate = parseFloat(bulkRate);
    const updates = {};
    
    selectedMaterials.forEach(materialId => {
      updates[materialId] = {
        ...openingBalances[materialId],
        rate: rate,
        originalQuantity: openingBalances[materialId]?.originalQuantity ?? 0,
        originalRate: openingBalances[materialId]?.originalRate ?? 0
      };
    });
    
    setOpeningBalances(prev => ({ ...prev, ...updates }));
    setSuccessMessage(`Applied rate ₹${rate} to ${selectedMaterials.size} materials`);
    setSelectedMaterials(new Set());
    setBulkRate('');
  };

  // Clear all balances
  const clearAllBalances = () => {
    if (window.confirm('Are you sure you want to clear all opening balances?')) {
      setOpeningBalances({});
      setSuccessMessage('All balances cleared');
    }
  };

  // Reset to original
  const resetToOriginal = () => {
    if (window.confirm('Reset all changes and revert to original balances?')) {
      setOpeningBalances(JSON.parse(JSON.stringify(originalBalances)));
      setSuccessMessage('Reset to original balances');
    }
  };

  // Filter materials
  const getFilteredMaterials = useCallback(() => {
    let filtered = materials;
    
    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(m => m.category === selectedCategory);
    }
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(m => 
        m.material_name.toLowerCase().includes(search) ||
        m.short_code?.toLowerCase().includes(search)
      );
    }
    
    // Balance filter
    if (showOnlyWithBalance) {
      filtered = filtered.filter(m => 
        openingBalances[m.material_id]?.quantity > 0
      );
    }
    
    return filtered;
  }, [materials, selectedCategory, searchTerm, showOnlyWithBalance, openingBalances]);

  // Get unique categories
  const getCategories = () => {
    const categories = new Set(materials.map(m => m.category));
    return ['all', ...Array.from(categories)];
  };

  // Save opening balances
  const saveOpeningBalances = async () => {
    setSaving(true);
    setError('');
    
    try {
      // Prepare entries - only non-zero quantities
      const entries = Object.keys(openingBalances)
        .filter(id => openingBalances[id].quantity > 0)
        .map(id => ({
          material_id: parseInt(id),
          quantity: openingBalances[id].quantity,
          rate_per_unit: openingBalances[id].rate
        }));
      
      if (entries.length === 0) {
        setError('No opening balances to save');
        setSaving(false);
        return;
      }
      
      const response = await apiCall('/api/opening_balance/save', {
        method: 'POST',
        body: JSON.stringify({
          cutoff_date: cutoffDate,
          entries: entries,
          entered_by: 'Admin'
        })
      });
      
      if (response.success) {
        setSuccessMessage(`Saved ${entries.length} opening balances successfully!`);
        setOriginalBalances(JSON.parse(JSON.stringify(openingBalances)));
        
        if (onSave) {
          onSave(response);
        }
      }
    } catch (err) {
      setError(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Download CSV template
  const downloadTemplate = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/opening_balance/template`);
      
      if (!response.ok) {
        throw new Error('Failed to download template');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `opening_balance_template_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSuccessMessage('Template downloaded successfully');
    } catch (err) {
      setError(`Failed to download template: ${err.message}`);
    }
  };

  // Handle CSV import
  const handleCSVImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('cutoff_date', cutoffDate);
    
    setImportProgress({ status: 'uploading', message: 'Uploading file...' });
    setError('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/opening_balance/import`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        setImportProgress({ 
          status: 'success', 
          message: `Imported ${data.summary.imported_count} balances successfully!` 
        });
        loadMaterials(); // Reload data
        
        setTimeout(() => {
          setImportProgress(null);
        }, 3000);
      } else {
        setImportProgress({ status: 'error', message: data.error });
        if (data.error_rows && data.error_rows.length > 0) {
          setError(`Import errors: ${data.error_rows.join(', ')}`);
        }
      }
    } catch (err) {
      setImportProgress({ status: 'error', message: `Import failed: ${err.message}` });
    } finally {
      event.target.value = null; // Reset file input
    }
  };

  // Export current balances
  const exportBalances = () => {
    const csvData = [];
    csvData.push(['Material ID', 'Material Name', 'Category', 'Unit', 'Opening Quantity', 'Opening Rate', 'Total Value']);
    
    getFilteredMaterials().forEach(material => {
      const balance = openingBalances[material.material_id] || { quantity: 0, rate: material.current_cost };
      csvData.push([
        material.material_id,
        material.material_name,
        material.category,
        material.unit,
        balance.quantity,
        balance.rate,
        balance.quantity * balance.rate
      ]);
    });
    
    // Convert to CSV string
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `opening_balances_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    setSuccessMessage('Exported successfully');
  };

  // Quick fill from current cost
  const quickFillFromCurrentCost = () => {
    if (window.confirm('Fill all empty rates with current material cost?')) {
      const updates = {};
      materials.forEach(material => {
        if (!openingBalances[material.material_id]?.rate) {
          updates[material.material_id] = {
            ...openingBalances[material.material_id],
            quantity: openingBalances[material.material_id]?.quantity || 0,
            rate: material.current_cost
          };
        }
      });
      setOpeningBalances(prev => ({ ...prev, ...updates }));
      setSuccessMessage('Filled rates from current cost');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <p>Loading materials...</p>
      </div>
    );
  }

  const isSystemInitialized = systemStatus?.is_initialized;
  const filteredMaterials = getFilteredMaterials();

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold">Opening Balance Entry</h3>
            <p className="text-sm text-gray-600 mt-1">
              {cutoffDate && (
                <>As of {new Date(cutoffDate).toLocaleDateString()} | Financial Year: {financialYear}</>
              )}
            </p>
            {isSystemInitialized && (
              <p className="text-sm text-red-600 mt-1">
                ⚠️ System is initialized - Opening balances are locked
              </p>
            )}
          </div>
          
          {!readOnly && !isSystemInitialized && (
            <div className="flex gap-2">
              <button
                onClick={downloadTemplate}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                title="Download CSV Template"
              >
                📥 Template
              </button>
              <label className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer text-sm">
                📤 Import
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVImport}
                  className="hidden"
                />
              </label>
              <button
                onClick={exportBalances}
                className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                title="Export Current Balances"
              >
                💾 Export
              </button>
            </div>
          )}
        </div>

        {/* Import Progress */}
        {importProgress && (
          <div className={`mt-3 p-2 rounded text-sm ${
            importProgress.status === 'success' ? 'bg-green-100 text-green-700' :
            importProgress.status === 'error' ? 'bg-red-100 text-red-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {importProgress.message}
          </div>
        )}
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <input
            type="text"
            placeholder="Search materials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {getCategories().map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
          
          {/* Balance Filter */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlyWithBalance}
              onChange={(e) => setShowOnlyWithBalance(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">Only with balance</span>
          </label>
          
          {/* Edit Mode Toggle */}
          {!readOnly && !isSystemInitialized && (
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => setEditMode(editMode === 'single' ? 'bulk' : 'single')}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
              >
                {editMode === 'single' ? '📝 Bulk Edit' : '📋 Single Edit'}
              </button>
              <button
                onClick={quickFillFromCurrentCost}
                className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
              >
                ⚡ Quick Fill Rates
              </button>
            </div>
          )}
        </div>

        {/* Bulk Edit Controls */}
        {editMode === 'bulk' && !readOnly && !isSystemInitialized && (
          <div className="mt-3 p-3 bg-gray-50 rounded flex gap-3 items-center">
            <span className="text-sm">Selected: {selectedMaterials.size}</span>
            <input
              type="number"
              placeholder="Bulk rate"
              value={bulkRate}
              onChange={(e) => setBulkRate(e.target.value)}
              className="px-2 py-1 border rounded text-sm w-24"
              step="0.01"
              min="0"
            />
            <button
              onClick={applyBulkRate}
              disabled={!bulkRate || selectedMaterials.size === 0}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm disabled:opacity-50"
            >
              Apply Rate
            </button>
            <button
              onClick={handleSelectAll}
              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
            >
              {selectedMaterials.size === filteredMaterials.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        )}
      </div>

      {/* Materials Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {editMode === 'bulk' && !readOnly && !isSystemInitialized && (
                  <th className="px-3 py-2 text-left">
                    <input
                      type="checkbox"
                      checked={selectedMaterials.size === filteredMaterials.length && filteredMaterials.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4"
                    />
                  </th>
                )}
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">ID</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Material</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Category</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Unit</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Current Cost</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Opening Qty</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Opening Rate</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Total Value</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaterials.map((material, index) => {
                const balance = openingBalances[material.material_id] || { 
                  quantity: 0, 
                  rate: material.current_cost 
                };
                const totalValue = balance.quantity * balance.rate;
                const isModified = originalBalances[material.material_id] ? 
                  (balance.quantity !== originalBalances[material.material_id].originalQuantity ||
                   balance.rate !== originalBalances[material.material_id].originalRate) :
                  balance.quantity > 0;
                
                return (
                  <tr key={material.material_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {editMode === 'bulk' && !readOnly && !isSystemInitialized && (
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedMaterials.has(material.material_id)}
                          onChange={() => handleSelectMaterial(material.material_id)}
                          className="w-4 h-4"
                        />
                      </td>
                    )}
                    <td className="px-3 py-2 text-sm">{material.material_id}</td>
                    <td className="px-3 py-2 text-sm font-medium">{material.material_name}</td>
                    <td className="px-3 py-2 text-sm">{material.category}</td>
                    <td className="px-3 py-2 text-sm">{material.unit}</td>
                    <td className="px-3 py-2 text-sm">₹{material.current_cost}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={balance.quantity || ''}
                        onChange={(e) => handleBalanceChange(material.material_id, 'quantity', e.target.value)}
                        className="w-20 px-2 py-1 border rounded text-sm"
                        min="0"
                        step="0.01"
                        disabled={readOnly || isSystemInitialized}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={balance.rate || ''}
                        onChange={(e) => handleBalanceChange(material.material_id, 'rate', e.target.value)}
                        className="w-20 px-2 py-1 border rounded text-sm"
                        min="0"
                        step="0.01"
                        disabled={readOnly || isSystemInitialized}
                      />
                    </td>
                    <td className="px-3 py-2 text-sm font-medium">
                      ₹{totalValue.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {isModified && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                          Modified
                        </span>
                      )}
                      {material.has_transactions && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs ml-1">
                          Has Txns
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Section */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Materials</p>
            <p className="text-xl font-semibold">{summary.totalMaterials}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">With Balance</p>
            <p className="text-xl font-semibold text-green-600">{summary.materialsWithBalance}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Modified</p>
            <p className="text-xl font-semibold text-yellow-600">{summary.modifiedCount}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Value</p>
            <p className="text-xl font-semibold text-blue-600">₹{summary.totalValue.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {!readOnly && !isSystemInitialized && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={resetToOriginal}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                ↺ Reset Changes
              </button>
              <button
                onClick={clearAllBalances}
                className="px-4 py-2 bg-red-200 text-red-700 rounded hover:bg-red-300"
              >
                🗑️ Clear All
              </button>
            </div>
            
            <div className="flex gap-2">
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={saveOpeningBalances}
                disabled={saving || summary.materialsWithBalance === 0}
                className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {saving ? 'Saving...' : `💾 Save ${summary.modifiedCount > 0 ? `(${summary.modifiedCount} changes)` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default OpeningBalanceEntry;
