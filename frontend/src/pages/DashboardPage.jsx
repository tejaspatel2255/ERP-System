import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, Boxes, ClipboardList, DollarSign, Factory, PackageSearch, ArrowUpRight, ArrowDownRight, Layers, Truck, ShieldAlert, Cpu } from 'lucide-react';
import { getDashboardActivity, getDashboardCharts, getDashboardSummary } from '../api/dashboardApi';
import Table from '../components/Table';
import StatusBadge from '../components/StatusBadge';
import { formatINR } from '../utils/formatCurrency';

const kpiConfig = [
  { key: 'total_sales_this_month', trendKey: 'sales_trend', label: 'Commercial Sales (MTD)', icon: DollarSign, isCurrency: true },
  { key: 'open_purchase_orders', trendKey: 'po_trend', label: 'Active PO Contracts', icon: ClipboardList },
  { key: 'low_stock_items', trendKey: 'stock_trend', label: 'Stock Reorder Thresholds', icon: PackageSearch },
  { key: 'open_work_orders', trendKey: 'wo_trend', label: 'Shop Floor Runs', icon: Factory },
  { key: 'pending_qa_approvals', trendKey: 'qa_trend', label: 'QC Gate Reviews', icon: Activity },
  { key: 'open_maintenance_issues', trendKey: 'maintenance_trend', label: 'Plant Maintenance Tickets', icon: Boxes }
];

const lifecycleSteps = [
  { step: '01', title: 'Procurement', desc: 'Vendor PO & Inward GRN', icon: Truck, link: '/purchase/orders' },
  { step: '02', title: 'Material QC', desc: 'Raw Material QC Gate', icon: ShieldAlert, link: '/qc/raw-material' },
  { step: '03', title: 'Production', desc: 'BOM Work Order Run', icon: Factory, link: '/production/work-orders' },
  { step: '04', title: 'Final QC', desc: 'Product Compliance Pass', icon: Activity, link: '/qc/final' },
  { step: '05', title: 'Logistics', desc: 'Packing & DC Dispatch', icon: Layers, link: '/dispatch/challans' }
];

const quickLinks = [
  ['Users & Access', '/users'],
  ['Sales Orders', '/sales/orders'],
  ['Purchase Orders', '/purchase/orders'],
  ['Stock Reorder Alerts', '/store/alerts'],
  ['Shop Work Orders', '/production/work-orders'],
  ['Final Quality Gate', '/qc/final'],
  ['Dispatch Challans', '/dispatch/challans'],
  ['Employee Roster', '/hr/employees'],
  ['Engineering Files', '/design/files']
];

const chartColors = ['#4F8071', '#3B6458', '#34A883', '#E5A024', '#E55342', '#488CC7', '#9169B0', '#2B5A84'];

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
        setError('Failed to load operations telemetry.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const pieData = useMemo(() => charts?.inventoryByCategory || [], [charts]);

  const activityColumns = [
    { key: 'user_name', label: 'Operator', render: (item) => <span className="font-mono text-xs">{item.user_name || 'System'}</span> },
    { key: 'action', label: 'Operation Action', render: (item) => <StatusBadge status={item.action} /> },
    { key: 'module', label: 'System Domain', render: (item) => <span className="uppercase font-mono text-xs text-text-muted">{item.module}</span> },
    { key: 'created_at', label: 'Telemetry Timestamp', render: (item) => <span className="font-mono text-xs text-text-muted">{new Date(item.created_at).toLocaleString()}</span> }
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-[1600px] mx-auto animate-fadeIn font-sans">
      {/* Top Banner Control Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-color pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu size={20} className="text-accent-primary" />
            <span className="text-xs font-mono font-bold text-accent-primary uppercase tracking-widest">ERP NEXUS // OPERATIONAL CONSOLE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-mono font-bold text-text-primary tracking-tight uppercase mt-1">
            Manufacturing Execution & Operations Command Center
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-text-muted bg-bg-card px-3.5 py-2 rounded-xs border border-border-color shrink-0">
          <span className="h-2.5 w-2.5 rounded-full bg-accent-success animate-pulse" />
          <span>TELEMETRY STATUS: ONLINE</span>
        </div>
      </div>

      {error && (
        <div className="rounded-xs border border-accent-danger/40 bg-accent-danger/10 p-3.5 text-xs font-mono text-accent-danger">
          [FAULT] {error}
        </div>
      )}

      {/* Primary Operational Metric Telemetry Blocks */}
      <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
              className="rounded-xs border border-border-color bg-bg-card p-4 shadow-2xs transition-colors hover:border-accent-primary/50 flex flex-col justify-between"
            >
              {loading ? (
                <div className="h-24 animate-pulse rounded-xs bg-bg-hover" />
              ) : (
                <>
                  <div className="flex items-center justify-between border-b border-border-color/40 pb-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted truncate">
                      {item.label}
                    </span>
                    <Icon size={16} className="text-text-muted shrink-0" />
                  </div>
                  
                  <div className="mt-3">
                    <div className="text-2xl font-mono font-bold text-text-primary tracking-tight">
                      {displayValue}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-border-color/30 flex items-center justify-between text-xs font-mono">
                    <span className="text-text-muted">Trend</span>
                    <div className={`flex items-center gap-0.5 font-bold ${
                      trendInfo.trendUp ? 'text-accent-success' : 'text-accent-danger'
                    }`}>
                      {trendInfo.trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      <span>{trendInfo.trend}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Process Flow Visualization Overview */}
      <div className="rounded-xs border border-border-color bg-bg-card p-5 shadow-2xs">
        <div className="mb-3.5 flex items-center justify-between border-b border-border-color/60 pb-2.5">
          <span className="text-sm font-mono font-bold uppercase tracking-wider text-text-primary">
            ERP Enterprise Operational Lifecycle Pipeline
          </span>
          <span className="text-xs font-mono text-text-muted">CLOSED LOOP TRACEABILITY</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {lifecycleSteps.map((s) => {
            const SIcon = s.icon;
            return (
              <Link
                key={s.step}
                to={s.link}
                className="group flex items-start gap-3 p-3.5 rounded-xs border border-border-color/60 bg-bg-secondary hover:border-accent-primary transition-all"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xs bg-bg-card border border-border-color text-accent-primary font-mono text-xs font-bold shrink-0">
                  {s.step}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono font-bold uppercase text-text-primary group-hover:text-accent-primary transition-colors">
                      {s.title}
                    </span>
                    <SIcon size={14} className="text-text-muted group-hover:text-accent-primary" />
                  </div>
                  <p className="text-xs font-sans text-text-muted truncate mt-0.5">{s.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* Sales Trend Chart */}
        <div className="rounded-xs border border-border-color bg-bg-card p-5 shadow-2xs">
          <div className="mb-4 flex items-center justify-between border-b border-border-color/60 pb-2.5">
            <div>
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-text-primary">Commercial Sales Trajectory</h2>
              <p className="text-xs font-sans text-text-muted">12-Month gross revenue metrics</p>
            </div>
            <span className="rounded-xs bg-bg-secondary px-2.5 py-1 text-xs font-mono text-text-muted border border-border-color">
              HISTORICAL
            </span>
          </div>

          {loading ? (
            <div className="h-72 animate-pulse rounded-xs bg-bg-hover" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={charts?.salesByMonth || []}>
                <CartesianGrid strokeDasharray="2 2" stroke="var(--border-color)" />
                <XAxis dataKey="month" stroke="var(--text-muted)" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-modal)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 2,
                    fontSize: 12,
                    fontFamily: 'monospace',
                    color: 'var(--text-primary)'
                  }}
                />
                <Bar dataKey="total" fill="var(--accent-primary)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Inventory Category Chart */}
        <div className="rounded-xs border border-border-color bg-bg-card p-5 shadow-2xs">
          <div className="mb-4 flex items-center justify-between border-b border-border-color/60 pb-2.5">
            <div>
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-text-primary">Stock Category Distribution</h2>
              <p className="text-xs font-sans text-text-muted">Live item classification inventory breakdown</p>
            </div>
            <span className="rounded-xs bg-bg-secondary px-2.5 py-1 text-xs font-mono text-text-muted border border-border-color">
              LIVE TELEMETRY
            </span>
          </div>

          {loading ? (
            <div className="h-72 animate-pulse rounded-xs bg-bg-hover" />
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1fr_220px] items-center">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="count"
                    nameKey="category"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-modal)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: 'monospace',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <Legend iconType="rect" wrapperStyle={{ fontSize: 11, fontFamily: 'monospace' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {pieData.map((entry, index) => (
                  <div key={entry.category} className="flex items-center justify-between gap-2 text-xs text-text-secondary bg-bg-secondary p-2 rounded-xs border border-border-color/50">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-xs" style={{ background: chartColors[index % chartColors.length] }} />
                      <span className="font-mono font-bold text-text-primary truncate max-w-[100px]">{entry.category}</span>
                    </div>
                    <span className="font-mono font-bold text-accent-primary bg-bg-card px-1.5 py-0.5 rounded-xs border border-border-color/60">{entry.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Operational Activity Timeline and Quick Actions Section */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-xs border border-border-color bg-bg-card p-5 shadow-2xs">
          <div className="mb-3.5 flex items-center justify-between border-b border-border-color/60 pb-2.5">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-text-primary">System Activity Audit Log</h2>
            <Link to="/activity-logs" className="text-xs font-mono font-bold text-accent-primary hover:underline">
              [FULL LOG READOUT]
            </Link>
          </div>
          <Table columns={activityColumns} data={activity} loading={loading} emptyMessage="No recent activity logged." />
        </div>

        {/* Quick Commands Console */}
        <div className="rounded-xs border border-border-color bg-bg-card p-5 shadow-2xs flex flex-col">
          <h2 className="mb-3.5 text-sm font-mono font-bold uppercase tracking-wider text-text-primary border-b border-border-color/60 pb-2.5">
            Quick Domain Navigation
          </h2>
          <div className="grid grid-cols-1 gap-2.5 flex-1">
            {quickLinks.map(([label, to]) => (
              <Link
                key={to}
                to={to}
                className="group flex items-center justify-between rounded-xs border border-border-color bg-bg-secondary px-3.5 py-2.5 text-xs font-mono font-bold text-text-secondary transition-all hover:border-accent-primary/60 hover:text-text-primary"
              >
                <span>{label}</span>
                <ArrowUpRight size={15} className="text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent-primary" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
