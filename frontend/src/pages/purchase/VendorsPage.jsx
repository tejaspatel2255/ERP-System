import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import SearchBar from '../../components/SearchBar';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { useRole } from '../../context/RoleContext';
import { getVendors, createVendor, updateVendor, deleteVendor, getVendorById } from '../../api/purchaseApi';
import { formatINR } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

const VendorsPage = () => {
  const { hasPermission } = useRole();

  // State Management
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [viewingVendor, setViewingVendor] = useState(null);
  const [viewingHistory, setViewingHistory] = useState({ pos: [], invoices: [], outstanding: 0 });
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form Field State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    gstin: '',
    payment_terms: 'Net 30'
  });

  // Fetch Vendors
  const fetchVendorsList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getVendors({ search, page, limit: 25 });
      if (data.success) {
        setVendors(data.vendors);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load vendors.');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchVendorsList();
  }, [fetchVendorsList]);

  // Handle Input Change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Open Create Vendor
  const handleOpenCreate = () => {
    setEditingVendor(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      gstin: '',
      payment_terms: 'Net 30'
    });
    setIsFormOpen(true);
  };

  // Open Edit Vendor
  const handleOpenEdit = (vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      email: vendor.email || '',
      phone: vendor.phone || '',
      address: vendor.address || '',
      gstin: vendor.gstin || '',
      payment_terms: vendor.payment_terms || 'Net 30'
    });
    setIsFormOpen(true);
  };

  // Save Vendor
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Vendor name is required.');

    if (formData.gstin.trim() && formData.gstin.trim().length !== 15) {
      return toast.error('GSTIN must be exactly 15 characters long.');
    }

    try {
      if (editingVendor) {
        await updateVendor(editingVendor.id, formData);
        toast.success('Vendor updated successfully.');
      } else {
        await createVendor(formData);
        toast.success('Vendor profile created.');
      }
      setIsFormOpen(false);
      fetchVendorsList();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save vendor.');
    }
  };

  // Soft Delete Vendor
  const handleDelete = async (vendor) => {
    if (window.confirm(`Are you sure you want to delete vendor '${vendor.name}'?`)) {
      try {
        await deleteVendor(vendor.id);
        toast.success('Vendor deleted.');
        fetchVendorsList();
      } catch (err) {
        toast.error('Deletion failed.');
      }
    }
  };

  // View Vendor Profile Ledger
  const handleViewVendor = async (vendor) => {
    setViewingVendor(vendor);
    setIsViewOpen(true);
    setHistoryLoading(true);
    setViewingHistory({ pos: [], invoices: [], outstanding: 0 });

    try {
      const data = await getVendorById(vendor.id);
      if (data.success) {
        setViewingHistory(data.history);
      }
    } catch (err) {
      toast.error('Failed to load transaction history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Column definitions
  const columns = [
    { key: 'name', label: 'Vendor name' },
    { key: 'email', label: 'Email', render: (item) => item.email || '—' },
    { key: 'phone', label: 'Phone', render: (item) => item.phone || '—' },
    { key: 'gstin', label: 'GSTIN', render: (item) => item.gstin || '—' },
    { key: 'payment_terms', label: 'Terms', render: (item) => item.payment_terms || 'Net 30' },
    { key: 'total_pos', label: 'Total POs', isNumeric: true, render: (item) => item.total_pos || 0 },
    {
      key: 'total_spend',
      label: 'Total spend',
      isNumeric: true,
      render: (item) => formatINR(item.total_spend)
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewVendor(item)}
            className="btn btn-ghost btn-sm"
          >
            History
          </button>
          {hasPermission('purchase', 'edit') && (
            <button
              onClick={() => handleOpenEdit(item)}
              className="btn btn-ghost btn-sm"
            >
              Edit
            </button>
          )}
          {hasPermission('purchase', 'delete') && (
            <button
              onClick={() => handleDelete(item)}
              className="btn btn-danger btn-sm"
            >
              Delete
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
        title="Vendors"
        description="Manage supplier profiles, payment terms, and monitor total spend volume."
        actions={
          hasPermission('purchase', 'create') ? (
            <button
              onClick={handleOpenCreate}
              className="btn btn-primary"
            >
              Create vendor
            </button>
          ) : null
        }
      />

      {/* Filter and search bar */}
      <div className="sheet p-3 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[260px] max-w-md">
          <SearchBar
            value={search}
            onChange={(val) => { setSearch(val); setPage(1); }}
            placeholder="Search vendors by name, email, or GSTIN…"
          />
        </div>
      </div>

      {/* Main Table */}
      <Table columns={columns} data={vendors} loading={loading} emptyMessage="No vendors found." />

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* CREATE & EDIT FORM MODAL */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingVendor ? 'Edit vendor' : 'Create vendor'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Supplier / vendor name *</label>
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
                placeholder="15-digit code"
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
              <label className="field-label">Address details</label>
              <textarea
                name="address"
                rows={2}
                className="field"
                value={formData.address}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="field-label">Payment terms</label>
              <select
                name="payment_terms"
                className="field"
                value={formData.payment_terms}
                onChange={handleInputChange}
              >
                <option value="Net 15">Net 15 Days</option>
                <option value="Net 30">Net 30 Days</option>
                <option value="Net 45">Net 45 Days</option>
                <option value="Net 60">Net 60 Days</option>
                <option value="Immediate">Immediate / Cash On Delivery</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
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
              Save vendor
            </button>
          </div>
        </form>
      </Modal>

      {/* VIEW VENDOR HISTORY DOSSIER */}
      <Modal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        title="Vendor details"
        size="lg"
      >
        {viewingVendor && (
          <div className="space-y-6">
            {/* Summary details card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="sheet p-3.5 space-y-1">
                <h4 className="text-xs font-semibold text-text-muted">Vendor info</h4>
                <p className="text-sm font-semibold text-text-primary">{viewingVendor.name}</p>
                <p className="text-xs text-text-secondary">{viewingVendor.email || 'No email'}</p>
                <p className="text-xs text-text-secondary">{viewingVendor.phone || 'No phone'}</p>
              </div>
              <div className="sheet p-3.5 space-y-1">
                <h4 className="text-xs font-semibold text-text-muted">Tax & location</h4>
                <p className="text-xs text-text-secondary"><span className="font-medium text-text-primary">GST:</span> {viewingVendor.gstin || 'Unregistered'}</p>
                <p className="text-xs text-text-secondary line-clamp-2">{viewingVendor.address || 'No address'}</p>
              </div>
              <div className="sheet p-3.5 space-y-1">
                <h4 className="text-xs font-semibold text-text-muted">Terms & balance</h4>
                <p className="text-xs text-text-secondary">Terms: <span className="font-semibold text-text-primary">{viewingVendor.payment_terms || 'Net 30'}</span></p>
                <p className="text-xs text-text-secondary">
                  Outstanding due:{' '}
                  <span className={`font-semibold tabular-nums ${viewingHistory.outstanding > 0 ? 'text-[var(--danger-text)]' : 'text-[var(--success-text)]'}`}>
                    {formatINR(viewingHistory.outstanding)}
                  </span>
                </p>
              </div>
            </div>

            {/* History ledgers */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-text-primary">Transaction records</h3>
              
              {historyLoading ? (
                <div className="h-32 bg-bg-hover animate-pulse rounded" />
              ) : (
                <div className="space-y-5">
                  {/* Purchase Orders sub-table */}
                  <div>
                    <h4 className="text-xs font-semibold text-text-secondary mb-2">Purchase orders issued</h4>
                    <Table
                      columns={[
                        { key: 'po_no', label: 'PO no', render: (item) => <span className="stamp">{item.po_no}</span> },
                        { key: 'po_date', label: 'Order date', render: (item) => formatDate(item.po_date) },
                        {
                          key: 'approval_status',
                          label: 'Approval',
                          render: (item) => <StatusBadge status={item.approval_status} />
                        },
                        { key: 'status', label: 'Delivery status', render: (item) => <StatusBadge status={item.status} /> },
                        { key: 'total_amount', label: 'PO total', isNumeric: true, render: (item) => formatINR(item.total_amount) }
                      ]}
                      data={viewingHistory.pos}
                      emptyMessage="No purchase orders created for this supplier."
                    />
                  </div>

                  {/* Vendor Invoices sub-table */}
                  <div>
                    <h4 className="text-xs font-semibold text-text-secondary mb-2">Supplier invoices (Bills)</h4>
                    <Table
                      columns={[
                        { key: 'invoice_no', label: 'Invoice bill no', render: (item) => <span className="stamp">{item.invoice_no}</span> },
                        { key: 'invoice_date', label: 'Bill date', render: (item) => formatDate(item.invoice_date) },
                        { key: 'amount', label: 'Billed amount', isNumeric: true, render: (item) => formatINR(item.amount) },
                        {
                          key: 'status',
                          label: 'Payment',
                          render: (item) => <StatusBadge status={item.status} />
                        }
                      ]}
                      data={viewingHistory.invoices}
                      emptyMessage="No bills/vendor invoices recorded for this supplier."
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-border-color">
              <button
                type="button"
                onClick={() => setIsViewOpen(false)}
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

export default VendorsPage;
