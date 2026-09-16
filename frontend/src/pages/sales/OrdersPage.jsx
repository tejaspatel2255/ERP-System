import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
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
    { key: 'customer_name', label: 'Customer' },
    { key: 'order_date', label: 'Order Date', render: (item) => formatDate(item.order_date) },
    {
      key: 'status',
      label: 'Status',
      render: (item) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          item.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
          item.status === 'Processing' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
          item.status === 'Completed' ? 'bg-green-100 text-green-800 border border-green-200' :
          'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {item.status}
        </span>
      )
    },
    { key: 'total_amount', label: 'Total Amount', render: (item) => formatINR(item.total_amount) },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <button
          onClick={() => handleViewOrder(item)}
          className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300 font-semibold text-xs bg-slate-50 dark:bg-slate-900/10 px-2.5 py-1 rounded-md"
        >
          View Order
        </button>
      )
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-300">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Sales Orders</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Track purchase confirmations, dispatch processing states, and create invoices.</p>
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
            className="block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 px-4 text-sm text-slate-900 dark:text-white shadow-sm focus:outline-none"
          >
            <option value="">All Statuses</option>
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
      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* VIEW DETAILS MODAL */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title={`Sales Order Detail: ${viewingOrder?.order_no}`} size="lg">
        {viewingOrder && (
          <div className="space-y-6">
            {/* Header info bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Customer Details</h4>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{viewingOrder.customer_name}</p>
                <p className="text-xs text-slate-500">{viewingOrder.customer_address}</p>
                <p className="text-xs text-slate-500">Phone: {viewingOrder.customer_phone}</p>
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Order Timeline & Status</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Date: {formatDate(viewingOrder.order_date)}</span>
                  {viewingOrder.quotation_no && (
                    <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600">Quotation: {viewingOrder.quotation_no}</span>
                  )}
                </div>
                
                {/* Status selector */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Order Stage:</span>
                  <select
                    disabled={updatingStatus || !hasPermission('sales', 'edit')}
                    value={viewingOrder.status}
                    onChange={handleStatusChange}
                    className="block rounded border border-slate-350 bg-white dark:bg-slate-900 text-xs px-2 py-1 focus:outline-none"
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
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Ordered Items</h4>
              <Table
                columns={[
                  {
                    key: 'item_name',
                    label: 'Item',
                    render: (item) => (
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{item.item_name}</div>
                        <div className="text-[10px] text-slate-400">{item.item_code}</div>
                      </div>
                    )
                  },
                  { key: 'qty', label: 'Qty', render: (item) => parseFloat(item.qty) },
                  { key: 'unit_price', label: 'Unit Price', render: (item) => formatINR(item.unit_price) },
                  { key: 'line_total', label: 'Total Price', render: (item) => formatINR(item.line_total) }
                ]}
                data={viewingItems}
                emptyMessage="No items listed for this order."
              />
            </div>

            {/* Billing Invoice Info */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Linked Invoice</h4>
                {linkedInvoice ? (
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    linkedInvoice.status === 'Paid' ? 'bg-green-100 text-green-800 border border-green-200' :
                    linkedInvoice.status === 'Partially Paid' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                    'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                    Invoice Status: {linkedInvoice.status}
                  </span>
                ) : (
                  <span className="text-xs text-red-500 font-semibold">No Invoice Generated</span>
                )}
              </div>

              {linkedInvoice ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <p>Invoice No: <span className="font-bold text-slate-900 dark:text-white">{linkedInvoice.invoice_no}</span></p>
                  <p>Due Date: <span className="font-semibold">{formatDate(linkedInvoice.due_date)}</span></p>
                  <p>Outstanding: <span className="font-bold text-red-600">{formatINR(parseFloat(linkedInvoice.total_amount) - parseFloat(linkedInvoice.paid_amount))}</span></p>
                </div>
              ) : (
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-500">Generate the billing invoice for this order to post it to the customer balance ledger.</p>
                  {hasPermission('sales', 'create') && (
                    <button
                      onClick={handleGenerateInvoice}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Generate Invoice
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Stock Availability Breakdown */}
            {viewingAvailability?.length > 0 && (
              <div className="space-y-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inventory Stock Availability</h4>
                  {viewingAvailability.some(a => a.shortfall > 0) ? (
                    <span className="text-xs font-bold text-red-600 bg-red-100 dark:bg-red-950/40 px-2 py-0.5 rounded border border-red-200">
                      Stock Shortfall Detected
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-green-600 bg-green-100 dark:bg-green-950/40 px-2 py-0.5 rounded border border-green-200">
                      In Stock
                    </span>
                  )}
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {viewingAvailability.map((a, idx) => (
                    <div key={idx} className="flex justify-between items-center py-1 text-xs">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">{a.item_name}</span>
                        <span className="text-[10px] text-slate-400 ml-2">({a.item_code})</span>
                      </div>
                      <div className="flex gap-4 text-slate-600 dark:text-slate-400">
                        <span>Required: <strong>{a.required_qty}</strong></span>
                        <span>Available: <strong>{a.available_qty}</strong></span>
                        {a.shortfall > 0 ? (
                          <span className="text-red-600 font-bold">Shortfall: -{a.shortfall}</span>
                        ) : (
                          <span className="text-green-600 font-bold">OK</span>
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
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                    >
                      + Create Work Order for SO
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Bottom summary */}
            <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-4">
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                Grand Total: <span className="text-blue-600 dark:text-blue-400">{formatINR(viewingOrder.total_amount)}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsViewOpen(false)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
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
