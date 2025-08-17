// File Path: puvi-frontend/puvi-frontend-main/src/components/OpeningBalance/SystemStatusDashboard.jsx
// CSS Class Mapping Guide for SystemStatusDashboard Component

/* 
REPLACE THESE TAILWIND CLASSES WITH CSS CLASSES IN SystemStatusDashboard:

Main Container:
OLD: className="bg-white rounded-lg shadow-sm p-6"
NEW: className="dashboard-container"

Dashboard Header:
OLD: className="mb-6"
NEW: className="dashboard-header"

Title:
OLD: className="text-2xl font-bold text-gray-800"
NEW: className="dashboard-title"

Subtitle:
OLD: className="text-gray-600 text-sm"
NEW: className="dashboard-subtitle"

Refresh Button:
OLD: className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
NEW: className="refresh-button"

Alert/Warning Box:
OLD: className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"
NEW: className="alert-box error"

OLD: className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6"
NEW: className="alert-box warning"

OLD: className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6"
NEW: className="alert-box success"

Alert Header:
OLD: className="flex items-center gap-3 mb-2"
NEW: className="alert-header"

Alert Icon:
OLD: className="text-2xl"
NEW: className="alert-icon"

Alert Title:
OLD: className="text-lg font-semibold text-red-800"
NEW: className="alert-title error"

Alert Message:
OLD: className="text-gray-600 text-sm"
NEW: className="alert-message"

Stats Grid:
OLD: className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
NEW: className="stats-grid"

Stat Card:
OLD: className="bg-white border border-gray-200 rounded-lg p-4"
NEW: className="stat-card-dashboard"

Stat Header:
OLD: className="flex items-start justify-between mb-3"
NEW: className="stat-header"

Stat Info:
OLD: className="flex flex-col"
NEW: className="stat-info"

Stat Value:
OLD: className="text-2xl font-bold text-gray-900"
NEW: Use within stat-info p tag

Stat Label:
OLD: className="text-sm text-gray-500"
NEW: Use within stat-info h3 tag

Info Section:
OLD: className="mb-6"
NEW: className="info-section"

Section Title:
OLD: className="text-lg font-semibold text-gray-700 mb-4"
NEW: className="section-title"

Info Grid:
OLD: className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
NEW: className="info-grid"

Info Item:
OLD: className="flex flex-col"
NEW: className="info-item"

Info Label:
OLD: className="text-xs text-gray-500"
NEW: className="info-label"

Info Value:
OLD: className="text-sm font-medium text-gray-900"
NEW: className="info-value"

Quick Actions:
OLD: className="mt-6 pt-6 border-t border-gray-200"
NEW: className="quick-actions"

Actions Grid:
OLD: className="grid grid-cols-2 md:grid-cols-3 gap-3"
NEW: className="actions-grid"

Action Button:
OLD: className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
NEW: className="quick-action-btn primary"

OLD: className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
NEW: className="quick-action-btn"

Example Updated JSX Structure:
*/

const SystemStatusDashboard = ({ onInitialize, onManageBalances }) => {
  // ... state and functions ...

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Opening Balance Dashboard</h1>
        <p className="dashboard-subtitle">System initialization status and opening balance overview</p>
        <div className="dashboard-controls">
          <button className="refresh-button" onClick={handleRefresh}>
            ⟳ Refresh
          </button>
        </div>
      </div>

      {/* Alert Box Example */}
      {hasTransactions && (
        <div className="alert-box error">
          <div className="alert-header">
            <span className="alert-icon">⛔</span>
            <h3 className="alert-title error">Cannot Initialize - Transactions Exist</h3>
          </div>
          <p className="alert-message">Clear all transactions before setting opening balances</p>
          <div className="alert-action">
            <button className="action-button" disabled>
              Cannot Initialize
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid Example */}
      <div className="stats-grid">
        <div className="stat-card-dashboard">
          <div className="stat-header">
            <div className="stat-info">
              <h3>Initialization Status</h3>
              <p>{status.initialized ? 'Completed' : 'Pending'}</p>
            </div>
            <span className="stat-icon">🔓</span>
          </div>
          <div className="stat-footer">
            {status.initialized ? 'System is ready' : 'Setup required'}
          </div>
        </div>
        
        {/* More stat cards... */}
      </div>

      {/* Info Section Example */}
      <div className="info-section">
        <h2 className="section-title">System Configuration</h2>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Cutoff Date</span>
            <span className="info-value">{cutoffDate}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Go-Live Date</span>
            <span className="info-value">{goLiveDate}</span>
          </div>
          {/* More info items... */}
        </div>
      </div>

      {/* Quick Actions Example */}
      <div className="quick-actions">
        <h3 className="quick-actions-title">Quick Actions</h3>
        <div className="actions-grid">
          <button 
            className="quick-action-btn primary" 
            onClick={onInitialize}
            disabled={!canInitialize}
          >
            🚀 Initialize System
          </button>
          <button 
            className="quick-action-btn" 
            onClick={onManageBalances}
          >
            📝 Enter Balances
          </button>
          <button className="quick-action-btn">
            🖨️ Print Status
          </button>
          <button className="quick-action-btn" onClick={handleRefresh}>
            🔄 Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
};
