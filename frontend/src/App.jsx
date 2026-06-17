import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import RolesPage from './pages/RolesPage';
import ActivityLogPage from './pages/ActivityLogPage';
import CustomersPage from './pages/sales/CustomersPage';
import QuotationsPage from './pages/sales/QuotationsPage';
import OrdersPage from './pages/sales/OrdersPage';
import InvoicesPage from './pages/sales/InvoicesPage';
import SalesReportPage from './pages/sales/SalesReportPage';
import VendorsPage from './pages/purchase/VendorsPage';
import PurchaseOrdersPage from './pages/purchase/PurchaseOrdersPage';
import VendorInvoicesPage from './pages/purchase/VendorInvoicesPage';
import PurchaseAnalyticsPage from './pages/purchase/PurchaseAnalyticsPage';
import ItemsPage from './pages/store/ItemsPage';
import GRNPage from './pages/store/GRNPage';
import StockIssuePage from './pages/store/StockIssuePage';
import StockLedgerPage from './pages/store/StockLedgerPage';
import StockAlertsPage from './pages/store/StockAlertsPage';
import BOMPage from './pages/production/BOMPage';
import WorkOrdersPage from './pages/production/WorkOrdersPage';
import ProductionSchedulePage from './pages/production/ProductionSchedulePage';
import AssetsPage from './pages/maintenance/AssetsPage';
import SchedulesPage from './pages/maintenance/SchedulesPage';
import IssuesPage from './pages/maintenance/IssuesPage';
import ChecklistsPage from './pages/qa/ChecklistsPage';
import QATestsPage from './pages/qa/QATestsPage';
import RawMaterialQCPage from './pages/qc/RawMaterialQCPage';
import InProcessQCPage from './pages/qc/InProcessQCPage';
import FinalQCPage from './pages/qc/FinalQCPage';
import NCRPage from './pages/qc/NCRPage';
import PackingSlipsPage from './pages/dispatch/PackingSlipsPage';
import DeliveryChallansPage from './pages/dispatch/DeliveryChallansPage';
import DispatchSchedulePage from './pages/dispatch/DispatchSchedulePage';
import EmployeesPage from './pages/hr/EmployeesPage';
import AttendancePage from './pages/hr/AttendancePage';
import LeavePage from './pages/hr/LeavePage';
import SelfServicePage from './pages/hr/SelfServicePage';
import TrainingPage from './pages/hr/TrainingPage';
import DesignFilesPage from './pages/design/DesignFilesPage';
import DesignTasksPage from './pages/design/DesignTasksPage';
import ReviewsPage from './pages/design/ReviewsPage';
import SettingsPage from './pages/SettingsPage';
import PrintInvoice from './pages/print/PrintInvoice';
import PrintQuotation from './pages/print/PrintQuotation';
import PrintDeliveryChallan from './pages/print/PrintDeliveryChallan';
import PrintPackingSlip from './pages/print/PrintPackingSlip';
import PrintPurchaseOrder from './pages/print/PrintPurchaseOrder';

const route = (path, element, module) => (
  <Route
    key={path}
    path={path}
    element={<ProtectedRoute module={module}>{element}</ProtectedRoute>}
  />
);

export default function App() {
  return (
    <div className="animate-fadeIn min-h-screen bg-bg-primary">
      <Routes>

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        {route('/users', <UsersPage />, 'auth')}
        {route('/roles', <RolesPage />, 'auth')}
        {route('/activity-logs', <ActivityLogPage />, 'auth')}
        {route('/sales/customers', <CustomersPage />, 'sales')}
        {route('/sales/quotations', <QuotationsPage />, 'sales')}
        {route('/sales/orders', <OrdersPage />, 'sales')}
        {route('/sales/invoices', <InvoicesPage />, 'sales')}
        {route('/sales/reports', <SalesReportPage />, 'sales')}
        {route('/purchase/vendors', <VendorsPage />, 'purchase')}
        {route('/purchase/orders', <PurchaseOrdersPage />, 'purchase')}
        {route('/purchase/invoices', <VendorInvoicesPage />, 'purchase')}
        {route('/purchase/analytics', <PurchaseAnalyticsPage />, 'purchase')}
        {route('/store/items', <ItemsPage />, 'store')}
        {route('/store/grn', <GRNPage />, 'store')}
        {route('/store/issue', <StockIssuePage />, 'store')}
        {route('/store/ledger', <StockLedgerPage />, 'store')}
        {route('/store/alerts', <StockAlertsPage />, 'store')}
        {route('/production/bom', <BOMPage />, 'production')}
        {route('/production/work-orders', <WorkOrdersPage />, 'production')}
        {route('/production/schedule', <ProductionSchedulePage />, 'production')}
        {route('/maintenance/assets', <AssetsPage />, 'maintenance')}
        {route('/maintenance/schedules', <SchedulesPage />, 'maintenance')}
        {route('/maintenance/issues', <IssuesPage />, 'maintenance')}
        {route('/qa/checklists', <ChecklistsPage />, 'qa')}
        {route('/qa/tests', <QATestsPage />, 'qa')}
        {route('/qc/raw-material', <RawMaterialQCPage />, 'qc')}
        {route('/qc/in-process', <InProcessQCPage />, 'qc')}
        {route('/qc/final', <FinalQCPage />, 'qc')}
        {route('/qc/ncr', <NCRPage />, 'qc')}
        {route('/dispatch/packing-slips', <PackingSlipsPage />, 'dispatch')}
        {route('/dispatch/challans', <DeliveryChallansPage />, 'dispatch')}
        {route('/dispatch/schedule', <DispatchSchedulePage />, 'dispatch')}
        {route('/hr/employees', <EmployeesPage />, 'hr')}
        {route('/hr/attendance', <AttendancePage />, 'hr')}
        {route('/hr/leave', <LeavePage />, 'hr')}
        {route('/hr/self-service', <SelfServicePage />, 'hr')}
        {route('/hr/training', <TrainingPage />, 'hr')}
        {route('/design/files', <DesignFilesPage />, 'design')}
        {route('/design/tasks', <DesignTasksPage />, 'design')}
        {route('/design/reviews', <ReviewsPage />, 'design')}
        {route('/settings', <SettingsPage />, 'auth')}
      </Route>
      <Route path="/print/invoice/:id" element={<PrintInvoice />} />
      <Route path="/print/quotation/:id" element={<PrintQuotation />} />
      <Route path="/print/challan/:id" element={<PrintDeliveryChallan />} />
      <Route path="/print/packing-slip/:id" element={<PrintPackingSlip />} />
      <Route path="/print/purchase-order/:id" element={<PrintPurchaseOrder />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </div>
  );
}

