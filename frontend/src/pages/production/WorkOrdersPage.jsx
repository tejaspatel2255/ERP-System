import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { useRole } from '../../context/RoleContext';
import { getWorkOrders, createWorkOrder, getWorkOrderById, startWorkOrder, completeWorkOrder, cancelWorkOrder, issueToWorkOrder, updateCosting, getBOMs } from '../../api/productionApi';
import { getItems } from '../../api/storeApi';
import { getOrders } from '../../api/salesApi';
import { getAssets } from '../../api/maintenanceApi';
import { formatINR } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

const WO_LIFECYCLE_STEPS = ['Pending', 'In Progress', 'Completed'];

const WorkOrdersPage = () => {
  const { hasPermission } = useRole();
  const [wos, setWos] = useState([]);
  const [boms, setBoms] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [salesOrderSearch, setSalesOrderSearch] = useState('');
  const [assets, setAssets] = useState([]);
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
    getItems({ limit: 500 }).then(d => { if (d.success) setAllItems(d.items); }).catch(() => {});
    getOrders({ limit: 500 }).then(d => {
      if (d.success) setSalesOrders((d.orders || []).filter(order => !['Completed', 'Cancelled', 'Delivered'].includes(order.status)));
    }).catch(() => {});
    getAssets().then(d => {
      if (d.success) setAssets((d.assets || []).filter(asset => asset.status === 'Active'));
    }).catch(() => {});
  }, []);

  const openCreate = () => {
    setForm({ bom_id: boms[0]?.id || '', sales_order_id: '', asset_id: '', planned_qty: 1, planned_start: '', planned_end: '' });
    setSalesOrderSearch('');
    setMaterialPlan([]);
    setIsFormOpen(true);
  };

  const filteredSalesOrders = salesOrders.filter(order => {
    const search = salesOrderSearch.trim().toLowerCase();
    return !search || `${order.order_no} ${order.customer_name}`.toLowerCase().includes(search);
  });

  const handlePreviewMaterials = async () => {
    if (!form.bom_id || !form.planned_qty) return;
    try {
      const d = await createWorkOrder({ ...form, _preview: true });
      if (d.materialPlan) setMaterialPlan(d.materialPlan);
    } catch { toast.error('Preview failed.'); }
  };

  const handleCreateWO = async (e) => {
    e.preventDefault();
    if (!form.bom_id || form.planned_qty <= 0) return toast.error('BOM and planned qty > 0 required.');
    try {
      const d = await createWorkOrder(form);
      if (d.success) {
        toast.success(`WO ${d.workOrder.wo_no} created.${d.hasShortages ? ' ⚠ Stock shortages detected!' : ''}`);
        if (d.hasShortages) toast.error('Some materials are below required stock levels.', { duration: 5000 });
        if (d.warning?.message) toast.error(`Warning: ${d.warning.message}`, { duration: 6000 });
        setIsFormOpen(false);
        fetchWOs();
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Create WO failed.'); }
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
    try { const d = await startWorkOrder(detailWO.id); if (d.success) { toast.success('Work Order started.'); if (d.warning?.message) toast.error(`Warning: ${d.warning.message}`, { duration: 6000 }); setDetailWO(prev => ({ ...prev, status: 'In Progress', actual_start: d.workOrder.actual_start })); fetchWOs(); } }
    catch (err) { toast.error(err.response?.data?.message || 'Start failed.'); }
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    if (!completeQty || parseFloat(completeQty) <= 0) return toast.error('Enter produced qty > 0.');
    try {
      const d = await completeWorkOrder(detailWO.id, completeQty);
      if (d.success) { toast.success('Work Order completed.'); if (d.warning?.message) toast.error(`Warning: ${d.warning.message}`, { duration: 6000 }); setIsCompleteOpen(false); setIsDetailOpen(false); fetchWOs(); }
    } catch (err) { toast.error(err.response?.data?.message || 'Complete failed.'); }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this work order?')) return;
    try {
      const d = await cancelWorkOrder(detailWO.id);
      toast.success('WO Cancelled.');
      if (d.warning?.message) toast.error(`Warning: ${d.warning.message}`, { duration: 6000 });
      setIsDetailOpen(false);
      fetchWOs();
    }
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

  const renderStepper = (currentStatus) => {
    const isCancelled = currentStatus === 'Cancelled';
    const isQAHold = currentStatus === 'QA Hold';
    const stepIdx = currentStatus === 'Pending' ? 0 : currentStatus === 'In Progress' ? 1 : currentStatus === 'Completed' ? 2 : -1;

    return (
      <div className="flex items-center justify-between max-w-md mx-auto py-2">
        {WO_LIFECYCLE_STEPS.map((step, idx) => {
          const isDone = !isCancelled && stepIdx > idx;
          const isCurrent = !isCancelled && !isQAHold && stepIdx === idx;
          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center gap-1">
                <div className={`step-dot ${isDone ? 'bg-[var(--success-rail)] text-white border-[var(--success-rail)]' : isCurrent ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]' : 'bg-bg-subtle text-text-muted border-border-color'}`}>
                  {isDone ? '✓' : idx + 1}
                </div>
                <span className={`text-[11px] font-medium ${isCurrent ? 'text-accent-primary font-semibold' : isDone ? 'text-[var(--success-text)]' : 'text-text-muted'}`}>{step}</span>
              </div>
              {idx < WO_LIFECYCLE_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${stepIdx > idx && !isCancelled ? 'bg-[var(--success-rail)]' : 'bg-border-color'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const columns = [
    { key: 'wo_no', label: 'WO No', render: i => <span className="stamp">{i.wo_no}</span> },
    { key: 'finished_item_name', label: 'Finished Item', render: i => <span className="font-medium text-text-primary">{i.finished_item_name}</span> },
    { key: 'asset_name', label: 'Machine/Asset', render: i => i.asset_name || '—' },
    { key: 'planned_qty', label: 'Planned Qty', render: i => <span className="tabular-nums">{parseFloat(i.planned_qty)}</span> },
    { key: 'planned_start', label: 'Planned Start', render: i => formatDate(i.planned_start) },
    { key: 'planned_end', label: 'Planned End', render: i => formatDate(i.planned_end) },
    { key: 'status', label: 'Status', render: i => <StatusBadge status={i.status} /> },
    { key: 'actions', label: 'Actions', render: i => <button onClick={() => openDetail(i)} className="btn-secondary btn-xs">Open WO</button> }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Work Orders"
        subtitle="Schedule production runs, track material consumption, and manage WO lifecycle."
        actions={
          hasPermission('production', 'create') && <button onClick={openCreate} className="btn-primary">+ New Work Order</button>
        }
      />

      <div className="sheet p-3 flex flex-wrap gap-3 items-center">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="field md:w-44">
          <option value="">All Statuses</option>
          {['Pending','In Progress','QA Hold','Completed','Cancelled'].map(s => <option key={s}>{s}</option>)}
        </select>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="field md:w-40" />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="field md:w-40" />
      </div>

      <Table columns={columns} data={wos} loading={loading} emptyMessage="No work orders found." />

      {/* Create WO Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Create Work Order" size="lg">
        <form onSubmit={handleCreateWO} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Active BOM *</label>
              <select required value={form.bom_id} onChange={e => setForm(p => ({ ...p, bom_id: e.target.value }))} className="field">
                <option value="">— Select BOM —</option>
                {boms.map(b => <option key={b.id} value={b.id}>{b.finished_item_name} (v{b.version})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Planned Qty *</label>
              <input type="number" min="0.0001" step="any" required value={form.planned_qty} onChange={e => setForm(p => ({ ...p, planned_qty: e.target.value }))} className="field tabular-nums" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Sales Order (optional)</label>
              <input value={salesOrderSearch} onChange={e => setSalesOrderSearch(e.target.value)} placeholder="Search order or customer" className="field mb-2" />
              <select value={form.sales_order_id} onChange={e => setForm(p => ({ ...p, sales_order_id: e.target.value }))} className="field">
                <option value="">— No Sales Order —</option>
                {filteredSalesOrders.map(order => <option key={order.id} value={order.id}>{order.order_no} · {order.customer_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Machine/Asset (optional)</label>
              <select value={form.asset_id} onChange={e => setForm(p => ({ ...p, asset_id: e.target.value }))} className="field">
                <option value="">— No Machine/Asset —</option>
                {assets.map(asset => <option key={asset.id} value={asset.id}>{asset.name} ({asset.asset_code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Planned Start</label>
              <input type="date" value={form.planned_start} onChange={e => setForm(p => ({ ...p, planned_start: e.target.value }))} className="field" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Planned End</label>
              <input type="date" value={form.planned_end} onChange={e => setForm(p => ({ ...p, planned_end: e.target.value }))} className="field" />
            </div>
          </div>

          <button type="button" onClick={handlePreviewMaterials} className="btn-secondary w-full text-xs justify-center">Check Material Availability</button>

          {materialPlan.length > 0 && (
            <div className="sheet overflow-hidden">
              <table className="bom w-full text-xs">
                <thead>
                  <tr>
                    <th className="px-4 py-2 font-semibold text-left">Material</th>
                    <th className="px-3 py-2 font-semibold text-right">Required</th>
                    <th className="px-3 py-2 font-semibold text-right">Available</th>
                    <th className="px-3 py-2 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {materialPlan.map((m, i) => (
                    <tr key={i} className={`bom-row ${m.status === 'Shortage' ? 'bg-[var(--danger-bg)]' : ''}`}>
                      <td className="px-4 py-2"><div className="font-medium text-text-primary">{m.material_name}</div><div className="text-xs text-text-muted"><span className="stamp">{m.item_code}</span></div></td>
                      <td className="px-3 py-2 text-right tabular-nums">{m.required_qty.toFixed(2)} {m.unit}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{m.available_qty.toFixed(2)}</td>
                      <td className="px-3 py-2 text-center"><StatusBadge status={m.status === 'OK' ? 'In Stock' : 'Critical'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button type="button" onClick={() => setIsFormOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Create Work Order</button>
          </div>
        </form>
      </Modal>

      {/* WO Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={`WO: ${detailWO?.wo_no}`} size="lg">
        {detailWO && (
          <div className="space-y-4">
            {/* Header + Actions */}
            <div className="sheet p-4 space-y-3">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-text-primary text-sm">{detailWO.finished_item_name} <span className="text-text-muted font-normal">· Qty: {parseFloat(detailWO.planned_qty)}</span></p>
                  <p className="text-text-secondary">BOM v{detailWO.bom_version} · {formatDate(detailWO.planned_start)} → {formatDate(detailWO.planned_end)}</p>
                  {detailWO.asset_name && <p className={['Under Repair', 'Maintenance'].includes(detailWO.asset_status) ? 'text-[var(--warning-text)] font-semibold' : 'text-text-secondary'}>Machine: {detailWO.asset_name} ({detailWO.asset_status})</p>}
                  {detailWO.actual_start && <p className="text-accent-primary font-medium">Started: {formatDate(detailWO.actual_start)}</p>}
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                  <StatusBadge status={detailWO.status} />
                  {detailWO.status === 'Pending' && <button onClick={handleStart} className="btn-primary btn-xs">▶ Start</button>}
                  {detailWO.status === 'In Progress' && <button onClick={() => { setCompleteQty(String(detailWO.planned_qty)); setIsCompleteOpen(true); }} className="btn-secondary btn-xs text-[var(--success-text)] hover:border-[var(--success-border)]">✓ Complete</button>}
                  {!['Completed','Cancelled'].includes(detailWO.status) && <button onClick={handleCancel} className="btn-secondary btn-xs text-[var(--danger-text)] hover:border-[var(--danger-border)]">✕ Cancel</button>}
                </div>
              </div>

              {/* Status Stepper */}
              <div className="pt-2 border-t border-border-color">
                {renderStepper(detailWO.status)}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border-color pb-1">
              {['plan', 'consumption', 'costing'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`btn-sm ${activeTab === tab ? 'btn-primary' : 'btn-ghost'}`}>{tab === 'plan' ? 'Materials Plan' : tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
              ))}
            </div>

            {activeTab === 'plan' && (
              <div className="space-y-3">
                <Table
                  columns={[
                    { key: 'material_name', label: 'Material', render: i => <div><div className="font-medium text-text-primary">{i.material_name}</div><div className="text-xs text-text-muted"><span className="stamp">{i.item_code}</span></div></div> },
                    { key: 'total_required', label: 'Required', render: i => <span className="tabular-nums">{parseFloat(i.total_required).toFixed(4)} {i.unit}</span> },
                    { key: 'total_issued', label: 'Issued', render: i => <span className={`font-semibold tabular-nums ${parseFloat(i.total_issued) >= parseFloat(i.total_required) ? 'text-[var(--success-text)]' : 'text-[var(--warning-text)]'}`}>{parseFloat(i.total_issued).toFixed(4)}</span> },
                    { key: 'current_stock', label: 'Stock', render: i => <span className="tabular-nums">{parseFloat(i.current_stock).toFixed(2)}</span> }
                  ]}
                  data={detailPlan}
                  emptyMessage=""
                />

                {['Pending', 'In Progress'].includes(detailWO.status) && (
                  <form onSubmit={handleIssue} className="flex gap-2 pt-2 border-t border-border-color">
                    <select required value={issueForm.item_id} onChange={e => setIssueForm(p => ({ ...p, item_id: e.target.value }))} className="field flex-1 py-1.5 px-3 text-xs">
                      <option value="">Select Material</option>
                      {detailPlan.map(m => <option key={m.item_id} value={m.item_id}>{m.material_name} (need: {parseFloat(m.total_required - m.total_issued).toFixed(2)})</option>)}
                    </select>
                    <input type="number" min="0.0001" step="any" required placeholder="Qty" value={issueForm.qty_issued} onChange={e => setIssueForm(p => ({ ...p, qty_issued: e.target.value }))} className="field w-28 py-1.5 px-3 text-xs tabular-nums" />
                    <button type="submit" className="btn-primary btn-xs">Issue</button>
                  </form>
                )}
              </div>
            )}

            {activeTab === 'consumption' && (
              <Table
                columns={[
                  { key: 'material_name', label: 'Material', render: i => <div><div className="font-medium text-text-primary">{i.material_name}</div><div className="text-xs text-text-muted"><span className="stamp">{i.item_code}</span></div></div> },
                  { key: 'qty_issued', label: 'Qty Issued', render: i => <span className="text-[var(--danger-text)] font-semibold tabular-nums">-{parseFloat(i.qty_issued)} {i.unit}</span> },
                  { key: 'issued_by', label: 'Issued By', render: i => i.issued_by || 'N/A' },
                  { key: 'issued_at', label: 'Issued At', render: i => formatDate(i.issued_at) }
                ]}
                data={detailConsumption}
                emptyMessage="No material issues recorded for this WO."
              />
            )}

            {activeTab === 'costing' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 sheet">
                  <div><p className="text-xs text-text-muted font-medium">Material Cost</p><p className="text-xl font-semibold text-text-primary mt-1 tabular-nums">{formatINR(detailCosting?.material_cost || 0)}</p><p className="text-xs text-text-muted">Auto-calculated from consumption</p></div>
                  <div><p className="text-xs text-text-muted font-medium">Total Cost</p><p className="text-xl font-semibold text-accent-primary mt-1 tabular-nums">{formatINR(detailCosting?.total_cost || 0)}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Labor Cost (INR)</label><input type="number" min="0" step="0.01" value={laborCost} onChange={e => setLaborCost(e.target.value)} className="field tabular-nums" /></div>
                  <div><label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Overhead Cost (INR)</label><input type="number" min="0" step="0.01" value={overheadCost} onChange={e => setOverheadCost(e.target.value)} className="field tabular-nums" /></div>
                </div>
                <button onClick={handleSaveCosting} className="btn-primary">Save Costing</button>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-border-color">
              <button onClick={() => setIsDetailOpen(false)} className="btn-secondary">Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Complete WO Modal */}
      <Modal isOpen={isCompleteOpen} onClose={() => setIsCompleteOpen(false)} title="Complete Work Order">
        <form onSubmit={handleComplete} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Produced Qty (Finished Goods) *</label>
            <input type="number" min="0.0001" step="any" required value={completeQty} onChange={e => setCompleteQty(e.target.value)} className="field tabular-nums" />
            <p className="text-xs text-text-muted mt-1">This qty will be added to finished goods stock automatically.</p>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button type="button" onClick={() => setIsCompleteOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Confirm Complete</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default WorkOrdersPage;