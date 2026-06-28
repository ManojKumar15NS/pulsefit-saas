import React, { useState, useEffect } from 'react';
import { Card, StatCard } from './components';

export default function ClientProfile({ clientId }) {
  const [client, setClient] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClientDetails() {
      try {
        const [clientRes, historyRes] = await Promise.all([
          fetch(`/api/clients/${clientId}`),
          fetch(`/api/clients/${clientId}/logs`)
        ]);

        if (clientRes.ok) {
          const clientData = await clientRes.json();
          setClient(clientData);
        }

        if (historyRes.ok) {
          const logs = await historyRes.json();
          setHistory(logs);
        }
      } catch (err) {
        console.error('Error fetching client details:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchClientDetails();
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="w-10 h-10 border-4 border-lime-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-950 min-h-screen">
        Client profile not found.
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-950 text-white px-4 pt-6 pb-28 md:px-8">
      {/* 1. Client Banner */}
      <div className="w-full bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 rounded-2xl p-6 shadow-xl mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-16 h-16 rounded-full bg-lime-400 text-slate-950 font-black text-2xl flex items-center justify-center">
            {client.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{client.name}</h1>
            <p className="text-xs text-slate-450 mt-0.5">
              Age: {client.age} | Gender: {client.gender} | Package: {client.package_name || 'No Active Plan'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Metrics Stat Grid - 2 columns on mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
        <StatCard title="Weight" value={client.weight} unit="kg" trend="Target 78" trendDirection="down" />
        <StatCard title="BMI" value={client.bmi} trend="Active" trendDirection="neutral" />
        <StatCard title="Body Fat" value={client.body_fat_pct} unit="%" trend="18.5%" trendDirection="down" />
        <StatCard title="Muscle Mass" value={client.muscle_mass} unit="kg" trend="Stable" trendDirection="neutral" />
        <StatCard title="Water Level" value={client.water_level} unit="%" trend="Good" trendDirection="up" />
      </div>

      {/* 3. Progress Log History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <h3 className="font-bold text-lg text-white mb-4">Biometric Logs History</h3>
            <div className="space-y-3">
              {history.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">No biometric logs logged yet.</p>
              ) : (
                history.map((log) => (
                  <div key={log.id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5 text-xs sm:text-sm">
                    <div>
                      <span className="font-semibold text-white block">Log: {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span className="text-[10px] text-slate-550 block mt-0.5">{log.notes || 'Biometric update'}</span>
                    </div>
                    <div className="text-right">
                      <strong className="text-lime-400 block">{log.weight} kg</strong>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{log.body_fat_pct}% Fat | {log.muscle_mass}kg Muscle</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Workout Notes */}
        <Card>
          <h3 className="font-bold text-lg text-white mb-4">Notes</h3>
          <p className="text-sm text-slate-350 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">
            {client.notes || 'No physical notes active.'}
          </p>
        </Card>
      </div>
    </div>
  );
}
