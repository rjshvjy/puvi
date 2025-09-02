// File Path: puvi-frontend/puvi-frontend-main/src/App.js
// Modern Professional App Component for PUVI Oil Manufacturing System
// MODIFIED: Added Customer and Location Management modules

import React, { useState, useEffect } from 'react';
import './App.css';

// Import all modules
import Purchase from './modules/Purchase';
import MaterialWriteoff from './modules/MaterialWriteoff';
import BatchProduction from './modules/BatchProduction';
import Blending from './modules/Blending';
import MaterialSales from './modules/MaterialSales';
import CostManagement from './modules/CostManagement';
import SKUManagement from './modules/SKUManagement';
import SKUOutbound from './modules/SKUOutbound';
import MastersManagement from './modules/MastersManagement';
import OpeningBalanceModule from './modules/OpeningBalanceModule';
import OilConfigurationDashboard from './components/Masters/OilConfigurationDashboard';
import CustomerManager from './modules/MasterData/CustomerManager';
import LocationsManager from './modules/MasterData/LocationsManager';

function App() {
  // State Management
  const [activeModule, setActiveModule] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [systemStats, setSystemStats] = useState({
    totalMaterials: 0,
    activeSuppliers: 0,
    totalPurchases: 0,
    totalBatches: 0,
    isLoading: true,
    hasError: false
  });

  // Navigation structure
  const navigation = [
    {
      section: 'MAIN',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: '📊', badge: null },
        { id: 'openingBalance', label: 'Opening Balance', icon: '💼', badge: !systemStats.totalMaterials && !systemStats.isLoading ? '!' : null }
      ]
    },
    {
      section: 'OPERATIONS',
      items: [
        { id: 'purchase', label: 'Purchase', icon: '🛒', badge: null },
        { id: 'batch', label: 'Batch Production', icon: '🏭', badge: null },
        { id: 'blending', label: 'Oil Blending', icon: '🧪', badge: null },
        { id: 'sku', label: 'SKU Management', icon: '📦', badge: null },
        { id: 'skuOutbound', label: 'SKU Outbound', icon: '📤', badge: null },
        { id: 'sales', label: 'Material Sales', icon: '💰', badge: null }
      ]
    },
    {
      section: 'INVENTORY',
      items: [
        { id: 'writeoff', label: 'Material Writeoff', icon: '📝', badge: null },
        { id: 'cost', label: 'Cost Management', icon: '💵', badge: null }
      ]
    },
    {
      section: 'MASTER DATA',
      items: [
        { id: 'customers', label: 'Customers', icon: '👥', badge: null },
        { id: 'locations', label: 'Locations', icon: '📍', badge: null }
      ]
    },
    {
      section: 'CONFIGURATION',
      items: [
        { id: 'masters', label: 'Masters', icon: '⚙️', badge: null },
        { id: 'oilConfig', label: 'Oil Configuration', icon: '🛢️', badge: null }
      ]
    }
  ];

  // Close mobile menu when module changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [activeModule]);

  // Helper function to check API connectivity
  const checkAPIConnection = async () => {
    try {
      const response = await fetch('https://puvi-backend.onrender.com/api/suppliers');
      return response.ok;
    } catch (error) {
      console.error('API connection error:', error);
      return false;
    }
  };

  // Fetch real system stats from API
  useEffect(() => {
    fetchSystemStats();
  }, []);

  const fetchSystemStats = async () => {
    setSystemStats(prev => ({ ...prev, isLoading: true, hasError: false }));
    try {
      // Fetch actual counts from the API - with better error handling
      const fetchWithFallback = async (url) => {
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          return await response.json();
        } catch (error) {
          console.warn(`Failed to fetch from ${url}:`, error);
          return null;
        }
      };

      const [materials, suppliers, purchases, batches] = await Promise.all([
        fetchWithFallback('https://puvi-backend.onrender.com/api/materials'),
        fetchWithFallback('https://puvi-backend.onrender.com/api/suppliers'),
        fetchWithFallback('https://puvi-backend.onrender.com/api/purchase_history?limit=1'),
        fetchWithFallback('https://puvi-backend.onrender.com/api/batch_history?limit=1')
      ]);
      
      setSystemStats({
        totalMaterials: materials?.materials?.length || 0,
        activeSuppliers: suppliers?.suppliers?.length || 0,
        totalPurchases: purchases?.total_count || 0,
        totalBatches: batches?.batches?.length || 0,
        isLoading: false,
        hasError: false
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
      setSystemStats(prev => ({ ...prev, isLoading: false, hasError: true }));
    }
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Get current module title
  const getModuleTitle = () => {
    const titles = {
      dashboard: 'Dashboard',
      openingBalance: 'Opening Balance Management',
      purchase: 'Purchase Management',
      batch: 'Batch Production',
      blending: 'Oil Blending',
      sku: 'SKU Management',
      skuOutbound: 'SKU Outbound Management',
      sales: 'Material Sales',
      writeoff: 'Material Writeoff',
      cost: 'Cost Management',
      customers: 'Customer Management',
      locations: 'Location Management',
      masters: 'Master Data Management',
      oilConfig: 'Oil Configuration Manager'
    };
    return titles[activeModule] || 'Dashboard';
  };

  // Get current module subtitle
  const getModuleSubtitle = () => {
    const subtitles = {
      dashboard: 'System overview and quick actions',
      openingBalance: 'Initialize and manage opening balances',
      purchase: 'Manage material purchases and suppliers',
      batch: 'Oil extraction and production tracking',
      blending: 'Create custom oil blends',
      sku: 'Stock keeping unit management with MRP',
      skuOutbound: 'Manage SKU transfers and sales transactions',
      sales: 'Track material and by-product sales',
      writeoff: 'Record material losses and writeoffs',
      cost: 'Analyze and manage production costs',
      customers: 'Manage customers and shipping locations',
      locations: 'Manage warehouses, factories, and third-party locations',
      masters: 'Configure suppliers, materials, and system settings',
      oilConfig: 'Manage oil type mappings for production chain'
    };
    return subtitles[activeModule] || '';
  };

  // Render module content
  const renderModuleContent = () => {
    switch (activeModule) {
      case 'purchase':
        return <Purchase />;
      case 'writeoff':
        return <MaterialWriteoff />;
      case 'batch':
        return <BatchProduction />;
      case 'blending':
        return <Blending />;
      case 'sales':
        return <MaterialSales />;
      case 'cost':
        return <CostManagement />;
      case 'sku':
        return <SKUManagement />;
      case 'skuOutbound':
        return <SKUOutbound />;
      case 'customers':
        return <CustomerManager />;
      case 'locations':
        return <LocationsManager />;
      case 'masters':
        return <MastersManagement />;
      case 'openingBalance':
        return <OpeningBalanceModule />;
      case 'oilConfig':
        return <OilConfigurationDashboard />;
      case 'dashboard':
      default:
        return <DashboardContent stats={systemStats} onNavigate={setActiveModule} onRefresh={fetchSystemStats} />;
    }
  };

  return (
    <div className="app">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">P</div>
            <div className="sidebar-logo-text">
              <div className="sidebar-logo-title">PUVI</div>
              <div className="sidebar-logo-subtitle">Oil Manufacturing</div>
            </div>
          </div>
          <button className="sidebar-toggle" onClick={toggleSidebar}>
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="sidebar-nav">
          {navigation.map((section, idx) => (
            <div key={idx} className="nav-section">
              <div className="nav-section-title">{section.section}</div>
              {section.items.map(item => (
                <button
                  key={item.id}
                  className={`nav-item ${activeModule === item.id ? 'active' : ''}`}
                  onClick={() => setActiveModule(item.id)}
                >
                  <span className="nav-item-icon">{item.icon}</span>
                  <span className="nav-item-text">{item.label}</span>
                  {item.badge && (
                    <span className="nav-item-badge">{item.badge}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="user-avatar">👤</div>
          <div className="user-info">
            <div className="user-name">User</div>
            <div className="user-role">Operator</div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-content">
            <div>
              <h1 className="header-title">{getModuleTitle()}</h1>
              <p className="header-subtitle">{getModuleSubtitle()}</p>
            </div>
            <div className="header-actions">
              {/* Mobile menu toggle */}
              <button 
                className="header-button mobile-menu-toggle"
                onClick={toggleMobileMenu}
                style={{ display: window.innerWidth <= 768 ? 'flex' : 'none' }}
              >
                ☰
              </button>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <div className="content-container">
          <div className="module-wrapper">
            {renderModuleContent()}
          </div>
        </div>
      </main>
    </div>
  );
}

// Dashboard Component
const DashboardContent = ({ stats, onNavigate, onRefresh }) => {
  const quickActions = [
    { id: 'purchase', icon: '🛒', title: 'New Purchase', color: '#3b82f6' },
    { id: 'batch', icon: '🏭', title: 'Start Production', color: '#10b981' },
    { id: 'sku', icon: '📦', title: 'Create SKU', color: '#8b5cf6' },
    { id: 'skuOutbound', icon: '📤', title: 'New Outbound', color: '#ef4444' },
    { id: 'sales', icon: '💰', title: 'Record Sale', color: '#f59e0b' },
    { id: 'customers', icon: '👥', title: 'Add Customer', color: '#14b8a6' },
    { id: 'locations', icon: '📍', title: 'Add Location', color: '#8b5cf6' },
    { id: 'masters', icon: '⚙️', title: 'Add Supplier', color: '#6b7280' },
    { id: 'cost', icon: '💵', title: 'View Costs', color: '#06b6d4' }
  ];

  // Only show real data from API
  const statCards = [
    { 
      title: 'Total Materials', 
      value: stats.isLoading ? '...' : stats.totalMaterials, 
      color: '#3b82f6',
      icon: '📦'
    },
    { 
      title: 'Active Suppliers', 
      value: stats.isLoading ? '...' : stats.activeSuppliers, 
      color: '#10b981',
      icon: '🏢'
    },
    { 
      title: 'Total Purchases', 
      value: stats.isLoading ? '...' : stats.totalPurchases, 
      color: '#f59e0b',
      icon: '📋'
    },
    { 
      title: 'Production Batches', 
      value: stats.isLoading ? '...' : stats.totalBatches, 
      color: '#8b5cf6',
      icon: '🏭'
    }
  ];

  return (
    <div className="welcome-dashboard">
      {/* Hero Section */}
      <div className="welcome-hero">
        <h1>Welcome to PUVI Oil Manufacturing System</h1>
        <p>
          Comprehensive solution for oil manufacturing operations, inventory management, 
          and cost tracking with advanced MRP and expiry management features.
        </p>
        
        {/* System Status - Only show real status */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          flexWrap: 'wrap',
          padding: '1rem',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '0.75rem'
        }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>System Status</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: stats.hasError ? '#ef4444' : '#10b981' }}>
              {stats.hasError ? '⚠ Connection Error' : '✓ Connected'}
            </div>
          </div>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>API Endpoint</div>
            <div style={{ fontSize: '1rem', fontWeight: 600 }}>
              puvi-backend.onrender.com
            </div>
          </div>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>Actions</div>
            <button 
              onClick={onRefresh}
              style={{
                padding: '0.25rem 0.75rem',
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '0.375rem',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.875rem',
                marginTop: '0.25rem'
              }}
              disabled={stats.isLoading}
            >
              {stats.isLoading ? 'Loading...' : '🔄 Refresh Stats'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid - Real Data Only */}
      <div className="stats-grid">
        {statCards.map((stat, idx) => (
          <div key={idx} className="stat-card">
            <div className="stat-card-header">
              <div 
                className="stat-card-icon" 
                style={{ 
                  background: `${stat.color}20`,
                  color: stat.color
                }}
              >
                {stat.icon}
              </div>
            </div>
            <div className="stat-card-title">{stat.title}</div>
            <div className="stat-card-value">
              {stats.hasError ? 'Error' : stat.value}
            </div>
            {!stats.isLoading && !stats.hasError && (
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                Live data from system
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          {quickActions.map(action => (
            <div
              key={action.id}
              className="action-card"
              onClick={() => onNavigate(action.id)}
              style={{ cursor: 'pointer' }}
            >
              <div 
                className="action-card-icon"
                style={{ color: action.color }}
              >
                {action.icon}
              </div>
              <div className="action-card-title">{action.title}</div>
            </div>
          ))}
        </div>
      </div>

      {/* System Information */}
      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>System Information</h2>
        <div style={{ 
          background: 'white', 
          borderRadius: '0.75rem', 
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                Getting Started
              </h3>
              <ul style={{ fontSize: '0.875rem', color: '#374151', lineHeight: 1.8 }}>
                <li>✓ Configure suppliers in Masters</li>
                <li>✓ Add materials and set opening balance</li>
                <li>✓ Create customers and locations</li>
                <li>✓ Start recording purchases</li>
                <li>✓ Begin production tracking</li>
              </ul>
            </div>
            <div>
              <h3 style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                Key Features
              </h3>
              <ul style={{ fontSize: '0.875rem', color: '#374151', lineHeight: 1.8 }}>
                <li>• Customer & location management</li>
                <li>• Multi-item purchase management</li>
                <li>• Batch production with cost tracking</li>
                <li>• SKU management with MRP</li>
                <li>• SKU outbound with GST</li>
                <li>• Inventory and expiry tracking</li>
              </ul>
            </div>
            <div>
              <h3 style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                Support
              </h3>
              <div style={{ fontSize: '0.875rem', color: '#374151', lineHeight: 1.8 }}>
                <p>For assistance, please contact:</p>
                <p>• System Administrator</p>
                <p>• Technical Support Team</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
