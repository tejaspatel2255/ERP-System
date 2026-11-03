import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Activity,
  Boxes,
  ClipboardList,
  DollarSign,
  Factory,
  PackageSearch,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { getDashboardActivity, getDashboardCharts, getDashboardSummary } from '../api/dashboardApi';
import Table from '../components/Table';
import StatusBadge from '../components/StatusBadge';
import PageHeader from '../components/PageHeader';
import { formatINR } from '../utils/formatCurrency';

const kpiConfig = [
  { key: 'total_sales_this_month', trendKey: 'sales_trend', label: 'Sales this month', icon: DollarSign, isCurrency: true, tint: 'var(--info-bg)', tintText: 'var(--info-text)' },
  { key: 'open_purchase_orders', trendKey: 'po_trend', label: 'Open purchase orders', icon: ClipboardList, tint: 'var(--warning-bg)', tintText: 'var(--warning-text)' },
  { key: 'low_stock_items', trendKey: 'stock_trend', label: 'Low stock items', icon: PackageSearch, tint: 'var(--danger-bg)', tintText: 'var(--danger-text)' },
  { key: 'open_work_orders', trendKey: 'wo_trend', label: 'Open work orders', icon: Factory, tint: 'var(--info-bg)', tintText: 'var(--info-text)' },
  { key: 'pending_qa_approvals', trendKey: 'qa_trend', label: 'Pending QA approvals', icon: Activity, tint: 'var(--success-bg)', tintText: 'var(--success-text)' },
  { key: 'open_maintenance_issues', trendKey: 'maintenance_trend', label: 'Open maintenance issues', icon: Boxes, tint: 'var(--warning-bg)', tintText: 'var(--warning-text)' }
];

const lifecycleSteps = [
  { step: 1, title: 'Quotation', desc: 'Commercial proposal', to: '/sales/quotations' },
  { step: 2, title: 'Sales order', desc: 'Customer confirmation', to: '/sales/orders' },
  { step: 3, title: 'Work order', desc: 'Production assembly', to: '/production/work-orders' },
  { step: 4, title: 'Quality check', desc: 'Inspection & testing', to: '/qc/final' },
  { step: 5, title: 'Dispatch', desc: 'Delivery challan & packing', to: '/dispatch/challans' }
];

const quickLinks = [
  ['Users', '/users'],
  ['Sales orders', '/sales/orders'],
  ['Purchase orders', '/purchase/orders'],
  ['Stock alerts', '/store/alerts'],
  ['Work orders', '/production/work-orders'],
  ['Final QC', '/qc/final'],
  ['Packing slips', '/dispatch/packing-slips'],
  ['Employees', '/hr/employees'],
  ['Design files', '/design/files']
];

const chartColors = ['#0A6ED1', '#16A394', '#F59E0B', '#7C5CFC', '#E5484D', '#64748B', '#2D9CDB', '#8BC34A'];

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
    { key: 'module', label: 'Module', render: (item) => <span className="capitalize font-medium text-text-primary">{item.module}</span> },
    { key: 'created_at', label: 'Time', render: (item) => new Date(item.created_at).toLocaleString() }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Dashboard"
        description="A live snapshot of the ERP across sales, operations, and quality."
      />

      {error && (
        <div className="rounded-md border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger-text)] flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
              className="sheet p-4 flex flex-col justify-between"
            >
              {loading ? (
                <div className="h-24 bg-bg-hover animate-pulse rounded" />
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">{item.label}</span>
                    <div
                      className="h-9 w-9 rounded-md grid place-items-center"
                      style={{ backgroundColor: item.tint, color: item.tintText }}
                    >
                      <Icon size={18} />
                    </div>
                  </div>

                  <div className="text-2xl font-semibold tabular-nums text-text-primary mt-2">
                    {displayValue}
                  </div>

                  <div className="flex items-center gap-1 text-xs mt-2">
                    <span
                      className="inline-flex items-center gap-0.5 font-medium"
                      style={{ color: trendInfo.trendUp ? 'var(--success-text)' : 'var(--danger-text)' }}
                    >
                      {trendInfo.trendUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                      <span>{trendInfo.trend}</span>
                    </span>
                    <span className="text-text-muted">vs last period</span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Lifecycle Stepper Card */}
      <div className="sheet p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">
          Order-to-delivery process
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
          {lifecycleSteps.map((step, idx) => (
            <Link
              key={step.step}
              to={step.to}
              className="flex items-start gap-3 p-2 rounded hover:bg-bg-hover transition-colors group relative"
            >
              <span className="step-dot shrink-0">
                {step.step}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
                  {step.title}
                </div>
                <div className="text-xs text-text-secondary mt-0.5">
                  {step.desc}
                </div>
              </div>
              {idx < lifecycleSteps.length - 1 && (
                <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-4 h-[1px] bg-border-color -mr-2" />
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-5 xl:grid-cols-2">
        {/* Sales Trend Chart */}
        <div className="sheet p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Revenue trend</h3>
              <p className="text-xs text-text-secondary">Gross sales over the past 12 months</p>
            </div>
            <span className="tb-cell">
              Monthly
            </span>
          </div>

          {loading ? (
            <div className="h-72 bg-bg-hover animate-pulse rounded" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={charts?.salesByMonth || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 6,
                    boxShadow: 'var(--shadow)',
                    fontSize: 12,
                    color: 'var(--text-primary)'
                  }}
                />
                <Bar dataKey="total" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Inventory Category Chart */}
        <div className="sheet p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Stock overview</h3>
              <p className="text-xs text-text-secondary">Breakdown of current item stock levels</p>
            </div>
            <span className="tb-cell">
              Live stock
            </span>
          </div>

          {loading ? (
            <div className="h-72 bg-bg-hover animate-pulse rounded" />
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
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 6,
                      boxShadow: 'var(--shadow)',
                      fontSize: 12,
                      color: 'var(--text-primary)'
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                {pieData.map((entry, index) => (
                  <div key={entry.category} className="flex items-center justify-between gap-2 text-xs text-text-secondary p-1.5 rounded hover:bg-bg-hover transition-colors">
                    <div className="flex items-center gap-2 truncate">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: chartColors[index % chartColors.length] }} />
                      <span className="font-medium text-text-primary truncate">{entry.category}</span>
                    </div>
                    <span className="font-medium tabular-nums text-text-primary tb-cell shrink-0">{entry.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Activity and Quick Actions Section */}
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2 sheet p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Recent activity</h3>
            <Link to="/activity-logs" className="text-xs font-medium text-accent-primary hover:underline">
              View all logs
            </Link>
          </div>
          <Table columns={activityColumns} data={activity} loading={loading} emptyMessage="No recent activity logged." />
        </div>

        {/* Quick Actions Card */}
        <div className="sheet p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Quick actions</h3>
          <div className="grid grid-cols-1 gap-1.5 flex-1">
            {quickLinks.map(([label, to]) => (
              <Link
                key={to}
                to={to}
                className="group flex items-center justify-between rounded p-2.5 text-xs font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors border border-transparent hover:border-border-color"
              >
                <span>{label}</span>
                <ChevronRight size={14} className="text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent-primary" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
