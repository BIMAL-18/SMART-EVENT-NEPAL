import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar } from 'recharts';
import { Users, Building2, CalendarCheck, Wallet, ClipboardList, CreditCard, ScrollText, UserCog } from 'lucide-react';
import { api } from '../../api/client.js';
import Loading from '../../components/Loading.jsx';
import { getAttendanceModelInfo } from './helpers.js';

const quickLinks = [
  { to: '/admin/users', label: 'All Users', icon: UserCog },
  { to: '/admin/events', label: 'All Events', icon: CalendarCheck },
  { to: '/admin/registrations', label: 'All Registrations', icon: ClipboardList },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
];

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-analytics'], queryFn: () => api.get('/admin/analytics').then(r => r.data) });
  const { data: modelInfo } = useQuery({ queryKey: ['ml-model-info'], queryFn: getAttendanceModelInfo });

  if (isLoading) return <Loading />;
  const t = data.totals;

  const stats = [
    { label: 'Total Users', value: t.totalUsers, icon: Users },
    { label: 'Organizers', value: t.totalOrganizers, icon: Building2 },
    { label: 'Published Events', value: `${t.publishedEvents}/${t.totalEvents}`, icon: CalendarCheck },
    { label: 'Revenue (NPR)', value: t.totalRevenue.toLocaleString(), icon: Wallet },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      <div className="flex flex-wrap gap-2">
        {quickLinks.map(l => (
          <Link key={l.to} to={l.to} className="btn-secondary text-sm flex items-center gap-2">
            <l.icon size={14} /> {l.label}
          </Link>
        ))}
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
          <h3 className="font-semibold mb-4">User growth</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.userGrowth}>
              <XAxis dataKey="_id" hide />
              <YAxis width={30} stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold mb-4">Popular categories</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.popularCategories}>
              <XAxis dataKey="_id" fontSize={10} stroke="#64748b" />
              <YAxis width={30} stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
              <Bar dataKey="count" fill="#a855f7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {modelInfo?.trained && (
        <div className="card p-5">
          <h3 className="font-semibold mb-3">Attendance model evaluation</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-sm">
            {Object.entries(modelInfo.metrics).filter(([k]) => k !== 'confusionMatrix').map(([k, v]) => (
              <div key={k} className="p-3 rounded-xl bg-slate-800/50">
                <p className="text-slate-500 text-xs uppercase">{k}</p>
                <p className="font-bold">{v}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">{modelInfo.note}</p>
        </div>
      )}
    </div>
  );
}
