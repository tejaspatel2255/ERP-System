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
      const warning = err.response?.data;
      if (editing && warning?.warning && warning.affectedWorkOrders?.length) {
        const workOrderList = warning.affectedWorkOrders.map(workOrder => `${workOrder.wo_no} (${workOrder.status})`).join(', ');
        if (window.confirm(`${warning.message}\n\nAffected work orders: ${workOrderList}\n\nContinue status change?`)) {
          try {
            await updateAsset(editing.id, { ...form, confirm_affected_work_orders: true });
            toast.success('Asset updated. Active work orders were flagged.');
            setIsFormOpen(false);
            fetchAssets();
          } catch (retryError) {
            toast.error(retryError.response?.data?.message || 'Save failed.');
          }
          return;
        }
        return;
      }
      toast.error(err.response?.data?.message || 'Save failed.');
    }
  };

  const columns = [
    { key: 'asset_code', label: 'Asset Code', render: i => <span className="stamp">{i.asset_code}</span> },
    { key: 'name', label: 'Asset Name', render: i => <span className="font-medium text-text-primary">{i.name}</span> },
    { key: 'location', label: 'Location', render: i => i.location || '—' },
    { key: 'purchase_date', label: 'Purchase Date', render: i => i.purchase_date ? <span className="tabular-nums">{formatDate(i.purchase_date)}</span> : '—' },
    { key: 'purchase_value', label: 'Value (INR)', render: i => i.purchase_value ? <span className="tabular-nums font-semibold">{formatINR(i.purchase_value)}</span> : '—' },
    { key: 'status', label: 'Status', render: i => <StatusBadge status={i.status} /> },
    { key: 'actions', label: 'Actions', render: i => (
      <div className="flex gap-1.5">
        <button onClick={() => handleOpenDetail(i)} className="btn-secondary btn-xs">View History</button>
        {hasPermission('maintenance', 'edit') && <button onClick={() => openEdit(i)} className="btn-secondary btn-xs">Edit</button>}
      </div>
    )}
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Asset Management"
        subtitle="Track industrial assets, tooling, and machinery across locations."
        actions={
          hasPermission('maintenance', 'create') && <button onClick={openCreate} className="btn-primary">+ Add Asset</button>
        }
      />

      <Table columns={columns} data={assets} loading={loading} emptyMessage="No assets registered." />

      {/* Form Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editing ? 'Edit Asset' : 'Add New Asset'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Asset Code *</label>
              <input required value={form.asset_code} onChange={e => setForm(p => ({ ...p, asset_code: e.target.value }))} className="field font-mono" placeholder="e.g. CNC-01" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Asset Name *</label>
              <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="field" placeholder="CNC Milling Machine" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Location</label>
              <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} className="field" placeholder="Shopfloor A" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="field">
                <option value="Active">Active</option>
                <option value="Maintenance">Under Maintenance</option>
                <option value="Retired">Retired</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Purchase Date</label>
              <input type="date" value={form.purchase_date} onChange={e => setForm(p => ({ ...p, purchase_date: e.target.value }))} className="field" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Value (INR)</label>
              <input type="number" step="0.01" value={form.purchase_value} onChange={e => setForm(p => ({ ...p, purchase_value: e.target.value }))} className="field tabular-nums" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button type="button" onClick={() => setIsFormOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Asset</button>
          </div>
        </form>
      </Modal>

      {/* History Modal */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={`Asset History: ${selectedAsset?.name}`} size="lg">
        {selectedAsset && (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-2">Maintenance Schedules</h4>
              <Table
                columns={[
                  { key: 'frequency', label: 'Frequency' },
                  { key: 'next_due_date', label: 'Next Due Date', render: i => <span className="tabular-nums">{formatDate(i.next_due_date)}</span> },
                  { key: 'assigned_to_name', label: 'Assigned To', render: i => i.assigned_to_name || 'Unassigned' }
                ]}
                data={detailSchedules}
                emptyMessage="No schedules."
              />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-2">Completed Runs Log</h4>
              <Table
                columns={[
                  { key: 'performed_at', label: 'Date Performed', render: i => <span className="tabular-nums">{formatDate(i.performed_at)}</span> },
                  { key: 'performed_by_name', label: 'Performed By', render: i => i.performed_by_name || 'System' },
                  { key: 'notes', label: 'Notes' }
                ]}
                data={detailLogs}
                emptyMessage="No runs completed."
              />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-2">Issue Logs</h4>
              <Table
                columns={[
                  { key: 'description', label: 'Description' },
                  { key: 'priority', label: 'Priority', render: i => <StatusBadge status={i.priority} /> },
                  { key: 'status', label: 'Status', render: i => <StatusBadge status={i.status} /> },
                  { key: 'reported_at', label: 'Reported At', render: i => <span className="tabular-nums">{formatDate(i.reported_at)}</span> }
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