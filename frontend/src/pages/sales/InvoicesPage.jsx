import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import { useRole } from '../../context/RoleContext';
import { getInvoices, getInvoiceById, updateInvoiceStatus, recordPayment } from '../../api/salesApi';
import { formatINR } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

const InvoicesPage = () => {
  const { hasPermission } = useRole();

  // State Management
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filters & Pagination
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Detail Modals
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [viewingItems, setViewingItems] = useState([]);
  const [viewingPayments, setViewingPayments] = useState([]);

  // Payment Form Fields
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_mode: 'UPI',
    reference_no: '',
    notes: ''
  });

  // Fetch Invoices
  const fetchInvoicesList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInvoices({ status: selectedStatus, page, limit: 25 });
      if (data.success) {
        setInvoices(data.invoices);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, page]);

  useEffect(() => {
    fetchInvoicesList();
  }, [fetchInvoicesList]);

  // View Details
  const handleViewInvoice = async (invoice) => {
    try {
      const res = await getInvoiceById(invoice.id);
      if (res.success) {
        setViewingInvoice(res.invoice);
        setViewingItems(res.items);
        setViewingPayments(res.payments);
        setIsViewOpen(true);
      }
    } catch (err) {
      toast.error('Failed to load invoice details.');
    }
  };

  // Change Status (e.g. Sent / Voided)
  const handleChangeStatus = async (id, status) => {
    try {
      await updateInvoiceStatus(id, status);
      toast.success(`Invoice status updated to ${status}.`);
      setIsViewOpen(false);
      fetchInvoicesList();
    } catch (err) {
      toast.error('Failed to update invoice status.');
    }
  };

  // Open Record Payment Modal
  const handleOpenPayment = () => {
    if (!viewingInvoice) return;
    
    const outstanding = parseFloat(viewingInvoice.total_amount) - parseFloat(viewingInvoice.paid_amount);
    
    setPaymentData({
      amount: outstanding.toFixed(2),
      payment_mode: 'UPI',
      reference_no: '',
      notes: ''
    });
    setIsPayOpen(true);
  };

  // Submit Payment Input
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      return toast.error('Please enter a valid amount.');
    }

    try {
      const payload = {
        invoice_id: viewingInvoice.id,
        amount: parseFloat(paymentData.amount),
        payment_mode: paymentData.payment_mode,
        reference_no: paymentData.reference_no,
        notes: paymentData.notes
      };

      const res = await recordPayment(payload);
      if (res.success) {
        toast.success('Payment recorded successfully.');
        setIsPayOpen(false);
        setIsViewOpen(false); // Close invoice preview
        fetchInvoicesList();  // Refresh main table
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Recording payment failed.');
    }
  };

  // Check if invoice is overdue (due_date is in past and status != Paid)
  const isOverdue = (invoice) => {
    if (invoice.status === 'Paid') return false;
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  // Columns Configuration
  const columns = [
    { key: 'invoice_no', label: 'Invoice No' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'invoice_date', label: 'Issue Date', render: (item) => formatDate(item.invoice_date) },
    {
      key: 'due_date',
      label: 'Due Date',
      render: (item) => {
        const overdue = isOverdue(item);
        return (
          <span className={overdue ? 'text-red-600 dark:text-red-400 font-bold' : ''}>
            {formatDate(item.due_date)} {overdue && '(Overdue)'}
          </span>
        );
      }
    },
    { key: 'total_amount', label: 'Total Amount', render: (item) => formatINR(item.total_amount) },
    { key: 'paid_amount', label: 'Paid Amount', render: (item) => formatINR(item.paid_amount) },
    {
      key: 'outstanding_amount',
      label: 'Outstanding',
      render: (item) => {
        const outstanding = parseFloat(item.total_amount) - parseFloat(item.paid_amount);
        return (
          <span className={`font-semibold ${outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600'}`}>
            {formatINR(outstanding)}
          </span>
        );
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) => {
        const overdue = isOverdue(item);
        const displayStatus = overdue ? 'Overdue' : item.status;
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            displayStatus === 'Paid' ? 'bg-green-100 text-green-800 border border-green-200' :
            displayStatus === 'Partially Paid' || displayStatus === 'Partial' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
            displayStatus === 'Overdue' ? 'bg-red-100 text-red-800 border border-red-200 animate-pulse' :
            'bg-slate-100 text-slate-800 border border-slate-200'
          }`}>
            {displayStatus}
          </span>
        );
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <button
          onClick={() => handleViewInvoice(item)}
          className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300 font-semibold text-xs bg-slate-50 dark:bg-slate-900/10 px-2 py-1 rounded-md"
        >
          View Invoice
        </button>
      )
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-300">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Invoicing Ledger</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Issue commercial invoices, track collection status, and record payments.</p>
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
            className="block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 px-4 text-sm text-slate-900 dark:text-white shadow-sm focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <Table columns={columns} data={invoices} loading={loading} emptyMessage="No Invoices generated." />

      {/* Pagination */}
      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* VIEW PRINTABLE INVOICE MODAL */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Invoice Document" size="lg">
        {viewingInvoice && (
          <div className="space-y-6">
            {/* Control Bar */}
            <div className="flex flex-wrap justify-between items-center gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Actions:</span>
                {viewingInvoice.status !== 'Paid' && hasPermission('sales', 'create') && (
                  <button
                    onClick={handleOpenPayment}
                    className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-500 transition-colors"
                  >
                    Record Payment
                  </button>
                )}
                {viewingInvoice.status === 'Unpaid' && (
                  <button
                    onClick={() => handleChangeStatus(viewingInvoice.id, 'Voided')}
                    className="bg-red-50 text-red-600 border border-red-200 text-xs font-semibold px-2.5 py-1 rounded hover:bg-red-100"
                  >
                    Void Invoice
                  </button>
                )}
              </div>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded hover:bg-slate-100"
              >
                Print Invoice (PDF)
              </button>
            </div>

            {/* Invoice Printable View */}
            <div className="p-6 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-150 pb-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">ERP ENTERPRISE</h2>
                  <p className="text-xs text-slate-400">123 Industrial Area, Phase II, New Delhi, India</p>
                  <p className="text-xs text-slate-400">GSTIN: 07AAAAA1111A1Z0</p>
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-bold text-slate-900 uppercase">Tax Invoice</h3>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{viewingInvoice.invoice_no}</p>
                  <p className="text-xs text-slate-400">Issue Date: {formatDate(viewingInvoice.invoice_date)}</p>
                  <p className="text-xs text-red-600 font-bold">Due Date: {formatDate(viewingInvoice.due_date)}</p>
                </div>
              </div>

              {/* Client and Order Reference */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <h4 className="font-bold text-slate-500 uppercase mb-1">Billed To:</h4>
                  <p className="font-bold text-slate-900 dark:text-white">{viewingInvoice.customer_name}</p>
                  <p className="text-slate-500">{viewingInvoice.customer_address}</p>
                  <p className="text-slate-500">GSTIN: {viewingInvoice.customer_gstin || 'N/A'}</p>
                  <p className="text-slate-500">Phone: {viewingInvoice.customer_phone || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <h4 className="font-bold text-slate-500 uppercase mb-1">Reference:</h4>
                  <p className="text-slate-650">Sales Order No: <span className="font-bold text-slate-900 dark:text-white">{viewingInvoice.order_no}</span></p>
                </div>
              </div>

              {/* Itemized Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <th className="py-2 px-2 font-bold uppercase text-slate-500">Item</th>
                    <th className="py-2 px-2 font-bold uppercase text-slate-500 text-center">Qty</th>
                    <th className="py-2 px-2 font-bold uppercase text-slate-500">Unit Price</th>
                    <th className="py-2 px-2 font-bold uppercase text-slate-500 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {viewingItems.map((item, index) => (
                    <tr key={index}>
                      <td className="py-2 px-2">
                        <div className="font-bold text-slate-900 dark:text-white">{item.item_name}</div>
                        <div className="text-[10px] text-slate-400">{item.item_code}</div>
                      </td>
                      <td className="py-2 px-2 text-center">{parseFloat(item.qty)}</td>
                      <td className="py-2 px-2">{formatINR(item.unit_price)}</td>
                      <td className="py-2 px-2 text-right font-bold text-slate-900 dark:text-white">{formatINR(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Box */}
              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="text-right text-xs space-y-2 w-64">
                  <div className="flex justify-between text-slate-500">
                    <span>Total Amount:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{formatINR(viewingInvoice.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Paid to Date:</span>
                    <span className="font-semibold text-green-600">{formatINR(viewingInvoice.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-slate-950 dark:text-white pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    <span>Outstanding Due:</span>
                    <span className="text-red-650">{formatINR(parseFloat(viewingInvoice.total_amount) - parseFloat(viewingInvoice.paid_amount))}</span>
                  </div>
                </div>
              </div>

              {/* Transaction Payments history subtable */}
              {viewingPayments.length > 0 && (
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-slate-550 uppercase tracking-wider">Payment History Ledger</h4>
                  <Table
                    columns={[
                      { key: 'payment_date', label: 'Payment Date', render: (item) => formatDate(item.payment_date) },
                      { key: 'payment_mode', label: 'Mode' },
                      { key: 'reference_no', label: 'Reference No', render: (item) => item.reference_no || 'N/A' },
                      { key: 'notes', label: 'Notes', render: (item) => item.notes || 'N/A' },
                      { key: 'amount', label: 'Amount Paid', render: (item) => formatINR(item.amount) }
                    ]}
                    data={viewingPayments}
                    emptyMessage=""
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsViewOpen(false)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Close Preview
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* RECORD PAYMENT INPUT MODAL */}
      <Modal isOpen={isPayOpen} onClose={() => setIsPayOpen(false)} title="Record Collection Payment">
        {viewingInvoice && (
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Invoice Reference</label>
              <input
                type="text"
                disabled
                className="block w-full rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900/50 py-2 px-3 text-sm text-slate-500"
                value={`${viewingInvoice.invoice_no} (${viewingInvoice.customer_name})`}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Collection Amount (INR) *</label>
              <input
                type="number"
                step="0.01"
                required
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                value={paymentData.amount}
                onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Mode *</label>
              <select
                required
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none"
                value={paymentData.payment_mode}
                onChange={(e) => setPaymentData(prev => ({ ...prev, payment_mode: e.target.value }))}
              >
                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                <option value="Bank Transfer">Bank Transfer (NEFT / IMPS / RTGS)</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Reference No / Transaction ID</label>
              <input
                type="text"
                placeholder="e.g. TXN1234567890"
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                value={paymentData.reference_no}
                onChange={(e) => setPaymentData(prev => ({ ...prev, reference_no: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Collection Notes</label>
              <textarea
                rows={2}
                placeholder="e.g. Received parts balance payment"
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                value={paymentData.notes}
                onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsPayOpen(false)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-550"
              >
                Post Payment
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default InvoicesPage;
