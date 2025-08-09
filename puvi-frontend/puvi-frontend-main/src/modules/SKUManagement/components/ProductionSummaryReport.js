// Production Summary Report Component - Printable format for regulatory filing
// File Path: puvi-frontend/src/modules/SKUManagement/components/ProductionSummaryReport.js

import React, { useState, useEffect, useRef } from 'react';
import api, { skuDateUtils, formatUtils } from '../../../services/api';

const ProductionSummaryReport = () => {
  // State management
  const [productions, setProductions] = useState([]);
  const [selectedProduction, setSelectedProduction] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const printRef = useRef();
  
  // Filters for production list
  const [dateFilter, setDateFilter] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Fetch recent productions on mount
  useEffect(() => {
    fetchRecentProductions();
  }, [dateFilter]);

  const fetchRecentProductions = async () => {
    setLoading(true);
    try {
      const response = await api.sku.getProductionHistory({
        start_date: dateFilter.startDate,
        end_date: dateFilter.endDate,
        limit: 100
      });
      
      if (response.success && response.productions) {
        setProductions(response.productions);
      } else if (Array.isArray(response)) {
        setProductions(response);
      } else {
        setProductions([]);
      }
    } catch (error) {
      console.error('Error fetching productions:', error);
      setMessage({ type: 'error', text: 'Failed to load productions' });
      setProductions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductionSummary = async (productionId) => {
    setLoadingReport(true);
    try {
      const response = await api.sku.getProductionSummaryReport(productionId);
      
      if (response.success && response.summary) {
        setReportData(response.summary);
      } else {
        throw new Error('Failed to fetch production summary');
      }
    } catch (error) {
      console.error('Error fetching production summary:', error);
      setMessage({ type: 'error', text: 'Failed to load production summary report' });
      setReportData(null);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleProductionSelect = (e) => {
    const productionId = e.target.value;
    setSelectedProduction(productionId);
    
    if (productionId) {
      fetchProductionSummary(productionId);
    } else {
      setReportData(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDateChange = (field, value) => {
    setDateFilter(prev => ({ ...prev, [field]: value }));
  };

  // Get expiry status color
  const getExpiryStatusColor = (status) => {
    const colors = {
      expired: '#FF0000',
      critical: '#FFA500',
      warning: '#FFFF00',
      caution: '#FFFFE0',
      normal: '#00FF00'
    };
    return colors[status] || '#808080';
  };

  return (
    <div className="production-summary-report">
      {/* Control Panel - Hidden in print */}
      <div className="control-panel no-print">
        <div className="header-section">
          <h2>Production Summary Report</h2>
          <button 
            className="btn-print" 
            onClick={handlePrint}
            disabled={!reportData}
          >
            🖨️ Print Report
          </button>
        </div>

        {message.text && (
          <div className={`alert ${message.type}`}>
            {message.text}
            <button onClick={() => setMessage({ type: '', text: '' })} className="close-alert">×</button>
          </div>
        )}

        <div className="selection-section">
          <div className="date-filters">
            <div className="filter-group">
              <label>Start Date:</label>
              <input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>End Date:</label>
              <input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
              />
            </div>
            <button className="btn-refresh" onClick={fetchRecentProductions}>
              Refresh
            </button>
          </div>

          <div className="form-group">
            <label>Select Production:</label>
            <select 
              value={selectedProduction} 
              onChange={handleProductionSelect}
              disabled={loading}
            >
              <option value="">-- Select Production --</option>
              {productions.map(prod => (
                <option key={prod.production_id} value={prod.production_id}>
                  {prod.production_code} - {prod.traceable_code} | 
                  {prod.product_name} ({prod.package_size}) | 
                  Date: {skuDateUtils.formatDateForDisplay(prod.production_date)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loadingReport && (
          <div className="loading">Loading production summary report...</div>
        )}
      </div>

      {/* Printable Report Section */}
      {reportData && (
        <div className="report-container" ref={printRef}>
          <div className="report-page">
            {/* Header Section */}
            <div className="report-header">
              <div className="company-header">
                <div className="logo-section">
                  <div className="logo-placeholder">PUVI</div>
                </div>
                <div className="company-info">
                  <h1>PUVI OIL MANUFACTURING</h1>
                  <p>Production Summary Report</p>
                  <p className="report-date">Generated: {reportData.generated_at ? 
                    new Date(reportData.generated_at).toLocaleString('en-IN') : 
                    new Date().toLocaleString('en-IN')}</p>
                </div>
                <div className="report-type">
                  <span className="report-badge">OFFICIAL</span>
                  <span className="report-number">{reportData.production_details?.production_code}</span>
                </div>
              </div>
            </div>

            {/* Production Details */}
            <div className="report-section">
              <h3>Production Details</h3>
              <table className="info-table">
                <tbody>
                  <tr>
                    <td className="label">Production Code:</td>
                    <td className="value">{reportData.production_details?.production_code}</td>
                    <td className="label">Traceable Code:</td>
                    <td className="value">{reportData.production_details?.traceable_code}</td>
                  </tr>
                  <tr>
                    <td className="label">Production Date:</td>
                    <td className="value">{reportData.production_details?.production_date}</td>
                    <td className="label">Packing Date:</td>
                    <td className="value">{reportData.production_details?.packing_date}</td>
                  </tr>
                  <tr>
                    <td className="label">Shift:</td>
                    <td className="value">{reportData.production_details?.shift}</td>
                    <td className="label">Production Line:</td>
                    <td className="value">{reportData.production_details?.production_line}</td>
                  </tr>
                  <tr>
                    <td className="label">Operator:</td>
                    <td className="value" colSpan="3">{reportData.production_details?.operator}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Product Details */}
            <div className="report-section">
              <h3>Product Details</h3>
              <table className="info-table">
                <tbody>
                  <tr>
                    <td className="label">SKU Code:</td>
                    <td className="value">{reportData.product_details?.sku_code}</td>
                    <td className="label">Product Name:</td>
                    <td className="value">{reportData.product_details?.product_name}</td>
                  </tr>
                  <tr>
                    <td className="label">Oil Type:</td>
                    <td className="value">{reportData.product_details?.oil_type}</td>
                    <td className="label">Package Size:</td>
                    <td className="value">{reportData.product_details?.package_size}</td>
                  </tr>
                  <tr>
                    <td className="label">MRP:</td>
                    <td className="value highlight-mrp">{reportData.product_details?.mrp}</td>
                    <td className="label">Shelf Life:</td>
                    <td className="value">{reportData.product_details?.shelf_life_months} months</td>
                  </tr>
                  <tr>
                    <td className="label">Bottles Planned:</td>
                    <td className="value">{reportData.product_details?.bottles_planned}</td>
                    <td className="label">Bottles Produced:</td>
                    <td className="value highlight">{reportData.product_details?.bottles_produced}</td>
                  </tr>
                  <tr>
                    <td className="label">Total Oil Used:</td>
                    <td className="value" colSpan="3">{reportData.product_details?.total_oil_used_kg} kg</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Expiry Details */}
            <div className="report-section">
              <h3>Expiry Details</h3>
              <table className="info-table">
                <tbody>
                  <tr>
                    <td className="label">Expiry Date:</td>
                    <td className="value highlight">{reportData.expiry_details?.expiry_date}</td>
                    <td className="label">Days to Expiry:</td>
                    <td className="value">{reportData.expiry_details?.days_to_expiry || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td className="label">Status:</td>
                    <td className="value" colSpan="3">
                      <span 
                        className="expiry-status-badge"
                        style={{ 
                          backgroundColor: getExpiryStatusColor(reportData.expiry_details?.status),
                          color: reportData.expiry_details?.status === 'warning' || 
                                 reportData.expiry_details?.status === 'caution' ? '#000' : '#fff'
                        }}
                      >
                        {reportData.expiry_details?.status?.toUpperCase() || 'N/A'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Oil Traceability */}
            {reportData.oil_traceability && reportData.oil_traceability.length > 0 && (
              <div className="report-section">
                <h3>Oil Source Traceability</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th>Type</th>
                      <th>Oil Type</th>
                      <th>Quantity (kg)</th>
                      <th>Cost/kg</th>
                      <th>Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.oil_traceability.map((source, idx) => (
                      <tr key={idx}>
                        <td>{source.source_code || source.traceable_code}</td>
                        <td>{source.source_type}</td>
                        <td>{source.oil_type}</td>
                        <td className="number">{source.quantity_kg}</td>
                        <td className="number">{formatUtils.currency(source.cost_per_kg)}</td>
                        <td className="number">{formatUtils.currency(source.quantity_kg * source.cost_per_kg)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Materials Consumed */}
            {reportData.materials_consumed && reportData.materials_consumed.length > 0 && (
              <div className="report-section">
                <h3>Materials Consumed</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Material Name</th>
                      <th>Planned Qty</th>
                      <th>Actual Qty</th>
                      <th>Variance</th>
                      <th>Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.materials_consumed.map((material, idx) => (
                      <tr key={idx}>
                        <td>{material.material_name}</td>
                        <td className="number">{material.planned_qty}</td>
                        <td className="number">{material.actual_qty}</td>
                        <td className={`number ${material.variance > 0 ? 'positive' : material.variance < 0 ? 'negative' : ''}`}>
                          {material.variance || 0}
                        </td>
                        <td>{material.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Quality Control */}
            <div className="report-section">
              <h3>Quality Control</h3>
              <table className="info-table">
                <tbody>
                  <tr>
                    <td className="label">QC Status:</td>
                    <td className="value">{reportData.quality_control?.status}</td>
                    <td className="label">Checked By:</td>
                    <td className="value">{reportData.quality_control?.checked_by}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Cost Breakdown */}
            <div className="report-section">
              <h3>Cost Breakdown</h3>
              <table className="cost-table">
                <tbody>
                  <tr>
                    <td className="label">Oil Cost:</td>
                    <td className="value">{formatUtils.currency(reportData.cost_breakdown?.oil_cost)}</td>
                  </tr>
                  <tr>
                    <td className="label">Material Cost:</td>
                    <td className="value">{formatUtils.currency(reportData.cost_breakdown?.material_cost)}</td>
                  </tr>
                  <tr>
                    <td className="label">Labor Cost:</td>
                    <td className="value">{formatUtils.currency(reportData.cost_breakdown?.labor_cost)}</td>
                  </tr>
                  <tr className="total-row">
                    <td className="label">Total Production Cost:</td>
                    <td className="value">{formatUtils.currency(reportData.cost_breakdown?.total_cost)}</td>
                  </tr>
                  <tr>
                    <td className="label">Cost per Bottle:</td>
                    <td className="value highlight">{formatUtils.currency(reportData.cost_breakdown?.cost_per_bottle)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Notes */}
            {reportData.notes && (
              <div className="report-section">
                <h3>Notes</h3>
                <div className="notes-content">
                  {reportData.notes}
                </div>
              </div>
            )}

            {/* Approval Section */}
            <div className="report-section approval-section">
              <h3>Approvals</h3>
              <div className="signature-grid">
                <div className="signature-box">
                  <div className="signature-line"></div>
                  <p>Production Supervisor</p>
                  <p className="signature-date">Date: _____________</p>
                </div>
                <div className="signature-box">
                  <div className="signature-line"></div>
                  <p>Quality Control</p>
                  <p className="signature-date">Date: _____________</p>
                </div>
                <div className="signature-box">
                  <div className="signature-line"></div>
                  <p>Warehouse Manager</p>
                  <p className="signature-date">Date: _____________</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="report-footer">
              <p>This is a system-generated report for regulatory compliance</p>
              <p>Report ID: {reportData.production_details?.production_code}-{new Date().getTime()}</p>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* Control Panel Styles */
        .production-summary-report {
          padding: 20px;
        }

        .control-panel {
          margin-bottom: 20px;
        }

        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .header-section h2 {
          margin: 0;
          color: #2c3e50;
        }

        .btn-print {
          padding: 10px 20px;
          background: #2196F3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-print:hover:not(:disabled) {
          background: #1976D2;
        }

        .btn-print:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .alert {
          padding: 12px 40px 12px 20px;
          border-radius: 4px;
          margin-bottom: 20px;
          position: relative;
        }

        .alert.error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .close-alert {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: inherit;
        }

        .selection-section {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .date-filters {
          display: flex;
          gap: 15px;
          margin-bottom: 20px;
          align-items: flex-end;
        }

        .filter-group {
          flex: 1;
        }

        .filter-group label {
          display: block;
          margin-bottom: 5px;
          color: #555;
          font-weight: 500;
          font-size: 14px;
        }

        .filter-group input {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .btn-refresh {
          padding: 8px 16px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }

        .btn-refresh:hover {
          background: #45a049;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #555;
          font-weight: 500;
          font-size: 14px;
        }

        .form-group select {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .loading {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        /* Report Styles */
        .report-container {
          background: white;
          margin: 20px auto;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .report-page {
          width: 210mm;
          min-height: 297mm;
          padding: 20mm;
          margin: 0 auto;
          background: white;
          font-family: 'Times New Roman', Times, serif;
        }

        /* Header Styles */
        .report-header {
          border-bottom: 3px solid #2c3e50;
          padding-bottom: 20px;
          margin-bottom: 20px;
        }

        .company-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo-section {
          flex: 0 0 80px;
        }

        .logo-placeholder {
          width: 80px;
          height: 80px;
          background: #4CAF50;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: bold;
          border-radius: 8px;
        }

        .company-info {
          flex: 1;
          text-align: center;
        }

        .company-info h1 {
          margin: 0;
          font-size: 24px;
          color: #2c3e50;
        }

        .company-info p {
          margin: 5px 0;
          color: #555;
        }

        .report-date {
          font-size: 12px;
          color: #666;
        }

        .report-type {
          flex: 0 0 120px;
          text-align: right;
        }

        .report-badge {
          display: inline-block;
          background: #f44336;
          color: white;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .report-number {
          display: block;
          font-size: 14px;
          color: #666;
        }

        /* Section Styles */
        .report-section {
          margin-bottom: 25px;
        }

        .report-section h3 {
          background: #f8f9fa;
          padding: 8px 12px;
          margin: 0 0 15px 0;
          font-size: 16px;
          color: #2c3e50;
          border-left: 4px solid #4CAF50;
        }

        /* Table Styles */
        .info-table,
        .data-table,
        .cost-table {
          width: 100%;
          border-collapse: collapse;
        }

        .info-table td {
          padding: 8px;
          border: 1px solid #ddd;
        }

        .info-table .label {
          background: #f8f9fa;
          font-weight: bold;
          width: 25%;
          color: #555;
        }

        .info-table .value {
          color: #333;
        }

        .data-table th,
        .data-table td {
          padding: 8px;
          border: 1px solid #ddd;
          text-align: left;
        }

        .data-table th {
          background: #f8f9fa;
          font-weight: bold;
          color: #555;
        }

        .data-table .number {
          text-align: right;
        }

        .data-table .positive {
          color: #4CAF50;
        }

        .data-table .negative {
          color: #f44336;
        }

        .cost-table {
          width: 50%;
          margin-left: auto;
        }

        .cost-table td {
          padding: 8px;
          border: 1px solid #ddd;
        }

        .cost-table .label {
          text-align: right;
          font-weight: bold;
          color: #555;
        }

        .cost-table .value {
          text-align: right;
          color: #333;
        }

        .cost-table .total-row {
          background: #f8f9fa;
          font-weight: bold;
        }

        .highlight {
          color: #2196F3;
          font-weight: bold;
        }

        .highlight-mrp {
          color: #4CAF50;
          font-weight: bold;
          font-size: 16px;
        }

        .expiry-status-badge {
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
          display: inline-block;
        }

        /* Notes Section */
        .notes-content {
          padding: 10px;
          background: #f8f9fa;
          border: 1px solid #ddd;
          border-radius: 4px;
          min-height: 60px;
        }

        /* Approval Section */
        .approval-section {
          margin-top: 40px;
        }

        .signature-grid {
          display: flex;
          justify-content: space-between;
          margin-top: 40px;
        }

        .signature-box {
          flex: 1;
          text-align: center;
          padding: 0 10px;
        }

        .signature-line {
          border-bottom: 2px solid #333;
          height: 40px;
          margin-bottom: 5px;
        }

        .signature-box p {
          margin: 5px 0;
          font-size: 12px;
          color: #555;
        }

        .signature-date {
          font-size: 11px;
          color: #666;
        }

        /* Footer */
        .report-footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          font-size: 11px;
          color: #666;
        }

        /* Print Styles */
        @media print {
          .no-print {
            display: none !important;
          }

          .report-container {
            box-shadow: none;
            margin: 0;
          }

          .report-page {
            width: 100%;
            margin: 0;
            padding: 15mm;
            page-break-after: always;
          }

          .report-section {
            page-break-inside: avoid;
          }

          .data-table,
          .info-table {
            page-break-inside: avoid;
          }

          .approval-section {
            page-break-inside: avoid;
          }
        }

        @media (max-width: 768px) {
          .date-filters {
            flex-direction: column;
          }

          .signature-grid {
            flex-direction: column;
            gap: 30px;
          }

          .report-page {
            width: 100%;
            padding: 10mm;
          }
        }
      `}</style>
    </div>
  );
};

export default ProductionSummaryReport;
