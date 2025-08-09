// File Path: puvi-frontend/src/modules/SKUManagement/components/ProductionHistory.js
// Production History Component - View and manage past SKU productions
// Includes filters, search, and export functionality

import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

const ProductionHistory = () => {
  const [loading, setLoading] = useState(false);
  const [productions, setProductions] = useState([]);
  const [filteredProductions, setFilteredProductions] = useState([]);
  const [skus, setSkus] = useState([]);
  const [selectedProduction, setSelectedProduction] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    sku_id: '',
    dateFrom: '',
    dateTo: '',
    searchTerm: '',
    productionCode: '',
    traceableCode: '',
    status: 'all'
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  // Summary statistics
  const [summary, setSummary] = useState({
    totalProductions: 0,
    totalBottles: 0,
    totalCost: 0,
    avgCostPerBottle: 0
  });
  
  // Load data on mount
  useEffect(() => {
    fetchProductionHistory();
    fetchSKUs();
  }, []);
  
  // Apply filters when filter values change
  useEffect(() => {
    applyFilters();
  }, [filters, productions]);
  
  // Fetch production history
  const fetchProductionHistory = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/sku/production/history');
      if (response.data.success) {
        setProductions(response.data.productions || []);
        calculateSummary(response.data.productions || []);
      }
    } catch (error) {
      console.error('Error fetching production history:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch SKUs for filter dropdown
  const fetchSKUs = async () => {
    try {
      const response = await api.get('/api/sku/master?is_active=true');
      if (response.data.success) {
        setSkus(response.data.skus);
      }
    } catch (error) {
      console.error('Error fetching SKUs:', error);
    }
  };
  
  // Fetch detailed production data
  const fetchProductionDetails = async (productionId) => {
    setLoading(true);
    try {
      const response = await api.get(`/api/sku/production/${productionId}`);
      if (response.data.success) {
        setSelectedProduction(response.data.production);
        setShowDetails(true);
      }
    } catch (error) {
      console.error('Error fetching production details:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Apply filters to production list
  const applyFilters = () => {
    let filtered = [...productions];
    
    // SKU filter
    if (filters.sku_id) {
      filtered = filtered.filter(p => p.sku_id === parseInt(filters.sku_id));
    }
    
    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(p => 
        new Date(p.production_date) >= new Date(filters.dateFrom)
      );
    }
    if (filters.dateTo) {
      filtered = filtered.filter(p => 
        new Date(p.production_date) <= new Date(filters.dateTo)
      );
    }
    
    // Production code filter
    if (filters.productionCode) {
      filtered = filtered.filter(p => 
        p.production_code.toLowerCase().includes(filters.productionCode.toLowerCase())
      );
    }
    
    // Traceable code filter
    if (filters.traceableCode) {
      filtered = filtered.filter(p => 
        p.traceable_code.toLowerCase().includes(filters.traceableCode.toLowerCase())
      );
    }
    
    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(p => p.production_status === filters.status);
    }
    
    // General search
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.production_code.toLowerCase().includes(term) ||
        p.traceable_code.toLowerCase().includes(term) ||
        p.product_name?.toLowerCase().includes(term) ||
        p.operator_name?.toLowerCase().includes(term)
      );
    }
    
    setFilteredProductions(filtered);
    calculateSummary(filtered);
    setCurrentPage(1);
  };
  
  // Calculate summary statistics
  const calculateSummary = (data) => {
    const totalBottles = data.reduce((sum, p) => sum + (p.bottles_produced || 0), 0);
    const totalCost = data.reduce((sum, p) => sum + (p.total_production_cost || 0), 0);
    
    setSummary({
      totalProductions: data.length,
      totalBottles: totalBottles,
      totalCost: totalCost,
      avgCostPerBottle: totalBottles > 0 ? totalCost / totalBottles : 0
    });
  };
  
  // Handle filter changes
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Clear all filters
  const clearFilters = () => {
    setFilters({
      sku_id: '',
      dateFrom: '',
      dateTo: '',
      searchTerm: '',
      productionCode: '',
      traceableCode: '',
      status: 'all'
    });
  };
  
  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Production Code',
      'Traceable Code',
      'SKU',
      'Production Date',
      'Packing Date',
      'Bottles Produced',
      'Oil Qty (kg)',
      'Oil Cost',
      'Material Cost',
      'Labor Cost',
      'Total Cost',
      'Cost/Bottle',
      'Status',
      'Operator'
    ];
    
    const csvData = filteredProductions.map(p => [
      p.production_code,
      p.traceable_code,
      `${p.product_name} (${p.package_size})`,
      formatDate(p.production_date),
      formatDate(p.packing_date),
      p.bottles_produced,
      p.total_oil_quantity?.toFixed(2),
      p.oil_cost_total?.toFixed(2),
      p.material_cost_total?.toFixed(2),
      p.labor_cost_total?.toFixed(2),
      p.total_production_cost?.toFixed(2),
      p.cost_per_bottle?.toFixed(2),
      p.production_status || 'Completed',
      p.operator_name
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SKU_Production_History_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };
  
  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB');
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return `₹${(amount || 0).toFixed(2)}`;
  };
  
  // Get variety codes from traceable code
  const getVarietyCodes = (traceableCode) => {
    if (!traceableCode) return '';
    // Extract letters before the numbers (e.g., KU from KU801)
    const match = traceableCode.match(/^([A-Z]+)/);
    return match ? match[1] : '';
  };
  
  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProductions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProductions.length / itemsPerPage);
  
  return (
    <div className="production-history-container">
      <div className="history-header">
        <h2>Production History</h2>
        <button 
          onClick={exportToCSV}
          className="export-button"
          disabled={filteredProductions.length === 0}
        >
          📊 Export to CSV
        </button>
      </div>
      
      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <h4>Total Productions</h4>
          <p className="summary-value">{summary.totalProductions}</p>
        </div>
        <div className="summary-card">
          <h4>Total Bottles</h4>
          <p className="summary-value">{summary.totalBottles.toLocaleString()}</p>
        </div>
        <div className="summary-card">
          <h4>Total Cost</h4>
          <p className="summary-value">{formatCurrency(summary.totalCost)}</p>
        </div>
        <div className="summary-card">
          <h4>Avg Cost/Bottle</h4>
          <p className="summary-value">{formatCurrency(summary.avgCostPerBottle)}</p>
        </div>
      </div>
      
      {/* Filters Section */}
      <div className="filters-section">
        <h3>Filters</h3>
        <div className="filter-row">
          <div className="filter-group">
            <label>SKU</label>
            <select
              value={filters.sku_id}
              onChange={(e) => handleFilterChange('sku_id', e.target.value)}
            >
              <option value="">All SKUs</option>
              {skus.map(sku => (
                <option key={sku.sku_id} value={sku.sku_id}>
                  {sku.product_name} ({sku.package_size})
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Date From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label>Date To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label>Production Code</label>
            <input
              type="text"
              value={filters.productionCode}
              onChange={(e) => handleFilterChange('productionCode', e.target.value)}
              placeholder="e.g., SP-001"
            />
          </div>
          
          <div className="filter-group">
            <label>Traceable Code</label>
            <input
              type="text"
              value={filters.traceableCode}
              onChange={(e) => handleFilterChange('traceableCode', e.target.value)}
              placeholder="e.g., KU801"
            />
          </div>
          
          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        
        <div className="filter-row">
          <div className="filter-group search-group">
            <label>Search</label>
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              placeholder="Search by code, product, operator..."
              className="search-input"
            />
          </div>
          
          <button onClick={clearFilters} className="clear-filters-btn">
            Clear Filters
          </button>
        </div>
      </div>
      
      {/* Production Table */}
      <div className="production-table-container">
        <table className="production-table">
          <thead>
            <tr>
              <th>Production Code</th>
              <th>Traceable Code</th>
              <th>Varieties</th>
              <th>SKU</th>
              <th>Production Date</th>
              <th>Packing Date</th>
              <th>Bottles</th>
              <th>Oil (kg)</th>
              <th>Total Cost</th>
              <th>Cost/Bottle</th>
              <th>Status</th>
              <th>Operator</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="13" className="loading-cell">Loading...</td>
              </tr>
            ) : currentItems.length === 0 ? (
              <tr>
                <td colSpan="13" className="empty-cell">No productions found</td>
              </tr>
            ) : (
              currentItems.map((production) => (
                <tr key={production.production_id}>
                  <td className="code-cell">{production.production_code}</td>
                  <td className="code-cell">
                    <span className="traceable-code">{production.traceable_code}</span>
                  </td>
                  <td className="variety-cell">
                    <span className="variety-badge">
                      {getVarietyCodes(production.traceable_code)}
                    </span>
                  </td>
                  <td>{production.product_name} ({production.package_size})</td>
                  <td>{formatDate(production.production_date)}</td>
                  <td>{formatDate(production.packing_date)}</td>
                  <td className="number-cell">{production.bottles_produced?.toLocaleString()}</td>
                  <td className="number-cell">{production.total_oil_quantity?.toFixed(2)}</td>
                  <td className="number-cell">{formatCurrency(production.total_production_cost)}</td>
                  <td className="number-cell highlight">{formatCurrency(production.cost_per_bottle)}</td>
                  <td>
                    <span className={`status-badge status-${production.production_status || 'completed'}`}>
                      {production.production_status || 'Completed'}
                    </span>
                  </td>
                  <td>{production.operator_name}</td>
                  <td>
                    <button
                      onClick={() => fetchProductionDetails(production.production_id)}
                      className="view-details-btn"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            Previous
          </button>
          
          <span className="pagination-info">
            Page {currentPage} of {totalPages} | Total Records: {filteredProductions.length}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            Next
          </button>
        </div>
      )}
      
      {/* Production Details Modal */}
      {showDetails && selectedProduction && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Production Details</h3>
              <button onClick={() => setShowDetails(false)} className="close-btn">×</button>
            </div>
            
            <div className="modal-body">
              <div className="detail-section">
                <h4>Basic Information</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Production Code:</label>
                    <span>{selectedProduction.production_code}</span>
                  </div>
                  <div className="detail-item">
                    <label>Traceable Code:</label>
                    <span className="traceable-code">{selectedProduction.traceable_code}</span>
                  </div>
                  <div className="detail-item">
                    <label>SKU:</label>
                    <span>{selectedProduction.product_name} ({selectedProduction.package_size})</span>
                  </div>
                  <div className="detail-item">
                    <label>Oil Type:</label>
                    <span>{selectedProduction.oil_type}</span>
                  </div>
                </div>
              </div>
              
              <div className="detail-section">
                <h4>Production Quantities</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Bottles Planned:</label>
                    <span>{selectedProduction.bottles_planned?.toLocaleString()}</span>
                  </div>
                  <div className="detail-item">
                    <label>Bottles Produced:</label>
                    <span>{selectedProduction.bottles_produced?.toLocaleString()}</span>
                  </div>
                  <div className="detail-item">
                    <label>Oil Quantity:</label>
                    <span>{selectedProduction.total_oil_quantity?.toFixed(2)} kg</span>
                  </div>
                  <div className="detail-item">
                    <label>Production Efficiency:</label>
                    <span>
                      {((selectedProduction.bottles_produced / selectedProduction.bottles_planned) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="detail-section">
                <h4>Cost Breakdown</h4>
                <div className="cost-breakdown-detail">
                  <div className="cost-row">
                    <span>Oil Cost:</span>
                    <span>{formatCurrency(selectedProduction.oil_cost_total)}</span>
                  </div>
                  <div className="cost-row">
                    <span>Material Cost:</span>
                    <span>{formatCurrency(selectedProduction.material_cost_total)}</span>
                  </div>
                  <div className="cost-row">
                    <span>Labor Cost:</span>
                    <span>{formatCurrency(selectedProduction.labor_cost_total)}</span>
                  </div>
                  <div className="cost-row total">
                    <span>Total Production Cost:</span>
                    <span>{formatCurrency(selectedProduction.total_production_cost)}</span>
                  </div>
                  <div className="cost-row highlight">
                    <span>Cost per Bottle:</span>
                    <span>{formatCurrency(selectedProduction.cost_per_bottle)}</span>
                  </div>
                </div>
              </div>
              
              <div className="detail-section">
                <h4>Production Details</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Production Date:</label>
                    <span>{formatDate(selectedProduction.production_date)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Packing Date:</label>
                    <span>{formatDate(selectedProduction.packing_date)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Operator:</label>
                    <span>{selectedProduction.operator_name}</span>
                  </div>
                  <div className="detail-item">
                    <label>Shift:</label>
                    <span>Shift {selectedProduction.shift_number}</span>
                  </div>
                  <div className="detail-item">
                    <label>Production Line:</label>
                    <span>{selectedProduction.production_line}</span>
                  </div>
                  <div className="detail-item">
                    <label>Status:</label>
                    <span className={`status-badge status-${selectedProduction.production_status || 'completed'}`}>
                      {selectedProduction.production_status || 'Completed'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Oil Allocation Details */}
              {selectedProduction.oil_allocations && selectedProduction.oil_allocations.length > 0 && (
                <div className="detail-section">
                  <h4>Oil Source Allocation</h4>
                  <table className="allocation-table">
                    <thead>
                      <tr>
                        <th>Source Type</th>
                        <th>Traceable Code</th>
                        <th>Quantity (kg)</th>
                        <th>Cost/kg</th>
                        <th>Total Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProduction.oil_allocations.map((allocation, index) => (
                        <tr key={index}>
                          <td>{allocation.source_type}</td>
                          <td className="code-cell">{allocation.source_traceable_code}</td>
                          <td>{allocation.quantity_allocated?.toFixed(2)}</td>
                          <td>{formatCurrency(allocation.oil_cost_per_kg)}</td>
                          <td>{formatCurrency(allocation.allocation_cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {selectedProduction.notes && (
                <div className="detail-section">
                  <h4>Notes</h4>
                  <p className="notes-text">{selectedProduction.notes}</p>
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
