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

  useEffect(() => {
    fetchSKUs();
    fetchProductions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [productions, filters]);

  const fetchSKUs = async () => {
    try {
      const response = await fetch('https://puvi-backend.onrender.com/api/sku/master?is_active=true');
      if (!response.ok) throw new Error('Failed to fetch SKUs');
      const data = await response.json();
      setSKUList(Array.isArray(data) ? data : []);
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
      setProductions(Array.isArray(data) ? data : []);
      setFilteredProductions(Array.isArray(data) ? data : []);
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
    
    if (filters.sku_id) {
      filtered = filtered.filter(p => p.sku_id === parseInt(filters.sku_id));
    }
    
    if (filters.start_date) {
      const startTimestamp = new Date(filters.start_date).getTime() / 1000;
      filtered = filtered.filter(p => {
        const prodDate = p.production_date || 0;
        return prodDate >= startTimestamp;
      });
    }
    
    if (filters.end_date) {
      const endTimestamp = new Date(filters.end_date).getTime() / 1000 + 86400; // Add 1 day for inclusive
      filtered = filtered.filter(p => {
        const prodDate = p.production_date || 0;
        return prodDate < endTimestamp;
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
    
    setFilteredProductions(filtered);
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

  const handleViewDetails = async (productionId) => {
    try {
      const response = await fetch(`https://puvi-backend.onrender.com/api/sku/production/${productionId}`);
      if (!response.ok) throw new Error('Failed to fetch production details');
      const data = await response.json();
      setSelectedProduction(data);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load production details' });
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      // Handle both Unix timestamps and date strings
      const date = typeof timestamp === 'number' 
        ? new Date(timestamp * 1000) 
        : new Date(timestamp);
      
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
      'Total Cost',
      'Cost per Bottle',
      'Operator'
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
        p.total_oil_quantity || 0,
        p.total_production_cost || 0,
        p.cost_per_bottle || 0,
        p.operator_name || ''
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
      totalBottlesProduced: 0,
      totalOilUsed: 0,
      totalCost: 0,
      avgCostPerBottle: 0
    };
    
    filteredProductions.forEach(p => {
      summary.totalBottlesProduced += parseInt(p.bottles_produced || 0);
      summary.totalOilUsed += parseFloat(p.total_oil_quantity || 0);
      summary.totalCost += parseFloat(p.total_production_cost || 0);
    });
    
    if (summary.totalBottlesProduced > 0) {
      summary.avgCostPerBottle = summary.totalCost / summary.totalBottlesProduced;
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
        <h3>Summary</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <label>Total Productions:</label>
            <span>{summary.totalProductions}</span>
          </div>
          <div className="summary-item">
            <label>Total Bottles:</label>
            <span>{summary.totalBottlesProduced.toLocaleString()}</span>
          </div>
          <div className="summary-item">
            <label>Total Oil Used:</label>
            <span>{summary.totalOilUsed.toFixed(2)} kg</span>
          </div>
          <div className="summary-item">
            <label>Total Cost:</label>
            <span>{formatCurrency(summary.totalCost)}</span>
          </div>
          <div className="summary-item">
            <label>Avg Cost/Bottle:</label>
            <span>{formatCurrency(summary.avgCostPerBottle)}</span>
          </div>
        </div>
      </div>
      
      <div className="history-table">
        <h3>Production Records</h3>
        {loading ? (
          <div className="loading">Loading...</div>
        ) : filteredProductions.length === 0 ? (
          <div className="no-data">No production records found</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Production Code</th>
                <th>Traceable Code</th>
                <th>SKU</th>
                <th>Date</th>
                <th>Bottles</th>
                <th>Oil (kg)</th>
                <th>Total Cost</th>
                <th>Cost/Bottle</th>
                <th>Operator</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProductions.map(prod => {
                const sku = skuList.find(s => s.sku_id === prod.sku_id);
                return (
                  <tr key={prod.production_id}>
                    <td>{prod.production_code}</td>
                    <td className="traceable-code">{prod.traceable_code}</td>
                    <td>{sku ? `${sku.sku_code}` : 'N/A'}</td>
                    <td>{formatDate(prod.production_date)}</td>
                    <td>
                      {prod.bottles_produced}/{prod.bottles_planned}
                    </td>
                    <td>{parseFloat(prod.total_oil_quantity || 0).toFixed(2)}</td>
                    <td>{formatCurrency(prod.total_production_cost)}</td>
                    <td>{formatCurrency(prod.cost_per_bottle)}</td>
                    <td>{prod.operator_name}</td>
                    <td>
                      <button 
                        className="btn-sm btn-primary"
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
                <label>Production Date:</label>
                <span>{formatDate(selectedProduction.production_date)}</span>
              </div>
              <div className="detail-item">
                <label>Packing Date:</label>
                <span>{formatDate(selectedProduction.packing_date)}</span>
              </div>
              <div className="detail-item">
                <label>Bottles Planned:</label>
                <span>{selectedProduction.bottles_planned}</span>
              </div>
              <div className="detail-item">
                <label>Bottles Produced:</label>
                <span>{selectedProduction.bottles_produced}</span>
              </div>
              <div className="detail-item">
                <label>Oil Cost:</label>
                <span>{formatCurrency(selectedProduction.oil_cost_total)}</span>
              </div>
              <div className="detail-item">
                <label>Material Cost:</label>
                <span>{formatCurrency(selectedProduction.material_cost_total)}</span>
              </div>
              <div className="detail-item">
                <label>Labor Cost:</label>
                <span>{formatCurrency(selectedProduction.labor_cost_total)}</span>
              </div>
              <div className="detail-item">
                <label>Total Cost:</label>
                <span>{formatCurrency(selectedProduction.total_production_cost)}</span>
              </div>
              <div className="detail-item">
                <label>Cost per Bottle:</label>
                <span>{formatCurrency(selectedProduction.cost_per_bottle)}</span>
              </div>
              <div className="detail-item">
                <label>Operator:</label>
                <span>{selectedProduction.operator_name}</span>
              </div>
            </div>
            
            {selectedProduction.oil_allocations && selectedProduction.oil_allocations.length > 0 && (
              <>
                <h4>Oil Sources</h4>
                <table className="detail-table">
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th>Traceable Code</th>
                      <th>Quantity (kg)</th>
                      <th>Cost/kg</th>
                      <th>Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProduction.oil_allocations.map((alloc, idx) => (
                      <tr key={idx}>
                        <td>{alloc.source_type}</td>
                        <td>{alloc.source_traceable_code}</td>
                        <td>{alloc.quantity_allocated}</td>
                        <td>{formatCurrency(alloc.oil_cost_per_kg)}</td>
                        <td>{formatCurrency(alloc.allocation_cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            
            {selectedProduction.notes && (
              <div className="notes-section">
                <h4>Notes</h4>
                <p>{selectedProduction.notes}</p>
              </div>
            )}
            
            <button className="btn-primary" onClick={() => setSelectedProduction(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionHistory;
