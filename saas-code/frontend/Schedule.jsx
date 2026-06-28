import React, { useState, useEffect } from 'react';

export default function Schedule() {
  const [sessions, setSessions] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedMobileDay, setSelectedMobileDay] = useState(new Date().getDay() === 0 ? 7 : new Date().getDay()); // Default 1-7
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [reschedulingSession, setReschedulingSession] = useState(null);
  const [rescheduleData, setRescheduleData] = useState({ date: '', time: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [clientsRes, sessionsRes] = await Promise.all([
          fetch('/api/clients'),
          fetch(`/api/sessions`)
        ]);

        if (clientsRes.ok) {
          const clientsData = await clientsRes.json();
          setClients(clientsData);
        }

        if (sessionsRes.ok) {
          const sessionsData = await sessionsRes.json();
          setSessions(sessionsData);
        }
      } catch (err) {
        console.error('Error fetching calendar dates:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleStatusChange = async (sessionId, status) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        const updated = await res.json();
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: updated.status } : s));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!reschedulingSession) return;

    try {
      const res = await fetch(`/api/sessions/${reschedulingSession.id}/reschedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_date: rescheduleData.date,
          session_time: rescheduleData.time,
          notes: 'Rescheduled session.'
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setSessions(prev => prev.map(s => s.id === reschedulingSession.id ? { 
          ...s, 
          session_date: updated.session_date, 
          session_time: updated.session_time,
          status: updated.status 
        } : s));
        setReschedulingSession(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Date range and header setup
  const today = new Date();
  const targetDate = new Date(today.setDate(today.getDate() + (currentWeekOffset * 7)));
  
  // Calculate Monday of the target date's week
  const getMonday = (d) => {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };
  
  const monday = getMonday(targetDate);
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(d);
  }

  // Filters sessions by client AND day of the week
  const filteredSessions = sessions.filter(s => {
    // Client filter
    if (selectedClient && s.client_id !== parseInt(selectedClient)) return false;
    
    // Day of the week filter (1-7)
    return s.day_of_week === selectedMobileDay || new Date(s.session_date).getDay() === (selectedMobileDay === 7 ? 0 : selectedMobileDay);
  });

  const daysInfo = [
    { label: 'Mon', num: 1 },
    { label: 'Tue', num: 2 },
    { label: 'Wed', num: 3 },
    { label: 'Thu', num: 4 },
    { label: 'Fri', num: 5 },
    { label: 'Sat', num: 6 },
    { label: 'Sun', num: 7 }
  ];

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 px-4 py-6 md:px-8 pb-24">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Coach Schedule</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage client attendance and reschedule bookings</p>
        </div>

        {/* Client filter */}
        <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}
          className="w-full md:w-56 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm shadow-sm">
          <option value="">-- All Clients --</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Week Navigation controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex gap-2 w-full sm:w-auto justify-between">
          <button onClick={() => setCurrentWeekOffset(prev => prev - 1)} className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 rounded-xl text-sm font-semibold">&larr; Prev</button>
          <button onClick={() => setCurrentWeekOffset(0)} className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 rounded-xl text-sm font-semibold">Current</button>
          <button onClick={() => setCurrentWeekOffset(prev => prev + 1)} className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 rounded-xl text-sm font-semibold">Next &rarr;</button>
        </div>
        <strong className="text-sm font-bold text-emerald-500">
          {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </strong>
      </div>

      {/* 1. Horizontal Scroll Days (Mobile first) */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
        {daysInfo.map((day) => {
          const dateObj = weekDates[day.num - 1];
          const isToday = dateObj.toDateString() === new Date().toDateString();
          const isActive = selectedMobileDay === day.num;

          return (
            <button key={day.num} onClick={() => setSelectedMobileDay(day.num)}
              className={`flex-1 min-w-[64px] py-3 rounded-2xl flex flex-col items-center gap-1 border transition-all ${
                isActive 
                  ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-bold shadow-md shadow-emerald-500/10' 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-850 hover:bg-slate-50 text-slate-650 dark:text-slate-400'
              }`}>
              <span className="text-[11px] font-semibold tracking-wider uppercase opacity-80">{day.label}</span>
              <strong className="text-base">{dateObj.getDate()}</strong>
              {isToday && <span className="w-1.5 h-1.5 rounded-full bg-slate-950/40 dark:bg-slate-200"></span>}
            </button>
          );
        })}
      </div>

      {/* 2. Vertical Session List */}
      <div className="space-y-4">
        {filteredSessions.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-sm">
            No workouts scheduled for this day.
          </div>
        ) : (
          filteredSessions.map((s) => {
            const clientInitials = s.client_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            
            return (
              <div key={s.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 flex items-center justify-center font-bold text-slate-600 dark:text-emerald-500">
                    {clientInitials}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">{s.client_name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{s.notes || 'Gym Workout Session'}</p>
                    <span className="inline-block mt-2 text-[10px] font-bold text-emerald-500 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-md">
                      {s.session_time.substring(0, 5)}
                    </span>
                  </div>
                </div>

                {/* Session Actions and Attendance Markings */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto border-t border-slate-50 dark:border-slate-850 md:border-none pt-3 md:pt-0">
                  <button onClick={() => handleStatusChange(s.id, 'attended')}
                    className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      s.status === 'attended' 
                        ? 'bg-emerald-500 border-emerald-500 text-slate-950' 
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850'
                    }`}>
                    ✅ Attended
                  </button>
                  <button onClick={() => handleStatusChange(s.id, 'missed')}
                    className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      s.status === 'missed' 
                        ? 'bg-rose-500 border-rose-500 text-white' 
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850'
                    }`}>
                    ❌ Missed
                  </button>
                  <button onClick={() => {
                    setReschedulingSession(s);
                    setRescheduleData({ date: s.session_date, time: s.session_time.substring(0, 5) });
                  }}
                    className="flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850">
                    🔄 Reschedule
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. Reschedule Overlay Modal */}
      {reschedulingSession && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-sm rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Reschedule Workout</h3>
              <button onClick={() => setReschedulingSession(null)} className="text-slate-400 font-bold">&times;</button>
            </div>
            <form onSubmit={handleRescheduleSubmit}>
              <div className="p-6 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-wider font-semibold text-slate-400">New Date</label>
                  <input type="date" value={rescheduleData.date} required
                    onChange={(e) => setRescheduleData(prev => ({ ...prev, date: e.target.value }))}
                    className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-wider font-semibold text-slate-400">New Time</label>
                  <input type="time" value={rescheduleData.time} required
                    onChange={(e) => setRescheduleData(prev => ({ ...prev, time: e.target.value }))}
                    className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm" />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
                <button type="button" onClick={() => setReschedulingSession(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-850">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl">
                  Confirm Change
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
