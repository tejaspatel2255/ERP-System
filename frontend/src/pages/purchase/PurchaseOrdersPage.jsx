import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Printer, ExternalLink } from 'lucide-react';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { useRole } from '../../context/RoleContext';
import axiosInstance from '../../api/axiosInstance';
import { 
  getPurchaseOrders, 
  createPurchaseOrder, 
  updatePurchaseOrder, 
  getPurchaseOrderById,
  submitPurchaseOrder, 
  approvePurchaseOrder, 
  rejectPurchaseOrder, 
  updatePurchaseOrderStatus, 
  getVendors 
} from '../../api/purchaseApi';
import { getItems as getStoreItems } from '../../api/storeApi';
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

const PurchaseOrdersPage = () => {
  const { hasPermission } = useRole();

  // State Management
  const [pos, setPos] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters & Pagination
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  const [editingPO, setEditingPO] = useState(null);
  const [viewingPO, setViewingPO] = useState(null);
  const [viewingItems, setViewingItems] = useState([]);
  const [grnStatus, setGrnStatus] = useState('Pending');
  
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  // Form Header State
  const [formHeader, setFormHeader] = useState({
    vendor_id: '',
    expected_date: '',
    notes: ''
  });
  // Form Line Items
  const [formItems, setFormItems] = useState([
    { item_id: '', qty: 1, unit_price: 0.00 }
  ]);

  // Fetch POs List
  const fetchPOsList = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        status: selectedStatus,
        vendorId: selectedVendor,
        startDate,
        endDate,
        page,
        limit: 25
      };
      const data = await getPurchaseOrders(filters);
      if (data.success) {
        setPos(data.orders);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load purchase orders.');
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, selectedVendor, startDate, endDate, page]);

  // Fetch Metadata (Vendors & Items)
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [vendRes, itemsRes] = await Promise.all([
          getVendors({ page: 1, limit: 100 }),
          getStoreItems()
        ]);
        if (vendRes.success) setVendors(vendRes.vendors);
        if (itemsRes.success) setItemsList(itemsRes.items);
      } catch (err) {
        console.error('Failed to load metadata.', err);
      }
    };
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchPOsList();
  }, [fetchPOsList]);

  // Open Create PO Form
  const handleOpenCreate = () => {
    setEditingPO(null);
    setFormHeader({
      vendor_id: vendors[0]?.id || '',
      expected_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      notes: ''
    });
    setFormItems([{ item_id: itemsList[0]?.id || '', qty: 1, unit_price: 0.00 }]);
    setIsFormOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = async (po) => {
    if (po.status !== 'Draft') {
      return toast.error('Only Draft purchase orders can be updated.');
    }
    setEditingPO(po);

    try {
      const res = await getPurchaseOrderById(po.id);
      if (res.success) {
        setFormHeader({
          vendor_id: res.order.vendor_id,
          expected_date: res.order.expected_date ? new Date(res.order.expected_date).toISOString().slice(0, 10) : '',
          notes: res.order.notes || ''
        });
        setFormItems(res.items.map(item => ({
          item_id: item.item_id,
          qty: parseFloat(item.qty),
          unit_price: parseFloat(item.unit_price)
        })));
        setIsFormOpen(true);
      }
    } catch (err) {
      toast.error('Failed to load PO details.');
    }
  };

  // Handle Header Changes
  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setFormHeader(prev => ({ ...prev, [name]: value }));
  };

  // Handle Line Items Changes
  const handleItemRowChange = (index, field, value) => {
    setFormItems(prev => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  // Add Item Row
  const handleAddRow = () => {
    setFormItems(prev => [...prev, { item_id: itemsList[0]?.id || '', qty: 1, unit_price: 0.00 }]);
  };

  // Remove Item Row
  const handleRemoveRow = (index) => {
    if (formItems.length === 1) return toast.error('At least one item is required.');
    setFormItems(prev => prev.filter((_, i) => i !== index));
  };

  // Calculate Running PO Totals
  const calculateTotal = () => {
    return formItems.reduce((acc, curr) => {
      const qty = parseFloat(curr.qty) || 0;
      const price = parseFloat(curr.unit_price) || 0;
      return acc + (qty * price);
    }, 0);
  };

  const grandTotal = calculateTotal();

  // Save PO (Draft)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formHeader.vendor_id) return toast.error('Vendor selection is required.');
    if (!formHeader.expected_date) return toast.error('Expected delivery date is required.');

    const invalidRow = formItems.some(row => !row.item_id || row.qty <= 0 || row.unit_price < 0);
    if (invalidRow) return toast.error('Please enter valid quantities (>0) and prices (>=0).');

    try {
      const payload = {
        ...formHeader,
        items: formItems
      };

      if (editingPO) {
        await updatePurchaseOrder(editingPO.id, payload);
        toast.success('PO draft updated.');
      } else {
        await createPurchaseOrder(payload);
        toast.success('PO draft created.');
      }
      setIsFormOpen(false);
      fetchPOsList();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save PO failed.');
    }
  };

  // View PO Details
  const handleViewPO = async (po) => {
    try {
      const res = await getPurchaseOrderById(po.id);
      if (res.success) {
        setViewingPO(res.order);
        setViewingItems(res.items);
        setGrnStatus(res.grnStatus);
        setIsViewOpen(true);
      }
    } catch (err) {
      toast.error('Failed to load purchase order.');
    }
  };

  // Submit for Approval
  const handleSubmitApproval = async (id) => {
    try {
      const res = await submitPurchaseOrder(id);
      if (res.success) {
        toast.success(res.message);
        setIsViewOpen(false);
        fetchPOsList();
      }
    } catch (err) {
      toast.error('Failed to submit purchase order.');
    }
  };

  // Approve PO (Manager / Admin)
  const handleApprove = async (id) => {
    try {
      const res = await approvePurchaseOrder(id);
      if (res.success) {
        toast.success('Purchase Order has been approved.');
        setIsViewOpen(false);
        fetchPOsList();
      }
    } catch (err) {
      toast.error('Failed to approve PO.');
    }
  };

  // Open Reject Modal
  const handleOpenRejectModal = () => {
    setRejectionReason('');
    setIsRejectOpen(true);
  };

  // Submit Rejection
  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) return toast.error('Rejection reason is required.');

    setSubmittingReject(true);
    try {
      const res = await rejectPurchaseOrder(viewingPO.id, rejectionReason.trim());
      if (res.success) {
        toast.success('Purchase Order rejected.');
        setIsRejectOpen(false);
        setIsViewOpen(false);
        fetchPOsList();
      }
    } catch (err) {
      toast.error('Failed to reject PO.');
    } finally {
      setSubmittingReject(false);
    }
  };

  // Update delivery status
  const handleDeliveryStatusChange = async (e) => {
    const newStatus = e.target.value;
    try {
      const res = await updatePurchaseOrderStatus(viewingPO.id, newStatus);
      if (res.success) {
        toast.success(`Delivery status updated to ${newStatus}.`);
        setViewingPO(prev => ({ ...prev, status: newStatus }));
        fetchPOsList();
      }
    } catch (err) {
      toast.error('Failed to update status.');
    }
  };

  // Columns Configuration
  const columns = [
    {
      key: 'po_no',
      label: 'PO no',
      render: (item) => <span className="stamp">{item.po_no}</span>
    },
    { key: 'vendor_name', label: 'Supplier / vendor' },
    { key: 'po_date', label: 'Order date', render: (item) => formatDate(item.po_date) },
    { key: 'expected_date', label: 'Expected date', render: (item) => formatDate(item.expected_date) },
    {
      key: 'grnStatus',
      label: 'GRN delivery status',
      render: (item) => <StatusBadge status={item.grnStatus || item.status} />
    },
    {
      key: 'approval_status',
      label: 'Approval status',
      render: (item) => <StatusBadge status={item.approval_status} />
    },
    {
      key: 'total_amount',
      label: 'Total value',
      isNumeric: true,
      render: (item) => formatINR(item.total_amount)
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewPO(item)}
            className="btn btn-ghost btn-sm"
          >
            Review PO
          </button>
          {item.status === 'Draft' && hasPermission('purchase', 'edit') && (
            <button
              onClick={() => handleOpenEdit(item)}
              className="btn btn-ghost btn-sm"
            >
              Edit
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
        title="Purchase orders"
        description="Raise supplier requests, submit for approval validation, and manage expected intakes."
        actions={
          hasPermission('purchase', 'create') ? (
            <button
              onClick={handleOpenCreate}
              className="btn btn-primary"
            >
              Create PO draft
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
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="Ordered">Ordered (Approved)</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
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
      <Table columns={columns} data={pos} loading={loading} emptyMessage="No purchase orders found." />

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* CREATE & EDIT FORM MODAL */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingPO ? 'Edit purchase order' : 'Create purchase order draft'}
        size="xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Select supplier *</label>
              <select
                name="vendor_id"
                required
                className="field"
                value={formHeader.vendor_id}
                onChange={handleHeaderChange}
              >
                <option value="" disabled>Select supplier</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>

            <div>
              <label className="field-label">Expected delivery date *</label>
              <input
                type="date"
                name="expected_date"
                required
                className="field"
                value={formHeader.expected_date}
                onChange={handleHeaderChange}
              />
            </div>
          </div>

          {/* Line items editor */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold text-text-primary">Line items</h4>
              <button
                type="button"
                onClick={handleAddRow}
                className="btn btn-ghost btn-sm"
              >
                + Add item
              </button>
            </div>

            <div className="sheet overflow-x-auto">
              <table className="bom min-w-[650px]">
                <thead>
                  <tr>
                    <th className="w-1/2">Item code / description</th>
                    <th className="text-center w-24">Quantity</th>
                    <th className="w-36 text-right">Unit price (INR)</th>
                    <th className="text-right w-36">Line total</th>
                    <th className="text-center w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {formItems.map((row, idx) => {
                    const rowTotal = (parseFloat(row.qty) || 0) * (parseFloat(row.unit_price) || 0);

                    return (
                      <tr key={idx} className="bom-row">
                        <td className="p-2">
                          <select
                            required
                            className="field !min-h-[30px] !py-1 text-xs"
                            value={row.item_id}
                            onChange={(e) => handleItemRowChange(idx, 'item_id', e.target.value)}
                          >
                            <option value="" disabled>Select item</option>
                            {itemsList.map(it => <option key={it.id} value={it.id}>{it.name} ({it.item_code})</option>)}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0.0001"
                            step="any"
                            required
                            className="field !min-h-[30px] !py-1 text-xs text-center"
                            value={row.qty}
                            onChange={(e) => handleItemRowChange(idx, 'qty', e.target.value)}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            className="field !min-h-[30px] !py-1 text-xs text-right"
                            value={row.unit_price}
                            onChange={(e) => handleItemRowChange(idx, 'unit_price', e.target.value)}
                          />
                        </td>
                        <td className="p-2 text-sm font-semibold tabular-nums text-right text-text-primary">
                          {formatINR(rowTotal)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            className="btn btn-ghost btn-icon btn-sm text-[var(--danger-text)]"
                            aria-label="Remove item"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer details row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border-color">
            <div>
              <label className="field-label">Notes / terms</label>
              <textarea
                name="notes"
                rows={2}
                placeholder="Include shipping instructions or purchase specifications…"
                className="field"
                value={formHeader.notes}
                onChange={handleHeaderChange}
              />
            </div>

            <div className="sheet p-4 space-y-1 text-right self-end">
              <span className="text-xs text-text-secondary">Order grand total:</span>
              <p className="text-xl font-semibold text-accent-primary tabular-nums">{formatINR(grandTotal)}</p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
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
              Save PO (Draft)
            </button>
          </div>
        </form>
      </Modal>

      {/* VIEW PO PREVIEW & WORKFLOW CONTROL MODAL */}
      <Modal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        title="Purchase Order Review"
        size="xl"
      >
        {viewingPO && (() => {
          const totalAmount = parseFloat(viewingPO.total_amount) || 0;

          return (
            <div className="space-y-6">
              {/* Approval Stepper Component */}
              <div className="sheet p-4 no-print">
                <div className="text-xs font-semibold text-text-secondary mb-3">Approval workflow</div>
                <div className="grid grid-cols-3 gap-2 relative">
                  {/* Step 1: Draft */}
                  <div className="flex items-center gap-2">
                    <span className={`step-dot !w-6 !h-6 text-xs ${
                      viewingPO.status !== 'Draft' ? '!bg-[var(--success-bg)] !text-[var(--success-text)] !border-[var(--success-border)]' : '!border-accent-primary'
                    }`}>
                      1
                    </span>
                    <div className="text-xs">
                      <div className="font-semibold text-text-primary">Draft</div>
                      <div className="text-text-muted">Created</div>
                    </div>
                  </div>

                  {/* Step 2: Submitted */}
                  <div className="flex items-center gap-2">
                    <span className={`step-dot !w-6 !h-6 text-xs ${
                      viewingPO.approval_status === 'Approved' ? '!bg-[var(--success-bg)] !text-[var(--success-text)] !border-[var(--success-border)]' :
                      viewingPO.approval_status === 'Rejected' ? '!bg-[var(--danger-bg)] !text-[var(--danger-text)] !border-[var(--danger-border)]' :
                      viewingPO.status === 'Submitted' ? '!border-accent-primary font-bold' : ''
                    }`}>
                      2
                    </span>
                    <div className="text-xs">
                      <div className="font-semibold text-text-primary">Submission</div>
                      <div className="text-text-muted">{viewingPO.status === 'Draft' ? 'Pending' : 'Under review'}</div>
                    </div>
                  </div>

                  {/* Step 3: Approved / Rejected */}
                  <div className="flex items-center gap-2">
                    <span className={`step-dot !w-6 !h-6 text-xs ${
                      viewingPO.approval_status === 'Approved' ? '!bg-[var(--success-bg)] !text-[var(--success-text)] !border-[var(--success-border)]' :
                      viewingPO.approval_status === 'Rejected' ? '!bg-[var(--danger-bg)] !text-[var(--danger-text)] !border-[var(--danger-border)]' : ''
                    }`}>
                      3
                    </span>
                    <div className="text-xs">
                      <div className="font-semibold text-text-primary">Decision</div>
                      <div className="text-text-muted">{viewingPO.approval_status || 'Pending'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Control Bar for Approval & Rejection */}
              <div className="sheet p-3 flex flex-wrap justify-between items-center gap-2 no-print">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-text-secondary">Workflow actions:</span>
                  {viewingPO.status === 'Draft' && (
                    <button
                      onClick={() => handleSubmitApproval(viewingPO.id)}
                      className="btn btn-primary btn-sm"
                    >
                      Submit for approval
                    </button>
                  )}
                  {viewingPO.status === 'Submitted' && hasPermission('purchase', 'approve') && (
                    <>
                      <button
                        onClick={() => handleApprove(viewingPO.id)}
                        className="btn btn-primary btn-sm"
                      >
                        Approve order
                      </button>
                      <button
                        onClick={handleOpenRejectModal}
                        className="btn btn-danger btn-sm"
                      >
                        Reject order
                      </button>
                    </>
                  )}
                  
                  {/* Delivery stage update select */}
                  {viewingPO.approval_status === 'Approved' && (
                    <div className="flex items-center gap-1.5 ml-2">
                      <span className="text-xs text-text-secondary">Delivery:</span>
                      <select
                        value={viewingPO.status}
                        onChange={handleDeliveryStatusChange}
                        className="field !min-h-[28px] !py-0.5 !text-xs !w-auto"
                      >
                        <option value="Ordered">Ordered (Dispatched)</option>
                        <option value="Completed">Completed (Received)</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={viewingPO.approval_status} />
                  <button
                    onClick={() => window.print()}
                    className="btn btn-primary btn-sm inline-flex items-center gap-1.5 ml-2"
                  >
                    <Printer className="w-4 h-4" /> Print / Save PDF
                  </button>
                  <a
                    href={`/print/purchase-order/${viewingPO.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm inline-flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Full page
                  </a>
                </div>
              </div>

              {/* Rejection comment flag */}
              {viewingPO.approval_status === 'Rejected' && viewingPO.rejection_reason && (
                <div className="p-3.5 rounded border border-[var(--danger-border)] bg-[var(--danger-bg)] text-xs text-[var(--danger-text)] no-print">
                  <span className="font-semibold block mb-1">Rejection remarks:</span>
                  <p>{viewingPO.rejection_reason}</p>
                </div>
              )}

              {/* Printable Document Frame */}
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
                      Official Procurement
                    </div>
                    <div className="text-base font-bold text-slate-900 tracking-tight">
                      PURCHASE ORDER
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-300 space-y-1">
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">PO No:</span>
                        <span className="font-mono font-bold text-slate-900">{viewingPO.po_no}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">PO Date:</span>
                        <span className="font-mono text-slate-800">{formatDate(viewingPO.po_date)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Delivery Due:</span>
                        <span className="font-mono font-semibold text-blue-700">{formatDate(viewingPO.expected_date)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Approval:</span>
                        <span className={`font-semibold uppercase ${viewingPO.approval_status === 'Approved' ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {viewingPO.approval_status || 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vendor & Intake details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5 text-xs">
                  <div className="border border-slate-300 rounded p-3 bg-slate-50/60">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-200">
                      Supplier / Vendor Details (Issued To)
                    </div>
                    <div className="pt-2">
                      <p className="text-sm font-bold text-slate-900">{viewingPO.vendor_name}</p>
                      <p className="text-slate-600 mt-1 leading-relaxed">{viewingPO.vendor_address || 'Address on file'}</p>
                      <div className="mt-2 space-y-0.5 font-mono text-slate-600">
                        <p><span className="text-slate-500 font-sans">GSTIN:</span> <strong className="text-slate-800">{viewingPO.vendor_gstin || 'N/A'}</strong></p>
                        <p><span className="text-slate-500 font-sans">Email:</span> {viewingPO.vendor_email || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-300 rounded p-3 bg-slate-50/60">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-200">
                      Delivery & Warehouse Destination (Ship To)
                    </div>
                    <div className="pt-2 space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Delivery Location:</span>
                        <span className="font-medium text-slate-800">Central Storage Warehouse</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Inward GRN Status:</span>
                        <span className="font-mono font-semibold text-slate-900">{grnStatus}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Payment Terms:</span>
                        <span className="font-medium text-slate-800">Standard Net 30 Days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Currency:</span>
                        <span className="font-medium text-slate-800">Indian Rupee (INR - ₹)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Line items Table */}
                <div className="my-5 overflow-x-auto border border-slate-300 rounded">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                        <th className="py-2 px-2 text-center w-8 border-r border-slate-300">#</th>
                        <th className="py-2 px-3 text-left border-r border-slate-300">Item Description & Specification</th>
                        <th className="py-2 px-2 text-center w-16 border-r border-slate-300">HSN</th>
                        <th className="py-2 px-2 text-center w-14 border-r border-slate-300">Quantity</th>
                        <th className="py-2 px-3 text-right w-24 border-r border-slate-300">Unit Rate (₹)</th>
                        <th className="py-2 px-3 text-right w-28">Line Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {viewingItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-2 text-center text-slate-500 font-mono border-r border-slate-200">{idx + 1}</td>
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
                  {/* Left: Amount in Words & Notes */}
                  <div className="space-y-3 text-xs">
                    <div className="border border-slate-200 rounded p-2.5 bg-slate-50/50">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                        Total Order Value (in words):
                      </span>
                      <p className="font-medium text-slate-800 italic">
                        {numberToIndianWords(totalAmount)}
                      </p>
                    </div>

                    <div className="border border-slate-200 rounded p-2.5 bg-slate-50/50">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                        Purchase & Delivery Instructions:
                      </span>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        {viewingPO.notes || 'Goods subject to mandatory inward quality inspection at receiving dock. Materials must match approved drawings and technical specifications.'}
                      </p>
                    </div>
                  </div>

                  {/* Right: PO Value Summary Box */}
                  <div className="border border-slate-300 rounded overflow-hidden text-xs self-start">
                    <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-700 border-b border-slate-300 uppercase tracking-wider text-[10px]">
                      Order Value Summary
                    </div>
                    <div className="p-3 space-y-1.5">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal (Net):</span>
                        <span className="font-mono">{formatINR(totalAmount)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>GST / Taxes:</span>
                        <span className="font-mono text-slate-500">As applicable</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t-2 border-slate-800 text-sm font-bold text-slate-900 bg-slate-50 -mx-3 -mb-3 p-3">
                        <span className="uppercase tracking-tight">Total Order Value:</span>
                        <span className="font-mono text-base text-blue-700">{formatINR(totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Terms and Signatures */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 mt-3 border-t border-slate-300 text-xs">
                  <div className="text-slate-600 space-y-1">
                    <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Standard Purchase Conditions:</h4>
                    <p className="whitespace-pre-line leading-relaxed text-[11px]">
                      1. Please send two copies of invoice with original delivery challan.
                      2. Inward stock is subject to warehouse QC clearance before receipt confirmation.
                      3. Delivery must be executed on or before the specified expected date.
                    </p>
                  </div>

                  <div className="text-left sm:text-right flex flex-col justify-between items-start sm:items-end min-h-[80px]">
                    <div className="text-slate-700 font-bold uppercase text-[11px]">
                      For {COMPANY_NAME}
                    </div>
                    <div className="w-48 border-t border-slate-400 pt-1 text-center mt-6">
                      <p className="font-semibold text-slate-800">{viewingPO.approver_name || 'Authorized Signatory'}</p>
                      <p className="text-[10px] text-slate-500">Procurement & Material Management</p>
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
                  Close review
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* REJECTION REASON MODAL */}
      <Modal
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        title="Reject purchase order"
      >
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <div>
            <label className="field-label">State rejection remarks *</label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Unit rate exceeds market value, or incorrect item specification requested…"
              className="field"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={submittingReject}
              onClick={() => setIsRejectOpen(false)}
              className="btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingReject}
              className="btn btn-danger"
            >
              Confirm rejection
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PurchaseOrdersPage;
