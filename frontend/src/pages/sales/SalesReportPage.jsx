import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getSummaryReport, getByCustomerReport, getByMonthReport } from '../../api/salesApi';
import { formatINR } from '../../utils/formatCurrency';
import Table from '../../components/Table';
import { exportToCSV } from '../../utils/exportCSV';

const SalesReportPage = () => {
  // Date range state
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10) // default Jan 1st of current year
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
        // Map month formatted database value "YYYY-MM" to readable names for chart axis
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
      render: (_, __, index) => <span className="font-bold text-slate-400"># {index + 1}</span>
    },
    { key: 'name', label: 'Customer Name' },
    {
      key: 'revenue',
      label: 'Revenue Earned (Paid & Partial)',
      render: (item) => (
        <span className="font-semibold text-slate-900 dark:text-white">
          {formatINR(item.revenue)}
        </span>
      )
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-300">
      {/* Header and Date Filter Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Sales reporting & Analytics</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Analyze performance, track collections, monitor outstanding credit, and review customer standings.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCSV(topCustomers.map((c) => ({
              Customer: c.name,
              Revenue: c.revenue
            })), `sales-report-${new Date().toISOString().slice(0, 10)}.csv`)}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Export CSV
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold uppercase tracking-wider pl-2">
            <span>Range:</span>
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="block rounded-lg border border-slate-250 bg-slate-50 dark:bg-slate-950 py-1.5 px-3 text-xs text-slate-900 dark:text-white focus:outline-none"
          />
          <span className="text-slate-405 text-xs">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="block rounded-lg border border-slate-250 bg-slate-50 dark:bg-slate-950 py-1.5 px-3 text-xs text-slate-900 dark:text-white focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* 4 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Invoiced */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Invoiced</h3>
              <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{formatINR(summary.totalInvoiced)}</p>
              <div className="text-[10px] text-slate-400">Sum of billing documents in date range</div>
            </div>

            {/* Total Collected */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Payments Collected</h3>
              <p className="text-2xl font-bold tracking-tight text-green-600 dark:text-green-450">{formatINR(summary.totalCollected)}</p>
              <div className="text-[10px] text-slate-400">Sum of collection payments posted in range</div>
            </div>

            {/* Outstanding */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Outstanding Credit</h3>
              <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{formatINR(summary.outstanding)}</p>
              <div className="text-[10px] text-slate-400">Uncollected total invoices outstanding</div>
            </div>

            {/* Overdue */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overdue Balances</h3>
              <p className="text-2xl font-bold tracking-tight text-red-600 dark:text-red-405">{formatINR(summary.overdue)}</p>
              <div className="text-[10px] text-slate-400 font-semibold text-red-400">Invoices past payment terms</div>
            </div>
          </div>

          {/* Chart & Customers leaderboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 12-Month Sales Chart */}
            <div className="lg:col-span-2 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Monthly Sales Trends</h3>
                <p className="text-xs text-slate-400">Rolling 12-month billings chart comparison</p>
              </div>

              <div className="h-80 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} stroke="#94A3B8" />
                    <YAxis tickLine={false} axisLine={false} stroke="#94A3B8" />
                    <Tooltip
                      cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                      formatter={(value) => [formatINR(value), 'Sales']}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        fontSize: '11px'
                      }}
                    />
                    <Bar dataKey="sales" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top 10 Customers Revenue Leaderboard */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Top Customers Leaderboard</h3>
                <p className="text-xs text-slate-400">Top 10 business clients ranked by paid invoices</p>
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
