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
    {
      key: 'name',
      label: 'Vendor Name',
      render: (item) => (
        <span className="font-semibold text-text-primary">
          {item.name}
        </span>
      )
    },
    {
      key: 'email',
      label: 'Email',
      render: (item) => (
        <span className="font-mono text-xs text-text-secondary">
          {item.email || '—'}
        </span>
      )
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (item) => (
        <span className="font-mono text-xs text-text-secondary">
          {item.phone || '—'}
        </span>
      )
    },
    {
      key: 'gstin',
      label: 'GSTIN',
      render: (item) => (
        <span className="font-mono text-xs uppercase tracking-wider text-text-secondary">
          {item.gstin || '—'}
        </span>
      )
    },
    {
      key: 'payment_terms',
      label: 'Terms',
      render: (item) => (
        <span className="font-mono text-xs text-text-muted">
          {item.payment_terms || 'Net 30'}
        </span>
      )
    },
    {
      key: 'total_pos',
      label: 'Total POs',
      render: (item) => (
        <span className="font-mono text-xs font-semibold text-text-primary">
          {item.total_pos || 0}
        </span>
      )
    },
    {
      key: 'total_spend',
      label: 'Total Spend',
      render: (item) => (
        <span className="font-mono text-xs font-semibold text-text-primary">
          {formatINR(item.total_spend)}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleViewVendor(item)}
            className="btn btn-ghost px-2 py-1 text-xs font-mono uppercase tracking-wider"
          >
            History
          </button>
          {hasPermission('purchase', 'edit') && (
            <button
              onClick={() => handleOpenEdit(item)}
              className="btn btn-ghost px-2 py-1 text-xs font-mono uppercase tracking-wider text-accent-primary"
            >
              Edit
            </button>
          )}
          {hasPermission('purchase', 'delete') && (
            <button
              onClick={() => handleDelete(item)}
              className="btn btn-ghost px-2 py-1 text-xs font-mono uppercase tracking-wider text-accent-danger"
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
      {/* Header */}
      <PageHeader
        title="Vendor Directory"
        description="Manage supplier profiles, payment terms, and monitor total spend volume."
        actions={
          hasPermission('purchase', 'create') && (
            <button
              onClick={handleOpenCreate}
              className="btn btn-primary px-4 py-2 text-xs font-mono uppercase tracking-wider"
            >
              + Create Vendor
            </button>
          )
        }
      />

      {/* Filter and search bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <SearchBar
            value={search}
            onChange={(val) => { setSearch(val); setPage(1); }}
            placeholder="Search vendors by name, email, or GSTIN..."
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="sheet">
        <Table columns={columns} data={vendors} loading={loading} emptyMessage="No vendors found." />
      </div>

      {/* Pagination */}
      <div className="flex justify-end">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* CREATE & EDIT FORM MODAL */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingVendor ? 'Modify Vendor Profile' : 'Create Vendor Profile'}>
        <form onSubmit={handleFormSubmit} className="space-y-4 font-sans">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Supplier / Vendor Name *</label>
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
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">GSTIN (Optional)</label>
              <input
                type="text"
                name="gstin"
                placeholder="15-digit code"
                className="field font-mono"
                value={formData.gstin}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Email Address</label>
              <input
                type="email"
                name="email"
                className="field font-mono"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Contact Phone</label>
              <input
                type="text"
                name="phone"
                className="field font-mono"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Address Details</label>
              <textarea
                name="address"
                rows={2}
                className="field font-sans"
                value={formData.address}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Payment Terms</label>
              <select
                name="payment_terms"
                className="field font-sans"
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
              className="btn btn-ghost px-4 py-2 text-xs font-mono uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary px-4 py-2 text-xs font-mono uppercase tracking-wider"
            >
              Save Vendor
            </button>
          </div>
        </form>
      </Modal>

      {/* VIEW VENDOR HISTORY DOSSIER */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Vendor Profile & Ledger Details" size="lg">
        {viewingVendor && (
          <div className="space-y-6 font-sans">
            {/* Summary details card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 sheet bg-bg-secondary">
              <div>
                <h4 className="font-mono text-[10px] font-bold text-text-muted uppercase tracking-wider">Vendor Info</h4>
                <p className="mt-1 text-base font-bold text-text-primary">{viewingVendor.name}</p>
                <p className="text-xs font-mono text-text-secondary">{viewingVendor.email || 'No email'}</p>
                <p className="text-xs font-mono text-text-secondary">{viewingVendor.phone || 'No phone'}</p>
              </div>
              <div>
                <h4 className="font-mono text-[10px] font-bold text-text-muted uppercase tracking-wider">GSTIN & Address</h4>
                <p className="mt-1 text-sm font-mono font-medium text-text-primary">GST: {viewingVendor.gstin || 'Unregistered'}</p>
                <p className="text-xs text-text-muted max-w-[200px] truncate">{viewingVendor.address || 'No Address'}</p>
              </div>
              <div>
                <h4 className="font-mono text-[10px] font-bold text-text-muted uppercase tracking-wider">Credit Terms & Balances</h4>
                <p className="mt-1 text-xs font-mono text-text-secondary">Terms: <span className="font-bold text-text-primary">{viewingVendor.payment_terms || 'Net 30'}</span></p>
                <p className="text-xs font-mono text-text-secondary mt-1">
                  Outstanding Due:{' '}
                  <span className={`font-bold ${viewingHistory.outstanding > 0 ? 'text-accent-danger' : 'text-accent-success'}`}>
                    {formatINR(viewingHistory.outstanding)}
                  </span>
                </p>
              </div>
            </div>

            {/* History ledgers */}
            <div className="space-y-4">
              <h3 className="font-display text-sm font-bold text-text-primary uppercase tracking-wider">Transaction Records</h3>
              
              {historyLoading ? (
                <div className="py-12 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Purchase Orders sub-table */}
                  <div>
                    <h4 className="font-mono text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Purchase Orders Issued</h4>
                    <div className="sheet">
                      <Table
                        columns={[
                          {
                            key: 'po_no',
                            label: 'PO No',
                            render: (item) => <span className="font-mono text-xs font-semibold">{item.po_no}</span>
                          },
                          {
                            key: 'po_date',
                            label: 'Order Date',
                            render: (item) => <span className="font-mono text-xs">{formatDate(item.po_date)}</span>
                          },
                          {
                            key: 'approval_status',
                            label: 'Approval',
                            render: (item) => <StatusBadge status={item.approval_status} />
                          },
                          {
                            key: 'status',
                            label: 'Delivery Status',
                            render: (item) => <StatusBadge status={item.status} />
                          },
                          {
                            key: 'total_amount',
                            label: 'PO Total',
                            render: (item) => <span className="font-mono text-xs font-bold">{formatINR(item.total_amount)}</span>
                          }
                        ]}
                        data={viewingHistory.pos}
                        emptyMessage="No purchase orders created for this supplier."
                      />
                    </div>
                  </div>

                  {/* Vendor Invoices sub-table */}
                  <div>
                    <h4 className="font-mono text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Supplier Invoices (Bills)</h4>
                    <div className="sheet">
                      <Table
                        columns={[
                          {
                            key: 'invoice_no',
                            label: 'Invoice Bill No',
                            render: (item) => <span className="font-mono text-xs font-semibold">{item.invoice_no}</span>
                          },
                          {
                            key: 'invoice_date',
                            label: 'Bill Date',
                            render: (item) => <span className="font-mono text-xs">{formatDate(item.invoice_date)}</span>
                          },
                          {
                            key: 'amount',
                            label: 'Billed Amount',
                            render: (item) => <span className="font-mono text-xs font-bold">{formatINR(item.amount)}</span>
                          },
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
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-border-color">
              <button
                type="button"
                onClick={() => setIsViewOpen(false)}
                className="btn btn-ghost px-4 py-2 text-xs font-mono uppercase tracking-wider"
              >
                Close Ledger
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default VendorsPage;
