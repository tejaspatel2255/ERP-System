import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, Boxes, ClipboardList, DollarSign, Factory, PackageSearch, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import { getDashboardActivity, getDashboardCharts, getDashboardSummary } from '../api/dashboardApi';
import Table from '../components/Table';
import StatusBadge from '../components/StatusBadge';
import { formatINR } from '../utils/formatCurrency';

const kpiConfig = [
  { key: 'total_sales_this_month', label: 'Sales This Month', icon: DollarSign, color: 'from-indigo-500 to-accent-secondary', trend: '+14.2%', trendUp: true, isCurrency: true },
  { key: 'open_purchase_orders', label: 'Open Purchase Orders', icon: ClipboardList, color: 'from-accent-warning to-amber-500', trend: '-2.4%', trendUp: false },
  { key: 'low_stock_items', label: 'Low Stock Items', icon: PackageSearch, color: 'from-accent-danger to-rose-500', trend: '+4%', trendUp: true },
  { key: 'open_work_orders', label: 'Open Work Orders', icon: Factory, color: 'from-accent-primary to-blue-500', trend: '+8.3%', trendUp: true },
  { key: 'pending_qa_approvals', label: 'Pending QA Approvals', icon: Activity, color: 'from-fuchsia-500 to-purple-600', trend: '0%', trendUp: true },
  { key: 'open_maintenance_issues', label: 'Open Maintenance Issues', icon: Boxes, color: 'from-accent-success to-teal-500', trend: '-12.5%', trendUp: false }
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

const chartColors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6'];

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
    { key: 'module', label: 'Module', render: (item) => <span className="capitalize">{item.module}</span> },
    { key: 'created_at', label: 'Time', render: (item) => new Date(item.created_at).toLocaleString() }
  ];

  return (
    <div className="space-y-8 p-6 md:p-8 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-text-primary">Dashboard</h1>
        <p className="mt-1 text-sm text-text-secondary">A live snapshot of the ERP across sales, operations, and quality.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-accent-danger/30 bg-accent-danger/10 p-3 text-sm text-accent-danger">
          {error}
        </div>
      )}

      {/* KPI Cards Grid - 3 Columns Desktop, 2 Tablet, 1 Mobile */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {kpiConfig.map((item) => {
          const Icon = item.icon;
          const rawValue = summary ? summary[item.key] : null;
          const displayValue = typeof rawValue === 'number'
            ? item.isCurrency
              ? formatINR(rawValue)
              : rawValue.toLocaleString()
            : '0';

          return (
            <div
              key={item.key}
              className="rounded-2xl border border-border-color bg-bg-card p-6 shadow-brand transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between"
            >
              {loading ? (
                <div className="h-28 animate-pulse rounded-xl bg-bg-hover" />
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color} text-white shadow-sm`}>
                      <Icon size={22} className="stroke-[2]" />
                    </div>
                    <div className={`flex items-center gap-0.5 text-xs font-bold rounded-full px-2 py-0.5 ${
                      item.trendUp ? 'text-accent-success bg-accent-success/10' : 'text-accent-danger bg-accent-danger/10'
                    }`}>
                      {item.trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      <span>{item.trend}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="text-3xl font-black text-text-primary tracking-tight">
                      {displayValue}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-wider font-semibold text-text-secondary">
                      {item.label}
                    </div>
                  </div>

                  <div className="mt-4 border-t border-border-color/50 pt-2 flex items-center justify-between text-[11px] text-text-muted">
                    <span>Active state</span>
                    <span>Updated just now</span>
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
        <div className="rounded-2xl border border-border-color bg-bg-card p-6 shadow-brand">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-text-primary">Sales Trend</h2>
              <p className="text-xs text-text-secondary">Gross sales over the past 12 months</p>
            </div>
            <span className="rounded-lg bg-bg-secondary px-2.5 py-1 text-xs font-medium text-text-muted border border-border-color">
              Monthly
            </span>
          </div>

          {loading ? (
            <div className="h-80 animate-pulse rounded-xl bg-bg-hover" />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={charts?.salesByMonth || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 12,
                    color: 'var(--text-primary)'
                  }}
                />
                <Bar dataKey="total" fill="var(--accent-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Inventory Category Chart */}
        <div className="rounded-2xl border border-border-color bg-bg-card p-6 shadow-brand">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-text-primary">Inventory by Category</h2>
              <p className="text-xs text-text-secondary">Breakdown of current item stock levels</p>
            </div>
            <span className="rounded-lg bg-bg-secondary px-2.5 py-1 text-xs font-medium text-text-muted border border-border-color">
              Live Stock
            </span>
          </div>

          {loading ? (
            <div className="h-80 animate-pulse rounded-xl bg-bg-hover" />
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_200px] items-center">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="count"
                    nameKey="category"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={3}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 12,
                      color: 'var(--text-primary)'
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                {pieData.map((entry, index) => (
                  <div key={entry.category} className="flex items-center justify-between gap-3 text-xs text-text-secondary bg-bg-secondary/40 p-2 rounded-xl border border-border-color/30">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: chartColors[index % chartColors.length] }} />
                      <span className="font-semibold text-text-primary truncate max-w-[100px]">{entry.category}</span>
                    </div>
                    <span className="font-bold text-text-primary bg-bg-secondary px-1.5 py-0.5 rounded-md border border-border-color/50">{entry.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Activity and Quick Links Section */}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-2xl border border-border-color bg-bg-card p-6 shadow-brand">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-text-primary">Recent Activity</h2>
            <Link to="/activity-logs" className="text-xs font-semibold text-accent-primary hover:underline">
              View all logs
            </Link>
          </div>
          <Table columns={activityColumns} data={activity} loading={loading} emptyMessage="No recent activity logged." />
        </div>

        {/* Quick Links Card */}
        <div className="rounded-2xl border border-border-color bg-bg-card p-6 shadow-brand flex flex-col">
          <h2 className="mb-4 text-lg font-bold text-text-primary">Quick Navigation</h2>
          <div className="grid grid-cols-1 gap-3 flex-1">
            {quickLinks.map(([label, to]) => (
              <Link
                key={to}
                to={to}
                className="group flex items-center justify-between rounded-xl border border-border-color bg-bg-secondary/40 px-4 py-3 text-sm font-semibold text-text-secondary transition-all duration-200 hover:border-accent-primary/50 hover:bg-bg-hover hover:text-text-primary"
              >
                <span>{label}</span>
                <ArrowUpRight size={16} className="text-text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent-primary" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
