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
        title="Quotation & Commercial Offer"
        size="xl"
      >
        {viewingQuotation && (() => {
          const subtotal = viewingItems.reduce((acc, it) => acc + (parseFloat(it.qty || 0) * parseFloat(it.unit_price || 0)), 0);
          const totalDiscount = viewingItems.reduce((acc, it) => acc + parseFloat(it.discount || 0), 0);
          const grandTotal = parseFloat(viewingQuotation.total_amount) || 0;
          const totalTax = Math.max(0, grandTotal - (subtotal - totalDiscount));

          return (
            <div className="space-y-6">
              {/* Action Toolbar */}
              <div className="sheet p-3 flex flex-wrap justify-between items-center gap-2 no-print">
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="btn btn-primary btn-sm inline-flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" /> Print / Save PDF
                  </button>
                  <a
                    href={`/print/quotation/${viewingQuotation.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm inline-flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Full page
                  </a>
                </div>
              </div>

              {/* Printable Enterprise Document (Invoice / Quotation Format) */}
              <div className="printable-document bg-white text-slate-900 border border-slate-300 rounded-lg p-6 sm:p-8 shadow-sm print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none">
                {/* Header: Company Details & Document Title */}
                <div className="flex flex-col sm:flex-row justify-between items-start pb-5 border-b-2 border-slate-800 gap-4">
                  <div className="flex items-start gap-3.5">
                    <img
                      src="/logo.svg"
                      alt="ERP Nexus Logo"
                      className="h-12 w-12 object-contain rounded mt-0.5"
                    />
                    <div>
                      <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
                        {COMPANY_NAME}
                      </h1>
                      <p className="text-xs text-slate-600 mt-0.5 max-w-md leading-relaxed">
                        {COMPANY_ADDRESS}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-600 mt-1 font-mono">
                        <span><strong className="text-slate-800 font-sans font-medium">GSTIN:</strong> {COMPANY_GSTIN}</span>
                        <span><strong className="text-slate-800 font-sans font-medium">PAN:</strong> AAAAA1111A</span>
                        <span><strong className="text-slate-800 font-sans font-medium">State:</strong> Delhi (07)</span>
                      </div>
                    </div>
                  </div>

                  {/* Document Identity Block */}
                  <div className="text-left sm:text-right border-2 border-slate-800 rounded bg-slate-50 px-3.5 py-2.5 text-xs min-w-[220px]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Official Document
                    </div>
                    <div className="text-base font-bold text-slate-900 tracking-tight">
                      COMMERCIAL QUOTATION
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-300 space-y-1">
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Quotation No:</span>
                        <span className="font-mono font-bold text-slate-900">{viewingQuotation.quotation_no}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Date:</span>
                        <span className="font-mono text-slate-800">{formatDate(viewingQuotation.date)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Valid Until:</span>
                        <span className="font-mono font-semibold text-rose-700">{formatDate(viewingQuotation.valid_until)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Status:</span>
                        <span className="font-semibold uppercase text-blue-700">{viewingQuotation.status}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Buyer / Client and Terms Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5 text-xs">
                  {/* Bill To */}
                  <div className="border border-slate-300 rounded p-3 bg-slate-50/60">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-200">
                      Billed To / Buyer Details
                    </div>
                    <div className="pt-2">
                      <p className="text-sm font-bold text-slate-900">{viewingQuotation.customer_name}</p>
                      <p className="text-slate-600 mt-1 leading-relaxed">
                        {viewingQuotation.customer_address || 'Address on file'}
                      </p>
                      <div className="mt-2 space-y-0.5 font-mono text-slate-600">
                        <p><span className="text-slate-500 font-sans">GSTIN:</span> <strong className="text-slate-800">{viewingQuotation.customer_gstin || 'Unregistered / NA'}</strong></p>
                        {viewingQuotation.customer_email && (
                          <p><span className="text-slate-500 font-sans">Email:</span> {viewingQuotation.customer_email}</p>
                        )}
                        {viewingQuotation.customer_phone && (
                          <p><span className="text-slate-500 font-sans">Phone:</span> {viewingQuotation.customer_phone}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Supply & Payment Terms */}
                  <div className="border border-slate-300 rounded p-3 bg-slate-50/60">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-200">
                      Supply & Commercial Terms
                    </div>
                    <div className="pt-2 space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Payment Terms:</span>
                        <span className="font-medium text-slate-800">Standard 30 Days Net</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Place of Supply:</span>
                        <span className="font-medium text-slate-800">
                          {viewingQuotation.customer_address ? viewingQuotation.customer_address.split(',').pop().trim() : 'As per client destination'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Dispatch Mode:</span>
                        <span className="font-medium text-slate-800">Road Transport / Logistics Partner</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Currency:</span>
                        <span className="font-medium text-slate-800">Indian Rupee (INR - ₹)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="my-5 overflow-x-auto border border-slate-300 rounded">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                        <th className="py-2 px-2 text-center w-8 border-r border-slate-300">#</th>
                        <th className="py-2 px-3 text-left border-r border-slate-300">Item Description & Specification</th>
                        <th className="py-2 px-2 text-center w-16 border-r border-slate-300">HSN</th>
                        <th className="py-2 px-2 text-center w-14 border-r border-slate-300">Qty</th>
                        <th className="py-2 px-3 text-right w-24 border-r border-slate-300">Rate (₹)</th>
                        <th className="py-2 px-2 text-right w-20 border-r border-slate-300">Discount</th>
                        <th className="py-2 px-2 text-center w-14 border-r border-slate-300">Tax %</th>
                        <th className="py-2 px-3 text-right w-28">Amount (₹)</th>
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
                          <td className="py-2 px-2 text-center font-mono font-medium text-slate-800 border-r border-slate-200">
                            {parseFloat(item.qty)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-800 border-r border-slate-200">
                            {formatINR(item.unit_price)}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-emerald-700 border-r border-slate-200">
                            {parseFloat(item.discount || 0) > 0 ? `-${formatINR(item.discount)}` : '—'}
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-slate-700 border-r border-slate-200">
                            {parseFloat(item.tax_pct)}%
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {formatINR(item.line_total)}
                          </td>
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
                        {numberToIndianWords(grandTotal)}
                      </p>
                    </div>

                    <div className="border border-slate-200 rounded p-2.5 bg-slate-50/50 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                        Bank Details for Wire Transfer:
                      </span>
                      <div className="grid grid-cols-2 gap-x-2 text-[11px] font-mono text-slate-700">
                        <div><span className="text-slate-500 font-sans">Bank:</span> HDFC Bank Ltd.</div>
                        <div><span className="text-slate-500 font-sans">A/C No:</span> 50200012345678</div>
                        <div><span className="text-slate-500 font-sans">IFSC Code:</span> HDFC0001234</div>
                        <div><span className="text-slate-500 font-sans">Branch:</span> New Delhi</div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Financial Summary Box */}
                  <div className="border border-slate-300 rounded overflow-hidden text-xs self-start">
                    <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-700 border-b border-slate-300 uppercase tracking-wider text-[10px]">
                      Financial Summary
                    </div>
                    <div className="p-3 space-y-1.5">
                      <div className="flex justify-between text-slate-600">
                        <span>Taxable Subtotal:</span>
                        <span className="font-mono">{formatINR(subtotal)}</span>
                      </div>
                      {totalDiscount > 0 && (
                        <div className="flex justify-between text-emerald-700">
                          <span>Total Discount:</span>
                          <span className="font-mono">-{formatINR(totalDiscount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-600">
                        <span>Total GST / Tax:</span>
                        <span className="font-mono">{formatINR(totalTax)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t-2 border-slate-800 text-sm font-bold text-slate-900 bg-slate-50 -mx-3 -mb-3 p-3">
                        <span className="uppercase tracking-tight">Total Amount Due:</span>
                        <span className="font-mono text-base text-blue-700">{formatINR(grandTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Terms and Signatures */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 mt-3 border-t border-slate-300 text-xs">
                  <div className="text-slate-600 space-y-1">
                    <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Standard Terms & Conditions:</h4>
                    <p className="whitespace-pre-line leading-relaxed text-[11px]">
                      {viewingQuotation.notes || `1. Quotation valid until the validity date specified above.
2. GST and applicable government levies charged at actuals at time of billing.
3. Delivery within 2-3 weeks from confirmed purchase order.
4. Warranty: Standard 12 months manufacturer warranty against manufacturing defects.`}
                    </p>
                  </div>

                  <div className="text-left sm:text-right flex flex-col justify-between items-start sm:items-end min-h-[80px]">
                    <div className="text-slate-700 font-bold uppercase text-[11px]">
                      For {COMPANY_NAME}
                    </div>
                    <div className="w-48 border-t border-slate-400 pt-1 text-center mt-6">
                      <p className="font-semibold text-slate-800">Authorized Signatory</p>
                      <p className="text-[10px] text-slate-500">Commercial / Sales Division</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Close Button Footer */}
              <div className="flex justify-end gap-2 pt-4 border-t border-border-color no-print">
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
    </div>
  );
};

export default QuotationsPage;
