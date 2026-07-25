import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, Boxes, ClipboardList, DollarSign, Factory, PackageSearch, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { getDashboardActivity, getDashboardCharts, getDashboardSummary } from '../api/dashboardApi';
import Table from '../components/Table';
import StatusBadge from '../components/StatusBadge';
import PageHeader from '../components/PageHeader';
import { formatINR } from '../utils/formatCurrency';

const kpiConfig = [
  { key: 'total_sales_this_month', trendKey: 'sales_trend', label: 'Sales This Month', icon: DollarSign, isCurrency: true },
  { key: 'open_purchase_orders', trendKey: 'po_trend', label: 'Open Purchase Orders', icon: ClipboardList },
  { key: 'low_stock_items', trendKey: 'stock_trend', label: 'Low Stock Items', icon: PackageSearch },
  { key: 'open_work_orders', trendKey: 'wo_trend', label: 'Open Work Orders', icon: Factory },
  { key: 'pending_qa_approvals', trendKey: 'qa_trend', label: 'Pending QA Approvals', icon: Activity },
  { key: 'open_maintenance_issues', trendKey: 'maintenance_trend', label: 'Open Maintenance Issues', icon: Boxes }
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

const chartColors = ['#2563eb', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6', '#14b8a6'];

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

  const activityColumns = [
    { key: 'user_name', label: 'User', render: (item) => item.user_name || 'System' },
    { key: 'action', label: 'Action', render: (item) => <StatusBadge status={item.action} /> },
    { key: 'module', label: 'Module', render: (item) => <span className="capitalize font-semibold text-slate-700 dark:text-slate-300">{item.module}</span> },
    { key: 'created_at', label: 'Time', render: (item) => new Date(item.created_at).toLocaleString() }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-300 space-y-8">
      <PageHeader
        title="Dashboard"
        description="A live snapshot of the ERP across sales, operations, and quality."
      />

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-sm font-medium text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* KPI Cards Grid - 3 Columns Desktop, 2 Tablet, 1 Mobile */}
      <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {kpiConfig.map((item) => {
          const Icon = item.icon;
          const rawValue = summary ? summary[item.key] : null;
          const displayValue = typeof rawValue === 'number'
            ? item.isCurrency
              ? formatINR(rawValue)
              : rawValue.toLocaleString()
            : '0';

          const trendInfo = summary?.trends?.[item.trendKey] || { trend: '0%', trendUp: true };

          return (
            <div
              key={item.key}
              className="rounded-2xl border border-border-color bg-bg-secondary p-5 shadow-xs transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 flex flex-col justify-between"
            >
              {loading ? (
                <div className="h-24 animate-pulse rounded-xl bg-bg-hover" />
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                      <Icon size={18} />
                    </div>
                    <div className={`flex items-center gap-0.5 text-xs font-bold rounded-lg px-2 py-0.5 border ${
                      trendInfo.trendUp
                        ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-200/80 dark:border-emerald-800/80'
                        : 'text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-200/80 dark:border-rose-800/80'
                    }`}>
                      {trendInfo.trendUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                      <span>{trendInfo.trend}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="text-2xl font-bold font-mono-tabular text-text-primary tracking-tight">
                      {displayValue}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-text-secondary">
                      {item.label}
                    </div>
                  </div>

                  <div className="mt-4 border-t border-border-color/40 pt-2 flex items-center justify-between text-[11px] text-text-muted">
                    <span>Active metric</span>
                    <span>Updated live</span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Sales Trend Chart */}
        <div className="rounded-2xl border border-border-color bg-bg-secondary p-6 shadow-xs">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-text-primary">Sales Trend</h2>
              <p className="text-xs text-text-secondary">Gross sales over the past 12 months</p>
            </div>
            <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-text-secondary border border-border-color/60">
              Monthly
            </span>
          </div>

          {loading ? (
            <div className="h-72 animate-pulse rounded-xl bg-bg-hover" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={charts?.salesByMonth || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 12,
                    color: 'var(--text-primary)'
                  }}
                />
                <Bar dataKey="total" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Inventory Category Chart */}
        <div className="rounded-2xl border border-border-color bg-bg-secondary p-6 shadow-xs">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-text-primary">Inventory by Category</h2>
              <p className="text-xs text-text-secondary">Breakdown of current item stock levels</p>
            </div>
            <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-text-secondary border border-border-color/60">
              Live Stock
            </span>
          </div>

          {loading ? (
            <div className="h-72 animate-pulse rounded-xl bg-bg-hover" />
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_200px] items-center">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="count"
                    nameKey="category"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 12,
                      color: 'var(--text-primary)'
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {pieData.map((entry, index) => (
                  <div key={entry.category} className="flex items-center justify-between gap-3 text-xs text-text-secondary bg-slate-50 dark:bg-slate-950/60 p-2 rounded-xl border border-border-color/50">
                    <div className="flex items-center gap-2 truncate">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: chartColors[index % chartColors.length] }} />
                      <span className="font-semibold text-text-primary truncate">{entry.category}</span>
                    </div>
                    <span className="font-bold font-mono-tabular text-text-primary bg-bg-secondary px-1.5 py-0.5 rounded-md border border-border-color/60 shrink-0">{entry.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Activity and Quick Links Section */}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-2xl border border-border-color bg-bg-secondary p-6 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-text-primary">Recent Activity</h2>
            <Link to="/activity-logs" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              View all logs
            </Link>
          </div>
          <Table columns={activityColumns} data={activity} loading={loading} emptyMessage="No recent activity logged." />
        </div>

        {/* Quick Links Card */}
        <div className="rounded-2xl border border-border-color bg-bg-secondary p-6 shadow-xs flex flex-col">
          <h2 className="mb-4 text-base font-bold text-text-primary">Quick Navigation</h2>
          <div className="grid grid-cols-1 gap-2.5 flex-1">
            {quickLinks.map(([label, to]) => (
              <Link
                key={to}
                to={to}
                className="group flex items-center justify-between rounded-xl border border-border-color/80 bg-slate-50/60 dark:bg-slate-950/40 px-4 py-2.5 text-xs font-semibold text-text-secondary transition-all duration-150 hover:border-blue-500/50 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-text-primary"
              >
                <span>{label}</span>
                <ArrowUpRight size={14} className="text-text-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-blue-500" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
