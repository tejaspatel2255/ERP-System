import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { useRole } from '../../context/RoleContext';
import { getWorkOrders, createWorkOrder, createWorkOrderFromSalesOrder, getWorkOrderById, startWorkOrder, completeWorkOrder, cancelWorkOrder, issueToWorkOrder, updateCosting, getBOMs } from '../../api/productionApi';
import { getItems } from '../../api/storeApi';
import { getOrders } from '../../api/salesApi';
import { getAssets } from '../../api/maintenanceApi';
import { formatINR } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

const STATUS_BADGE = {
  'Pending': 'bg-slate-100 text-slate-700 border-slate-200',
  'In Progress': 'bg-blue-100 text-blue-800 border-blue-200',
  'Completed': 'bg-green-100 text-green-800 border-green-200',
  'Cancelled': 'bg-red-100 text-red-800 border-red-200',
  'QA Hold': 'bg-yellow-100 text-yellow-800 border-yellow-200'
};

// Inline per-row issue component so all materials can be issued simultaneously
const InlineMaterialIssueRow = ({ m, woStatus, onIssue }) => {
  const remaining = parseFloat(m.total_required) - parseFloat(m.total_issued);
  const maxIssuable = Math.min(remaining, parseFloat(m.current_stock));
  const [qty, setQty] = useState(maxIssuable > 0 ? String(maxIssuable) : '');
  const [issuing, setIssuing] = useState(false);
  const canIssue = ['Pending', 'In Progress'].includes(woStatus);
  const isFulfilled = remaining <= 0;

  const handleIssue = async () => {
    const qtyNum = parseFloat(qty);
    if (!qty || isNaN(qtyNum) || qtyNum <= 0) return toast.error('Enter a valid quantity.');
    setIssuing(true);
    try {
      await onIssue(m.item_id, qty);
      setQty('');
    } finally {
      setIssuing(false);
    }
  };

  return (
    <tr className={parseFloat(m.total_issued) >= parseFloat(m.total_required) ? 'bg-green-50 dark:bg-green-950/20' : ''}>
      <td className="px-4 py-2">
        <div className="font-semibold text-slate-900 dark:text-white">{m.material_name}</div>
        <div className="text-[10px] text-slate-400">{m.item_code}</div>
      </td>
      <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">{parseFloat(m.total_required).toFixed(2)} {m.unit}</td>
      <td className="px-3 py-2 text-right">
        <span className={parseFloat(m.total_issued) >= parseFloat(m.total_required) ? 'text-green-600 font-bold' : 'text-orange-500 font-bold'}>
          {parseFloat(m.total_issued).toFixed(2)}
        </span>
      </td>
      <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">{parseFloat(m.current_stock).toFixed(2)}</td>
      {canIssue && (
        <td className="px-3 py-2">
          {isFulfilled ? (
            <span className="text-green-600 font-bold text-center block">✓ Done</span>
          ) : maxIssuable <= 0 ? (
            <span className="text-red-500 text-[10px] font-semibold text-center block">No Stock</span>
          ) : (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0.0001"
                max={maxIssuable}
                step="any"
                value={qty}
                onChange={e => setQty(e.target.value)}
                className="w-24 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 py-1 px-2 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleIssue}
                disabled={issuing}
                className="rounded-md bg-orange-600 px-2 py-1 text-xs font-bold text-white hover:bg-orange-500 disabled:opacity-50 whitespace-nowrap"
              >
                {issuing ? '...' : 'Issue'}
              </button>
            </div>
          )}
        </td>
      )}
    </tr>
  );
};

const WorkOrdersPage = () => {
  const { hasPermission } = useRole();
  const [wos, setWos] = useState([]);
  const [boms, setBoms] = useState([]);
  const [openOrders, setOpenOrders] = useState([]);
  const [assets, setAssets] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailWO, setDetailWO] = useState(null);
  const [detailPlan, setDetailPlan] = useState([]);
  const [detailConsumption, setDetailConsumption] = useState([]);
  const [detailCosting, setDetailCosting] = useState(null);
  const [activeTab, setActiveTab] = useState('plan');
  const [form, setForm] = useState({ bom_id: '', sales_order_id: '', asset_id: '', planned_qty: 1, planned_start: '', planned_end: '' });
  const [materialPlan, setMaterialPlan] = useState([]);
  const [completeQty, setCompleteQty] = useState('');
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({ item_id: '', qty_issued: '' });
  const [laborCost, setLaborCost] = useState('');
  const [overheadCost, setOverheadCost] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);

  const fetchWOs = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getWorkOrders({ status: statusFilter, startDate, endDate });
      if (d.success) setWos(d.workOrders);
    } catch { toast.error('Failed to load work orders.'); }
    finally { setLoading(false); }
  }, [statusFilter, startDate, endDate]);

  useEffect(() => { fetchWOs(); }, [fetchWOs]);

  useEffect(() => {
    getBOMs().then(d => { if (d.success) setBoms(d.boms.filter(b => b.is_active)); }).catch(() => {});
    getOrders({ limit: 100 }).then(d => { if (d.success) setOpenOrders(d.orders.filter(o => o.status !== 'Completed' && o.status !== 'Cancelled')); }).catch(() => {});
    getAssets().then(d => { if (d.success) setAssets(d.assets); }).catch(() => {});
    getItems({ limit: 500 }).then(d => { if (d.success) setAllItems(d.items); }).catch(() => {});
  }, []);

  const handleSalesOrderSelect = async (soId) => {
    setForm(p => ({ ...p, sales_order_id: soId }));
    if (!soId) return;
    try {
      const d = await createWorkOrderFromSalesOrder(soId);
      if (d.success && d.drafts?.length > 0) {
        const draft = d.drafts.find(dr => dr.has_active_bom) || d.drafts[0];
        if (draft.bom_id) {
          setForm(p => ({ ...p, bom_id: draft.bom_id, planned_qty: draft.planned_qty }));
          toast.success(`Pre-filled WO for ${draft.finished_item_name} from ${draft.sales_order_no}`);
        } else {
          toast.error(`No active BOM found for item ${draft.finished_item_name}`);
        }
      }
    } catch {
      toast.error('Failed to pre-fill from Sales Order.');
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const soId = params.get('so_id');
    if (soId) {
      setIsFormOpen(true);
      handleSalesOrderSelect(soId);
    }
  }, []);

  const openCreate = () => {
    setForm({ bom_id: boms[0]?.id || '', sales_order_id: '', planned_qty: 1, planned_start: '', planned_end: '' });
    setMaterialPlan([]);
    setIsFormOpen(true);
  };

  const handlePreviewMaterials = async () => {
    if (!form.bom_id || !form.planned_qty) return;
    try {
      const d = await createWorkOrder({ ...form, _preview: true });
      if (d.materialPlan) setMaterialPlan(d.materialPlan);
    } catch { toast.error('Preview failed.'); }
  };

  const handleCreateWO = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!form.bom_id || form.planned_qty <= 0) return toast.error('BOM and planned qty > 0 required.');
    
    setSubmitting(true);
    try {
      const d = await createWorkOrder(form);
      if (d.success) {
        toast.success(`WO ${d.workOrder.wo_no} created.${d.hasShortages ? ' ⚠ Stock shortages detected!' : ''}`);
        if (d.hasShortages) toast.error('Some materials are below required stock levels.', { duration: 5000 });
        setIsFormOpen(false);
        fetchWOs();
      }
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Create WO failed.'); 
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = async (wo) => {
    try {
      const d = await getWorkOrderById(wo.id);
      if (d.success) {
        setDetailWO(d.workOrder); setDetailPlan(d.materialPlan);
        setDetailConsumption(d.consumption); setDetailCosting(d.costing);
        setLaborCost(d.costing?.labor_cost || ''); setOverheadCost(d.costing?.overhead_cost || '');
        setIssueForm({ item_id: d.materialPlan[0]?.item_id || '', qty_issued: '' });
        setActiveTab('plan'); setIsDetailOpen(true);
      }
    } catch { toast.error('Failed to load WO details.'); }
  };

  const handleStart = async () => {
    try { const d = await startWorkOrder(detailWO.id); if (d.success) { toast.success('Work Order started.'); setDetailWO(prev => ({ ...prev, status: 'In Progress', actual_start: d.workOrder.actual_start })); fetchWOs(); } }
    catch (err) { toast.error(err.response?.data?.message || 'Start failed.'); }
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    if (completing) return;
    if (!completeQty || parseFloat(completeQty) <= 0) return toast.error('Enter produced qty > 0.');
    setCompleting(true);
    try {
      const d = await completeWorkOrder(detailWO.id, completeQty);
      toast.success('Work Order completed. Finished goods added to stock.');
      setIsCompleteOpen(false);
      setIsDetailOpen(false);
      fetchWOs();
    } catch (err) { 
      const msg = err.response?.data?.message || err.message || 'Complete failed.';
      toast.error(msg, { duration: 6000 });
    } finally {
      setCompleting(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this work order?')) return;
    try { await cancelWorkOrder(detailWO.id); toast.success('WO Cancelled.'); setIsDetailOpen(false); fetchWOs(); }
    catch { toast.error('Cancel failed.'); }
  };

  const handleIssue = async (e) => {
    e.preventDefault();
    if (!issueForm.item_id || !issueForm.qty_issued) return toast.error('Select item and enter qty.');
    try {
      await issueToWorkOrder({ work_order_id: detailWO.id, ...issueForm });
      toast.success('Material issued to WO.');
      const d = await getWorkOrderById(detailWO.id);
      if (d.success) { setDetailPlan(d.materialPlan); setDetailConsumption(d.consumption); }
      setIssueForm(p => ({ ...p, qty_issued: '' }));
    } catch (err) { toast.error(err.response?.data?.message || 'Issue failed.'); }
  };

  const handleSaveCosting = async () => {
    try {
      const d = await updateCosting(detailWO.id, { labor_cost: laborCost, overhead_cost: overheadCost });
      if (d.success) { setDetailCosting(d.costing); toast.success('Costing updated.'); }
    } catch { toast.error('Update costing failed.'); }
  };

  const columns = [
    { key: 'wo_no', label: 'WO No' },
    { key: 'finished_item_name', label: 'Finished Item' },
    { key: 'planned_qty', label: 'Planned Qty', render: i => parseFloat(i.planned_qty) },
    { key: 'planned_start', label: 'Planned Start', render: i => formatDate(i.planned_start) },
    { key: 'planned_end', label: 'Planned End', render: i => formatDate(i.planned_end) },
    { key: 'status', label: 'Status', render: i => <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${STATUS_BADGE[i.status] || ''}`}>{i.status}</span> },
    { key: 'actions', label: 'Actions', render: i => <button onClick={() => openDetail(i)} className="text-slate-600 text-xs font-semibold bg-slate-50 px-2 py-1 rounded-md hover:bg-slate-100">Open WO</button> }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Work Orders</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Schedule production runs, track material consumption, and manage WO lifecycle.</p>
        </div>
        {hasPermission('production', 'create') && <button onClick={openCreate} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">+ New Work Order</button>}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none">
          <option value="">All Statuses</option>
          {['Pending','In Progress','QA Hold','Completed','Cancelled'].map(s => <option key={s}>{s}</option>)}
        </select>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none" />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none" />
      </div>

      <Table columns={columns} data={wos} loading={loading} emptyMessage="No work orders found." />

      {/* Create WO Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Create Work Order" size="lg">
        <form onSubmit={handleCreateWO} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Active BOM *</label>
              <select required value={form.bom_id} onChange={e => setForm(p => ({ ...p, bom_id: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none">
                <option value="">— Select BOM —</option>
                {boms.map(b => <option key={b.id} value={b.id}>{b.finished_item_name} (v{b.version})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Planned Qty *</label>
              <input type="number" min="0.0001" step="any" required value={form.planned_qty} onChange={e => setForm(p => ({ ...p, planned_qty: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Sales Order Ref (optional)</label>
              <select
                value={form.sales_order_id}
                onChange={e => handleSalesOrderSelect(e.target.value)}
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="">— Direct Production (No SO) —</option>
                {openOrders.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.order_no} - {o.customer_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Machine / Asset (optional)</label>
              <select
                value={form.asset_id}
                onChange={e => setForm(p => ({ ...p, asset_id: e.target.value }))}
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="">— Unassigned Machine —</option>
                {assets.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.asset_code}) [{a.status}]
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Planned Start</label>
              <input type="date" value={form.planned_start} onChange={e => setForm(p => ({ ...p, planned_start: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Planned End</label>
              <input type="date" value={form.planned_end} onChange={e => setForm(p => ({ ...p, planned_end: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
            </div>
          </div>

          <button type="button" onClick={handlePreviewMaterials} className="w-full text-xs font-semibold text-blue-600 bg-blue-50 py-2 rounded-lg border border-blue-100 hover:bg-blue-100">Check Material Availability</button>

          {materialPlan.length > 0 && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-2 font-semibold text-slate-500 uppercase text-left">Material</th>
                    <th className="px-3 py-2 font-semibold text-slate-500 uppercase text-right">Required</th>
                    <th className="px-3 py-2 font-semibold text-slate-500 uppercase text-right">Available</th>
                    <th className="px-3 py-2 font-semibold text-slate-500 uppercase text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {materialPlan.map((m, i) => (
                    <tr key={i} className={m.status === 'Shortage' ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                      <td className="px-4 py-2"><div className="font-semibold">{m.material_name}</div><div className="text-[10px] text-slate-400">{m.item_code}</div></td>
                      <td className="px-3 py-2 text-right">{m.required_qty.toFixed(2)} {m.unit}</td>
                      <td className="px-3 py-2 text-right">{m.available_qty.toFixed(2)}</td>
                      <td className="px-3 py-2 text-center"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold border ${m.status === 'OK' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>{m.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50" disabled={submitting}>Cancel</button>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Work Order'}
            </button>
          </div>
        </form>
      </Modal>

      {/* WO Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={`WO: ${detailWO?.wo_no}`} size="lg">
        {detailWO && (
          <div className="space-y-4">
            {/* Header + Actions */}
            <div className="flex flex-wrap justify-between items-center gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-xs space-y-0.5">
                <p className="font-bold text-slate-900 dark:text-white">{detailWO.finished_item_name} <span className="text-slate-400 font-normal">· Qty: {parseFloat(detailWO.planned_qty)}</span></p>
                <p className="text-slate-500">BOM v{detailWO.bom_version} · {formatDate(detailWO.planned_start)} → {formatDate(detailWO.planned_end)}</p>
                {detailWO.actual_start && <p className="text-blue-600">Started: {formatDate(detailWO.actual_start)}</p>}
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${STATUS_BADGE[detailWO.status] || ''}`}>{detailWO.status}</span>
                {detailWO.status === 'Pending' && <button onClick={handleStart} className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-lg hover:bg-blue-500">▶ Start</button>}
                {detailWO.status === 'In Progress' && <button onClick={() => { setCompleteQty(String(detailWO.planned_qty)); setIsCompleteOpen(true); }} className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-lg hover:bg-green-500">✓ Complete</button>}
                {!['Completed','Cancelled'].includes(detailWO.status) && <button onClick={handleCancel} className="bg-red-50 text-red-600 border border-red-200 text-xs font-semibold px-3 py-1 rounded-lg hover:bg-red-100">✕ Cancel</button>}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
              {['plan', 'consumption', 'costing'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-xs font-semibold capitalize border-b-2 transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{tab === 'plan' ? 'Materials Plan' : tab}</button>
              ))}
            </div>

            {activeTab === 'plan' && (
              <div className="space-y-3">
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-2 font-semibold text-slate-500 uppercase text-left">Material</th>
                        <th className="px-3 py-2 font-semibold text-slate-500 uppercase text-right">Required</th>
                        <th className="px-3 py-2 font-semibold text-slate-500 uppercase text-right">Issued</th>
                        <th className="px-3 py-2 font-semibold text-slate-500 uppercase text-right">Stock</th>
                        {['Pending', 'In Progress'].includes(detailWO.status) && (
                          <th className="px-3 py-2 font-semibold text-slate-500 uppercase text-center">Issue Qty</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {detailPlan.map((m) => (
                        <InlineMaterialIssueRow
                          key={m.item_id}
                          m={m}
                          woStatus={detailWO.status}
                          onIssue={async (itemId, qty) => {
                            try {
                              await issueToWorkOrder({ work_order_id: detailWO.id, item_id: itemId, qty_issued: qty });
                              toast.success(`${m.material_name} issued.`);
                              const d = await getWorkOrderById(detailWO.id);
                              if (d.success) { setDetailPlan(d.materialPlan); setDetailConsumption(d.consumption); }
                            } catch (err) { 
                              const msg = err.response?.data?.message || err.message || 'Issue failed.';
                              toast.error(msg, { duration: 6000 });
                            }
                          }}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'consumption' && (
              <Table
                columns={[
                  { key: 'material_name', label: 'Material', render: i => <div><div className="font-semibold">{i.material_name}</div><div className="text-[10px] text-slate-400">{i.item_code}</div></div> },
                  { key: 'qty_issued', label: 'Qty Issued', render: i => <span className="text-red-600 font-bold">-{parseFloat(i.qty_issued)} {i.unit}</span> },
                  { key: 'issued_by', label: 'Issued By', render: i => i.issued_by || 'N/A' },
                  { key: 'issued_at', label: 'Issued At', render: i => formatDate(i.issued_at) }
                ]}
                data={detailConsumption}
                emptyMessage="No material issues recorded for this WO."
              />
            )}

            {activeTab === 'costing' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div><p className="text-xs text-slate-400 uppercase font-semibold">Material Cost</p><p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{formatINR(detailCosting?.material_cost || 0)}</p><p className="text-[10px] text-slate-400">Auto-calculated from consumption</p></div>
                  <div><p className="text-xs text-slate-400 uppercase font-semibold">Total Cost</p><p className="text-xl font-bold text-blue-600 mt-1">{formatINR(detailCosting?.total_cost || 0)}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Labor Cost (INR)</label><input type="number" min="0" step="0.01" value={laborCost} onChange={e => setLaborCost(e.target.value)} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" /></div>
                  <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Overhead Cost (INR)</label><input type="number" min="0" step="0.01" value={overheadCost} onChange={e => setOverheadCost(e.target.value)} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" /></div>
                </div>
                <button onClick={handleSaveCosting} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">Save Costing</button>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setIsDetailOpen(false)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50">Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Complete WO Modal */}
      <Modal isOpen={isCompleteOpen} onClose={() => setIsCompleteOpen(false)} title="Complete Work Order">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Produced Qty (Finished Goods) *</label>
            <input type="number" min="0.0001" step="any" value={completeQty} onChange={e => setCompleteQty(e.target.value)} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
            <p className="text-xs text-slate-400 mt-1">This qty will be added to finished goods stock automatically.</p>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIsCompleteOpen(false)} disabled={completing} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50">Cancel</button>
            <button
              type="button"
              disabled={completing}
              onClick={async () => {
                if (completing) return;
                if (!completeQty || parseFloat(completeQty) <= 0) { toast.error('Enter produced qty > 0.'); return; }
                setCompleting(true);
                try {
                  await completeWorkOrder(detailWO.id, completeQty);
                  toast.success('Work Order completed! Finished goods added to stock.');
                  setIsCompleteOpen(false);
                  setIsDetailOpen(false);
                  fetchWOs();
                } catch (err) {
                  toast.error(err.response?.data?.message || err.message || 'Complete failed.', { duration: 6000 });
                } finally {
                  setCompleting(false);
                }
              }}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50"
            >
              {completing ? 'Completing...' : 'Confirm Complete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WorkOrdersPage;
