import { query as dbQuery } from '../models/db.js';

const db = { query: dbQuery };

export const getSummary = async (req, res, next) => {
  try {
    const canSeeLeave = (req.user?.roles || []).includes('Admin')
      || (req.user?.permissions || []).some((perm) => perm.module_name === 'hr' && perm.action === 'approve');

    const queries = [
      // 1. Sales
      db.query(`
        SELECT COALESCE(SUM(total_amount), 0)::numeric AS total
        FROM invoices
        WHERE status = 'Paid'
          AND invoice_date >= date_trunc('month', CURRENT_DATE)
      `).catch(() => ({ rows: [{ total: 0 }] })),
      // 2. POs
      db.query(`
        SELECT COUNT(*)::int AS total
        FROM purchase_orders
        WHERE approval_status IN ('Pending', 'Approved') AND status NOT IN ('Completed', 'Closed', 'Cancelled')
      `).catch(() => ({ rows: [{ total: 0 }] })),
      // 3. Stock
      db.query(`
        SELECT COUNT(*)::int AS total
        FROM items
        WHERE reorder_level > 0 AND current_stock <= reorder_level
      `).catch(() => ({ rows: [{ total: 0 }] })),
      // 4. Work Orders
      db.query(`
        SELECT COUNT(*)::int AS total
        FROM work_orders
        WHERE status NOT IN ('Completed', 'Closed', 'Cancelled')
      `).catch(() => ({ rows: [{ total: 0 }] })),
      // 5. QA
      db.query(`
        SELECT COUNT(*)::int AS total
        FROM qa_tests
        WHERE approval_status = 'Pending' AND result <> 'Pending'
      `).catch(() => ({ rows: [{ total: 0 }] })),
      // 6. Maintenance
      db.query(`
        SELECT COUNT(*)::int AS total
        FROM issue_logs
        WHERE status <> 'Closed'
      `).catch(() => ({ rows: [{ total: 0 }] })),
      // 7. Leave
      (canSeeLeave ? db.query(`
        SELECT COUNT(*)::int AS total
        FROM leave_applications
        WHERE status = 'Pending'
      `) : Promise.resolve({ rows: [{ total: 0 }] })).catch(() => ({ rows: [{ total: 0 }] }))
    ];

    const results = await Promise.allSettled(queries);

    const getValue = (result, key = 'total') => {
      if (result.status === 'fulfilled' && result.value && result.value.rows && result.value.rows[0]) {
        return Number(result.value.rows[0][key] || 0);
      }
      return 0;
    };

    const salesThisMonth = getValue(results[0]);
    const openPurchaseOrders = getValue(results[1]);
    const lowStockItems = getValue(results[2]);
    const openWorkOrders = getValue(results[3]);
    const pendingQAApprovals = getValue(results[4]);
    const openMaintenanceIssues = getValue(results[5]);
    const pendingLeaveApplications = getValue(results[6]);

    return res.status(200).json({
      success: true,
      salesThisMonth,
      openPurchaseOrders,
      lowStockItems,
      openWorkOrders,
      pendingQAApprovals,
      openMaintenanceIssues,
      pendingLeaveApplications,
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
        pending_leave_applications: pendingLeaveApplications
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
        ON i.status = 'Paid'
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
      WHERE i.status = 'Paid'
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
