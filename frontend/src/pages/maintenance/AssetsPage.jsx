import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
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
    {
      key: 'asset_code',
      label: 'Asset Code',
      render: i => (
        <span className="font-mono text-xs font-semibold tracking-wider text-text-primary">
          {i.asset_code}
        </span>
      )
    },
    {
      key: 'name',
      label: 'Asset Name',
      render: i => <span className="font-medium text-text-primary">{i.name}</span>
    },
    {
      key: 'location',
      label: 'Location',
      render: i => <span className="font-mono text-xs text-text-secondary">{i.location || '—'}</span>
    },
    {
      key: 'purchase_date',
      label: 'Purchase Date',
      render: i => <span className="font-mono text-xs text-text-secondary">{i.purchase_date ? formatDate(i.purchase_date) : '—'}</span>
    },
    {
      key: 'purchase_value',
      label: 'Value (INR)',
      render: i => <span className="font-mono text-xs font-bold text-text-primary">{i.purchase_value ? formatINR(i.purchase_value) : '—'}</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: i => <StatusBadge status={i.status} />
    },
    {
      key: 'actions',
      label: 'Actions',
      render: i => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleOpenDetail(i)}
            className="btn btn-ghost px-2 py-1 text-xs font-mono uppercase tracking-wider"
          >
            History
          </button>
          {hasPermission('maintenance', 'edit') && (
            <button
              onClick={() => openEdit(i)}
              className="btn btn-ghost px-2 py-1 text-xs font-mono uppercase tracking-wider text-accent-primary"
            >
              Edit
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 animate-fadeIn font-sans">
      <PageHeader
        title="Asset Management"
        description="Track industrial assets, tooling, and machinery across locations."
        actions={
          hasPermission('maintenance', 'create') && (
            <button
              onClick={openCreate}
              className="btn btn-primary px-4 py-2 text-xs font-mono uppercase tracking-wider"
            >
              + Add Asset
            </button>
          )
        }
      />

      <div className="sheet">
        <Table columns={columns} data={assets} loading={loading} emptyMessage="No assets registered." />
      </div>

      {/* Form Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editing ? 'Edit Asset' : 'Add New Asset'}>
        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Asset Code *</label>
              <input
                required
                value={form.asset_code}
                onChange={e => setForm(p => ({ ...p, asset_code: e.target.value }))}
                className="field font-mono"
                placeholder="e.g. CNC-01"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Asset Name *</label>
              <input
                required
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="field font-sans"
                placeholder="CNC Milling Machine"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Location</label>
              <input
                value={form.location}
                onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                className="field font-sans"
                placeholder="Shopfloor A"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="field font-sans"
              >
                <option value="Active">Active</option>
                <option value="Maintenance">Under Maintenance</option>
                <option value="Retired">Retired</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Purchase Date</label>
              <input
                type="date"
                value={form.purchase_date}
                onChange={e => setForm(p => ({ ...p, purchase_date: e.target.value }))}
                className="field font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Value (INR)</label>
              <input
                type="number"
                step="0.01"
                value={form.purchase_value}
                onChange={e => setForm(p => ({ ...p, purchase_value: e.target.value }))}
                className="field font-mono"
              />
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
              Save Asset
            </button>
          </div>
        </form>
      </Modal>

      {/* History Modal */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={`Asset History: ${selectedAsset?.name}`} size="lg">
        {selectedAsset && (
          <div className="space-y-6 font-sans">
            <div>
              <h4 className="font-display text-sm font-bold uppercase tracking-wider text-text-primary mb-2">Maintenance Schedules</h4>
              <div className="sheet">
                <Table
                  columns={[
                    { key: 'frequency', label: 'Frequency' },
                    { key: 'next_due_date', label: 'Next Due Date', render: i => <span className="font-mono text-xs">{formatDate(i.next_due_date)}</span> },
                    { key: 'assigned_to_name', label: 'Assigned To', render: i => i.assigned_to_name || 'Unassigned' }
                  ]}
                  data={detailSchedules}
                  emptyMessage="No schedules."
                />
              </div>
            </div>
            <div>
              <h4 className="font-display text-sm font-bold uppercase tracking-wider text-text-primary mb-2">Completed Runs Log</h4>
              <div className="sheet">
                <Table
                  columns={[
                    { key: 'performed_at', label: 'Date Performed', render: i => <span className="font-mono text-xs">{formatDate(i.performed_at)}</span> },
                    { key: 'performed_by_name', label: 'Performed By', render: i => i.performed_by_name || 'System' },
                    { key: 'notes', label: 'Notes' }
                  ]}
                  data={detailLogs}
                  emptyMessage="No runs completed."
                />
              </div>
            </div>
            <div>
              <h4 className="font-display text-sm font-bold uppercase tracking-wider text-text-primary mb-2">Issue Logs</h4>
              <div className="sheet">
                <Table
                  columns={[
                    { key: 'description', label: 'Description' },
                    { key: 'priority', label: 'Priority', render: i => <StatusBadge status={i.priority} /> },
                    { key: 'status', label: 'Status', render: i => <StatusBadge status={i.status} /> },
                    { key: 'reported_at', label: 'Reported At', render: i => <span className="font-mono text-xs text-text-muted">{formatDate(i.reported_at)}</span> }
                  ]}
                  data={detailIssues}
                  emptyMessage="No issues logged."
                />
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-border-color">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="btn btn-ghost px-4 py-2 text-xs font-mono uppercase tracking-wider"
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

export default AssetsPage;
