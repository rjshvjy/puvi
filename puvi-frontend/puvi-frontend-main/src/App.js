// Main App Component for PUVI Oil Manufacturing System
// File Path: puvi-frontend/src/App.js

import React, { useState } from 'react';
import './App.css';
import Purchase from './modules/Purchase';
import MaterialWriteoff from './modules/MaterialWriteoff';
import BatchProduction from './modules/BatchProduction';
import Blending from './modules/Blending';
import MaterialSales from './modules/MaterialSales';
import CostManagement from './modules/CostManagement';
import SKUManagement from './modules/SKUManagement';

function App() {
  const [activeModule, setActiveModule] = useState('info');

  return (
    <div className="app">
      <header>
        <h1>PUVI Oil Manufacturing System</h1>
        <p>Cost Management & Inventory Tracking with MRP & Expiry Management</p>
      </header>

      <nav style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <button 
          onClick={() => setActiveModule('info')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeModule === 'info' ? '#2c3e50' : '#ecf0f1',
            color: activeModule === 'info' ? 'white' : '#2c3e50',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: activeModule === 'info' ? 'bold' : 'normal',
            transition: 'all 0.2s ease'
          }}
        >
          System Info
        </button>
        
        <button 
          onClick={() => setActiveModule('purchase')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeModule === 'purchase' ? '#3498db' : '#ecf0f1',
            color: activeModule === 'purchase' ? 'white' : '#2c3e50',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: activeModule === 'purchase' ? 'bold' : 'normal',
            transition: 'all 0.2s ease'
          }}
        >
          Purchase
        </button>
        
        <button 
          onClick={() => setActiveModule('writeoff')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeModule === 'writeoff' ? '#e74c3c' : '#ecf0f1',
            color: activeModule === 'writeoff' ? 'white' : '#2c3e50',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: activeModule === 'writeoff' ? 'bold' : 'normal',
            transition: 'all 0.2s ease'
          }}
        >
          Material Writeoff
        </button>
        
        <button 
          onClick={() => setActiveModule('batch')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeModule === 'batch' ? '#27ae60' : '#ecf0f1',
            color: activeModule === 'batch' ? 'white' : '#2c3e50',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: activeModule === 'batch' ? 'bold' : 'normal',
            transition: 'all 0.2s ease'
          }}
        >
          Batch Production
        </button>
        
        <button 
          onClick={() => setActiveModule('blending')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeModule === 'blending' ? '#9b59b6' : '#ecf0f1',
            color: activeModule === 'blending' ? 'white' : '#2c3e50',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: activeModule === 'blending' ? 'bold' : 'normal',
            transition: 'all 0.2s ease'
          }}
        >
          Blending
        </button>
        
        <button 
          onClick={() => setActiveModule('sku')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeModule === 'sku' ? '#f39c12' : '#ecf0f1',
            color: activeModule === 'sku' ? 'white' : '#2c3e50',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: activeModule === 'sku' ? 'bold' : 'normal',
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
        >
          SKU Management
          <span style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            background: '#4CAF50',
            color: 'white',
            borderRadius: '50%',
            fontSize: '10px',
            padding: '2px 6px',
            fontWeight: 'bold'
          }}>v2</span>
        </button>
        
        <button 
          onClick={() => setActiveModule('sales')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeModule === 'sales' ? '#e67e22' : '#ecf0f1',
            color: activeModule === 'sales' ? 'white' : '#2c3e50',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: activeModule === 'sales' ? 'bold' : 'normal',
            transition: 'all 0.2s ease'
          }}
        >
          Material Sales
        </button>
        
        <button 
          onClick={() => setActiveModule('costManagement')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeModule === 'costManagement' ? '#16a085' : '#ecf0f1',
            color: activeModule === 'costManagement' ? 'white' : '#2c3e50',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: activeModule === 'costManagement' ? 'bold' : 'normal',
            transition: 'all 0.2s ease'
          }}
        >
          Cost Management
        </button>
      </nav>

      {activeModule === 'info' && (
        <div className="info-section">
          <h3>System Status</h3>
          <ul>
            <li>✅ Purchase Module - With Traceability</li>
            <li>✅ Material Writeoff - Functional</li>
            <li>✅ Batch Production - With Traceability</li>
            <li>✅ Blending Module - Functional</li>
            <li>✅ Material Sales - With FIFO & Cost Reconciliation</li>
            <li>✅ Cost Management - Frontend Complete, Integration Pending</li>
            <li>✅ <strong style={{color: '#4CAF50'}}>SKU Management v2.0 - COMPLETE with MRP & Expiry</strong></li>
            <li>🔄 Traceability System - Partially Implemented</li>
            <li>📋 Reports & Analytics - To be implemented</li>
          </ul>
          
          <h3 style={{ marginTop: '30px', color: '#4CAF50' }}>🎉 SKU Management Module v2.0 - COMPLETE</h3>
          <ul>
            <li>✅ <strong>Backend:</strong> sku_production.py v2.0 with 14 new MRP/Expiry endpoints</li>
            <li>✅ <strong>Database:</strong> All tables updated (mrp_current, shelf_life_months, expiry_date)</li>
            <li>✅ <strong>SKU Master:</strong> Complete CRUD with MRP tracking & shelf life configuration</li>
            <li>✅ <strong>MRP History:</strong> Timeline view with change tracking & audit trail</li>
            <li>✅ <strong>BOM Configuration:</strong> Material versioning with MRP display</li>
            <li>✅ <strong>Production Entry:</strong> Auto-captures MRP at production & calculates expiry</li>
            <li>✅ <strong>Production History:</strong> Enhanced with MRP/Expiry columns & status colors</li>
            <li>✅ <strong>Expiry Alerts:</strong> Real-time dashboard with auto-refresh & export</li>
            <li>✅ <strong>Production Reports:</strong> Printable A4 format for regulatory compliance</li>
            <li>✅ <strong>FEFO System:</strong> First-Expiry-First-Out inventory allocation</li>
          </ul>
          
          <h3 style={{ marginTop: '30px' }}>MRP & Expiry Features</h3>
          <ul>
            <li>💰 <strong>MRP Tracking:</strong> Historical MRP changes with reasons & approval</li>
            <li>📅 <strong>Shelf Life:</strong> Configurable 1-60 months per SKU</li>
            <li>⏰ <strong>Expiry Calculation:</strong> Auto-calculated from production date + shelf life</li>
            <li>🚨 <strong>Status Levels:</strong> Expired (Red), Critical (Orange), Warning (Yellow), Caution (Light Yellow), Normal (Green)</li>
            <li>📊 <strong>Dashboard Cards:</strong> Visual summary with counts & quantities</li>
            <li>🔄 <strong>Auto-Refresh:</strong> Optional 1-minute refresh for real-time monitoring</li>
            <li>📤 <strong>Export:</strong> CSV export for filtered expiry data</li>
            <li>🖨️ <strong>Reports:</strong> Print-ready production summaries with all details</li>
          </ul>
          
          <h3 style={{ marginTop: '30px' }}>Cost Management Module Status</h3>
          <ul>
            <li>✅ <strong>Backend:</strong> All 7 API endpoints working</li>
            <li>✅ <strong>Database:</strong> 14 cost elements defined</li>
            <li>✅ <strong>Frontend:</strong> Main component with 3 tabs</li>
            <li>✅ <strong>Time Tracking:</strong> Capture crushing hours with cost calculation</li>
            <li>✅ <strong>Cost Override:</strong> Rate adjustment with audit logging</li>
            <li>✅ <strong>Validation:</strong> Phase 1 warnings (non-blocking)</li>
            <li>🔄 <strong>BatchProduction Integration:</strong> TimeTracker to be added to Step 3</li>
            <li>🔄 <strong>Extended Costs Display:</strong> To be added to Step 4</li>
          </ul>
          
          <h3 style={{ marginTop: '30px' }}>14 Cost Elements Active</h3>
          <ul>
            <li><strong>Labor Costs:</strong> Drying Labour (₹0.90/kg), Loading (₹0.12/kg), Crushing (₹150/hr), Filtering (₹550/batch)</li>
            <li><strong>Utilities:</strong> Electricity-Crushing (₹75/hr), Common Costs (₹2/kg)</li>
            <li><strong>Consumables:</strong> Filter Cloth (₹120), Cleaning Materials (₹150), Quality Testing (₹1000)</li>
            <li><strong>Maintenance:</strong> Machine Maintenance (₹500 - optional)</li>
            <li><strong>Transport:</strong> Oil Outward (₹1.20/kg - optional)</li>
          </ul>
          
          <h3 style={{ marginTop: '30px', color: '#4CAF50' }}>🆕 Latest Updates - SKU v2.0</h3>
          <ul>
            <li>🎉 <strong>COMPLETE:</strong> SKU Management v2.0 with full MRP & Expiry tracking</li>
            <li>✨ SKU Master component with dynamic oil types & density from materials</li>
            <li>✨ MRP History timeline with percentage change indicators</li>
            <li>✨ Expiry Alert dashboard with 5 urgency levels</li>
            <li>✨ Production Summary Report for regulatory compliance</li>
            <li>✨ Auto-calculation of expiry dates based on shelf life</li>
            <li>✨ FEFO allocation system for inventory management</li>
            <li>✨ 7 integrated tabs in SKU Management module</li>
          </ul>
          
          <h3 style={{ marginTop: '30px' }}>Next Steps</h3>
          <ul>
            <li>📌 <strong style={{color: '#4CAF50'}}>TEST SKU v2.0:</strong> Complete end-to-end testing of MRP & Expiry features</li>
            <li>📌 Setup test data: Create sample SKUs with different MRP & shelf life values</li>
            <li>📌 Verify expiry alerts: Test with various production dates</li>
            <li>📌 Test FEFO allocation: Ensure oldest expiry products are allocated first</li>
            <li>📌 Print production reports: Verify regulatory compliance format</li>
            <li>📌 Integrate TimeTracker component into BatchProduction Step 3</li>
            <li>📌 Add extended costs display to BatchProduction Step 4</li>
            <li>📌 Phase 2: Implement blocking validation for Cost Management</li>
            <li>📌 Future: Add predictive analytics for expiry management</li>
          </ul>
          
          <h3 style={{ marginTop: '30px' }}>Production Deployment Checklist</h3>
          <ul>
            <li>☑️ Verify all API endpoints are accessible</li>
            <li>☑️ Test MRP change workflow with approvals</li>
            <li>☑️ Validate expiry calculations across time zones</li>
            <li>☑️ Test auto-refresh performance with large datasets</li>
            <li>☑️ Verify print format on different browsers</li>
            <li>☑️ Train users on MRP management & expiry monitoring</li>
            <li>☑️ Set up alerts for critical expiry items</li>
            <li>☑️ Document FEFO allocation procedures</li>
          </ul>
        </div>
      )}

      {activeModule === 'purchase' && <Purchase />}
      {activeModule === 'writeoff' && <MaterialWriteoff />}
      {activeModule === 'batch' && <BatchProduction />}
      {activeModule === 'blending' && <Blending />}
      {activeModule === 'sku' && <SKUManagement />}
      {activeModule === 'sales' && <MaterialSales />}
      {activeModule === 'costManagement' && <CostManagement />}
    </div>
  );
}

export default App;
