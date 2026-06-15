import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, Boxes, ClipboardList, DollarSign, Factory, PackageSearch } from 'lucide-react';
import { getDashboardActivity, getDashboardCharts, getDashboardSummary } from '../api/dashboardApi';

const kpiConfig = [
  { key: 'total_sales_this_month', label: 'Sales This Month', icon: DollarSign, color: 'from-emerald-500 to-teal-400' },
  { key: 'open_purchase_orders', label: 'Open Purchase Orders', icon: ClipboardList, color: 'from-amber-500 to-orange-400' },
  { key: 'low_stock_items', label: 'Low Stock Items', icon: PackageSearch, color: 'from-red-500 to-rose-400' },
  { key: 'open_work_orders', label: 'Open Work Orders', icon: Factory, color: 'from-cyan-500 to-blue-400' },
  { key: 'pending_qa_approvals', label: 'Pending QA Approvals', icon: Activity, color: 'from-violet-500 to-fuchsia-400' },
  { key: 'open_maintenance_issues', label: 'Open Maintenance Issues', icon: Boxes, color: 'from-sky-500 to-indigo-400' }
];

const quickLinks = [
  ['Users', '/users'],
  ['Sales Orders', '/sales/orders'],
  ['Purchase Orders', '/purchase/orders'],
  ['Stock Alerts', '/store/alerts'],
  ['Work Orders', '/production/work-orders'],
  ['Final QC', '/qc/final'],
  ['Packing Slips', '/dispatch/packing-slips'],
  ['Employees', '/hr/employees'],
  ['Design Files', '/design/files']
];

const colors = ['#22d3ee', '#34d399', '#f59e0b', '#a78bfa', '#f472b6', '#60a5fa', '#f87171', '#e879f9'];

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [charts, setCharts] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [summaryRes, chartsRes, activityRes] = await Promise.all([
          getDashboardSummary(),
          getDashboardCharts(),
          getDashboardActivity()
        ]);
        setSummary(summaryRes.summary);
        setCharts(chartsRes.charts);
        setActivity(activityRes.activity || []);
      } catch (err) {
        setError('Failed to load dashboard.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const pieData = useMemo(() => charts?.inventoryByCategory || [], [charts]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-black text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">A live snapshot of the ERP across sales, operations, and quality.</p>
      </div>

      {error && <div className="rounded-xl border border-red-500/40 bg-red-950/80 p-3 text-sm text-red-200">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {kpiConfig.map((item) => {
          const Icon = item.icon;
          const value = summary ? summary[item.key] : null;
          return (
            <div key={item.key} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg">
              {loading ? (
                <div className="h-24 animate-pulse rounded-xl bg-slate-800" />
              ) : (
                <>
                  <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color} text-slate-950`}>
                    <Icon size={20} />
                  </div>
                  <div className="text-2xl font-black text-white">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{item.label}</div>
                  <div className="mt-3 text-xs text-slate-500">Live data</div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Sales Trend</h2>
            <span className="text-xs text-slate-500">Last 12 months</span>
          </div>
          {loading ? (
            <div className="h-80 animate-pulse rounded-xl bg-slate-800" />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={charts?.salesByMonth || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }} />
                <Bar dataKey="total" fill="#22d3ee" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Inventory by Category</h2>
            <span className="text-xs text-slate-500">Current stock count</span>
          </div>
          {loading ? (
            <div className="h-80 animate-pulse rounded-xl bg-slate-800" />
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1fr_160px]">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} dataKey="count" nameKey="category" innerRadius={70} outerRadius={100} paddingAngle={4}>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {pieData.map((entry, index) => (
                  <div key={entry.category} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="h-3 w-3 rounded-full" style={{ background: colors[index % colors.length] }} />
                    <span className="flex-1">{entry.category}</span>
                    <span className="font-semibold text-white">{entry.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <h2 className="mb-4 text-lg font-bold text-white">Recent Activity</h2>
          {loading ? (
            <div className="h-72 animate-pulse rounded-xl bg-slate-800" />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800/70 text-xs uppercase tracking-[0.2em] text-slate-400">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Module</th>
                    <th className="px-4 py-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {activity.map((item) => (
                    <tr key={item.id} className="text-slate-300">
                      <td className="px-4 py-3">{item.user_name || 'System'}</td>
                      <td className="px-4 py-3 font-medium text-white">{item.action}</td>
                      <td className="px-4 py-3 capitalize">{item.module}</td>
                      <td className="px-4 py-3 text-slate-400">{new Date(item.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <h2 className="mb-4 text-lg font-bold text-white">Quick Links</h2>
          <div className="grid gap-3">
            {quickLinks.map(([label, to]) => (
              <Link
                key={to}
                to={to}
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300 transition hover:border-cyan-500/40 hover:text-white"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
