import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
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
      valid_until: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // 15 days validity
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
      const res = await getQuotationById(quotation.id);
      if (res.success) {
        const q = res.quotation;
        setFormHeader({
          customer_id: q.customer_id,
          date: q.date ? new Date(q.date).toISOString().slice(0, 10) : '',
          valid_until: q.valid_until ? new Date(q.valid_until).toISOString().slice(0, 10) : '',
          notes: q.notes || ''
        });
        setFormItems(res.items.map(item => ({
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
          // If we had a stock rate or custom price, we could fill it
          updated[index].unit_price = 0.00; // reset/default
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
    if (!formHeader.valid_until) return toast.error('Valid Until date is required.');
    
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
    { key: 'quotation_no', label: 'Quotation No' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'date', label: 'Date', render: (item) => formatDate(item.date) },
    { key: 'valid_until', label: 'Valid Until', render: (item) => formatDate(item.valid_until) },
    {
      key: 'status',
      label: 'Status',
      render: (item) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          item.status === 'Draft' ? 'bg-slate-100 text-slate-800 border border-slate-200' :
          item.status === 'Sent' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
          item.status === 'Approved' || item.status === 'Accepted' ? 'bg-green-100 text-green-800 border border-green-200' :
          'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {item.status}
        </span>
      )
    },
    { key: 'total_amount', label: 'Total Amount', render: (item) => formatINR(item.total_amount) },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewQuotation(item)}
            className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300 font-semibold text-xs bg-slate-50 dark:bg-slate-900/10 px-2 py-1 rounded-md"
          >
            Preview
          </button>
          {item.status === 'Draft' && hasPermission('sales', 'edit') && (
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
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Quotations Ledger</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Issue commercial offers, manage validity dates, and convert offers to Sales Orders.</p>
        </div>

        {hasPermission('sales', 'create') && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
          >
            Create Quotation
          </button>
        )}
      </div>

      {/* Filter toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <select
            value={selectedCustomer}
            onChange={(e) => { setSelectedCustomer(e.target.value); setPage(1); }}
            className="block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 px-4 text-sm text-slate-900 dark:text-white shadow-sm focus:outline-none"
          >
            <option value="">All Customers</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
            <option value="Sent">Sent</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Accepted">Accepted (Converted)</option>
          </select>
        </div>

        <div>
          <input
            type="date"
            placeholder="Start Date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 px-4 text-sm text-slate-900 dark:text-white shadow-sm focus:outline-none"
          />
        </div>

        <div>
          <input
            type="date"
            placeholder="End Date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 px-4 text-sm text-slate-900 dark:text-white shadow-sm focus:outline-none"
          />
        </div>
      </div>

      {/* Main Table */}
      <Table columns={columns} data={quotations} loading={loading} emptyMessage="No quotations found." />

      {/* Pagination */}
      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* CREATE & EDIT FORM MODAL */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingQuotation ? 'Edit Quotation Details' : 'Create Commercial Quotation'} size="xl">
        <form onSubmit={handleFormSubmit} className="space-y-6">
          {/* Header row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Customer Selection *</label>
              <select
                name="customer_id"
                required
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                value={formHeader.customer_id}
                onChange={handleHeaderChange}
              >
                <option value="" disabled>Select Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Document Date</label>
              <input
                type="date"
                name="date"
                required
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none"
                value={formHeader.date}
                onChange={handleHeaderChange}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Valid Until *</label>
              <input
                type="date"
                name="valid_until"
                required
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none"
                value={formHeader.valid_until}
                onChange={handleHeaderChange}
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Line Items</h4>
              <button
                type="button"
                onClick={handleAddRow}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800"
              >
                + Add Line Item
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950 shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase w-1/3">Item</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-center w-16">Qty</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase w-28">Unit Price</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase w-24">Discount</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-center w-16">Tax %</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right w-28">Total</th>
                    <th className="px-4 py-3 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {formItems.map((row, idx) => {
                    const rowSubtotal = (parseFloat(row.qty) || 0) * (parseFloat(row.unit_price) || 0);
                    const rowDiscount = parseFloat(row.discount) || 0;
                    const rowTaxAmt = (rowSubtotal - rowDiscount) * ((parseFloat(row.tax_pct) || 0) / 100);
                    const rowTotal = rowSubtotal - rowDiscount + rowTaxAmt;

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
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-1.5 px-2 text-sm text-slate-900 dark:text-white focus:outline-none"
                            value={row.discount}
                            onChange={(e) => handleItemRowChange(idx, 'discount', e.target.value)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-1.5 px-2 text-sm text-center text-slate-900 dark:text-white focus:outline-none"
                            value={row.tax_pct}
                            onChange={(e) => handleItemRowChange(idx, 'tax_pct', e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-2 text-sm font-semibold text-right text-slate-950 dark:text-white">
                          {formatINR(rowTotal)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            className="text-red-500 hover:text-red-700 p-1 rounded-lg"
                          >
                            {/* Trash Icon */}
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

          {/* Bottom row notes and totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Internal Notes / Terms</label>
              <textarea
                name="notes"
                rows={3}
                placeholder="Include banking details, delivery period, or warranty terms here..."
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                value={formHeader.notes}
                onChange={handleHeaderChange}
              />
            </div>

            {/* Totals Box */}
            <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Subtotal (Qty × Price):</span>
                <span className="font-medium">{formatINR(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>Flat Discounts (-):</span>
                <span className="font-medium text-green-600">-{formatINR(totals.totalDiscount)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>Integrated Taxes (+):</span>
                <span className="font-medium">{formatINR(totals.totalTax)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
                <span>Grand Total:</span>
                <span className="text-blue-600 dark:text-blue-400">{formatINR(totals.grandTotal)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Save Quotation (Draft)
            </button>
          </div>
        </form>
      </Modal>

      {/* PRINT PREVIEW MODAL */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Commercial Offer Preview" size="lg">
        {viewingQuotation && (
          <div className="space-y-6">
            {/* Action Toolbar */}
            <div className="flex flex-wrap justify-between items-center gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Status Actions:</span>
                {viewingQuotation.status === 'Draft' && (
                  <button
                    onClick={() => handleChangeStatus(viewingQuotation.id, 'Sent')}
                    className="bg-blue-600 text-white text-xs font-semibold px-2.5 py-1 rounded hover:bg-blue-500"
                  >
                    Mark as Sent
                  </button>
                )}
                {viewingQuotation.status === 'Sent' && (
                  <>
                    <button
                      onClick={() => handleChangeStatus(viewingQuotation.id, 'Approved')}
                      className="bg-green-600 text-white text-xs font-semibold px-2.5 py-1 rounded hover:bg-green-500"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleChangeStatus(viewingQuotation.id, 'Rejected')}
                      className="bg-red-600 text-white text-xs font-semibold px-2.5 py-1 rounded hover:bg-red-500"
                    >
                      Reject
                    </button>
                  </>
                )}
                {viewingQuotation.status === 'Approved' && (
                  <button
                    onClick={() => handleConvertToOrder(viewingQuotation.id)}
                    className="bg-green-600 text-white text-xs font-semibold px-2.5 py-1 rounded hover:bg-green-500"
                  >
                    Convert to Sales Order
                  </button>
                )}
              </div>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded hover:bg-slate-100"
              >
                Print PDF
              </button>
            </div>

            {/* Print Area Header */}
            <div className="p-6 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 space-y-6 print:border-none print:shadow-none">
              {/* Company Identity */}
              <div className="flex justify-between items-start border-b border-slate-150 pb-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">ERP ENTERPRISE</h2>
                  <p className="text-xs text-slate-400">123 Industrial Area, Phase II, New Delhi, India</p>
                  <p className="text-xs text-slate-400">GSTIN: 07AAAAA1111A1Z0</p>
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-bold text-blue-600 uppercase">Commercial Offer</h3>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{viewingQuotation.quotation_no}</p>
                  <p className="text-xs text-slate-400">Date: {formatDate(viewingQuotation.date)}</p>
                  <p className="text-xs text-red-600 font-semibold">Valid Until: {formatDate(viewingQuotation.valid_until)}</p>
                </div>
              </div>

              {/* Client and Ship info */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <h4 className="font-bold text-slate-500 uppercase mb-1">Issued To:</h4>
                  <p className="font-bold text-slate-900 dark:text-white">{viewingQuotation.customer_name}</p>
                  <p className="text-slate-500">{viewingQuotation.customer_address || 'No Address provided.'}</p>
                  <p className="text-slate-500">GSTIN: {viewingQuotation.customer_gstin || 'N/A'}</p>
                  <p className="text-slate-500">Email: {viewingQuotation.customer_email || 'N/A'}</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <th className="py-2.5 px-2 font-bold uppercase text-slate-500">Item Code / Description</th>
                    <th className="py-2.5 px-2 font-bold uppercase text-slate-500 text-center">Qty</th>
                    <th className="py-2.5 px-2 font-bold uppercase text-slate-500">Unit Price</th>
                    <th className="py-2.5 px-2 font-bold uppercase text-slate-500">Discount</th>
                    <th className="py-2.5 px-2 font-bold uppercase text-slate-500 text-center">Tax %</th>
                    <th className="py-2.5 px-2 font-bold uppercase text-slate-500 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {viewingItems.map((item, index) => (
                    <tr key={index}>
                      <td className="py-2 px-2">
                        <div className="font-bold text-slate-900 dark:text-white">{item.item_name}</div>
                        <div className="text-[10px] text-slate-400">{item.item_code}</div>
                      </td>
                      <td className="py-2 px-2 text-center">{parseFloat(item.qty)}</td>
                      <td className="py-2 px-2">{formatINR(item.unit_price)}</td>
                      <td className="py-2 px-2 text-green-600">-{formatINR(item.discount)}</td>
                      <td className="py-2 px-2 text-center">{parseFloat(item.tax_pct)}%</td>
                      <td className="py-2 px-2 text-right font-bold text-slate-900 dark:text-white">{formatINR(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary and notes row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="text-xs text-slate-500">
                  <h4 className="font-bold uppercase mb-1">Terms & Conditions</h4>
                  <p className="whitespace-pre-line">{viewingQuotation.notes || 'All values in INR. Subject to standard industrial terms.'}</p>
                </div>
                <div className="text-right text-xs space-y-1.5 self-end">
                  <div className="flex justify-between font-bold text-sm text-slate-950 dark:text-white">
                    <span>Total Amount Due:</span>
                    <span className="text-blue-600 dark:text-blue-400">{formatINR(viewingQuotation.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsViewOpen(false)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50"
              >
                Close Preview
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default QuotationsPage;
