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
      render: (item, rIdx) => {
        const rankNumber = Number.isFinite(item?.rank) ? item.rank : (Number.isFinite(rIdx) ? rIdx + 1 : 1);
        if (rankNumber === 1) {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              #1 Top
            </span>
          );
        }
        if (rankNumber === 2) {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-400/15 text-slate-300 border border-slate-400/30">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
              #2
            </span>
          );
        }
        if (rankNumber === 3) {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-700/15 text-amber-600 border border-amber-700/30">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-700 inline-block" />
              #3
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium text-text-secondary bg-bg-hover border border-border-color">
            #{rankNumber}
          </span>
        );
      }
    },
    { key: 'name', label: 'Customer name', render: (item) => <span className="font-medium text-text-primary">{item.name}</span> },
    {
      key: 'revenue',
      label: 'Revenue earned',
      isNumeric: true,
      render: (item) => (
        <span className="font-medium tabular-nums text-text-primary">
          {formatINR(item.revenue)}
        </span>
      )
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Sales reports"
        description="Analyze performance, track collections, monitor outstanding credit, and review customer standings."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCSV}
              type="button"
              className="btn btn-ghost"
            >
              Export CSV
            </button>

            <div className="flex items-center gap-1.5 p-1 rounded border border-border-input bg-bg-card">
              <span className="text-xs text-text-muted font-medium pl-1">Range:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="field !min-h-[28px] !py-0.5 !px-2 !text-xs !w-auto"
              />
              <span className="text-text-muted text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="field !min-h-[28px] !py-0.5 !px-2 !text-xs !w-auto"
              />
            </div>
          </div>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="sheet p-4 h-24 bg-bg-hover animate-pulse rounded" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {/* 4 KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Invoiced */}
            <div className="sheet p-4">
              <span className="text-sm text-text-secondary">Total invoiced</span>
              <div className="text-2xl font-semibold tabular-nums text-text-primary mt-2">
                {formatINR(summary.totalInvoiced)}
              </div>
              <div className="text-xs text-text-muted mt-1">Sum of billing documents in date range</div>
            </div>

            {/* Total Collected */}
            <div className="sheet p-4">
              <span className="text-sm text-text-secondary">Payments collected</span>
              <div className="text-2xl font-semibold tabular-nums text-[var(--success-text)] mt-2">
                {formatINR(summary.totalCollected)}
              </div>
              <div className="text-xs text-text-muted mt-1">Sum of collection payments posted in range</div>
            </div>

            {/* Outstanding */}
            <div className="sheet p-4">
              <span className="text-sm text-text-secondary">Outstanding credit</span>
              <div className="text-2xl font-semibold tabular-nums text-text-primary mt-2">
                {formatINR(summary.outstanding)}
              </div>
              <div className="text-xs text-text-muted mt-1">Uncollected total invoices outstanding</div>
            </div>

            {/* Overdue */}
            <div className="sheet p-4">
              <span className="text-sm text-text-secondary">Overdue balances</span>
              <div className="text-2xl font-semibold tabular-nums text-[var(--danger-text)] mt-2">
                {formatINR(summary.overdue)}
              </div>
              <div className="text-xs font-medium text-[var(--danger-text)] mt-1">Invoices past payment terms</div>
            </div>
          </div>

          {/* Chart & Customers leaderboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            {/* 12-Month Sales Chart */}
            <div className="lg:col-span-2 sheet p-5 space-y-4 min-w-0">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Monthly sales trends</h3>
                <p className="text-xs text-text-secondary">Rolling 12-month billings chart comparison</p>
              </div>

              <div className="h-80 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <Tooltip
                      cursor={{ fill: 'var(--bg-hover)' }}
                      formatter={(value) => [formatINR(value), 'Sales']}
                      contentStyle={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 6,
                        boxShadow: 'var(--shadow)',
                        color: 'var(--text-primary)',
                        fontSize: 12
                      }}
                    />
                    <Bar dataKey="sales" fill="#0A6ED1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Customers Leaderboard */}
            <div className="sheet p-5 space-y-4 min-w-0">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Top customers</h3>
                <p className="text-xs text-text-secondary">Top business clients ranked by paid invoices</p>
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
