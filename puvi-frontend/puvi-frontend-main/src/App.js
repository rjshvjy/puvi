// Main App Component for PUVI Oil Manufacturing System
// File Path: puvi-frontend/puvi-frontend-main/src/App.js
// COMPLETE REPLACEMENT FILE - Includes Masters and Opening Balance Integration

import React, { useState } from 'react';
import './App.css';
import Purchase from './modules/Purchase';
import MaterialWriteoff from './modules/MaterialWriteoff';
import BatchProduction from './modules/BatchProduction';
import Blending from './modules/Blending';
import MaterialSales from './modules/MaterialSales';
import CostManagement from './modules/CostManagement';
import SKUManagement from './modules/SKUManagement';
import MastersManagement from './modules/MastersManagement';
import OpeningBalanceModule from './modules/OpeningBalanceModule';

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
          onClick={() => setActiveModule('openingBalance')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeModule === 'openingBalance' ? '#1abc9c' : '#ecf0f1',
            color: activeModule === 'openingBalance' ? 'white' : '#2c3e50',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: activeModule === 'openingBalance' ? 'bold' : 'normal',
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
        >
          Opening Balance
          <span style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            background: '#ff0000',
            color: 'white',
            borderRadius: '50%',
            fontSize: '9px',
            padding: '2px 5px',
            fontWeight: 'bold'
          }}>!</span>
        </button>

        <button 
          onClick={() => setActiveModule('masters')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeModule === 'masters' ? '#8e44ad' : '#ecf0f1',
            color: activeModule === 'masters' ? 'white' : '#2c3e50',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: activeModule === 'masters' ? 'bold' : 'normal',
            transition: 'all 0.2s ease'
          }}
        >
          Masters
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
            <li>✅ <strong style={{color: '#1abc9c'}}>Opening Balance Module - COMPLETE</strong></li>
            <li>✅ <strong style={{color: '#8e44ad'}}>Masters Management - COMPLETE</strong></li>
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
          
          <h3 style={{ marginTop: '30px', color: '#1abc9c' }}>🚀 Opening Balance Module - NEW!</h3>
          <ul>
            <li>✅ <strong>System Initialization:</strong> One-time setup wizard with permanent lock</li>
            <li>✅ <strong>Opening Balance Entry:</strong> Material-wise balance entry with CSV import/export</li>
            <li>✅ <strong>Status Dashboard:</strong> Real-time system status and statistics</li>
            <li>✅ <strong>Financial Year:</strong> April to March with year-end closing process</li>
            <li>⚠️ <strong>CRITICAL:</strong> System initialization is PERMANENT and cannot be undone!</li>
            <li>📌 <strong>Setup Order:</strong> 1) Enter Masters Data → 2) Set Opening Balances → 3) Initialize System</li>
          </ul>

          <h3 style={{ marginTop: '30px', color: '#8e44ad' }}>📋 Masters Management - NEW!</h3>
          <ul>
            <li>✅ <strong>5 Master Types:</strong> Suppliers, Materials, Tags, Writeoff Reasons, Cost Elements</li>
            <li>✅ <strong>Dynamic Forms:</strong> Auto-generated from backend schema</li>
            <li>✅ <strong>Dependency Management:</strong> Soft delete with dependency checking</li>
            <li>✅ <strong>CSV Import/Export:</strong> Bulk data management</li>
            <li>✅ <strong>Field Validation:</strong> Pattern matching, unique constraints, required fields</li>
            <li>📌 <strong>Note:</strong> Setup master data before entering transactions</li>
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
            <li>✅ <strong>Expiry Alerts:</strong> Real-time notifications for near-expiry products</li>
            <li>✅ <strong>FEFO Integration:</strong> First-Expired-First-Out allocation for sales</li>
            <li>✅ <strong>Printable Reports:</strong> Production summaries for regulatory compliance</li>
            <li>✅ <strong>Dashboard:</strong> Visual analytics with expiry status tracking</li>
          </ul>
          
          <h3 style={{ marginTop: '30px' }}>Next Steps</h3>
          <ul>
            <li>📌 <strong style={{color: '#ff0000'}}>URGENT:</strong> Initialize system with opening balances before operations</li>
            <li>📌 Set up all master data (suppliers, materials, etc.) first</li>
            <li>📌 Enter opening balances for all materials</li>
            <li>📌 Review and initialize system (ONE-TIME ONLY)</li>
            <li>📌 Test all modules with sample transactions</li>
            <li>📌 Setup test data: Create sample SKUs with different MRP & shelf life values</li>
            <li>📌 Verify expiry alerts: Test with various production dates</li>
            <li>📌 Test FEFO allocation: Ensure oldest expiry products are allocated first</li>
            <li>📌 Print production reports: Verify regulatory compliance format</li>
            <li>📌 Integrate TimeTracker component into BatchProduction Step 3</li>
            <li>📌 Add extended costs display to BatchProduction Step 4</li>
            <li>📌 Phase 2: Implement blocking validation for Cost Management</li>
            <li>📌 Future: Add predictive analytics for expiry management</li>
          </ul>
          
          <h3 style={{ marginTop: '30px', color: '#ff0000' }}>⚠️ Critical Setup Sequence</h3>
          <ol>
            <li><strong>Masters Setup:</strong> Configure all suppliers, materials, tags, cost elements</li>
            <li><strong>Opening Balance:</strong> Enter opening stock quantities and values</li>
            <li><strong>System Initialization:</strong> One-time lock (PERMANENT - cannot undo!)</li>
            <li><strong>Begin Operations:</strong> Start with purchases, production, sales</li>
          </ol>
          
          <h3 style={{ marginTop: '30px' }}>Production Deployment Checklist</h3>
          <ul>
            <li>☑️ Verify all API endpoints are accessible</li>
            <li>☑️ Complete master data setup</li>
            <li>☑️ Enter and verify opening balances</li>
            <li>☑️ Backup database before initialization</li>
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

      {activeModule === 'openingBalance' && <OpeningBalanceModule />}
      {activeModule === 'masters' && <MastersManagement />}
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
