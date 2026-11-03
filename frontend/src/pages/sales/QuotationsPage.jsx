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
  getQuotations, 
  createQuotation, 
  updateQuotation, 
  updateQuotationStatus, 
  convertQuotationToOrder, 
  getCustomers 
} from '../../api/salesApi';
import { getItems as getStoreItems } from '../../api/storeApi';
import { formatINR } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

const QuotationsPage = () => {
  const { hasPermission } = useRole();

  // State Management
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters & Pagination
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [viewingQuotation, setViewingQuotation] = useState(null);
  const [viewingItems, setViewingItems] = useState([]);

  // Form State
  const [formHeader, setFormHeader] = useState({
    customer_id: '',
    date: new Date().toISOString().slice(0, 10),
    valid_until: '',
    notes: ''
  });
  const [formItems, setFormItems] = useState([
    { item_id: '', qty: 1, unit_price: 0.00, discount: 0.00, tax_pct: 18 }
  ]);

  // Fetch Quotations List
  const fetchQuotationsList = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        status: selectedStatus,
        customerId: selectedCustomer,
        startDate,
        endDate,
        search,
        page,
        limit: 25
      };
      const data = await getQuotations(filters);
      if (data.success) {
        setQuotations(data.quotations);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load quotations.');
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, selectedCustomer, startDate, endDate, search, page]);

  // Fetch Metadata (Customers & Items)
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [custData, itemsRes] = await Promise.all([
          getCustomers({ page: 1, limit: 100 }),
          getStoreItems()
        ]);
        if (custData.success) setCustomers(custData.customers);
        if (itemsRes.success) setItemsList(itemsRes.items);
      } catch (err) {
        console.error('Failed to load dropdown metadata.', err);
      }
    };
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchQuotationsList();
  }, [fetchQuotationsList]);

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingQuotation(null);
    setFormHeader({
      customer_id: customers[0]?.id || '',
      date: new Date().toISOString().slice(0, 10),
      valid_until: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      notes: ''
    });
    setFormItems([{ item_id: itemsList[0]?.id || '', qty: 1, unit_price: 0.00, discount: 0.00, tax_pct: 18 }]);
    setIsFormOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = async (quotation) => {
    if (quotation.status !== 'Draft') {
      return toast.error('Only Draft quotations can be updated.');
    }
    setEditingQuotation(quotation);
    
    // Fetch details with items
    try {
      const res = await axiosInstance.get(`/sales/quotations/${quotation.id}`);
      if (res.data?.success) {
        const q = res.data.quotation;
        setFormHeader({
          customer_id: q.customer_id,
          date: q.date ? new Date(q.date).toISOString().slice(0, 10) : '',
          valid_until: q.valid_until ? new Date(q.valid_until).toISOString().slice(0, 10) : '',
          notes: q.notes || ''
        });
        setFormItems(res.data.items.map(item => ({
          item_id: item.item_id,
          qty: parseFloat(item.qty),
          unit_price: parseFloat(item.unit_price),
          discount: parseFloat(item.discount),
          tax_pct: parseFloat(item.tax_pct)
        })));
        setIsFormOpen(true);
      }
    } catch (err) {
      toast.error('Failed to load quotation details.');
    }
  };

  // Handle Header Changes
  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setFormHeader(prev => ({ ...prev, [name]: value }));
  };

  // Handle Item Row Changes
  const handleItemRowChange = (index, field, value) => {
    setFormItems(prev => {
      const updated = [...prev];
      updated[index][field] = value;
      
      // Auto-populate price if item changes
      if (field === 'item_id') {
        const selectedItem = itemsList.find(i => i.id === value);
        if (selectedItem) {
          updated[index].unit_price = 0.00;
        }
      }
      return updated;
    });
  };

  // Add Row
  const handleAddRow = () => {
    setFormItems(prev => [...prev, { item_id: itemsList[0]?.id || '', qty: 1, unit_price: 0.00, discount: 0.00, tax_pct: 18 }]);
  };

  // Remove Row
  const handleRemoveRow = (index) => {
    if (formItems.length === 1) return toast.error('At least one item is required.');
    setFormItems(prev => prev.filter((_, i) => i !== index));
  };

  // Calculate Running totals for header form display
  const calculateTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    formItems.forEach(item => {
      const qty = parseFloat(item.qty) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const disc = parseFloat(item.discount) || 0;
      const taxPct = parseFloat(item.tax_pct) || 0;

      const rowSubtotal = qty * price;
      subtotal += rowSubtotal;
      totalDiscount += disc;

      const rowTaxable = rowSubtotal - disc;
      totalTax += rowTaxable * (taxPct / 100);
    });

    const grandTotal = subtotal - totalDiscount + totalTax;

    return { subtotal, totalDiscount, totalTax, grandTotal };
  };

  const totals = calculateTotals();

  // Submit form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formHeader.customer_id) return toast.error('Customer is required.');
    if (!formHeader.valid_until) return toast.error('Valid until date is required.');
    
    const invalidItem = formItems.some(i => !i.item_id || i.qty <= 0 || i.unit_price < 0);
    if (invalidItem) return toast.error('All items must have valid quantity (>0) and price (>=0).');

    try {
      const payload = {
        ...formHeader,
        items: formItems
      };

      if (editingQuotation) {
        await updateQuotation(editingQuotation.id, payload);
        toast.success('Quotation updated successfully.');
      } else {
        await createQuotation(payload);
        toast.success('Quotation created successfully.');
      }
      setIsFormOpen(false);
      fetchQuotationsList();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save quotation.');
    }
  };

  // View Details
  const handleViewQuotation = async (quotation) => {
    try {
      const res = await axiosInstance.get(`/sales/quotations/${quotation.id}`);
      if (res.data?.success) {
        setViewingQuotation(res.data.quotation);
        setViewingItems(res.data.items);
        setIsViewOpen(true);
      }
    } catch (err) {
      toast.error('Failed to load quotation.');
    }
  };

  // Change Status
  const handleChangeStatus = async (id, status) => {
    try {
      await updateQuotationStatus(id, status);
      toast.success(`Quotation marked as ${status}.`);
      setIsViewOpen(false);
      fetchQuotationsList();
    } catch (err) {
      toast.error('Failed to update status.');
    }
  };

  // Convert to Sales Order
  const handleConvertToOrder = async (id) => {
    try {
      const data = await convertQuotationToOrder(id);
      if (data.success) {
        toast.success('Converted to Sales Order successfully.');
        setIsViewOpen(false);
        fetchQuotationsList();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Conversion failed.');
    }
  };

  // Columns for main table
  const columns = [
    {
      key: 'quotation_no',
      label: 'Quotation no',
      render: (item) => <span className="stamp">{item.quotation_no}</span>
    },
    { key: 'customer_name', label: 'Customer' },
    { key: 'date', label: 'Date', render: (item) => formatDate(item.date) },
    { key: 'valid_until', label: 'Valid until', render: (item) => formatDate(item.valid_until) },
    {
      key: 'status',
      label: 'Status',
      render: (item) => <StatusBadge status={item.status} />
    },
    {
      key: 'total_amount',
      label: 'Total amount',
      isNumeric: true,
      render: (item) => formatINR(item.total_amount)
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewQuotation(item)}
            className="btn btn-ghost btn-sm"
          >
            Preview
          </button>
          {item.status === 'Draft' && hasPermission('sales', 'edit') && (
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
      {/* Header section */}
      <PageHeader
        title="Quotations"
        description="Issue commercial offers, manage validity dates, and convert offers to Sales Orders."
        actions={
          hasPermission('sales', 'create') ? (
            <button
              onClick={handleOpenCreate}
              className="btn btn-primary"
            >
              Create quotation
            </button>
          ) : null
        }
      />

      {/* Filter toolbar */}
      <div className="sheet p-3 flex flex-wrap items-end gap-3">
        <div className="w-48">
          <label className="field-label">Customer</label>
          <select
            value={selectedCustomer}
            onChange={(e) => { setSelectedCustomer(e.target.value); setPage(1); }}
            className="field"
          >
            <option value="">All customers</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
            <option value="Sent">Sent</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Accepted">Accepted (Converted)</option>
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
      <Table columns={columns} data={quotations} loading={loading} emptyMessage="No quotations found." />

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* CREATE & EDIT FORM MODAL */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingQuotation ? 'Edit quotation details' : 'Create quotation'}
        size="xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-6">
          {/* Header row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="field-label">Customer *</label>
              <select
                name="customer_id"
                required
                className="field"
                value={formHeader.customer_id}
                onChange={handleHeaderChange}
              >
                <option value="" disabled>Select customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="field-label">Document date</label>
              <input
                type="date"
                name="date"
                required
                className="field"
                value={formHeader.date}
                onChange={handleHeaderChange}
              />
            </div>

            <div>
              <label className="field-label">Valid until *</label>
              <input
                type="date"
                name="valid_until"
                required
                className="field"
                value={formHeader.valid_until}
                onChange={handleHeaderChange}
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold text-text-primary">Line items</h4>
              <button
                type="button"
                onClick={handleAddRow}
                className="btn btn-ghost btn-sm"
              >
                + Add line item
              </button>
            </div>

            <div className="sheet overflow-x-auto">
              <table className="bom min-w-[700px]">
                <thead>
                  <tr>
                    <th className="w-1/3">Item</th>
                    <th className="text-center w-20">Qty</th>
                    <th className="w-28 text-right">Unit price</th>
                    <th className="w-24 text-right">Discount</th>
                    <th className="text-center w-20">Tax %</th>
                    <th className="text-right w-28">Total</th>
                    <th className="text-center w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {formItems.map((row, idx) => {
                    const rowSubtotal = (parseFloat(row.qty) || 0) * (parseFloat(row.unit_price) || 0);
                    const rowDiscount = parseFloat(row.discount) || 0;
                    const rowTaxAmt = (rowSubtotal - rowDiscount) * ((parseFloat(row.tax_pct) || 0) / 100);
                    const rowTotal = rowSubtotal - rowDiscount + rowTaxAmt;

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
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="field !min-h-[30px] !py-1 text-xs text-right"
                            value={row.discount}
                            onChange={(e) => handleItemRowChange(idx, 'discount', e.target.value)}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            className="field !min-h-[30px] !py-1 text-xs text-center"
                            value={row.tax_pct}
                            onChange={(e) => handleItemRowChange(idx, 'tax_pct', e.target.value)}
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

          {/* Bottom row notes and totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border-color">
            <div>
              <label className="field-label">Internal notes / terms</label>
              <textarea
                name="notes"
                rows={3}
                placeholder="Include banking details, delivery period, or warranty terms here…"
                className="field"
                value={formHeader.notes}
                onChange={handleHeaderChange}
              />
            </div>

            {/* Totals Box */}
            <div className="sheet p-4 space-y-2">
              <div className="flex justify-between text-sm text-text-secondary">
                <span>Subtotal (Qty × Price):</span>
                <span className="font-medium tabular-nums">{formatINR(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-text-secondary">
                <span>Flat discounts (-):</span>
                <span className="font-medium text-[var(--success-text)] tabular-nums">-{formatINR(totals.totalDiscount)}</span>
              </div>
              <div className="flex justify-between text-sm text-text-secondary">
                <span>Taxes (+):</span>
                <span className="font-medium tabular-nums">{formatINR(totals.totalTax)}</span>
              </div>
              <div className="dim-line my-2" />
              <div className="flex justify-between text-base font-semibold text-text-primary">
                <span>Grand total:</span>
                <span className="text-accent-primary tabular-nums">{formatINR(totals.grandTotal)}</span>
              </div>
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
              Save quotation (Draft)
            </button>
          </div>
        </form>
      </Modal>

      {/* PRINT PREVIEW MODAL */}
      <Modal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        title="Commercial offer preview"
        size="lg"
      >
        {viewingQuotation && (
          <div className="space-y-6">
            {/* Action Toolbar */}
            <div className="sheet p-3 flex flex-wrap justify-between items-center gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-text-secondary">Stage actions:</span>
                {viewingQuotation.status === 'Draft' && (
                  <button
                    onClick={() => handleChangeStatus(viewingQuotation.id, 'Sent')}
                    className="btn btn-primary btn-sm"
                  >
                    Mark as Sent
                  </button>
                )}
                {viewingQuotation.status === 'Sent' && (
                  <>
                    <button
                      onClick={() => handleChangeStatus(viewingQuotation.id, 'Approved')}
                      className="btn btn-primary btn-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleChangeStatus(viewingQuotation.id, 'Rejected')}
                      className="btn btn-danger btn-sm"
                    >
                      Reject
                    </button>
                  </>
                )}
                {viewingQuotation.status === 'Approved' && (
                  <button
                    onClick={() => handleConvertToOrder(viewingQuotation.id)}
                    className="btn btn-primary btn-sm"
                  >
                    Convert to Sales Order
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

            {/* Printable Document Frame (Literal bg-white text-black allowed inside preview) */}
            <div className="sheet p-6 bg-white text-black space-y-6 print:border-none print:shadow-none print:p-0">
              {/* Company Identity */}
              <div className="flex justify-between items-start border-b border-gray-200 pb-4">
                <div>
                  <h2 className="text-xl font-semibold text-black">ERP ENTERPRISE</h2>
                  <p className="text-xs text-gray-500">123 Industrial Area, Phase II, New Delhi, India</p>
                  <p className="text-xs text-gray-500">GSTIN: 07AAAAA1111A1Z0</p>
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-semibold text-blue-600">Commercial Offer</h3>
                  <p className="text-sm font-semibold text-black">{viewingQuotation.quotation_no}</p>
                  <p className="text-xs text-gray-500">Date: {formatDate(viewingQuotation.date)}</p>
                  <p className="text-xs text-red-600 font-semibold">Valid Until: {formatDate(viewingQuotation.valid_until)}</p>
                </div>
              </div>

              {/* Client and Ship info */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <h4 className="font-semibold text-gray-500 mb-1">Issued To:</h4>
                  <p className="font-semibold text-black">{viewingQuotation.customer_name}</p>
                  <p className="text-gray-500">{viewingQuotation.customer_address || 'No Address provided.'}</p>
                  <p className="text-gray-500">GSTIN: {viewingQuotation.customer_gstin || 'N/A'}</p>
                  <p className="text-gray-500">Email: {viewingQuotation.customer_email || 'N/A'}</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gray-50">
                    <th className="py-2.5 px-2 font-semibold text-gray-600">Item Code / Description</th>
                    <th className="py-2.5 px-2 font-semibold text-gray-600 text-center">Qty</th>
                    <th className="py-2.5 px-2 font-semibold text-gray-600">Unit Price</th>
                    <th className="py-2.5 px-2 font-semibold text-gray-600">Discount</th>
                    <th className="py-2.5 px-2 font-semibold text-gray-600 text-center">Tax %</th>
                    <th className="py-2.5 px-2 font-semibold text-gray-600 text-right">Line Total</th>
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
                      <td className="py-2 px-2 text-green-600">-{formatINR(item.discount)}</td>
                      <td className="py-2 px-2 text-center">{parseFloat(item.tax_pct)}%</td>
                      <td className="py-2 px-2 text-right font-semibold text-black">{formatINR(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary and notes row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  <h4 className="font-semibold mb-1">Terms & Conditions</h4>
                  <p className="whitespace-pre-line">{viewingQuotation.notes || 'All values in INR. Subject to standard industrial terms.'}</p>
                </div>
                <div className="text-right text-xs space-y-1.5 self-end">
                  <div className="flex justify-between font-semibold text-sm text-black">
                    <span>Total Amount Due:</span>
                    <span className="text-blue-600">{formatINR(viewingQuotation.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
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
    </div>
  );
};

export default QuotationsPage;
