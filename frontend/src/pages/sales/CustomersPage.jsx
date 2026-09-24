import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import SearchBar from '../../components/SearchBar';
import PageHeader from '../../components/PageHeader';
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
      toast.error('Failed to load customer transaction dossier.');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Columns Configuration
  const columns = [
    { key: 'name', label: 'Company / Client Name', render: (item) => <span className="font-mono font-bold text-text-primary">{item.name}</span> },
    { key: 'email', label: 'Email', render: (item) => <span className="font-mono text-xs text-text-secondary">{item.email || 'N/A'}</span> },
    { key: 'phone', label: 'Phone', render: (item) => <span className="font-mono text-xs text-text-secondary">{item.phone || 'N/A'}</span> },
    { key: 'gstin', label: 'GSTIN', render: (item) => <span className="font-mono text-xs text-accent-primary font-bold">{item.gstin || 'N/A'}</span> },
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
        <span className={`font-mono font-bold ${parseFloat(item.balance) > 0 ? 'text-accent-danger' : 'text-text-primary'}`}>
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
            className="text-text-secondary hover:text-text-primary font-mono font-bold text-[10px] bg-bg-card border border-border-color hover:bg-bg-hover px-2 py-1 rounded-xs transition-colors uppercase"
          >
            Dossier
          </button>
          {hasPermission('sales', 'edit') && (
            <button
              onClick={() => handleOpenEdit(item)}
              className="text-accent-primary hover:text-accent-secondary font-mono font-bold text-[10px] bg-bg-card border border-border-color hover:bg-bg-hover px-2 py-1 rounded-xs transition-colors uppercase"
            >
              Edit
            </button>
          )}
          {hasPermission('sales', 'delete') && (
            <button
              onClick={() => handleDelete(item)}
              className="text-accent-danger hover:text-accent-danger/80 font-mono font-bold text-[10px] bg-bg-card border border-border-color hover:bg-accent-danger/10 px-2 py-1 rounded-xs transition-colors uppercase"
            >
              Delete
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl animate-fadeIn">
      {/* Header section */}
      <PageHeader
        title="Commercial Customer CRM"
        description="Manage enterprise client accounts, trade credit boundaries, and cross-module financial ledgers."
        actions={
          hasPermission('sales', 'create') && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center justify-center rounded-xs bg-accent-primary px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider text-white shadow-2xs hover:bg-accent-secondary transition-all"
            >
              + Add Customer Account
            </button>
          )
        }
      />

      {/* Filter and search bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-5">
        <div className="flex-1">
          <SearchBar value={search} onChange={(val) => { setSearch(val); setPage(1); }} placeholder="Filter clients by commercial name, email, or telephone..." />
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
        <form onSubmit={handleFormSubmit} className="space-y-4 font-sans">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Company / Customer Name *</label>
              <input
                type="text"
                name="name"
                required
                className="block w-full rounded-xs border border-border-color bg-bg-card py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">GSTIN (Optional)</label>
              <input
                type="text"
                name="gstin"
                placeholder="15-digit Alpha-numeric"
                className="block w-full rounded-xs border border-border-color bg-bg-card py-2 px-3 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-primary"
                value={formData.gstin}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Email Address</label>
              <input
                type="email"
                name="email"
                className="block w-full rounded-xs border border-border-color bg-bg-card py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Contact Phone</label>
              <input
                type="text"
                name="phone"
                className="block w-full rounded-xs border border-border-color bg-bg-card py-2 px-3 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-primary"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Billing / Shipping Address</label>
              <textarea
                name="address"
                rows={2}
                className="block w-full rounded-xs border border-border-color bg-bg-card py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                value={formData.address}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Credit Limit (INR)</label>
              <input
                type="number"
                step="0.01"
                name="credit_limit"
                className="block w-full rounded-xs border border-border-color bg-bg-card py-2 px-3 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-primary"
                value={formData.credit_limit}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              className="rounded-xs border border-border-color bg-bg-card px-3.5 py-1.5 text-xs font-mono font-bold uppercase text-text-secondary hover:bg-bg-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xs bg-accent-primary px-4 py-1.5 text-xs font-mono font-bold uppercase text-white shadow-2xs hover:bg-accent-secondary"
            >
              Save Customer Account
            </button>
          </div>
        </form>
      </Modal>

      {/* PROFILE DOSSIER VIEW MODAL */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Customer Dossier Telemetry" size="lg">
        {viewingDetails && (
          <div className="space-y-5 font-sans">
            {/* Summary Telemetry Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xs bg-bg-card border border-border-color">
              <div>
                <h4 className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider">Company Identity</h4>
                <p className="mt-0.5 text-sm font-bold text-text-primary font-mono">{viewingDetails.name}</p>
                <p className="text-xs text-text-secondary">{viewingDetails.email || 'No email'}</p>
                <p className="text-xs text-text-secondary font-mono">{viewingDetails.phone || 'No phone'}</p>
              </div>
              <div>
                <h4 className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider">Tax & Address</h4>
                <p className="mt-0.5 text-xs font-mono font-bold text-accent-primary">GSTIN: {viewingDetails.gstin || 'Unspecified'}</p>
                <p className="text-xs text-text-secondary max-w-[200px] truncate">{viewingDetails.address || 'No address registered'}</p>
              </div>
              <div>
                <h4 className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider">Credit Boundary</h4>
                <p className="mt-0.5 text-xs text-text-secondary">Limit: <span className="font-mono font-bold text-text-primary">{formatINR(viewingDetails.credit_limit)}</span></p>
                <p className="text-xs text-text-secondary">
                  Outstanding:{' '}
                  <span className={`font-mono font-bold ${parseFloat(viewingDetails.balance) > 0 ? 'text-accent-danger' : 'text-accent-success'}`}>
                    {formatINR(viewingDetails.balance)}
                  </span>
                </p>
              </div>
            </div>

            {/* Sub-ledgers */}
            <div className="space-y-4">
              <h3 className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider border-b border-border-color pb-1">
                Transaction History Sub-Ledgers
              </h3>
              
              {historyLoading ? (
                <div className="py-10 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-primary" />
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Quotations Sub-ledger */}
                  <div>
                    <h4 className="text-[10px] font-mono font-bold text-text-muted uppercase mb-1.5">Commercial Quotations</h4>
                    <Table
                      columns={[
                        { key: 'quotation_no', label: 'Quotation Ref' },
                        { key: 'date', label: 'Date', render: (item) => formatDate(item.date) },
                        { key: 'valid_until', label: 'Valid Until', render: (item) => formatDate(item.valid_until) },
                        { key: 'status', label: 'Status' },
                        { key: 'total_amount', label: 'Total Value', isNumeric: true, render: (item) => formatINR(item.total_amount) }
                      ]}
                      data={viewingHistory.quotations}
                      emptyMessage="No commercial quotations logged for this client."
                    />
                  </div>

                  {/* Orders Sub-ledger */}
                  <div>
                    <h4 className="text-[10px] font-mono font-bold text-text-muted uppercase mb-1.5">Sales Orders</h4>
                    <Table
                      columns={[
                        { key: 'order_no', label: 'Order Ref' },
                        { key: 'order_date', label: 'Order Date', render: (item) => formatDate(item.order_date) },
                        { key: 'status', label: 'Status' },
                        { key: 'total_amount', label: 'Order Value', isNumeric: true, render: (item) => formatINR(item.total_amount) }
                      ]}
                      data={viewingHistory.orders}
                      emptyMessage="No sales orders logged for this client."
                    />
                  </div>

                  {/* Invoices Sub-ledger */}
                  <div>
                    <h4 className="text-[10px] font-mono font-bold text-text-muted uppercase mb-1.5">Billing Invoices</h4>
                    <Table
                      columns={[
                        { key: 'invoice_no', label: 'Invoice Ref' },
                        { key: 'invoice_date', label: 'Billing Date', render: (item) => formatDate(item.invoice_date) },
                        { key: 'due_date', label: 'Due Date', render: (item) => formatDate(item.due_date) },
                        { key: 'status', label: 'Status' },
                        { key: 'total_amount', label: 'Billed Value', isNumeric: true, render: (item) => formatINR(item.total_amount) },
                        { key: 'paid_amount', label: 'Collected Value', isNumeric: true, render: (item) => formatINR(item.paid_amount) }
                      ]}
                      data={viewingHistory.invoices}
                      emptyMessage="No billing invoices logged for this client."
                    />
                  </div>

                  {/* Payments Sub-ledger */}
                  <div>
                    <h4 className="text-[10px] font-mono font-bold text-text-muted uppercase mb-1.5">Collected Receipts</h4>
                    <Table
                      columns={[
                        { key: 'payment_date', label: 'Receipt Date', render: (item) => formatDate(item.payment_date) },
                        { key: 'invoice_no', label: 'Invoice Ref' },
                        { key: 'payment_mode', label: 'Instrument Mode' },
                        { key: 'reference_no', label: 'Transaction Ref', render: (item) => item.reference_no || 'N/A' },
                        { key: 'amount', label: 'Amount Collected', isNumeric: true, render: (item) => formatINR(item.amount) }
                      ]}
                      data={viewingHistory.payments}
                      emptyMessage="No payment receipts collected from this client."
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-border-color">
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="rounded-xs border border-border-color bg-bg-card px-3.5 py-1.5 text-xs font-mono font-bold uppercase text-text-secondary hover:bg-bg-hover"
              >
                Close Dossier
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CustomersPage;
