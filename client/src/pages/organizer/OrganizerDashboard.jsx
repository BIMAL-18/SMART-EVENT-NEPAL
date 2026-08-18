import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { CalendarPlus, Users, Wallet, CheckCircle } from 'lucide-react';
import { api } from '../../api/client.js';
import Loading from '../../components/Loading.jsx';

const COLORS = ['#6366f1', '#a855f7', '#22d3ee', '#f59e0b'];

export default function OrganizerDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['organizer-dashboard'], queryFn: () => api.get('/organizer/dashboard').then(r => r.data) });
  if (isLoading) return <Loading />;

  const stats = [
    { label: 'Total Events', value: data.totalEvents, icon: CalendarPlus },
    { label: 'Registrations', value: data.totalRegistrations, icon: Users },
    { label: 'Revenue (NPR)', value: data.revenue.toLocaleString(), icon: Wallet },
    { label: 'Checked In', value: data.checkedInCount, icon: CheckCircle },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Organizer Dashboard</h1>
        <Link to="/organizer/events/create" className="btn-primary flex items-center gap-2"><CalendarPlus size={16} /> Create Event</Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="card p-5">
            <s.icon className="text-brand-400 mb-2" size={20} />
            <p className="text-sm text-slate-400">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold mb-4">Registrations over time</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.registrationsOverTime}>
              <XAxis dataKey="_id" hide />
              <YAxis width={30} stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold mb-4">Ticket type distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.ticketTypeDistribution} dataKey="count" nameKey="_id" outerRadius={80}>
                {data.ticketTypeDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Your events</h3>
          <Link to="/organizer/events" className="text-sm text-brand-400 hover:underline">Manage all</Link>
        </div>
        <div className="space-y-2">
          {data.events.slice(0, 5).map(ev => (
            <Link key={ev._id} to={`/organizer/events/${ev._id}/analytics`} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800">
              <span className="text-sm font-medium">{ev.title}</span>
              <span className="badge bg-slate-700">{ev.status}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
