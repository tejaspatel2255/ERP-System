import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { getSpendByVendor, getSpendByItem, getSpendByMonth, getPendingPurchaseOrders, getPurchaseOrders, getVendorInvoices } from '../../api/purchaseApi';
import { formatINR } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import Table from '../../components/Table';
import { exportToCSV } from '../../utils/exportCSV';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280'];

const PurchaseAnalyticsPage = () => {
  // Date filters
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  // Analytics data
  const [summary, setSummary] = useState({
    totalPOsCount: 0,
    totalSpend: 0,
    pendingInvoicesValue: 0
  });
  const [spendByVendor, setSpendByVendor] = useState([]);
  const [spendByItem, setSpendByItem] = useState([]);
  const [spendByMonth, setSpendByMonth] = useState([]);
  const [overduePOs, setOverduePOs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch reports
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const [vendorRes, itemRes, monthRes, overdueRes, posRes, billsRes] = await Promise.all([
        getSpendByVendor({ startDate, endDate }),
        getSpendByItem(),
        getSpendByMonth(),
        getPendingPurchaseOrders(),
        getPurchaseOrders({ startDate, endDate, limit: 200 }),
        getVendorInvoices({ status: 'Unpaid' })
      ]);

      // 1. Spend by Vendor (Recharts Pie Chart)
      if (vendorRes.success) {
        const sorted = [...vendorRes.report].sort((a, b) => b.value - a.value);
        if (sorted.length > 5) {
          const top5 = sorted.slice(0, 5);
          const othersSum = sorted.slice(5).reduce((acc, curr) => acc + curr.value, 0);
          setSpendByVendor([...top5, { name: 'Others', value: othersSum }]);
        } else {
          setSpendByVendor(sorted);
        }
      }

      // 2. Spend by Item
      if (itemRes.success) {
        setSpendByItem(itemRes.report);
      }

      // 3. Monthly Spends
      if (monthRes.success) {
        const mapped = monthRes.report.map(row => {
          const [year, month] = row.month.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1, 1);
          const monthLabel = date.toLocaleString('default', { month: 'short' }) + ' ' + year.slice(2);
          return { month: monthLabel, spend: row.spend };
        });
        setSpendByMonth(mapped);
      }

      // 4. Overdue POs
      if (overdueRes.success) {
        setOverduePOs(overdueRes.orders);
      }

      // 5. Calculate KPI Cards
      let totalPOsCount = 0;
      let totalSpend = 0;
      let pendingInvoicesValue = 0;

      if (posRes.success) {
        totalPOsCount = posRes.orders.length;
        totalSpend = posRes.orders
          .filter(po => po.approval_status === 'Approved')
          .reduce((acc, curr) => acc + parseFloat(curr.total_amount), 0);
      }

      if (billsRes.success) {
        pendingInvoicesValue = billsRes.invoices.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
      }

      setSummary({ totalPOsCount, totalSpend, pendingInvoicesValue });

    } catch (err) {
      toast.error('Failed to load purchase analytics.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Column definitions
  const itemColumns = [
    { key: 'name', label: 'Item Name' },
    { key: 'item_code', label: 'Item Code' },
    { key: 'qty', label: 'Ordered Qty', render: (item) => parseFloat(item.qty) },
    { key: 'cost', label: 'Total Value', render: (item) => formatINR(item.cost) }
  ];

  const overdueColumns = [
    { key: 'po_no', label: 'PO No' },
    { key: 'vendor_name', label: 'Supplier' },
    { key: 'expected_date', label: 'Expected Date', render: (item) => <span className="text-red-650 font-bold">{formatDate(item.expected_date)}</span> },
    { key: 'total_amount', label: 'Value', render: (item) => formatINR(item.total_amount) }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Purchase Analytics</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Track purchase ordering volume, spend by vendor, monthly trends, and overdue vendor requests.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportToCSV(overduePOs.map((po) => ({
              'PO No': po.po_no,
              Supplier: po.vendor_name,
              'Expected Date': po.expected_date,
              Value: po.total_amount
            })), `purchase-analytics-${new Date().toISOString().slice(0, 10)}.csv`)}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Export CSV
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="block rounded-lg border border-slate-250 bg-slate-50 dark:bg-slate-950 py-1.5 px-3 text-xs text-slate-900 dark:text-white focus:outline-none"
          />
          <span className="text-slate-400 text-xs">to</span>
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
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Purchase Orders Raised</h3>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{summary.totalPOsCount}</p>
              <span className="text-[10px] text-slate-400">POs issued in date range</span>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Approved Purchase Spend</h3>
              <p className="text-2xl font-bold text-blue-650 dark:text-blue-450">{formatINR(summary.totalSpend)}</p>
              <span className="text-[10px] text-slate-400">Gross total of Approved POs</span>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Vendor Invoices</h3>
              <p className="text-2xl font-bold text-red-650 dark:text-red-405">{formatINR(summary.pendingInvoicesValue)}</p>
              <span className="text-[10px] text-slate-400">Total Unpaid bills currently due</span>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart Spend by Vendor */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Spend distribution by Vendor</h3>
                <p className="text-xs text-slate-400">Analysis showing top 5 suppliers and combined other aggregates</p>
              </div>

              <div className="h-64 w-full flex items-center justify-center text-xs">
                {spendByVendor.length === 0 ? (
                  <p className="text-slate-400">No spend records to graph.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={spendByVendor}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                      >
                        {spendByVendor.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatINR(value)} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Bar Chart Monthly Spend */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Monthly Purchase Trend</h3>
                <p className="text-xs text-slate-400">Monthly spend aggregates compared over rolling 12 months</p>
              </div>

              <div className="h-64 w-full text-xs">
                {spendByMonth.length === 0 ? (
                  <p className="text-slate-400 text-center py-20">No monthly trends recorded.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={spendByMonth}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} stroke="#94A3B8" />
                      <YAxis tickLine={false} axisLine={false} stroke="#94A3B8" />
                      <Tooltip formatter={(value) => [formatINR(value), 'Spend']} />
                      <Bar dataKey="spend" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Tables Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Items Table */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Most ordered Raw Materials</h3>
                <p className="text-xs text-slate-400">Top items by spend volume</p>
              </div>
              <Table columns={itemColumns} data={spendByItem} emptyMessage="No item spend recorded yet." />
            </div>

            {/* Overdue POs Table */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Overdue Purchase Deliveries</h3>
                <p className="text-xs text-slate-400">Open orders exceeding expected delivery date</p>
              </div>
              <Table columns={overdueColumns} data={overduePOs} emptyMessage="No overdue purchase orders. Great job!" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseAnalyticsPage;
