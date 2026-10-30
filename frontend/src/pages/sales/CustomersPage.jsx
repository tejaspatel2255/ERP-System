import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import SearchBar from '../../components/SearchBar';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { useRole } from '../../context/RoleContext';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, getCustomerById } from '../../api/salesApi';
import { formatINR } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

const CustomersPage = () => {
  const { hasPermission } = useRole();

  // State Management
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewingDetails, setViewingDetails] = useState(null);
  const [viewingHistory, setViewingHistory] = useState({ quotations: [], orders: [], invoices: [], payments: [] });
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    gstin: '',
    credit_limit: '0.00'
  });

  // Fetch Customers
  const fetchCustomersList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCustomers({ search, page, limit: 25 });
      if (data.success) {
        setCustomers(data.customers);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load customers.');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchCustomersList();
  }, [fetchCustomersList]);

  // Handle Input Changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      gstin: '',
      credit_limit: '0.00'
    });
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      gstin: customer.gstin || '',
      credit_limit: customer.credit_limit
    });
    setIsFormModalOpen(true);
  };

  // Save Customer (Create/Edit)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Customer name is required.');

    // Validate GSTIN format if provided (max 15 character alpha-numeric)
    if (formData.gstin.trim() && formData.gstin.trim().length > 15) {
      return toast.error('GSTIN cannot exceed 15 characters.');
    }

    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, formData);
        toast.success('Customer updated successfully.');
      } else {
        await createCustomer(formData);
        toast.success('Customer created successfully.');
      }
      setIsFormModalOpen(false);
      fetchCustomersList();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save customer failed.');
    }
  };

  // Delete Customer
  const handleDelete = async (customer) => {
    if (window.confirm(`Are you sure you want to deactivate customer '${customer.name}'?`)) {
      try {
        await deleteCustomer(customer.id);
        toast.success('Customer deactivated.');
        fetchCustomersList();
      } catch (err) {
        toast.error('Deactivation failed.');
      }
    }
  };

  // View Customer Profile & History Dossier
  const handleViewCustomer = async (customer) => {
    setViewingDetails(customer);
    setIsViewModalOpen(true);
    setHistoryLoading(true);
    setViewingHistory({ quotations: [], orders: [], invoices: [], payments: [] });

    try {
      const data = await getCustomerById(customer.id);
      if (data.success) {
        setViewingHistory(data.history);
      }
    } catch (err) {
      toast.error('Failed to load customer details.');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Columns Configuration
  const columns = [
    {
      key: 'name',
      label: 'Company / Client Name',
      render: (item) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-text-primary">{item.name}</span>
          {item.gstin && <span className="stamp text-[10px]">{item.gstin}</span>}
        </div>
      )
    },
    { key: 'email', label: 'Email', render: (item) => <span className="font-mono text-xs text-text-secondary">{item.email || 'N/A'}</span> },
    { key: 'phone', label: 'Phone', render: (item) => <span className="font-mono text-xs text-text-secondary">{item.phone || 'N/A'}</span> },
    { key: 'gstin', label: 'GSTIN Registration', render: (item) => <span className="font-mono text-xs text-accent-primary font-bold">{item.gstin || 'N/A'}</span> },
    {
      key: 'credit_limit',
      label: 'Credit Limit',
      isNumeric: true,
      render: (item) => formatINR(item.credit_limit)
    },
    {
      key: 'balance',
      label: 'Trade Outstanding',
      isNumeric: true,
      render: (item) => (
        <span className={`font-mono font-bold ${parseFloat(item.balance) > 0 ? 'text-[var(--accent-danger)]' : 'text-text-primary'}`}>
          {formatINR(item.balance)}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleViewCustomer(item)}
            className="btn btn-ghost btn-sm text-[11px]"
          >
            View
          </button>
          {hasPermission('sales', 'edit') && (
            <button
              onClick={() => handleOpenEdit(item)}
              className="btn btn-ghost btn-sm text-[11px] text-accent-primary"
            >
              Edit
            </button>
          )}
          {hasPermission('sales', 'delete') && (
            <button
              onClick={() => handleDelete(item)}
              className="btn btn-danger btn-sm text-[11px]"
            >
              Delete
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 animate-fadeIn font-sans">
      {/* Header section */}
      <PageHeader
        title="Commercial Customer CRM"
        description="Manage enterprise client accounts, trade credit boundaries, and cross-module financial ledgers."
        actions={
          hasPermission('sales', 'create') && (
            <button
              onClick={handleOpenCreate}
              className="btn btn-primary btn-sm"
            >
              + Add Customer Account
            </button>
          )
        }
      />

      {/* Filter and search bar rail */}
      <div className="sheet p-3 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[240px]">
          <span className="field-label">Search Client Directory</span>
          <SearchBar value={search} onChange={(val) => { setSearch(val); setPage(1); }} placeholder="Filter clients by commercial name, email, or phone..." />
        </div>
        <div className="flex items-center gap-2">
          <span className="sheet-tag text-text-muted">ZONE // Z01</span>
        </div>
      </div>

      {/* Main Table */}
      <Table columns={columns} data={customers} loading={loading} emptyMessage="No customer client accounts matched search query." />

      {/* Pagination */}
      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* CREATE & EDIT FORM MODAL */}
      <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title={editingCustomer ? 'Edit Customer Account' : 'Create Customer Account Record'}>
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Company / Customer Name *</label>
              <input
                type="text"
                name="name"
                required
                className="field"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Apex Industrial Corp"
              />
            </div>

            <div>
              <label className="field-label">GSTIN (Optional)</label>
              <input
                type="text"
                name="gstin"
                placeholder="15-digit Alpha-numeric"
                className="field font-mono"
                value={formData.gstin}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="field-label">Email Address</label>
              <input
                type="email"
                name="email"
                className="field"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="procurement@client.com"
              />
            </div>

            <div>
              <label className="field-label">Contact Phone</label>
              <input
                type="text"
                name="phone"
                className="field font-mono"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="field-label">Billing / Shipping Address</label>
              <textarea
                name="address"
                rows={2}
                className="field"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Plot 42, Industrial Area, Sector 5..."
              />
            </div>

            <div>
              <label className="field-label">Credit Limit (INR)</label>
              <input
                type="number"
                step="0.01"
                name="credit_limit"
                className="field font-mono"
                value={formData.credit_limit}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="dim-line my-4" />

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              Save Customer Account
            </button>
          </div>
        </form>
      </Modal>

      {/* PROFILE DETAILS VIEW MODAL */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Customer Profile & Ledger Details" size="lg">
        {viewingDetails && (
          <div className="space-y-5">
            {/* Summary Telemetry Panel (Party record style) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 sheet bg-bg-card">
              <div>
                <span className="sheet-tag text-text-muted block mb-1">RECORD IDENTITY</span>
                <p className="text-base font-bold text-text-primary font-mono">{viewingDetails.name}</p>
                <p className="text-xs text-text-secondary mt-0.5">{viewingDetails.email || 'No email'}</p>
                <p className="text-xs text-text-secondary font-mono">{viewingDetails.phone || 'No phone'}</p>
              </div>
              <div>
                <span className="sheet-tag text-text-muted block mb-1">TAX & LOCATION</span>
                <p className="text-xs font-mono font-bold text-accent-primary">
                  GSTIN: {viewingDetails.gstin ? <span className="stamp">{viewingDetails.gstin}</span> : 'Unspecified'}
                </p>
                <p className="text-xs text-text-secondary mt-1 max-w-[200px] truncate">{viewingDetails.address || 'No address registered'}</p>
              </div>
              <div>
                <span className="sheet-tag text-text-muted block mb-1">CREDIT BOUNDARY</span>
                <p className="text-xs text-text-secondary">Limit: <span className="font-mono font-bold text-text-primary">{formatINR(viewingDetails.credit_limit)}</span></p>
                <p className="text-xs text-text-secondary mt-1">
                  Outstanding:{' '}
                  <span className={`font-mono font-bold ${parseFloat(viewingDetails.balance) > 0 ? 'text-[var(--accent-danger)]' : 'text-[var(--accent-success)]'}`}>
                    {formatINR(viewingDetails.balance)}
                  </span>
                </p>
              </div>
            </div>

            {/* Sub-ledgers */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border-color pb-1.5">
                <span className="font-display uppercase tracking-wider text-base text-text-primary font-bold">
                  Transaction History Sub-Ledgers
                </span>
                <span className="sheet-tag text-text-muted">CLOSED LOOP AUDIT</span>
              </div>
              
              {historyLoading ? (
                <div className="py-10 flex items-center justify-center font-mono text-xs text-text-muted gap-2">
                  <div className="animate-spin h-5 w-5 border-2 border-border-color border-t-accent-primary" />
                  <span>LOADING SUB-LEDGERS...</span>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Quotations Sub-ledger */}
                  <div className="space-y-1.5">
                    <span className="sheet-tag text-text-muted block font-bold">// COMMERCIAL QUOTATIONS</span>
                    <Table
                      columns={[
                        { key: 'quotation_no', label: 'Quotation Ref' },
                        { key: 'date', label: 'Date', render: (item) => formatDate(item.date) },
                        { key: 'valid_until', label: 'Valid Until', render: (item) => formatDate(item.valid_until) },
                        { key: 'status', label: 'Status', render: (item) => <StatusBadge status={item.status} /> },
                        { key: 'total_amount', label: 'Total Value', isNumeric: true, render: (item) => formatINR(item.total_amount) }
                      ]}
                      data={viewingHistory.quotations}
                      emptyMessage="No commercial quotations logged for this client."
                    />
                  </div>

                  {/* Orders Sub-ledger */}
                  <div className="space-y-1.5">
                    <span className="sheet-tag text-text-muted block font-bold">// SALES ORDERS</span>
                    <Table
                      columns={[
                        { key: 'order_no', label: 'Order Ref' },
                        { key: 'order_date', label: 'Order Date', render: (item) => formatDate(item.order_date) },
                        { key: 'status', label: 'Status', render: (item) => <StatusBadge status={item.status} /> },
                        { key: 'total_amount', label: 'Order Value', isNumeric: true, render: (item) => formatINR(item.total_amount) }
                      ]}
                      data={viewingHistory.orders}
                      emptyMessage="No sales orders logged for this client."
                    />
                  </div>

                  {/* Invoices Sub-ledger */}
                  <div className="space-y-1.5">
                    <span className="sheet-tag text-text-muted block font-bold">// BILLING INVOICES</span>
                    <Table
                      columns={[
                        { key: 'invoice_no', label: 'Invoice Ref' },
                        { key: 'invoice_date', label: 'Billing Date', render: (item) => formatDate(item.invoice_date) },
                        { key: 'due_date', label: 'Due Date', render: (item) => formatDate(item.due_date) },
                        { key: 'status', label: 'Status', render: (item) => <StatusBadge status={item.status} /> },
                        { key: 'total_amount', label: 'Billed Value', isNumeric: true, render: (item) => formatINR(item.total_amount) },
                        { key: 'paid_amount', label: 'Collected Value', isNumeric: true, render: (item) => formatINR(item.paid_amount) }
                      ]}
                      data={viewingHistory.invoices}
                      emptyMessage="No billing invoices logged for this client."
                    />
                  </div>

                  {/* Payments Sub-ledger */}
                  <div className="space-y-1.5">
                    <span className="sheet-tag text-text-muted block font-bold">// COLLECTED RECEIPTS</span>
                    <Table
                      columns={[
                        { key: 'payment_date', label: 'Receipt Date', render: (item) => formatDate(item.payment_date) },
                        { key: 'invoice_no', label: 'Invoice Ref' },
                        { key: 'payment_mode', label: 'Instrument Mode', render: (item) => <span className="font-mono text-xs">{item.payment_mode}</span> },
                        { key: 'reference_no', label: 'Transaction Ref', render: (item) => item.reference_no ? <span className="font-mono text-xs">{item.reference_no}</span> : 'N/A' },
                        { key: 'amount', label: 'Amount Collected', isNumeric: true, render: (item) => formatINR(item.amount) }
                      ]}
                      data={viewingHistory.payments}
                      emptyMessage="No payment receipts collected from this client."
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="dim-line my-4" />

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="btn btn-ghost"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CustomersPage;
