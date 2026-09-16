import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import SearchBar from '../../components/SearchBar';
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
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email', render: (item) => item.email || 'N/A' },
    { key: 'phone', label: 'Phone', render: (item) => item.phone || 'N/A' },
    { key: 'gstin', label: 'GSTIN', render: (item) => item.gstin || 'N/A' },
    {
      key: 'credit_limit',
      label: 'Credit Limit',
      render: (item) => formatINR(item.credit_limit)
    },
    {
      key: 'balance',
      label: 'Outstanding Balance',
      render: (item) => (
        <span className={`font-semibold ${parseFloat(item.balance) > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
          {formatINR(item.balance)}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewCustomer(item)}
            className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300 font-semibold text-xs bg-slate-50 dark:bg-slate-900/10 px-2 py-1 rounded-md"
          >
            Profile View
          </button>
          {hasPermission('sales', 'edit') && (
            <button
              onClick={() => handleOpenEdit(item)}
              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 font-semibold text-xs bg-blue-50 dark:bg-blue-900/10 px-2 py-1 rounded-md"
            >
              Edit
            </button>
          )}
          {hasPermission('sales', 'delete') && (
            <button
              onClick={() => handleDelete(item)}
              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 font-semibold text-xs bg-red-50 dark:bg-red-900/10 px-2 py-1 rounded-md"
            >
              Delete
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Customers CRM</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage client profiles, credit parameters, and view total trade balance ledger.</p>
        </div>

        {hasPermission('sales', 'create') && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
          >
            Add Customer
          </button>
        )}
      </div>

      {/* Filter and search bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <SearchBar value={search} onChange={(val) => { setSearch(val); setPage(1); }} placeholder="Search customers by name, email, or phone..." />
        </div>
      </div>

      {/* Main Table */}
      <Table columns={columns} data={customers} loading={loading} emptyMessage="No customers matched your search query." />

      {/* Pagination */}
      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* CREATE & EDIT FORM MODAL */}
      <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title={editingCustomer ? 'Edit Customer Info' : 'Create Customer Record'}>
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Company / Customer Name *</label>
              <input
                type="text"
                name="name"
                required
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">GSTIN (Optional)</label>
              <input
                type="text"
                name="gstin"
                placeholder="15-digit Alpha-numeric"
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                value={formData.gstin}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                name="email"
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Contact Phone</label>
              <input
                type="text"
                name="phone"
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Billing / Shipping Address</label>
              <textarea
                name="address"
                rows={2}
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                value={formData.address}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Credit Limit (INR)</label>
              <input
                type="number"
                step="0.01"
                name="credit_limit"
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                value={formData.credit_limit}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Save Customer
            </button>
          </div>
        </form>
      </Modal>

      {/* PROFILE DOSSIER VIEW MODAL */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Customer Profile Dossier" size="lg">
        {viewingDetails && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Company Name</h4>
                <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">{viewingDetails.name}</p>
                <p className="text-xs text-slate-500">{viewingDetails.email || 'No email'}</p>
                <p className="text-xs text-slate-500">{viewingDetails.phone || 'No phone'}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">GSTIN & Address</h4>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">GST: {viewingDetails.gstin || 'Unspecified'}</p>
                <p className="text-xs text-slate-500 max-w-[200px] truncate">{viewingDetails.address || 'No address details'}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Credit & Balance Status</h4>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Limit: <span className="font-bold">{formatINR(viewingDetails.credit_limit)}</span></p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Outstanding:{' '}
                  <span className={`font-bold ${parseFloat(viewingDetails.balance) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600'}`}>
                    {formatINR(viewingDetails.balance)}
                  </span>
                </p>
              </div>
            </div>

            {/* Tabs for Transaction History */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-950 dark:text-white uppercase tracking-wider">Transaction Records</h3>
              
              {historyLoading ? (
                <div className="py-12 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Quotations Sub-ledger */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Linked Quotations</h4>
                    <Table
                      columns={[
                        { key: 'quotation_no', label: 'Quotation No' },
                        { key: 'date', label: 'Date', render: (item) => formatDate(item.date) },
                        { key: 'valid_until', label: 'Valid Until', render: (item) => formatDate(item.valid_until) },
                        { key: 'status', label: 'Status' },
                        { key: 'total_amount', label: 'Total Amount', render: (item) => formatINR(item.total_amount) }
                      ]}
                      data={viewingHistory.quotations}
                      emptyMessage="No quotations recorded for this client."
                    />
                  </div>

                  {/* Orders Sub-ledger */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Linked Sales Orders</h4>
                    <Table
                      columns={[
                        { key: 'order_no', label: 'Order No' },
                        { key: 'order_date', label: 'Order Date', render: (item) => formatDate(item.order_date) },
                        { key: 'status', label: 'Status' },
                        { key: 'total_amount', label: 'Total Amount', render: (item) => formatINR(item.total_amount) }
                      ]}
                      data={viewingHistory.orders}
                      emptyMessage="No sales orders recorded for this client."
                    />
                  </div>

                  {/* Invoices Sub-ledger */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Linked Invoices</h4>
                    <Table
                      columns={[
                        { key: 'invoice_no', label: 'Invoice No' },
                        { key: 'invoice_date', label: 'Billing Date', render: (item) => formatDate(item.invoice_date) },
                        { key: 'due_date', label: 'Due Date', render: (item) => formatDate(item.due_date) },
                        { key: 'status', label: 'Status' },
                        { key: 'total_amount', label: 'Total', render: (item) => formatINR(item.total_amount) },
                        { key: 'paid_amount', label: 'Paid', render: (item) => formatINR(item.paid_amount) }
                      ]}
                      data={viewingHistory.invoices}
                      emptyMessage="No billing invoices recorded for this client."
                    />
                  </div>

                  {/* Payments Sub-ledger */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Received Payments</h4>
                    <Table
                      columns={[
                        { key: 'payment_date', label: 'Payment Date', render: (item) => formatDate(item.payment_date) },
                        { key: 'invoice_no', label: 'Invoice Ref' },
                        { key: 'payment_mode', label: 'Mode' },
                        { key: 'reference_no', label: 'Reference No', render: (item) => item.reference_no || 'N/A' },
                        { key: 'amount', label: 'Amount Collected', render: (item) => formatINR(item.amount) }
                      ]}
                      data={viewingHistory.payments}
                      emptyMessage="No payments received from this client."
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Close Profile
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CustomersPage;
