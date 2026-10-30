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
  { key: 'open_work_orders', trendKey: 'wo_trend', label: 'Shop Floor Runs', icon: Factory }
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

// Recharts palette per Part B Recipe step 13
const chartColors = ['#FF7A2F', '#5AB0FF', '#3DDC84', '#FFC233', '#FF5A4F', '#8FB4E8', '#C58BFF', '#2DD4BF'];

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
      {/* Top Banner Control Header (PageHeader-style drawing title block) */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <img
                src="/logo.svg"
                alt="ERP Nexus"
                className="w-4 h-4 object-contain shrink-0"
              />
              <span className="sheet-tag text-accent-primary font-bold">
                ERP NEXUS // OPERATIONAL CONSOLE
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-wide text-text-primary uppercase">
              Manufacturing Execution & Operations Command Center
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Title block drawing cells */}
            <div className="hidden md:flex items-center gap-1.5">
              <div className="tb-cell">
                ZONE <b>Z00</b>
              </div>
              <div className="tb-cell">
                STATUS <b>LIVE</b>
              </div>
              <div className="tb-cell">
                TIME <b>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</b>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-text-secondary bg-bg-card px-3.5 py-1.5 border border-border-strong">
              <span className="lamp" style={{ '--lamp': 'var(--accent-success)', width: '7px', height: '7px' }} />
              <span className="font-bold tracking-wider">TELEMETRY: ONLINE</span>
            </div>
          </div>
        </div>

        {/* Bottom drawing datum line */}
        <div className="relative border-b border-border-color">
          <div className="h-[2px] bg-accent-primary draw-line w-full" />
        </div>
      </div>

      {error && (
        <div className="sheet border-[var(--danger-border)] bg-[var(--danger-bg)] p-4 relative">
          <div className="hazard-strip -mx-4 -mt-4 mb-3" />
          <div className="font-mono text-xs font-bold text-[var(--danger-text)] flex items-center gap-2">
            <span className="lamp lamp-pulse" style={{ '--lamp': 'var(--accent-danger)', width: '7px', height: '7px' }} />
            <span>[FAULT WARNING] {error}</span>
          </div>
        </div>
      )}

      {/* Primary Operational Metric Telemetry Blocks (Gauge Plates with stagger) */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 stagger">
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
              className="sheet p-4 flex flex-col justify-between transition-colors hover:border-border-strong"
            >
              {loading ? (
                <div className="h-28 animate-pulse bg-bg-hover" />
              ) : (
                <>
                  <div className="flex items-start justify-between border-b border-border-color/60 pb-2">
                    <span className="sheet-tag text-text-muted truncate">
                      {item.label}
                    </span>
                    <div className="w-7 h-7 border border-border-color bg-bg-secondary flex items-center justify-center shrink-0">
                      <Icon size={14} className="text-text-muted" />
                    </div>
                  </div>
                  
                  <div className="my-3">
                    <div className="text-4xl sm:text-5xl font-display font-bold text-text-primary tracking-tight leading-none">
                      {displayValue}
                    </div>
                  </div>

                  <div>
                    <div className="dim-line mb-2" />
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-text-muted uppercase text-[10px]">Trend</span>
                      <div className={`flex items-center gap-0.5 font-bold ${
                        trendInfo.trendUp ? 'text-[var(--accent-success)]' : 'text-[var(--accent-danger)]'
                      }`}>
                        {trendInfo.trendUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                        <span>{trendInfo.trend}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Process Flow Visualization Overview (Assembly Line) */}
      <div className="sheet p-5">
        <div className="mb-4 flex items-center justify-between border-b border-border-color pb-2.5">
          <div>
            <span className="sheet-tag text-accent-primary font-bold block mb-0.5">// FLOW SCHEMATIC</span>
            <span className="text-lg font-display font-bold uppercase tracking-wider text-text-primary">
              ERP Enterprise Operational Lifecycle Pipeline
            </span>
          </div>
          <span className="tb-cell hidden sm:block">CLOSED LOOP <b>TRACEABILITY</b></span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 relative">
          {lifecycleSteps.map((s, idx, arr) => {
            const SIcon = s.icon;
            return (
              <React.Fragment key={s.step}>
                <Link
                  to={s.link}
                  className="group flex items-start gap-3 p-3.5 sheet bg-bg-secondary border-border-color hover:border-accent-primary transition-all relative"
                >
                  {/* Octagonal station icon holder */}
                  <div
                    className="w-9 h-9 bg-bg-card border border-border-strong flex items-center justify-center font-mono font-bold text-xs text-accent-primary shrink-0 group-hover:scale-105 transition-transform"
                    style={{
                      clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)'
                    }}
                  >
                    {s.step}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-display font-bold uppercase tracking-wider text-text-primary group-hover:text-accent-primary transition-colors">
                        {s.title}
                      </span>
                      <SIcon size={14} className="text-text-muted group-hover:text-accent-primary transition-colors" />
                    </div>
                    <p className="text-xs font-sans text-text-muted truncate mt-0.5">{s.desc}</p>
                  </div>
                </Link>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Sales Trend Chart */}
        <div className="sheet p-5">
          <div className="mb-4 flex items-center justify-between border-b border-border-color pb-2.5">
            <div>
              <span className="sheet-tag text-text-muted block mb-0.5">ANALYTICS // REVENUE</span>
              <h2 className="text-lg font-display font-bold uppercase tracking-wider text-text-primary">Commercial Sales Trajectory</h2>
              <p className="text-xs font-sans text-text-muted">12-Month gross revenue metrics</p>
            </div>
            <span className="tb-cell">INTERVAL <b>12M HISTORICAL</b></span>
          </div>

          {loading ? (
            <div className="h-72 animate-pulse bg-bg-hover" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={charts?.salesByMonth || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" stroke="var(--text-secondary)" tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} />
                <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-modal)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 0,
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-primary)'
                  }}
                />
                <Bar dataKey="total" fill="var(--accent-primary)" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Inventory Category Chart */}
        <div className="sheet p-5">
          <div className="mb-4 flex items-center justify-between border-b border-border-color pb-2.5">
            <div>
              <span className="sheet-tag text-text-muted block mb-0.5">TELEMETRY // STOCK</span>
              <h2 className="text-lg font-display font-bold uppercase tracking-wider text-text-primary">Stock Category Distribution</h2>
              <p className="text-xs font-sans text-text-muted">Live item classification inventory breakdown</p>
            </div>
            <span className="tb-cell">RADAR <b>LIVE TELEMETRY</b></span>
          </div>

          {loading ? (
            <div className="h-72 animate-pulse bg-bg-hover" />
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
                      border: '1px solid var(--border-strong)',
                      borderRadius: 0,
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <Legend iconType="rect" wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {pieData.map((entry, index) => (
                  <div key={entry.category} className="flex items-center justify-between gap-2 text-xs text-text-secondary bg-bg-secondary p-2 border border-border-color/60">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0" style={{ background: chartColors[index % chartColors.length] }} />
                      <span className="font-mono font-bold text-text-primary truncate max-w-[100px]">{entry.category}</span>
                    </div>
                    <span className="font-mono font-bold text-accent-primary bg-bg-card px-1.5 py-0.5 border border-border-color">{entry.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Operational Activity Timeline and Quick Actions Section */}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 sheet p-5">
          <div className="mb-3.5 flex items-center justify-between border-b border-border-color pb-2.5">
            <div>
              <span className="sheet-tag text-text-muted block mb-0.5">AUDIT REGISTER // TELEMETRY</span>
              <h2 className="text-lg font-display font-bold uppercase tracking-wider text-text-primary">System Activity Audit Log</h2>
            </div>
            <Link to="/activity-logs" className="btn btn-ghost btn-sm font-mono text-xs">
              [FULL LOG READOUT]
            </Link>
          </div>
          <Table columns={activityColumns} data={activity} loading={loading} emptyMessage="No recent activity logged." />
        </div>

        {/* Quick Commands Console (grid of .btn tiles with mono index) */}
        <div className="sheet p-5 flex flex-col">
          <div className="mb-3.5 border-b border-border-color pb-2.5">
            <span className="sheet-tag text-text-muted block mb-0.5">ROUTER // DISPATCH</span>
            <h2 className="text-lg font-display font-bold uppercase tracking-wider text-text-primary">
              Quick Domain Navigation
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-2.5 flex-1">
            {quickLinks.map(([label, to], idx) => (
              <Link
                key={to}
                to={to}
                className="btn btn-ghost justify-between font-mono text-xs tracking-normal px-3 py-2 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="sheet-tag text-accent-primary font-bold">[{String(idx + 1).padStart(2, '0')}]</span>
                  <span className="text-text-primary">{label}</span>
                </div>
                <ArrowUpRight size={14} className="text-text-muted shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
