import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { useRole } from '../../context/RoleContext';
import { getBOMs, createBOM, getBOMById, activateBOM, deleteBOM, updateBOM } from '../../api/productionApi';
import { getItems } from '../../api/storeApi';
import { formatDate } from '../../utils/formatDate';

const UNITS = ['Pcs', 'Kg', 'Ltr', 'Mtr', 'Box', 'Set', 'Nos', 'Pair', 'Roll', 'Sheet'];

const BOMPage = () => {
  const { hasPermission } = useRole();
  const [boms, setBoms] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewBom, setViewBom] = useState(null);
  const [viewItems, setViewItems] = useState([]);
  const [form, setForm] = useState({ finished_item_id: '', notes: '', is_active: false });
  const [bomLines, setBomLines] = useState([{ raw_material_id: '', qty_required: 1, unit: 'Pcs' }]);
  const [submitting, setSubmitting] = useState(false);
  const [editingBom, setEditingBom] = useState(null);

  const fetchBOMs = useCallback(async () => {
    setLoading(true);
    try { const d = await getBOMs(); if (d.success) setBoms(d.boms); }
    catch { toast.error('Failed to load BOMs.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchBOMs();
    getItems({ limit: 500 }).then(d => {
      if (d.success) {
        setAllItems(d.items);
        setFinishedGoods(d.items.filter(i => i.item_type === 'Finished Good' || i.item_type === 'Semi-Finished'));
        setRawMaterials(d.items.filter(i => i.item_type !== 'Finished Good'));
      }
    }).catch(() => {});
  }, [fetchBOMs]);

  const openCreate = () => {
    setEditingBom(null);
    const defaultMat = rawMaterials[0] || allItems[0];
    setForm({ finished_item_id: finishedGoods[0]?.id || '', notes: '', is_active: false });
    setBomLines([{ raw_material_id: defaultMat?.id || '', qty_required: 1, unit: defaultMat?.unit || 'Pcs' }]);
    setIsFormOpen(true);
  };

  const openEdit = async (bom) => {
    try {
      const d = await getBOMById(bom.id);
      if (d.success) {
        setEditingBom(d.bom);
        setForm({ finished_item_id: d.bom.finished_item_id, notes: d.bom.notes || '', is_active: d.bom.is_active });
        setBomLines(d.items.map(item => ({
          raw_material_id: item.raw_material_id,
          qty_required: parseFloat(item.qty_required),
          unit: item.unit
        })));
        setIsViewOpen(false);
        setIsFormOpen(true);
      }
    } catch {
      toast.error('Failed to load BOM for editing.');
    }
  };

  const handleView = async (bom) => {
    try {
      const d = await getBOMById(bom.id);
      if (d.success) { setViewBom(d.bom); setViewItems(d.items); setIsViewOpen(true); }
    } catch { toast.error('Failed to load BOM details.'); }
  };

  const handleActivate = async (id) => {
    try { await activateBOM(id); toast.success('BOM version activated.'); fetchBOMs(); setIsViewOpen(false); }
    catch { toast.error('Activation failed.'); }
  };

  const handleDelete = async (bom) => {
    if (!window.confirm(`Delete BOM for "${bom.finished_item_name || 'this item'}" v${bom.version}? This cannot be undone.`)) return;
    try { await deleteBOM(bom.id); toast.success('BOM deleted.'); fetchBOMs(); }
    catch (err) { toast.error(err.response?.data?.message || 'Delete failed.'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!form.finished_item_id) return toast.error('Select a finished item.');
    if (bomLines.some(l => !l.raw_material_id || l.qty_required <= 0)) return toast.error('All lines need a material and qty > 0.');

    setSubmitting(true);
    try {
      let d;
      if (editingBom) {
        d = await updateBOM(editingBom.id, { ...form, items: bomLines });
        if (d.success) toast.success('BOM updated successfully.');
      } else {
        d = await createBOM({ ...form, items: bomLines });
        if (d.success) toast.success('BOM created successfully.');
      }
      if (d?.success) {
        setIsFormOpen(false);
        fetchBOMs();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || (editingBom ? 'Update BOM failed.' : 'Create BOM failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  const addLine = () => {
    const defaultMat = rawMaterials[0] || allItems[0];
    setBomLines(p => [...p, { raw_material_id: defaultMat?.id || '', qty_required: 1, unit: defaultMat?.unit || 'Pcs' }]);
  };
  const removeLine = (i) => { if (bomLines.length === 1) return; setBomLines(p => p.filter((_, idx) => idx !== i)); };
  const handleMaterialChange = (idx, itemId) => {
    const selectedItem = allItems.find(i => String(i.id) === String(itemId));
    setBomLines(p => p.map((l, i) => i === idx ? { ...l, raw_material_id: itemId, unit: selectedItem?.unit || l.unit || 'Pcs' } : l));
  };

  const columns = [
    {
      key: 'finished_item_name',
      label: 'Finished Item',
      render: i => (
        <div>
          <div className="font-semibold text-text-primary">{i.finished_item_name}</div>
          <div className="font-mono text-[10px] text-text-muted">{i.finished_item_code}</div>
        </div>
      )
    },
    {
      key: 'version',
      label: 'Version',
      render: i => <span className="font-mono text-xs font-bold text-accent-primary">v{i.version}</span>
    },
    {
      key: 'is_active',
      label: 'Status',
      render: i => <StatusBadge status={i.is_active ? 'Active' : 'Draft'} />
    },
    {
      key: 'updated_at',
      label: 'Last Updated',
      render: i => <span className="font-mono text-xs text-text-secondary">{formatDate(i.updated_at)}</span>
    },
    {
      key: 'actions',
      label: 'Actions',
      render: i => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleView(i)}
            className="btn btn-ghost px-2 py-1 text-xs font-mono uppercase tracking-wider"
          >
            View
          </button>
          {!i.is_active && hasPermission('production', 'edit') && (
            <button
              onClick={() => openEdit(i)}
              className="btn btn-ghost px-2 py-1 text-xs font-mono uppercase tracking-wider text-accent-primary"
            >
              Edit
            </button>
          )}
          {!i.is_active && hasPermission('production', 'edit') && (
            <button
              onClick={() => handleActivate(i.id)}
              className="btn btn-ghost px-2 py-1 text-xs font-mono uppercase tracking-wider text-accent-success"
            >
              Activate
            </button>
          )}
          {hasPermission('production', 'delete') && (
            <button
              onClick={() => handleDelete(i)}
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
      <PageHeader
        title="Bill of Materials (BOM)"
        description="Define raw material requirements per finished product with versioning support."
        actions={
          hasPermission('production', 'create') && (
            <button
              onClick={openCreate}
              className="btn btn-primary px-4 py-2 text-xs font-mono uppercase tracking-wider"
            >
              + Create BOM
            </button>
          )
        }
      />

      {/* Main Table */}
      <div className="sheet">
        <Table columns={columns} data={boms} loading={loading} emptyMessage="No BOMs defined yet." />
      </div>

      {/* Create / Edit BOM Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingBom ? 'Edit Bill of Materials' : 'Create Bill of Materials'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-5 font-sans">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Finished / Semi-Finished Item *</label>
              <select
                required
                value={form.finished_item_id}
                onChange={e => !editingBom && setForm(p => ({ ...p, finished_item_id: e.target.value }))}
                className={`field font-sans ${editingBom ? 'opacity-70 cursor-not-allowed' : ''}`}
                disabled={!!editingBom}
              >
                <option value="">— Select Item —</option>
                {finishedGoods.length > 0 ? finishedGoods.map(i => <option key={i.id} value={i.id}>{i.name} ({i.item_code})</option>) : allItems.map(i => <option key={i.id} value={i.id}>{i.name} ({i.item_code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Notes</label>
              <input
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Version remarks..."
                className="field font-sans"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                className="w-4 h-4 rounded-none accent-accent-primary"
              />
              <label htmlFor="is_active" className="text-xs font-mono uppercase tracking-wider text-text-secondary cursor-pointer">
                Activate immediately
              </label>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-display text-sm font-bold uppercase tracking-wider text-text-primary">Raw Materials Required (BOM Table)</h4>
              <button
                type="button"
                onClick={addLine}
                className="btn btn-ghost px-2.5 py-1 text-xs font-mono uppercase tracking-wider text-accent-primary"
              >
                + Add Material
              </button>
            </div>
            <div className="sheet overflow-hidden">
              <table className="w-full text-xs font-mono border-collapse">
                <thead className="bg-bg-secondary border-b border-border-color text-[10px] uppercase tracking-wider text-text-muted">
                  <tr>
                    <th className="px-3 py-2.5 text-left">Material Item</th>
                    <th className="px-3 py-2.5 text-center w-32">Qty Required</th>
                    <th className="px-3 py-2.5 text-center w-24">Unit</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color">
                  {bomLines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-bg-hover">
                      <td className="p-2">
                        <select
                          required
                          value={line.raw_material_id}
                          onChange={e => handleMaterialChange(idx, e.target.value)}
                          className="field py-1 px-2 text-xs font-sans"
                        >
                          <option value="">Select Item</option>
                          {allItems.map(i => <option key={i.id} value={i.id}>{i.name} ({i.item_code})</option>)}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0.0001"
                          step="any"
                          required
                          value={line.qty_required}
                          onChange={e => setBomLines(p => p.map((l, i) => i === idx ? { ...l, qty_required: e.target.value } : l))}
                          className="field py-1 px-2 text-xs text-center font-mono"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <span className="font-mono text-xs text-text-secondary">
                          {line.unit || 'Pcs'}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="btn btn-ghost px-1.5 py-1 text-xs text-accent-danger hover:bg-accent-danger/10"
                          title="Remove line"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="btn btn-ghost px-4 py-2 text-xs font-mono uppercase tracking-wider"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary px-4 py-2 text-xs font-mono uppercase tracking-wider flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Saving...
                </>
              ) : (
                editingBom ? 'Update BOM' : 'Save BOM'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* View BOM Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title={`BOM Detail: ${viewBom?.finished_item_name} v${viewBom?.version}`} size="lg">
        {viewBom && (
          <div className="space-y-4 font-sans">
            <div className="flex flex-wrap justify-between items-center gap-3 p-4 sheet bg-bg-secondary">
              <div>
                <p className="text-[10px] text-text-muted uppercase font-mono tracking-wider">Finished Item</p>
                <p className="font-bold text-text-primary text-base mt-0.5">{viewBom.finished_item_name} <span className="text-text-muted font-mono font-normal">({viewBom.finished_item_code})</span></p>
                <p className="text-xs font-mono text-text-secondary mt-0.5">Unit: {viewBom.finished_item_unit} · Version: v{viewBom.version}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={viewBom.is_active ? 'Active' : 'Draft'} />
                {!viewBom.is_active && hasPermission('production', 'edit') && (
                  <button
                    onClick={() => openEdit(viewBom)}
                    className="btn btn-ghost px-2.5 py-1 text-xs font-mono uppercase tracking-wider text-accent-primary"
                  >
                    Edit BOM
                  </button>
                )}
                {!viewBom.is_active && hasPermission('production', 'edit') && (
                  <button
                    onClick={() => handleActivate(viewBom.id)}
                    className="btn btn-primary px-2.5 py-1 text-xs font-mono uppercase tracking-wider bg-accent-success hover:brightness-110"
                  >
                    Activate
                  </button>
                )}
              </div>
            </div>
            <div className="sheet">
              <Table
                columns={[
                  {
                    key: 'material_name',
                    label: 'Material',
                    render: i => (
                      <div>
                        <div className="font-medium text-text-primary">{i.material_name}</div>
                        <div className="font-mono text-[10px] text-text-muted">{i.item_code}</div>
                      </div>
                    )
                  },
                  {
                    key: 'qty_required',
                    label: 'Qty per Unit',
                    render: i => <span className="font-mono text-xs">{parseFloat(i.qty_required)}</span>
                  },
                  {
                    key: 'unit',
                    label: 'Unit',
                    render: i => <span className="font-mono text-xs text-text-muted">{i.unit}</span>
                  },
                  {
                    key: 'current_stock',
                    label: 'Current Stock',
                    render: i => (
                      <span className={`font-mono text-xs font-bold ${parseFloat(i.current_stock) > 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
                        {parseFloat(i.current_stock)}
                      </span>
                    )
                  }
                ]}
                data={viewItems}
                emptyMessage=""
              />
            </div>
            <div className="flex justify-end pt-4 border-t border-border-color">
              <button
                onClick={() => setIsViewOpen(false)}
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

export default BOMPage;
