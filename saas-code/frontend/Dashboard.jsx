import React, { useState, useEffect } from 'react';
import { Card } from './components';

export default function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    weightLossCount: 0,
    muscleGainCount: 0,
    weightGainCount: 0,
    maintenanceCount: 0
  });
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
          // Merge stats fallback
          setStats({
            total: statsData.stats.total || 0,
            active: statsData.stats.active || 0,
            weightLossCount: statsData.stats.weightLossCount || statsData.stats.weightLoss || 0,
            muscleGainCount: statsData.stats.muscleGainCount || 0,
            weightGainCount: statsData.stats.weightGainCount || 0,
            maintenanceCount: statsData.stats.maintenanceCount || 0
          });
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

  // Math Calculations for SVG Charts
  const totalGoals = (stats.weightLossCount || 0) + (stats.muscleGainCount || 0) + (stats.weightGainCount || 0) + (stats.maintenanceCount || 0) || 1;
  const pctWL = ((stats.weightLossCount || 0) / totalGoals) * 100;
  const pctMG = ((stats.muscleGainCount || 0) / totalGoals) * 100;
  const pctWG = ((stats.weightGainCount || 0) / totalGoals) * 100;
  const pctM = ((stats.maintenanceCount || 0) / totalGoals) * 100;

  // Donut values (Circumference = 251.2 for radius 40)
  const circ = 251.2;
  const wLOffset = 0;
  const mGOffset = (pctWL / 100) * circ;
  const wGOffset = ((pctWL + pctMG) / 100) * circ;
  const mOffset = ((pctWL + pctMG + pctWG) / 100) * circ;

  const trainerInitials = trainerName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  // Time calculations for Current Time Indicator Line
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const hasSessionsToday = todaySessions.length > 0;

  // Render vertical hours list from 7 AM to 10 PM
  const timeSlots = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

  // Calculate current indicator top placement percentage
  const timelineStartHour = 7;
  const timelineEndHour = 22;
  const totalTimelineMinutes = (timelineEndHour - timelineStartHour) * 60;
  const currentMinutesSinceStart = (currentHour - timelineStartHour) * 60 + currentMin;
  const indicatorTopPercentage = (currentMinutesSinceStart / totalTimelineMinutes) * 100;

  return (
    <div className="w-full min-h-screen bg-slate-950 text-white px-4 pt-6 pb-28 md:px-8 space-y-6">
      
      {/* 1. Subtle Gradient Welcome Mesh Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-lime-400 to-emerald-500 flex items-center justify-center font-black text-slate-950 text-lg shadow-md shadow-emerald-500/10">
            {trainerInitials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black">Hello, {trainerName} 👋</h1>
              <span className="inline-flex items-center bg-lime-400/10 text-lime-400 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                🔥 5-day streak
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Here is your customized overview of client performance and slot attendance today.</p>
          </div>
        </div>
        <div className="bg-slate-950/60 border border-white/10 rounded-2xl px-4 py-3 text-center md:text-right flex-shrink-0">
          <strong className="block text-lg font-black text-lime-400">{todaySessions.filter(s => s.status === 'attended').length} / {todaySessions.length}</strong>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Clients Checked In Today</span>
        </div>
      </div>

      {/* 2. Priority Mixed Stat Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Featured Stat Card: Active Clients */}
        <Card className="lg:col-span-2 flex flex-col justify-between p-6 bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 shadow-xl relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Active Status</span>
              <h3 className="text-4xl font-black text-white mt-1">{stats.active}</h3>
              <p className="text-xs text-slate-400 mt-1">Active clients logging stats this week</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-lime-400/10 flex items-center justify-center text-lime-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
          </div>
          
          {/* Sparkline Embedded Line */}
          <div className="mt-8 h-12 w-full">
            <svg viewBox="0 0 140 30" className="w-full h-full text-lime-400" preserveAspectRatio="none">
              <path
                d="M0 25 Q 20 5, 40 18 T 80 10 T 120 22 T 140 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M0 25 Q 20 5, 40 18 T 80 10 T 120 22 T 140 8 L 140 30 L 0 30 Z"
                fill="url(#sparklineGrad)"
                opacity="0.15"
              />
              <defs>
                <linearGradient id="sparklineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a3e635" />
                  <stop offset="100%" stopColor="#a3e635" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </Card>

        {/* 3 Secondary Stats Column */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-6">
          
          {/* Total Registrations */}
          <Card className="flex items-center gap-4 bg-slate-900/50 border border-white/5 p-5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="m9 16 2 2 4-4"/></svg>
            </div>
            <div>
              <h4 className="text-2xl font-black text-white">{stats.total}</h4>
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">TOTAL CLIENTS</span>
            </div>
          </Card>

          {/* Trends Metric */}
          <Card className="flex items-center gap-4 bg-slate-900/50 border border-white/5 p-5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M20 12h2"/><path d="M2 12h2"/></svg>
            </div>
            <div>
              <h4 className="text-2xl font-black text-white">{stats.weightLossCount}</h4>
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">TRENDS LOGGED</span>
            </div>
          </Card>

          {/* Overall Attendance */}
          <Card className="flex items-center gap-4 bg-slate-900/50 border border-white/5 p-5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div>
              <h4 className="text-2xl font-black text-white">88%</h4>
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">ATTENDANCE RATE</span>
            </div>
          </Card>

        </div>
      </div>

      {/* 3. Main Timeline vs Charts Split Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Timeline Schedule Widget (Left 2-columns) */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <span className="text-[10px] font-black text-lime-400 uppercase tracking-widest">SCHEDULE</span>
              <h3 className="font-black text-lg text-white mt-0.5">Today's Workout Timeline</h3>
            </div>
            <span className="text-[10px] text-slate-400 bg-white/5 border border-white/10 px-3 py-1 rounded-full font-bold">
              {todaySessions.length} Scheduled
            </span>
          </div>

          <div className="relative pl-12 md:pl-16 min-h-[400px] border-l border-white/10 space-y-6">
            
            {/* Horizontal Current Time Indicator Bar */}
            {indicatorTopPercentage >= 0 && indicatorTopPercentage <= 100 && (
              <div 
                className="absolute left-0 right-0 border-t-2 border-red-500 z-10 flex items-center pointer-events-none"
                style={{ top: `${indicatorTopPercentage}%` }}
              >
                <span className="bg-red-500 text-white font-extrabold text-[8px] px-1 rounded-full -ml-3 absolute">NOW</span>
              </div>
            )}

            {/* Time mapping slot cards */}
            {timeSlots.map((hour) => {
              const displayHour = hour > 12 ? hour - 12 : hour;
              const ampm = hour >= 12 ? 'PM' : 'AM';
              const formattedTimeLabel = `${displayHour}:00 ${ampm}`;

              const slotSessions = todaySessions.filter(s => {
                const sHour = parseInt(s.session_time.split(':')[0]);
                return sHour === hour;
              });

              return (
                <div key={hour} className="relative py-2 flex flex-col md:flex-row gap-4 items-start">
                  
                  {/* Left Floating Time Marker */}
                  <span className="absolute -left-12 md:-left-16 text-[10px] font-black text-slate-400 w-10 md:w-14 text-right pt-1.5">
                    {formattedTimeLabel}
                  </span>

                  {/* Cards stack on right side */}
                  <div className="flex-1 w-full space-y-2">
                    {slotSessions.length === 0 ? (
                      <div className="h-6 border-b border-dashed border-white/5"></div>
                    ) : (
                      slotSessions.map((s) => (
                        <div 
                          key={s.id} 
                          className="w-full flex items-center justify-between p-4 bg-slate-900/50 border border-white/10 rounded-2xl transition-all duration-200 hover:border-lime-400 hover:scale-[1.005] cursor-pointer"
                        >
                          <div>
                            <h4 className="font-extrabold text-sm text-white">{s.client_name}</h4>
                            <p className="text-xs text-slate-400 mt-1">{s.notes || 'Workout Session'}</p>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-400">{s.session_time.substring(0, 5)}</span>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              s.status === 'attended' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' :
                              s.status === 'missed' ? 'bg-rose-500/10 text-rose-450 border border-rose-500/10' :
                              s.status === 'rescheduled' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/10' :
                              'bg-slate-800 text-slate-400'
                            }`}>
                              {s.status || 'Upcoming'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </Card>

        {/* Charts & Inactivity Alerts Right Widget stack */}
        <div className="space-y-6">
          
          {/* Client Goal Distribution SVG Donut Widget */}
          <Card className="p-6">
            <h3 className="font-black text-base text-white mb-4">Goal Distribution</h3>
            
            <div className="flex flex-col items-center justify-center gap-4">
              
              {/* Donut Draw */}
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Outer base track */}
                  <circle cx="50" cy="50" r="40" className="stroke-white/5 fill-none" strokeWidth="10" />
                  
                  {/* Weight Loss (Lime) */}
                  {pctWL > 0 && (
                    <circle cx="50" cy="50" r="40" className="stroke-lime-400 fill-none" strokeWidth="10"
                      strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * pctWL) / 100} strokeDasharray={`${(pctWL/100)*251.2} 251.2`} strokeLinecap="round" />
                  )}
                  {/* Muscle Gain (Blue) */}
                  {pctMG > 0 && (
                    <circle cx="50" cy="50" r="40" className="stroke-blue-500 fill-none" strokeWidth="10"
                      strokeDasharray={`${(pctMG/100)*251.2} 251.2`} strokeDashoffset={251.2 - mGOffset} strokeLinecap="round" />
                  )}
                  {/* Weight Gain (Purple) */}
                  {pctWG > 0 && (
                    <circle cx="50" cy="50" r="40" className="stroke-purple-500 fill-none" strokeWidth="10"
                      strokeDasharray={`${(pctWG/100)*251.2} 251.2`} strokeDashoffset={251.2 - wGOffset} strokeLinecap="round" />
                  )}
                  {/* Maintenance (Amber) */}
                  {pctM > 0 && (
                    <circle cx="50" cy="50" r="40" className="stroke-amber-500 fill-none" strokeWidth="10"
                      strokeDasharray={`${(pctM/100)*251.2} 251.2`} strokeDashoffset={251.2 - mOffset} strokeLinecap="round" />
                  )}
                </svg>
                <div className="absolute text-center">
                  <span className="text-2xl font-black text-white">{totalGoals}</span>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Total</span>
                </div>
              </div>

              {/* Chart Legend */}
              <div className="grid grid-cols-2 gap-3 w-full pt-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-lime-400 flex-shrink-0"></span>
                  <span className="truncate">Loss: <strong>{stats.weightLossCount}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0"></span>
                  <span className="truncate">Gain: <strong>{stats.muscleGainCount}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 flex-shrink-0"></span>
                  <span className="truncate">Muscle: <strong>{stats.weightGainCount}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0"></span>
                  <span className="truncate">Maint: <strong>{stats.maintenanceCount}</strong></span>
                </div>
              </div>

            </div>
          </Card>

          {/* Weekly Activity Mini-Bar Chart Widget */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-base text-white">Weekly Activity</h3>
              <span className="text-[10px] text-lime-400 font-bold uppercase tracking-wider">Completed</span>
            </div>

            <div className="h-28 flex items-end justify-between gap-2 px-2 pt-4">
              {[
                { label: 'M', val: 3 },
                { label: 'T', val: 5 },
                { label: 'W', val: 4 },
                { label: 'T', val: 6 },
                { label: 'F', val: 2 },
                { label: 'S', val: 5 },
                { label: 'S', val: 1 }
              ].map((day, idx) => {
                const maxVal = 7;
                const barHeightPct = (day.val / maxVal) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer">
                    <span className="text-[8px] font-bold text-lime-400 opacity-0 group-hover:opacity-100 transition-opacity">{day.val}</span>
                    <div 
                      className="w-full bg-slate-800 rounded-t-lg transition-all duration-300 group-hover:bg-gradient-to-t group-hover:from-lime-400 group-hover:to-emerald-500" 
                      style={{ height: `${barHeightPct}%`, minHeight: '6px' }}
                    ></div>
                    <span className="text-[9px] font-black text-slate-400">{day.label}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Inactivity Alerts Centered Checkmark State */}
          <Card className="p-6">
            <h3 className="font-black text-base text-white mb-4">Smart Inactivity Alerts</h3>
            
            <div className="flex flex-col items-center justify-center text-center py-6">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <strong className="text-sm font-bold text-white">All clients active</strong>
              <p className="text-xs text-slate-400 mt-1">Excellent! No inactivity logs flagged today.</p>
            </div>
          </Card>

        </div>

      </div>

    </div>
  );
}
