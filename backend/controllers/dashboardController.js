import { query as dbQuery } from '../models/db.js';

const db = { query: dbQuery };

export const getSummary = async (req, res, next) => {
  try {
    const canSeeLeave = (req.user?.roles || []).includes('Admin')
      || (req.user?.permissions || []).some((perm) => perm.module_name === 'hr' && perm.action === 'approve');

    const queries = [
      // 1. Sales (Current month vs Previous month) — includes Paid + Partially Paid invoices
      db.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN invoice_date >= date_trunc('month', CURRENT_DATE) THEN COALESCE(paid_amount, total_amount) ELSE 0 END), 0)::numeric AS current_total,
          COALESCE(SUM(CASE WHEN invoice_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') AND invoice_date < date_trunc('month', CURRENT_DATE) THEN COALESCE(paid_amount, total_amount) ELSE 0 END), 0)::numeric AS last_total
        FROM invoices
        WHERE status IN ('Paid', 'Partially Paid')
      `).catch(() => ({ rows: [{ current_total: 0, last_total: 0 }] })),

      // 2. Purchase Orders
      db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE approval_status IN ('Pending', 'Approved') AND status NOT IN ('Completed', 'Closed', 'Cancelled'))::int AS current_open,
          COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE))::int AS created_this_month,
          COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') AND created_at < date_trunc('month', CURRENT_DATE))::int AS created_last_month
        FROM purchase_orders
      `).catch(() => ({ rows: [{ current_open: 0, created_this_month: 0, created_last_month: 0 }] })),

      // 3. Low Stock Items
      db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE reorder_level > 0 AND current_stock <= reorder_level)::int AS low_stock,
          COUNT(*)::int AS total_items
        FROM items
      `).catch(() => ({ rows: [{ low_stock: 0, total_items: 0 }] })),

      // 4. Work Orders
      db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status NOT IN ('Completed', 'Closed', 'Cancelled'))::int AS current_open,
          COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE))::int AS created_this_month,
          COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') AND created_at < date_trunc('month', CURRENT_DATE))::int AS created_last_month
        FROM work_orders
      `).catch(() => ({ rows: [{ current_open: 0, created_this_month: 0, created_last_month: 0 }] })),

      // 5. QA Approvals
      db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE approval_status = 'Pending' AND result <> 'Pending')::int AS pending_count,
          COUNT(*) FILTER (WHERE test_date >= date_trunc('month', CURRENT_DATE))::int AS tested_this_month,
          COUNT(*) FILTER (WHERE test_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') AND test_date < date_trunc('month', CURRENT_DATE))::int AS tested_last_month
        FROM qa_tests
      `).catch(() => ({ rows: [{ pending_count: 0, tested_this_month: 0, tested_last_month: 0 }] })),

      // 6. Maintenance Issues
      db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status <> 'Closed')::int AS open_count,
          COUNT(*) FILTER (WHERE reported_date >= date_trunc('month', CURRENT_DATE))::int AS reported_this_month,
          COUNT(*) FILTER (WHERE reported_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') AND reported_date < date_trunc('month', CURRENT_DATE))::int AS reported_last_month
        FROM issue_logs
      `).catch(() => ({ rows: [{ open_count: 0, reported_this_month: 0, reported_last_month: 0 }] })),

      // 7. Leave Applications
      (canSeeLeave ? db.query(`
        SELECT COUNT(*)::int AS total
        FROM leave_applications
        WHERE status = 'Pending'
      `) : Promise.resolve({ rows: [{ total: 0 }] })).catch(() => ({ rows: [{ total: 0 }] }))
    ];

    const results = await Promise.allSettled(queries);

    const getRow = (idx) => {
      if (results[idx].status === 'fulfilled' && results[idx].value?.rows?.[0]) {
        return results[idx].value.rows[0];
      }
      return {};
    };

    const calcTrend = (curr, prev) => {
      const c = Number(curr || 0);
      const p = Number(prev || 0);
      if (p === 0) {
        if (c > 0) return { trend: '+100%', trendUp: true };
        return { trend: '0%', trendUp: true };
      }
      const pct = ((c - p) / p) * 100;
      const formatted = (pct > 0 ? '+' : '') + pct.toFixed(1) + '%';
      return { trend: formatted, trendUp: pct >= 0 };
    };

    const r0 = getRow(0);
    const salesThisMonth = Number(r0.current_total || 0);
    const salesLastMonth = Number(r0.last_total || 0);
    const salesTrend = calcTrend(salesThisMonth, salesLastMonth);

    const r1 = getRow(1);
    const openPurchaseOrders = Number(r1.current_open || 0);
    const poTrend = calcTrend(r1.created_this_month, r1.created_last_month);

    const r2 = getRow(2);
    const lowStockItems = Number(r2.low_stock || 0);
    const totalItems = Number(r2.total_items || 0);
    const stockPct = totalItems > 0 ? ((lowStockItems / totalItems) * 100).toFixed(1) + '%' : '0%';
    const stockTrend = { trend: stockPct, trendUp: lowStockItems === 0 };

    const r3 = getRow(3);
    const openWorkOrders = Number(r3.current_open || 0);
    const woTrend = calcTrend(r3.created_this_month, r3.created_last_month);

    const r4 = getRow(4);
    const pendingQAApprovals = Number(r4.pending_count || 0);
    const qaTrend = calcTrend(r4.tested_this_month, r4.tested_last_month);

    const r5 = getRow(5);
    const openMaintenanceIssues = Number(r5.open_count || 0);
    const maintenanceTrend = calcTrend(r5.reported_this_month, r5.reported_last_month);

    const r6 = getRow(6);
    const pendingLeaveApplications = Number(r6.total || 0);

    const trends = {
      sales_trend: salesTrend,
      po_trend: poTrend,
      stock_trend: stockTrend,
      wo_trend: woTrend,
      qa_trend: qaTrend,
      maintenance_trend: maintenanceTrend
    };

    return res.status(200).json({
      success: true,
      salesThisMonth,
      openPurchaseOrders,
      lowStockItems,
      openWorkOrders,
      pendingQAApprovals,
      openMaintenanceIssues,
      pendingLeaveApplications,
      trends,
      summary: {
        salesThisMonth,
        openPurchaseOrders,
        lowStockItems,
        openWorkOrders,
        pendingQAApprovals,
        openMaintenanceIssues,
        pendingLeaveApplications,
        total_sales_this_month: salesThisMonth,
        open_purchase_orders: openPurchaseOrders,
        low_stock_items: lowStockItems,
        open_work_orders: openWorkOrders,
        pending_qa_approvals: pendingQAApprovals,
        open_maintenance_issues: openMaintenanceIssues,
        pending_leave_applications: pendingLeaveApplications,
        trends
      }
    });
  } catch (error) {
    console.error('Failed to get dashboard summary:', error.message);
    return res.status(200).json({
      success: true,
      salesThisMonth: 0,
      openPurchaseOrders: 0,
      lowStockItems: 0,
      openWorkOrders: 0,
      pendingQAApprovals: 0,
      openMaintenanceIssues: 0,
      pendingLeaveApplications: 0,
      summary: {
        salesThisMonth: 0,
        openPurchaseOrders: 0,
        lowStockItems: 0,
        openWorkOrders: 0,
        pendingQAApprovals: 0,
        openMaintenanceIssues: 0,
        pendingLeaveApplications: 0,
        total_sales_this_month: 0,
        open_purchase_orders: 0,
        low_stock_items: 0,
        open_work_orders: 0,
        pending_qa_approvals: 0,
        open_maintenance_issues: 0,
        pending_leave_applications: 0
      }
    });
  }
};

export const getActivity = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT al.id, al.action, al.module, al.record_id, al.created_at, u.name AS user_name
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 10
    `);

    return res.status(200).json({ success: true, activity: result.rows });
  } catch (error) {
    console.error('Failed to get activity logs:', error.message);
    return res.status(200).json({ success: true, activity: [] });
  }
};

export const getCharts = async (req, res, next) => {
  try {
    const salesTrendQuery = db.query(`
      WITH months AS (
        SELECT date_trunc('month', CURRENT_DATE) - (INTERVAL '1 month' * gs.n) AS month_start
        FROM generate_series(11, 0, -1) AS gs(n)
      )
      SELECT
        to_char(months.month_start, 'Mon YYYY') AS month,
        COALESCE(SUM(i.total_amount), 0)::numeric AS total
      FROM months
      LEFT JOIN invoices i
        ON i.status IN ('Paid', 'Partially Paid')
       AND date_trunc('month', i.invoice_date) = months.month_start
      GROUP BY months.month_start
      ORDER BY months.month_start ASC
    `).catch(() => ({ rows: [] }));

    const inventoryQuery = db.query(`
      SELECT COALESCE(ic.name, 'Uncategorized') AS category, COUNT(i.id)::int AS count
      FROM items i
      LEFT JOIN item_categories ic ON i.category_id = ic.id
      GROUP BY ic.name
      ORDER BY count DESC, category ASC
    `).catch(() => ({ rows: [] }));

    const topCustomersQuery = db.query(`
      SELECT c.id, c.name AS customer, COALESCE(SUM(i.total_amount), 0)::numeric AS revenue
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.status IN ('Paid', 'Partially Paid')
        AND i.invoice_date >= date_trunc('year', CURRENT_DATE)
      GROUP BY c.id, c.name
      ORDER BY revenue DESC
      LIMIT 5
    `).catch(() => ({ rows: [] }));

    const results = await Promise.allSettled([
      salesTrendQuery,
      inventoryQuery,
      topCustomersQuery
    ]);

    const salesTrendRes = results[0].status === 'fulfilled' ? results[0].value.rows : [];
    const inventoryRes = results[1].status === 'fulfilled' ? results[1].value.rows : [];
    const topCustomersRes = results[2].status === 'fulfilled' ? results[2].value.rows : [];

    return res.status(200).json({
      success: true,
      charts: {
        salesByMonth: salesTrendRes,
        inventoryByCategory: inventoryRes,
        topCustomers: topCustomersRes
      }
    });
  } catch (error) {
    console.error('Failed to get charts:', error.message);
    return res.status(200).json({
      success: true,
      charts: {
        salesByMonth: [],
        inventoryByCategory: [],
        topCustomers: []
      }
    });
  }
};

export default { getSummary, getActivity, getCharts };
