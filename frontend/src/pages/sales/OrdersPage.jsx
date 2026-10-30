import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { useRole } from '../../context/RoleContext';
import axiosInstance from '../../api/axiosInstance';
import { getOrders, getOrderById, updateOrderStatus, createInvoiceFromOrder } from '../../api/salesApi';
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
  const [viewingAvailability, setViewingAvailability] = useState([]);
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
        setViewingAvailability(res.availability || []);
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

  // Columns for main list
  const columns = [
    { key: 'order_no', label: 'Order No' },
    {
      key: 'customer_name',
      label: 'Customer',
      render: (item) => <span className="font-mono font-bold text-text-primary">{item.customer_name}</span>
    },
    { key: 'order_date', label: 'Order Date', render: (item) => formatDate(item.order_date) },
    {
      key: 'status',
      label: 'Status',
      render: (item) => <StatusBadge status={item.status} />
    },
    {
      key: 'total_amount',
      label: 'Total Amount',
      isNumeric: true,
      render: (item) => formatINR(item.total_amount)
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <button
          onClick={() => handleViewOrder(item)}
          className="btn btn-ghost btn-sm text-[11px]"
        >
          View Order
        </button>
      )
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 animate-fadeIn font-sans">
      {/* Header section */}
      <PageHeader
        title="Sales Orders"
        description="Track purchase confirmations, dispatch processing states, and create invoices."
        actions={
          <div className="w-full sm:w-auto">
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
              className="field w-auto min-w-[180px] font-mono text-xs uppercase"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        }
      />

      {/* Main Table */}
      <Table columns={columns} data={orders} loading={loading} emptyMessage="No sales orders found." />

      {/* Pagination */}
      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* VIEW DETAILS MODAL */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title={`Sales Order Detail: ${viewingOrder?.order_no}`} size="lg">
        {viewingOrder && (
          <div className="space-y-6">
            {/* Header info bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 sheet bg-bg-card">
              <div className="space-y-1">
                <span className="sheet-tag text-text-muted block mb-1">CLIENT REQUISITION</span>
                <p className="text-base font-bold text-text-primary font-mono">{viewingOrder.customer_name}</p>
                <p className="text-xs text-text-secondary">{viewingOrder.customer_address}</p>
                <p className="text-xs font-mono text-text-secondary">Phone: {viewingOrder.customer_phone}</p>
              </div>
              <div className="space-y-2">
                <span className="sheet-tag text-text-muted block mb-1">ORDER TIMELINE & STAGE</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-text-secondary">Date: {formatDate(viewingOrder.order_date)}</span>
                  {viewingOrder.quotation_no && (
                    <span className="text-xs font-mono text-text-secondary">
                      Quotation: <span className="stamp">{viewingOrder.quotation_no}</span>
                    </span>
                  )}
                </div>
                
                {/* Status selector */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="field-label mb-0">Order Stage:</span>
                  <select
                    disabled={updatingStatus || !hasPermission('sales', 'edit')}
                    value={viewingOrder.status}
                    onChange={handleStatusChange}
                    className="field w-auto py-1 text-xs font-mono uppercase"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-border-color pb-1.5">
                <span className="font-display uppercase tracking-wider text-base text-text-primary font-bold">
                  Ordered Line Items
                </span>
                <span className="sheet-tag text-text-muted">BOM LINE SPECIFICATION</span>
              </div>
              <Table
                columns={[
                  {
                    key: 'item_name',
                    label: 'Item Description',
                    render: (item) => (
                      <div>
                        <div className="font-bold text-text-primary">{item.item_name}</div>
                        <div className="text-[10px] font-mono text-text-muted">{item.item_code}</div>
                      </div>
                    )
                  },
                  { key: 'qty', label: 'Qty', isNumeric: true, render: (item) => parseFloat(item.qty) },
                  { key: 'unit_price', label: 'Unit Price', isNumeric: true, render: (item) => formatINR(item.unit_price) },
                  { key: 'line_total', label: 'Total Price', isNumeric: true, render: (item) => formatINR(item.line_total) }
                ]}
                data={viewingItems}
                emptyMessage="No items listed for this order."
              />
            </div>

            {/* Billing Invoice Info */}
            <div className="p-4 sheet bg-bg-card space-y-3">
              <div className="flex justify-between items-center">
                <span className="sheet-tag text-text-muted block font-bold">// LINKED INVOICE</span>
                {linkedInvoice ? (
                  <StatusBadge status={linkedInvoice.status} />
                ) : (
                  <span className="sheet border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)] text-[10px] font-mono font-bold px-2 py-0.5">
                    NO INVOICE GENERATED
                  </span>
                )}
              </div>

              {linkedInvoice ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs font-mono text-text-secondary">
                  <p>Invoice No: <span className="stamp">{linkedInvoice.invoice_no}</span></p>
                  <p>Due Date: <span className="font-semibold text-text-primary">{formatDate(linkedInvoice.due_date)}</span></p>
                  <p>Outstanding: <span className="font-bold text-[var(--danger-text)]">{formatINR(parseFloat(linkedInvoice.total_amount) - parseFloat(linkedInvoice.paid_amount))}</span></p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-bg-secondary p-3 border border-border-color">
                  <p className="text-xs text-text-secondary font-sans">Generate the tax billing invoice for this order to post into the customer balance ledger.</p>
                  {hasPermission('sales', 'create') && (
                    <button
                      onClick={handleGenerateInvoice}
                      className="btn btn-primary btn-sm shrink-0"
                    >
                      Generate Invoice
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Stock Availability Breakdown */}
            {viewingAvailability?.length > 0 && (
              <div className="space-y-3 p-4 sheet bg-bg-secondary">
                <div className="flex justify-between items-center">
                  <span className="sheet-tag text-text-muted block font-bold">// INVENTORY STOCK AVAILABILITY</span>
                  {viewingAvailability.some(a => a.shortfall > 0) ? (
                    <span className="sheet border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)] text-[10px] font-mono font-bold px-2 py-0.5 flex items-center gap-1.5">
                      <span className="lamp lamp-pulse" style={{ '--lamp': 'var(--accent-danger)', width: '6px', height: '6px' }} />
                      <span>STOCK SHORTFALL DETECTED</span>
                    </span>
                  ) : (
                    <span className="sheet border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)] text-[10px] font-mono font-bold px-2 py-0.5 flex items-center gap-1.5">
                      <span className="lamp" style={{ '--lamp': 'var(--accent-success)', width: '6px', height: '6px' }} />
                      <span>ALL ITEMS IN STOCK</span>
                    </span>
                  )}
                </div>
                <div className="divide-y divide-border-color">
                  {viewingAvailability.map((a, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 text-xs font-mono">
                      <div>
                        <span className="font-semibold text-text-primary">{a.item_name}</span>
                        <span className="text-[10px] text-text-muted ml-2">({a.item_code})</span>
                      </div>
                      <div className="flex gap-4 text-text-secondary">
                        <span>Required: <strong className="text-text-primary">{a.required_qty}</strong></span>
                        <span>Available: <strong className="text-text-primary">{a.available_qty}</strong></span>
                        {a.shortfall > 0 ? (
                          <span className="text-[var(--danger-text)] font-bold">Shortfall: -{a.shortfall}</span>
                        ) : (
                          <span className="text-[var(--success-text)] font-bold">OK</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {hasPermission('production', 'create') && (
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => {
                        setIsViewOpen(false);
                        window.location.href = `/production/work-orders?so_id=${viewingOrder.id}`;
                      }}
                      className="btn btn-primary btn-sm"
                    >
                      + Create Work Order for SO
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Bottom summary */}
            <div className="flex justify-between items-center border-t border-border-color pt-4">
              <div className="text-base font-display font-bold uppercase tracking-wider text-text-primary">
                Grand Total: <span className="text-accent-primary font-mono ml-2">{formatINR(viewingOrder.total_amount)}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsViewOpen(false)}
                className="btn btn-ghost"
              >
                Close Details
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OrdersPage;
