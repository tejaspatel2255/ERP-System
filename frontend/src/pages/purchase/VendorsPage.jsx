import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import SearchBar from '../../components/SearchBar';
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
    { key: 'name', label: 'Vendor Name' },
    { key: 'email', label: 'Email', render: (item) => item.email || 'N/A' },
    { key: 'phone', label: 'Phone', render: (item) => item.phone || 'N/A' },
    { key: 'gstin', label: 'GSTIN', render: (item) => item.gstin || 'N/A' },
    { key: 'payment_terms', label: 'Terms', render: (item) => item.payment_terms || 'Net 30' },
    { key: 'total_pos', label: 'Total POs', render: (item) => item.total_pos || 0 },
    {
      key: 'total_spend',
      label: 'Total Spend',
      render: (item) => formatINR(item.total_spend)
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewVendor(item)}
            className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300 font-semibold text-xs bg-slate-50 dark:bg-slate-900/10 px-2 py-1 rounded-md"
          >
            History
          </button>
          {hasPermission('purchase', 'edit') && (
            <button
              onClick={() => handleOpenEdit(item)}
              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 font-semibold text-xs bg-blue-50 dark:bg-blue-900/10 px-2 py-1 rounded-md"
            >
              Edit
            </button>
          )}
          {hasPermission('purchase', 'delete') && (
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Vendor Directory</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage supplier profiles, payment terms, and monitor total spend volume.</p>
        </div>

        {hasPermission('purchase', 'create') && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
          >
            Create Vendor
          </button>
        )}
      </div>

      {/* Filter and search bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <SearchBar value={search} onChange={(val) => { setSearch(val); setPage(1); }} placeholder="Search vendors by name, email, or GSTIN..." />
        </div>
      </div>

      {/* Main Table */}
      <Table columns={columns} data={vendors} loading={loading} emptyMessage="No vendors found." />

      {/* Pagination */}
      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* CREATE & EDIT FORM MODAL */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingVendor ? 'Modify Vendor Profile' : 'Create Vendor Profile'}>
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Supplier / Vendor Name *</label>
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
                placeholder="15-digit code"
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
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Contact Phone</label>
              <input
                type="text"
                name="phone"
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Address Details</label>
              <textarea
                name="address"
                rows={2}
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                value={formData.address}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Terms</label>
              <select
                name="payment_terms"
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none"
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

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Save Vendor
            </button>
          </div>
        </form>
      </Modal>

      {/* VIEW VENDOR HISTORY DOSSIER */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Vendor Profile & Ledger Dossier" size="lg">
        {viewingVendor && (
          <div className="space-y-6">
            {/* Summary details card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800">
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vendor Info</h4>
                <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">{viewingVendor.name}</p>
                <p className="text-xs text-slate-500">{viewingVendor.email || 'No email'}</p>
                <p className="text-xs text-slate-500">{viewingVendor.phone || 'No phone'}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">GSTIN & Address</h4>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">GST: {viewingVendor.gstin || 'Unregistered'}</p>
                <p className="text-xs text-slate-500 max-w-[200px] truncate">{viewingVendor.address || 'No Address'}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Credit Terms & Balances</h4>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Terms: <span className="font-bold">{viewingVendor.payment_terms || 'Net 30'}</span></p>
                <p className="text-sm text-slate-650">
                  Outstanding Due:{' '}
                  <span className={`font-bold ${viewingHistory.outstanding > 0 ? 'text-red-650 dark:text-red-400' : 'text-green-600'}`}>
                    {formatINR(viewingHistory.outstanding)}
                  </span>
                </p>
              </div>
            </div>

            {/* History ledgers */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-950 dark:text-white uppercase tracking-wider">Transaction Records</h3>
              
              {historyLoading ? (
                <div className="py-12 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Purchase Orders sub-table */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Purchase Orders Issued</h4>
                    <Table
                      columns={[
                        { key: 'po_no', label: 'PO No' },
                        { key: 'po_date', label: 'Order Date', render: (item) => formatDate(item.po_date) },
                        {
                          key: 'approval_status',
                          label: 'Approval',
                          render: (item) => (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              item.approval_status === 'Approved' ? 'bg-green-155 text-green-800' :
                              item.approval_status === 'Rejected' ? 'bg-red-100 text-red-800' :
                              'bg-orange-100 text-orange-850'
                            }`}>
                              {item.approval_status}
                            </span>
                          )
                        },
                        { key: 'status', label: 'Delivery Status' },
                        { key: 'total_amount', label: 'PO Total', render: (item) => formatINR(item.total_amount) }
                      ]}
                      data={viewingHistory.pos}
                      emptyMessage="No purchase orders created for this supplier."
                    />
                  </div>

                  {/* Vendor Invoices sub-table */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Supplier Invoices (Bills)</h4>
                    <Table
                      columns={[
                        { key: 'invoice_no', label: 'Invoice Bill No' },
                        { key: 'invoice_date', label: 'Bill Date', render: (item) => formatDate(item.invoice_date) },
                        { key: 'amount', label: 'Billed Amount', render: (item) => formatINR(item.amount) },
                        {
                          key: 'status',
                          label: 'Payment',
                          render: (item) => (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              item.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-850'
                            }`}>
                              {item.status}
                            </span>
                          )
                        }
                      ]}
                      data={viewingHistory.invoices}
                      emptyMessage="No bills/vendor invoices recorded for this supplier."
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsViewOpen(false)}
                className="rounded-lg border border-slate-350 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
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
