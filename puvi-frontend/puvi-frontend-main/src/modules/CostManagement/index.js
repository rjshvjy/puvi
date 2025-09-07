// Cost Management Module - Reporting Dashboard
// File Path: puvi-frontend/puvi-frontend-main/src/modules/CostManagement/index.js
// Purpose: Cost reporting, validation, and master rate viewing (Phase 2 - Configuration moved to Masters)
// Version: 2.0 - Post-consolidation (Analytics Only)

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import CostElementsManager from './CostElementsManager'; // Analytics-only component
import { formatDateToDDMMYYYY, extractDateFromBatchCode } from '../../utils/dateUtils';
import './CostManagement.css';

const CostManagement = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Dashboard states
  const [dashboardStats, setDashboardStats] = useState({
    totalBatches: 0,
    batchesWithWarnings: 0,
    totalUnallocatedCosts: 0,
    recentBatches: []
  });
  
  // Master rates state (read-only now)
  const [costElements, setCostElements] = useState([]);
  
  // Batch analysis state
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchCostDetails, setBatchCostDetails] = useState(null);
  
  // Validation report state
  const [validationReport, setValidationReport] = useState([]);
  const [reportPeriod, setReportPeriod] = useState(30);
  
  // Cost trends state
  const [costTrends, setCostTrends] = useState({
    averageCostPerKg: 0,
    costByOilType: [],
    monthlyTrends: []
  });

  useEffect(() => {
    loadTabData();
  }, [activeTab]);

  const loadTabData = () => {
    switch (activeTab) {
      case 'dashboard':
        loadDashboard();
        break;
      case 'master':
        loadCostElements();
        break;
      case 'analysis':
        loadBatches();
        break;
      case 'validation':
        loadValidationReport();
        break;
      case 'trends':
        loadCostTrends();
        break;
      case 'elements':
        // CostElementsManager handles its own data loading
        break;
      default:
        break;
    }
  };

  // Dashboard functions
  const loadDashboard = async () => {
    try {
      setLoading(true);
      
      // Get validation summary
      const validationResponse = await api.costManagement.getValidationReport({ days: 7 });
      
      // Get recent batches
      const batchResponse = await api.batch.getBatchHistory({ limit: 10 });
      
      if (validationResponse.success && batchResponse.success) {
        // Calculate stats
        const totalUnallocated = validationResponse.batches_with_warnings.reduce(
          (sum, batch) => sum + (batch.missing_count * 100), // Rough estimate
          0
        );
        
        setDashboardStats({
          totalBatches: batchResponse.batches.length,
          batchesWithWarnings: validationResponse.batches_with_warnings.length,
          totalUnallocatedCosts: totalUnallocated,
          recentBatches: batchResponse.batches.slice(0, 5)
        });
      }
    } catch (error) {
      setMessage(`Error loading dashboard: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Master rates functions - UPDATED to use Masters endpoint
  const loadCostElements = async () => {
    try {
      setLoading(true);
      // Changed to use Masters endpoint directly
      const response = await api.masters.getCostElements();
      if (response.success) {
        setCostElements(response.records || response.data || response.cost_elements || []);
      }
    } catch (error) {
      setMessage(`Error loading cost elements: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Batch analysis functions
  const loadBatches = async () => {
    try {
      setLoading(true);
      const response = await api.batch.getBatchHistory({ limit: 100 });
      if (response.success) {
        // Format dates in batch data
        const formattedBatches = response.batches.map(batch => ({
          ...batch,
          production_date: formatDateToDDMMYYYY(batch.production_date),
          display_date: formatDateToDDMMYYYY(batch.production_date)
        }));
        setBatches(formattedBatches);
      }
    } catch (error) {
      setMessage(`Error loading batches: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadBatchCostDetails = async (batchId) => {
    try {
      setLoading(true);
      const response = await api.costManagement.getBatchSummary(batchId);
      if (response.success) {
        setBatchCostDetails(response.summary);
        setSelectedBatch(batchId);
      }
    } catch (error) {
      setMessage(`Error loading batch details: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Validation report functions
  const loadValidationReport = async () => {
    try {
      setLoading(true);
      const response = await api.costManagement.getValidationReport({ days: reportPeriod });
      if (response.success) {
        setValidationReport(response.batches_with_warnings);
      }
    } catch (error) {
      setMessage(`Error loading validation report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Cost trends functions
  const loadCostTrends = async () => {
    try {
      setLoading(true);
      const response = await api.batch.getBatchHistory({ limit: 200 });
      
      if (response.success) {
        // Calculate trends from batch data
        const batches = response.batches;
        
        // Average cost per kg
        const avgCost = batches.reduce((sum, b) => sum + (b.oil_cost_per_kg || 0), 0) / batches.length;
        
        // Cost by oil type
        const byOilType = {};
        batches.forEach(batch => {
          if (!byOilType[batch.oil_type]) {
            byOilType[batch.oil_type] = {
              count: 0,
              totalCost: 0,
              avgCost: 0
            };
          }
          byOilType[batch.oil_type].count++;
          byOilType[batch.oil_type].totalCost += batch.oil_cost_per_kg || 0;
        });
        
        Object.keys(byOilType).forEach(type => {
          byOilType[type].avgCost = byOilType[type].totalCost / byOilType[type].count;
        });
        
        setCostTrends({
          averageCostPerKg: avgCost,
          costByOilType: Object.entries(byOilType).map(([type, data]) => ({
            oil_type: type,
            ...data
          })),
          monthlyTrends: [] // Would need date grouping logic
        });
      }
    } catch (error) {
      setMessage(`Error loading cost trends: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const formatDate = (dateStr) => {
    return formatDateToDDMMYYYY(dateStr);
  };

  const formatCurrency = (amount) => {
    return `₹${(amount || 0).toFixed(2)}`;
  };

  const getWarningLevel = (missingCount) => {
    if (missingCount === 0) return 'success';
    if (missingCount <= 2) return 'warning';
    return 'danger';
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Labor': '#d4edda',
      'Utilities': '#cce5ff',
      'Consumables': '#fff3cd',
      'Materials': '#f8d7da',
      'Equipment': '#e2e3e5',
      'Quality': '#d1ecf1'
    };
    return colors[category] || '#e9ecef';
  };

  const styles = {
    container: {
      padding: '20px',
      maxWidth: '1400px',
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
    phaseIndicator: {
      display: 'inline-block',
      padding: '4px 12px',
      backgroundColor: '#d4edda',
      color: '#155724',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600',
      marginLeft: '15px'
    },
    message: {
      padding: '15px',
      marginBottom: '20px',
      borderRadius: '4px',
      backgroundColor: message?.includes('✅') ? '#d4edda' : message?.includes('⚠️') ? '#fff3cd' : '#f8d7da',
      color: message?.includes('✅') ? '#155724' : message?.includes('⚠️') ? '#856404' : '#721c24',
      border: `1px solid ${message?.includes('✅') ? '#c3e6cb' : message?.includes('⚠️') ? '#ffeaa7' : '#f5c6cb'}`
    },
    tabNav: {
      display: 'flex',
      gap: '5px',
      marginBottom: '25px',
      borderBottom: '2px solid #dee2e6',
      paddingBottom: '0'
    },
    tabButton: {
      padding: '12px 24px',
      border: 'none',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      fontSize: '15px',
      fontWeight: '500',
      color: '#495057',
      borderRadius: '4px 4px 0 0',
      transition: 'all 0.2s',
      borderBottom: '3px solid transparent'
    },
    activeTab: {
      backgroundColor: '#e9ecef',
      color: '#007bff',
      borderBottom: '3px solid #007bff'
    },
    content: {
      backgroundColor: '#f8f9fa',
      padding: '25px',
      borderRadius: '8px',
      minHeight: '500px'
    },
    // Dashboard specific styles
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
    // NEW: Configuration banner styles
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
      transition: 'background-color 0.2s',
      '&:hover': {
        backgroundColor: '#1976d2'
      }
    },
    // Table styles
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
    secondaryButton: {
      padding: '8px 16px',
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500'
    },
    infoBox: {
      padding: '15px',
      backgroundColor: '#e9ecef',
      borderRadius: '5px',
      marginBottom: '20px',
      borderLeft: '4px solid #007bff'
    },
    warningBox: {
      padding: '15px',
      backgroundColor: '#fff3cd',
      borderRadius: '5px',
      marginBottom: '20px',
      borderLeft: '4px solid #ffc107'
    },
    successBox: {
      padding: '15px',
      backgroundColor: '#d4edda',
      borderRadius: '5px',
      marginBottom: '20px',
      borderLeft: '4px solid #28a745'
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
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          📊 Cost Management Dashboard
          <span style={styles.phaseIndicator}>PHASE 2 - Analytics & Monitoring</span>
        </h2>
        <p style={styles.subtitle}>
          Monitor costs, validate batches, and analyze trends. Configuration has moved to Masters module.
        </p>
      </div>

      {message && (
        <div style={styles.message}>
          {message}
        </div>
      )}

      {/* Tab Navigation */}
      <div style={styles.tabNav}>
        <button
          style={{
            ...styles.tabButton,
            ...(activeTab === 'dashboard' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('dashboard')}
        >
          📈 Dashboard
        </button>
        <button
          style={{
            ...styles.tabButton,
            ...(activeTab === 'master' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('master')}
        >
          💰 Master Rates
        </button>
        <button
          style={{
            ...styles.tabButton,
            ...(activeTab === 'analysis' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('analysis')}
        >
          🔍 Batch Analysis
        </button>
        <button
          style={{
            ...styles.tabButton,
            ...(activeTab === 'validation' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('validation')}
        >
          ⚠️ Validation
        </button>
        <button
          style={{
            ...styles.tabButton,
            ...(activeTab === 'trends' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('trends')}
        >
          📊 Trends
        </button>
        <button
          style={{
            ...styles.tabButton,
            ...(activeTab === 'elements' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('elements')}
        >
          ⚙️ Cost Elements
        </button>
      </div>

      {/* Tab Content */}
      <div style={styles.content}>
        {loading && activeTab !== 'elements' && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div>Loading...</div>
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && !loading && (
          <div>
            {/* Stats Cards */}
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{dashboardStats.totalBatches}</div>
                <div style={styles.statLabel}>Recent Batches</div>
              </div>
              <div style={{...styles.statCard, borderLeftColor: '#ffc107'}}>
                <div style={styles.statValue}>{dashboardStats.batchesWithWarnings}</div>
                <div style={styles.statLabel}>With Warnings</div>
              </div>
              <div style={{...styles.statCard, borderLeftColor: '#dc3545'}}>
                <div style={styles.statValue}>₹{dashboardStats.totalUnallocatedCosts.toFixed(0)}</div>
                <div style={styles.statLabel}>Est. Unallocated</div>
              </div>
              <div style={{...styles.statCard, borderLeftColor: '#28a745'}}>
                <div style={styles.statValue}>
                  {dashboardStats.totalBatches > 0 
                    ? Math.round(((dashboardStats.totalBatches - dashboardStats.batchesWithWarnings) / dashboardStats.totalBatches) * 100)
                    : 0}%
                </div>
                <div style={styles.statLabel}>Compliance Rate</div>
              </div>
            </div>

            {/* Recent Batches */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>📅 Recent Production Batches</h3>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Batch Code</th>
                    <th style={styles.th}>Oil Type</th>
                    <th style={styles.th}>Oil Yield</th>
                    <th style={styles.th}>Cost/kg</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardStats.recentBatches.map(batch => (
                    <tr key={batch.batch_id}>
                      <td style={styles.td}>{formatDateToDDMMYYYY(batch.production_date)}</td>
                      <td style={styles.td}>
                        <strong>{batch.batch_code}</strong>
                      </td>
                      <td style={styles.td}>{batch.oil_type}</td>
                      <td style={styles.td}>{batch.oil_yield} kg</td>
                      <td style={styles.td}>
                        <strong>{formatCurrency(batch.oil_cost_per_kg)}</strong>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          backgroundColor: '#d4edda',
                          color: '#155724'
                        }}>
                          Complete
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button
                          style={{...styles.button, padding: '4px 12px', fontSize: '13px'}}
                          onClick={() => {
                            setActiveTab('analysis');
                            setSelectedBatch(batch.batch_id);
                            loadBatchCostDetails(batch.batch_id);
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quick Actions */}
            <div style={styles.warningBox}>
              <strong>🎯 Quick Actions:</strong>
              <ul style={{ marginTop: '10px', marginBottom: 0 }}>
                <li>Review batches with warnings in the Validation tab</li>
                <li>Check cost trends to identify anomalies</li>
                <li>View current master rates (configuration in Masters module)</li>
                <li>Analyze batch costs for optimization opportunities</li>
              </ul>
            </div>
          </div>
        )}

        {/* Master Rates Tab - UPDATED to be read-only with redirect */}
        {activeTab === 'master' && !loading && (
          <div>
            <div style={styles.configBanner}>
              <div style={styles.bannerText}>
                <div style={styles.bannerTitle}>
                  📍 Cost Element Configuration Has Moved
                </div>
                <div style={styles.bannerMessage}>
                  To add, edit, or manage cost elements and rates, please use the Masters module.
                  This dashboard now focuses on monitoring and analytics only.
                </div>
              </div>
              <button
                style={styles.configButton}
                onClick={() => window.location.href = '/masters?tab=cost_elements'}
              >
                Go to Masters Configuration →
              </button>
            </div>

            {/* Read-only rates table */}
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Element Name</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Unit Type</th>
                  <th style={styles.th}>Current Rate</th>
                  <th style={styles.th}>Method</th>
                  <th style={styles.th}>Type</th>
                </tr>
              </thead>
              <tbody>
                {costElements.map(element => (
                  <tr key={element.element_id}>
                    <td style={styles.td}><strong>{element.element_name}</strong></td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: getCategoryColor(element.category),
                        color: '#495057'
                      }}>
                        {element.category}
                      </span>
                    </td>
                    <td style={styles.td}>{element.unit_type}</td>
                    <td style={styles.td}>
                      <strong>₹{(element.default_rate || 0).toFixed(2)}</strong>
                    </td>
                    <td style={styles.td}>{element.calculation_method}</td>
                    <td style={styles.td}>
                      {element.is_optional ? 
                        <span style={{ color: '#ffc107' }}>Optional</span> : 
                        <span style={{ color: '#28a745' }}>Required</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={styles.infoBox}>
              <strong>💡 Viewing Master Cost Elements</strong>
              <p style={{ marginTop: '5px', marginBottom: 0 }}>
                These are the current default rates used across all modules. Changes can only be made in the Masters module.
              </p>
            </div>
          </div>
        )}

        {/* Batch Analysis Tab */}
        {activeTab === 'analysis' && !loading && (
          <div>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Select Batch for Analysis</h3>
              <select 
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  fontSize: '15px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  marginBottom: '20px'
                }}
                onChange={(e) => {
                  if (e.target.value) {
                    loadBatchCostDetails(parseInt(e.target.value));
                  }
                }}
                value={selectedBatch || ''}
              >
                <option value="">-- Select a Batch --</option>
                {batches.map(batch => {
                  const dateStr = batch.display_date || formatDateToDDMMYYYY(batch.production_date);
                  return (
                    <option key={batch.batch_id} value={batch.batch_id}>
                      {batch.batch_code} - {batch.oil_type} ({dateStr})
                    </option>
                  );
                })}
              </select>
            </div>

            {batchCostDetails && (
              <>
                {/* Batch Summary */}
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>📋 Batch Summary</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <strong>Batch Code:</strong> {batchCostDetails.batch_code}
                    </div>
                    <div>
                      <strong>Oil Type:</strong> {batchCostDetails.oil_type}
                    </div>
                    <div>
                      <strong>Production Date:</strong> {formatDateToDDMMYYYY(batchCostDetails.production_date)}
                    </div>
                    <div>
                      <strong>Oil Yield:</strong> {batchCostDetails.oil_yield} kg
                    </div>
                    <div>
                      <strong>Base Cost:</strong> {formatCurrency(batchCostDetails.base_production_cost)}
                    </div>
                    <div>
                      <strong>Extended Costs:</strong> {formatCurrency(batchCostDetails.total_extended_costs)}
                    </div>
                    <div>
                      <strong>Total Cost:</strong> {formatCurrency(batchCostDetails.total_production_cost)}
                    </div>
                    <div>
                      <strong>Cost per kg:</strong> <span style={{ fontSize: '18px', color: '#28a745' }}>
                        {formatCurrency(batchCostDetails.oil_cost_per_kg)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Extended Costs Breakdown */}
                {batchCostDetails.extended_costs?.length > 0 && (
                  <div style={styles.card}>
                    <h3 style={styles.cardTitle}>💰 Extended Costs Breakdown</h3>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Cost Element</th>
                          <th style={styles.th}>Category</th>
                          <th style={styles.th}>Quantity</th>
                          <th style={styles.th}>Rate</th>
                          <th style={styles.th}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchCostDetails.extended_costs.map((cost, idx) => (
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
                            <td style={styles.td}>{cost.quantity.toFixed(2)}</td>
                            <td style={styles.td}>{formatCurrency(cost.rate)}</td>
                            <td style={styles.td}>
                              <strong>{formatCurrency(cost.total_cost)}</strong>
                            </td>
                          </tr>
                        ))}
                        <tr style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
                          <td colSpan="4" style={styles.td}>Total Extended Costs</td>
                          <td style={styles.td}>{formatCurrency(batchCostDetails.total_extended_costs)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Time Tracking */}
                {batchCostDetails.time_tracking?.length > 0 && (
                  <div style={styles.card}>
                    <h3 style={styles.cardTitle}>⏱️ Time Tracking</h3>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Process</th>
                          <th style={styles.th}>Start Time</th>
                          <th style={styles.th}>End Time</th>
                          <th style={styles.th}>Actual Hours</th>
                          <th style={styles.th}>Billed Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchCostDetails.time_tracking.map((track, idx) => (
                          <tr key={idx}>
                            <td style={styles.td}>{track.process_type}</td>
                            <td style={styles.td}>{track.start_time}</td>
                            <td style={styles.td}>{track.end_time}</td>
                            <td style={styles.td}>{track.actual_hours} hrs</td>
                            <td style={styles.td}>
                              <strong>{track.billed_hours} hrs</strong>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Validation Warnings */}
                {batchCostDetails.validation?.has_warnings && (
                  <div style={styles.warningBox}>
                    <strong>⚠️ Validation Warnings</strong>
                    <ul style={{ marginTop: '10px' }}>
                      {batchCostDetails.validation.warnings.map((warning, idx) => (
                        <li key={idx}>
                          {warning.message}
                          {warning.amount && <strong> ({formatCurrency(warning.amount)})</strong>}
                        </li>
                      ))}
                    </ul>
                    <div style={{ marginTop: '10px', fontWeight: 'bold' }}>
                      Total Unallocated: {formatCurrency(batchCostDetails.validation.total_unallocated)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Validation Report Tab */}
        {activeTab === 'validation' && !loading && (
          <div>
            <div style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ ...styles.cardTitle, marginBottom: 0 }}>⚠️ Cost Validation Report</h3>
                <select
                  value={reportPeriod}
                  onChange={(e) => {
                    setReportPeriod(parseInt(e.target.value));
                    loadValidationReport();
                  }}
                  style={{ padding: '8px 12px', fontSize: '14px', border: '1px solid #ced4da', borderRadius: '4px' }}
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={60}>Last 60 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
              </div>

              {validationReport.length === 0 ? (
                <div style={styles.successBox}>
                  ✅ All batches in the selected period have complete cost allocations!
                </div>
              ) : (
                <>
                  <div style={styles.warningBox}>
                    <strong>Found {validationReport.length} batches with missing cost elements</strong>
                    <p style={{ marginTop: '5px', marginBottom: 0, fontSize: '13px' }}>
                      Review these batches to ensure complete cost capture.
                    </p>
                  </div>

                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Batch Code</th>
                        <th style={styles.th}>Oil Type</th>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>Captured</th>
                        <th style={styles.th}>Expected</th>
                        <th style={styles.th}>Missing</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validationReport.map(batch => {
                        const level = getWarningLevel(batch.missing_count);
                        return (
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
                                backgroundColor: level === 'warning' ? '#fff3cd' : '#f8d7da',
                                color: level === 'warning' ? '#856404' : '#721c24'
                              }}>
                                {batch.missing_count}
                              </span>
                            </td>
                            <td style={styles.td}>
                              <span style={{
                                ...styles.badge,
                                backgroundColor: level === 'warning' ? '#fff3cd' : '#f8d7da',
                                color: level === 'warning' ? '#856404' : '#721c24'
                              }}>
                                {level === 'warning' ? 'Warning' : 'Critical'}
                              </span>
                            </td>
                            <td style={styles.td}>
                              <button
                                style={{...styles.button, padding: '4px 12px', fontSize: '13px'}}
                                onClick={() => {
                                  setActiveTab('analysis');
                                  setSelectedBatch(batch.batch_id);
                                  loadBatchCostDetails(batch.batch_id);
                                }}
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div style={{ ...styles.infoBox, marginTop: '20px' }}>
                    <strong>Common Missing Elements:</strong>
                    <ul style={{ marginTop: '10px', marginBottom: 0 }}>
                      <li>Time tracking for crushing (affects labour and electricity costs)</li>
                      <li>Common costs allocation (₹2/kg for all oil)</li>
                      <li>Quality testing costs (₹1000 per batch)</li>
                      <li>Filter cloth and cleaning materials</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Cost Trends Tab */}
        {activeTab === 'trends' && !loading && (
          <div>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{formatCurrency(costTrends.averageCostPerKg)}</div>
                <div style={styles.statLabel}>Average Cost/kg</div>
              </div>
              <div style={{...styles.statCard, borderLeftColor: '#28a745'}}>
                <div style={styles.statValue}>{costTrends.costByOilType.length}</div>
                <div style={styles.statLabel}>Oil Types</div>
              </div>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>📊 Cost Analysis by Oil Type</h3>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Oil Type</th>
                    <th style={styles.th}>Batch Count</th>
                    <th style={styles.th}>Average Cost/kg</th>
                    <th style={styles.th}>Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {costTrends.costByOilType.map(type => {
                    const variance = ((type.avgCost - costTrends.averageCostPerKg) / costTrends.averageCostPerKg * 100);
                    return (
                      <tr key={type.oil_type}>
                        <td style={styles.td}>
                          <strong>{type.oil_type}</strong>
                        </td>
                        <td style={styles.td}>{type.count}</td>
                        <td style={styles.td}>
                          <strong>{formatCurrency(type.avgCost)}</strong>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            color: variance > 0 ? '#dc3545' : '#28a745',
                            fontWeight: 'bold'
                          }}>
                            {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={styles.infoBox}>
              <strong>💡 Cost Optimization Tips:</strong>
              <ul style={{ marginTop: '10px', marginBottom: 0 }}>
                <li>Oil types with higher variance may have process inefficiencies</li>
                <li>Review batches with costs significantly above average</li>
                <li>Consider bulk purchasing for frequently used materials</li>
                <li>Optimize crushing time to reduce labour and electricity costs</li>
              </ul>
            </div>
          </div>
        )}

        {/* Cost Elements Tab - Analytics Only */}
        {activeTab === 'elements' && (
          <CostElementsManager embedded={false} />
        )}
      </div>
    </div>
  );
};

export default CostManagement;
