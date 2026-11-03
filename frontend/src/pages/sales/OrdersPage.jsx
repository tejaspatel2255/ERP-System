import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { useRole } from '../../context/RoleContext';
import { getOrders, getOrderById, updateOrderStatus, createInvoiceFromOrder } from '../../api/salesApi';
import { createWorkOrderFromSalesOrder } from '../../api/productionApi';
import { formatINR } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

const OrdersPage = () => {
  const { hasPermission } = useRole();

  // State Management
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filters & Pagination
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // View Modal State
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [viewingItems, setViewingItems] = useState([]);
  const [linkedInvoice, setLinkedInvoice] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Fetch Orders List
  const fetchOrdersList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOrders({ status: selectedStatus, page, limit: 25 });
      if (data.success) {
        setOrders(data.orders);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load sales orders.');
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, page]);

  useEffect(() => {
    fetchOrdersList();
  }, [fetchOrdersList]);

  // View Order Detail
  const handleViewOrder = async (order) => {
    try {
      const res = await getOrderById(order.id);
      if (res.success) {
        setViewingOrder(res.order);
        setViewingItems(res.items);
        setLinkedInvoice(res.invoice);
        setIsViewOpen(true);
      }
    } catch (err) {
      toast.error('Failed to load order details.');
    }
  };

  // Update Status
  const handleStatusChange = async (e) => {
    const nextStatus = e.target.value;
    if (!viewingOrder) return;

    setUpdatingStatus(true);
    try {
      const data = await updateOrderStatus(viewingOrder.id, nextStatus);
      if (data.success) {
        toast.success(`Sales Order status updated to ${nextStatus}.`);
        setViewingOrder(prev => ({ ...prev, status: nextStatus }));
        fetchOrdersList();
      }
    } catch (err) {
      toast.error('Failed to update order status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Generate Invoice from Order
  const handleGenerateInvoice = async () => {
    if (!viewingOrder) return;

    try {
      const data = await createInvoiceFromOrder(viewingOrder.id);
      if (data.success) {
        toast.success(`Invoice generated successfully: ${data.invoice.invoice_no}`);
        
        // Refresh details modal
        const res = await getOrderById(viewingOrder.id);
        if (res.success) {
          setViewingOrder(res.order);
          setViewingItems(res.items);
          setLinkedInvoice(res.invoice);
        }
        fetchOrdersList();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invoice generation failed.');
    }
  };

  const handleCreateWorkOrder = async () => {
    if (!viewingOrder) return;
    try {
      const data = await createWorkOrderFromSalesOrder(viewingOrder.id);
      if (data.success) {
        toast.success(`Work Order ${data.workOrder.wo_no} created for ${parseFloat(data.workOrder.planned_qty)} units.`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Work Order creation failed.');
    }
  };

  // Columns for main list
  const columns = [
    {
      key: 'order_no',
      label: 'Order no',
      render: (item) => <span className="stamp">{item.order_no}</span>
    },
    { key: 'customer_name', label: 'Customer' },
    { key: 'order_date', label: 'Order date', render: (item) => formatDate(item.order_date) },
    {
      key: 'status',
      label: 'Status',
      render: (item) => <StatusBadge status={item.status} />
    },
    {
      key: 'total_amount',
      label: 'Total amount',
      isNumeric: true,
      render: (item) => formatINR(item.total_amount)
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <button
          onClick={() => handleViewOrder(item)}
          className="btn btn-ghost btn-sm"
        >
          View order
        </button>
      )
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      {/* Header section */}
      <PageHeader
        title="Sales orders"
        description="Track purchase confirmations, dispatch processing states, and create invoices."
      />

      {/* Filter toolbar */}
      <div className="sheet p-3 flex flex-wrap items-end gap-3">
        <div className="w-48">
          <label className="field-label">Status filter</label>
          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
            className="field"
          >
            <option value="">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <Table columns={columns} data={orders} loading={loading} emptyMessage="No sales orders found." />

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* VIEW DETAILS MODAL */}
      <Modal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        title={`Sales order: ${viewingOrder?.order_no}`}
        size="lg"
      >
        {viewingOrder && (
          <div className="space-y-6">
            {/* Header info bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="sheet p-4 space-y-1">
                <h4 className="text-xs font-semibold text-text-muted">Customer details</h4>
                <p className="text-sm font-semibold text-text-primary">{viewingOrder.customer_name}</p>
                <p className="text-xs text-text-secondary">{viewingOrder.customer_address}</p>
                <p className="text-xs text-text-secondary">Phone: {viewingOrder.customer_phone}</p>
              </div>

              <div className="sheet p-4 space-y-2">
                <h4 className="text-xs font-semibold text-text-muted">Order timeline</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary">Date: {formatDate(viewingOrder.order_date)}</span>
                  {viewingOrder.quotation_no && (
                    <span className="tb-cell">Quotation: {viewingOrder.quotation_no}</span>
                  )}
                </div>
                
                {/* Status selector & actions */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs font-medium text-text-secondary">Stage:</span>
                  <select
                    disabled={updatingStatus || !hasPermission('sales', 'edit')}
                    value={viewingOrder.status}
                    onChange={handleStatusChange}
                    className="field !min-h-[28px] !py-1 !text-xs !w-auto"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>

                  {hasPermission('production', 'create') && (
                    <button
                      onClick={handleCreateWorkOrder}
                      className="btn btn-primary btn-sm"
                    >
                      Create work order
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-text-primary">Line items</h4>
              <Table
                columns={[
                  {
                    key: 'item_name',
                    label: 'Item',
                    render: (item) => (
                      <div>
                        <div className="font-medium text-text-primary">{item.item_name}</div>
                        <div className="text-xs text-text-muted">{item.item_code}</div>
                      </div>
                    )
                  },
                  { key: 'qty', label: 'Qty', isNumeric: true, render: (item) => parseFloat(item.qty) },
                  { key: 'available_qty', label: 'Available', isNumeric: true, render: (item) => parseFloat(item.available_qty) },
                  {
                    key: 'shortfall',
                    label: 'Shortfall',
                    isNumeric: true,
                    render: (item) => (
                      <span className={parseFloat(item.shortfall) > 0 ? 'font-medium text-[var(--danger-text)]' : 'text-text-primary'}>
                        {parseFloat(item.shortfall)}
                      </span>
                    )
                  },
                  { key: 'unit_price', label: 'Unit price', isNumeric: true, render: (item) => formatINR(item.unit_price) },
                  { key: 'line_total', label: 'Total price', isNumeric: true, render: (item) => formatINR(item.line_total) }
                ]}
                data={viewingItems}
                emptyMessage="No items listed for this order."
              />
            </div>

            {/* Linked Invoice Info Card */}
            <div className="sheet p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-semibold text-text-muted">Linked invoice</h4>
                {linkedInvoice ? (
                  <StatusBadge status={linkedInvoice.status} />
                ) : (
                  <span className="text-xs text-[var(--danger-text)] font-medium">No invoice generated</span>
                )}
              </div>

              {linkedInvoice ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-text-secondary">
                  <p>Invoice no: <span className="stamp">{linkedInvoice.invoice_no}</span></p>
                  <p>Due date: <span className="font-medium text-text-primary">{formatDate(linkedInvoice.due_date)}</span></p>
                  <p>
                    Outstanding:{' '}
                    <span className="font-semibold text-[var(--danger-text)] tabular-nums">
                      {formatINR(parseFloat(linkedInvoice.total_amount) - parseFloat(linkedInvoice.paid_amount))}
                    </span>
                  </p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-bg-secondary p-3 rounded">
                  <p className="text-xs text-text-secondary">Generate the billing invoice for this order to post it to the customer balance ledger.</p>
                  {hasPermission('sales', 'create') && (
                    <button
                      onClick={handleGenerateInvoice}
                      className="btn btn-primary btn-sm shrink-0"
                    >
                      Generate invoice
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Bottom summary */}
            <div className="flex justify-between items-center border-t border-border-color pt-4">
              <div className="text-sm font-semibold text-text-primary">
                Grand total: <span className="text-accent-primary tabular-nums">{formatINR(viewingOrder.total_amount)}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsViewOpen(false)}
                className="btn"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OrdersPage;
