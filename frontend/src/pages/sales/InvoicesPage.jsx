import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
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
        setIsViewOpen(false);
        fetchInvoicesList();
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
    {
      key: 'invoice_no',
      label: 'Invoice no',
      render: (item) => <span className="stamp">{item.invoice_no}</span>
    },
    { key: 'customer_name', label: 'Customer' },
    { key: 'invoice_date', label: 'Issue date', render: (item) => formatDate(item.invoice_date) },
    {
      key: 'due_date',
      label: 'Due date',
      render: (item) => {
        const overdue = isOverdue(item);
        return (
          <span className={overdue ? 'text-[var(--danger-text)] font-medium' : ''}>
            {formatDate(item.due_date)} {overdue && '(Overdue)'}
          </span>
        );
      }
    },
    {
      key: 'total_amount',
      label: 'Total amount',
      isNumeric: true,
      render: (item) => formatINR(item.total_amount)
    },
    {
      key: 'paid_amount',
      label: 'Paid amount',
      isNumeric: true,
      render: (item) => formatINR(item.paid_amount)
    },
    {
      key: 'outstanding_amount',
      label: 'Outstanding',
      isNumeric: true,
      render: (item) => {
        const outstanding = parseFloat(item.total_amount) - parseFloat(item.paid_amount);
        return (
          <span className={`font-medium tabular-nums ${outstanding > 0 ? 'text-[var(--danger-text)]' : 'text-text-primary'}`}>
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
        return <StatusBadge status={displayStatus} />;
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <button
          onClick={() => handleViewInvoice(item)}
          className="btn btn-ghost btn-sm"
        >
          View invoice
        </button>
      )
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      {/* Header section */}
      <PageHeader
        title="Invoices"
        description="Issue commercial invoices, track collection status, and record payments."
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
            <option value="Unpaid">Unpaid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <Table columns={columns} data={invoices} loading={loading} emptyMessage="No invoices found." />

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* VIEW PRINTABLE INVOICE MODAL */}
      <Modal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        title="Invoice document"
        size="lg"
      >
        {viewingInvoice && (
          <div className="space-y-6">
            {/* Control Bar */}
            <div className="sheet p-3 flex flex-wrap justify-between items-center gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-text-secondary">Actions:</span>
                {viewingInvoice.status !== 'Paid' && hasPermission('sales', 'create') && (
                  <button
                    onClick={handleOpenPayment}
                    className="btn btn-primary btn-sm"
                  >
                    Record payment
                  </button>
                )}
                {viewingInvoice.status === 'Unpaid' && (
                  <button
                    onClick={() => handleChangeStatus(viewingInvoice.id, 'Voided')}
                    className="btn btn-danger btn-sm"
                  >
                    Void invoice
                  </button>
                )}
              </div>
              <button
                onClick={() => window.print()}
                className="btn btn-ghost btn-sm"
              >
                Print PDF
              </button>
            </div>

            {/* Invoice Printable View (Literal bg-white text-black allowed inside preview) */}
            <div className="sheet p-6 bg-white text-black space-y-6 print:border-none print:shadow-none print:p-0">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-gray-200 pb-4">
                <div>
                  <h2 className="text-xl font-semibold text-black">ERP ENTERPRISE</h2>
                  <p className="text-xs text-gray-500">123 Industrial Area, Phase II, New Delhi, India</p>
                  <p className="text-xs text-gray-500">GSTIN: 07AAAAA1111A1Z0</p>
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-semibold text-black">Tax Invoice</h3>
                  <p className="text-sm font-semibold text-black">{viewingInvoice.invoice_no}</p>
                  <p className="text-xs text-gray-500">Issue Date: {formatDate(viewingInvoice.invoice_date)}</p>
                  <p className="text-xs text-red-600 font-semibold">Due Date: {formatDate(viewingInvoice.due_date)}</p>
                </div>
              </div>

              {/* Client and Order Reference */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <h4 className="font-semibold text-gray-500 mb-1">Billed To:</h4>
                  <p className="font-semibold text-black">{viewingInvoice.customer_name}</p>
                  <p className="text-gray-500">{viewingInvoice.customer_address}</p>
                  <p className="text-gray-500">GSTIN: {viewingInvoice.customer_gstin || 'N/A'}</p>
                  <p className="text-gray-500">Phone: {viewingInvoice.customer_phone || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <h4 className="font-semibold text-gray-500 mb-1">Reference:</h4>
                  <p className="text-gray-600">Sales Order No: <span className="font-semibold text-black">{viewingInvoice.order_no}</span></p>
                </div>
              </div>

              {/* Itemized Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gray-50">
                    <th className="py-2 px-2 font-semibold text-gray-600">Item</th>
                    <th className="py-2 px-2 font-semibold text-gray-600 text-center">Qty</th>
                    <th className="py-2 px-2 font-semibold text-gray-600">Unit Price</th>
                    <th className="py-2 px-2 font-semibold text-gray-600 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {viewingItems.map((item, index) => (
                    <tr key={index}>
                      <td className="py-2 px-2">
                        <div className="font-semibold text-black">{item.item_name}</div>
                        <div className="text-xs text-gray-400">{item.item_code}</div>
                      </td>
                      <td className="py-2 px-2 text-center">{parseFloat(item.qty)}</td>
                      <td className="py-2 px-2">{formatINR(item.unit_price)}</td>
                      <td className="py-2 px-2 text-right font-semibold text-black">{formatINR(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Box */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <div className="text-right text-xs space-y-2 w-64">
                  <div className="flex justify-between text-gray-600">
                    <span>Total Amount:</span>
                    <span className="font-semibold text-black">{formatINR(viewingInvoice.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Paid to Date:</span>
                    <span className="font-semibold text-green-600">{formatINR(viewingInvoice.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-sm text-black pt-1.5 border-t border-gray-200">
                    <span>Outstanding Due:</span>
                    <span className="text-red-600">{formatINR(parseFloat(viewingInvoice.total_amount) - parseFloat(viewingInvoice.paid_amount))}</span>
                  </div>
                </div>
              </div>

              {/* Transaction Payments history subtable */}
              {viewingPayments.length > 0 && (
                <div className="pt-6 border-t border-gray-200 space-y-2">
                  <h4 className="text-xs font-semibold text-gray-600">Payment History Ledger</h4>
                  <Table
                    columns={[
                      { key: 'payment_date', label: 'Payment date', render: (item) => formatDate(item.payment_date) },
                      { key: 'payment_mode', label: 'Mode' },
                      { key: 'reference_no', label: 'Reference no', render: (item) => item.reference_no || '—' },
                      { key: 'notes', label: 'Notes', render: (item) => item.notes || '—' },
                      { key: 'amount', label: 'Amount paid', isNumeric: true, render: (item) => formatINR(item.amount) }
                    ]}
                    data={viewingPayments}
                    emptyMessage="No payments recorded."
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-border-color">
              <button
                type="button"
                onClick={() => setIsViewOpen(false)}
                className="btn"
              >
                Close preview
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* RECORD PAYMENT INPUT MODAL */}
      <Modal
        isOpen={isPayOpen}
        onClose={() => setIsPayOpen(false)}
        title="Record payment"
      >
        {viewingInvoice && (
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div>
              <label className="field-label">Invoice reference</label>
              <input
                type="text"
                disabled
                className="field"
                value={`${viewingInvoice.invoice_no} (${viewingInvoice.customer_name})`}
              />
            </div>

            <div>
              <label className="field-label">Collection amount (INR) *</label>
              <input
                type="number"
                step="0.01"
                required
                className="field"
                value={paymentData.amount}
                onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>

            <div>
              <label className="field-label">Payment mode *</label>
              <select
                required
                className="field"
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
              <label className="field-label">Reference no / transaction ID</label>
              <input
                type="text"
                placeholder="e.g. TXN1234567890"
                className="field"
                value={paymentData.reference_no}
                onChange={(e) => setPaymentData(prev => ({ ...prev, reference_no: e.target.value }))}
              />
            </div>

            <div>
              <label className="field-label">Collection notes</label>
              <textarea
                rows={2}
                placeholder="e.g. Received parts balance payment"
                className="field"
                value={paymentData.notes}
                onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
              <button
                type="button"
                onClick={() => setIsPayOpen(false)}
                className="btn"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                Post payment
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default InvoicesPage;
