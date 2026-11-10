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

const COMPANY_NAME = import.meta.env?.VITE_COMPANY_NAME || 'ERP Nexus Enterprise Ltd.';
const COMPANY_ADDRESS = import.meta.env?.VITE_COMPANY_ADDRESS || '123 Industrial Area, Phase II, New Delhi - 110020, India';
const COMPANY_GSTIN = import.meta.env?.VITE_COMPANY_GSTIN || '07AAAAA1111A1Z0';

const numberToIndianWords = (num) => {
  const n = Math.round(parseFloat(num) || 0);
  if (n === 0) return 'Zero Rupees Only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertLessThanThousand = (val) => {
    let str = '';
    if (val >= 100) {
      str += a[Math.floor(val / 100)] + ' Hundred ';
      val %= 100;
    }
    if (val >= 20) {
      str += b[Math.floor(val / 10)] + ' ';
      val %= 10;
    }
    if (val > 0) {
      str += a[val] + ' ';
    }
    return str.trim();
  };

  let words = '';
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const remainder = n % 1000;

  if (crore > 0) words += convertLessThanThousand(crore) + ' Crore ';
  if (lakh > 0) words += convertLessThanThousand(lakh) + ' Lakh ';
  if (thousand > 0) words += convertLessThanThousand(thousand) + ' Thousand ';
  if (remainder > 0) words += convertLessThanThousand(remainder) + ' ';

  return (words.trim() ? words.trim() + ' Rupees Only' : 'Zero Rupees Only');
};

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
        {viewingInvoice && (() => {
          const totalAmount = parseFloat(viewingInvoice.total_amount) || 0;
          const paidAmount = parseFloat(viewingInvoice.paid_amount) || 0;
          const outstandingDue = Math.max(0, totalAmount - paidAmount);
          const isPaid = viewingInvoice.status === 'Paid' || outstandingDue === 0;

          return (
            <div className="space-y-6">
              {/* Control Bar */}
              <div className="sheet p-3 flex flex-wrap justify-between items-center gap-2 no-print">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-text-secondary">Actions:</span>
                  {!isPaid && hasPermission('sales', 'create') && (
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
                {/* Paid in Full Badge */}
                {isPaid && (
                  <div className="mb-4 text-center text-3xl font-extrabold tracking-widest text-emerald-700/30 border-2 border-emerald-600/30 rounded py-1 uppercase select-none">
                    PAID IN FULL
                  </div>
                )}

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start pb-5 border-b-2 border-slate-800 gap-4">
                  <div className="flex items-start gap-3.5">
                    <img
                      src="/logo.svg"
                      alt="ERP Nexus Logo"
                      className="h-12 w-12 object-contain rounded mt-0.5"
                    />
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-slate-900 uppercase">{COMPANY_NAME}</h2>
                      <p className="text-xs text-slate-600 mt-0.5 max-w-md leading-relaxed">{COMPANY_ADDRESS}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-600 mt-1 font-mono">
                        <span><strong className="text-slate-800 font-sans font-medium">GSTIN:</strong> {COMPANY_GSTIN}</span>
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
                        <span className="text-slate-500">Invoice Date:</span>
                        <span className="font-mono text-slate-800">{formatDate(viewingInvoice.invoice_date)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Due Date:</span>
                        <span className="font-mono font-semibold text-rose-700">{formatDate(viewingInvoice.due_date)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Payment Status:</span>
                        <span className={`font-semibold uppercase ${isPaid ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {isPaid ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : viewingInvoice.status)}
                        </span>
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
                      <p className="text-slate-600 mt-1 leading-relaxed">{viewingInvoice.customer_address || 'Address on file'}</p>
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
                        <span className="text-slate-500">Place of Supply:</span>
                        <span className="font-medium text-slate-800">
                          {viewingInvoice.customer_address ? viewingInvoice.customer_address.split(',').pop().trim() : 'As per client destination'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Payment Terms:</span>
                        <span className="font-medium text-slate-800">Due by {formatDate(viewingInvoice.due_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Currency:</span>
                        <span className="font-medium text-slate-800">Indian Rupee (INR - ₹)</span>
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
                        <th className="py-2 px-2 text-center w-16 border-r border-slate-300">HSN</th>
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
                          <td className="py-2 px-2 text-center font-mono text-slate-600 border-r border-slate-200">
                            {item.hsn_code || '8412'}
                          </td>
                          <td className="py-2 px-2 text-center font-mono font-medium text-slate-800 border-r border-slate-200">{parseFloat(item.qty)}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-800 border-r border-slate-200">{formatINR(item.unit_price)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatINR(item.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals & Notes Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 pt-1">
                  {/* Left: Amount in Words & Bank Details */}
                  <div className="space-y-3 text-xs">
                    <div className="border border-slate-200 rounded p-2.5 bg-slate-50/50">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                        Amount Chargeable (in words):
                      </span>
                      <p className="font-medium text-slate-800 italic">
                        {numberToIndianWords(totalAmount)}
                      </p>
                    </div>

                    <div className="border border-slate-200 rounded p-2.5 bg-slate-50/50 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                        Bank Settlement Dossier:
                      </span>
                      <div className="grid grid-cols-2 gap-x-2 text-[11px] font-mono text-slate-700">
                        <div><span className="text-slate-500 font-sans">Bank:</span> HDFC Bank Ltd.</div>
                        <div><span className="text-slate-500 font-sans">A/C No:</span> 50200012345678</div>
                        <div><span className="text-slate-500 font-sans">IFSC Code:</span> HDFC0001234</div>
                        <div><span className="text-slate-500 font-sans">Branch:</span> New Delhi</div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Settlement Summary Box */}
                  <div className="border border-slate-300 rounded overflow-hidden text-xs self-start">
                    <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-700 border-b border-slate-300 uppercase tracking-wider text-[10px]">
                      Invoice Settlement Summary
                    </div>
                    <div className="p-3 space-y-1.5">
                      <div className="flex justify-between text-slate-600">
                        <span>Invoice Total Amount:</span>
                        <span className="font-mono font-semibold text-slate-900">{formatINR(totalAmount)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-700">
                        <span>Less: Amount Paid to Date:</span>
                        <span className="font-mono font-semibold">-{formatINR(paidAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t-2 border-slate-800 text-sm font-bold text-slate-900 bg-slate-50 -mx-3 -mb-3 p-3">
                        <span className="uppercase tracking-tight">Outstanding Balance:</span>
                        <span className={`font-mono text-base ${outstandingDue === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {formatINR(outstandingDue)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment History Ledger - Crisp White Table for Light & Dark mode */}
                {viewingPayments.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-slate-300 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span>Payment Receipts & Settlement Ledger</span>
                        <span className="text-[10px] font-normal normal-case text-slate-500 font-mono">({viewingPayments.length} recorded)</span>
                      </h4>
                      <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Total Received: {formatINR(paidAmount)}
                      </span>
                    </div>

                    <div className="overflow-x-auto border border-slate-300 rounded">
                      <table className="w-full text-xs border-collapse bg-white">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                            <th className="py-2 px-2 text-center w-8 border-r border-slate-300">#</th>
                            <th className="py-2 px-3 text-left border-r border-slate-300">Receipt Date</th>
                            <th className="py-2 px-3 text-left border-r border-slate-300">Payment Mode</th>
                            <th className="py-2 px-3 text-left border-r border-slate-300">Reference / UTR No</th>
                            <th className="py-2 px-3 text-left border-r border-slate-300">Remarks / Notes</th>
                            <th className="py-2 px-3 text-right w-32">Amount Received (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {viewingPayments.map((p, idx) => (
                            <tr key={p.id || idx} className="hover:bg-slate-50/60 text-slate-800">
                              <td className="py-2 px-2 text-center text-slate-500 font-mono border-r border-slate-200">{idx + 1}</td>
                              <td className="py-2 px-3 font-mono border-r border-slate-200">{formatDate(p.payment_date)}</td>
                              <td className="py-2 px-3 border-r border-slate-200 font-medium">
                                <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-slate-100 border border-slate-200 text-slate-700">
                                  {p.payment_mode || 'Bank Transfer'}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-600 border-r border-slate-200">{p.reference_no || '—'}</td>
                              <td className="py-2 px-3 text-slate-600 border-r border-slate-200">{p.notes || '—'}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">{formatINR(p.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Terms and Signatures */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 mt-4 border-t border-slate-300 text-xs">
                  <div className="text-slate-600 space-y-1">
                    <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Terms & Conditions:</h4>
                    <p className="whitespace-pre-line leading-relaxed text-[11px]">
                      1. Payment is strictly due by the due date mentioned on this invoice.
                      2. Delayed payment attracts interest @ 18% per annum from due date until settlement.
                      3. All disputes are subject to local jurisdiction only.
                    </p>
                  </div>

                  <div className="text-left sm:text-right flex flex-col justify-between items-start sm:items-end min-h-[80px]">
                    <div className="text-slate-700 font-bold uppercase text-[11px]">
                      For {COMPANY_NAME}
                    </div>
                    <div className="w-48 border-t border-slate-400 pt-1 text-center mt-6">
                      <p className="font-semibold text-slate-800">Authorized Signatory</p>
                      <p className="text-[10px] text-slate-500">Finance & Accounts Division</p>
                    </div>
                  </div>
                </div>
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
          );
        })()}
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
