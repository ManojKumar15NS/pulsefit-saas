import React, { useState } from 'react';
import { Button } from './components';

export default function Login({ onLoginSuccess }) {
  const [currentMode, setCurrentMode] = useState('login'); // 'login' or 'register'
  const [formData, setFormData] = useState({ username: '', password: '', fullname: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const url = currentMode === 'login' ? '/api/login' : '/api/register';
    const payload = currentMode === 'login' 
      ? { username: formData.username, password: formData.password }
      : { username: formData.username, password: formData.password, fullname: formData.fullname };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onLoginSuccess();
      } else {
        setError(data.message || 'Authentication failed. Please verify credentials.');
      }
    } catch (err) {
      setError('Connection failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* 1. Whoop-style radial mesh background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-lime-400/5 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-sm bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10 animate-fade-in">
        {/* Logo Wordmark */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-lime-450 to-emerald-500 flex items-center justify-center text-slate-950 font-black text-2xl shadow-xl shadow-emerald-500/10">
            ⚡
          </div>
          <span className="text-3xl font-extrabold tracking-tight text-white mt-2">PulseFit</span>
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Coaching SaaS Portal</span>
        </div>

        {/* Sign In vs Sign Up Tab Navigation */}
        <div className="flex bg-white/5 rounded-full p-1 mb-6 border border-white/5">
          <button 
            type="button" 
            onClick={() => { setCurrentMode('login'); setError(''); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-full transition-all duration-200 ${
              currentMode === 'login' ? 'bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button 
            type="button" 
            onClick={() => { setCurrentMode('register'); setError(''); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-full transition-all duration-200 ${
              currentMode === 'register' ? 'bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          {currentMode === 'register' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 px-1">Coach Full Name</label>
              <input 
                type="text" 
                name="fullname" 
                value={formData.fullname} 
                onChange={handleChange} 
                required
                className="px-5 py-3 bg-slate-950 border border-white/10 text-white rounded-full text-sm focus:outline-none focus:border-lime-400 transition-all" 
                placeholder="Coach Full Name" 
              />
            </div>
          )}

          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 px-1">Username</label>
            <input 
              type="text" 
              name="username" 
              value={formData.username} 
              onChange={handleChange} 
              required
              className="px-5 py-3 bg-slate-950 border border-white/10 text-white rounded-full text-sm focus:outline-none focus:border-lime-400 transition-all" 
              placeholder="Trainer Username" 
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 px-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                name="password" 
                value={formData.password} 
                onChange={handleChange} 
                required
                className="w-full px-5 py-3 bg-slate-950 border border-white/10 text-white rounded-full text-sm focus:outline-none focus:border-lime-400 transition-all pr-12" 
                placeholder="••••••••" 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 hover:text-lime-400 transition-all"
              >
                {showPassword ? 'HIDE' : 'SHOW'}
              </button>
            </div>
          </div>

          {/* Action button */}
          <Button 
            type="submit" 
            variant="primary" 
            disabled={loading} 
            className="w-full min-h-[44px] mt-4 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
          >
            {loading && <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>}
            {currentMode === 'login' ? 'Trainer Login &rarr;' : 'Register Coach Account'}
          </Button>
        </form>
      </div>
    </div>
  );
}
