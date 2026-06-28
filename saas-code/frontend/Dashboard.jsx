import React, { useState, useEffect } from 'react';

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, active: 0, weightLossCount: 0 });
  const [goals, setGoals] = useState({ weightLoss: 0, weightGain: 0, muscleGain: 0, maintenance: 0 });
  const [alerts, setAlerts] = useState([]);
  const [todaySessions, setTodaySessions] = useState([]);
  const [trainerName, setTrainerName] = useState('Coach');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [profileRes, statsRes, sessionsRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/dashboard-stats'),
          fetch('/api/sessions')
        ]);

        if (profileRes.ok) {
          const profile = await profileRes.json();
          setTrainerName(profile.fullname);
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.stats);
          setGoals(statsData.goals);
          setAlerts(statsData.inactiveAlerts || []);
        }

        if (sessionsRes.ok) {
          const sessions = await sessionsRes.json();
          const todayStr = new Date().toISOString().split('T')[0];
          const filtered = sessions.filter(s => s.session_date === todayStr);
          setTodaySessions(filtered);
        }
      } catch (err) {
        console.error('Error fetching dashboard insights:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Calculate active rate for progress ring
  const activeRate = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 px-4 py-6 md:px-8 pb-24">
      {/* 1. Trainer Header Welcome Banner */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Hi, {trainerName}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Let's monitor client progress and check today's scheduled training slots.
          </p>
        </div>
        <div className="flex gap-4 w-full md:w-auto text-center border-t border-slate-100 dark:border-slate-800 md:border-none pt-4 md:pt-0">
          <div className="flex-1 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Active</span>
            <strong className="text-lg font-bold text-emerald-500">{stats.active}</strong>
          </div>
          <div className="flex-1 px-3 py-1 bg-purple-50 dark:bg-purple-950/20 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Total</span>
            <strong className="text-lg font-bold text-purple-500">{stats.total}</strong>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
        {/* Total Clients Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Total Clients</span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{stats.total}</h2>
            <span className="text-xs text-slate-400 mt-2 block">Registered trainers accounts</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-500">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>

        {/* Active Client Target Ring Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Active Rate</span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{activeRate}%</h2>
            <span className="text-xs text-slate-400 mt-2 block">{stats.active} clients currently training</span>
          </div>
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="32" cy="32" r="28" className="stroke-slate-100 dark:stroke-slate-800 fill-none" strokeWidth="6" />
              <circle cx="32" cy="32" r="28" className="stroke-emerald-500 fill-none" strokeWidth="6"
                strokeDasharray="175.8" strokeDashoffset={175.8 - (175.8 * activeRate) / 100} strokeLinecap="round" />
            </svg>
            <span className="absolute text-[10px] font-bold text-emerald-500">{activeRate}%</span>
          </div>
        </div>

        {/* Losing Weight Stats */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Weight Loss Trends</span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{stats.weightLossCount}</h2>
            <span className="text-xs text-slate-400 mt-2 block">Clients dropping weight in last logs</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/20 flex items-center justify-center text-purple-500">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Double Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Today's Schedule (Agenda layout) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Today's Schedule</h3>
              <span className="text-xs text-emerald-500 font-semibold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 rounded-md">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                    <th className="py-3 px-2">Client</th>
                    <th className="py-3 px-2">Time</th>
                    <th className="py-3 px-2">Target</th>
                    <th className="py-3 px-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {todaySessions.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-6 text-center text-sm text-slate-400">
                        No sessions scheduled for today.
                      </td>
                    </tr>
                  ) : (
                    todaySessions.map((session) => (
                      <tr key={session.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 text-sm">
                        <td className="py-3 px-2 font-semibold text-slate-900 dark:text-white">{session.client_name}</td>
                        <td className="py-3 px-2 text-emerald-500 font-medium">{session.session_time.substring(0, 5)}</td>
                        <td className="py-3 px-2 text-slate-500 dark:text-slate-400">{session.notes || 'Training Slot'}</td>
                        <td className="py-3 px-2 text-right">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            session.status === 'attended' ? 'bg-emerald-500/10 text-emerald-500' :
                            session.status === 'missed' ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500'
                          }`}>
                            {session.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Inactivity Alerts */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Smart Alerts</h3>
            <p className="text-xs text-slate-400 mt-1">Inactive clients needing immediate attention</p>
            <div className="mt-4 space-y-3">
              {alerts.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No critical alerts found.</p>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className="p-3 bg-rose-50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/20 rounded-xl flex items-start gap-3">
                    <svg className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-semibold text-rose-900 dark:text-rose-400">{alert.name}</h4>
                      <p className="text-xs text-rose-700 dark:text-rose-500 mt-1">
                        Inactive for {alert.days_inactive} days. Last log: {alert.last_interaction}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
