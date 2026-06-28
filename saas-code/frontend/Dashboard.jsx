import React, { useState, useEffect } from 'react';
import { Card, StatCard } from './components';

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, active: 0, weightLossCount: 0 });
  const [sessionsUsed, setSessionsUsed] = useState(14);
  const [sessionsTotal, setSessionsTotal] = useState(20);
  const [todaySessions, setTodaySessions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [trainerName, setTrainerName] = useState('Coach');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [profileRes, statsRes, sessionsRes, activityRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/dashboard-stats'),
          fetch('/api/sessions'),
          fetch('/api/activity')
        ]);

        if (profileRes.ok) {
          const profile = await profileRes.json();
          setTrainerName(profile.fullname);
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.stats);
        }

        if (sessionsRes.ok) {
          const sessions = await sessionsRes.json();
          const todayStr = new Date().toISOString().split('T')[0];
          setTodaySessions(sessions.filter(s => s.session_date === todayStr));
        }

        if (activityRes.ok) {
          const acts = await activityRes.json();
          setActivities(acts);
        }
      } catch (err) {
        console.error('Error fetching dashboard statistics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="w-10 h-10 border-4 border-lime-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const sessionsPercentage = Math.round((sessionsUsed / sessionsTotal) * 100);
  const activeRate = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;

  return (
    <div className="w-full min-h-screen bg-slate-950 text-white px-4 pt-6 pb-28 md:px-8">
      {/* 1. Hero Welcome Greeting */}
      <div className="mb-6">
        <span className="text-xs font-bold text-lime-400 uppercase tracking-widest">TRAINER PORTAL</span>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">Hello, {trainerName}</h1>
        <p className="text-sm text-slate-400 mt-1">Check metrics and schedule updates for today.</p>
      </div>

      {/* 2. Front & Center Progress Ring Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Session Progress Card */}
        <Card className="md:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="text-lg font-bold text-white">Monthly Target Sessions</h3>
            <p className="text-sm text-slate-400">Total sessions delivered across active tiers.</p>
            <div className="pt-2 flex items-baseline gap-2 justify-center sm:justify-start">
              <span className="text-4xl font-black text-lime-400">{sessionsUsed}</span>
              <span className="text-slate-400 font-semibold">/ {sessionsTotal} completed</span>
            </div>
          </div>
          <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="56" cy="56" r="48" className="stroke-white/5 fill-none" strokeWidth="8" />
              <circle cx="56" cy="56" r="48" className="stroke-lime-400 fill-none" strokeWidth="8"
                strokeDasharray="301.6" strokeDashoffset={301.6 - (301.6 * sessionsPercentage) / 100} strokeLinecap="round" />
            </svg>
            <span className="absolute text-sm font-extrabold text-lime-400">{sessionsPercentage}%</span>
          </div>
        </Card>

        {/* Quick Stats Column */}
        <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
          <StatCard title="Active Clients" value={stats.active} unit={`/ ${stats.total}`} trend={`${activeRate}%`} trendDirection="up" />
          <StatCard title="Trends Logged" value={stats.weightLossCount} unit="weight loss" trend="Active" trendDirection="neutral" />
        </div>
      </div>

      {/* 3. Today's Featured Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-white">Today's Sessions</h3>
              <span className="text-xs text-lime-400 font-semibold bg-lime-400/10 px-2 py-0.5 rounded-full">
                {todaySessions.length} total
              </span>
            </div>
            
            <div className="space-y-3">
              {todaySessions.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">No sessions scheduled for today.</p>
              ) : (
                todaySessions.map((session) => (
                  <div key={session.id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                    <div>
                      <h4 className="font-bold text-sm text-white">{session.client_name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{session.notes || 'Workout Session'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-lime-400 block">{session.session_time.substring(0, 5)}</span>
                      <span className={`inline-block text-[9px] font-extrabold tracking-wider uppercase px-1.5 py-0.5 rounded mt-1 ${
                        session.status === 'attended' ? 'bg-emerald-500/10 text-emerald-400' :
                        session.status === 'missed' ? 'bg-rose-500/10 text-rose-450' : 'bg-lime-400/10 text-lime-400'
                      }`}>
                        {session.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Recent Updates Scrollable List */}
        <div>
          <Card>
            <h3 className="font-bold text-lg text-white mb-4">Recent Activity</h3>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {activities.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No recent activities found.</p>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="text-xs border-b border-white/5 pb-3 last:border-none last:pb-0">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-white">{act.title}</span>
                      <span className="text-[9px] text-slate-500">{act.time_ago}</span>
                    </div>
                    <p className="text-slate-450 mt-1">{act.description}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
