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
    muscle_mass: '',
    body_fat_pct: '',
    target_weight: '',
    notes: '',
    package_type: '',
    amount_paid: '',
    start_date: '',
    end_date: '',
    preferred_days: '', // Comma-separated indices
    preferred_time: '07:00'
  });

  const [selectedDays, setSelectedDays] = useState([]);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [loading, setLoading] = useState(false);

  const daysOptions = [
    { label: 'Mon', num: 1 },
    { label: 'Tue', num: 2 },
    { label: 'Wed', num: 3 },
    { label: 'Thu', num: 4 },
    { label: 'Fri', num: 5 },
    { label: 'Sat', num: 6 },
    { label: 'Sun', num: 7 }
  ];

  // Helper to determine BMI category text
  const getBmiCategory = (val) => {
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) return '';
    if (num < 18.5) return 'Underweight';
    if (num < 25) return 'Normal';
    if (num < 30) return 'Overweight';
    return 'Obese';
  };

  // Pre-fill fields on open / edit load
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
        muscle_mass: editingClient.muscle_mass || '',
        body_fat_pct: editingClient.body_fat_pct || '',
        target_weight: editingClient.target_weight || '',
        notes: editingClient.notes || '',
        package_type: editingClient.package_type || '',
        amount_paid: editingClient.amount_paid || '',
        start_date: editingClient.start_date || '',
        end_date: editingClient.end_date || '',
        preferred_days: editingClient.preferred_days || '',
        preferred_time: editingClient.preferred_time || '07:00'
      });
      setSelectedDays(editingClient.preferred_days ? editingClient.preferred_days.split(',').map(Number) : []);
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
        muscle_mass: '',
        body_fat_pct: '',
        target_weight: '',
        notes: '',
        package_type: '',
        amount_paid: '',
        start_date: '',
        end_date: '',
        preferred_days: '',
        preferred_time: '07:00'
      });
      setSelectedDays([]);
    }
    setError('');
    setWarning('');
  }, [editingClient, isOpen]);

  // Auto-calculate Package End Date (Start Date + 1 Month)
  useEffect(() => {
    if (formData.start_date) {
      const d = new Date(formData.start_date);
      d.setMonth(d.getMonth() + 1);
      setFormData(prev => ({ ...prev, end_date: d.toISOString().split('T')[0] }));
    }
  }, [formData.start_date]);

  // Handle Package Selection Defaults
  const handlePackageSelect = (type) => {
    let price = 99.00;
    let suggestedDays = [1, 3, 5]; // Silver Alternate Suggestion

    if (type === 'Gold') {
      price = 149.00;
      suggestedDays = [1, 2, 3, 4, 5]; // Gold 5 days/week
    } else if (type === 'Platinum') {
      price = 199.00;
      suggestedDays = [1, 2, 3, 4, 5, 6, 7]; // Platinum Daily
    }

    setFormData(prev => ({
      ...prev,
      package_type: type,
      amount_paid: price,
      preferred_days: suggestedDays.join(',')
    }));
    setSelectedDays(suggestedDays);
  };

  // Toggle Preferred Day Pill Selection
  const handleDayToggle = (dayNum) => {
    let updated;
    if (selectedDays.includes(dayNum)) {
      updated = selectedDays.filter(d => d !== dayNum);
    } else {
      updated = [...selectedDays, dayNum].sort((a, b) => a - b);
    }
    setSelectedDays(updated);
    setFormData(prev => ({ ...prev, preferred_days: updated.join(',') }));
  };

  // Validate session counts vs selected weekdays
  useEffect(() => {
    if (!formData.package_type) return;

    let targetCount = 12;
    if (formData.package_type === 'Gold') targetCount = 20;
    else if (formData.package_type === 'Platinum') targetCount = 30;

    const weeksInMonth = 4.3; // Avg weeks in month
    const totalWeeklySessions = selectedDays.length;
    const computedTotal = Math.round(totalWeeklySessions * weeksInMonth);

    if (computedTotal !== targetCount) {
      setWarning(`Mismatch: Selected days generate ~${computedTotal} workouts. Your package requires ${targetCount}.`);
    } else {
      setWarning('');
    }
  }, [selectedDays, formData.package_type]);

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

  const bmiCategory = getBmiCategory(formData.bmi);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-slate-950/40">
          <h3 className="text-base font-bold text-white">
            {editingClient ? 'Edit Client Profile' : 'Add New Client'}
          </h3>
          <button onClick={onClose} className="text-slate-400 text-xl font-bold">&times;</button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-6 space-y-6 flex-1">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-455 text-xs rounded-xl">
                {error}
              </div>
            )}

            {/* 1. Biographics Section */}
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-extrabold text-lime-400 tracking-widest border-b border-white/5 pb-2">
                1. Biographics
              </h4>
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

            {/* 2. Fitness Profile Body Composition Fields (2-column input grid) */}
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-extrabold text-lime-400 tracking-widest border-b border-white/5 pb-2">
                2. Fitness & Body Composition Metrics
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Height (cm)</label>
                  <input type="number" step="0.1" name="height" value={formData.height} onChange={handleChange} required
                    className="px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-white focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Weight (kg)</label>
                  <input type="number" step="0.1" name="weight" value={formData.weight} onChange={handleChange} required
                    className="px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-white focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase font-bold text-slate-400">BMI (Manual)</label>
                    {bmiCategory && (
                      <span className="text-[10px] text-lime-450 font-bold bg-lime-400/10 px-1.5 py-0.5 rounded">
                        {bmiCategory}
                      </span>
                    )}
                  </div>
                  <input type="number" step="0.1" name="bmi" value={formData.bmi} onChange={handleChange} required
                    className="px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-white focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Body Fat %</label>
                  <input type="number" step="0.1" name="body_fat_pct" value={formData.body_fat_pct} onChange={handleChange} required
                    className="px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-white focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Visceral Fat</label>
                  <input type="number" step="0.1" name="visceral_fat" value={formData.visceral_fat} onChange={handleChange} required
                    className="px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-white focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Muscle Mass (kg)</label>
                  <input type="number" step="0.1" name="muscle_mass" value={formData.muscle_mass} onChange={handleChange} required
                    className="px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-white focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Water Level / Body Water %</label>
                  <input type="number" step="0.1" name="water_level" value={formData.water_level} onChange={handleChange} required
                    className="px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-white focus:outline-none" />
                </div>
              </div>
            </div>

            {/* 3. Membership Packages Section */}
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-extrabold text-lime-400 tracking-widest border-b border-white/5 pb-2">
                3. Membership & Package Pricing
              </h4>
              
              {/* Package cards stack vertically */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {['Silver', 'Gold', 'Platinum'].map(type => {
                  const isActive = formData.package_type === type;
                  const label = type === 'Silver' ? '12 Sessions' : type === 'Gold' ? '20 Sessions' : '30 Sessions';
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handlePackageSelect(type)}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between min-h-[90px] transition-all duration-200 active:scale-[0.98] ${
                        isActive 
                          ? 'bg-gradient-to-br from-lime-400 to-emerald-500 border-lime-450 text-slate-950' 
                          : 'bg-slate-950 border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <span className={`text-[10px] uppercase font-extrabold tracking-wider ${isActive ? 'text-slate-900' : 'text-lime-400'}`}>{type}</span>
                      <strong className={`text-sm block mt-1 ${isActive ? 'text-slate-950' : 'text-white'}`}>{label}</strong>
                    </button>
                  );
                })}
              </div>

              {/* Package Dates & Custom Price Fields */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Total Price ($)</label>
                  <input type="number" name="amount_paid" value={formData.amount_paid} onChange={handleChange} required
                    className="px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-white focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 font-bold">Start Date</label>
                  <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} required
                    className="px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-white focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-[10px] uppercase font-bold text-slate-450">End Date</label>
                  <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} required
                    className="px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-white focus:outline-none" />
                </div>
              </div>
            </div>

            {/* 4. Scheduling Preferences Pattern Section */}
            {formData.package_type && (
              <div className="space-y-4 animate-fade-in">
                <h4 className="text-xs uppercase font-extrabold text-lime-400 tracking-widest border-b border-white/5 pb-2">
                  4. Smart Scheduling Pattern
                </h4>

                {/* Day pills row (horizontally scrollable, touch friendly) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Preferred Days</label>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {daysOptions.map(opt => {
                      const isSelected = selectedDays.includes(opt.num);
                      return (
                        <button
                          key={opt.num}
                          type="button"
                          onClick={() => handleDayToggle(opt.num)}
                          className={`flex-1 min-w-[58px] py-2.5 rounded-full text-xs font-bold border transition-all duration-150 min-h-[44px] ${
                            isSelected 
                              ? 'bg-gradient-to-r from-lime-450 to-emerald-500 text-slate-950 border-lime-450' 
                              : 'bg-slate-950 border-white/10 text-slate-400 hover:border-white/15'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 col-span-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Preferred Time slot</label>
                    <input type="time" name="preferred_time" value={formData.preferred_time} onChange={handleChange} required
                      className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-white focus:outline-none" />
                  </div>
                </div>

                {/* Day warning mismatch */}
                {warning && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-450 text-xs rounded-xl">
                    ⚠️ {warning}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sticky save actions footer */}
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
