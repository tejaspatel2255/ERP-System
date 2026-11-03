import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { getSpendByVendor, getSpendByItem, getSpendByMonth, getPendingPurchaseOrders, getPurchaseOrders, getVendorInvoices } from '../../api/purchaseApi';
import { formatINR } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import Table from '../../components/Table';
import PageHeader from '../../components/PageHeader';
import { exportToCSV } from '../../utils/exportCSV';

const CHART_COLORS = ['#0A6ED1', '#16A394', '#F59E0B', '#7C5CFC', '#E5484D', '#64748B', '#2D9CDB', '#8BC34A'];

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
    { key: 'name', label: 'Item name' },
    { key: 'item_code', label: 'Item code', render: (item) => <span className="stamp">{item.item_code}</span> },
    { key: 'qty', label: 'Ordered qty', isNumeric: true, render: (item) => parseFloat(item.qty) },
    { key: 'cost', label: 'Total value', isNumeric: true, render: (item) => formatINR(item.cost) }
  ];

  const overdueColumns = [
    { key: 'po_no', label: 'PO no', render: (item) => <span className="stamp">{item.po_no}</span> },
    { key: 'vendor_name', label: 'Supplier' },
    { key: 'expected_date', label: 'Expected date', render: (item) => <span className="text-[var(--danger-text)] font-medium">{formatDate(item.expected_date)}</span> },
    { key: 'total_amount', label: 'Value', isNumeric: true, render: (item) => formatINR(item.total_amount) }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      {/* Header */}
      <PageHeader
        title="Purchase analytics"
        description="Track purchase ordering volume, spend by vendor, monthly trends, and overdue vendor requests."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportToCSV(overduePOs.map((po) => ({
                'PO No': po.po_no,
                Supplier: po.vendor_name,
                'Expected Date': po.expected_date,
                Value: po.total_amount
              })), `purchase-analytics-${new Date().toISOString().slice(0, 10)}.csv`)}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="sheet p-4 h-24 bg-bg-hover animate-pulse rounded" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="sheet p-4 space-y-1">
              <span className="text-sm text-text-secondary">Purchase orders raised</span>
              <div className="text-2xl font-semibold tabular-nums text-text-primary mt-2">{summary.totalPOsCount}</div>
              <div className="text-xs text-text-muted">POs issued in date range</div>
            </div>

            <div className="sheet p-4 space-y-1">
              <span className="text-sm text-text-secondary">Approved purchase spend</span>
              <div className="text-2xl font-semibold tabular-nums text-accent-primary mt-2">{formatINR(summary.totalSpend)}</div>
              <div className="text-xs text-text-muted">Gross total of Approved POs</div>
            </div>

            <div className="sheet p-4 space-y-1">
              <span className="text-sm text-text-secondary">Pending vendor invoices</span>
              <div className="text-2xl font-semibold tabular-nums text-[var(--danger-text)] mt-2">{formatINR(summary.pendingInvoicesValue)}</div>
              <div className="text-xs text-text-muted">Total unpaid bills currently due</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Pie Chart Spend by Vendor */}
            <div className="sheet p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Spend distribution by vendor</h3>
                <p className="text-xs text-text-secondary">Analysis showing top 5 suppliers and combined other aggregates</p>
              </div>

              <div className="h-64 w-full flex items-center justify-center text-xs">
                {spendByVendor.length === 0 ? (
                  <p className="text-text-muted">No spend records to graph.</p>
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
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatINR(value)}
                        contentStyle={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 6,
                          boxShadow: 'var(--shadow)',
                          color: 'var(--text-primary)',
                          fontSize: 12
                        }}
                      />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Bar Chart Monthly Spend */}
            <div className="sheet p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Monthly purchase trend</h3>
                <p className="text-xs text-text-secondary">Monthly spend aggregates compared over rolling 12 months</p>
              </div>

              <div className="h-64 w-full text-xs">
                {spendByMonth.length === 0 ? (
                  <p className="text-text-muted text-center py-20">No monthly trends recorded.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={spendByMonth}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                      <YAxis tickLine={false} axisLine={false} stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                      <Tooltip
                        formatter={(value) => [formatINR(value), 'Spend']}
                        contentStyle={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 6,
                          boxShadow: 'var(--shadow)',
                          color: 'var(--text-primary)',
                          fontSize: 12
                        }}
                      />
                      <Bar dataKey="spend" fill="#0A6ED1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Tables Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Top Items Table */}
            <div className="sheet p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Most ordered raw materials</h3>
                <p className="text-xs text-text-secondary">Top items by spend volume</p>
              </div>
              <Table columns={itemColumns} data={spendByItem} emptyMessage="No item spend recorded yet." />
            </div>

            {/* Overdue POs Table */}
            <div className="sheet p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Overdue purchase deliveries</h3>
                <p className="text-xs text-text-secondary">Open orders exceeding expected delivery date</p>
              </div>
              <Table columns={overdueColumns} data={overduePOs} emptyMessage="No overdue purchase orders." />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseAnalyticsPage;
