// File Path: puvi-frontend/puvi-frontend-main/src/modules/BatchProduction/BatchProductionReport.js
// Batch Production Report Component - Printable format with traceability

import React, { useRef } from 'react';
import './BatchProductionReport.css';

const BatchProductionReport = ({ reportData, onPrint, onClose }) => {
  const printRef = useRef();
  
  if (!reportData) return null;
  
  const { 
    batch_details, 
    production_summary, 
    cost_breakdown, 
    extended_costs, 
    time_tracking,
    validation,
    traceable_code
  } = reportData;

  const handlePrint = () => {
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Batch Report - ${batch_details?.batch_code}</title>
          <style>
            body { 
              font-family: 'Times New Roman', serif; 
              padding: 20px;
              color: #333;
            }
            .report-header {
              text-align: center;
              border-bottom: 3px solid #2c3e50;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .company-name {
              font-size: 28px;
              font-weight: bold;
              color: #2c3e50;
              margin-bottom: 10px;
            }
            .report-title {
              font-size: 20px;
              color: #555;
              margin-bottom: 10px;
            }
            .traceable-code {
              font-size: 18px;
              color: #2196F3;
              font-weight: bold;
              margin: 15px 0;
              padding: 10px;
              border: 2px solid #2196F3;
              border-radius: 5px;
              display: inline-block;
            }
            .section {
              margin: 25px 0;
              page-break-inside: avoid;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              color: #2c3e50;
              border-bottom: 2px solid #e0e0e0;
              padding-bottom: 5px;
              margin-bottom: 15px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
            }
            th, td {
              padding: 10px;
              text-align: left;
              border: 1px solid #ddd;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
              color: #555;
            }
            .highlight {
              background-color: #fffacd;
            }
            .cost-total {
              font-weight: bold;
              font-size: 16px;
              background-color: #e8f5e9;
            }
            .warning {
              color: #ff9800;
              font-weight: bold;
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 2px solid #e0e0e0;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            .signature-section {
              display: flex;
              justify-content: space-around;
              margin-top: 60px;
            }
            .signature-box {
              width: 200px;
              text-align: center;
            }
            .signature-line {
              border-bottom: 1px solid #333;
              margin-bottom: 5px;
              height: 40px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <div className="batch-production-report">
      <div className="report-actions no-print">
        <button onClick={handlePrint} className="btn-print">
          🖨️ Print Report
        </button>
        <button onClick={onClose} className="btn-close">
          Close
        </button>
      </div>
      
      <div ref={printRef} className="report-content">
        {/* Header */}
        <div className="report-header">
          <div className="company-name">PUVI OIL MANUFACTURING</div>
          <div className="report-title">Batch Production Report</div>
          <div className="traceable-code">
            Traceable Code: {traceable_code || batch_details?.traceable_code || 'N/A'}
          </div>
          <div className="report-date">
            Generated: {new Date().toLocaleString('en-IN')}
          </div>
        </div>
        
        {/* Batch Details Section */}
        <div className="section">
          <div className="section-title">Batch Information</div>
          <table>
            <tbody>
              <tr>
                <th width="25%">Batch Code</th>
                <td width="25%">{batch_details?.batch_code}</td>
                <th width="25%">Production Date</th>
                <td width="25%">{batch_details?.production_date}</td>
              </tr>
              <tr>
                <th>Oil Type</th>
                <td>{batch_details?.oil_type}</td>
                <th>Seed Purchase Code</th>
                <td className="highlight">{batch_details?.seed_purchase_code || 'N/A'}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Production Summary Section */}
        <div className="section">
          <div className="section-title">Production Summary</div>
          <table>
            <tbody>
              <tr>
                <th>Seed Before Drying</th>
                <td>{production_summary?.seed_quantity_before_drying} kg</td>
                <th>Seed After Drying</th>
                <td>{production_summary?.seed_quantity_after_drying} kg</td>
              </tr>
              <tr>
                <th>Drying Loss</th>
                <td>{production_summary?.drying_loss_kg} kg ({production_summary?.drying_loss_percent}%)</td>
                <th>Oil Yield</th>
                <td className="highlight">{production_summary?.oil_yield} kg ({production_summary?.oil_yield_percent}%)</td>
              </tr>
              <tr>
                <th>Oil Cake Yield</th>
                <td>{production_summary?.cake_yield} kg</td>
                <th>Sludge Yield</th>
                <td>{production_summary?.sludge_yield || 0} kg</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Activities & Cost Breakdown */}
        <div className="section">
          <div className="section-title">Production Activities & Costs</div>
          <table>
            <thead>
              <tr>
                <th>Activity</th>
                <th>Category</th>
                <th>Quantity/Hours</th>
                <th>Rate (₹)</th>
                <th>Total Cost (₹)</th>
              </tr>
            </thead>
            <tbody>
              {extended_costs?.map((cost, idx) => (
                <tr key={idx}>
                  <td>{cost.element_name}</td>
                  <td>{cost.category}</td>
                  <td>{cost.quantity}</td>
                  <td>{cost.rate}</td>
                  <td>₹{cost.total_cost?.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="cost-total">
                <td colSpan="4">Total Production Cost</td>
                <td>₹{cost_breakdown?.total_production_cost?.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Time Tracking */}
        {time_tracking && time_tracking.length > 0 && (
          <div className="section">
            <div className="section-title">Time Tracking</div>
            <table>
              <thead>
                <tr>
                  <th>Process</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Hours (Billed)</th>
                </tr>
              </thead>
              <tbody>
                {time_tracking.map((time, idx) => (
                  <tr key={idx}>
                    <td>{time.process_type}</td>
                    <td>{time.start_time}</td>
                    <td>{time.end_time}</td>
                    <td>{time.billed_hours} hrs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Final Cost Summary */}
        <div className="section">
          <div className="section-title">Cost Summary</div>
          <table>
            <tbody>
              <tr>
                <th width="60%">Total Production Cost</th>
                <td>₹{cost_breakdown?.total_production_cost?.toFixed(2)}</td>
              </tr>
              <tr>
                <th>Less: Oil Cake Revenue (Estimated)</th>
                <td>₹{cost_breakdown?.cake_revenue?.toFixed(2)}</td>
              </tr>
              <tr>
                <th>Less: Sludge Revenue (Estimated)</th>
                <td>₹{cost_breakdown?.sludge_revenue?.toFixed(2)}</td>
              </tr>
              <tr className="cost-total">
                <th>Net Oil Cost</th>
                <td>₹{cost_breakdown?.net_oil_cost?.toFixed(2)}</td>
              </tr>
              <tr className="cost-total highlight">
                <th>Cost per kg Oil</th>
                <td>₹{cost_breakdown?.oil_cost_per_kg?.toFixed(2)}/kg</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Validation Warnings */}
        {validation?.warnings && validation.warnings.length > 0 && (
          <div className="section">
            <div className="section-title warning">⚠️ Validation Warnings</div>
            <ul>
              {validation.warnings.map((warning, idx) => (
                <li key={idx} className="warning">{warning}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Signature Section */}
        <div className="signature-section">
          <div className="signature-box">
            <div className="signature-line"></div>
            <div>Production Supervisor</div>
            <div>Date: _____________</div>
          </div>
          <div className="signature-box">
            <div className="signature-line"></div>
            <div>Quality Control</div>
            <div>Date: _____________</div>
          </div>
          <div className="signature-box">
            <div className="signature-line"></div>
            <div>Plant Manager</div>
            <div>Date: _____________</div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="footer">
          <p>This is a system-generated report for internal use and regulatory compliance</p>
          <p>Report ID: {batch_details?.batch_code}-{Date.now()}</p>
        </div>
      </div>
    </div>
  );
};

export default BatchProductionReport;
