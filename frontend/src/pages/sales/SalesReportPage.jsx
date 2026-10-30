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

  const handleExportCSV = () => {
    const exportData = [];

    // Summary Section
    exportData.push({ Section: 'SUMMARY', Label: 'Total Invoiced', Amount: summary.totalInvoiced || 0 });
    exportData.push({ Section: 'SUMMARY', Label: 'Payments Collected', Amount: summary.totalCollected || 0 });
    exportData.push({ Section: 'SUMMARY', Label: 'Outstanding Credit', Amount: summary.outstanding || 0 });
    exportData.push({ Section: 'SUMMARY', Label: 'Overdue Balances', Amount: summary.overdue || 0 });

    // Monthly Trends Section
    monthlyChartData.forEach((m) => {
      exportData.push({ Section: 'MONTHLY TREND', Label: m.month, Amount: m.sales || 0 });
    });

    // Top Customers Section
    topCustomers.forEach((c, idx) => {
      exportData.push({ Section: `TOP CUSTOMER #${idx + 1}`, Label: c.name, Amount: c.revenue || 0 });
    });

    if (exportData.length === 0) {
      toast.error('No sales data available to export.');
      return;
    }

    exportToCSV(exportData, `sales-report-${startDate}-to-${endDate}.csv`);
    toast.success('Sales report exported to CSV successfully.');
  };

  // Columns for Top customers table
  const customerColumns = [
    {
      key: 'rank',
      label: 'Rank',
      render: (_, __, index) => (
        <span className="font-mono text-xs font-bold text-accent-primary">
          #{String(index + 1).padStart(2, '0')}
        </span>
      )
    },
    {
      key: 'name',
      label: 'Customer Name',
      render: (item) => <span className="font-medium text-text-primary">{item.name}</span>
    },
    {
      key: 'revenue',
      label: 'Revenue Earned',
      render: (item) => (
        <span className="font-mono text-xs font-bold text-text-primary">
          {formatINR(item.revenue)}
        </span>
      )
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 animate-fadeIn font-sans">
      <PageHeader
        title="Sales Reporting & Analytics"
        description="Analyze performance, track collections, monitor outstanding credit, and review customer standings."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCSV}
              type="button"
              className="btn btn-ghost px-3.5 py-2 text-xs font-mono uppercase tracking-wider"
            >
              Export CSV
            </button>

            <div className="flex flex-wrap items-center gap-2 p-1.5 sheet bg-bg-secondary">
              <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted pl-1">Range:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="field py-1 px-2 text-xs font-mono w-auto"
              />
              <span className="text-text-muted text-xs font-mono">→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="field py-1 px-2 text-xs font-mono w-auto"
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
        <div className="space-y-6">
          {/* 4 Summary Stat Gauges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Invoiced */}
            <div className="sheet p-5 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">Total Invoiced</span>
                <span className="lamp lamp-accent" />
              </div>
              <p className="font-display text-3xl font-bold tracking-tight text-text-primary">
                {formatINR(summary.totalInvoiced)}
              </p>
              <div className="text-[11px] text-text-muted font-mono">Sum of billing documents in range</div>
            </div>

            {/* Total Collected */}
            <div className="sheet p-5 space-y-2 relative overflow-hidden border-l-4 border-l-accent-success">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">Payments Collected</span>
                <span className="lamp lamp-success" />
              </div>
              <p className="font-display text-3xl font-bold tracking-tight text-accent-success">
                {formatINR(summary.totalCollected)}
              </p>
              <div className="text-[11px] text-text-muted font-mono">Sum of posted collections in range</div>
            </div>

            {/* Outstanding */}
            <div className="sheet p-5 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">Outstanding Credit</span>
                <span className="lamp lamp-warning" />
              </div>
              <p className="font-display text-3xl font-bold tracking-tight text-text-primary">
                {formatINR(summary.outstanding)}
              </p>
              <div className="text-[11px] text-text-muted font-mono">Uncollected total invoices outstanding</div>
            </div>

            {/* Overdue */}
            <div className="sheet p-5 space-y-2 relative overflow-hidden border-l-4 border-l-accent-danger">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-accent-danger font-bold">Overdue Balances</span>
                <span className="lamp lamp-danger" />
              </div>
              <p className="font-display text-3xl font-bold tracking-tight text-accent-danger">
                {formatINR(summary.overdue)}
              </p>
              <div className="text-[11px] font-mono text-accent-danger">Invoices past agreed payment terms</div>
            </div>
          </div>

          {/* Chart & Customers leaderboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* 12-Month Sales Chart */}
            <div className="lg:col-span-2 sheet p-5 sm:p-6 space-y-4 min-w-0">
              <div className="flex items-center justify-between pb-3 border-b border-border-color">
                <div>
                  <h3 className="font-display text-base font-bold uppercase tracking-wider text-text-primary">Monthly Sales Trends</h3>
                  <p className="text-xs text-text-muted font-mono">Rolling 12-month billings chart comparison</p>
                </div>
                <span className="font-mono text-xs uppercase tracking-wider text-text-muted">Unit: INR</span>
              </div>

              <div className="h-80 w-full font-mono text-xs pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={{ stroke: 'var(--border-color)' }}
                      stroke="var(--text-secondary)"
                      tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={{ stroke: 'var(--border-color)' }}
                      stroke="var(--text-secondary)"
                      tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                    />
                    <Tooltip
                      cursor={{ fill: 'var(--bg-hover)' }}
                      formatter={(value) => [formatINR(value), 'Sales']}
                      contentStyle={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '0px',
                        color: 'var(--text-primary)',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '11px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}
                    />
                    <Bar dataKey="sales" fill="#FF7A2F" radius={[0, 0, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top 10 Customers Revenue Leaderboard */}
            <div className="sheet p-5 sm:p-6 space-y-4 min-w-0">
              <div className="pb-3 border-b border-border-color">
                <h3 className="font-display text-base font-bold uppercase tracking-wider text-text-primary">Top Customers</h3>
                <p className="text-xs text-text-muted font-mono">Business clients ranked by paid invoices</p>
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
