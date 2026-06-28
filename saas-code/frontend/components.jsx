import React from 'react';

// 1. Premium Glassmorphic Card Container
export function Card({ children, className = '', onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-xl transition-all duration-300 ${onClick ? 'cursor-pointer hover:border-white/20 hover:scale-[1.01]' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

// 2. Metrics Stat Card (e.g., Weight, Body Fat, Muscle Mass)
export function StatCard({ title, value, unit = '', trend = null, trendDirection = 'up', className = '' }) {
  return (
    <div className={`bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex flex-col justify-between min-h-[100px] hover:border-white/10 transition-all duration-200 ${className}`}>
      <div>
        <span className="text-xs font-semibold text-slate-450 uppercase tracking-wider block">{title}</span>
        <div className="flex items-baseline gap-1 mt-2">
          <span className="text-2xl font-extrabold tracking-tight text-white">{value}</span>
          {unit && <span className="text-sm font-semibold text-slate-400">{unit}</span>}
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-2 text-[11px] font-bold">
          <span className={trendDirection === 'up' ? 'text-emerald-500' : trendDirection === 'down' ? 'text-rose-500' : 'text-slate-400'}>
            {trendDirection === 'up' ? '▲' : trendDirection === 'down' ? '▼' : '●'} {trend}
          </span>
          <span className="text-slate-500">last week</span>
        </div>
      )}
    </div>
  );
}

// 3. Touch-Friendly Motion-Enabled Button
export function Button({ children, onClick, type = 'button', variant = 'primary', className = '', disabled = false }) {
  const baseStyles = 'inline-flex items-center justify-center font-bold text-sm tracking-wide rounded-full min-h-[44px] px-6 py-3 transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';
  
  const variants = {
    primary: 'bg-gradient-to-r from-lime-400 to-emerald-500 hover:from-lime-300 hover:to-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/10',
    secondary: 'bg-white/10 hover:bg-white/15 text-white border border-white/10',
    danger: 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/20',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

// 4. Floating Pill Bottom Navigation Bar
export function BottomNav({ tabs, activeTab, onTabChange }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-32px)] max-w-md bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2.5 shadow-2xl flex justify-around items-center gap-1">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-full transition-all duration-200 min-w-[64px] min-h-[44px]"
          >
            <div className={`transition-all duration-250 ${isActive ? 'text-lime-400 scale-110' : 'text-slate-400 hover:text-white'}`}>
              {tab.icon}
            </div>
            <span className={`text-[10px] font-bold transition-all ${isActive ? 'text-lime-400 font-extrabold' : 'text-slate-500'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
