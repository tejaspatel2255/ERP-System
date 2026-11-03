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

    // Validate GSTIN format if provided (15 character alpha-numeric)
    if (formData.gstin.trim() && formData.gstin.trim().length !== 15) {
      return toast.error('GSTIN must be exactly 15 characters long.');
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
      toast.error('Failed to load customer transaction history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Columns Configuration
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email', render: (item) => item.email || '—' },
    { key: 'phone', label: 'Phone', render: (item) => item.phone || '—' },
    { key: 'gstin', label: 'GSTIN', render: (item) => item.gstin || '—' },
    {
      key: 'credit_limit',
      label: 'Credit limit',
      isNumeric: true,
      render: (item) => formatINR(item.credit_limit)
    },
    {
      key: 'balance',
      label: 'Outstanding balance',
      isNumeric: true,
      render: (item) => (
        <span className={`font-medium tabular-nums ${parseFloat(item.balance) > 0 ? 'text-[var(--danger-text)]' : 'text-text-primary'}`}>
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
            className="btn btn-ghost btn-sm"
          >
            Profile
          </button>
          {hasPermission('sales', 'edit') && (
            <button
              onClick={() => handleOpenEdit(item)}
              className="btn btn-ghost btn-sm"
            >
              Edit
            </button>
          )}
          {hasPermission('sales', 'delete') && (
            <button
              onClick={() => handleDelete(item)}
              className="btn btn-danger btn-sm"
            >
              Deactivate
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      {/* Page Header */}
      <PageHeader
        title="Customers"
        description="Manage customer records, credit boundaries, and linked financial transactions."
        actions={
          hasPermission('sales', 'create') ? (
            <button
              onClick={handleOpenCreate}
              className="btn btn-primary"
            >
              Add customer
            </button>
          ) : null
        }
      />

      {/* Filter and search toolbar */}
      <div className="sheet p-3 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[260px] max-w-md">
          <SearchBar
            value={search}
            onChange={(val) => { setSearch(val); setPage(1); }}
            placeholder="Search customers by name, email, or phone…"
          />
        </div>
      </div>

      {/* Main Table */}
      <Table columns={columns} data={customers} loading={loading} emptyMessage="No customers found." />

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* CREATE & EDIT FORM MODAL */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingCustomer ? 'Edit customer' : 'Add customer'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Company / customer name *</label>
              <input
                type="text"
                name="name"
                required
                className="field"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="field-label">GSTIN (Optional)</label>
              <input
                type="text"
                name="gstin"
                placeholder="15-digit alphanumeric"
                className="field"
                value={formData.gstin}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="field-label">Email address</label>
              <input
                type="email"
                name="email"
                className="field"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="field-label">Contact phone</label>
              <input
                type="text"
                name="phone"
                className="field"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="field-label">Billing / shipping address</label>
              <textarea
                name="address"
                rows={2}
                className="field"
                value={formData.address}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="field-label">Credit limit (INR)</label>
              <input
                type="number"
                step="0.01"
                name="credit_limit"
                className="field"
                value={formData.credit_limit}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              className="btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              Save customer
            </button>
          </div>
        </form>
      </Modal>

      {/* PROFILE DETAILS VIEW MODAL */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Customer details"
        size="lg"
      >
        {viewingDetails && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="sheet p-3.5 space-y-1">
                <h4 className="text-xs font-semibold text-text-muted">Record details</h4>
                <p className="text-sm font-semibold text-text-primary">{viewingDetails.name}</p>
                <p className="text-xs text-text-secondary">{viewingDetails.email || 'No email'}</p>
                <p className="text-xs text-text-secondary">{viewingDetails.phone || 'No phone'}</p>
              </div>
              <div className="sheet p-3.5 space-y-1">
                <h4 className="text-xs font-semibold text-text-muted">Tax & location</h4>
                <p className="text-xs text-text-secondary"><span className="font-medium text-text-primary">GSTIN:</span> {viewingDetails.gstin || 'Unspecified'}</p>
                <p className="text-xs text-text-secondary line-clamp-2">{viewingDetails.address || 'No address details'}</p>
              </div>
              <div className="sheet p-3.5 space-y-1">
                <h4 className="text-xs font-semibold text-text-muted">Credit limit</h4>
                <p className="text-xs text-text-secondary">Limit: <span className="font-semibold text-text-primary tabular-nums">{formatINR(viewingDetails.credit_limit)}</span></p>
                <p className="text-xs text-text-secondary">
                  Outstanding:{' '}
                  <span className={`font-semibold tabular-nums ${parseFloat(viewingDetails.balance) > 0 ? 'text-[var(--danger-text)]' : 'text-[var(--success-text)]'}`}>
                    {formatINR(viewingDetails.balance)}
                  </span>
                </p>
              </div>
            </div>

            {/* Sub-ledgers for Transaction History */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-text-primary">Transaction history</h3>
              
              {historyLoading ? (
                <div className="h-32 bg-bg-hover animate-pulse rounded" />
              ) : (
                <div className="space-y-5">
                  {/* Quotations Sub-ledger */}
                  <div>
                    <h4 className="text-xs font-semibold text-text-secondary mb-2">Quotations</h4>
                    <Table
                      columns={[
                        { key: 'quotation_no', label: 'Quotation no', render: (item) => <span className="stamp">{item.quotation_no}</span> },
                        { key: 'date', label: 'Date', render: (item) => formatDate(item.date) },
                        { key: 'valid_until', label: 'Valid until', render: (item) => formatDate(item.valid_until) },
                        { key: 'status', label: 'Status', render: (item) => <StatusBadge status={item.status} /> },
                        { key: 'total_amount', label: 'Total amount', isNumeric: true, render: (item) => formatINR(item.total_amount) }
                      ]}
                      data={viewingHistory.quotations}
                      emptyMessage="No quotations recorded for this customer."
                    />
                  </div>

                  {/* Orders Sub-ledger */}
                  <div>
                    <h4 className="text-xs font-semibold text-text-secondary mb-2">Sales orders</h4>
                    <Table
                      columns={[
                        { key: 'order_no', label: 'Order no', render: (item) => <span className="stamp">{item.order_no}</span> },
                        { key: 'order_date', label: 'Order date', render: (item) => formatDate(item.order_date) },
                        { key: 'status', label: 'Status', render: (item) => <StatusBadge status={item.status} /> },
                        { key: 'total_amount', label: 'Total amount', isNumeric: true, render: (item) => formatINR(item.total_amount) }
                      ]}
                      data={viewingHistory.orders}
                      emptyMessage="No sales orders recorded for this customer."
                    />
                  </div>

                  {/* Invoices Sub-ledger */}
                  <div>
                    <h4 className="text-xs font-semibold text-text-secondary mb-2">Invoices</h4>
                    <Table
                      columns={[
                        { key: 'invoice_no', label: 'Invoice no', render: (item) => <span className="stamp">{item.invoice_no}</span> },
                        { key: 'invoice_date', label: 'Billing date', render: (item) => formatDate(item.invoice_date) },
                        { key: 'due_date', label: 'Due date', render: (item) => formatDate(item.due_date) },
                        { key: 'status', label: 'Status', render: (item) => <StatusBadge status={item.status} /> },
                        { key: 'total_amount', label: 'Total', isNumeric: true, render: (item) => formatINR(item.total_amount) },
                        { key: 'paid_amount', label: 'Paid', isNumeric: true, render: (item) => formatINR(item.paid_amount) }
                      ]}
                      data={viewingHistory.invoices}
                      emptyMessage="No invoices recorded for this customer."
                    />
                  </div>

                  {/* Payments Sub-ledger */}
                  <div>
                    <h4 className="text-xs font-semibold text-text-secondary mb-2">Receipts</h4>
                    <Table
                      columns={[
                        { key: 'payment_date', label: 'Payment date', render: (item) => formatDate(item.payment_date) },
                        { key: 'invoice_no', label: 'Invoice ref', render: (item) => <span className="stamp">{item.invoice_no}</span> },
                        { key: 'payment_mode', label: 'Mode' },
                        { key: 'reference_no', label: 'Reference no', render: (item) => item.reference_no || '—' },
                        { key: 'amount', label: 'Amount collected', isNumeric: true, render: (item) => formatINR(item.amount) }
                      ]}
                      data={viewingHistory.payments}
                      emptyMessage="No payments received from this customer."
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-border-color">
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="btn"
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
