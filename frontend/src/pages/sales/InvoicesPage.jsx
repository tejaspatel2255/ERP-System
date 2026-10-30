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
  const [submittingPayment, setSubmittingPayment] = useState(false);

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
    if (submittingPayment) return;
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      return toast.error('Please enter a valid amount.');
    }

    setSubmittingPayment(true);
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
    } finally {
      setSubmittingPayment(false);
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
      label: 'Invoice No',
      render: (item) => (
        <span className="font-mono text-xs font-semibold tracking-wider text-text-primary">
          {item.invoice_no}
        </span>
      )
    },
    {
      key: 'customer_name',
      label: 'Customer',
      render: (item) => (
        <span className="font-medium text-text-primary">
          {item.customer_name}
        </span>
      )
    },
    {
      key: 'invoice_date',
      label: 'Issue Date',
      render: (item) => (
        <span className="font-mono text-xs text-text-secondary">
          {formatDate(item.invoice_date)}
        </span>
      )
    },
    {
      key: 'due_date',
      label: 'Due Date',
      render: (item) => {
        const overdue = isOverdue(item);
        return (
          <span className={`font-mono text-xs ${overdue ? 'text-accent-danger font-bold' : 'text-text-secondary'}`}>
            {formatDate(item.due_date)} {overdue && '(Overdue)'}
          </span>
        );
      }
    },
    {
      key: 'total_amount',
      label: 'Total Amount',
      render: (item) => (
        <span className="font-mono text-xs font-semibold text-text-primary">
          {formatINR(item.total_amount)}
        </span>
      )
    },
    {
      key: 'paid_amount',
      label: 'Paid Amount',
      render: (item) => (
        <span className="font-mono text-xs text-accent-success font-medium">
          {formatINR(item.paid_amount)}
        </span>
      )
    },
    {
      key: 'outstanding_amount',
      label: 'Outstanding',
      render: (item) => {
        const outstanding = parseFloat(item.total_amount) - parseFloat(item.paid_amount);
        return (
          <span className={`font-mono text-xs font-bold ${outstanding > 0 ? 'text-accent-danger' : 'text-accent-success'}`}>
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
          className="btn btn-ghost px-2.5 py-1 text-xs font-mono uppercase tracking-wider"
        >
          View
        </button>
      )
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 animate-fadeIn font-sans">
      {/* Header section */}
      <PageHeader
        title="Invoicing Ledger"
        description="Issue commercial invoices, track collection status, and record payments."
        actions={
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-text-muted">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
              className="field w-auto min-w-[180px] font-mono text-xs uppercase"
            >
              <option value="">All Statuses</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>
        }
      />

      {/* Main Table */}
      <div className="sheet">
        <Table columns={columns} data={invoices} loading={loading} emptyMessage="No Invoices generated." />
      </div>

      {/* Pagination */}
      <div className="flex justify-end">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* VIEW PRINTABLE INVOICE MODAL */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Invoice Document" size="lg">
        {viewingInvoice && (
          <div className="space-y-6 font-sans">
            {/* Control Bar */}
            <div className="flex flex-wrap justify-between items-center gap-3 p-3 sheet bg-bg-secondary">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-wider text-text-muted">Actions:</span>
                {viewingInvoice.status !== 'Paid' && hasPermission('sales', 'create') && (
                  <button
                    onClick={handleOpenPayment}
                    className="btn btn-primary px-3 py-1.5 text-xs font-mono uppercase tracking-wider bg-accent-success hover:brightness-110"
                  >
                    Record Payment
                  </button>
                )}
                {viewingInvoice.status === 'Unpaid' && (
                  <button
                    onClick={() => handleChangeStatus(viewingInvoice.id, 'Voided')}
                    className="btn btn-danger px-3 py-1.5 text-xs font-mono uppercase tracking-wider"
                  >
                    Void Invoice
                  </button>
                )}
              </div>
              <button
                onClick={() => window.print()}
                className="btn btn-ghost px-3 py-1.5 text-xs font-mono uppercase tracking-wider"
              >
                Print Invoice (PDF)
              </button>
            </div>

            {/* Invoice Printable View - Literal White Paper Frame for Print Integrity */}
            <div className="p-6 sm:p-8 border border-border-color rounded-sm bg-white text-slate-900 shadow-sm space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h2 className="font-display text-xl uppercase tracking-wider font-bold text-slate-950">ERP ENTERPRISE</h2>
                  <p className="text-xs text-slate-600 font-mono">123 Industrial Area, Phase II, New Delhi, India</p>
                  <p className="text-xs text-slate-600 font-mono">GSTIN: 07AAAAA1111A1Z0</p>
                </div>
                <div className="text-right">
                  <h3 className="font-mono text-xs uppercase tracking-widest text-slate-500 font-bold">Tax Invoice</h3>
                  <p className="font-mono text-sm font-bold text-slate-900">{viewingInvoice.invoice_no}</p>
                  <p className="text-xs text-slate-600 font-mono">Issue Date: {formatDate(viewingInvoice.invoice_date)}</p>
                  <p className="text-xs text-red-600 font-mono font-bold">Due Date: {formatDate(viewingInvoice.due_date)}</p>
                </div>
              </div>

              {/* Client and Order Reference */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <h4 className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Billed To:</h4>
                  <p className="font-bold text-slate-900">{viewingInvoice.customer_name}</p>
                  <p className="text-slate-600">{viewingInvoice.customer_address}</p>
                  <p className="text-slate-600 font-mono">GSTIN: {viewingInvoice.customer_gstin || 'N/A'}</p>
                  <p className="text-slate-600 font-mono">Phone: {viewingInvoice.customer_phone || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <h4 className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Reference:</h4>
                  <p className="text-slate-650 font-mono">Sales Order No: <span className="font-bold text-slate-900">{viewingInvoice.order_no}</span></p>
                </div>
              </div>

              {/* Itemized Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-50 font-mono text-[11px] uppercase tracking-wider text-slate-600">
                    <th className="py-2.5 px-3 font-bold">Item</th>
                    <th className="py-2.5 px-3 font-bold text-center">Qty</th>
                    <th className="py-2.5 px-3 font-bold">Unit Price</th>
                    <th className="py-2.5 px-3 font-bold text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {viewingItems.map((item, index) => (
                    <tr key={index}>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 font-sans">{item.item_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{item.item_code}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center">{parseFloat(item.qty)}</td>
                      <td className="py-2.5 px-3">{formatINR(item.unit_price)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatINR(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Box */}
              <div className="flex justify-end pt-4 border-t border-slate-200 font-mono">
                <div className="text-right text-xs space-y-2 w-72">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Amount:</span>
                    <span className="font-semibold text-slate-900">{formatINR(viewingInvoice.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Paid to Date:</span>
                    <span className="font-semibold text-emerald-700">{formatINR(viewingInvoice.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-slate-950 pt-2 border-t border-slate-200">
                    <span>Outstanding Due:</span>
                    <span className="text-rose-600">{formatINR(parseFloat(viewingInvoice.total_amount) - parseFloat(viewingInvoice.paid_amount))}</span>
                  </div>
                </div>
              </div>

              {/* Transaction Payments history subtable */}
              {viewingPayments.length > 0 && (
                <div className="pt-6 border-t border-slate-200 space-y-2">
                  <h4 className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider">Payment History Ledger</h4>
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 bg-slate-50">
                        <th className="py-1.5 px-2">Payment Date</th>
                        <th className="py-1.5 px-2">Mode</th>
                        <th className="py-1.5 px-2">Reference No</th>
                        <th className="py-1.5 px-2">Notes</th>
                        <th className="py-1.5 px-2 text-right">Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewingPayments.map((p, idx) => (
                        <tr key={idx}>
                          <td className="py-1.5 px-2">{formatDate(p.payment_date)}</td>
                          <td className="py-1.5 px-2 font-sans">{p.payment_mode}</td>
                          <td className="py-1.5 px-2">{p.reference_no || 'N/A'}</td>
                          <td className="py-1.5 px-2 font-sans">{p.notes || 'N/A'}</td>
                          <td className="py-1.5 px-2 text-right font-bold text-emerald-700">{formatINR(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-border-color">
              <button
                type="button"
                onClick={() => setIsViewOpen(false)}
                className="btn btn-ghost px-4 py-2 text-xs font-mono uppercase tracking-wider"
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
          <form onSubmit={handlePaymentSubmit} className="space-y-4 font-sans">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Invoice Reference</label>
              <input
                type="text"
                disabled
                className="field opacity-75 font-mono cursor-not-allowed"
                value={`${viewingInvoice.invoice_no} (${viewingInvoice.customer_name})`}
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Collection Amount (INR) *</label>
              <input
                type="number"
                step="0.01"
                required
                className="field font-mono"
                value={paymentData.amount}
                onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Payment Mode *</label>
              <select
                required
                className="field font-sans"
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
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Reference No / Transaction ID</label>
              <input
                type="text"
                placeholder="e.g. TXN1234567890"
                className="field font-mono"
                value={paymentData.reference_no}
                onChange={(e) => setPaymentData(prev => ({ ...prev, reference_no: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Collection Notes</label>
              <textarea
                rows={2}
                placeholder="e.g. Received parts balance payment"
                className="field font-sans"
                value={paymentData.notes}
                onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
              <button
                type="button"
                onClick={() => setIsPayOpen(false)}
                className="btn btn-ghost px-4 py-2 text-xs font-mono uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingPayment}
                className="btn btn-primary px-4 py-2 text-xs font-mono uppercase tracking-wider bg-accent-success hover:brightness-110 disabled:opacity-50"
              >
                {submittingPayment ? 'Posting...' : 'Post Payment'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default InvoicesPage;
