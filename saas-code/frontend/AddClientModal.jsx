import React, { useState, useEffect } from 'react';

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
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load packages dropdown list
  useEffect(() => {
    async function loadPackages() {
      try {
        const res = await fetch('/api/packages');
        if (res.ok) {
          const data = await res.json();
          setPackages(data);
        }
      } catch (err) {
        console.error('Error fetching subscription plans:', err);
      }
    }
    if (isOpen) loadPackages();
  }, [isOpen]);

  // Load editing client profile data
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

  // Optional BMI Auto-Calculation when height/weight modify
  useEffect(() => {
    if (formData.height && formData.weight) {
      const heightM = parseFloat(formData.height) / 100;
      const weightK = parseFloat(formData.weight);
      if (heightM > 0 && weightK > 0) {
        const calculated = (weightK / (heightM * heightM)).toFixed(1);
        setFormData(prev => ({ ...prev, bmi: calculated }));
      }
    }
  }, [formData.height, formData.weight]);

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
        const savedData = await res.json();
        onSave(savedData);
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save client details.');
      }
    } catch (err) {
      setError('Connection failure. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-slide-up">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {editingClient ? 'Edit Client Profile' : 'Add New Client'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl font-bold">&times;</button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wider font-semibold text-slate-450">Full Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required
                  className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm" placeholder="John Doe" />
              </div>

              {/* Age */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wider font-semibold text-slate-450">Age</label>
                <input type="number" name="age" value={formData.age} onChange={handleChange} required
                  className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm" placeholder="28" />
              </div>

              {/* Gender */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wider font-semibold text-slate-450">Gender</label>
                <select name="gender" value={formData.gender} onChange={handleChange} required
                  className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Height */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wider font-semibold text-slate-450">Height (cm)</label>
                <input type="number" step="0.1" name="height" value={formData.height} onChange={handleChange} required
                  className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm" placeholder="180" />
              </div>

              {/* Weight */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wider font-semibold text-slate-450">Weight (kg)</label>
                <input type="number" step="0.1" name="weight" value={formData.weight} onChange={handleChange} required
                  className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm" placeholder="85.5" />
              </div>

              {/* BMI */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wider font-semibold text-slate-450">BMI (Body Mass Index)</label>
                <input type="number" step="0.1" name="bmi" value={formData.bmi} onChange={handleChange} required
                  className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm" placeholder="26.4" />
              </div>

              {/* Water Level */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wider font-semibold text-slate-450">Water Level (%)</label>
                <input type="number" step="0.1" name="water_level" value={formData.water_level} onChange={handleChange}
                  className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm" placeholder="55.0" />
              </div>

              {/* Visceral Fat */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wider font-semibold text-slate-450">Visceral Fat</label>
                <input type="number" step="0.1" name="visceral_fat" value={formData.visceral_fat} onChange={handleChange}
                  className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm" placeholder="8.0" />
              </div>

              {/* Body Fat % */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wider font-semibold text-slate-450">Body Fat %</label>
                <input type="number" step="0.1" name="body_fat_pct" value={formData.body_fat_pct} onChange={handleChange}
                  className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm" placeholder="18.5" />
              </div>

              {/* Muscle Mass */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wider font-semibold text-slate-450">Muscle Mass (kg)</label>
                <input type="number" step="0.1" name="muscle_mass" value={formData.muscle_mass} onChange={handleChange}
                  className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm" placeholder="62.0" />
              </div>

              {/* Target Weight */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wider font-semibold text-slate-450">Target Weight (kg)</label>
                <input type="number" step="0.1" name="target_weight" value={formData.target_weight} onChange={handleChange}
                  className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm" placeholder="78.0" />
              </div>

              {/* Subscription Package */}
              {!editingClient && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-wider font-semibold text-slate-450">Assign Package</label>
                  <select name="package_id" value={formData.package_id} onChange={handleChange}
                    className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm">
                    <option value="">-- None --</option>
                    {packages.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.duration_months}m - ${p.price})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-wider font-semibold text-slate-450">Workout / Diet Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} rows="2"
                className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm" placeholder="Injury details, physical objectives..."></textarea>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
            <button type="button" onClick={onClose} disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-slate-950 flex items-center gap-2">
              {loading && <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>}
              Save Client
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
