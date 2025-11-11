'use client'; 
import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, FileText, Package, Building, AlertCircle, CheckSquare, Clock, Filter } from 'lucide-react';

const ProjectTracker = () => {
  const [view, setView] = useState('dashboard');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    entryType: '',
    entityType: '',
    project: '',
    taskGroup: ''
  });
  const [entities, setEntities] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const SUPABASE_URL = 'https://rsczizrlqzmjkspwpoax.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzY3ppenJscXptamtzcHdwb2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTIzMDEsImV4cCI6MjA3ODM2ODMwMX0.Ek0zo5xUUMHrzJuULBZsCmehJai-SE_v6bsmnsEHKF8';

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      const resEntities = await fetch(`${SUPABASE_URL}/rest/v1/entities`, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      });
      const entitiesData = await resEntities.json();

      const resTransactions = await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      });
      const transactionsData = await resTransactions.json();
  
      setEntities(entitiesData || []);
      setTransactions(transactionsData || []);
    } catch (error) {
      console.log('Error loading data:', error);
      setEntities([]);
      setTransactions([]);
    }
    setLoading(false);
  };

  const saveData = async (newEntities, newTransactions) => {
    try {
      for (const entity of newEntities) {
        await fetch(`${SUPABASE_URL}/rest/v1/entities`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(entity)
        });
      }

      for (const transaction of newTransactions) {
        await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(transaction)
        });
      }
    } catch (error) {
      console.log('Error saving data:', error);
    }
  };

  const generateEntityId = (type) => {
    const prefix = {
      'Material': 'MAT',
      'Submittal': 'SUB',
      'Vendor': 'VEN',
      'RFI': 'RFI',
      'Task': 'TSK'
    }[type];

    const existingIds = entities
      .filter(e => e.entityType === type)
      .map(e => parseInt(e.id.split('-')[1]))
      .filter(n => !isNaN(n));
    
    const nextNum = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    return `${prefix}-${String(nextNum).padStart(4, '0')}`;
  };

  const generateTransactionId = () => {
    const existingIds = transactions
      .map(t => parseInt(t.id.split('-')[1]))
      .filter(n => !isNaN(n));
    
    const nextNum = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    return `TRN-${String(nextNum).padStart(4, '0')}`;
  };

  const updateEntityTimestamp = async (entityId) => {
    const updatedEntities = entities.map(e => 
      e.id === entityId ? { ...e, lastUpdated: new Date().toISOString() } : e
    );
    setEntities(updatedEntities);
    await saveData(updatedEntities, transactions);
  };

  const handleSubmitEntity = async (entityData) => {
    const newEntity = {
      id: generateEntityId(formData.entityType),
      dateCreated: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      entityType: formData.entityType,
      ...entityData
    };

    const updatedEntities = [...entities, newEntity];
    setEntities(updatedEntities);
    await saveData(updatedEntities, transactions);
    
    resetForm();
    setView('dashboard');
  };

  const handleSubmitTransaction = async (transactionData) => {
    const newTransaction = {
      id: generateTransactionId(),
      dateCreated: new Date().toISOString(),
      date: formData.date,
      ...transactionData
    };

    const updatedTransactions = [...transactions, newTransaction];
    setTransactions(updatedTransactions);
    await saveData(entities, updatedTransactions);
    
    // Update linked entity timestamp
    await updateEntityTimestamp(transactionData.linkedEntityId);
    
    resetForm();
    setView('dashboard');
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      entryType: '',
      entityType: '',
      project: '',
      taskGroup: ''
    });
  };

  const getRecentItems = () => {
    const allItems = [
      ...entities.map(e => ({ ...e, type: 'entity' })),
      ...transactions.map(t => ({ ...t, type: 'transaction' }))
    ].sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
    
    return allItems.slice(0, 10);
  };

  const getFilteredEntities = () => {
    let filtered = entities;
    
    if (filterType !== 'all') {
      filtered = filtered.filter(e => e.entityType === filterType);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(e => {
        const searchStr = JSON.stringify(e).toLowerCase();
        return searchStr.includes(searchTerm.toLowerCase());
      });
    }
    
    return filtered.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
  };

  const getEntityIcon = (type) => {
    const icons = {
      'Material': Package,
      'Submittal': FileText,
      'Vendor': Building,
      'RFI': AlertCircle,
      'Task': CheckSquare
    };
    const Icon = icons[type] || FileText;
    return <Icon className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold">Project Tracker</h1>
          <p className="text-blue-100 text-sm">Construction Management System</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex">
          <button
            onClick={() => setView('dashboard')}
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              view === 'dashboard' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setView('new')}
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              view === 'new' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Plus className="w-4 h-4 inline mr-1" />
            New Entry
          </button>
          <button
            onClick={() => setView('lookup')}
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              view === 'lookup' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Search className="w-4 h-4 inline mr-1" />
            Lookup
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-4">
        {view === 'dashboard' && (
          <DashboardView 
            recentItems={getRecentItems()} 
            entities={entities}
            transactions={transactions}
            getEntityIcon={getEntityIcon}
          />
        )}
        
        {view === 'new' && (
          <FormView
            formData={formData}
            setFormData={setFormData}
            entities={entities}
            onSubmitEntity={handleSubmitEntity}
            onSubmitTransaction={handleSubmitTransaction}
            onCancel={resetForm}
          />
        )}
        
        {view === 'lookup' && (
          <LookupView
            entities={getFilteredEntities()}
            transactions={transactions}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterType={filterType}
            setFilterType={setFilterType}
            getEntityIcon={getEntityIcon}
          />
        )}
      </div>
    </div>
  );
};

const DashboardView = ({ recentItems, entities, transactions, getEntityIcon }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Materials" count={entities.filter(e => e.entityType === 'Material').length} color="blue" />
        <StatCard title="Submittals" count={entities.filter(e => e.entityType === 'Submittal').length} color="green" />
        <StatCard title="RFIs" count={entities.filter(e => e.entityType === 'RFI').length} color="yellow" />
        <StatCard title="Tasks" count={entities.filter(e => e.entityType === 'Task').length} color="purple" />
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Activity
          </h2>
        </div>
        <div className="divide-y">
          {recentItems.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No entries yet. Click "New Entry" to get started.
            </div>
          ) : (
            recentItems.map((item, idx) => (
              <div key={idx} className="p-4 hover:bg-gray-50">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {item.type === 'entity' 
                      ? getEntityIcon(item.entityType)
                      : <FileText className="w-4 h-4 text-gray-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-medium text-blue-600">
                        {item.id}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(item.dateCreated).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-900">
                      {item.type === 'entity' 
                        ? (item.description || item.title || item.name || item.taskTitle)
                        : `Update: ${item.statusUpdate}`
                      }
                    </div>
                    {item.type === 'transaction' && (
                      <div className="text-xs text-gray-500 mt-1">
                        Linked to: {item.linkedEntityId}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, count, color }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-sm text-gray-600 mb-1">{title}</div>
      <div className={`text-2xl font-bold ${colors[color]}`}>{count}</div>
    </div>
  );
};

const FormView = ({ formData, setFormData, entities, onSubmitEntity, onSubmitTransaction, onCancel }) => {
  const [entityFormData, setEntityFormData] = useState({});
  const [transactionFormData, setTransactionFormData] = useState({});

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleEntityChange = (field, value) => {
    setEntityFormData({ ...entityFormData, [field]: value });
  };

  const handleTransactionChange = (field, value) => {
    setTransactionFormData({ ...transactionFormData, [field]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Add project to entity data for Material, RFI, and Task
    if (formData.entryType === 'Entity') {
      const dataToSubmit = { ...entityFormData };
      if (['Material', 'RFI', 'Task'].includes(formData.entityType)) {
        dataToSubmit.project = formData.project;
      }
      onSubmitEntity(dataToSubmit);
    } else {
      onSubmitTransaction(transactionFormData);
    }
  };

  const getTaskGroups = () => {
    if (formData.project === 'A - Hopyard') {
      return ['General', 'UV', 'SBR', 'Digester', 'Screening Structure', 'Chemical Feed', 'Influent Pump Station'];
    } else if (formData.project === 'C - Pump Stations') {
      return ['General', 'Sheetz', 'Purkins Corner', 'Food Lion', 'High School', 'Presidential Village'];
    }
    return [];
  };

  const getVendors = () => {
    return entities
      .filter(e => e.entityType === 'Vendor')
      .map(e => e.name);
  };

  const getMaterials = () => {
    return entities
      .filter(e => e.entityType === 'Material')
      .map(e => ({ id: e.id, description: e.description }));
  };

  const getEntitiesByType = (type) => {
    return entities.filter(e => e.entityType === type);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-6">New Entry</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => handleChange('date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Entry Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Entry Type
          </label>
          <select
            value={formData.entryType}
            onChange={(e) => handleChange('entryType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select...</option>
            <option value="Entity">Entity</option>
            <option value="Transaction">Transaction</option>
          </select>
        </div>

        {/* Entity Type (for both Entity and Transaction) */}
        {formData.entryType && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {formData.entryType === 'Entity' ? 'Entity Type' : 'Entity Type to Update'}
            </label>
            <select
              value={formData.entityType}
              onChange={(e) => handleChange('entityType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select...</option>
              <option value="Material">Material</option>
              <option value="Submittal">Submittal</option>
              <option value="Vendor">Vendor</option>
              <option value="RFI">RFI</option>
              <option value="Task">Task</option>
            </select>
          </div>
        )}

        {/* Entity Forms */}
        {formData.entryType === 'Entity' && formData.entityType === 'Material' && (
          <MaterialForm
            data={entityFormData}
            onChange={handleEntityChange}
            formData={formData}
            setFormData={setFormData}
            getTaskGroups={getTaskGroups}
            getVendors={getVendors}
          />
        )}

        {formData.entryType === 'Entity' && formData.entityType === 'Submittal' && (
          <SubmittalForm
            data={entityFormData}
            onChange={handleEntityChange}
            getMaterials={getMaterials}
          />
        )}

        {formData.entryType === 'Entity' && formData.entityType === 'Vendor' && (
          <VendorForm data={entityFormData} onChange={handleEntityChange} />
        )}

        {formData.entryType === 'Entity' && formData.entityType === 'RFI' && (
          <RFIForm
            data={entityFormData}
            onChange={handleEntityChange}
            formData={formData}
            setFormData={setFormData}
          />
        )}

        {formData.entryType === 'Entity' && formData.entityType === 'Task' && (
          <TaskForm
            data={entityFormData}
            onChange={handleEntityChange}
            formData={formData}
            setFormData={setFormData}
          />
        )}

        {/* Transaction Form */}
        {formData.entryType === 'Transaction' && formData.entityType && (
          <TransactionForm
            data={transactionFormData}
            onChange={handleTransactionChange}
            entityType={formData.entityType}
            getEntitiesByType={getEntitiesByType}
          />
        )}

        {/* Buttons */}
        {formData.entryType && formData.entityType && (
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-medium"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 font-medium"
            >
              Cancel
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

const MaterialForm = ({ data, onChange, formData, setFormData, getTaskGroups, getVendors }) => {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
        <select
          value={formData.project}
          onChange={(e) => setFormData({ ...formData, project: e.target.value, taskGroup: '' })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">Select...</option>
          <option value="A - Hopyard">A - Hopyard</option>
          <option value="B - Purkins Corner">B - Purkins Corner</option>
          <option value="C - Pump Stations">C - Pump Stations</option>
        </select>
      </div>

      {(formData.project === 'A - Hopyard' || formData.project === 'C - Pump Stations') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Task Group</label>
          <select
            value={data.taskGroup || ''}
            onChange={(e) => onChange('taskGroup', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select...</option>
            {getTaskGroups().map(tg => (
              <option key={tg} value={tg}>{tg}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <input
          type="text"
          value={data.description || ''}
          onChange={(e) => onChange('description', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
        <input
          type="text"
          value={data.quantity || ''}
          onChange={(e) => onChange('quantity', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
        <select
          value={data.vendor || ''}
          onChange={(e) => onChange('vendor', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">Select...</option>
          {getVendors().map(v => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>
    </>
  );
};

const SubmittalForm = ({ data, onChange, getMaterials }) => {
  const [selectedMaterials, setSelectedMaterials] = useState(data.relatedMaterials || []);

  const toggleMaterial = (materialId) => {
    const newSelection = selectedMaterials.includes(materialId)
      ? selectedMaterials.filter(id => id !== materialId)
      : [...selectedMaterials, materialId];
    
    setSelectedMaterials(newSelection);
    onChange('relatedMaterials', newSelection);
  };

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Submittal Number</label>
        <input
          type="text"
          value={data.submittalNumber || ''}
          onChange={(e) => onChange('submittalNumber', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Submittal Title</label>
        <input
          type="text"
          value={data.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Paragraph Number</label>
        <input
          type="text"
          value={data.paragraphNumber || ''}
          onChange={(e) => onChange('paragraphNumber', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Related Materials</label>
        <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
          {getMaterials().length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-4">
              No materials available. Create materials first.
            </div>
          ) : (
            getMaterials().map(m => (
              <label key={m.id} className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                <input
                  type="checkbox"
                  checked={selectedMaterials.includes(m.id)}
                  onChange={() => toggleMaterial(m.id)}
                  className="mt-1"
                />
                <span className="text-sm text-gray-700">{m.description}</span>
              </label>
            ))
          )}
        </div>
        {selectedMaterials.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            {selectedMaterials.length} material{selectedMaterials.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>
    </>
  );
};

const VendorForm = ({ data, onChange }) => {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
        <input
          type="text"
          value={data.name || ''}
          onChange={(e) => onChange('name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
        <input
          type="text"
          value={data.contactName || ''}
          onChange={(e) => onChange('contactName', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
        <input
          type="tel"
          value={data.phoneNumber || ''}
          onChange={(e) => onChange('phoneNumber', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={data.email || ''}
          onChange={(e) => onChange('email', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">PO #</label>
        <input
          type="text"
          value={data.poNumber || ''}
          onChange={(e) => onChange('poNumber', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </>
  );
};

const RFIForm = ({ data, onChange, formData, setFormData }) => {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
        <select
          value={formData.project}
          onChange={(e) => setFormData({ ...formData, project: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">Select...</option>
          <option value="A - Hopyard">A - Hopyard</option>
          <option value="B - Purkins Corner">B - Purkins Corner</option>
          <option value="C - Pump Stations">C - Pump Stations</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">RFI Number</label>
        <input
          type="text"
          value={data.rfiNumber || ''}
          onChange={(e) => onChange('rfiNumber', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">RFI Title</label>
        <input
          type="text"
          value={data.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Brief Description</label>
        <textarea
          value={data.description || ''}
          onChange={(e) => onChange('description', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="3"
          required
        />
      </div>
    </>
  );
};

const TaskForm = ({ data, onChange, formData, setFormData }) => {
  const people = ['Jamie', 'Darrel', 'Aidan', 'Johnathan', 'Freddy'];
  
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
        <select
          value={formData.project}
          onChange={(e) => setFormData({ ...formData, project: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">Select...</option>
          <option value="A - Hopyard">A - Hopyard</option>
          <option value="B - Purkins Corner">B - Purkins Corner</option>
          <option value="C - Pump Stations">C - Pump Stations</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
        <input
          type="text"
          value={data.taskTitle || ''}
          onChange={(e) => onChange('taskTitle', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Brief Description</label>
        <textarea
          value={data.description || ''}
          onChange={(e) => onChange('description', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="3"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Assigned From</label>
        <select
          value={data.assignedFrom || ''}
          onChange={(e) => onChange('assignedFrom', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">Select...</option>
          {people.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
        <select
          value={data.assignedTo || ''}
          onChange={(e) => onChange('assignedTo', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">Select...</option>
          {people.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
    </>
  );
};

const TransactionForm = ({ data, onChange, entityType, getEntitiesByType }) => {
  const entities = getEntitiesByType(entityType);
  
  const getEntityDisplay = (entity) => {
    if (entity.description) return entity.description;
    if (entity.title) return entity.title;
    if (entity.name) return entity.name;
    if (entity.taskTitle) return entity.taskTitle;
    return entity.id;
  };

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select {entityType}
        </label>
        <select
          value={data.linkedEntityId || ''}
          onChange={(e) => {
            const selectedId = e.target.value;
            const selectedEntity = getEntitiesByType(entityType).find(ent => ent.id === selectedId);
            onChange('linkedEntityId', selectedId);
            onChange('entityDisplay', selectedEntity ? getEntityDisplay(selectedEntity) : '');
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">Select...</option>
          {getEntitiesByType(entityType).map(entity => (
            <option key={entity.id} value={entity.id}>
              {entity.id} - {getEntityDisplay(entity)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Status Update</label>
        <input
          type="text"
          value={data.statusUpdate || ''}
          onChange={(e) => onChange('statusUpdate', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={data.notes || ''}
          onChange={(e) => onChange('notes', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="4"
        />
      </div>
    </>
  );
};

const LookupView = ({ entities, transactions, searchTerm, setSearchTerm, filterType, setFilterType, getEntityIcon }) => {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search entities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full md:w-48 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="Material">Materials</option>
              <option value="Submittal">Submittals</option>
              <option value="Vendor">Vendors</option>
              <option value="RFI">RFIs</option>
              <option value="Task">Tasks</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">
            All Entities ({entities.length})
          </h2>
        </div>
        <div className="divide-y max-h-[600px] overflow-y-auto">
          {entities.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No entities found
            </div>
          ) : (
            entities.map(entity => (
              <EntityCard 
                key={entity.id} 
                entity={entity} 
                transactions={transactions.filter(t => t.linkedEntityId === entity.id)}
                getEntityIcon={getEntityIcon}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const EntityCard = ({ entity, transactions, getEntityIcon }) => {
  const [expanded, setExpanded] = useState(false);

  const getEntityDisplay = () => {
    if (entity.description) return entity.description;
    if (entity.title) return entity.title;
    if (entity.name) return entity.name;
    if (entity.taskTitle) return entity.taskTitle;
    return 'Untitled';
  };

  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <div className="mt-1">
          {getEntityIcon(entity.entityType)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-sm font-medium text-blue-600">
              {entity.id}
            </span>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
              {entity.entityType}
            </span>
          </div>
          <div className="text-sm font-medium text-gray-900 mb-1">
            {getEntityDisplay()}
          </div>
          <div className="text-xs text-gray-500 space-x-3">
            <span>Created: {new Date(entity.dateCreated).toLocaleDateString()}</span>
            <span>Updated: {new Date(entity.lastUpdated).toLocaleDateString()}</span>
          </div>

          {transactions.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              {expanded ? 'Hide' : 'Show'} {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
            </button>
          )}

          {expanded && transactions.length > 0 && (
            <div className="mt-3 space-y-2 pl-4 border-l-2 border-blue-200">
              {transactions.map(txn => (
                <div key={txn.id} className="text-sm">
                  <div className="font-mono text-xs text-gray-500">{txn.id}</div>
                  <div className="text-gray-900">{txn.statusUpdate}</div>
                  {txn.notes && (
                    <div className="text-gray-600 text-xs mt-1">{txn.notes}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(txn.dateCreated).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectTracker;
