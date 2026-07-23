import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getSummaryReport, getByCustomerReport, getByMonthReport } from '../../api/salesApi';
import { formatINR } from '../../utils/formatCurrency';
import Table from '../../components/Table';
import PageHeader from '../../components/PageHeader';
import { exportToCSV } from '../../utils/exportCSV';

const SalesReportPage = () => {
  // Date range state
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  // Report Data State
  const [summary, setSummary] = useState({
    totalInvoiced: 0,
    totalCollected: 0,
    outstanding: 0,
    overdue: 0
  });
  const [monthlyChartData, setMonthlyChartData] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch Reports Data
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, custRes, monthRes] = await Promise.all([
        getSummaryReport({ startDate, endDate }),
        getByCustomerReport(),
        getByMonthReport()
      ]);

      if (sumRes.success) setSummary(sumRes.summary);
      if (custRes.success) setTopCustomers(custRes.report);
      if (monthRes.success) {
        const mappedData = monthRes.report.map(row => {
          const [year, month] = row.month.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1, 1);
          const monthLabel = date.toLocaleString('default', { month: 'short' }) + ' ' + year.slice(2);
          return {
            month: monthLabel,
            sales: parseFloat(row.sales)
          };
        });
        setMonthlyChartData(mappedData);
      }
    } catch (err) {
      toast.error('Failed to load sales reporting analytics.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Columns for Top customers table
  const customerColumns = [
    {
      key: 'rank',
      label: 'Rank',
      render: (_, __, index) => <span className="font-bold text-accent-primary"># {index + 1}</span>
    },
    { key: 'name', label: 'Customer Name', render: (item) => <span className="font-semibold text-text-primary">{item.name}</span> },
    {
      key: 'revenue',
      label: 'Revenue Earned',
      render: (item) => (
        <span className="font-bold text-text-primary font-mono">
          {formatINR(item.revenue)}
        </span>
      )
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-300">
      <PageHeader
        title="Sales Reporting & Analytics"
        description="Analyze performance, track collections, monitor outstanding credit, and review customer standings."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => exportToCSV(topCustomers.map((c) => ({
                Customer: c.name,
                Revenue: c.revenue
              })), `sales-report-${new Date().toISOString().slice(0, 10)}.csv`)}
              className="inline-flex items-center justify-center rounded-xl bg-bg-card border border-border-color px-4 py-2.5 text-sm font-semibold text-text-primary shadow-brand hover:bg-bg-hover transition-colors whitespace-nowrap shrink-0"
            >
              Export CSV
            </button>

            <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl border border-border-color bg-bg-card shadow-brand shrink-0">
              <span className="text-xs text-text-muted font-bold uppercase tracking-wider pl-2">Range:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-border-color bg-bg-secondary py-1 px-2.5 text-xs text-text-primary font-mono focus:outline-none focus:border-accent-primary"
              />
              <span className="text-text-muted text-xs font-semibold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-border-color bg-bg-secondary py-1 px-2.5 text-xs text-text-primary font-mono focus:outline-none focus:border-accent-primary"
              />
            </div>
          </div>
        }
      />

      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent-primary" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* 4 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Invoiced */}
            <div className="p-5 rounded-2xl border border-border-color bg-bg-card shadow-brand space-y-2">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total Invoiced</h3>
              <p className="text-2xl font-black tracking-tight text-text-primary">{formatINR(summary.totalInvoiced)}</p>
              <div className="text-[11px] text-text-muted">Sum of billing documents in date range</div>
            </div>

            {/* Total Collected */}
            <div className="p-5 rounded-2xl border border-border-color bg-bg-card shadow-brand space-y-2 border-l-4 border-l-accent-success">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Payments Collected</h3>
              <p className="text-2xl font-black tracking-tight text-accent-success">{formatINR(summary.totalCollected)}</p>
              <div className="text-[11px] text-text-muted">Sum of collection payments posted in range</div>
            </div>

            {/* Outstanding */}
            <div className="p-5 rounded-2xl border border-border-color bg-bg-card shadow-brand space-y-2">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Outstanding Credit</h3>
              <p className="text-2xl font-black tracking-tight text-text-primary">{formatINR(summary.outstanding)}</p>
              <div className="text-[11px] text-text-muted">Uncollected total invoices outstanding</div>
            </div>

            {/* Overdue */}
            <div className="p-5 rounded-2xl border border-border-color bg-bg-card shadow-brand space-y-2 border-l-4 border-l-accent-danger">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Overdue Balances</h3>
              <p className="text-2xl font-black tracking-tight text-accent-danger">{formatINR(summary.overdue)}</p>
              <div className="text-[11px] font-semibold text-accent-danger">Invoices past payment terms</div>
            </div>
          </div>

          {/* Chart & Customers leaderboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* 12-Month Sales Chart */}
            <div className="lg:col-span-2 p-6 rounded-2xl border border-border-color bg-bg-card shadow-brand space-y-4 min-w-0">
              <div>
                <h3 className="text-base font-bold text-text-primary">Monthly Sales Trends</h3>
                <p className="text-xs text-text-muted">Rolling 12-month billings chart comparison</p>
              </div>

              <div className="h-80 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} stroke="var(--text-secondary)" />
                    <YAxis tickLine={false} axisLine={false} stroke="var(--text-secondary)" />
                    <Tooltip
                      cursor={{ fill: 'var(--bg-hover)' }}
                      formatter={(value) => [formatINR(value), 'Sales']}
                      contentStyle={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        color: 'var(--text-primary)',
                        fontSize: '11px'
                      }}
                    />
                    <Bar dataKey="sales" fill="var(--accent-primary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top 10 Customers Revenue Leaderboard */}
            <div className="p-6 rounded-2xl border border-border-color bg-bg-card shadow-brand space-y-4 min-w-0">
              <div>
                <h3 className="text-base font-bold text-text-primary">Top Customers Leaderboard</h3>
                <p className="text-xs text-text-muted">Top business clients ranked by paid invoices</p>
              </div>

              <Table
                columns={customerColumns}
                data={topCustomers}
                emptyMessage="No customer revenue recorded yet."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesReportPage;
