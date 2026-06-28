import React, { useState, useEffect } from 'react';
import { Button } from './components';

export default function AddClientModal({ isOpen, onClose, onSave, editingClient = null }) {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    height: '',
    weight: '',
    bmi: '',
    water_level: '',
    visceral_fat: '',
    body_fat_pct: '',
    muscle_mass: '',
    target_weight: '',
    notes: '',
    package_id: ''
  });
  
  // Collapse toggles
  const [sectionOpen, setSectionOpen] = useState({
    biographics: true,
    biometrics: true,
    package: true
  });

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPackages() {
      try {
        const res = await fetch('/api/packages');
        if (res.ok) {
          const data = await res.json();
          setPackages(data);
        }
      } catch (err) {
        console.error(err);
      }
    }
    if (isOpen) loadPackages();
  }, [isOpen]);

  useEffect(() => {
    if (editingClient) {
      setFormData({
        name: editingClient.name || '',
        age: editingClient.age || '',
        gender: editingClient.gender || 'Male',
        height: editingClient.height || '',
        weight: editingClient.weight || '',
        bmi: editingClient.bmi || '',
        water_level: editingClient.water_level || '',
        visceral_fat: editingClient.visceral_fat || '',
        body_fat_pct: editingClient.body_fat_pct || '',
        muscle_mass: editingClient.muscle_mass || '',
        target_weight: editingClient.target_weight || '',
        notes: editingClient.notes || '',
        package_id: editingClient.package_id || ''
      });
    } else {
      setFormData({
        name: '',
        age: '',
        gender: 'Male',
        height: '',
        weight: '',
        bmi: '',
        water_level: '',
        visceral_fat: '',
        body_fat_pct: '',
        muscle_mass: '',
        target_weight: '',
        notes: '',
        package_id: ''
      });
    }
    setError('');
  }, [editingClient, isOpen]);

  useEffect(() => {
    if (formData.height && formData.weight) {
      const heightM = parseFloat(formData.height) / 100;
      const weightK = parseFloat(formData.weight);
      if (heightM > 0 && weightK > 0) {
        setFormData(prev => ({ ...prev, bmi: (weightK / (heightM * heightM)).toFixed(1) }));
      }
    }
  }, [formData.height, formData.weight]);

  const toggleSection = (name) => {
    setSectionOpen(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const url = editingClient ? `/api/clients/${editingClient.id}` : '/api/clients';
    const method = editingClient ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        const saved = await res.json();
        onSave(saved);
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save client profiles.');
      }
    } catch (err) {
      setError('Connection failure.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-slate-950/40">
          <h3 className="text-base font-bold text-white">
            {editingClient ? 'Edit Client Profile' : 'Register New Client'}
          </h3>
          <button onClick={onClose} className="text-slate-400 text-xl font-bold">&times;</button>
        </div>

        {/* Modal Body with Collapsible Panels */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-6 space-y-4 flex-1">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                {error}
              </div>
            )}

            {/* 1. Biographics Section */}
            <div className="border border-white/5 rounded-xl overflow-hidden">
              <button type="button" onClick={() => toggleSection('biographics')}
                className="w-full px-4 py-3 bg-white/5 flex justify-between items-center text-xs font-bold uppercase tracking-wider text-lime-400">
                <span>1. Biographics</span>
                <span>{sectionOpen.biographics ? '▼' : '▲'}</span>
              </button>
              {sectionOpen.biographics && (
                <div className="p-4 space-y-4 bg-slate-900/40">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Full Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required
                      className="px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-white focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Age</label>
                      <input type="number" name="age" value={formData.age} onChange={handleChange} required
                        className="px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-white focus:outline-none" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Gender</label>
                      <select name="gender" value={formData.gender} onChange={handleChange} required
                        className="px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-white focus:outline-none">
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Biometrics Section */}
            <div className="border border-white/5 rounded-xl overflow-hidden">
              <button type="button" onClick={() => toggleSection('biometrics')}
                className="w-full px-4 py-3 bg-white/5 flex justify-between items-center text-xs font-bold uppercase tracking-wider text-lime-400">
                <span>2. Biometrics</span>
                <span>{sectionOpen.biometrics ? '▼' : '▲'}</span>
              </button>
              {sectionOpen.biometrics && (
                <div className="p-4 grid grid-cols-2 gap-4 bg-slate-900/40">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Height (cm)</label>
                    <input type="number" step="0.1" name="height" value={formData.height} onChange={handleChange} required
                      className="px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-white" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Weight (kg)</label>
                    <input type="number" step="0.1" name="weight" value={formData.weight} onChange={handleChange} required
                      className="px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-white" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400">BMI</label>
                    <input type="number" step="0.1" name="bmi" value={formData.bmi} readOnly
                      className="px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl text-sm text-slate-400 cursor-not-allowed" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Body Fat %</label>
                    <input type="number" step="0.1" name="body_fat_pct" value={formData.body_fat_pct} onChange={handleChange}
                      className="px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-white" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Muscle Mass (kg)</label>
                    <input type="number" step="0.1" name="muscle_mass" value={formData.muscle_mass} onChange={handleChange}
                      className="px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-white" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Water Level %</label>
                    <input type="number" step="0.1" name="water_level" value={formData.water_level} onChange={handleChange}
                      className="px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-white" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Visceral Fat</label>
                    <input type="number" step="0.1" name="visceral_fat" value={formData.visceral_fat} onChange={handleChange}
                      className="px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-white" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Target Weight (kg)</label>
                    <input type="number" step="0.1" name="target_weight" value={formData.target_weight} onChange={handleChange}
                      className="px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-white" />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Package Assignment & Notes */}
            <div className="border border-white/5 rounded-xl overflow-hidden">
              <button type="button" onClick={() => toggleSection('package')}
                className="w-full px-4 py-3 bg-white/5 flex justify-between items-center text-xs font-bold uppercase tracking-wider text-lime-400">
                <span>3. Package & Goals</span>
                <span>{sectionOpen.package ? '▼' : '▲'}</span>
              </button>
              {sectionOpen.package && (
                <div className="p-4 space-y-4 bg-slate-900/40">
                  {!editingClient && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Select Tier Plan</label>
                      <select name="package_id" value={formData.package_id} onChange={handleChange}
                        className="px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-white">
                        <option value="">-- None --</option>
                        {packages.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.duration_months}m - ${p.price})</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Training Remarks</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} rows="2"
                      className="px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-white focus:outline-none" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Modal Save Bar at bottom */}
          <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3 bg-slate-950/70 sticky bottom-0">
            <Button variant="secondary" onClick={onClose} disabled={loading} className="text-xs min-h-[38px] px-4 py-2">
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading} className="text-xs min-h-[38px] px-4 py-2 flex items-center gap-2">
              {loading && <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>}
              Save Profile
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
