// SKU Outbound History Component - Fixed for Weight-Based Cost Allocation
// File Path: puvi-frontend/puvi-frontend-main/src/modules/SKUOutbound/OutboundHistory.js

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './OutboundHistory.css';

const OutboundHistory = ({ onRefresh }) => {
  const [outbounds, setOutbounds] = useState([]);
  const [filteredOutbounds, setFilteredOutbounds] = useState([]);
  const [locations, setLocations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [selectedOutbound, setSelectedOutbound] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Filters
  const [filters, setFilters] = useState({
    transaction_type: '',
    from_location_id: '',
    customer_id: '',
    start_date: '',
    end_date: '',
    status: '',
    outbound_code: ''
  });
  
  // Sorting
  const [sortField, setSortField] = useState('outbound_date');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    fetchMasterData();
    fetchOutbounds();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [outbounds, filters, sortField, sortOrder]);

  const fetchMasterData = async () => {
    try {
      // Fetch locations
      const locResponse = await api.locations.getAll();
      if (locResponse.success) {
        setLocations(locResponse.locations || []);
      }
      
      // Fetch customers
      const custResponse = await api.customers.getAll();
      if (custResponse.success) {
        setCustomers(custResponse.customers || []);
      }
    } catch (error) {
      console.error('Error fetching master data:', error);
    }
  };

  const fetchOutbounds = async () => {
    setLoading(true);
    try {
      const response = await api.skuOutbound.getHistory({});
      
      if (response.success && response.outbounds) {
        setOutbounds(response.outbounds);
        setFilteredOutbounds(response.outbounds);
      } else {
        setOutbounds([]);
        setFilteredOutbounds([]);
      }
    } catch (error) {
      console.error('Error fetching outbound history:', error);
      setMessage({ type: 'error', text: 'Failed to load outbound history' });
      setOutbounds([]);
      setFilteredOutbounds([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOutboundDetails = async (outboundId) => {
    try {
      const response = await api.skuOutbound.getById(outboundId);
      
      if (response.success && response.outbound) {
        setSelectedOutbound(response.outbound);
      } else {
        setMessage({ type: 'error', text: 'Failed to load outbound details' });
      }
    } catch (error) {
      console.error('Error fetching outbound details:', error);
      setMessage({ type: 'error', text: 'Failed to load outbound details' });
    }
  };

  const applyFilters = () => {
    let filtered = [...outbounds];
    
    // Apply filters
    if (filters.transaction_type) {
      filtered = filtered.filter(o => o.transaction_type === filters.transaction_type);
    }
    
    if (filters.from_location_id) {
      filtered = filtered.filter(o => {
        const location = locations.find(l => l.location_id === parseInt(filters.from_location_id));
        return location && o.from_location === location.location_name;
      });
    }
    
    if (filters.customer_id) {
      filtered = filtered.filter(o => {
        const customer = customers.find(c => c.customer_id === parseInt(filters.customer_id));
        return customer && o.customer_name === customer.customer_name;
      });
    }
    
    if (filters.status) {
      filtered = filtered.filter(o => o.status === filters.status);
    }
    
    if (filters.outbound_code) {
      filtered = filtered.filter(o => 
        (o.outbound_code || '').toLowerCase().includes(filters.outbound_code.toLowerCase())
      );
    }
    
    // Date filtering (dates come as DD-MM-YYYY from backend)
    if (filters.start_date) {
      filtered = filtered.filter(o => {
        const outboundDate = parseDDMMYYYY(o.outbound_date);
        const filterDate = new Date(filters.start_date);
        return outboundDate >= filterDate;
      });
    }
    
    if (filters.end_date) {
      filtered = filtered.filter(o => {
        const outboundDate = parseDDMMYYYY(o.outbound_date);
        const filterDate = new Date(filters.end_date);
        filterDate.setDate(filterDate.getDate() + 1); // Include end date
        return outboundDate < filterDate;
      });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch(sortField) {
        case 'outbound_date':
          aVal = parseDDMMYYYY(a.outbound_date);
          bVal = parseDDMMYYYY(b.outbound_date);
          break;
        case 'outbound_code':
          aVal = a.outbound_code || '';
          bVal = b.outbound_code || '';
          break;
        case 'grand_total':
          aVal = parseFloat(a.grand_total || 0);
          bVal = parseFloat(b.grand_total || 0);
          break;
        case 'total_units':
          aVal = parseInt(a.total_units || 0);
          bVal = parseInt(b.total_units || 0);
          break;
        case 'total_shipment_weight_kg':
          aVal = parseFloat(a.total_shipment_weight_kg || 0);
          bVal = parseFloat(b.total_shipment_weight_kg || 0);
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
    
    setFilteredOutbounds(filtered);
  };

  const parseDDMMYYYY = (dateStr) => {
    if (!dateStr) return new Date(0);
    const [day, month, year] = dateStr.split('-');
    return new Date(year, month - 1, day);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      transaction_type: '',
      from_location_id: '',
      customer_id: '',
      start_date: '',
      end_date: '',
      status: '',
      outbound_code: ''
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

  const toggleRowExpansion = (outboundId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(outboundId)) {
      newExpanded.delete(outboundId);
    } else {
      newExpanded.add(outboundId);
      // Fetch details if not already loaded
      fetchOutboundDetails(outboundId);
    }
    setExpandedRows(newExpanded);
  };

  const handleStatusUpdate = async (outboundId, newStatus) => {
    try {
      const response = await api.skuOutbound.updateStatus(outboundId, newStatus);
      
      if (response.success) {
        setMessage({ type: 'success', text: response.message });
        fetchOutbounds(); // Refresh list
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to update status' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update status' });
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Outbound Code',
      'Type',
      'Date',
      'From Location',
      'To Location/Customer',
      'Ship To',
      'Status',
      'SKU Count',
      'Total Units',
      'Total Weight (kg)',
      'Subtotal',
      'GST',
      'Transport Cost',
      'Handling Cost',
      'Grand Total',
      'Invoice No',
      'E-Way Bill',
      'Customer PO'
    ];
    
    const rows = filteredOutbounds.map(o => {
      const destination = o.transaction_type === 'sales' 
        ? o.customer_name 
        : o.to_location;
      
      return [
        o.outbound_code || '',
        o.transaction_type || '',
        o.outbound_date || '',
        o.from_location || '',
        destination || '',
        o.ship_to_location || '',
        o.status || '',
        o.sku_count || 0,
        o.total_units || 0,
        o.total_shipment_weight_kg || 0,
        o.subtotal || 0,
        o.total_gst || 0,
        o.transport_cost || 0,
        o.handling_cost || 0,
        o.grand_total || 0,
        o.invoice_number || '',
        o.eway_bill_number || '',
        o.customer_po_number || ''
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
    a.download = `outbound_history_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const calculateSummary = () => {
    const summary = {
      totalTransactions: filteredOutbounds.length,
      totalTransfers: 0,
      totalSales: 0,
      totalUnits: 0,
      totalWeight: 0,
      totalRevenue: 0,
      totalGST: 0,
      totalLogisticsCost: 0,
      grandTotal: 0,
      statusCounts: {
        draft: 0,
        confirmed: 0,
        dispatched: 0,
        delivered: 0,
        cancelled: 0
      }
    };
    
    filteredOutbounds.forEach(o => {
      // Transaction type counts
      if (o.transaction_type === 'transfer') summary.totalTransfers++;
      else if (o.transaction_type === 'sales') summary.totalSales++;
      
      // Units, weight and amounts
      summary.totalUnits += parseInt(o.total_units || 0);
      summary.totalWeight += parseFloat(o.total_shipment_weight_kg || 0);
      summary.totalRevenue += parseFloat(o.subtotal || 0);
      summary.totalGST += parseFloat(o.total_gst || 0);
      summary.grandTotal += parseFloat(o.grand_total || 0);
      
      // Logistics costs (transport + handling only)
      summary.totalLogisticsCost += parseFloat(o.transport_cost || 0) + parseFloat(o.handling_cost || 0);
      
      // Status counts
      if (o.status && summary.statusCounts[o.status] !== undefined) {
        summary.statusCounts[o.status]++;
      }
    });
    
    return summary;
  };

  const getStatusClass = (status) => {
    const statusClasses = {
      draft: 'status-draft',
      confirmed: 'status-confirmed',
      dispatched: 'status-dispatched',
      delivered: 'status-delivered',
      cancelled: 'status-cancelled'
    };
    return statusClasses[status] || '';
  };

  const getTransactionTypeClass = (type) => {
    return type === 'sales' ? 'type-sales' : 'type-transfer';
  };

  const summary = calculateSummary();

  return (
    <div className="outbound-history">
      <div className="history-header">
        <h2>Outbound History</h2>
        <div className="header-actions">
          <button className="btn-primary" onClick={exportToCSV}>
            Export to CSV
          </button>
          <button className="btn-secondary" onClick={fetchOutbounds}>
            Refresh
          </button>
        </div>
      </div>
      
      {message.text && (
        <div className={`alert ${message.type}`}>
          {message.text}
        </div>
      )}
      
      {/* Filters Section */}
      <div className="filters-section">
        <h3>Filters</h3>
        <div className="filter-grid">
          <div className="filter-item">
            <label>Transaction Type:</label>
            <select 
              value={filters.transaction_type} 
              onChange={(e) => handleFilterChange('transaction_type', e.target.value)}
            >
              <option value="">All Types</option>
              <option value="transfer">Transfer</option>
              <option value="sales">Sales</option>
            </select>
          </div>
          
          <div className="filter-item">
            <label>From Location:</label>
            <select 
              value={filters.from_location_id} 
              onChange={(e) => handleFilterChange('from_location_id', e.target.value)}
            >
              <option value="">All Locations</option>
              {locations.map(loc => (
                <option key={loc.location_id} value={loc.location_id}>
                  {loc.location_name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-item">
            <label>Customer:</label>
            <select 
              value={filters.customer_id} 
              onChange={(e) => handleFilterChange('customer_id', e.target.value)}
            >
              <option value="">All Customers</option>
              {customers.map(cust => (
                <option key={cust.customer_id} value={cust.customer_id}>
                  {cust.customer_name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-item">
            <label>Status:</label>
            <select 
              value={filters.status} 
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="confirmed">Confirmed</option>
              <option value="dispatched">Dispatched</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
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
            <label>Outbound Code:</label>
            <input 
              type="text"
              value={filters.outbound_code}
              onChange={(e) => handleFilterChange('outbound_code', e.target.value)}
              placeholder="Search code..."
            />
          </div>
        </div>
        
        <div className="filter-actions">
          <button className="btn-secondary" onClick={handleClearFilters}>
            Clear Filters
          </button>
        </div>
      </div>
      
      {/* Summary Section */}
      <div className="summary-section">
        <h3>Summary</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <label>Total Transactions:</label>
            <span className="value">{summary.totalTransactions}</span>
          </div>
          <div className="summary-item">
            <label>Transfers:</label>
            <span className="value">{summary.totalTransfers}</span>
          </div>
          <div className="summary-item">
            <label>Sales:</label>
            <span className="value">{summary.totalSales}</span>
          </div>
          <div className="summary-item">
            <label>Total Units:</label>
            <span className="value">{summary.totalUnits.toLocaleString()}</span>
          </div>
          <div className="summary-item">
            <label>Total Weight:</label>
            <span className="value">{summary.totalWeight.toFixed(2)} kg</span>
          </div>
        </div>
        
        {/* Status Summary */}
        <div className="status-summary">
          <h4>Status Overview</h4>
          <div className="status-grid">
            {Object.entries(summary.statusCounts).map(([status, count]) => (
              count > 0 && (
                <div key={status} className={`status-item ${getStatusClass(status)}`}>
                  <label>{status.charAt(0).toUpperCase() + status.slice(1)}:</label>
                  <span className="value">{count}</span>
                </div>
              )
            ))}
          </div>
        </div>
        
        {/* Financial Summary */}
        <div className="financial-summary">
          <h4>Financial Summary</h4>
          <div className="summary-grid">
            <div className="summary-item">
              <label>Revenue (Before GST):</label>
              <span className="value">{formatCurrency(summary.totalRevenue)}</span>
            </div>
            <div className="summary-item">
              <label>Total GST:</label>
              <span className="value">{formatCurrency(summary.totalGST)}</span>
            </div>
            <div className="summary-item">
              <label>Logistics Cost:</label>
              <span className="value">{formatCurrency(summary.totalLogisticsCost)}</span>
            </div>
            <div className="summary-item total">
              <label>Grand Total:</label>
              <span className="value">{formatCurrency(summary.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Table */}
      <div className="history-table">
        <h3>Outbound Records</h3>
        {loading ? (
          <div className="loading">Loading outbound history...</div>
        ) : filteredOutbounds.length === 0 ? (
          <div className="no-data">
            {outbounds.length === 0 
              ? "No outbound records found."
              : "No records match the current filters."}
          </div>
        ) : (
          <table className="outbound-table">
            <thead>
              <tr>
                <th></th>
                <th onClick={() => handleSort('outbound_code')}>
                  Outbound Code
                  {sortField === 'outbound_code' && (
                    <span className="sort-indicator">{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th>Type</th>
                <th onClick={() => handleSort('outbound_date')}>
                  Date
                  {sortField === 'outbound_date' && (
                    <span className="sort-indicator">{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th>From</th>
                <th>To</th>
                <th>SKUs</th>
                <th onClick={() => handleSort('total_units')}>
                  Units
                  {sortField === 'total_units' && (
                    <span className="sort-indicator">{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th onClick={() => handleSort('total_shipment_weight_kg')}>
                  Weight (kg)
                  {sortField === 'total_shipment_weight_kg' && (
                    <span className="sort-indicator">{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th>Transport/kg</th>
                <th>Handling/kg</th>
                <th onClick={() => handleSort('grand_total')}>
                  Total
                  {sortField === 'grand_total' && (
                    <span className="sort-indicator">{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOutbounds.map(outbound => {
                const isExpanded = expandedRows.has(outbound.outbound_id);
                const destination = outbound.transaction_type === 'sales' 
                  ? outbound.customer_name 
                  : outbound.to_location;
                
                // Calculate per-kg costs if weight is available
                const transportPerKg = outbound.total_shipment_weight_kg > 0 
                  ? (outbound.transport_cost / outbound.total_shipment_weight_kg).toFixed(2)
                  : '-';
                const handlingPerKg = outbound.total_shipment_weight_kg > 0 
                  ? (outbound.handling_cost / outbound.total_shipment_weight_kg).toFixed(2)
                  : '-';
                
                return (
                  <React.Fragment key={outbound.outbound_id}>
                    <tr className="outbound-row">
                      <td>
                        <button 
                          className="expand-btn"
                          onClick={() => toggleRowExpansion(outbound.outbound_id)}
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                      </td>
                      <td className="outbound-code">{outbound.outbound_code}</td>
                      <td>
                        <span className={`type-badge ${getTransactionTypeClass(outbound.transaction_type)}`}>
                          {outbound.transaction_type}
                        </span>
                      </td>
                      <td>{outbound.outbound_date}</td>
                      <td>{outbound.from_location}</td>
                      <td>
                        {destination}
                        {outbound.ship_to_location && (
                          <span className="ship-to"> ({outbound.ship_to_location})</span>
                        )}
                      </td>
                      <td className="text-center">{outbound.sku_count || 0}</td>
                      <td className="text-right">{outbound.total_units || 0}</td>
                      <td className="text-right">
                        {outbound.total_shipment_weight_kg 
                          ? parseFloat(outbound.total_shipment_weight_kg).toFixed(2)
                          : '-'}
                      </td>
                      <td className="text-right">
                        {transportPerKg !== '-' ? `₹${transportPerKg}` : '-'}
                      </td>
                      <td className="text-right">
                        {handlingPerKg !== '-' ? `₹${handlingPerKg}` : '-'}
                      </td>
                      <td className="total-cell">{formatCurrency(outbound.grand_total || outbound.financial?.grand_total || 0)}</td>
                      <td>
                        <span className={`status-badge ${getStatusClass(outbound.status)}`}>
                          {outbound.status}
                        </span>
                      </td>
                      <td>
                        {outbound.status === 'confirmed' && (
                          <button 
                            className="btn-link"
                            onClick={() => handleStatusUpdate(outbound.outbound_id, 'dispatched')}
                          >
                            Dispatch
                          </button>
                        )}
                        {outbound.status === 'dispatched' && (
                          <button 
                            className="btn-link"
                            onClick={() => handleStatusUpdate(outbound.outbound_id, 'delivered')}
                          >
                            Deliver
                          </button>
                        )}
                      </td>
                    </tr>
                    
                    {/* Expanded Details Row */}
                    {isExpanded && selectedOutbound && selectedOutbound.outbound_code === outbound.outbound_code && (
                      <tr className="expanded-row">
                        <td colSpan="14">
                          <div className="expanded-content">
                            {/* Transport & Documents */}
                            <div className="detail-section">
                              <h4>Transport & Documents</h4>
                              <div className="detail-grid">
                                {selectedOutbound.transport && (
                                  <>
                                    <p><strong>Mode:</strong> {selectedOutbound.transport.mode || 'N/A'}</p>
                                    <p><strong>Vendor:</strong> {selectedOutbound.transport.vendor || 'N/A'}</p>
                                    <p><strong>Vehicle:</strong> {selectedOutbound.transport.vehicle_number || 'N/A'}</p>
                                    <p><strong>LR Number:</strong> {selectedOutbound.transport.lr_number || 'N/A'}</p>
                                  </>
                                )}
                                {selectedOutbound.reference_documents && (
                                  <>
                                    <p><strong>Customer PO:</strong> {selectedOutbound.reference_documents.customer_po || 'N/A'}</p>
                                    <p><strong>Invoice:</strong> {selectedOutbound.reference_documents.invoice || 'N/A'}</p>
                                    <p><strong>E-Way Bill:</strong> {selectedOutbound.reference_documents.eway_bill || 'N/A'}</p>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            {/* Cost Breakdown */}
                            <div className="detail-section">
                              <h4>Logistics Cost Breakdown</h4>
                              <table className="cost-breakdown-table">
                                <tbody>
                                  <tr>
                                    <td>Transport Cost:</td>
                                    <td className="text-right">{formatCurrency(selectedOutbound.transport_cost || 0)}</td>
                                  </tr>
                                  <tr>
                                    <td>Handling Cost:</td>
                                    <td className="text-right">{formatCurrency(selectedOutbound.handling_cost || 0)}</td>
                                  </tr>
                                  <tr className="total-row">
                                    <td><strong>Total Logistics Cost:</strong></td>
                                    <td className="text-right">
                                      <strong>
                                        {formatCurrency(
                                          (selectedOutbound.transport_cost || 0) +
                                          (selectedOutbound.handling_cost || 0)
                                        )}
                                      </strong>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                              
                              {/* Weight-based cost allocation info */}
                              {selectedOutbound.total_shipment_weight_kg > 0 && (
                                <div className="weight-allocation-info">
                                  <p className="info-text">
                                    <strong>Total Shipment Weight:</strong> {parseFloat(selectedOutbound.total_shipment_weight_kg).toFixed(3)} kg
                                  </p>
                                  <p className="info-text">
                                    <strong>Transport Cost per kg:</strong> ₹{(selectedOutbound.transport_cost / selectedOutbound.total_shipment_weight_kg).toFixed(2)}
                                  </p>
                                  <p className="info-text">
                                    <strong>Handling Cost per kg:</strong> ₹{(selectedOutbound.handling_cost / selectedOutbound.total_shipment_weight_kg).toFixed(2)}
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            {/* Line Items */}
                            {selectedOutbound.items && selectedOutbound.items.length > 0 && (
                              <div className="detail-section full-width">
                                <h4>Line Items</h4>
                                <table className="line-items-table">
                                  <thead>
                                    <tr>
                                      <th>SKU Code</th>
                                      <th>Product Name</th>
                                      <th>Weight (kg)</th>
                                      <th>Ordered</th>
                                      <th>Shipped</th>
                                      <th>Item Weight</th>
                                      <th>Transport Cost</th>
                                      <th>Handling Cost</th>
                                      <th>Allocations</th>
                                      {selectedOutbound.transaction_type === 'sales' && (
                                        <>
                                          <th>Unit Price</th>
                                          <th>GST Rate</th>
                                          <th>GST Amount</th>
                                          <th>Line Total</th>
                                        </>
                                      )}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedOutbound.items.map((item, idx) => (
                                      <tr key={idx}>
                                        <td>{item.sku_code}</td>
                                        <td>{item.product_name}</td>
                                        <td className="text-right">
                                          {item.packaged_weight_kg 
                                            ? parseFloat(item.packaged_weight_kg).toFixed(3)
                                            : '-'}
                                        </td>
                                        <td className="text-center">{item.quantity_ordered}</td>
                                        <td className="text-center">{item.quantity_shipped}</td>
                                        <td className="text-right">
                                          {item.item_weight_kg 
                                            ? `${parseFloat(item.item_weight_kg).toFixed(3)} kg`
                                            : '-'}
                                        </td>
                                        <td className="text-right">
                                          {item.transport_cost_per_unit 
                                            ? formatCurrency(item.transport_cost_per_unit * item.quantity_shipped)
                                            : '-'}
                                        </td>
                                        <td className="text-right">
                                          {item.handling_cost_per_unit 
                                            ? formatCurrency(item.handling_cost_per_unit * item.quantity_shipped)
                                            : '-'}
                                        </td>
                                        <td>
                                          {item.allocations && item.allocations.map((alloc, aIdx) => (
                                            <div key={aIdx} className="allocation-info">
                                              <span className="allocation-code">{alloc.sku_traceable_code}</span>
                                              <span className="allocation-qty">({alloc.quantity} units)</span>
                                              {alloc.expiry_date && (
                                                <span className={`expiry-badge ${alloc.expiry_status || ''}`}>
                                                  Exp: {alloc.expiry_date}
                                                </span>
                                              )}
                                            </div>
                                          ))}
                                        </td>
                                        {selectedOutbound.transaction_type === 'sales' && (
                                          <>
                                            <td className="text-right">{formatCurrency(item.unit_price)}</td>
                                            <td className="text-center">{item.gst_rate}%</td>
                                            <td className="text-right">{formatCurrency(item.gst_amount)}</td>
                                            <td className="text-right">{formatCurrency(item.line_total)}</td>
                                          </>
                                        )}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            
                            {/* Financial Summary for Sales */}
                            {selectedOutbound.transaction_type === 'sales' && selectedOutbound.financial_summary && (
                              <div className="detail-section">
                                <h4>Financial Summary</h4>
                                <table className="financial-summary-table">
                                  <tbody>
                                    <tr>
                                      <td>Subtotal:</td>
                                      <td className="text-right">{formatCurrency(selectedOutbound.financial_summary.subtotal)}</td>
                                    </tr>
                                    <tr>
                                      <td>Total GST:</td>
                                      <td className="text-right">{formatCurrency(selectedOutbound.financial_summary.total_gst)}</td>
                                    </tr>
                                    <tr>
                                      <td>Transport Cost:</td>
                                      <td className="text-right">{formatCurrency(selectedOutbound.transport_cost || 0)}</td>
                                    </tr>
                                    <tr>
                                      <td>Handling Cost:</td>
                                      <td className="text-right">{formatCurrency(selectedOutbound.handling_cost || 0)}</td>
                                    </tr>
                                    <tr className="total-row">
                                      <td><strong>Grand Total:</strong></td>
                                      <td className="text-right">
                                        <strong>{formatCurrency(selectedOutbound.financial_summary.grand_total)}</strong>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            )}
                            
                            {/* Margin Analysis for Sales */}
                            {selectedOutbound.margin_analysis && (
                              <div className="detail-section">
                                <h4>Margin Analysis</h4>
                                <table className="margin-table">
                                  <tbody>
                                    <tr>
                                      <td>Production Cost:</td>
                                      <td className="text-right">{formatCurrency(selectedOutbound.margin_analysis.total_production_cost)}</td>
                                    </tr>
                                    <tr>
                                      <td>Revenue (Before GST):</td>
                                      <td className="text-right">{formatCurrency(selectedOutbound.margin_analysis.total_revenue_before_gst)}</td>
                                    </tr>
                                    <tr>
                                      <td>Gross Margin:</td>
                                      <td className="text-right">{formatCurrency(selectedOutbound.margin_analysis.gross_margin)}</td>
                                    </tr>
                                    <tr>
                                      <td>Margin %:</td>
                                      <td className="text-right">{selectedOutbound.margin_analysis.gross_margin_percentage.toFixed(2)}%</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            )}
                            
                            {/* Notes */}
                            {selectedOutbound.notes && (
                              <div className="detail-section full-width">
                                <h4>Notes</h4>
                                <p>{selectedOutbound.notes}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default OutboundHistory;
