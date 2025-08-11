// SystemStatusDashboard.jsx - System initialization status dashboard
// File Path: puvi-frontend/puvi-frontend-main/src/components/OpeningBalance/SystemStatusDashboard.jsx
// Displays system status, initialization info, and opening balance summary

import React, { useState, useEffect } from 'react';

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

const SystemStatusDashboard = ({ onInitialize, onManageBalances }) => {
  // State
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadSystemStatus();
    // Refresh every 30 seconds if not initialized
    const interval = setInterval(() => {
      if (!systemStatus?.is_initialized) {
        loadSystemStatus(true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [systemStatus?.is_initialized]);

  // Load system status
  const loadSystemStatus = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    
    try {
      const response = await apiCall('/api/opening_balance/status');
      
      if (response.success) {
        setSystemStatus(response.status);
        setStatistics(response.statistics);
        setConfig(response.status);
        setError('');
      }
    } catch (err) {
      setError(`Failed to load status: ${err.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Calculate days since cutoff
  const getDaysSinceCutoff = () => {
    if (!systemStatus?.cutoff_date) return null;
    const cutoff = new Date(systemStatus.cutoff_date);
    const today = new Date();
    const diffTime = Math.abs(today - cutoff);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get status color
  const getStatusColor = (status) => {
    if (status?.is_initialized) return 'green';
    if (status?.has_transactions) return 'red';
    return 'yellow';
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading system status...</p>
        </div>
      </div>
    );
  }

  const statusColor = getStatusColor(systemStatus);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Opening Balance Dashboard</h1>
            <p className="text-gray-600 mt-1">System initialization status and opening balance overview</p>
          </div>
          <button
            onClick={() => loadSystemStatus()}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {refreshing ? '⟳ Refreshing...' : '⟳ Refresh'}
          </button>
        </div>
      </div>

      {/* Status Alert */}
      <div className={`bg-${statusColor}-50 border-2 border-${statusColor}-200 rounded-lg p-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`text-5xl ${
              statusColor === 'green' ? 'text-green-600' :
              statusColor === 'red' ? 'text-red-600' :
              'text-yellow-600'
            }`}>
              {systemStatus?.is_initialized ? '✅' :
               systemStatus?.has_transactions ? '⛔' : '⚠️'}
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${
                statusColor === 'green' ? 'text-green-800' :
                statusColor === 'red' ? 'text-red-800' :
                'text-yellow-800'
              }`}>
                {systemStatus?.is_initialized ? 'System Initialized' :
                 systemStatus?.has_transactions ? 'Cannot Initialize - Transactions Exist' :
                 'System Not Initialized'}
              </h2>
              <p className={`mt-1 ${
                statusColor === 'green' ? 'text-green-700' :
                statusColor === 'red' ? 'text-red-700' :
                'text-yellow-700'
              }`}>
                {systemStatus?.is_initialized ? 
                  `System has been running for ${getDaysSinceCutoff()} days since cutoff` :
                 systemStatus?.has_transactions ? 
                  'Clear all transactions before setting opening balances' :
                  'Initialize system with opening balances to start operations'}
              </p>
            </div>
          </div>
          
          {!systemStatus?.is_initialized && (
            <div>
              {systemStatus?.can_initialize ? (
                <button
                  onClick={onInitialize}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  🚀 Initialize System
                </button>
              ) : (
                <button
                  disabled
                  className="px-6 py-3 bg-gray-400 text-white rounded-lg cursor-not-allowed"
                >
                  Cannot Initialize
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Initialization Status</p>
              <p className="text-2xl font-bold mt-1">
                {systemStatus?.is_initialized ? 'Completed' : 'Pending'}
              </p>
            </div>
            <div className={`text-3xl ${systemStatus?.is_initialized ? 'text-green-500' : 'text-gray-400'}`}>
              {systemStatus?.is_initialized ? '🔒' : '🔓'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Financial Year</p>
              <p className="text-2xl font-bold mt-1">
                {systemStatus?.current_financial_year || 'Not Set'}
              </p>
            </div>
            <div className="text-3xl text-blue-500">📅</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Materials with Balance</p>
              <p className="text-2xl font-bold mt-1">
                {statistics?.materials_with_opening || 0}
              </p>
            </div>
            <div className="text-3xl text-purple-500">📦</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Opening Value</p>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency(statistics?.total_opening_value)}
              </p>
            </div>
            <div className="text-3xl text-green-500">💰</div>
          </div>
        </div>
      </div>

      {/* Configuration Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* System Configuration */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">System Configuration</h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Cutoff Date</span>
              <span className="font-medium">
                {systemStatus?.cutoff_date ? 
                  new Date(systemStatus.cutoff_date).toLocaleDateString() : 
                  'Not Set'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Go-Live Date</span>
              <span className="font-medium">
                {systemStatus?.cutoff_date ? 
                  new Date(new Date(systemStatus.cutoff_date).getTime() + 86400000).toLocaleDateString() : 
                  'Not Set'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Allow Backdated Entries</span>
              <span className="font-medium">
                {systemStatus?.allow_backdated_entries ? 
                  <span className="text-green-600">✓ Yes</span> : 
                  <span className="text-red-600">✗ No</span>}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Days Since Cutoff</span>
              <span className="font-medium">
                {getDaysSinceCutoff() || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Transaction Status */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Transaction Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Purchases</span>
              <span className={`font-medium ${
                systemStatus?.transaction_counts?.purchases > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {systemStatus?.transaction_counts?.purchases || 0}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Batch Productions</span>
              <span className={`font-medium ${
                systemStatus?.transaction_counts?.batches > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {systemStatus?.transaction_counts?.batches || 0}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Material Writeoffs</span>
              <span className={`font-medium ${
                systemStatus?.transaction_counts?.writeoffs > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {systemStatus?.transaction_counts?.writeoffs || 0}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Total Transactions</span>
              <span className={`font-bold ${
                systemStatus?.has_transactions ? 'text-red-600' : 'text-green-600'
              }`}>
                {(systemStatus?.transaction_counts?.purchases || 0) +
                 (systemStatus?.transaction_counts?.batches || 0) +
                 (systemStatus?.transaction_counts?.writeoffs || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Opening Balance Summary */}
      {statistics && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Opening Balance Summary</h3>
            {systemStatus?.is_initialized ? (
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                View Only - System Initialized
              </span>
            ) : (
              <button
                onClick={onManageBalances}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                {statistics?.materials_with_opening > 0 ? 'Edit Balances' : 'Enter Balances'}
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded p-4">
              <p className="text-sm text-gray-600">Materials with Opening</p>
              <p className="text-xl font-semibold mt-1">{statistics.materials_with_opening || 0}</p>
            </div>
            <div className="bg-gray-50 rounded p-4">
              <p className="text-sm text-gray-600">Processed Count</p>
              <p className="text-xl font-semibold mt-1">{statistics.processed_count || 0}</p>
            </div>
            <div className="bg-gray-50 rounded p-4">
              <p className="text-sm text-gray-600">Pending Count</p>
              <p className="text-xl font-semibold mt-1">{statistics.pending_count || 0}</p>
            </div>
            <div className="bg-blue-50 rounded p-4">
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-xl font-semibold mt-1 text-blue-600">
                {formatCurrency(statistics.total_opening_value)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Initialization Info */}
      {systemStatus?.initialization_info && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-3">Initialization Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-green-700">Initialized Date</p>
              <p className="font-medium">
                {new Date(systemStatus.initialization_info.date).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-green-700">Initialized By</p>
              <p className="font-medium">{systemStatus.initialization_info.by}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {!systemStatus?.is_initialized && systemStatus?.can_initialize && (
            <>
              <button
                onClick={onInitialize}
                className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-center transition-colors"
              >
                <div className="text-3xl mb-2">🚀</div>
                <p className="text-sm font-medium">Initialize System</p>
              </button>
              <button
                onClick={onManageBalances}
                className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-center transition-colors"
              >
                <div className="text-3xl mb-2">📝</div>
                <p className="text-sm font-medium">Manage Balances</p>
              </button>
            </>
          )}
          
          {systemStatus?.is_initialized && (
            <>
              <button
                onClick={onManageBalances}
                className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-center transition-colors"
              >
                <div className="text-3xl mb-2">👁️</div>
                <p className="text-sm font-medium">View Balances</p>
              </button>
              <button
                className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-center transition-colors"
                onClick={() => alert('Year-end closing feature coming soon!')}
              >
                <div className="text-3xl mb-2">📊</div>
                <p className="text-sm font-medium">Year-End Close</p>
              </button>
            </>
          )}
          
          <button
            className="p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg text-center transition-colors"
            onClick={() => window.print()}
          >
            <div className="text-3xl mb-2">🖨️</div>
            <p className="text-sm font-medium">Print Status</p>
          </button>
          
          <button
            onClick={() => loadSystemStatus()}
            className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-center transition-colors"
          >
            <div className="text-3xl mb-2">🔄</div>
            <p className="text-sm font-medium">Refresh Data</p>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
};

export default SystemStatusDashboard;
