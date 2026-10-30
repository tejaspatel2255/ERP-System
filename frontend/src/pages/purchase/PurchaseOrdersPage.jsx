import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
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
      expected_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // default 7 days delivery window
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
        toast.success('Purchase Order has been Approved.');
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
        toast.success('Purchase Order Rejected.');
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
      label: 'PO No',
      render: (item) => (
        <span className="font-mono text-xs font-semibold tracking-wider text-text-primary">
          {item.po_no}
        </span>
      )
    },
    {
      key: 'vendor_name',
      label: 'Supplier / Vendor',
      render: (item) => (
        <span className="font-medium text-text-primary">
          {item.vendor_name}
        </span>
      )
    },
    {
      key: 'po_date',
      label: 'Order Date',
      render: (item) => (
        <span className="font-mono text-xs text-text-secondary">
          {formatDate(item.po_date)}
        </span>
      )
    },
    {
      key: 'expected_date',
      label: 'Expected Date',
      render: (item) => (
        <span className="font-mono text-xs text-text-secondary">
          {formatDate(item.expected_date)}
        </span>
      )
    },
    {
      key: 'grnStatus',
      label: 'GRN Status',
      render: (item) => <StatusBadge status={item.grnStatus} />
    },
    {
      key: 'approval_status',
      label: 'Approval Status',
      render: (item) => <StatusBadge status={item.approval_status} />
    },
    {
      key: 'total_amount',
      label: 'Total Value',
      render: (item) => (
        <span className="font-mono text-xs font-semibold text-text-primary">
          {formatINR(item.total_amount)}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleViewPO(item)}
            className="btn btn-ghost px-2.5 py-1 text-xs font-mono uppercase tracking-wider"
          >
            Review PO
          </button>
          {item.status === 'Draft' && hasPermission('purchase', 'edit') && (
            <button
              onClick={() => handleOpenEdit(item)}
              className="btn btn-ghost px-2.5 py-1 text-xs font-mono uppercase tracking-wider text-accent-primary"
            >
              Edit
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
        title="Purchase Orders Ledger"
        description="Raise supplier requests, submit for approval validation, and manage expected intakes."
        actions={
          hasPermission('purchase', 'create') && (
            <button
              onClick={handleOpenCreate}
              className="btn btn-primary px-4 py-2 text-xs font-mono uppercase tracking-wider"
            >
              + Create PO Draft
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
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="Ordered">Ordered (Approved)</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
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
        <Table columns={columns} data={pos} loading={loading} emptyMessage="No purchase orders matched the search query." />
      </div>

      {/* Pagination */}
      <div className="flex justify-end">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* CREATE & EDIT FORM MODAL */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingPO ? 'Edit Purchase Order' : 'Create Purchase Order Draft'} size="xl">
        <form onSubmit={handleFormSubmit} className="space-y-6 font-sans">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Select Supplier *</label>
              <select
                name="vendor_id"
                required
                className="field font-sans"
                value={formHeader.vendor_id}
                onChange={handleHeaderChange}
              >
                <option value="" disabled>Select Supplier</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Expected Delivery Date *</label>
              <input
                type="date"
                name="expected_date"
                required
                className="field font-mono"
                value={formHeader.expected_date}
                onChange={handleHeaderChange}
              />
            </div>
          </div>

          {/* PO items row details */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-display text-sm font-bold uppercase tracking-wider text-text-primary">Line Items (BOM)</h4>
              <button
                type="button"
                onClick={handleAddRow}
                className="btn btn-ghost px-2.5 py-1 text-xs font-mono uppercase tracking-wider text-accent-primary"
              >
                + Add Item
              </button>
            </div>

            <div className="sheet overflow-hidden">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-border-color bg-bg-secondary text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    <th className="px-3 py-2.5 w-1/2">Item Code / Description</th>
                    <th className="px-3 py-2.5 text-center w-24">Quantity</th>
                    <th className="px-3 py-2.5 w-36">Unit Price (INR)</th>
                    <th className="px-3 py-2.5 text-right w-36">Line Total</th>
                    <th className="px-2 py-2.5 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color">
                  {formItems.map((row, idx) => {
                    const rowTotal = (parseFloat(row.qty) || 0) * (parseFloat(row.unit_price) || 0);

                    return (
                      <tr key={idx} className="hover:bg-bg-hover">
                        <td className="p-2">
                          <select
                            required
                            className="field py-1 px-2 text-xs font-sans"
                            value={row.item_id}
                            onChange={(e) => handleItemRowChange(idx, 'item_id', e.target.value)}
                          >
                            <option value="" disabled>Select Item</option>
                            {itemsList.map(it => <option key={it.id} value={it.id}>{it.name} ({it.item_code})</option>)}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0.0001"
                            step="any"
                            required
                            className="field py-1 px-2 text-xs text-center font-mono"
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
                            className="field py-1 px-2 text-xs font-mono"
                            value={row.unit_price}
                            onChange={(e) => handleItemRowChange(idx, 'unit_price', e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2 text-xs font-mono font-bold text-right text-text-primary">
                          {formatINR(rowTotal)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            className="btn btn-ghost px-1.5 py-1 text-xs text-accent-danger hover:bg-accent-danger/10"
                            title="Remove row"
                          >
                            ✕
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
          <div className="flex flex-col sm:flex-row justify-between items-start pt-4 border-t border-border-color gap-4">
            <div className="flex-1 w-full">
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Notes / Terms</label>
              <textarea
                name="notes"
                rows={2}
                placeholder="Include shipping instructions or purchase specifications..."
                className="field font-sans"
                value={formHeader.notes}
                onChange={handleHeaderChange}
              />
            </div>

            <div className="sheet bg-bg-secondary p-4 w-full sm:w-64 text-right">
              <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">Order Grand Total:</span>
              <p className="font-mono text-xl font-bold text-accent-primary">{formatINR(grandTotal)}</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
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
              Save PO (Draft)
            </button>
          </div>
        </form>
      </Modal>

      {/* VIEW PO PREVIEW & WORKFLOW CONTROL MODAL */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Purchase Order Review" size="lg">
        {viewingPO && (
          <div className="space-y-6 font-sans">
            {/* Control Bar for Approval & Rejection */}
            <div className="flex flex-wrap justify-between items-center gap-3 p-3 sheet bg-bg-secondary">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-wider text-text-muted">Actions:</span>
                {viewingPO.status === 'Draft' && (
                  <button
                    onClick={() => handleSubmitApproval(viewingPO.id)}
                    className="btn btn-primary px-3 py-1.5 text-xs font-mono uppercase tracking-wider"
                  >
                    Submit for Approval
                  </button>
                )}
                {viewingPO.status === 'Submitted' && hasPermission('purchase', 'approve') && (
                  <>
                    <button
                      onClick={() => handleApprove(viewingPO.id)}
                      className="btn btn-primary px-3 py-1.5 text-xs font-mono uppercase tracking-wider bg-accent-success hover:brightness-110"
                    >
                      Approve Order
                    </button>
                    <button
                      onClick={handleOpenRejectModal}
                      className="btn btn-danger px-3 py-1.5 text-xs font-mono uppercase tracking-wider"
                    >
                      Reject Order
                    </button>
                  </>
                )}
                
                {/* Delivery stage update select */}
                {viewingPO.approval_status === 'Approved' && (
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">Delivery:</span>
                    <select
                      value={viewingPO.status}
                      onChange={handleDeliveryStatusChange}
                      className="field py-1 px-2 text-xs font-mono uppercase w-auto"
                    >
                      <option value="Ordered">Ordered (Dispatched)</option>
                      <option value="Completed">Completed (Received)</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                )}
              </div>

              <StatusBadge status={viewingPO.approval_status} />
            </div>

            {/* Rejection comment flag */}
            {viewingPO.approval_status === 'Rejected' && viewingPO.rejection_reason && (
              <div className="p-3 sheet bg-accent-danger/10 border-accent-danger/30 text-xs text-accent-danger font-mono">
                <span className="font-bold uppercase block mb-1">Rejection Remarks:</span>
                <p>{viewingPO.rejection_reason}</p>
              </div>
            )}

            {/* Printable Area Wrapper - Literal White Paper Frame */}
            <div className="p-6 sm:p-8 border border-border-color rounded-sm bg-white text-slate-900 shadow-sm space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h2 className="font-display text-xl uppercase tracking-wider font-bold text-slate-950">ERP ENTERPRISE</h2>
                  <p className="text-xs text-slate-600 font-mono">123 Industrial Area, Phase II, New Delhi, India</p>
                </div>
                <div className="text-right">
                  <h3 className="font-mono text-xs uppercase tracking-widest text-slate-500 font-bold">Purchase Order</h3>
                  <p className="font-mono text-sm font-bold text-slate-900">{viewingPO.po_no}</p>
                  <p className="text-xs text-slate-600 font-mono">Date: {formatDate(viewingPO.po_date)}</p>
                  <p className="text-xs text-blue-700 font-mono font-semibold">Delivery Expected: {formatDate(viewingPO.expected_date)}</p>
                </div>
              </div>

              {/* Vendor & Intake details */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <h4 className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Supplier Info:</h4>
                  <p className="font-bold text-slate-900">{viewingPO.vendor_name}</p>
                  <p className="text-slate-600">{viewingPO.vendor_address}</p>
                  <p className="text-slate-600 font-mono">GSTIN: {viewingPO.vendor_gstin || 'N/A'}</p>
                  <p className="text-slate-600 font-mono">Email: {viewingPO.vendor_email || 'N/A'}</p>
                </div>
                <div className="text-right text-xs">
                  <h4 className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Warehouse Intake:</h4>
                  <p className="text-slate-600">Central Storage Warehouse</p>
                  <p className="text-slate-600 font-mono">GRN Status: <span className="font-bold text-slate-900">{grnStatus}</span></p>
                </div>
              </div>

              {/* Line items Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-50 font-mono text-[11px] uppercase tracking-wider text-slate-600">
                    <th className="py-2.5 px-3 font-bold">Item Code / Description</th>
                    <th className="py-2.5 px-3 font-bold text-center">Quantity</th>
                    <th className="py-2.5 px-3 font-bold">Unit Rate (INR)</th>
                    <th className="py-2.5 px-3 font-bold text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {viewingItems.map((item, idx) => (
                    <tr key={idx}>
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

              {/* Summary notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div className="text-xs text-slate-600 font-mono">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Important Specifications</h4>
                  <p>{viewingPO.notes || 'Goods subject to warehouse quality inspections.'}</p>
                </div>
                <div className="text-right text-xs space-y-1.5 self-end font-mono">
                  <div className="flex justify-between font-bold text-sm text-slate-950">
                    <span>Order Value (Gross):</span>
                    <span className="text-blue-700">{formatINR(viewingPO.total_amount)}</span>
                  </div>
                  {viewingPO.approver_name && (
                    <div className="text-[10px] text-slate-500">Approved by manager: {viewingPO.approver_name}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border-color">
              <button
                type="button"
                onClick={() => setIsViewOpen(false)}
                className="btn btn-ghost px-4 py-2 text-xs font-mono uppercase tracking-wider"
              >
                Close Review
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* REJECTION REASON MODAL */}
      <Modal isOpen={isRejectOpen} onClose={() => setIsRejectOpen(false)} title="Reject Purchase Order">
        <form onSubmit={handleRejectSubmit} className="space-y-4 font-sans">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">State Rejection Remarks *</label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Unit rate exceeds market value, or incorrect item specification requested..."
              className="field font-sans"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={submittingReject}
              onClick={() => setIsRejectOpen(false)}
              className="btn btn-ghost px-4 py-2 text-xs font-mono uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingReject}
              className="btn btn-danger px-4 py-2 text-xs font-mono uppercase tracking-wider"
            >
              Confirm Rejection
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PurchaseOrdersPage;
