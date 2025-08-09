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
import SKUManagement from './modules/SKUManagement';  // NEW - Import SKU Management

function App() {
  const [activeModule, setActiveModule] = useState('info');

  return (
    <div className="app">
      <header>
        <h1>PUVI Oil Manufacturing System</h1>
        <p>Cost Management & Inventory Tracking</p>
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
            transition: 'all 0.2s ease'
          }}
        >
          SKU Management
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
            <li>✅ SKU Management - Frontend Complete (BOM, Production, History)</li>
            <li>🔄 Traceability System - Partially Implemented</li>
            <li>📋 Reports & Analytics - To be implemented</li>
          </ul>
          
          <h3 style={{ marginTop: '30px' }}>SKU Management Module Status</h3>
          <ul>
            <li>✅ <strong>Backend:</strong> sku_management.py & sku_production.py complete</li>
            <li>✅ <strong>Database:</strong> All SKU tables created in Supabase</li>
            <li>✅ <strong>BOM Configuration:</strong> Material selection, versioning, shared materials</li>
            <li>✅ <strong>Production Entry:</strong> 3-step workflow with oil allocation</li>
            <li>✅ <strong>Production History:</strong> Advanced filtering, CSV export</li>
            <li>✅ <strong>Traceability:</strong> Material variety codes (K, U, R) propagated</li>
            <li>✅ <strong>Cost Tracking:</strong> Oil + Materials + Labor (no cartons)</li>
            <li>⏳ <strong>Testing:</strong> Pending data setup</li>
            <li>📋 <strong>Future:</strong> Carton costs at sales stage</li>
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
          
          <h3 style={{ marginTop: '30px' }}>Recent Updates - SKU Management</h3>
          <ul>
            <li>🔔 <strong>NEW:</strong> SKU Management Module frontend completed</li>
            <li>🔔 BOM Configuration with material versioning</li>
            <li>🔔 Production Entry with 3-step workflow</li>
            <li>🔔 Oil allocation from batches/blends</li>
            <li>🔔 Traceable code generation (KU801 format)</li>
            <li>🔔 Production History with filters and CSV export</li>
            <li>🔔 Cost calculation: Oil + Materials + Labor</li>
            <li>🔔 Shared materials support (Fliptop cap for 1L & 500ml)</li>
          </ul>
          
          <h3 style={{ marginTop: '30px' }}>Next Steps</h3>
          <ul>
            <li>📌 Setup test data for SKU Management (materials, SKUs, BOMs)</li>
            <li>📌 Test production workflow end-to-end</li>
            <li>📌 Integrate TimeTracker component into BatchProduction Step 3</li>
            <li>📌 Add extended costs display to BatchProduction Step 4</li>
            <li>📌 Create supporting components (CostCapture, CostSummary)</li>
            <li>📌 Test complete cost flow from batch creation to SKU production</li>
            <li>📌 Phase 2: Implement blocking validation (future)</li>
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
