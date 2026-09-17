import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { useRole } from '../../context/RoleContext';
import { getBOMs, createBOM, getBOMById, activateBOM, deleteBOM } from '../../api/productionApi';
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

  const handleDelete = async (bom) => {
    if (!window.confirm(`Delete BOM for "${bom.finished_item_name || 'this item'}" v${bom.version}? This cannot be undone.`)) return;
    try { await deleteBOM(bom.id); toast.success('BOM deleted.'); fetchBOMs(); }
    catch (err) { toast.error(err.response?.data?.message || 'Delete failed.'); }
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
    { key: 'finished_item_name', label: 'Finished Item', render: i => <div><div className="font-semibold">{i.finished_item_name}</div><div className="text-[10px] text-slate-400">{i.finished_item_code}</div></div> },
    { key: 'version', label: 'Version', render: i => `v${i.version}` },
    { key: 'is_active', label: 'Status', render: i => <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${i.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{i.is_active ? 'Active' : 'Draft'}</span> },
    { key: 'updated_at', label: 'Last Updated', render: i => formatDate(i.updated_at) },
    { key: 'actions', label: 'Actions', render: i => (
      <div className="flex gap-2">
        <button onClick={() => handleView(i)} className="text-slate-600 text-xs font-semibold bg-slate-50 px-2 py-1 rounded-md hover:bg-slate-100">View</button>
        {!i.is_active && hasPermission('production', 'edit') && <button onClick={() => handleActivate(i.id)} className="text-green-600 text-xs font-semibold bg-green-50 px-2 py-1 rounded-md hover:bg-green-100">Activate</button>}
        {hasPermission('production', 'delete') && <button onClick={() => handleDelete(i)} className="text-red-600 text-xs font-semibold bg-red-50 px-2 py-1 rounded-md hover:bg-red-100">Delete</button>}
      </div>
    )}
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Bill of Materials (BOM)</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Define raw material requirements per finished product with versioning support.</p>
        </div>
        {hasPermission('production', 'create') && <button onClick={openCreate} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">+ Create BOM</button>}
      </div>

      <Table columns={columns} data={boms} loading={loading} emptyMessage="No BOMs defined yet." />

      {/* Create BOM Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Create Bill of Materials" size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Finished / Semi-Finished Item *</label>
              <select required value={form.finished_item_id} onChange={e => setForm(p => ({ ...p, finished_item_id: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none">
                <option value="">— Select Item —</option>
                {finishedGoods.length > 0 ? finishedGoods.map(i => <option key={i.id} value={i.id}>{i.name} ({i.item_code})</option>) : allItems.map(i => <option key={i.id} value={i.id}>{i.name} ({i.item_code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes</label>
              <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Version remarks..." className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="rounded" />
              <label htmlFor="is_active" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Activate immediately</label>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Raw Materials Required</h4>
              <button type="button" onClick={addLine} className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100">+ Add Material</button>
            </div>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-500 uppercase text-left">Material Item</th>
                    <th className="px-3 py-3 font-semibold text-slate-500 uppercase text-center w-28">Qty Required</th>
                    <th className="px-3 py-3 font-semibold text-slate-500 uppercase w-24">Unit</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {bomLines.map((line, idx) => (
                    <tr key={idx}>
                      <td className="px-2 py-2">
                        <select required value={line.raw_material_id} onChange={e => setBomLines(p => p.map((l, i) => i === idx ? { ...l, raw_material_id: e.target.value } : l))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-1.5 px-2 text-sm text-slate-900 dark:text-white focus:outline-none">
                          <option value="">Select Item</option>
                          {allItems.map(i => <option key={i.id} value={i.id}>{i.name} ({i.item_code})</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-2"><input type="number" min="0.0001" step="any" required value={line.qty_required} onChange={e => setBomLines(p => p.map((l, i) => i === idx ? { ...l, qty_required: e.target.value } : l))} className="block w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 py-1.5 px-2 text-sm text-center focus:outline-none" /></td>
                      <td className="px-2 py-2"><input value={line.unit} onChange={e => setBomLines(p => p.map((l, i) => i === idx ? { ...l, unit: e.target.value } : l))} className="block w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 py-1.5 px-2 text-sm focus:outline-none" /></td>
                      <td className="px-2 py-2 text-center"><button type="button" onClick={() => removeLine(idx)} className="text-red-500 hover:text-red-700 p-1"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">Save BOM</button>
          </div>
        </form>
      </Modal>

      {/* View BOM Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title={`BOM Detail: ${viewBom?.finished_item_name} v${viewBom?.version}`} size="lg">
        {viewBom && (
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold">Finished Item</p>
                <p className="font-bold text-slate-900 dark:text-white">{viewBom.finished_item_name} <span className="text-slate-400 font-normal">({viewBom.finished_item_code})</span></p>
                <p className="text-xs text-slate-500 mt-0.5">Unit: {viewBom.finished_item_unit} · Version: v{viewBom.version}</p>
              </div>
              <div className="flex gap-2">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${viewBom.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{viewBom.is_active ? 'Active' : 'Draft'}</span>
                {!viewBom.is_active && hasPermission('production', 'edit') && <button onClick={() => handleActivate(viewBom.id)} className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-lg hover:bg-green-500">Activate</button>}
              </div>
            </div>
            <Table
              columns={[
                { key: 'material_name', label: 'Material', render: i => <div><div className="font-semibold">{i.material_name}</div><div className="text-[10px] text-slate-400">{i.item_code}</div></div> },
                { key: 'qty_required', label: 'Qty per Unit', render: i => parseFloat(i.qty_required) },
                { key: 'unit', label: 'Unit' },
                { key: 'current_stock', label: 'Current Stock', render: i => <span className={parseFloat(i.current_stock) > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{parseFloat(i.current_stock)}</span> }
              ]}
              data={viewItems}
              emptyMessage=""
            />
            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setIsViewOpen(false)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50">Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BOMPage;
