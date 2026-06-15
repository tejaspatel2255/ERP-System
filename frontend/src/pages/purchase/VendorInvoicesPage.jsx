import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import { useRole } from '../../context/RoleContext';
import { getVendorInvoices, createVendorInvoice, updateVendorInvoiceStatus, getPurchaseOrders, getVendors } from '../../api/purchaseApi';
import { formatINR } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

const VendorInvoicesPage = () => {
  const { hasPermission } = useRole();

  // State Management
  const [invoices, setInvoices] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [approvedPOs, setApprovedPOs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters & Pagination
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    po_id: '',
    invoice_no: '',
    invoice_date: new Date().toISOString().slice(0, 10),
    amount: ''
  });

  // Selected PO reference details to show comparison
  const [selectedPoDetails, setSelectedPoDetails] = useState(null);

  // Fetch Bills List
  const fetchInvoicesList = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        vendorId: selectedVendor,
        status: selectedStatus,
        startDate,
        endDate,
        page,
        limit: 25
      };
      const data = await getVendorInvoices(filters);
      if (data.success) {
        setInvoices(data.invoices);
      }
    } catch (err) {
      toast.error('Failed to load vendor invoices.');
    } finally {
      setLoading(false);
    }
  }, [selectedVendor, selectedStatus, startDate, endDate, page]);

  // Fetch Metadata (Vendors & Approved POs)
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [vendRes, poRes] = await Promise.all([
          getVendors({ page: 1, limit: 100 }),
          getPurchaseOrders({ status: 'Ordered', limit: 100 }) // Only Ordered/Approved POs can be billed
        ]);
        if (vendRes.success) setVendors(vendRes.vendors);
        if (poRes.success) {
          // Filter to make sure PO is Approved
          const approved = poRes.orders.filter(po => po.approval_status === 'Approved');
          setApprovedPOs(approved);
        }
      } catch (err) {
        console.error('Failed to load dropdown metadata.', err);
      }
    };
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchInvoicesList();
  }, [fetchInvoicesList]);

  // Handle PO Selection in Form -> updates comparison view
  const handlePoSelection = (e) => {
    const poId = e.target.value;
    const po = approvedPOs.find(p => p.id === poId);
    setFormData(prev => ({ ...prev, po_id: poId }));
    setSelectedPoDetails(po || null);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData({
      po_id: approvedPOs[0]?.id || '',
      invoice_no: '',
      invoice_date: new Date().toISOString().slice(0, 10),
      amount: ''
    });
    setSelectedPoDetails(approvedPOs[0] || null);
    setIsFormOpen(true);
  };

  // Submit Invoice Creation Form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.po_id) return toast.error('PO reference is required.');
    if (!formData.invoice_no.trim()) return toast.error('Vendor invoice number is required.');
    if (!formData.amount || parseFloat(formData.amount) <= 0) return toast.error('Please enter a valid amount.');

    try {
      const res = await createVendorInvoice(formData);
      if (res.success) {
        if (res.hasWarning) {
          toast((t) => (
            <span className="text-orange-700 font-semibold text-xs flex flex-col gap-1">
              ⚠️ Warning: {res.warningMessage}
              <button onClick={() => toast.dismiss(t.id)} className="text-right text-[10px] text-slate-500 font-bold underline">Dismiss</button>
            </span>
          ), { duration: 6000 });
        } else {
          toast.success('Vendor Invoice (Bill) recorded successfully.');
        }
        setIsFormOpen(false);
        fetchInvoicesList();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Recording invoice failed.');
    }
  };

  // Update Bill Status
  const handleToggleStatus = async (invoice) => {
    const nextStatus = invoice.status === 'Paid' ? 'Unpaid' : 'Paid';
    try {
      const res = await updateVendorInvoiceStatus(invoice.id, nextStatus);
      if (res.success) {
        toast.success(`Bill marked as ${nextStatus}.`);
        fetchInvoicesList();
      }
    } catch (err) {
      toast.error('Failed to toggle payment status.');
    }
  };

  // Columns Configuration
  const columns = [
    { key: 'invoice_no', label: 'Bill Invoice No' },
    { key: 'vendor_name', label: 'Supplier' },
    { key: 'po_no', label: 'PO Reference', render: (item) => item.po_no || 'N/A' },
    { key: 'invoice_date', label: 'Billing Date', render: (item) => formatDate(item.invoice_date) },
    { key: 'amount', label: 'Billed Amount', render: (item) => formatINR(item.amount) },
    {
      key: 'status',
      label: 'Status',
      render: (item) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          item.status === 'Paid' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {item.status}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-2">
          {hasPermission('purchase', 'edit') && (
            <button
              onClick={() => handleToggleStatus(item)}
              className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300 font-semibold text-xs bg-slate-50 dark:bg-slate-900/10 px-2 py-1 rounded-md"
            >
              Mark as {item.status === 'Paid' ? 'Unpaid' : 'Paid'}
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Vendor Bills (Invoices)</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Record incoming invoices from suppliers, map billing to POs, and manage payment states.</p>
        </div>

        {hasPermission('purchase', 'create') && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
          >
            Record Vendor Invoice
          </button>
        )}
      </div>

      {/* Filter toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <select
            value={selectedVendor}
            onChange={(e) => { setSelectedVendor(e.target.value); setPage(1); }}
            className="block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 px-4 text-sm text-slate-900 dark:text-white shadow-sm focus:outline-none"
          >
            <option value="">All Suppliers</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
            className="block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 px-4 text-sm text-slate-900 dark:text-white shadow-sm focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Paid">Paid</option>
          </select>
        </div>

        <div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 px-4 text-sm text-slate-900 dark:text-white shadow-sm focus:outline-none"
          />
        </div>

        <div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 px-4 text-sm text-slate-900 dark:text-white shadow-sm focus:outline-none"
          />
        </div>
      </div>

      {/* Main Table */}
      <Table columns={columns} data={invoices} loading={loading} emptyMessage="No vendor bills recorded." />

      {/* CREATE INVOICE FORM MODAL */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Record Supplier Invoice (Bill)">
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Purchase Order *</label>
            <select
              required
              className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none"
              value={formData.po_id}
              onChange={handlePoSelection}
            >
              <option value="" disabled>Select Approved PO</option>
              {approvedPOs.map(po => (
                <option key={po.id} value={po.id}>{po.po_no} ({po.vendor_name}) - {formatINR(po.total_amount)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Vendor's Invoice No *</label>
            <input
              type="text"
              required
              placeholder="e.g. INV-9876"
              className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              value={formData.invoice_no}
              onChange={(e) => setFormData(prev => ({ ...prev, invoice_no: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Billing Date *</label>
            <input
              type="date"
              required
              className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none"
              value={formData.invoice_date}
              onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Billed Amount (INR) *</label>
            <input
              type="number"
              step="0.01"
              required
              className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            />
          </div>

          {/* Amount comparison box */}
          {selectedPoDetails && (
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Linked PO Reference Value:</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatINR(selectedPoDetails.total_amount)}</span>
              </div>
              
              {formData.amount && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Billed Amount entered:</span>
                    <span className="font-bold text-blue-650">{formatINR(formData.amount)}</span>
                  </div>
                  
                  {/* Variance calculations */}
                  {(() => {
                    const poAmt = parseFloat(selectedPoDetails.total_amount) || 0;
                    const bAmt = parseFloat(formData.amount) || 0;
                    const percent = poAmt > 0 ? (bAmt / poAmt) * 100 : 0;
                    
                    if (percent > 110) {
                      return (
                        <div className="p-2.5 rounded bg-red-50 text-red-650 font-bold border border-red-200">
                          🚫 Amount exceeds PO total by { (percent - 100).toFixed(1) }%. The server will block submission (Limit: 110%).
                        </div>
                      );
                    } else if (percent > 105) {
                      return (
                        <div className="p-2.5 rounded bg-orange-50 text-orange-700 font-semibold border border-orange-200">
                          ⚠️ Amount exceeds PO total by { (percent - 100).toFixed(1) }%. A warning flag will be generated.
                        </div>
                      );
                    } else {
                      return (
                        <div className="text-green-600 font-medium">
                          ✓ Amount is within acceptable tolerance boundaries ({ percent.toFixed(1) }%).
                        </div>
                      );
                    }
                  })()}
                </>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Record Bill
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default VendorInvoicesPage;
