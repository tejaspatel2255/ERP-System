import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
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
    { key: 'po_no', label: 'PO No' },
    { key: 'vendor_name', label: 'Supplier / Vendor' },
    { key: 'po_date', label: 'Order Date', render: (item) => formatDate(item.po_date) },
    { key: 'expected_date', label: 'Expected Date', render: (item) => formatDate(item.expected_date) },
    { key: 'grnStatus', label: 'GRN Delivery Status' },
    {
      key: 'approval_status',
      label: 'Approval Status',
      render: (item) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          item.approval_status === 'Approved' ? 'bg-green-100 text-green-800 border border-green-200' :
          item.approval_status === 'Rejected' ? 'bg-red-100 text-red-800 border border-red-200' :
          'bg-orange-100 text-orange-800 border border-orange-200'
        }`}>
          {item.approval_status === 'Approved' ? 'Approved' : item.approval_status === 'Rejected' ? 'Rejected' : 'Pending Approval'}
        </span>
      )
    },
    { key: 'total_amount', label: 'Total Value', render: (item) => formatINR(item.total_amount) },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewPO(item)}
            className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300 font-semibold text-xs bg-slate-50 dark:bg-slate-900/10 px-2 py-1 rounded-md"
          >
            Review PO
          </button>
          {item.status === 'Draft' && hasPermission('purchase', 'edit') && (
            <button
              onClick={() => handleOpenEdit(item)}
              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 font-semibold text-xs bg-blue-50 dark:bg-blue-900/10 px-2 py-1 rounded-md"
            >
              Edit
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Purchase Orders Ledger</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Raise supplier requests, submit for approval validation, and manage expected intakes.</p>
        </div>

        {hasPermission('purchase', 'create') && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
          >
            Create PO Draft
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
      <Table columns={columns} data={pos} loading={loading} emptyMessage="No purchase orders matched the search query." />

      {/* Pagination */}
      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* CREATE & EDIT FORM MODAL */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingPO ? 'Edit Purchase Order' : 'Create Purchase Order Draft'} size="xl">
        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Supplier *</label>
              <select
                name="vendor_id"
                required
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none"
                value={formHeader.vendor_id}
                onChange={handleHeaderChange}
              >
                <option value="" disabled>Select Supplier</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Expected Delivery Date *</label>
              <input
                type="date"
                name="expected_date"
                required
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none"
                value={formHeader.expected_date}
                onChange={handleHeaderChange}
              />
            </div>
          </div>

          {/* PO items row details */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Line Items</h4>
              <button
                type="button"
                onClick={handleAddRow}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800"
              >
                + Add Item
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950 shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase w-1/2">Item Code / Description</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-center w-20">Quantity</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase w-36">Unit Price (INR)</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right w-36">Line Total</th>
                    <th className="px-4 py-3 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {formItems.map((row, idx) => {
                    const rowTotal = (parseFloat(row.qty) || 0) * (parseFloat(row.unit_price) || 0);

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="px-2 py-2">
                          <select
                            required
                            className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-1.5 px-2 text-sm text-slate-900 dark:text-white focus:outline-none"
                            value={row.item_id}
                            onChange={(e) => handleItemRowChange(idx, 'item_id', e.target.value)}
                          >
                            <option value="" disabled>Select Item</option>
                            {itemsList.map(it => <option key={it.id} value={it.id}>{it.name} ({it.item_code})</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min="0.0001"
                            step="any"
                            required
                            className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-1.5 px-2 text-sm text-center text-slate-900 dark:text-white focus:outline-none"
                            value={row.qty}
                            onChange={(e) => handleItemRowChange(idx, 'qty', e.target.value)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-1.5 px-2 text-sm text-slate-900 dark:text-white focus:outline-none"
                            value={row.unit_price}
                            onChange={(e) => handleItemRowChange(idx, 'unit_price', e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-2 text-sm font-semibold text-right text-slate-950 dark:text-white">
                          {formatINR(rowTotal)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <div className="flex justify-between items-start pt-4 border-t border-slate-100 dark:border-slate-800 gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes / Terms</label>
              <textarea
                name="notes"
                rows={2}
                placeholder="Include shipping instructions or purchase specifications..."
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                value={formHeader.notes}
                onChange={handleHeaderChange}
              />
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-4 border border-slate-200 dark:border-slate-800 w-64 text-right">
              <span className="text-xs text-slate-500">Order Grand Total:</span>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-450">{formatINR(grandTotal)}</p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="rounded-lg border border-slate-350 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Save PO (Draft)
            </button>
          </div>
        </form>
      </Modal>

      {/* VIEW PO PREVIEW & WORKFLOW CONTROL MODAL */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Purchase Order Review" size="lg">
        {viewingPO && (
          <div className="space-y-6">
            {/* Control Bar for Approval & Rejection */}
            <div className="flex flex-wrap justify-between items-center gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-605">Workflow Status:</span>
                {viewingPO.status === 'Draft' && (
                  <button
                    onClick={() => handleSubmitApproval(viewingPO.id)}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded"
                  >
                    Submit for Approval
                  </button>
                )}
                {viewingPO.status === 'Submitted' && hasPermission('purchase', 'approve') && (
                  <>
                    <button
                      onClick={() => handleApprove(viewingPO.id)}
                      className="bg-green-600 hover:bg-green-550 text-white text-xs font-bold px-3 py-1.5 rounded"
                    >
                      Approve Order
                    </button>
                    <button
                      onClick={handleOpenRejectModal}
                      className="bg-red-650 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded"
                    >
                      Reject Order
                    </button>
                  </>
                )}
                
                {/* Delivery stage update select */}
                {viewingPO.approval_status === 'Approved' && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500">Delivery Status:</span>
                    <select
                      value={viewingPO.status}
                      onChange={handleDeliveryStatusChange}
                      className="rounded border border-slate-300 text-xs px-2 py-1 bg-white dark:bg-slate-900"
                    >
                      <option value="Ordered">Ordered (Dispatched)</option>
                      <option value="Completed">Completed (Received)</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                )}
              </div>

              <span className={`inline-flex items-center rounded px-2.5 py-0.5 text-xs font-semibold ${
                viewingPO.approval_status === 'Approved' ? 'bg-green-100 text-green-800 border border-green-200' :
                viewingPO.approval_status === 'Rejected' ? 'bg-red-100 text-red-800 border border-red-200' :
                'bg-orange-100 text-orange-800 border border-orange-200'
              }`}>
                {viewingPO.approval_status === 'Approved' ? 'Approved' : viewingPO.approval_status === 'Rejected' ? 'Rejected' : 'Pending Approval'}
              </span>
            </div>

            {/* Rejection comment flag */}
            {viewingPO.approval_status === 'Rejected' && viewingPO.rejection_reason && (
              <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 text-xs text-red-650 dark:text-red-400">
                <span className="font-bold uppercase block mb-1">Rejection Remarks:</span>
                <p>{viewingPO.rejection_reason}</p>
              </div>
            )}

            {/* Printable Area Wrapper */}
            <div className="p-6 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-150 pb-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">ERP ENTERPRISE</h2>
                  <p className="text-xs text-slate-400">123 Industrial Area, Phase II, New Delhi, India</p>
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-bold text-blue-600 uppercase">Purchase Order</h3>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{viewingPO.po_no}</p>
                  <p className="text-xs text-slate-400">Date: {formatDate(viewingPO.po_date)}</p>
                  <p className="text-xs text-blue-600 font-semibold">Delivery Expected: {formatDate(viewingPO.expected_date)}</p>
                </div>
              </div>

              {/* Vendor & Intake details */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <h4 className="font-bold text-slate-500 uppercase mb-1">Supplier Info:</h4>
                  <p className="font-bold text-slate-900 dark:text-white">{viewingPO.vendor_name}</p>
                  <p className="text-slate-500">{viewingPO.vendor_address}</p>
                  <p className="text-slate-500">GSTIN: {viewingPO.vendor_gstin || 'N/A'}</p>
                  <p className="text-slate-500">Email: {viewingPO.vendor_email || 'N/A'}</p>
                </div>
                <div className="text-right text-xs">
                  <h4 className="font-bold text-slate-500 uppercase mb-1">Warehouse Intake:</h4>
                  <p className="text-slate-500">Central Storage Warehouse</p>
                  <p className="text-slate-500">GRN Status: <span className="font-bold text-slate-900 dark:text-white">{grnStatus}</span></p>
                </div>
              </div>

              {/* Line items Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <th className="py-2.5 px-2 font-bold uppercase text-slate-500">Item Code / Description</th>
                    <th className="py-2.5 px-2 font-bold uppercase text-slate-500 text-center">Quantity</th>
                    <th className="py-2.5 px-2 font-bold uppercase text-slate-500">Unit Rate (INR)</th>
                    <th className="py-2.5 px-2 font-bold uppercase text-slate-500 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {viewingItems.map((item, idx) => (
                    <tr key={idx}>
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

              {/* Summary notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-150">
                <div className="text-xs text-slate-500">
                  <h4 className="font-bold uppercase mb-1">Important Specifications</h4>
                  <p>{viewingPO.notes || 'Goods subject to warehouse quality inspections.'}</p>
                </div>
                <div className="text-right text-xs space-y-1.5 self-end">
                  <div className="flex justify-between font-bold text-sm text-slate-950 dark:text-white">
                    <span>Order Value (Gross):</span>
                    <span className="text-blue-600 dark:text-blue-450">{formatINR(viewingPO.total_amount)}</span>
                  </div>
                  {viewingPO.approver_name && (
                    <div className="text-[10px] text-slate-400">Approved by manager: {viewingPO.approver_name}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsViewOpen(false)}
                className="rounded-lg border border-slate-350 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50"
              >
                Close Review
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* REJECTION REASON MODAL */}
      <Modal isOpen={isRejectOpen} onClose={() => setIsRejectOpen(false)} title="Reject Purchase Order">
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">State Rejection Remarks *</label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Unit rate exceeds market value, or incorrect item specification requested..."
              className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={submittingReject}
              onClick={() => setIsRejectOpen(false)}
              className="rounded-lg border border-slate-300 dark:border-slate-750 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingReject}
              className="rounded-lg bg-red-600 hover:bg-red-550 px-4 py-2 text-sm font-semibold text-white shadow-sm"
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
