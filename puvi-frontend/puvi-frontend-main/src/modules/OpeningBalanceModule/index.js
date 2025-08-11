// OpeningBalanceModule/index.js - Container component for Opening Balance management
// File Path: puvi-frontend/puvi-frontend-main/src/modules/OpeningBalanceModule/index.js
// Main container that orchestrates all opening balance components

import React, { useState, useEffect } from 'react';
import SystemInitializationWizard from '../../components/OpeningBalance/SystemInitializationWizard';
import OpeningBalanceEntry from '../../components/OpeningBalance/OpeningBalanceEntry';
import SystemStatusDashboard from '../../components/OpeningBalance/SystemStatusDashboard';

const OpeningBalanceModule = () => {
  // View state management
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'wizard', 'entry'
  const [systemInitialized, setSystemInitialized] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Messages
  const [notification, setNotification] = useState(null);

  // Check system status on mount
  useEffect(() => {
    checkSystemStatus();
  }, [refreshTrigger]);

  // Check if system is initialized
  const checkSystemStatus = async () => {
    try {
      const response = await fetch('https://puvi-backend.onrender.com/api/opening_balance/status');
      const data = await response.json();
      
      if (data.success) {
        setSystemInitialized(data.status.is_initialized);
        
        // Auto-navigate to wizard if not initialized and no transactions
        if (!data.status.is_initialized && data.status.can_initialize) {
          setCurrentView('wizard');
        }
      }
    } catch (error) {
      console.error('Failed to check system status:', error);
    }
  };

  // Handle successful initialization
  const handleInitializationComplete = (response) => {
    setSystemInitialized(true);
    setCurrentView('dashboard');
    setRefreshTrigger(prev => prev + 1);
    
    setNotification({
      type: 'success',
      message: 'System initialized successfully! You can now start operations.',
      autoHide: false
    });
  };

  // Handle balance save
  const handleBalanceSave = (response) => {
    setNotification({
      type: 'success',
      message: `Opening balances saved successfully! ${response.summary?.saved_count || 0} materials updated.`,
      autoHide: true
    });
    
    setRefreshTrigger(prev => prev + 1);
    
    // Return to dashboard after save
    setTimeout(() => {
      setCurrentView('dashboard');
    }, 1500);
  };

  // Auto-hide notifications
  useEffect(() => {
    if (notification?.autoHide) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Navigation functions
  const navigateToWizard = () => {
    if (systemInitialized) {
      if (window.confirm('System is already initialized. You can only view the status. Continue?')) {
        setCurrentView('wizard');
      }
    } else {
      setCurrentView('wizard');
    }
  };

  const navigateToEntry = () => {
    setCurrentView('entry');
  };

  const navigateToDashboard = () => {
    setCurrentView('dashboard');
    setRefreshTrigger(prev => prev + 1);
  };

  // Render breadcrumb navigation
  const renderBreadcrumb = () => {
    const breadcrumbItems = [
      { id: 'dashboard', label: 'Dashboard', icon: '📊' },
      { id: 'wizard', label: 'Initialization Wizard', icon: '🚀' },
      { id: 'entry', label: 'Balance Entry', icon: '📝' }
    ];

    return (
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {breadcrumbItems.map((item, index) => (
              <React.Fragment key={item.id}>
                {index > 0 && <span className="text-gray-400">→</span>}
                <button
                  onClick={() => {
                    if (item.id === 'dashboard') navigateToDashboard();
                    else if (item.id === 'wizard') navigateToWizard();
                    else if (item.id === 'entry') navigateToEntry();
                  }}
                  className={`px-3 py-1 rounded transition-colors ${
                    currentView === item.id
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-1">{item.icon}</span>
                  {item.label}
                </button>
              </React.Fragment>
            ))}
          </div>
          
          <div className="flex items-center gap-3">
            {systemInitialized ? (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm font-medium">
                ✅ System Initialized
              </span>
            ) : (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-sm font-medium">
                ⚠️ Not Initialized
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render current view
  const renderContent = () => {
    switch (currentView) {
      case 'wizard':
        return (
          <SystemInitializationWizard
            onComplete={handleInitializationComplete}
            onCancel={navigateToDashboard}
          />
        );

      case 'entry':
        return (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                {systemInitialized ? 'View Opening Balances' : 'Manage Opening Balances'}
              </h2>
              <button
                onClick={navigateToDashboard}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                ← Back to Dashboard
              </button>
            </div>
            <OpeningBalanceEntry
              readOnly={systemInitialized}
              onSave={handleBalanceSave}
              onCancel={navigateToDashboard}
            />
          </div>
        );

      case 'dashboard':
      default:
        return (
          <SystemStatusDashboard
            onInitialize={navigateToWizard}
            onManageBalances={navigateToEntry}
          />
        );
    }
  };

  return (
    <div className="opening-balance-module">
      {/* Module Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-lg shadow-lg mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Opening Balance Management</h1>
            <p className="text-blue-100">
              Initialize your system with opening balances and manage financial year operations
            </p>
          </div>
          <div className="text-6xl opacity-20">
            💼
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white bg-opacity-20 rounded p-3">
            <p className="text-sm text-blue-100">Module Status</p>
            <p className="text-lg font-semibold">
              {systemInitialized ? 'Active' : 'Setup Required'}
            </p>
          </div>
          <div className="bg-white bg-opacity-20 rounded p-3">
            <p className="text-sm text-blue-100">Current View</p>
            <p className="text-lg font-semibold capitalize">{currentView}</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded p-3">
            <p className="text-sm text-blue-100">Actions Available</p>
            <p className="text-lg font-semibold">
              {systemInitialized ? 'View Only' : 'Full Access'}
            </p>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`mb-4 p-4 rounded-lg shadow-sm animate-pulse ${
          notification.type === 'success' ? 'bg-green-50 border border-green-200' :
          notification.type === 'error' ? 'bg-red-50 border border-red-200' :
          'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {notification.type === 'success' ? '✅' :
                 notification.type === 'error' ? '❌' : 'ℹ️'}
              </span>
              <p className={`font-medium ${
                notification.type === 'success' ? 'text-green-800' :
                notification.type === 'error' ? 'text-red-800' :
                'text-blue-800'
              }`}>
                {notification.message}
              </p>
            </div>
            {!notification.autoHide && (
              <button
                onClick={() => setNotification(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      {renderBreadcrumb()}

      {/* Main Content */}
      <div className="min-h-screen">
        {renderContent()}
      </div>

      {/* Footer */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg text-center text-sm text-gray-600">
        <p>
          Opening Balance Module | 
          {systemInitialized ? ' System Initialized - View Mode' : ' Setup Mode'} | 
          Financial Year Management System
        </p>
      </div>
    </div>
  );
};

export default OpeningBalanceModule;
