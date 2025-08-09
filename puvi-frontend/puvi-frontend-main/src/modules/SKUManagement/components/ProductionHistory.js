// Production History Component with MRP and Expiry Tracking
// File Path: puvi-frontend/src/modules/SKUManagement/components/ProductionHistory.js

import React, { useState, useEffect } from 'react';
import api, { skuDateUtils, expiryUtils, formatUtils } from '../../../services/api';

const ProductionHistory = () => {
  const [productions, setProductions] = useState([]);
  const [filteredProductions, setFilteredProductions] = useState([]);
  const [skuList, setSKUList] = useState([]);
  const [filters, setFilters] = useState({
    sku_id: '',
    start_date: '',
    end_date: '',
    traceable_code: '',
    operator: '',
    expiry_status: '' // NEW - Expiry status filter
  });
  const [selectedProduction, setSelectedProduction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [sortField, setSortField] = useState('production_date');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    fetchSKUs();
    fetchProductions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [productions, filters, sortField, sortOrder]);

  const fetchSKUs = async () => {
    try {
      const response = await api.sku.getMasterList({ is_active: true });
      if (response.success && response.skus) {
        setSKUList(response.skus);
      } else {
        setSKUList([]);
      }
    } catch (error) {
      console.error('Error fetching SKUs:', error);
      setSKUList([]);
    }
  };

  const fetchProductions = async () => {
    setLoading(true);
    try {
      const response = await api.sku.getProductionHistory();
      
      if (response.success && response.productions) {
        // Process productions to add calculated fields
        const processedProductions = response.productions.map(prod => {
          // Calculate days to expiry if expiry_date exists
          let daysToExpiry = null;
          let expiryStatus = 'unknown';
          
          if (prod.expiry_date) {
            daysToExpiry = skuDateUtils.calculateDaysToExpiry(prod.expiry_date);
            expiryStatus = expiryUtils.getStatus(daysToExpiry);
          }
          
          return {
            ...prod,
            days_to_expiry: daysToExpiry !== null ? daysToExpiry : prod.days_to_expiry,
            expiry_status: expiryStatus !== 'unknown' ? expiryStatus : prod.expiry_status
          };
        });
        
        setProductions(processedProductions);
        setFilteredProductions(processedProductions);
      } else if (Array.isArray(response)) {
        // Handle if backend returns plain array
        const processedProductions = response.map(prod => {
          let daysToExpiry = null;
          let expiryStatus = 'unknown';
          
          if (prod.expiry_date) {
            daysToExpiry = skuDateUtils.calculateDaysToExpiry(prod.expiry_date);
            expiryStatus = expiryUtils.getStatus(daysToExpiry);
          }
          
          return {
            ...prod,
            days_to_expiry: daysToExpiry !== null ? daysToExpiry : prod.days_to_expiry,
            expiry_status: expiryStatus !== 'unknown' ? expiryStatus : prod.expiry_status
          };
        });
        
        setProductions(processedProductions);
        setFilteredProductions(processedProductions);
      } else {
        setProductions([]);
        setFilteredProductions([]);
        setMessage({ type: 'info', text: 'No production records found' });
      }
    } catch (error) {
      console.error('Error fetching production history:', error);
      setMessage({ type: 'error', text: 'Failed to load production history' });
      setProductions([]);
      setFilteredProductions([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...productions];
    
    // Apply filters
    if (filters.sku_id) {
      filtered = filtered.filter(p => p.sku_id === parseInt(filters.sku_id));
    }
    
    if (filters.start_date) {
      filtered = filtered.filter(p => {
        const prodDate = formatDateForComparison(p.production_date);
        const filterDate = new Date(filters.start_date);
        return prodDate >= filterDate;
      });
    }
    
    if (filters.end_date) {
      filtered = filtered.filter(p => {
        const prodDate = formatDateForComparison(p.production_date);
        const filterDate = new Date(filters.end_date);
        filterDate.setDate(filterDate.getDate() + 1); // Include end date
        return prodDate < filterDate;
      });
    }
    
    if (filters.traceable_code) {
      filtered = filtered.filter(p => 
        (p.traceable_code || '').toLowerCase().includes(filters.traceable_code.toLowerCase())
      );
    }
    
    if (filters.operator) {
      filtered = filtered.filter(p => 
        (p.operator_name || '').toLowerCase().includes(filters.operator.toLowerCase())
      );
    }
    
    // NEW - Expiry status filter
    if (filters.expiry_status) {
      filtered = filtered.filter(p => p.expiry_status === filters.expiry_status);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch(sortField) {
        case 'production_date':
          aVal = formatDateForComparison(a.production_date);
          bVal = formatDateForComparison(b.production_date);
          break;
        case 'expiry_date': // NEW
          aVal = a.expiry_date ? formatDateForComparison(a.expiry_date) : new Date(9999, 11, 31);
          bVal = b.expiry_date ? formatDateForComparison(b.expiry_date) : new Date(9999, 11, 31);
          break;
        case 'days_to_expiry': // NEW
          aVal = a.days_to_expiry !== null ? a.days_to_expiry : 9999;
          bVal = b.days_to_expiry !== null ? b.days_to_expiry : 9999;
          break;
        case 'mrp_at_production': // NEW
          aVal = parseFloat(a.mrp_at_production || 0);
          bVal = parseFloat(b.mrp_at_production || 0);
          break;
        case 'total_production_cost':
          aVal = parseFloat(a.total_production_cost || 0);
          bVal = parseFloat(b.total_production_cost || 0);
          break;
        case 'bottles_produced':
          aVal = parseInt(a.bottles_produced || 0);
          bVal = parseInt(b.bottles_produced || 0);
          break;
        case 'cost_per_bottle':
          aVal = parseFloat(a.cost_per_bottle || 0);
          bVal = parseFloat(b.cost_per_bottle || 0);
          break;
        default:
          aVal = a[sortField] || '';
          bVal = b[sortField] || '';
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
    
    setFilteredProductions(filtered);
  };

  const formatDateForComparison = (dateValue) => {
    if (!dateValue) return new Date(0);
    
    // Handle Unix timestamp (integer days since 1970)
    if (typeof dateValue === 'number') {
      if (dateValue < 100000) {
        // Days since 1970-01-01
        return new Date(dateValue * 86400000);
      } else {
        // Unix timestamp in seconds
        return new Date(dateValue * 1000);
      }
    }
    
    // Handle date string
    return new Date(dateValue);
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    
    try {
      // Use the utility function for consistent formatting
      return skuDateUtils.formatDateForDisplay(dateValue);
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'N/A';
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      sku_id: '',
      start_date: '',
      end_date: '',
      traceable_code: '',
      operator: '',
      expiry_status: ''
    });
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleViewDetails = async (productionId) => {
    try {
      const response = await api.sku.getProductionDetails(productionId);
      
      if (response.success && response.production) {
        setSelectedProduction(response.production);
      } else {
        setSelectedProduction(response);
      }
    } catch (error) {
      console.error('Error fetching production details:', error);
      setMessage({ type: 'error', text: 'Failed to load production details' });
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Production Code',
      'Traceable Code',
      'SKU Code',
      'Product Name',
      'Production Date',
      'Bottles Planned',
      'Bottles Produced',
      'Oil Used (kg)',
      'Oil Cost',
      'Material Cost',
      'Labor Cost',
      'Total Cost',
      'Cost per Bottle',
      'MRP at Production', // NEW
      'Expiry Date', // NEW
      'Days to Expiry', // NEW
      'Status', // NEW
      'Operator',
      'Shift'
    ];
    
    const rows = filteredProductions.map(p => {
      const sku = skuList.find(s => s.sku_id === p.sku_id);
      return [
        p.production_code || '',
        p.traceable_code || '',
        sku ? sku.sku_code : '',
        sku ? sku.product_name : '',
        formatDate(p.production_date),
        p.bottles_planned || 0,
        p.bottles_produced || 0,
        p.total_oil_quantity || p.oil_required || 0,
        p.oil_cost_total || 0,
        p.material_cost_total || 0,
        p.labor_cost_total || 0,
        p.total_production_cost || 0,
        p.cost_per_bottle || (p.total_production_cost / p.bottles_produced).toFixed(2) || 0,
        p.mrp_at_production || 0, // NEW
        formatDate(p.expiry_date), // NEW
        p.days_to_expiry !== null ? p.days_to_expiry : 'N/A', // NEW
        p.expiry_status || 'N/A', // NEW
        p.operator_name || '',
        p.shift_number || ''
      ];
    });
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production_history_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const calculateSummary = () => {
    const summary = {
      totalProductions: filteredProductions.length,
      totalBottlesPlanned: 0,
      totalBottlesProduced: 0,
      totalOilUsed: 0,
      totalOilCost: 0,
      totalMaterialCost: 0,
      totalLaborCost: 0,
      totalCost: 0,
      avgCostPerBottle: 0,
      productionEfficiency: 0,
      // NEW - Expiry related summary
      expiredCount: 0,
      criticalCount: 0,
      warningCount: 0,
      normalCount: 0,
      avgMRP: 0,
      totalMRPValue: 0
    };
    
    filteredProductions.forEach(p => {
      summary.totalBottlesPlanned += parseInt(p.bottles_planned || 0);
      summary.totalBottlesProduced += parseInt(p.bottles_produced || 0);
      summary.totalOilUsed += parseFloat(p.total_oil_quantity || p.oil_required || 0);
      summary.totalOilCost += parseFloat(p.oil_cost_total || 0);
      summary.totalMaterialCost += parseFloat(p.material_cost_total || 0);
      summary.totalLaborCost += parseFloat(p.labor_cost_total || 0);
      summary.totalCost += parseFloat(p.total_production_cost || 0);
      
      // NEW - Count by expiry status
      if (p.expiry_status === 'expired') summary.expiredCount++;
      else if (p.expiry_status === 'critical') summary.criticalCount++;
      else if (p.expiry_status === 'warning') summary.warningCount++;
      else if (p.expiry_status === 'normal') summary.normalCount++;
      
      // NEW - MRP calculations
      if (p.mrp_at_production) {
        summary.totalMRPValue += parseFloat(p.mrp_at_production) * parseInt(p.bottles_produced || 0);
      }
    });
    
    if (summary.totalBottlesProduced > 0) {
      summary.avgCostPerBottle = summary.totalCost / summary.totalBottlesProduced;
      summary.avgMRP = summary.totalMRPValue / summary.totalBottlesProduced;
    }
    
    if (summary.totalBottlesPlanned > 0) {
      summary.productionEfficiency = (summary.totalBottlesProduced / summary.totalBottlesPlanned * 100);
    }
    
    return summary;
  };

  const summary = calculateSummary();

  // NEW - Get row class based on expiry status
  const getRowClass = (expiryStatus) => {
    return `production-row expiry-${expiryStatus || 'unknown'}`;
  };

  return (
    <div className="production-history">
      <h2>Production History</h2>
      
      {message.text && (
        <div className={`alert ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <div className="filters-section">
        <h3>Filters</h3>
        <div className="filter-grid">
          <div className="filter-item">
            <label>SKU:</label>
            <select 
              value={filters.sku_id} 
              onChange={(e) => handleFilterChange('sku_id', e.target.value)}
            >
              <option value="">All SKUs</option>
              {skuList.map(sku => (
                <option key={sku.sku_id} value={sku.sku_id}>
                  {sku.sku_code} - {sku.product_name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-item">
            <label>Start Date:</label>
            <input 
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
            />
          </div>
          
          <div className="filter-item">
            <label>End Date:</label>
            <input 
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
            />
          </div>
          
          <div className="filter-item">
            <label>Traceable Code:</label>
            <input 
              type="text"
              value={filters.traceable_code}
              onChange={(e) => handleFilterChange('traceable_code', e.target.value)}
              placeholder="Search code..."
            />
          </div>
          
          <div className="filter-item">
            <label>Operator:</label>
            <input 
              type="text"
              value={filters.operator}
              onChange={(e) => handleFilterChange('operator', e.target.value)}
              placeholder="Search operator..."
            />
          </div>
          
          {/* NEW - Expiry status filter */}
          <div className="filter-item">
            <label>Expiry Status:</label>
            <select 
              value={filters.expiry_status} 
              onChange={(e) => handleFilterChange('expiry_status', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="expired">Expired</option>
              <option value="critical">Critical (&lt;30 days)</option>
              <option value="warning">Warning (30-60 days)</option>
              <option value="caution">Caution (60-90 days)</option>
              <option value="normal">Normal (&gt;90 days)</option>
            </select>
          </div>
        </div>
        
        <div className="filter-actions">
          <button className="btn-secondary" onClick={handleClearFilters}>
            Clear Filters
          </button>
          <button className="btn-primary" onClick={exportToCSV}>
            Export to CSV
          </button>
        </div>
      </div>
      
      <div className="summary-section">
        <h3>Production Summary</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <label>Total Productions:</label>
            <span className="value">{summary.totalProductions}</span>
          </div>
          <div className="summary-item">
            <label>Bottles Produced:</label>
            <span className="value">{summary.totalBottlesProduced.toLocaleString()}</span>
            <span className="sub-value">({summary.totalBottlesPlanned.toLocaleString()} planned)</span>
          </div>
          <div className="summary-item">
            <label>Production Efficiency:</label>
            <span className="value">{summary.productionEfficiency.toFixed(1)}%</span>
          </div>
          <div className="summary-item">
            <label>Total Oil Used:</label>
            <span className="value">{summary.totalOilUsed.toFixed(2)} kg</span>
          </div>
        </div>
        
        {/* NEW - Expiry Status Summary */}
        <div className="expiry-summary">
          <h4>Expiry Status Overview</h4>
          <div className="expiry-grid">
            {summary.expiredCount > 0 && (
              <div className="expiry-item expired">
                <label>Expired:</label>
                <span className="value">{summary.expiredCount}</span>
              </div>
            )}
            {summary.criticalCount > 0 && (
              <div className="expiry-item critical">
                <label>Critical:</label>
                <span className="value">{summary.criticalCount}</span>
              </div>
            )}
            {summary.warningCount > 0 && (
              <div className="expiry-item warning">
                <label>Warning:</label>
                <span className="value">{summary.warningCount}</span>
              </div>
            )}
            <div className="expiry-item normal">
              <label>Normal:</label>
              <span className="value">{summary.normalCount}</span>
            </div>
          </div>
        </div>
        
        <div className="cost-summary">
          <h4>Cost Summary</h4>
          <div className="summary-grid">
            <div className="summary-item">
              <label>Oil Cost:</label>
              <span className="value">{formatUtils.currency(summary.totalOilCost)}</span>
              <span className="percentage">({summary.totalCost > 0 ? ((summary.totalOilCost/summary.totalCost)*100).toFixed(1) : 0}%)</span>
            </div>
            <div className="summary-item">
              <label>Material Cost:</label>
              <span className="value">{formatUtils.currency(summary.totalMaterialCost)}</span>
              <span className="percentage">({summary.totalCost > 0 ? ((summary.totalMaterialCost/summary.totalCost)*100).toFixed(1) : 0}%)</span>
            </div>
            <div className="summary-item">
              <label>Labor Cost:</label>
              <span className="value">{formatUtils.currency(summary.totalLaborCost)}</span>
              <span className="percentage">({summary.totalCost > 0 ? ((summary.totalLaborCost/summary.totalCost)*100).toFixed(1) : 0}%)</span>
            </div>
            <div className="summary-item total">
              <label>Total Cost:</label>
              <span className="value">{formatUtils.currency(summary.totalCost)}</span>
            </div>
            <div className="summary-item">
              <label>Avg Cost/Bottle:</label>
              <span className="value">{formatUtils.currency(summary.avgCostPerBottle)}</span>
            </div>
            {/* NEW - Average MRP */}
            <div className="summary-item">
              <label>Avg MRP/Bottle:</label>
              <span className="value">{formatUtils.currency(summary.avgMRP)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="history-table">
        <h3>Production Records</h3>
        {loading ? (
          <div className="loading">Loading production history...</div>
        ) : filteredProductions.length === 0 ? (
          <div className="no-data">
            {productions.length === 0 
              ? "No production records found. Start by creating a production entry."
              : "No records match the current filters. Try adjusting your filter criteria."}
          </div>
        ) : (
          <table className="production-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('production_code')}>
                  Production Code
                  {sortField === 'production_code' && (
                    <span className="sort-indicator">{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th>Traceable Code</th>
                <th>SKU</th>
                <th onClick={() => handleSort('production_date')}>
                  Date
                  {sortField === 'production_date' && (
                    <span className="sort-indicator">{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th onClick={() => handleSort('bottles_produced')}>
                  Bottles
                  {sortField === 'bottles_produced' && (
                    <span className="sort-indicator">{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th>Oil (kg)</th>
                {/* NEW - MRP Column */}
                <th onClick={() => handleSort('mrp_at_production')}>
                  MRP
                  {sortField === 'mrp_at_production' && (
                    <span className="sort-indicator">{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                {/* NEW - Expiry Date Column */}
                <th onClick={() => handleSort('expiry_date')}>
                  Expiry
                  {sortField === 'expiry_date' && (
                    <span className="sort-indicator">{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                {/* NEW - Days to Expiry Column */}
                <th onClick={() => handleSort('days_to_expiry')}>
                  Days
                  {sortField === 'days_to_expiry' && (
                    <span className="sort-indicator">{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                {/* NEW - Status Column */}
                <th>Status</th>
                <th>Oil Cost</th>
                <th>Material Cost</th>
                <th>Labor Cost</th>
                <th onClick={() => handleSort('total_production_cost')}>
                  Total Cost
                  {sortField === 'total_production_cost' && (
                    <span className="sort-indicator">{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th onClick={() => handleSort('cost_per_bottle')}>
                  Cost/Bottle
                  {sortField === 'cost_per_bottle' && (
                    <span className="sort-indicator">{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th>Operator</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProductions.map(prod => {
                const sku = skuList.find(s => s.sku_id === prod.sku_id);
                const costPerBottle = prod.cost_per_bottle || 
                  (prod.bottles_produced > 0 ? prod.total_production_cost / prod.bottles_produced : 0);
                
                return (
                  <tr key={prod.production_id} className={getRowClass(prod.expiry_status)}>
                    <td className="production-code">{prod.production_code || `PROD-${prod.production_id}`}</td>
                    <td className="traceable-code">{prod.traceable_code || '-'}</td>
                    <td>{sku ? `${sku.sku_code} - ${sku.product_name}` : '-'}</td>
                    <td>{formatDate(prod.production_date)}</td>
                    <td>
                      {prod.bottles_produced || 0}
                      {prod.bottles_planned && prod.bottles_planned !== prod.bottles_produced && (
                        <span className="planned"> ({prod.bottles_planned} planned)</span>
                      )}
                    </td>
                    <td>{(prod.total_oil_quantity || prod.oil_required || 0).toFixed(2)}</td>
                    {/* NEW - MRP Cell */}
                    <td className="mrp-cell">{formatUtils.currency(prod.mrp_at_production)}</td>
                    {/* NEW - Expiry Date Cell */}
                    <td className="expiry-date-cell">{formatDate(prod.expiry_date)}</td>
                    {/* NEW - Days to Expiry Cell */}
                    <td className={`days-to-expiry-cell ${prod.expiry_status}`}>
                      {prod.days_to_expiry !== null ? prod.days_to_expiry : 'N/A'}
                    </td>
                    {/* NEW - Status Cell with Badge */}
                    <td className="status-cell">
                      <span 
                        className="expiry-status-badge"
                        style={{
                          backgroundColor: expiryUtils.getStatusColor(prod.expiry_status),
                          color: prod.expiry_status === 'warning' || prod.expiry_status === 'caution' ? '#000' : '#fff',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}
                      >
                        {(prod.expiry_status || 'unknown').toUpperCase()}
                      </span>
                    </td>
                    <td className="cost-cell">{formatUtils.currency(prod.oil_cost_total)}</td>
                    <td className="cost-cell">{formatUtils.currency(prod.material_cost_total)}</td>
                    <td className="cost-cell">{formatUtils.currency(prod.labor_cost_total)}</td>
                    <td className="cost-cell total">{formatUtils.currency(prod.total_production_cost)}</td>
                    <td className="cost-cell">{formatUtils.currency(costPerBottle)}</td>
                    <td>{prod.operator_name || '-'}</td>
                    <td>
                      <button 
                        className="btn-link"
                        onClick={() => handleViewDetails(prod.production_id)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Production Details Modal */}
      {selectedProduction && (
        <div className="modal-overlay" onClick={() => setSelectedProduction(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Production Details</h3>
            <button className="close-btn" onClick={() => setSelectedProduction(null)}>×</button>
            
            <div className="detail-grid">
              <div className="detail-section">
                <h4>Basic Information</h4>
                <p><strong>Production Code:</strong> {selectedProduction.production_code}</p>
                <p><strong>Traceable Code:</strong> {selectedProduction.traceable_code}</p>
                <p><strong>Production Date:</strong> {formatDate(selectedProduction.production_date)}</p>
                <p><strong>Operator:</strong> {selectedProduction.operator_name}</p>
                <p><strong>Shift:</strong> {selectedProduction.shift_number}</p>
              </div>
              
              {/* NEW - MRP and Expiry Section */}
              <div className="detail-section">
                <h4>MRP & Expiry Information</h4>
                <p><strong>MRP at Production:</strong> {formatUtils.currency(selectedProduction.mrp_at_production)}</p>
                <p><strong>Expiry Date:</strong> {formatDate(selectedProduction.expiry_date)}</p>
                <p><strong>Days to Expiry:</strong> {selectedProduction.days_to_expiry || 'N/A'}</p>
                <p><strong>Status:</strong> 
                  <span 
                    className="expiry-status-badge"
                    style={{
                      backgroundColor: expiryUtils.getStatusColor(selectedProduction.expiry_status),
                      color: selectedProduction.expiry_status === 'warning' || selectedProduction.expiry_status === 'caution' ? '#000' : '#fff',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      marginLeft: '10px'
                    }}
                  >
                    {(selectedProduction.expiry_status || 'unknown').toUpperCase()}
                  </span>
                </p>
              </div>
              
              <div className="detail-section">
                <h4>Production Metrics</h4>
                <p><strong>Bottles Planned:</strong> {selectedProduction.bottles_planned}</p>
                <p><strong>Bottles Produced:</strong> {selectedProduction.bottles_produced}</p>
                <p><strong>Efficiency:</strong> {((selectedProduction.bottles_produced / selectedProduction.bottles_planned) * 100).toFixed(1)}%</p>
                <p><strong>Oil Used:</strong> {(selectedProduction.total_oil_quantity || 0).toFixed(2)} kg</p>
              </div>
              
              <div className="detail-section">
                <h4>Cost Breakdown</h4>
                <p><strong>Oil Cost:</strong> {formatUtils.currency(selectedProduction.oil_cost_total)}</p>
                <p><strong>Material Cost:</strong> {formatUtils.currency(selectedProduction.material_cost_total)}</p>
                <p><strong>Labor Cost:</strong> {formatUtils.currency(selectedProduction.labor_cost_total)}</p>
                <p className="total"><strong>Total Cost:</strong> {formatUtils.currency(selectedProduction.total_production_cost)}</p>
                <p><strong>Cost per Bottle:</strong> {formatUtils.currency(selectedProduction.cost_per_bottle || 
                  (selectedProduction.total_production_cost / selectedProduction.bottles_produced))}</p>
              </div>
              
              {selectedProduction.oil_allocations && selectedProduction.oil_allocations.length > 0 && (
                <div className="detail-section full-width">
                  <h4>Oil Sources Used</h4>
                  <table className="allocation-detail">
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th>Type</th>
                        <th>Quantity (kg)</th>
                        <th>Cost/kg</th>
                        <th>Total Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProduction.oil_allocations.map((alloc, idx) => (
                        <tr key={idx}>
                          <td>{alloc.source_code || alloc.source_traceable_code}</td>
                          <td>{alloc.source_type}</td>
                          <td>{(alloc.quantity_allocated || alloc.quantity || 0).toFixed(2)}</td>
                          <td>{formatUtils.currency(alloc.oil_cost_per_kg || alloc.cost_per_kg || 0)}</td>
                          <td>{formatUtils.currency((alloc.quantity_allocated || alloc.quantity || 0) * (alloc.oil_cost_per_kg || alloc.cost_per_kg || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {selectedProduction.notes && (
                <div className="detail-section full-width">
                  <h4>Notes</h4>
                  <p>{selectedProduction.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionHistory;
