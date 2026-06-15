import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { useRole } from '../../context/RoleContext';
import { getAssets, createAsset, updateAsset, getAssetById } from '../../api/maintenanceApi';
import { formatDate } from '../../utils/formatDate';
import { formatINR } from '../../utils/formatCurrency';

const AssetsPage = () => {
  const { hasPermission } = useRole();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [detailSchedules, setDetailSchedules] = useState([]);
  const [detailLogs, setDetailLogs] = useState([]);
  const [detailIssues, setDetailIssues] = useState([]);

  const [form, setForm] = useState({ name: '', asset_code: '', location: '', purchase_date: '', purchase_value: '', status: 'Active' });

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getAssets();
      if (d.success) setAssets(d.assets);
    } catch { toast.error('Failed to load assets.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', asset_code: '', location: '', purchase_date: '', purchase_value: '', status: 'Active' });
    setIsFormOpen(true);
  };

  const openEdit = (asset) => {
    setEditing(asset);
    setForm({
      name: asset.name,
      asset_code: asset.asset_code,
      location: asset.location || '',
      purchase_date: asset.purchase_date ? asset.purchase_date.slice(0,10) : '',
      purchase_value: asset.purchase_value || '',
      status: asset.status
    });
    setIsFormOpen(true);
  };

  const handleOpenDetail = async (asset) => {
    try {
      const d = await getAssetById(asset.id);
      if (d.success) {
        setSelectedAsset(d.asset);
        setDetailSchedules(d.schedules);
        setDetailLogs(d.logs);
        setDetailIssues(d.issues);
        setIsDetailOpen(true);
      }
    } catch { toast.error('Failed to load asset details.'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateAsset(editing.id, form);
        toast.success('Asset updated.');
      } else {
        await createAsset(form);
        toast.success('Asset created.');
      }
      setIsFormOpen(false);
      fetchAssets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed.');
    }
  };

  const columns = [
    { key: 'asset_code', label: 'Asset Code' },
    { key: 'name', label: 'Asset Name' },
    { key: 'location', label: 'Location', render: i => i.location || '—' },
    { key: 'purchase_date', label: 'Purchase Date', render: i => i.purchase_date ? formatDate(i.purchase_date) : '—' },
    { key: 'purchase_value', label: 'Value (INR)', render: i => i.purchase_value ? formatINR(i.purchase_value) : '—' },
    { key: 'status', label: 'Status', render: i => {
      const cls = i.status === 'Active' ? 'bg-green-100 text-green-800 border-green-200' : i.status === 'Maintenance' ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-slate-100 text-slate-600 border-slate-200';
      return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${cls}`}>{i.status}</span>;
    }},
    { key: 'actions', label: 'Actions', render: i => (
      <div className="flex gap-2">
        <button onClick={() => handleOpenDetail(i)} className="text-slate-600 text-xs font-semibold bg-slate-50 px-2 py-1 rounded-md hover:bg-slate-100">View History</button>
        {hasPermission('maintenance', 'edit') && <button onClick={() => openEdit(i)} className="text-blue-600 text-xs font-semibold bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100">Edit</button>}
      </div>
    )}
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Asset Management</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Track industrial assets, tooling, and machinery across locations.</p>
        </div>
        {hasPermission('maintenance', 'create') && <button onClick={openCreate} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">+ Add Asset</button>}
      </div>

      <Table columns={columns} data={assets} loading={loading} emptyMessage="No assets registered." />

      {/* Form Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editing ? 'Edit Asset' : 'Add New Asset'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Asset Code *</label>
              <input required value={form.asset_code} onChange={e => setForm(p => ({ ...p, asset_code: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" placeholder="e.g. CNC-01" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Asset Name *</label>
              <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" placeholder="CNC Milling Machine" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Location</label>
              <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" placeholder="Shopfloor A" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none">
                <option value="Active">Active</option>
                <option value="Maintenance">Under Maintenance</option>
                <option value="Retired">Retired</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Purchase Date</label>
              <input type="date" value={form.purchase_date} onChange={e => setForm(p => ({ ...p, purchase_date: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Value (INR)</label>
              <input type="number" step="0.01" value={form.purchase_value} onChange={e => setForm(p => ({ ...p, purchase_value: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">Save Asset</button>
          </div>
        </form>
      </Modal>

      {/* History Modal */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={`Asset History: ${selectedAsset?.name}`} size="lg">
        {selectedAsset && (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase mb-2">Maintenance Schedules</h4>
              <Table
                columns={[
                  { key: 'frequency', label: 'Frequency' },
                  { key: 'next_due_date', label: 'Next Due Date', render: i => formatDate(i.next_due_date) },
                  { key: 'assigned_to_name', label: 'Assigned To', render: i => i.assigned_to_name || 'Unassigned' }
                ]}
                data={detailSchedules}
                emptyMessage="No schedules."
              />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase mb-2">Completed Runs Log</h4>
              <Table
                columns={[
                  { key: 'performed_at', label: 'Date Performed', render: i => formatDate(i.performed_at) },
                  { key: 'performed_by_name', label: 'Performed By', render: i => i.performed_by_name || 'System' },
                  { key: 'notes', label: 'Notes' }
                ]}
                data={detailLogs}
                emptyMessage="No runs completed."
              />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase mb-2">Issue Logs</h4>
              <Table
                columns={[
                  { key: 'description', label: 'Description' },
                  { key: 'priority', label: 'Priority' },
                  { key: 'status', label: 'Status' },
                  { key: 'reported_at', label: 'Reported At', render: i => formatDate(i.reported_at) }
                ]}
                data={detailIssues}
                emptyMessage="No issues logged."
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AssetsPage;
