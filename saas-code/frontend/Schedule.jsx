import React, { useState, useEffect } from 'react';
import { Card, Button } from './components';

export default function Schedule() {
  const [sessions, setSessions] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedMobileDay, setSelectedMobileDay] = useState(new Date().getDay() === 0 ? 7 : new Date().getDay()); // Default 1-7 Mon-Sun
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

  // Get date range of active week
  const today = new Date();
  const getMonday = (d) => {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };
  
  const monday = getMonday(today);
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(d);
  }

  const daysInfo = [
    { label: 'Mon', num: 1 },
    { label: 'Tue', num: 2 },
    { label: 'Wed', num: 3 },
    { label: 'Thu', num: 4 },
    { label: 'Fri', num: 5 },
    { label: 'Sat', num: 6 },
    { label: 'Sun', num: 7 }
  ];

  const filteredSessions = sessions.filter(s => {
    if (selectedClient && s.client_id !== parseInt(selectedClient)) return false;
    return s.day_of_week === selectedMobileDay || new Date(s.session_date).getDay() === (selectedMobileDay === 7 ? 0 : selectedMobileDay);
  });

  return (
    <div className="w-full min-h-screen bg-slate-950 text-white px-4 pt-6 pb-28 md:px-8">
      {/* 1. Header controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <span className="text-xs font-bold text-lime-400 uppercase tracking-widest">SCHEDULE</span>
          <h2 className="text-2xl font-black mt-1">Calendar & Slots</h2>
        </div>

        {/* Client filter */}
        <select 
          value={selectedClient} 
          onChange={(e) => setSelectedClient(e.target.value)}
          className="w-full md:w-56 px-4 py-2.5 bg-slate-900 border border-white/10 rounded-full text-sm text-white focus:outline-none focus:border-lime-400"
        >
          <option value="">-- All Clients --</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* 2. Strava-Style Horizontal Scrollable Date Strip */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
        {daysInfo.map((day) => {
          const dateObj = weekDates[day.num - 1];
          const isToday = dateObj.toDateString() === new Date().toDateString();
          const isActive = selectedMobileDay === day.num;

          return (
            <button
              key={day.num}
              onClick={() => setSelectedMobileDay(day.num)}
              className={`flex-1 min-w-[58px] py-3 rounded-2xl flex flex-col items-center gap-1 border transition-all duration-200 active:scale-[0.98] ${
                isActive 
                  ? 'bg-gradient-to-br from-lime-400 to-emerald-500 text-slate-950 border-lime-400 font-extrabold shadow-md shadow-emerald-500/10' 
                  : 'bg-slate-900/50 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-[10px] tracking-wider uppercase opacity-85">{day.label}</span>
              <strong className="text-lg tracking-tight">{dateObj.getDate()}</strong>
              {isToday && <span className={`w-1 h-1 rounded-full ${isActive ? 'bg-slate-950' : 'bg-lime-400'}`}></span>}
            </button>
          );
        })}
      </div>

      {/* 3. Session list as compact cards stacked vertically */}
      <div className="space-y-3">
        {filteredSessions.length === 0 ? (
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-12 text-center text-slate-400 text-sm">
            No workouts scheduled for this day.
          </div>
        ) : (
          filteredSessions.map((s) => {
            const clientInitials = s.client_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            
            return (
              <Card key={s.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-lime-400 text-sm">
                    {clientInitials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white">{s.client_name}</h3>
                      <span className={`w-2 h-2 rounded-full ${
                        s.status === 'attended' ? 'bg-emerald-400' :
                        s.status === 'missed' ? 'bg-rose-500' : 'bg-lime-400'
                      }`}></span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{s.notes || 'Strength & Conditioning Workout'}</p>
                    <span className="inline-block mt-2 text-[10px] font-bold text-lime-400 bg-lime-400/10 px-2 py-0.5 rounded">
                      {s.session_time.substring(0, 5)}
                    </span>
                  </div>
                </div>

                {/* Touch Actions */}
                <div className="flex gap-2 w-full sm:w-auto border-t border-white/5 sm:border-none pt-3 sm:pt-0">
                  <Button variant="secondary" onClick={() => handleStatusChange(s.id, 'attended')} className="flex-1 sm:flex-none text-xs min-h-[38px] px-3.5">
                    Attended
                  </Button>
                  <Button variant="secondary" onClick={() => handleStatusChange(s.id, 'missed')} className="flex-1 sm:flex-none text-xs min-h-[38px] px-3.5">
                    Missed
                  </Button>
                  <Button variant="secondary" onClick={() => {
                    setReschedulingSession(s);
                    setRescheduleData({ date: s.session_date, time: s.session_time.substring(0, 5) });
                  }} className="flex-1 sm:flex-none text-xs min-h-[38px] px-3.5">
                    Reschedule
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Reschedule Overlay Modal */}
      {reschedulingSession && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="font-bold text-sm text-white">Reschedule Workout</h3>
              <button onClick={() => setReschedulingSession(null)} className="text-slate-400 text-lg font-bold">&times;</button>
            </div>
            <form onSubmit={handleRescheduleSubmit}>
              <div className="p-6 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-wider font-semibold text-slate-400">New Date</label>
                  <input type="date" value={rescheduleData.date} required
                    onChange={(e) => setRescheduleData(prev => ({ ...prev, date: e.target.value }))}
                    className="px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-white focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-wider font-semibold text-slate-400">New Time</label>
                  <input type="time" value={rescheduleData.time} required
                    onChange={(e) => setRescheduleData(prev => ({ ...prev, time: e.target.value }))}
                    className="px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-white focus:outline-none" />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3 bg-slate-950/50">
                <Button variant="secondary" onClick={() => setReschedulingSession(null)} className="text-xs min-h-[38px] px-4 py-2">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="text-xs min-h-[38px] px-4 py-2">
                  Confirm
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
