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
          getPurchaseOrders({ status: 'Ordered', limit: 100 })
        ]);
        if (vendRes.success) setVendors(vendRes.vendors);
        if (poRes.success) {
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
            <span className="text-[var(--warning-text)] font-medium text-xs flex flex-col gap-1">
              Warning: {res.warningMessage}
              <button onClick={() => toast.dismiss(t.id)} className="text-right text-xs underline">Dismiss</button>
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
      label: 'Bill invoice no',
      render: (item) => <span className="stamp">{item.invoice_no}</span>
    },
    { key: 'vendor_name', label: 'Supplier' },
    {
      key: 'po_no',
      label: 'PO reference',
      render: (item) => item.po_no ? <span className="stamp">{item.po_no}</span> : '—'
    },
    { key: 'invoice_date', label: 'Billing date', render: (item) => formatDate(item.invoice_date) },
    {
      key: 'amount',
      label: 'Billed amount',
      isNumeric: true,
      render: (item) => formatINR(item.amount)
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
              className="btn btn-ghost btn-sm"
            >
              Mark as {item.status === 'Paid' ? 'Unpaid' : 'Paid'}
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      {/* Header */}
      <PageHeader
        title="Vendor invoices"
        description="Record incoming invoices from suppliers, map billing to POs, and manage payment states."
        actions={
          hasPermission('purchase', 'create') ? (
            <button
              onClick={handleOpenCreate}
              className="btn btn-primary"
            >
              Record vendor invoice
            </button>
          ) : null
        }
      />

      {/* Filter toolbar */}
      <div className="sheet p-3 flex flex-wrap items-end gap-3">
        <div className="w-48">
          <label className="field-label">Supplier</label>
          <select
            value={selectedVendor}
            onChange={(e) => { setSelectedVendor(e.target.value); setPage(1); }}
            className="field"
          >
            <option value="">All suppliers</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>

        <div className="w-48">
          <label className="field-label">Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
            className="field"
          >
            <option value="">All statuses</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Paid">Paid</option>
          </select>
        </div>

        <div className="w-40">
          <label className="field-label">Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="field"
          />
        </div>

        <div className="w-40">
          <label className="field-label">End date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="field"
          />
        </div>
      </div>

      {/* Main Table */}
      <Table columns={columns} data={invoices} loading={loading} emptyMessage="No vendor bills recorded." />

      {/* CREATE INVOICE FORM MODAL */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Record supplier invoice (Bill)"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="field-label">Select purchase order *</label>
            <select
              required
              className="field"
              value={formData.po_id}
              onChange={handlePoSelection}
            >
              <option value="" disabled>Select approved PO</option>
              {approvedPOs.map(po => (
                <option key={po.id} value={po.id}>{po.po_no} ({po.vendor_name}) - {formatINR(po.total_amount)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Vendor invoice no *</label>
            <input
              type="text"
              required
              placeholder="e.g. INV-9876"
              className="field"
              value={formData.invoice_no}
              onChange={(e) => setFormData(prev => ({ ...prev, invoice_no: e.target.value }))}
            />
          </div>

          <div>
            <label className="field-label">Billing date *</label>
            <input
              type="date"
              required
              className="field"
              value={formData.invoice_date}
              onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
            />
          </div>

          <div>
            <label className="field-label">Billed amount (INR) *</label>
            <input
              type="number"
              step="0.01"
              required
              className="field"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            />
          </div>

          {/* Amount comparison box */}
          {selectedPoDetails && (
            <div className="sheet p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-text-secondary">Linked PO reference value:</span>
                <span className="font-semibold text-text-primary tabular-nums">{formatINR(selectedPoDetails.total_amount)}</span>
              </div>
              
              {formData.amount && (
                <>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Billed amount entered:</span>
                    <span className="font-semibold text-accent-primary tabular-nums">{formatINR(formData.amount)}</span>
                  </div>
                  
                  {/* Variance calculations */}
                  {(() => {
                    const poAmt = parseFloat(selectedPoDetails.total_amount) || 0;
                    const bAmt = parseFloat(formData.amount) || 0;
                    const percent = poAmt > 0 ? (bAmt / poAmt) * 100 : 0;
                    
                    if (percent > 110) {
                      return (
                        <div className="p-2 rounded border border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)] font-medium">
                          Amount exceeds PO total by {(percent - 100).toFixed(1)}%. The server will block submission (Limit: 110%).
                        </div>
                      );
                    } else if (percent > 105) {
                      return (
                        <div className="p-2 rounded border border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-text)] font-medium">
                          Amount exceeds PO total by {(percent - 100).toFixed(1)}%. A warning flag will be generated.
                        </div>
                      );
                    } else {
                      return (
                        <div className="text-[var(--success-text)] font-medium">
                          ✓ Amount is within acceptable tolerance boundaries ({percent.toFixed(1)}%).
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
              className="btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              Record bill
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default VendorInvoicesPage;
