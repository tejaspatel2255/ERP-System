import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { getSpendByVendor, getSpendByItem, getSpendByMonth, getPendingPurchaseOrders, getPurchaseOrders, getVendorInvoices } from '../../api/purchaseApi';
import { formatINR } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import Table from '../../components/Table';
import PageHeader from '../../components/PageHeader';
import { exportToCSV } from '../../utils/exportCSV';

const CHART_COLORS = ['#FF7A2F', '#5AB0FF', '#3DDC84', '#FFC233', '#FF5A4F', '#8FB4E8', '#C58BFF', '#2DD4BF'];

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
    {
      key: 'name',
      label: 'Item Name',
      render: (item) => <span className="font-medium text-text-primary">{item.name}</span>
    },
    {
      key: 'item_code',
      label: 'Item Code',
      render: (item) => <span className="font-mono text-xs font-semibold text-text-secondary">{item.item_code}</span>
    },
    {
      key: 'qty',
      label: 'Ordered Qty',
      render: (item) => <span className="font-mono text-xs">{parseFloat(item.qty)}</span>
    },
    {
      key: 'cost',
      label: 'Total Value',
      render: (item) => <span className="font-mono text-xs font-bold text-text-primary">{formatINR(item.cost)}</span>
    }
  ];

  const overdueColumns = [
    {
      key: 'po_no',
      label: 'PO No',
      render: (item) => <span className="font-mono text-xs font-semibold text-text-primary">{item.po_no}</span>
    },
    {
      key: 'vendor_name',
      label: 'Supplier',
      render: (item) => <span className="font-medium text-text-primary">{item.vendor_name}</span>
    },
    {
      key: 'expected_date',
      label: 'Expected Date',
      render: (item) => <span className="font-mono text-xs text-accent-danger font-bold">{formatDate(item.expected_date)}</span>
    },
    {
      key: 'total_amount',
      label: 'Value',
      render: (item) => <span className="font-mono text-xs font-bold text-text-primary">{formatINR(item.total_amount)}</span>
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 animate-fadeIn font-sans">
      {/* Header */}
      <PageHeader
        title="Purchase Analytics"
        description="Track purchase ordering volume, spend by vendor, monthly trends, and overdue vendor requests."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => exportToCSV(overduePOs.map((po) => ({
                'PO No': po.po_no,
                Supplier: po.vendor_name,
                'Expected Date': po.expected_date,
                Value: po.total_amount
              })), `purchase-analytics-${new Date().toISOString().slice(0, 10)}.csv`)}
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
          {/* KPI Gauge Plates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="sheet p-5 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">Purchase Orders Raised</span>
                <span className="lamp lamp-accent" />
              </div>
              <p className="font-display text-3xl font-bold tracking-tight text-text-primary">{summary.totalPOsCount}</p>
              <span className="text-[11px] font-mono text-text-muted">POs issued in date range</span>
            </div>

            <div className="sheet p-5 space-y-2 relative overflow-hidden border-l-4 border-l-accent-success">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">Approved Purchase Spend</span>
                <span className="lamp lamp-success" />
              </div>
              <p className="font-display text-3xl font-bold tracking-tight text-accent-success">{formatINR(summary.totalSpend)}</p>
              <span className="text-[11px] font-mono text-text-muted">Gross total of Approved POs</span>
            </div>

            <div className="sheet p-5 space-y-2 relative overflow-hidden border-l-4 border-l-accent-danger">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-accent-danger font-bold">Pending Vendor Invoices</span>
                <span className="lamp lamp-danger" />
              </div>
              <p className="font-display text-3xl font-bold tracking-tight text-accent-danger">{formatINR(summary.pendingInvoicesValue)}</p>
              <span className="text-[11px] font-mono text-accent-danger">Total Unpaid bills currently due</span>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart Spend by Vendor */}
            <div className="sheet p-5 sm:p-6 space-y-4 min-w-0">
              <div className="pb-3 border-b border-border-color">
                <h3 className="font-display text-base font-bold uppercase tracking-wider text-text-primary">Spend Distribution by Vendor</h3>
                <p className="text-xs text-text-muted font-mono">Analysis showing top 5 suppliers and combined other aggregates</p>
              </div>

              <div className="h-64 w-full flex items-center justify-center font-mono text-xs">
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
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                      >
                        {spendByVendor.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="var(--bg-card)" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [formatINR(value), 'Spend']}
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
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Bar Chart Monthly Spend */}
            <div className="sheet p-5 sm:p-6 space-y-4 min-w-0">
              <div className="pb-3 border-b border-border-color">
                <h3 className="font-display text-base font-bold uppercase tracking-wider text-text-primary">Monthly Purchase Trend</h3>
                <p className="text-xs text-text-muted font-mono">Monthly spend aggregates compared over rolling 12 months</p>
              </div>

              <div className="h-64 w-full font-mono text-xs pt-2">
                {spendByMonth.length === 0 ? (
                  <p className="text-text-muted text-center py-20">No monthly trends recorded.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={spendByMonth}>
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
                        formatter={(value) => [formatINR(value), 'Spend']}
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
                      <Bar dataKey="spend" fill="#FF7A2F" radius={[0, 0, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Tables Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Top Items Table */}
            <div className="sheet p-5 sm:p-6 space-y-4 min-w-0">
              <div className="pb-3 border-b border-border-color">
                <h3 className="font-display text-base font-bold uppercase tracking-wider text-text-primary">Most Ordered Raw Materials</h3>
                <p className="text-xs text-text-muted font-mono">Top items by spend volume</p>
              </div>
              <Table columns={itemColumns} data={spendByItem} emptyMessage="No item spend recorded yet." />
            </div>

            {/* Overdue POs Table */}
            <div className="sheet p-5 sm:p-6 space-y-4 min-w-0">
              <div className="pb-3 border-b border-border-color">
                <h3 className="font-display text-base font-bold uppercase tracking-wider text-text-primary">Overdue Purchase Deliveries</h3>
                <p className="text-xs text-text-muted font-mono">Open orders exceeding expected delivery date</p>
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
