import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Printer, ExternalLink } from 'lucide-react';
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
        title="Tax Invoice Document"
        size="xl"
      >
        {viewingInvoice && (
          <div className="space-y-6">
            {/* Control Bar */}
            <div className="sheet p-3 flex flex-wrap justify-between items-center gap-2 no-print">
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="btn btn-primary btn-sm inline-flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print / Save PDF
                </button>
                <a
                  href={`/print/invoice/${viewingInvoice.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Full page
                </a>
              </div>
            </div>

            {/* Invoice Printable View */}
            <div className="printable-document bg-white text-slate-900 border border-slate-300 rounded-lg p-6 sm:p-8 shadow-sm print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start pb-5 border-b-2 border-slate-800 gap-4">
                <div className="flex items-start gap-3.5">
                  <img
                    src="/logo.svg"
                    alt="ERP Nexus Logo"
                    className="h-12 w-12 object-contain rounded mt-0.5"
                  />
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 uppercase">ERP NEXUS ENTERPRISE LTD.</h2>
                    <p className="text-xs text-slate-600 mt-0.5 max-w-md leading-relaxed">123 Industrial Area, Phase II, New Delhi - 110020, India</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-600 mt-1 font-mono">
                      <span><strong className="text-slate-800 font-sans font-medium">GSTIN:</strong> 07AAAAA1111A1Z0</span>
                      <span><strong className="text-slate-800 font-sans font-medium">PAN:</strong> AAAAA1111A</span>
                      <span><strong className="text-slate-800 font-sans font-medium">State:</strong> Delhi (07)</span>
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right border-2 border-slate-800 rounded bg-slate-50 px-3.5 py-2.5 text-xs min-w-[220px]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Official Document
                  </div>
                  <div className="text-base font-bold text-slate-900 tracking-tight">
                    ORIGINAL TAX INVOICE
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-300 space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Invoice No:</span>
                      <span className="font-mono font-bold text-slate-900">{viewingInvoice.invoice_no}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Issue Date:</span>
                      <span className="font-mono text-slate-800">{formatDate(viewingInvoice.invoice_date)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Due Date:</span>
                      <span className="font-mono font-semibold text-rose-700">{formatDate(viewingInvoice.due_date)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Status:</span>
                      <span className="font-semibold uppercase text-emerald-700">{viewingInvoice.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Client and Order Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5 text-xs">
                <div className="border border-slate-300 rounded p-3 bg-slate-50/60">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-200">
                    Billed To / Buyer Details
                  </div>
                  <div className="pt-2">
                    <p className="text-sm font-bold text-slate-900">{viewingInvoice.customer_name}</p>
                    <p className="text-slate-600 mt-1 leading-relaxed">{viewingInvoice.customer_address}</p>
                    <div className="mt-2 space-y-0.5 font-mono text-slate-600">
                      <p><span className="text-slate-500 font-sans">GSTIN:</span> <strong className="text-slate-800">{viewingInvoice.customer_gstin || 'N/A'}</strong></p>
                      <p><span className="text-slate-500 font-sans">Phone:</span> {viewingInvoice.customer_phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-300 rounded p-3 bg-slate-50/60">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-200">
                    Reference & Supply Details
                  </div>
                  <div className="pt-2 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sales Order Ref:</span>
                      <span className="font-mono font-bold text-slate-900">{viewingInvoice.order_no || 'Direct'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Currency:</span>
                      <span className="font-medium text-slate-800">Indian Rupee (INR - ₹)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment Terms:</span>
                      <span className="font-medium text-slate-800">Due by {formatDate(viewingInvoice.due_date)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="my-5 overflow-x-auto border border-slate-300 rounded">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                      <th className="py-2 px-2 text-center w-8 border-r border-slate-300">#</th>
                      <th className="py-2 px-3 text-left border-r border-slate-300">Item Description</th>
                      <th className="py-2 px-2 text-center w-14 border-r border-slate-300">Qty</th>
                      <th className="py-2 px-3 text-right w-24 border-r border-slate-300">Unit Price</th>
                      <th className="py-2 px-3 text-right w-28">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {viewingItems.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/50">
                        <td className="py-2 px-2 text-center text-slate-500 font-mono border-r border-slate-200">{index + 1}</td>
                        <td className="py-2 px-3 border-r border-slate-200">
                          <div className="font-bold text-slate-900">{item.item_name}</div>
                          {item.item_code && (
                            <div className="text-[11px] font-mono text-slate-500">Code: {item.item_code}</div>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-medium text-slate-800 border-r border-slate-200">{parseFloat(item.qty)}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-800 border-r border-slate-200">{formatINR(item.unit_price)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatINR(item.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Box */}
              <div className="flex justify-end pt-2">
                <div className="text-right text-xs space-y-1.5 w-72 border border-slate-300 rounded p-3 bg-slate-50/50">
                  <div className="flex justify-between text-slate-600">
                    <span>Invoice Amount:</span>
                    <span className="font-mono font-semibold text-slate-900">{formatINR(viewingInvoice.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Paid to Date:</span>
                    <span className="font-mono font-semibold">{formatINR(viewingInvoice.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-slate-900 pt-2 border-t-2 border-slate-800">
                    <span>Outstanding Due:</span>
                    <span className="font-mono text-rose-700">{formatINR(parseFloat(viewingInvoice.total_amount) - parseFloat(viewingInvoice.paid_amount))}</span>
                  </div>
                </div>
              </div>

              {/* Transaction Payments history subtable */}
              {viewingPayments.length > 0 && (
                <div className="pt-6 border-t border-slate-200 space-y-2 no-print">
                  <h4 className="text-xs font-semibold text-slate-600">Payment History Ledger</h4>
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

            <div className="flex justify-end pt-4 border-t border-border-color no-print">
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
