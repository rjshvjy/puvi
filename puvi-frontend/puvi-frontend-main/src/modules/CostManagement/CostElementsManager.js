// File Path: puvi-frontend/puvi-frontend-main/src/modules/CostManagement/CostElementsManager.js
// Purpose: Cost elements monitoring, validation, and analytics (Configuration moved to Masters)
// Version: 2.0 - Post-consolidation (Analytics Only)

import React, { useState, useEffect } from 'react';

// =====================================================
// API CONFIGURATION
// =====================================================
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://puvi-backend.onrender.com';

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

// Analytics-only API endpoints (no CRUD)
const costAPI = {
  // Monitoring & Analytics endpoints
  getValidationReport: (days = 30) => apiCall(`/api/cost_elements/validation_report?days=${days}`),
  getUsageStats: () => apiCall('/api/cost_elements/usage_stats'),
  getBatchSummary: (batchId) => apiCall(`/api/cost_elements/batch_summary/${batchId}`),
  getByActivity: (activity, module = 'batch') => 
    apiCall(`/api/cost_elements/by_activity?activity=${activity}&module=${module}`),
  getByStage: (stage) => apiCall(`/api/cost_elements/by_stage?stage=${stage}`),
  
  // Configuration info endpoint
  getConfigInfo: () => apiCall('/api/cost_elements/configure')
};

// =====================================================
// MAIN COMPONENT - ANALYTICS ONLY
// =====================================================
const CostElementsManager = ({ embedded = false }) => {
  // State Management
  const [activeView, setActiveView] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  
  // Analytics data
  const [validationReport, setValidationReport] = useState([]);
  const [usageStats, setUsageStats] = useState([]);
  const [statistics, setStatistics] = useState({
    totalElements: 0,
    totalUsage: 0,
    totalCostIncurred: 0,
    elementsNeverUsed: 0,
    batchesWithWarnings: 0,
    categorySummary: []
  });
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [batchSummary, setBatchSummary] = useState(null);
  const [reportPeriod, setReportPeriod] = useState(30);

  // =====================================================
  // LIFECYCLE & DATA LOADING
  // =====================================================
  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeView === 'validation') {
      loadValidationReport();
    } else if (activeView === 'usage') {
      loadUsageStats();
    }
  }, [activeView, reportPeriod]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadValidationReport(),
        loadUsageStats()
      ]);
    } catch (error) {
      showMessage(`Error loading data: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadValidationReport = async () => {
    try {
      const response = await costAPI.getValidationReport(reportPeriod);
      if (response.success) {
        setValidationReport(response.batches_with_warnings || []);
        setStatistics(prev => ({
          ...prev,
          batchesWithWarnings: response.total_batches_with_warnings || 0
        }));
      }
    } catch (error) {
      console.error('Error loading validation report:', error);
    }
  };

  const loadUsageStats = async () => {
    try {
      const response = await costAPI.getUsageStats();
      if (response.success) {
        setUsageStats(response.usage_stats || []);
        setStatistics(prev => ({
          ...prev,
          totalElements: response.summary?.total_elements || 0,
          totalCostIncurred: response.summary?.total_cost_incurred || 0,
          elementsNeverUsed: response.summary?.elements_never_used || 0,
          categorySummary: response.category_summary || []
        }));
      }
    } catch (error) {
      console.error('Error loading usage stats:', error);
    }
  };

  const loadBatchSummary = async (batchId) => {
    try {
      setLoading(true);
      const response = await costAPI.getBatchSummary(batchId);
      if (response.success) {
        setBatchSummary(response.summary);
        setSelectedBatchId(batchId);
        setActiveView('batch-detail');
      }
    } catch (error) {
      showMessage(`Error loading batch details: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================
  const showMessage = (text, type = 'info') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const formatCurrency = (amount) => {
    return `₹${(amount || 0).toFixed(2)}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return dateStr; // Already formatted from backend
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Labor': '#d4edda',
      'Utilities': '#cce5ff',
      'Consumables': '#fff3cd',
      'Transport': '#f8d7da',
      'Quality': '#e2e3e5',
      'Maintenance': '#d1ecf1',
      'Overhead': '#e7e3f4',
      'Fixed': '#ffeeba',
      'Variable': '#bee5eb'
    };
    return colors[category] || '#f8f9fa';
  };

  // =====================================================
  // STYLES
  // =====================================================
  const styles = {
    container: {
      padding: embedded ? '10px' : '20px',
      maxWidth: embedded ? '100%' : '1400px',
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      marginBottom: '20px',
      borderBottom: '2px solid #dee2e6',
      paddingBottom: '15px'
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#333',
      marginBottom: '10px'
    },
    subtitle: {
      fontSize: '14px',
      color: '#6c757d'
    },
    configBanner: {
      padding: '20px',
      marginBottom: '25px',
      backgroundColor: '#e3f2fd',
      borderRadius: '8px',
      border: '2px solid #2196f3',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    bannerText: {
      flex: 1
    },
    bannerTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#1565c0',
      marginBottom: '5px'
    },
    bannerMessage: {
      fontSize: '14px',
      color: '#424242'
    },
    configButton: {
      padding: '12px 24px',
      backgroundColor: '#2196f3',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '15px',
      fontWeight: '600',
      textDecoration: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'background-color 0.2s',
      '&:hover': {
        backgroundColor: '#1976d2'
      }
    },
    message: {
      padding: '15px',
      marginBottom: '20px',
      borderRadius: '4px',
      backgroundColor: 
        messageType === 'success' ? '#d4edda' : 
        messageType === 'warning' ? '#fff3cd' : 
        messageType === 'error' ? '#f8d7da' : '#cce5ff',
      color: 
        messageType === 'success' ? '#155724' : 
        messageType === 'warning' ? '#856404' : 
        messageType === 'error' ? '#721c24' : '#004085',
      border: `1px solid ${
        messageType === 'success' ? '#c3e6cb' : 
        messageType === 'warning' ? '#ffeaa7' : 
        messageType === 'error' ? '#f5c6cb' : '#b8daff'
      }`
    },
    viewNav: {
      display: 'flex',
      gap: '10px',
      marginBottom: '25px',
      flexWrap: 'wrap'
    },
    viewButton: {
      padding: '10px 20px',
      border: '1px solid #dee2e6',
      backgroundColor: 'white',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      color: '#495057',
      borderRadius: '4px',
      transition: 'all 0.2s'
    },
    activeViewButton: {
      backgroundColor: '#007bff',
      color: 'white',
      borderColor: '#007bff'
    },
    content: {
      backgroundColor: '#f8f9fa',
      padding: '25px',
      borderRadius: '8px',
      minHeight: embedded ? '300px' : '500px'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      marginBottom: '30px'
    },
    statCard: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      borderLeft: '4px solid #007bff'
    },
    statValue: {
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#333',
      marginBottom: '5px'
    },
    statLabel: {
      fontSize: '14px',
      color: '#6c757d',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      backgroundColor: 'white',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    th: {
      padding: '12px',
      textAlign: 'left',
      borderBottom: '2px solid #dee2e6',
      backgroundColor: '#e9ecef',
      fontWeight: '600',
      fontSize: '14px',
      color: '#495057'
    },
    td: {
      padding: '12px',
      borderBottom: '1px solid #e9ecef',
      fontSize: '14px'
    },
    badge: {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600',
      display: 'inline-block'
    },
    button: {
      padding: '8px 16px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'background-color 0.2s'
    },
    card: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    cardTitle: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '15px',
      color: '#333'
    },
    warningBox: {
      padding: '15px',
      backgroundColor: '#fff3cd',
      borderRadius: '5px',
      marginBottom: '20px',
      borderLeft: '4px solid #ffc107'
    },
    infoBox: {
      padding: '15px',
      backgroundColor: '#e9ecef',
      borderRadius: '5px',
      marginBottom: '20px',
      borderLeft: '4px solid #007bff'
    }
  };

  // =====================================================
  // RENDER FUNCTIONS
  // =====================================================
  const renderDashboard = () => (
    <div>
      {/* Statistics Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{statistics.totalElements}</div>
          <div style={styles.statLabel}>Total Elements</div>
        </div>
        <div style={{...styles.statCard, borderLeftColor: '#28a745'}}>
          <div style={styles.statValue}>{formatCurrency(statistics.totalCostIncurred)}</div>
          <div style={styles.statLabel}>Total Cost Incurred</div>
        </div>
        <div style={{...styles.statCard, borderLeftColor: '#ffc107'}}>
          <div style={styles.statValue}>{statistics.batchesWithWarnings}</div>
          <div style={styles.statLabel}>Batches with Warnings</div>
        </div>
        <div style={{...styles.statCard, borderLeftColor: '#dc3545'}}>
          <div style={styles.statValue}>{statistics.elementsNeverUsed}</div>
          <div style={styles.statLabel}>Unused Elements</div>
        </div>
      </div>

      {/* Category Summary */}
      {statistics.categorySummary.length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📊 Cost by Category</h3>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Element Count</th>
                <th style={styles.th}>Total Uses</th>
                <th style={styles.th}>Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {statistics.categorySummary.map((cat, idx) => (
                <tr key={idx}>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: getCategoryColor(cat.category),
                      color: '#495057'
                    }}>
                      {cat.category}
                    </span>
                  </td>
                  <td style={styles.td}>{cat.element_count}</td>
                  <td style={styles.td}>{cat.total_uses}</td>
                  <td style={styles.td}>
                    <strong>{formatCurrency(cat.total_cost)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick Actions */}
      <div style={styles.infoBox}>
        <strong>🎯 Available Actions:</strong>
        <ul style={{ marginTop: '10px', marginBottom: 0 }}>
          <li>View validation reports to identify batches with missing costs</li>
          <li>Check usage statistics to find unused or overused elements</li>
          <li>Analyze batch cost breakdowns for optimization opportunities</li>
          <li>Configure new cost elements in the Masters module</li>
        </ul>
      </div>
    </div>
  );

  const renderValidationReport = () => (
    <div>
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ ...styles.cardTitle, marginBottom: 0 }}>⚠️ Cost Validation Report</h3>
          <select
            value={reportPeriod}
            onChange={(e) => setReportPeriod(parseInt(e.target.value))}
            style={{ padding: '8px 12px', fontSize: '14px', border: '1px solid #ced4da', borderRadius: '4px' }}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        {validationReport.length === 0 ? (
          <div style={{...styles.infoBox, backgroundColor: '#d4edda', borderLeftColor: '#28a745'}}>
            ✅ All batches in the selected period have complete cost allocations!
          </div>
        ) : (
          <>
            <div style={styles.warningBox}>
              <strong>Found {validationReport.length} batches with missing cost elements</strong>
              <p style={{ marginTop: '5px', marginBottom: 0, fontSize: '13px' }}>
                Phase 1 Mode: These are warnings only. Operations are not blocked.
              </p>
            </div>

            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Batch Code</th>
                  <th style={styles.th}>Oil Type</th>
                  <th style={styles.th}>Production Date</th>
                  <th style={styles.th}>Captured</th>
                  <th style={styles.th}>Expected</th>
                  <th style={styles.th}>Missing</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {validationReport.map(batch => (
                  <tr key={batch.batch_id}>
                    <td style={styles.td}>
                      <strong>{batch.batch_code}</strong>
                    </td>
                    <td style={styles.td}>{batch.oil_type}</td>
                    <td style={styles.td}>{batch.production_date}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: '#d4edda',
                        color: '#155724'
                      }}>
                        {batch.costs_captured}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: '#cce5ff',
                        color: '#004085'
                      }}>
                        {batch.costs_expected}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: batch.missing_count > 2 ? '#f8d7da' : '#fff3cd',
                        color: batch.missing_count > 2 ? '#721c24' : '#856404'
                      }}>
                        {batch.missing_count}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button
                        style={{...styles.button, padding: '4px 12px', fontSize: '13px'}}
                        onClick={() => loadBatchSummary(batch.batch_id)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );

  const renderUsageStats = () => (
    <div>
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>📈 Cost Element Usage Statistics</h3>
        
        {usageStats.length === 0 ? (
          <div style={styles.infoBox}>
            No usage data available. Start using cost elements in batch production to see statistics.
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Element Name</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Default Rate</th>
                <th style={styles.th}>Times Used</th>
                <th style={styles.th}>Avg Rate Used</th>
                <th style={styles.th}>Total Cost</th>
                <th style={styles.th}>Overrides</th>
              </tr>
            </thead>
            <tbody>
              {usageStats.map(stat => (
                <tr key={stat.element_id}>
                  <td style={styles.td}>
                    <strong>{stat.element_name}</strong>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: getCategoryColor(stat.category),
                      color: '#495057'
                    }}>
                      {stat.category}
                    </span>
                  </td>
                  <td style={styles.td}>{formatCurrency(stat.default_rate)}</td>
                  <td style={styles.td}>
                    {stat.times_used === 0 ? (
                      <span style={{ color: '#dc3545' }}>Never used</span>
                    ) : (
                      stat.times_used
                    )}
                  </td>
                  <td style={styles.td}>{formatCurrency(stat.avg_rate_used)}</td>
                  <td style={styles.td}>
                    <strong>{formatCurrency(stat.total_cost_incurred)}</strong>
                  </td>
                  <td style={styles.td}>
                    {stat.override_count > 0 && (
                      <span style={{
                        ...styles.badge,
                        backgroundColor: '#fff3cd',
                        color: '#856404'
                      }}>
                        {stat.override_count} ({stat.override_percentage}%)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  const renderBatchDetail = () => {
    if (!batchSummary) return null;

    return (
      <div>
        <button
          style={{...styles.button, marginBottom: '20px'}}
          onClick={() => setActiveView('validation')}
        >
          ← Back to Validation Report
        </button>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📋 Batch Cost Summary: {batchSummary.batch_code}</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div><strong>Oil Type:</strong> {batchSummary.oil_type}</div>
            <div><strong>Production Date:</strong> {batchSummary.production_date}</div>
            <div><strong>Oil Yield:</strong> {batchSummary.oil_yield} kg</div>
            <div><strong>Cost per kg:</strong> {formatCurrency(batchSummary.oil_cost_per_kg)}</div>
            <div><strong>Base Cost:</strong> {formatCurrency(batchSummary.base_production_cost)}</div>
            <div><strong>Extended Costs:</strong> {formatCurrency(batchSummary.total_extended_costs)}</div>
          </div>

          {/* Extended Costs Breakdown */}
          {batchSummary.extended_costs?.length > 0 && (
            <>
              <h4 style={{ fontSize: '16px', marginTop: '20px', marginBottom: '10px' }}>
                Extended Costs Breakdown
              </h4>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Element</th>
                    <th style={styles.th}>Category</th>
                    <th style={styles.th}>Activity</th>
                    <th style={styles.th}>Quantity</th>
                    <th style={styles.th}>Rate</th>
                    <th style={styles.th}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {batchSummary.extended_costs.map((cost, idx) => (
                    <tr key={idx}>
                      <td style={styles.td}>{cost.element_name}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          backgroundColor: getCategoryColor(cost.category),
                          color: '#495057'
                        }}>
                          {cost.category}
                        </span>
                      </td>
                      <td style={styles.td}>{cost.activity}</td>
                      <td style={styles.td}>{cost.quantity.toFixed(2)}</td>
                      <td style={styles.td}>{formatCurrency(cost.rate)}</td>
                      <td style={styles.td}>
                        <strong>{formatCurrency(cost.total_cost)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Validation Warnings */}
          {batchSummary.validation?.has_warnings && (
            <div style={styles.warningBox}>
              <strong>⚠️ Validation Warnings</strong>
              <ul style={{ marginTop: '10px', marginBottom: 0 }}>
                {batchSummary.validation.warnings.map((warning, idx) => (
                  <li key={idx}>
                    {warning.message}
                    {warning.amount && <strong> ({formatCurrency(warning.amount)})</strong>}
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: '10px', fontWeight: 'bold' }}>
                Total Unallocated: {formatCurrency(batchSummary.validation.total_unallocated)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // =====================================================
  // MAIN RENDER
  // =====================================================
  return (
    <div style={styles.container}>
      {!embedded && (
        <div style={styles.header}>
          <h2 style={styles.title}>
            📊 Cost Elements Monitoring & Analytics
          </h2>
          <p style={styles.subtitle}>
            View usage statistics, validation reports, and cost analysis. Configuration has moved to Masters.
          </p>
        </div>
      )}

      {/* Configuration Banner */}
      <div style={styles.configBanner}>
        <div style={styles.bannerText}>
          <div style={styles.bannerTitle}>
            📍 Cost Element Configuration Has Moved
          </div>
          <div style={styles.bannerMessage}>
            To add, edit, or manage cost elements, rates, and activities, please use the Masters module.
          </div>
        </div>
        <button
          style={styles.configButton}
          onClick={() => window.location.href = '/masters?tab=cost_elements'}
        >
          Go to Masters Configuration →
        </button>
      </div>

      {message && (
        <div style={styles.message}>
          {message}
        </div>
      )}

      {/* View Navigation */}
      <div style={styles.viewNav}>
        <button
          style={{
            ...styles.viewButton,
            ...(activeView === 'dashboard' ? styles.activeViewButton : {})
          }}
          onClick={() => setActiveView('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          style={{
            ...styles.viewButton,
            ...(activeView === 'validation' ? styles.activeViewButton : {})
          }}
          onClick={() => setActiveView('validation')}
        >
          ⚠️ Validation Report
        </button>
        <button
          style={{
            ...styles.viewButton,
            ...(activeView === 'usage' ? styles.activeViewButton : {})
          }}
          onClick={() => setActiveView('usage')}
        >
          📈 Usage Statistics
        </button>
        {selectedBatchId && (
          <button
            style={{
              ...styles.viewButton,
              ...(activeView === 'batch-detail' ? styles.activeViewButton : {})
            }}
            onClick={() => setActiveView('batch-detail')}
          >
            📋 Batch Details
          </button>
        )}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div>Loading...</div>
          </div>
        )}

        {!loading && activeView === 'dashboard' && renderDashboard()}
        {!loading && activeView === 'validation' && renderValidationReport()}
        {!loading && activeView === 'usage' && renderUsageStats()}
        {!loading && activeView === 'batch-detail' && renderBatchDetail()}
      </div>
    </div>
  );
};

export default CostElementsManager;
