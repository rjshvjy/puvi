// BOM Configuration Component for SKU Management
// File Path: puvi-frontend/src/modules/SKUManagement/components/BOMConfig.js

import React, { useState, useEffect } from 'react';

const BOMConfig = () => {
  const [skuList, setSKUList] = useState([]);
  const [selectedSKU, setSelectedSKU] = useState('');
  const [materials, setMaterials] = useState([]);
  const [bomDetails, setBomDetails] = useState([]);
  const [currentBOM, setCurrentBOM] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchSKUs();
    fetchMaterials();
  }, []);

  const fetchSKUs = async () => {
    try {
      const response = await fetch('https://puvi-backend.onrender.com/api/sku/master?is_active=true');
      const data = await response.json();
      setSKUList(data);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch SKUs' });
    }
  };

  const fetchMaterials = async () => {
    try {
      const response = await fetch('https://puvi-backend.onrender.com/api/materials?category=Packing');
      const data = await response.json();
      setMaterials(data);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch materials' });
    }
  };

  const fetchBOM = async (skuId) => {
    try {
      const response = await fetch(`https://puvi-backend.onrender.com/api/sku/bom/${skuId}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentBOM(data);
        setBomDetails(data.details || []);
      } else {
        setCurrentBOM(null);
        setBomDetails([]);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch BOM' });
    }
  };

  const handleSKUChange = (e) => {
    const skuId = e.target.value;
    setSelectedSKU(skuId);
    if (skuId) {
      fetchBOM(skuId);
    } else {
      setCurrentBOM(null);
      setBomDetails([]);
    }
  };

  const handleAddMaterial = () => {
    setBomDetails([...bomDetails, {
      material_id: '',
      material_category: '',
      quantity_per_unit: 1,
      is_shared: false,
      applicable_sizes: [],
      notes: ''
    }]);
  };

  const handleMaterialChange = (index, field, value) => {
    const updated = [...bomDetails];
    updated[index][field] = value;
    
    if (field === 'material_id' && value) {
      const material = materials.find(m => m.material_id === parseInt(value));
      if (material) {
        // Auto-detect category based on material name
        if (material.material_name.toLowerCase().includes('bottle')) {
          updated[index].material_category = 'Bottle';
        } else if (material.material_name.toLowerCase().includes('cap')) {
          updated[index].material_category = 'Cap';
        } else if (material.material_name.toLowerCase().includes('label')) {
          updated[index].material_category = 'Label';
        } else if (material.material_name.toLowerCase().includes('seal')) {
          updated[index].material_category = 'Inner Seal';
        }
        
        // Check if it's a shared material
        if (material.material_name.includes('Fliptop') || 
            material.material_name.includes('Inner cap for 1L & 500ml')) {
          updated[index].is_shared = true;
          updated[index].applicable_sizes = ['1L', '500ml'];
        }
      }
    }
    
    setBomDetails(updated);
  };

  const handleRemoveMaterial = (index) => {
    setBomDetails(bomDetails.filter((_, i) => i !== index));
  };

  const handleSaveBOM = async () => {
    if (!selectedSKU) {
      setMessage({ type: 'error', text: 'Please select an SKU' });
      return;
    }
    
    if (bomDetails.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one material' });
      return;
    }
    
    setLoading(true);
    try {
      const selectedSKUData = skuList.find(s => s.sku_id === parseInt(selectedSKU));
      
      const payload = {
        sku_id: parseInt(selectedSKU),
        details: bomDetails.map(item => ({
          material_id: parseInt(item.material_id),
          material_category: item.material_category,
          quantity_per_unit: parseFloat(item.quantity_per_unit),
          is_shared: item.is_shared,
          applicable_sizes: item.applicable_sizes,
          notes: item.notes
        })),
        notes: `BOM for ${selectedSKUData ? selectedSKUData.sku_code : 'SKU'}`
      };
      
      const url = currentBOM 
        ? `https://puvi-backend.onrender.com/api/sku/bom/${currentBOM.bom_id}`
        : 'https://puvi-backend.onrender.com/api/sku/bom';
      
      const method = currentBOM ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: currentBOM ? 'BOM updated successfully' : 'BOM created successfully' 
        });
        fetchBOM(selectedSKU);
      } else {
        throw new Error('Failed to save BOM');
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalCost = () => {
    return bomDetails.reduce((total, item) => {
      const material = materials.find(m => m.material_id === parseInt(item.material_id));
      if (material) {
        return total + (material.current_cost * item.quantity_per_unit);
      }
      return total;
    }, 0).toFixed(2);
  };

  return (
    <div className="bom-config">
      <h2>BOM Configuration</h2>
      
      {message.text && (
        <div className={`alert ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <div className="form-section">
        <div className="form-group">
          <label>Select SKU:</label>
          <select value={selectedSKU} onChange={handleSKUChange}>
            <option value="">-- Select SKU --</option>
            {skuList.map(sku => (
              <option key={sku.sku_id} value={sku.sku_id}>
                {sku.sku_code} - {sku.product_name}
              </option>
            ))}
          </select>
        </div>
        
        {selectedSKU && (
          <>
            {currentBOM && (
              <div className="bom-info">
                <p><strong>Current Version:</strong> {currentBOM.version_number}</p>
                <p><strong>Effective From:</strong> {new Date(currentBOM.effective_from * 1000).toLocaleDateString()}</p>
              </div>
            )}
            
            <div className="materials-section">
              <h3>Materials</h3>
              <button className="btn-primary" onClick={handleAddMaterial}>
                Add Material
              </button>
              
              <table className="materials-table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Category</th>
                    <th>Qty/Unit</th>
                    <th>Unit Cost</th>
                    <th>Total Cost</th>
                    <th>Shared</th>
                    <th>Notes</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bomDetails.map((item, index) => {
                    const material = materials.find(m => m.material_id === parseInt(item.material_id));
                    return (
                      <tr key={index}>
                        <td>
                          <select 
                            value={item.material_id}
                            onChange={(e) => handleMaterialChange(index, 'material_id', e.target.value)}
                          >
                            <option value="">-- Select --</option>
                            {materials.map(mat => (
                              <option key={mat.material_id} value={mat.material_id}>
                                {mat.material_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select 
                            value={item.material_category}
                            onChange={(e) => handleMaterialChange(index, 'material_category', e.target.value)}
                          >
                            <option value="">-- Select --</option>
                            <option value="Bottle">Bottle</option>
                            <option value="Cap">Cap</option>
                            <option value="Label">Label</option>
                            <option value="Inner Seal">Inner Seal</option>
                          </select>
                        </td>
                        <td>
                          <input 
                            type="number"
                            value={item.quantity_per_unit}
                            onChange={(e) => handleMaterialChange(index, 'quantity_per_unit', e.target.value)}
                            step="0.0001"
                            min="0"
                          />
                        </td>
                        <td>{material ? `₹${material.current_cost}` : '-'}</td>
                        <td>
                          {material ? `₹${(material.current_cost * item.quantity_per_unit).toFixed(2)}` : '-'}
                        </td>
                        <td>
                          <input 
                            type="checkbox"
                            checked={item.is_shared}
                            onChange={(e) => handleMaterialChange(index, 'is_shared', e.target.checked)}
                          />
                        </td>
                        <td>
                          <input 
                            type="text"
                            value={item.notes}
                            onChange={(e) => handleMaterialChange(index, 'notes', e.target.value)}
                            placeholder="Notes"
                          />
                        </td>
                        <td>
                          <button 
                            className="btn-danger"
                            onClick={() => handleRemoveMaterial(index)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {bomDetails.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'right' }}>
                        <strong>Total Material Cost per Unit:</strong>
                      </td>
                      <td><strong>₹{calculateTotalCost()}</strong></td>
                      <td colSpan="3"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            
            {bomDetails.length > 0 && (
              <div className="action-buttons">
                <button 
                  className="btn-success"
                  onClick={handleSaveBOM}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : (currentBOM ? 'Update BOM' : 'Create BOM')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BOMConfig;
