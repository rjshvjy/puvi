// Production History Component for SKU Management
// File Path: puvi-frontend/src/modules/SKUManagement/components/ProductionHistory.js

import React, { useState, useEffect } from 'react';

const ProductionHistory = () => {
  const [productions, setProductions] = useState([]);
  const [filteredProductions, setFilteredProductions] = useState([]);
  const [skuList, setSKUList] = useState([]);
  const [filters, setFilters] = useState({
    sku_id: '',
    start_date: '',
    end_date: '',
    traceable_code: '',
    operator: ''
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
      const response = await fetch('https://puvi-backend.onrender.com/api/sku/master?is_active=true');
      if (!response.ok) throw new Error('Failed to fetch SKUs');
      const data = await response.json();
      
      // FIX: Handle wrapped response
      setSKUList(data.skus || []);
    } catch (error) {
      console.error('Error fetching SKUs:', error);
      setSKUList([]);
    }
  };

  const fetchProductions = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://puvi-backend.onrender.com/api/sku/production/history');
      if (!response.ok) throw new Error('Failed to fetch production history');
      const data = await response.json();
      
      // FIX: Handle wrapped response and proper field names
      if (data.success && data.productions) {
        setProductions(data.productions);
        setFilteredProductions(data.productions);
      } else if (Array.isArray(data)) {
        // Handle if backend returns plain array
        setProductions(data);
        setFilteredProductions(data);
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
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch(sortField) {
        case 'production_date':
          aVal = formatDateForComparison(a.production_date);
          bVal = formatDateForComparison(b.production_date);
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
      const date = formatDateForComparison(dateValue);
      
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'N/A';
    }
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toFixed(2)}`;
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
      operator: ''
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
      const response = await fetch(`https://puvi-backend.onrender.com/api/sku/production/${productionId}`);
      if (!response.ok) throw new Error('Failed to fetch production details');
      const data = await response.json();
      
      // Handle wrapped response
      if (data.success && data.production) {
        setSelectedProduction(data.production);
      } else {
        setSelectedProduction(data);
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
      productionEfficiency: 0
    };
    
    filteredProductions.forEach(p => {
      summary.totalBottlesPlanned += parseInt(p.bottles_planned || 0);
      summary.totalBottlesProduced += parseInt(p.bottles_produced || 0);
      summary.totalOilUsed += parseFloat(p.total_oil_quantity || p.oil_required || 0);
      summary.totalOilCost += parseFloat(p.oil_cost_total || 0);
      summary.totalMaterialCost += parseFloat(p.material_cost_total || 0);
      summary.totalLaborCost += parseFloat(p.labor_cost_total || 0);
      summary.totalCost += parseFloat(p.total_production_cost || 0);
    });
    
    if (summary.totalBottlesProduced > 0) {
      summary.avgCostPerBottle = summary.totalCost / summary.totalBottlesProduced;
    }
    
    if (summary.totalBottlesPlanned > 0) {
      summary.productionEfficiency = (summary.totalBottlesProduced / summary.totalBottlesPlanned * 100);
    }
    
    return summary;
  };

  const summary = calculateSummary();

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
        
        <div className="cost-summary">
          <h4>Cost Summary</h4>
          <div className="summary-grid">
            <div className="summary-item">
              <label>Oil Cost:</label>
              <span className="value">{formatCurrency(summary.totalOilCost)}</span>
              <span className="percentage">({summary.totalCost > 0 ? ((summary.totalOilCost/summary.totalCost)*100).toFixed(1) : 0}%)</span>
            </div>
            <div className="summary-item">
              <label>Material Cost:</label>
              <span className="value">{formatCurrency(summary.totalMaterialCost)}</span>
              <span className="percentage">({summary.totalCost > 0 ? ((summary.totalMaterialCost/summary.totalCost)*100).toFixed(1) : 0}%)</span>
            </div>
            <div className="summary-item">
              <label>Labor Cost:</label>
              <span className="value">{formatCurrency(summary.totalLaborCost)}</span>
              <span className="percentage">({summary.totalCost > 0 ? ((summary.totalLaborCost/summary.totalCost)*100).toFixed(1) : 0}%)</span>
            </div>
            <div className="summary-item total">
              <label>Total Cost:</label>
              <span className="value">{formatCurrency(summary.totalCost)}</span>
            </div>
            <div className="summary-item">
              <label>Avg Cost/Bottle:</label>
              <span className="value">{formatCurrency(summary.avgCostPerBottle)}</span>
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
                  <tr key={prod.production_id}>
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
                    <td className="cost-cell">{formatCurrency(prod.oil_cost_total)}</td>
                    <td className="cost-cell">{formatCurrency(prod.material_cost_total)}</td>
                    <td className="cost-cell">{formatCurrency(prod.labor_cost_total)}</td>
                    <td className="cost-cell total">{formatCurrency(prod.total_production_cost)}</td>
                    <td className="cost-cell">{formatCurrency(costPerBottle)}</td>
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
              
              <div className="detail-section">
                <h4>Production Metrics</h4>
                <p><strong>Bottles Planned:</strong> {selectedProduction.bottles_planned}</p>
                <p><strong>Bottles Produced:</strong> {selectedProduction.bottles_produced}</p>
                <p><strong>Efficiency:</strong> {((selectedProduction.bottles_produced / selectedProduction.bottles_planned) * 100).toFixed(1)}%</p>
                <p><strong>Oil Used:</strong> {(selectedProduction.total_oil_quantity || 0).toFixed(2)} kg</p>
              </div>
              
              <div className="detail-section">
                <h4>Cost Breakdown</h4>
                <p><strong>Oil Cost:</strong> {formatCurrency(selectedProduction.oil_cost_total)}</p>
                <p><strong>Material Cost:</strong> {formatCurrency(selectedProduction.material_cost_total)}</p>
                <p><strong>Labor Cost:</strong> {formatCurrency(selectedProduction.labor_cost_total)}</p>
                <p className="total"><strong>Total Cost:</strong> {formatCurrency(selectedProduction.total_production_cost)}</p>
                <p><strong>Cost per Bottle:</strong> {formatCurrency(selectedProduction.cost_per_bottle || 
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
                        <th>Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProduction.oil_allocations.map((alloc, idx) => (
                        <tr key={idx}>
                          <td>{alloc.source_code}</td>
                          <td>{alloc.source_type}</td>
                          <td>{alloc.quantity.toFixed(2)}</td>
                          <td>{formatCurrency(alloc.quantity * alloc.cost_per_kg)}</td>
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
