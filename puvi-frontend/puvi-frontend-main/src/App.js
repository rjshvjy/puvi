// File Path: puvi-frontend/puvi-frontend-main/src/App.js
// Modern Professional App Component for PUVI Oil Manufacturing System

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
import MastersManagement from './modules/MastersManagement';
import OpeningBalanceModule from './modules/OpeningBalanceModule';

function App() {
  // State Management
  const [activeModule, setActiveModule] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [systemStats, setSystemStats] = useState({
    totalMaterials: 0,
    activeSuppliers: 0,
    pendingOrders: 0,
    lowStock: 0,
    production: 0,
    revenue: 0
  });
  
  // User info (can be fetched from API)
  const [userInfo] = useState({
    name: 'Admin User',
    role: 'System Administrator',
    initials: 'AU'
  });

  // Navigation structure
  const navigation = [
    {
      section: 'MAIN',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: '📊', badge: null },
        { id: 'openingBalance', label: 'Opening Balance', icon: '💼', badge: '!' }
      ]
    },
    {
      section: 'OPERATIONS',
      items: [
        { id: 'purchase', label: 'Purchase', icon: '🛒', badge: null },
        { id: 'batch', label: 'Batch Production', icon: '🏭', badge: null },
        { id: 'blending', label: 'Oil Blending', icon: '🧪', badge: null },
        { id: 'sku', label: 'SKU Management', icon: '📦', badge: null },
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
      section: 'CONFIGURATION',
      items: [
        { id: 'masters', label: 'Masters', icon: '⚙️', badge: null }
      ]
    }
  ];

  // Close mobile menu when module changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [activeModule]);

  // Fetch system stats (mock data for now)
  useEffect(() => {
    // In real app, fetch from API
    setSystemStats({
      totalMaterials: 156,
      activeSuppliers: 24,
      pendingOrders: 8,
      lowStock: 12,
      production: 4520,
      revenue: 145600
    });
  }, []);

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
      sales: 'Material Sales',
      writeoff: 'Material Writeoff',
      cost: 'Cost Management',
      masters: 'Master Data Management'
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
      sales: 'Track material and by-product sales',
      writeoff: 'Record material losses and writeoffs',
      cost: 'Analyze and manage production costs',
      masters: 'Configure suppliers, materials, and system settings'
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
      case 'masters':
        return <MastersManagement />;
      case 'openingBalance':
        return <OpeningBalanceModule />;
      case 'dashboard':
      default:
        return <DashboardContent stats={systemStats} onNavigate={setActiveModule} />;
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
          <div className="user-avatar">{userInfo.initials}</div>
          <div className="user-info">
            <div className="user-name">{userInfo.name}</div>
            <div className="user-role">{userInfo.role}</div>
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
              
              {/* Quick Actions */}
              {activeModule === 'dashboard' && (
                <>
                  <button className="header-button">
                    <span>📥</span>
                    <span>Import Data</span>
                  </button>
                  <button className="header-button">
                    <span>📊</span>
                    <span>Generate Report</span>
                  </button>
                </>
              )}
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
const DashboardContent = ({ stats, onNavigate }) => {
  const quickActions = [
    { id: 'purchase', icon: '🛒', title: 'New Purchase', color: '#3b82f6' },
    { id: 'batch', icon: '🏭', title: 'Start Production', color: '#10b981' },
    { id: 'sku', icon: '📦', title: 'Create SKU', color: '#8b5cf6' },
    { id: 'sales', icon: '💰', title: 'Record Sale', color: '#f59e0b' },
    { id: 'masters', icon: '⚙️', title: 'Add Supplier', color: '#6b7280' },
    { id: 'cost', icon: '💵', title: 'View Costs', color: '#06b6d4' }
  ];

  const statCards = [
    { 
      title: 'Total Materials', 
      value: stats.totalMaterials, 
      change: '+12%', 
      positive: true,
      color: '#3b82f6',
      icon: '📦'
    },
    { 
      title: 'Active Suppliers', 
      value: stats.activeSuppliers, 
      change: '+5%', 
      positive: true,
      color: '#10b981',
      icon: '🏢'
    },
    { 
      title: 'Pending Orders', 
      value: stats.pendingOrders, 
      change: '-2', 
      positive: false,
      color: '#f59e0b',
      icon: '📋'
    },
    { 
      title: 'Low Stock Items', 
      value: stats.lowStock, 
      change: '3 critical', 
      positive: false,
      color: '#ef4444',
      icon: '⚠️'
    },
    { 
      title: 'Production (kg)', 
      value: stats.production.toLocaleString(), 
      change: '+18%', 
      positive: true,
      color: '#8b5cf6',
      icon: '🏭'
    },
    { 
      title: 'Revenue (₹)', 
      value: stats.revenue.toLocaleString(), 
      change: '+22%', 
      positive: true,
      color: '#06b6d4',
      icon: '💰'
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
        
        {/* System Status */}
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
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#10b981' }}>
              ✓ Operational
            </div>
          </div>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>Last Backup</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              Today, 2:00 AM
            </div>
          </div>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>Active Users</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              5 Online
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
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
            <div className="stat-card-value">{stat.value}</div>
            <div className={`stat-card-change ${stat.positive ? 'positive' : 'negative'}`}>
              <span>{stat.positive ? '↑' : '↓'}</span>
              <span>{stat.change}</span>
            </div>
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

      {/* Recent Activity */}
      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Recent Activity</h2>
        <div style={{ 
          background: 'white', 
          borderRadius: '0.75rem', 
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { time: '2 hours ago', action: 'Purchase Order #PO-2024-156 created', user: 'John Doe' },
              { time: '4 hours ago', action: 'Batch Production #BP-2024-089 completed', user: 'Jane Smith' },
              { time: '6 hours ago', action: 'SKU #SKU-001 stock updated', user: 'Admin' },
              { time: '1 day ago', action: 'Material writeoff recorded for expired items', user: 'System' }
            ].map((activity, idx) => (
              <div 
                key={idx} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  background: '#f9fafb',
                  borderRadius: '0.5rem'
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{activity.action}</div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    by {activity.user}
                  </div>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                  {activity.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
