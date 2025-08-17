// OpeningBalanceModule/index.js - Container component for Opening Balance management
// File Path: puvi-frontend/puvi-frontend-main/src/modules/OpeningBalanceModule/index.js
// Main container that orchestrates all opening balance components

import React, { useState, useEffect } from 'react';
import SystemInitializationWizard from '../../components/OpeningBalance/SystemInitializationWizard';
import OpeningBalanceEntry from '../../components/OpeningBalance/OpeningBalanceEntry';
import SystemStatusDashboard from '../../components/OpeningBalance/SystemStatusDashboard';
import './OpeningBalanceModule.css'; // Import CSS file

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
      <div className="breadcrumb-container">
        <div className="breadcrumb-content">
          <div className="breadcrumb-items">
            {breadcrumbItems.map((item, index) => (
              <React.Fragment key={item.id}>
                {index > 0 && <span className="breadcrumb-separator">→</span>}
                <button
                  onClick={() => {
                    if (item.id === 'dashboard') navigateToDashboard();
                    else if (item.id === 'wizard') navigateToWizard();
                    else if (item.id === 'entry') navigateToEntry();
                  }}
                  className={`breadcrumb-button ${currentView === item.id ? 'active' : ''}`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </button>
              </React.Fragment>
            ))}
          </div>
          
          <div className="status-badges">
            {systemInitialized ? (
              <span className="status-badge initialized">
                ✅ System Initialized
              </span>
            ) : (
              <span className="status-badge not-initialized">
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
          <div className="content-card">
            <div className="content-header">
              <h2 className="content-title">
                {systemInitialized ? 'View Opening Balances' : 'Manage Opening Balances'}
              </h2>
              <button
                onClick={navigateToDashboard}
                className="back-button"
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
      <div className="module-header-gradient">
        <div className="module-header-content">
          <div className="module-header-info">
            <h1>Opening Balance Management</h1>
            <p>
              Initialize your system with opening balances and manage financial year operations
            </p>
          </div>
          <div className="module-header-icon">
            💼
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="module-quick-stats">
          <div className="stat-card">
            <p className="stat-label">Module Status</p>
            <p className="stat-value">
              {systemInitialized ? 'Active' : 'Setup Required'}
            </p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Current View</p>
            <p className="stat-value" style={{ textTransform: 'capitalize' }}>
              {currentView}
            </p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Actions Available</p>
            <p className="stat-value">
              {systemInitialized ? 'View Only' : 'Full Access'}
            </p>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          <div className="notification-content">
            <div className="notification-message">
              <span className="notification-icon">
                {notification.type === 'success' ? '✅' :
                 notification.type === 'error' ? '❌' : 'ℹ️'}
              </span>
              <p className={`notification-text ${notification.type}`}>
                {notification.message}
              </p>
            </div>
            {!notification.autoHide && (
              <button
                onClick={() => setNotification(null)}
                className="notification-close"
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
      <div className="content-wrapper">
        {renderContent()}
      </div>

      {/* Footer */}
      <div className="module-footer">
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
