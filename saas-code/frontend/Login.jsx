import React, { useState } from 'react';

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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Background soft glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10">
        {/* logo */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-bold text-xl">
            ⚡
          </div>
          <span className="text-2xl font-bold font-display tracking-tight text-white">PulseFit</span>
        </div>

        {/* Form Selection tabs */}
        <div className="flex border-b border-slate-800 mb-6">
          <button type="button" onClick={() => { setCurrentMode('login'); setError(''); }}
            className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all ${
              currentMode === 'login' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-slate-500 hover:text-slate-350'
            }`}>
            Sign In
          </button>
          <button type="button" onClick={() => { setCurrentMode('register'); setError(''); }}
            className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all ${
              currentMode === 'register' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-slate-500 hover:text-slate-350'
            }`}>
            Sign Up
          </button>
        </div>

        <h2 className="text-xl font-bold text-white text-center">
          {currentMode === 'login' ? 'Trainer Login' : 'Create Account'}
        </h2>
        <p className="text-xs text-slate-400 text-center mt-1 mb-6">
          {currentMode === 'login' ? 'Access your coaching dashboard' : 'Join as a new coach to manage clients'}
        </p>

        {error && (
          <div className="p-3 mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-450 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name (Sign Up only) */}
          {currentMode === 'register' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-wider font-semibold text-slate-500">Full Name</label>
              <input type="text" name="fullname" value={formData.fullname} onChange={handleChange} required
                className="px-4 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl text-sm" placeholder="Coach Name" />
            </div>
          )}

          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-wider font-semibold text-slate-500">Username</label>
            <input type="text" name="username" value={formData.username} onChange={handleChange} required
              className="px-4 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl text-sm" placeholder="Enter username" />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-wider font-semibold text-slate-500">Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} required
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl text-sm pr-12" placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-emerald-500">
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" disabled={loading}
            className="w-full min-h-[44px] bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl font-semibold text-sm shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-2">
            {loading && <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>}
            {currentMode === 'login' ? 'Secure Login' : 'Register Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
