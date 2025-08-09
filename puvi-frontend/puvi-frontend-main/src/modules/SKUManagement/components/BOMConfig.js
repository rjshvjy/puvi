// File Path: puvi-frontend/src/modules/SKUManagement/components/BOMConfig.js
// BOM Configuration Component for SKU Management
// Handles Bill of Materials setup with versioning and shared materials

import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

const BOMConfig = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // SKU and BOM data
  const [skus, setSkus] = useState([]);
  const [selectedSKU, setSelectedSKU] = useState(null);
  const [currentBOM, setCurrentBOM] = useState(null);
  const [bomHistory, setBOMHistory] = useState([]);
  
  // Materials data
  const [packingMaterials, setPackingMaterials] = useState({
    bottles: [],
    caps: [],
    labels: [],
    innerSeals: []
  });
  
  // BOM Form data
  const [bomDetails, setBomDetails] = useState([]);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  
  // Shared materials (from handover doc)
  const SHARED_MATERIALS = {
    'Fliptop Cap': ['1L', '500ml'],
    'Inner cap for 1L & 500ml': ['1L', '500ml']
  };
  
  // Load SKUs on mount
  useEffect(() => {
    fetchSKUs();
    fetchPackingMaterials();
  }, []);
  
  // Fetch all SKUs
  const fetchSKUs = async () => {
    try {
      const response = await api.get('/api/sku/master?is_active=true');
      if (response.data.success) {
        setSkus(response.data.skus);
      }
    } catch (error) {
      console.error('Error fetching SKUs:', error);
      setMessage('❌ Error loading SKUs');
    }
  };
  
  // Fetch packing materials
  const fetchPackingMaterials = async () => {
    try {
      const response = await api.get('/api/materials?category=Packing');
      if (response.data.success) {
        const materials = response.data.materials;
        
        // Categorize materials based on name patterns
        setPackingMaterials({
          bottles: materials.filter(m => 
            m.material_name.toLowerCase().includes('bottle') ||
            m.material_name.toLowerCase().includes('pet') ||
            m.material_name.toLowerCase().includes('hdpe')
          ),
          caps: materials.filter(m => 
            m.material_name.toLowerCase().includes('cap') ||
            m.material_name.toLowerCase().includes('fliptop')
          ),
          labels: materials.filter(m => 
            m.material_name.toLowerCase().includes('label') ||
            m.material_name.toLowerCase().includes('sticker')
          ),
          innerSeals: materials.filter(m => 
            m.material_name.toLowerCase().includes('inner') ||
            m.material_name.toLowerCase().includes('seal')
          )
        });
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };
  
  // Handle SKU selection
  const handleSKUSelect = async (skuId) => {
    if (!skuId) {
      setSelectedSKU(null);
      setCurrentBOM(null);
      setBomDetails([]);
      return;
    }
    
    const sku = skus.find(s => s.sku_id === parseInt(skuId));
    setSelectedSKU(sku);
    
    // Fetch existing BOM if any
    await fetchBOMForSKU(skuId);
  };
  
  // Fetch BOM for selected SKU
  const fetchBOMForSKU = async (skuId) => {
    setLoading(true);
    try {
      const response = await api.get(`/api/sku/bom/${skuId}`);
      
      if (response.data.success && response.data.bom) {
        setCurrentBOM(response.data.bom);
        setBOMHistory(response.data.history || []);
        
        // Set BOM details for editing
        const details = response.data.bom.details || [];
        setBomDetails(details.map(d => ({
          material_id: d.material_id,
          material_name: d.material_name,
          material_category: d.material_category,
          quantity_per_unit: d.quantity_per_unit || 1,
          is_shared: d.is_shared || false,
          applicable_sizes: d.applicable_sizes || [],
          notes: d.notes || ''
        })));
      } else {
        // No BOM exists, initialize empty
        setCurrentBOM(null);
        setBOMHistory([]);
        initializeEmptyBOM(sku);
      }
    } catch (error) {
      console.error('Error fetching BOM:', error);
      // Initialize empty BOM on error
      initializeEmptyBOM(selectedSKU);
    } finally {
      setLoading(false);
    }
  };
  
  // Initialize empty BOM structure
  const initializeEmptyBOM = (sku) => {
    if (!sku) return;
    
    setBomDetails([
      {
        material_category: 'Bottle',
        material_id: '',
        material_name: '',
        quantity_per_unit: 1,
        is_shared: false,
        applicable_sizes: [],
        notes: ''
      },
      {
        material_category: 'Cap',
        material_id: '',
        material_name: '',
        quantity_per_unit: 1,
        is_shared: false,
        applicable_sizes: [],
        notes: ''
      },
      {
        material_category: 'Label',
        material_id: '',
        material_name: '',
        quantity_per_unit: 1,
        is_shared: false,
        applicable_sizes: [],
        notes: ''
      },
      {
        material_category: 'Inner Seal',
        material_id: '',
        material_name: '',
        quantity_per_unit: 1,
        is_shared: false,
        applicable_sizes: [],
        notes: ''
      }
    ]);
  };
  
  // Add new material row
  const addMaterialRow = () => {
    setBomDetails([...bomDetails, {
      material_category: 'Other',
      material_id: '',
      material_name: '',
      quantity_per_unit: 1,
      is_shared: false,
      applicable_sizes: [],
      notes: ''
    }]);
  };
  
  // Remove material row
  const removeMaterialRow = (index) => {
    setBomDetails(bomDetails.filter((_, i) => i !== index));
  };
  
  // Handle material selection
  const handleMaterialSelect = (index, materialId) => {
    const material = [...packingMaterials.bottles, 
                     ...packingMaterials.caps, 
                     ...packingMaterials.labels, 
                     ...packingMaterials.innerSeals]
                     .find(m => m.material_id === parseInt(materialId));
    
    if (material) {
      const updated = [...bomDetails];
      updated[index] = {
        ...updated[index],
        material_id: material.material_id,
        material_name: material.material_name,
        // Check if it's a shared material
        is_shared: Object.keys(SHARED_MATERIALS).some(key => 
          material.material_name.includes(key)
        ),
        applicable_sizes: SHARED_MATERIALS[material.material_name] || []
      };
      setBomDetails(updated);
    }
  };
  
  // Handle field changes
  const handleDetailChange = (index, field, value) => {
    const updated = [...bomDetails];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setBomDetails(updated);
  };
  
  // Validate BOM before saving
  const validateBOM = () => {
    if (!selectedSKU) {
      setMessage('❌ Please select an SKU');
      return false;
    }
    
    if (bomDetails.length === 0) {
      setMessage('❌ Please add at least one material');
      return false;
    }
    
    // Check for required materials
    const hasBottle = bomDetails.some(d => d.material_category === 'Bottle' && d.material_id);
    const hasCap = bomDetails.some(d => d.material_category === 'Cap' && d.material_id);
    const hasLabel = bomDetails.some(d => d.material_category === 'Label' && d.material_id);
    
    if (!hasBottle || !hasCap || !hasLabel) {
      setMessage('⚠️ Warning: BOM should have at least Bottle, Cap, and Label');
      // Allow saving but show warning
    }
    
    // Check for duplicate materials
    const materialIds = bomDetails.filter(d => d.material_id).map(d => d.material_id);
    const uniqueIds = new Set(materialIds);
    if (materialIds.length !== uniqueIds.size) {
      setMessage('❌ Duplicate materials found in BOM');
      return false;
    }
    
    return true;
  };
  
  // Save BOM configuration
  const saveBOM = async () => {
    if (!validateBOM()) return;
    
    setLoading(true);
    setMessage('');
    
    try {
      const bomData = {
        sku_id: selectedSKU.sku_id,
        effective_from: effectiveDate,
        notes: notes,
        details: bomDetails.filter(d => d.material_id).map(d => ({
          material_id: parseInt(d.material_id),
          material_category: d.material_category,
          quantity_per_unit: parseFloat(d.quantity_per_unit) || 1,
          is_shared: d.is_shared,
          applicable_sizes: d.applicable_sizes,
          notes: d.notes
        })),
        created_by: 'Configuration User'
      };
      
      let response;
      if (currentBOM) {
        // Update existing BOM (creates new version)
        response = await api.put(`/api/sku/bom/${currentBOM.bom_id}`, bomData);
      } else {
        // Create new BOM
        response = await api.post('/api/sku/bom', bomData);
      }
      
      if (response.data.success) {
        setMessage(`✅ BOM ${currentBOM ? 'updated' : 'created'} successfully! Version: ${response.data.version_number}`);
        // Refresh BOM data
        await fetchBOMForSKU(selectedSKU.sku_id);
      } else {
        setMessage(`❌ Error: ${response.data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error saving BOM: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate total material cost
  const calculateTotalCost = () => {
    return bomDetails.reduce((total, detail) => {
      if (detail.material_id) {
        const material = [...packingMaterials.bottles, 
                         ...packingMaterials.caps, 
                         ...packingMaterials.labels, 
                         ...packingMaterials.innerSeals]
                         .find(m => m.material_id === parseInt(detail.material_id));
        if (material) {
          return total + (material.current_cost * (detail.quantity_per_unit || 1));
        }
      }
      return total;
    }, 0);
  };
  
  // Get materials for category
  const getMaterialsForCategory = (category) => {
    switch(category.toLowerCase()) {
      case 'bottle':
        return packingMaterials.bottles;
      case 'cap':
        return packingMaterials.caps;
      case 'label':
        return packingMaterials.labels;
      case 'inner seal':
        return packingMaterials.innerSeals;
      default:
        return [...packingMaterials.bottles, 
                ...packingMaterials.caps, 
                ...packingMaterials.labels, 
                ...packingMaterials.innerSeals];
    }
  };
  
  return (
    <div className="bom-config-container">
      <h2>BOM Configuration</h2>
      
      {/* SKU Selection */}
      <div className="form-section">
        <div className="form-row">
          <div className="form-group">
            <label>Select SKU *</label>
            <select
              value={selectedSKU?.sku_id || ''}
              onChange={(e) => handleSKUSelect(e.target.value)}
              disabled={loading}
            >
              <option value="">-- Select SKU --</option>
              {skus.map(sku => (
                <option key={sku.sku_id} value={sku.sku_id}>
                  {sku.product_name} ({sku.package_size})
                  {sku.current_bom_version > 0 && ` - BOM v${sku.current_bom_version}`}
                </option>
              ))}
            </select>
          </div>
          
          {selectedSKU && (
            <div className="sku-info">
              <span>Oil Type: <strong>{selectedSKU.oil_type}</strong></span>
              <span>Package Size: <strong>{selectedSKU.package_size}</strong></span>
              <span>Current BOM: <strong>{currentBOM ? `v${currentBOM.version_number}` : 'None'}</strong></span>
            </div>
          )}
        </div>
      </div>
      
      {/* BOM Configuration */}
      {selectedSKU && (
        <>
          <div className="form-section">
            <h3>Bill of Materials Configuration</h3>
            
            {/* Effective Date */}
            <div className="form-row">
              <div className="form-group">
                <label>Effective From Date *</label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  disabled={loading}
                />
              </div>
              
              <div className="form-group">
                <label>Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Version notes or changes"
                  disabled={loading}
                />
              </div>
            </div>
            
            {/* Materials Table */}
            <div className="bom-materials-table">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Material</th>
                    <th>Qty/Unit</th>
                    <th>Unit Cost</th>
                    <th>Total Cost</th>
                    <th>Shared?</th>
                    <th>Notes</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bomDetails.map((detail, index) => {
                    const materials = getMaterialsForCategory(detail.material_category);
                    const selectedMaterial = materials.find(m => 
                      m.material_id === parseInt(detail.material_id)
                    );
                    const unitCost = selectedMaterial?.current_cost || 0;
                    const totalCost = unitCost * (detail.quantity_per_unit || 1);
                    
                    return (
                      <tr key={index}>
                        <td>
                          <select
                            value={detail.material_category}
                            onChange={(e) => handleDetailChange(index, 'material_category', e.target.value)}
                            disabled={loading}
                          >
                            <option value="Bottle">Bottle</option>
                            <option value="Cap">Cap</option>
                            <option value="Label">Label</option>
                            <option value="Inner Seal">Inner Seal</option>
                            <option value="Other">Other</option>
                          </select>
                        </td>
                        <td>
                          <select
                            value={detail.material_id}
                            onChange={(e) => handleMaterialSelect(index, e.target.value)}
                            disabled={loading}
                            required
                          >
                            <option value="">-- Select Material --</option>
                            {materials.map(mat => (
                              <option key={mat.material_id} value={mat.material_id}>
                                {mat.material_name} ({mat.short_code})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            value={detail.quantity_per_unit}
                            onChange={(e) => handleDetailChange(index, 'quantity_per_unit', e.target.value)}
                            min="0.0001"
                            step="0.0001"
                            style={{ width: '80px' }}
                            disabled={loading}
                          />
                        </td>
                        <td>₹{unitCost.toFixed(2)}</td>
                        <td>₹{totalCost.toFixed(2)}</td>
                        <td>
                          <input
                            type="checkbox"
                            checked={detail.is_shared}
                            onChange={(e) => handleDetailChange(index, 'is_shared', e.target.checked)}
                            disabled={loading}
                          />
                          {detail.is_shared && detail.applicable_sizes.length > 0 && (
                            <span className="shared-sizes">
                              ({detail.applicable_sizes.join(', ')})
                            </span>
                          )}
                        </td>
                        <td>
                          <input
                            type="text"
                            value={detail.notes}
                            onChange={(e) => handleDetailChange(index, 'notes', e.target.value)}
                            placeholder="Notes"
                            style={{ width: '150px' }}
                            disabled={loading}
                          />
                        </td>
                        <td>
                          <button
                            onClick={() => removeMaterialRow(index)}
                            className="button-danger-small"
                            disabled={loading || bomDetails.length <= 1}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'right' }}>
                      <strong>Total Material Cost per Unit:</strong>
                    </td>
                    <td>
                      <strong>₹{calculateTotalCost().toFixed(2)}</strong>
                    </td>
                    <td colSpan="3">
                      <button
                        onClick={addMaterialRow}
                        className="button-secondary"
                        disabled={loading}
                      >
                        + Add Material
                      </button>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          {/* BOM History */}
          {bomHistory.length > 0 && (
            <div className="form-section">
              <h3>BOM Version History</h3>
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Effective From</th>
                    <th>Effective To</th>
                    <th>Status</th>
                    <th>Created By</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {bomHistory.map((bom, index) => (
                    <tr key={index} className={bom.is_current ? 'current-version' : ''}>
                      <td>v{bom.version_number}</td>
                      <td>{new Date(bom.effective_from).toLocaleDateString()}</td>
                      <td>{bom.effective_to ? new Date(bom.effective_to).toLocaleDateString() : 'Current'}</td>
                      <td>{bom.is_current ? '✓ Current' : 'Historical'}</td>
                      <td>{bom.created_by}</td>
                      <td>{bom.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Messages */}
          {message && (
            <div className={`message ${message.includes('✅') ? 'success' : message.includes('⚠️') ? 'warning' : 'error'}`}>
              {message}
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="form-actions">
            <button
              onClick={() => {
                setSelectedSKU(null);
                setBomDetails([]);
                setCurrentBOM(null);
                setMessage('');
              }}
              className="button-secondary"
              disabled={loading}
            >
              Clear
            </button>
            
            <button
              onClick={saveBOM}
              className="submit-button"
              disabled={loading || bomDetails.length === 0}
            >
              {loading ? 'Saving...' : currentBOM ? 'Update BOM (New Version)' : 'Create BOM'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default BOMConfig;
