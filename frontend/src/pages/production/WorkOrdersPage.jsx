import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { useRole } from '../../context/RoleContext';
import { getWorkOrders, createWorkOrder, createWorkOrderFromSalesOrder, getWorkOrderById, startWorkOrder, completeWorkOrder, cancelWorkOrder, issueToWorkOrder, updateCosting, getBOMs } from '../../api/productionApi';
import { getItems } from '../../api/storeApi';
import { getOrders } from '../../api/salesApi';
import { getAssets } from '../../api/maintenanceApi';
import { formatINR } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

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
    <tr className={parseFloat(m.total_issued) >= parseFloat(m.total_required) ? 'bg-accent-success/10' : 'hover:bg-bg-hover'}>
      <td className="p-2 font-mono">
        <div className="font-bold text-text-primary font-sans">{m.material_name}</div>
        <div className="text-[10px] text-text-muted font-mono">{m.item_code}</div>
      </td>
      <td className="p-2 text-right font-mono text-text-secondary">{parseFloat(m.total_required).toFixed(2)} {m.unit}</td>
      <td className="p-2 text-right font-mono">
        <span className={parseFloat(m.total_issued) >= parseFloat(m.total_required) ? 'text-accent-success font-bold' : 'text-amber-500 font-bold'}>
          {parseFloat(m.total_issued).toFixed(2)}
        </span>
      </td>
      <td className="p-2 text-right font-mono text-text-secondary">{parseFloat(m.current_stock).toFixed(2)}</td>
      {canIssue && (
        <td className="p-2">
          {isFulfilled ? (
            <span className="text-accent-success font-mono font-bold text-center block text-xs">✓ Done</span>
          ) : maxIssuable <= 0 ? (
            <span className="text-accent-danger text-[10px] font-mono font-bold text-center block uppercase">No Stock</span>
          ) : (
            <div className="flex items-center gap-1.5 justify-center">
              <input
                type="number"
                min="0.0001"
                max={maxIssuable}
                step="any"
                value={qty}
                onChange={e => setQty(e.target.value)}
                className="field py-1 px-1.5 text-xs font-mono text-center w-20"
              />
              <button
                type="button"
                onClick={handleIssue}
                disabled={issuing}
                className="btn btn-primary px-2 py-1 text-[10px] font-mono uppercase tracking-wider bg-amber-500 hover:brightness-110 disabled:opacity-50 whitespace-nowrap"
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
      await completeWorkOrder(detailWO.id, completeQty);
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

  const handleSaveCosting = async () => {
    try {
      const d = await updateCosting(detailWO.id, { labor_cost: laborCost, overhead_cost: overheadCost });
      if (d.success) { setDetailCosting(d.costing); toast.success('Costing updated.'); }
    } catch { toast.error('Update costing failed.'); }
  };

  const columns = [
    {
      key: 'wo_no',
      label: 'WO Ref',
      render: i => (
        <span className="font-mono text-xs font-semibold tracking-wider text-text-primary">
          {i.wo_no}
        </span>
      )
    },
    {
      key: 'finished_item_name',
      label: 'Finished Item Run',
      render: i => <span className="font-medium text-text-primary">{i.finished_item_name}</span>
    },
    {
      key: 'planned_qty',
      label: 'Planned Run Qty',
      isNumeric: true,
      render: i => <span className="font-mono text-xs font-bold text-text-primary">{parseFloat(i.planned_qty)}</span>
    },
    {
      key: 'planned_start',
      label: 'Planned Start',
      render: i => <span className="font-mono text-xs text-text-secondary">{formatDate(i.planned_start)}</span>
    },
    {
      key: 'planned_end',
      label: 'Planned End',
      render: i => <span className="font-mono text-xs text-text-secondary">{formatDate(i.planned_end)}</span>
    },
    {
      key: 'status',
      label: 'Run Status',
      render: i => <StatusBadge status={i.status} />
    },
    {
      key: 'actions',
      label: 'Actions',
      render: i => (
        <button
          onClick={() => openDetail(i)}
          className="btn btn-ghost px-2.5 py-1 text-xs font-mono uppercase tracking-wider"
        >
          Open Run
        </button>
      )
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 animate-fadeIn font-sans">
      <PageHeader
        title="Manufacturing Work Orders"
        description="Schedule shop floor production runs, track raw material BOM explosion, and manage assembly execution."
        actions={
          hasPermission('production', 'create') && (
            <button
              onClick={openCreate}
              className="btn btn-primary px-4 py-2 text-xs font-mono uppercase tracking-wider"
            >
              + New Work Order
            </button>
          )
        }
      />

      {/* Filter Toolbar */}
      <div className="sheet p-3 flex flex-wrap gap-3 bg-bg-secondary">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="field text-xs font-sans w-auto min-w-[160px]"
        >
          <option value="">All Run Statuses</option>
          {['Pending','In Progress','QA Hold','Completed','Cancelled'].map(s => <option key={s}>{s}</option>)}
        </select>
        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="field text-xs font-mono w-auto"
        />
        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className="field text-xs font-mono w-auto"
        />
      </div>

      {/* Main Table */}
      <div className="sheet">
        <Table columns={columns} data={wos} loading={loading} emptyMessage="No manufacturing work orders scheduled." />
      </div>

      {/* Create WO Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Schedule Manufacturing Work Order" size="lg">
        <form onSubmit={handleCreateWO} className="space-y-4 font-sans">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Active Assembly BOM *</label>
              <select
                required
                value={form.bom_id}
                onChange={e => setForm(p => ({ ...p, bom_id: e.target.value }))}
                className="field font-sans"
              >
                <option value="">— Select BOM —</option>
                {boms.map(b => <option key={b.id} value={b.id}>{b.finished_item_name} (v{b.version})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Planned Run Qty *</label>
              <input
                type="number"
                min="0.0001"
                step="any"
                required
                value={form.planned_qty}
                onChange={e => setForm(p => ({ ...p, planned_qty: e.target.value }))}
                className="field font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Sales Order Contract (optional)</label>
              <select
                value={form.sales_order_id}
                onChange={e => handleSalesOrderSelect(e.target.value)}
                className="field font-sans"
              >
                <option value="">— Stock Production (No SO Ref) —</option>
                {openOrders.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.order_no} - {o.customer_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Assigned Machine / Asset</label>
              <select
                value={form.asset_id}
                onChange={e => setForm(p => ({ ...p, asset_id: e.target.value }))}
                className="field font-sans"
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
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Planned Start</label>
              <input
                type="date"
                value={form.planned_start}
                onChange={e => setForm(p => ({ ...p, planned_start: e.target.value }))}
                className="field font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Planned End</label>
              <input
                type="date"
                value={form.planned_end}
                onChange={e => setForm(p => ({ ...p, planned_end: e.target.value }))}
                className="field font-mono"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handlePreviewMaterials}
            className="btn btn-ghost w-full py-2 text-xs font-mono uppercase tracking-wider text-accent-primary"
          >
            Check Material Availability & Shortages
          </button>

          {materialPlan.length > 0 && (
            <div className="sheet overflow-hidden">
              <table className="w-full text-xs font-mono border-collapse">
                <thead className="bg-bg-secondary border-b border-border-color text-[10px] uppercase tracking-wider text-text-muted">
                  <tr>
                    <th className="px-3 py-2.5 font-bold text-left">Material Description</th>
                    <th className="px-2 py-2.5 font-bold text-right">Required</th>
                    <th className="px-2 py-2.5 font-bold text-right">Available</th>
                    <th className="px-2 py-2.5 font-bold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color">
                  {materialPlan.map((m, i) => (
                    <tr key={i} className={m.status === 'Shortage' ? 'bg-accent-danger/10' : 'hover:bg-bg-hover'}>
                      <td className="p-2">
                        <div className="font-bold text-text-primary font-sans">{m.material_name}</div>
                        <div className="text-[10px] text-text-muted">{m.item_code}</div>
                      </td>
                      <td className="p-2 text-right text-text-primary">{m.required_qty.toFixed(2)} {m.unit}</td>
                      <td className="p-2 text-right text-text-secondary">{m.available_qty.toFixed(2)}</td>
                      <td className="p-2 text-center"><StatusBadge status={m.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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
              className="btn btn-primary px-4 py-2 text-xs font-mono uppercase tracking-wider"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create Work Order Run'}
            </button>
          </div>
        </form>
      </Modal>

      {/* WO Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={`Work Order Details: ${detailWO?.wo_no}`} size="lg">
        {detailWO && (
          <div className="space-y-4 font-sans">
            {/* Header + Actions */}
            <div className="flex flex-wrap justify-between items-center gap-3 p-4 sheet bg-bg-secondary">
              <div className="text-xs space-y-1 font-mono">
                <p className="font-bold text-text-primary text-sm">{detailWO.finished_item_name} <span className="text-text-muted font-normal">· Run Qty: {parseFloat(detailWO.planned_qty)}</span></p>
                <p className="text-text-secondary text-[11px]">BOM v{detailWO.bom_version} · {formatDate(detailWO.planned_start)} → {formatDate(detailWO.planned_end)}</p>
                {detailWO.actual_start && <p className="text-accent-primary text-[11px] font-semibold">Started: {formatDate(detailWO.actual_start)}</p>}
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                <StatusBadge status={detailWO.status} />
                {detailWO.status === 'Pending' && (
                  <button
                    onClick={handleStart}
                    className="btn btn-primary px-3 py-1.5 text-xs font-mono uppercase tracking-wider"
                  >
                    ▶ Start Run
                  </button>
                )}
                {detailWO.status === 'In Progress' && (
                  <button
                    onClick={() => { setCompleteQty(String(detailWO.planned_qty)); setIsCompleteOpen(true); }}
                    className="btn btn-primary px-3 py-1.5 text-xs font-mono uppercase tracking-wider bg-accent-success hover:brightness-110"
                  >
                    ✓ Complete Run
                  </button>
                )}
                {!['Completed','Cancelled'].includes(detailWO.status) && (
                  <button
                    onClick={handleCancel}
                    className="btn btn-danger px-3 py-1.5 text-xs font-mono uppercase tracking-wider"
                  >
                    ✕ Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-border-color">
              {['plan', 'consumption', 'costing'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-2 text-xs font-mono uppercase tracking-wider border-b-2 transition-colors ${activeTab === tab ? 'border-accent-primary text-accent-primary font-bold' : 'border-transparent text-text-muted hover:text-text-primary'}`}
                >
                  {tab === 'plan' ? 'BOM Materials Plan' : tab}
                </button>
              ))}
            </div>

            {activeTab === 'plan' && (
              <div className="space-y-3">
                <div className="sheet overflow-hidden">
                  <table className="w-full text-xs font-mono border-collapse">
                    <thead className="bg-bg-secondary border-b border-border-color text-[10px] uppercase tracking-wider text-text-muted">
                      <tr>
                        <th className="px-3 py-2.5 font-bold text-left">Material Description</th>
                        <th className="px-2 py-2.5 font-bold text-right">Required</th>
                        <th className="px-2 py-2.5 font-bold text-right">Issued</th>
                        <th className="px-2 py-2.5 font-bold text-right">Stock</th>
                        {['Pending', 'In Progress'].includes(detailWO.status) && (
                          <th className="px-2 py-2.5 font-bold text-center">Issue Qty</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color">
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
              <div className="sheet">
                <Table
                  columns={[
                    {
                      key: 'material_name',
                      label: 'Material Description',
                      render: i => (
                        <div>
                          <div className="font-medium text-text-primary">{i.material_name}</div>
                          <div className="font-mono text-[10px] text-text-muted">{i.item_code}</div>
                        </div>
                      )
                    },
                    {
                      key: 'qty_issued',
                      label: 'Issued Qty',
                      isNumeric: true,
                      render: i => <span className="text-accent-danger font-mono text-xs font-bold">-{parseFloat(i.qty_issued)} {i.unit}</span>
                    },
                    {
                      key: 'issued_by',
                      label: 'Issued By',
                      render: i => <span className="font-mono text-xs text-text-secondary">{i.issued_by || 'N/A'}</span>
                    },
                    {
                      key: 'issued_at',
                      label: 'Issued Timestamp',
                      render: i => <span className="font-mono text-xs text-text-muted">{formatDate(i.issued_at)}</span>
                    }
                  ]}
                  data={detailConsumption}
                  emptyMessage="No material issues recorded for this WO."
                />
              </div>
            )}

            {activeTab === 'costing' && (
              <div className="space-y-4 font-sans">
                <div className="grid grid-cols-2 gap-4 p-4 sheet bg-bg-secondary">
                  <div>
                    <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Material Cost</p>
                    <p className="text-xl font-mono font-bold text-text-primary mt-1">{formatINR(detailCosting?.material_cost || 0)}</p>
                    <p className="text-[10px] font-mono text-text-muted mt-0.5">Auto-calculated from consumption</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Total Assembly Run Cost</p>
                    <p className="text-xl font-mono font-bold text-accent-primary mt-1">{formatINR(detailCosting?.total_cost || 0)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Labor Cost (INR)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={laborCost}
                      onChange={e => setLaborCost(e.target.value)}
                      className="field font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Overhead Cost (INR)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={overheadCost}
                      onChange={e => setOverheadCost(e.target.value)}
                      className="field font-mono"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSaveCosting}
                  className="btn btn-primary px-4 py-2 text-xs font-mono uppercase tracking-wider"
                >
                  Save Assembly Costing
                </button>
              </div>
            )}

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

      {/* Complete WO Modal */}
      <Modal isOpen={isCompleteOpen} onClose={() => setIsCompleteOpen(false)} title="Complete Assembly Work Order Run">
        <div className="space-y-4 font-sans">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Produced Qty (Finished Goods) *</label>
            <input
              type="number"
              min="0.0001"
              step="any"
              value={completeQty}
              onChange={e => setCompleteQty(e.target.value)}
              className="field font-mono"
            />
            <p className="text-[11px] font-mono text-text-muted mt-1">This quantity will be held for Final QC Inspection before entering available stock.</p>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setIsCompleteOpen(false)}
              disabled={completing}
              className="btn btn-ghost px-4 py-2 text-xs font-mono uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={completing}
              onClick={async () => {
                if (completing) return;
                if (!completeQty || parseFloat(completeQty) <= 0) { toast.error('Enter produced qty > 0.'); return; }
                setCompleting(true);
                try {
                  await completeWorkOrder(detailWO.id, completeQty);
                  toast.success('Work Order completed! Held for Final QC.');
                  setIsCompleteOpen(false);
                  setIsDetailOpen(false);
                  fetchWOs();
                } catch (err) {
                  toast.error(err.response?.data?.message || err.message || 'Complete failed.', { duration: 6000 });
                } finally {
                  setCompleting(false);
                }
              }}
              className="btn btn-primary px-4 py-2 text-xs font-mono uppercase tracking-wider bg-accent-success hover:brightness-110 disabled:opacity-50"
            >
              {completing ? 'Completing...' : 'Confirm Run Completion'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WorkOrdersPage;
