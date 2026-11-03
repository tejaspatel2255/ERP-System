import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { useRole } from '../../context/RoleContext';
import { getBOMs, createBOM, getBOMById, activateBOM } from '../../api/productionApi';
import { getItems } from '../../api/storeApi';
import { formatDate } from '../../utils/formatDate';

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
    setForm({ finished_item_id: finishedGoods[0]?.id || '', notes: '', is_active: false });
    setBomLines([{ raw_material_id: rawMaterials[0]?.id || '', qty_required: 1, unit: 'Pcs' }]);
    setIsFormOpen(true);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.finished_item_id) return toast.error('Select a finished item.');
    if (bomLines.some(l => !l.raw_material_id || l.qty_required <= 0)) return toast.error('All lines need a material and qty > 0.');
    try {
      const d = await createBOM({ ...form, items: bomLines });
      if (d.success) { toast.success('BOM created.'); setIsFormOpen(false); fetchBOMs(); }
    } catch (err) { toast.error(err.response?.data?.message || 'Create BOM failed.'); }
  };

  const addLine = () => setBomLines(p => [...p, { raw_material_id: rawMaterials[0]?.id || '', qty_required: 1, unit: 'Pcs' }]);
  const removeLine = (i) => { if (bomLines.length === 1) return; setBomLines(p => p.filter((_, idx) => idx !== i)); };

  const columns = [
    { key: 'finished_item_name', label: 'Finished Item', render: i => <div><div className="font-medium text-text-primary">{i.finished_item_name}</div><div className="text-xs text-text-muted"><span className="stamp">{i.finished_item_code}</span></div></div> },
    { key: 'version', label: 'Version', render: i => <span className="stamp">v{i.version}</span> },
    { key: 'is_active', label: 'Status', render: i => <StatusBadge status={i.is_active ? 'Active' : 'Draft'} /> },
    { key: 'updated_at', label: 'Last Updated', render: i => formatDate(i.updated_at) },
    { key: 'actions', label: 'Actions', render: i => (
      <div className="flex gap-1.5">
        <button onClick={() => handleView(i)} className="btn-secondary btn-xs">View</button>
        {!i.is_active && hasPermission('production', 'edit') && <button onClick={() => handleActivate(i.id)} className="btn-secondary btn-xs text-[var(--success-text)] hover:border-[var(--success-border)]">Activate</button>}
      </div>
    )}
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Bill of Materials (BOM)"
        subtitle="Define raw material requirements per finished product with versioning support."
        actions={
          hasPermission('production', 'create') && <button onClick={openCreate} className="btn-primary">+ Create BOM</button>
        }
      />

      <Table columns={columns} data={boms} loading={loading} emptyMessage="No BOMs defined yet." />

      {/* Create BOM Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Create Bill of Materials" size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Finished / Semi-Finished Item *</label>
              <select required value={form.finished_item_id} onChange={e => setForm(p => ({ ...p, finished_item_id: e.target.value }))} className="field">
                <option value="">— Select Item —</option>
                {finishedGoods.length > 0 ? finishedGoods.map(i => <option key={i.id} value={i.id}>{i.name} ({i.item_code})</option>) : allItems.map(i => <option key={i.id} value={i.id}>{i.name} ({i.item_code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Notes</label>
              <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Version remarks..." className="field" />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="rounded" />
              <label htmlFor="is_active" className="text-sm font-medium text-text-secondary cursor-pointer">Activate immediately</label>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-semibold text-text-primary">Raw Materials Required</h4>
              <button type="button" onClick={addLine} className="btn-secondary btn-xs">+ Add Material</button>
            </div>
            <div className="sheet overflow-hidden">
              <table className="bom w-full text-xs">
                <thead>
                  <tr>
                    <th className="px-4 py-2.5 font-semibold text-left">Material Item</th>
                    <th className="px-3 py-2.5 font-semibold text-center w-28">Qty Required</th>
                    <th className="px-3 py-2.5 font-semibold w-24">Unit</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {bomLines.map((line, idx) => (
                    <tr key={idx} className="bom-row">
                      <td className="px-2 py-2">
                        <select required value={line.raw_material_id} onChange={e => setBomLines(p => p.map((l, i) => i === idx ? { ...l, raw_material_id: e.target.value } : l))} className="field py-1.5 px-2 text-sm">
                          <option value="">Select Item</option>
                          {allItems.map(i => <option key={i.id} value={i.id}>{i.name} ({i.item_code})</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-2"><input type="number" min="0.0001" step="any" required value={line.qty_required} onChange={e => setBomLines(p => p.map((l, i) => i === idx ? { ...l, qty_required: e.target.value } : l))} className="field py-1.5 px-2 text-sm text-center tabular-nums" /></td>
                      <td className="px-2 py-2"><input value={line.unit} onChange={e => setBomLines(p => p.map((l, i) => i === idx ? { ...l, unit: e.target.value } : l))} className="field py-1.5 px-2 text-sm" /></td>
                      <td className="px-2 py-2 text-center"><button type="button" onClick={() => removeLine(idx)} className="text-[var(--danger-text)] hover:opacity-80 p-1"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button type="button" onClick={() => setIsFormOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save BOM</button>
          </div>
        </form>
      </Modal>

      {/* View BOM Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title={`BOM Detail: ${viewBom?.finished_item_name} v${viewBom?.version}`} size="lg">
        {viewBom && (
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 sheet">
              <div>
                <p className="text-xs text-text-muted font-medium">Finished Item</p>
                <p className="font-semibold text-text-primary">{viewBom.finished_item_name} <span className="text-text-muted font-normal">(<span className="stamp">{viewBom.finished_item_code}</span>)</span></p>
                <p className="text-xs text-text-secondary mt-0.5">Unit: {viewBom.finished_item_unit} · Version: v{viewBom.version}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={viewBom.is_active ? 'Active' : 'Draft'} />
                {!viewBom.is_active && hasPermission('production', 'edit') && <button onClick={() => handleActivate(viewBom.id)} className="btn-secondary btn-xs text-[var(--success-text)] hover:border-[var(--success-border)]">Activate</button>}
              </div>
            </div>
            <Table
              columns={[
                { key: 'material_name', label: 'Material', render: i => <div><div className="font-medium text-text-primary">{i.material_name}</div><div className="text-xs text-text-muted"><span className="stamp">{i.item_code}</span></div></div> },
                { key: 'qty_required', label: 'Qty per Unit', render: i => <span className="tabular-nums">{parseFloat(i.qty_required)}</span> },
                { key: 'unit', label: 'Unit' },
                { key: 'current_stock', label: 'Current Stock', render: i => <span className={`font-semibold tabular-nums ${parseFloat(i.current_stock) > 0 ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]'}`}>{parseFloat(i.current_stock)}</span> }
              ]}
              data={viewItems}
              emptyMessage=""
            />
            <div className="flex justify-end pt-4 border-t border-border-color">
              <button onClick={() => setIsViewOpen(false)} className="btn-secondary">Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BOMPage;