import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
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
          getPurchaseOrders({ limit: 100 }) // Fetch all POs; filter by approval_status below
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
            <span className="text-amber-500 font-semibold text-xs flex flex-col gap-1 font-mono">
              ⚠️ Warning: {res.warningMessage}
              <button onClick={() => toast.dismiss(t.id)} className="text-right text-[10px] text-text-muted font-bold underline">Dismiss</button>
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
    {
      key: 'invoice_no',
      label: 'Bill Invoice No',
      render: (item) => (
        <span className="font-mono text-xs font-semibold tracking-wider text-text-primary">
          {item.invoice_no}
        </span>
      )
    },
    {
      key: 'vendor_name',
      label: 'Supplier',
      render: (item) => (
        <span className="font-medium text-text-primary">
          {item.vendor_name}
        </span>
      )
    },
    {
      key: 'po_no',
      label: 'PO Reference',
      render: (item) => (
        <span className="font-mono text-xs text-text-secondary">
          {item.po_no || '—'}
        </span>
      )
    },
    {
      key: 'invoice_date',
      label: 'Billing Date',
      render: (item) => (
        <span className="font-mono text-xs text-text-secondary">
          {formatDate(item.invoice_date)}
        </span>
      )
    },
    {
      key: 'amount',
      label: 'Billed Amount',
      render: (item) => (
        <span className="font-mono text-xs font-bold text-text-primary">
          {formatINR(item.amount)}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) => <StatusBadge status={item.status} />
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-2">
          {hasPermission('purchase', 'edit') && (
            <button
              onClick={() => handleToggleStatus(item)}
              className="btn btn-ghost px-2.5 py-1 text-xs font-mono uppercase tracking-wider"
            >
              Mark as {item.status === 'Paid' ? 'Unpaid' : 'Paid'}
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 animate-fadeIn font-sans">
      {/* Header */}
      <PageHeader
        title="Vendor Bills (Invoices)"
        description="Record incoming invoices from suppliers, map billing to POs, and manage payment states."
        actions={
          hasPermission('purchase', 'create') && (
            <button
              onClick={handleOpenCreate}
              className="btn btn-primary px-4 py-2 text-xs font-mono uppercase tracking-wider"
            >
              + Record Vendor Invoice
            </button>
          )
        }
      />

      {/* Filter toolbar */}
      <div className="sheet p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-bg-secondary">
        <div>
          <select
            value={selectedVendor}
            onChange={(e) => { setSelectedVendor(e.target.value); setPage(1); }}
            className="field text-xs font-sans"
          >
            <option value="">All Suppliers</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
            className="field text-xs font-mono uppercase"
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
            className="field text-xs font-mono"
            placeholder="Start Date"
          />
        </div>

        <div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="field text-xs font-mono"
            placeholder="End Date"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="sheet">
        <Table columns={columns} data={invoices} loading={loading} emptyMessage="No vendor bills recorded." />
      </div>

      {/* CREATE INVOICE FORM MODAL */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Record Supplier Invoice (Bill)">
        <form onSubmit={handleFormSubmit} className="space-y-4 font-sans">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Select Purchase Order *</label>
            <select
              required
              className="field font-sans"
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
            <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Vendor's Invoice No *</label>
            <input
              type="text"
              required
              placeholder="e.g. INV-9876"
              className="field font-mono"
              value={formData.invoice_no}
              onChange={(e) => setFormData(prev => ({ ...prev, invoice_no: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Billing Date *</label>
            <input
              type="date"
              required
              className="field font-mono"
              value={formData.invoice_date}
              onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Billed Amount (INR) *</label>
            <input
              type="number"
              step="0.01"
              required
              className="field font-mono"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            />
          </div>

          {/* Amount comparison box */}
          {selectedPoDetails && (
            <div className="sheet bg-bg-secondary p-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-text-muted">Linked PO Reference Value:</span>
                <span className="font-bold text-text-primary">{formatINR(selectedPoDetails.total_amount)}</span>
              </div>
              
              {formData.amount && (
                <>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Billed Amount entered:</span>
                    <span className="font-bold text-accent-primary">{formatINR(formData.amount)}</span>
                  </div>
                  
                  {/* Variance calculations */}
                  {(() => {
                    const poAmt = parseFloat(selectedPoDetails.total_amount) || 0;
                    const bAmt = parseFloat(formData.amount) || 0;
                    const percent = poAmt > 0 ? (bAmt / poAmt) * 100 : 0;
                    
                    if (percent > 110) {
                      return (
                        <div className="p-2.5 sheet bg-accent-danger/10 border-accent-danger/30 text-accent-danger font-bold">
                          🚫 Amount exceeds PO total by { (percent - 100).toFixed(1) }%. The server will block submission (Limit: 110%).
                        </div>
                      );
                    } else if (percent > 105) {
                      return (
                        <div className="p-2.5 sheet bg-amber-500/10 border-amber-500/30 text-amber-500 font-semibold">
                          ⚠️ Amount exceeds PO total by { (percent - 100).toFixed(1) }%. A warning flag will be generated.
                        </div>
                      );
                    } else {
                      return (
                        <div className="text-accent-success font-semibold">
                          ✓ Amount is within acceptable tolerance boundaries ({ percent.toFixed(1) }%).
                        </div>
                      );
                    }
                  })()}
                </>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="btn btn-ghost px-4 py-2 text-xs font-mono uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary px-4 py-2 text-xs font-mono uppercase tracking-wider"
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
