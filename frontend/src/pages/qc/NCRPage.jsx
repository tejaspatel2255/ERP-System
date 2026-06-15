import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { useRole } from '../../context/RoleContext';
import { getNCRs, updateNCR } from '../../api/qcApi';
import { formatDate } from '../../utils/formatDate';

const NCRPage = () => {
  const { hasPermission } = useRole();
  const [ncrs, setNcrs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedNcr, setSelectedNcr] = useState(null);

  const [form, setForm] = useState({ root_cause: '', corrective_action: '', status: 'Open' });

  const fetchNCRs = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getNCRs();
      if (d.success) setNcrs(d.ncrs);
    } catch { toast.error('Failed to load NCR records.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNCRs(); }, [fetchNCRs]);

  const openDetail = (ncr) => {
    setSelectedNcr(ncr);
    setForm({
      root_cause: ncr.root_cause || '',
      corrective_action: ncr.corrective_action || '',
      status: ncr.status
    });
    setIsDetailOpen(true);
  };

  const handleUpdateNCR = async (e) => {
    e.preventDefault();
    try {
      await updateNCR(selectedNcr.id, form);
      toast.success('NCR updated successfully.');
      setIsDetailOpen(false);
      fetchNCRs();
    } catch {
      toast.error('Failed to update NCR.');
    }
  };

  const columns = [
    { key: 'ncr_no', label: 'NCR No', render: i => <span className="font-bold text-slate-800 dark:text-slate-200">{i.ncr_no}</span> },
    { key: 'source_type', label: 'QC Source', render: i => {
      const label = i.source_type === 'raw' ? 'Inward Raw' : i.source_type === 'in_process' ? 'In-Process' : 'Final Product';
      const cls = i.source_type === 'raw' ? 'bg-blue-100 text-blue-800' : i.source_type === 'in_process' ? 'bg-orange-100 text-orange-800' : 'bg-purple-100 text-purple-800';
      return <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold ${cls}`}>{label}</span>;
    }},
    { key: 'defect_description', label: 'Defect Description', render: i => <p className="truncate max-w-xs">{i.defect_description}</p> },
    { key: 'raised_by_name', label: 'Raised By', render: i => i.raised_by_name || 'System' },
    { key: 'raised_at', label: 'Raised At', render: i => formatDate(i.raised_at) },
    { key: 'status', label: 'Status', render: i => {
      const cls = i.status === 'Closed' ? 'bg-green-100 text-green-800 border-green-200' : i.status === 'Action Taken' ? 'bg-yellow-100 text-yellow-800 border-yellow-200 font-bold' : 'bg-red-100 text-red-800 border-red-200';
      return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold border ${cls}`}>{i.status}</span>;
    }},
    { key: 'actions', label: 'Actions', render: i => <button onClick={() => openDetail(i)} className="text-slate-600 text-xs font-semibold bg-slate-50 px-2 py-1 rounded-md hover:bg-slate-100">Review NCR</button> }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Non-Conformance Reports (NCR)</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage defects raised from raw material, in-process, or final QC failure. Implement corrective actions.</p>
        </div>
      </div>

      <Table columns={columns} data={ncrs} loading={loading} emptyMessage="No Non-Conformance Reports registered." />

      {/* NCR Review Modal */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={`Review NCR: ${selectedNcr?.ncr_no}`} size="lg">
        {selectedNcr && (
          <form onSubmit={handleUpdateNCR} className="space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border text-xs text-slate-600 dark:text-slate-400 space-y-1 mb-4">
              <div><strong>Raised At:</strong> {formatDate(selectedNcr.raised_at)}</div>
              <div><strong>Reported Defect:</strong> {selectedNcr.defect_description}</div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Root Cause Analysis *</label>
              <textarea required value={form.root_cause} onChange={e => setForm(p => ({ ...p, root_cause: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" rows={3} placeholder="Identify why the failure happened..." />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Corrective / Preventive Actions *</label>
              <textarea required value={form.corrective_action} onChange={e => setForm(p => ({ ...p, corrective_action: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" rows={3} placeholder="Describe containment actions, machine calibration or process changes taken..." />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Status Flow</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none">
                <option value="Open">Open (Analysis In Progress)</option>
                <option value="Action Taken">Action Taken (Verifying)</option>
                <option value="Closed">Closed (Resolved)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => setIsDetailOpen(false)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50">Cancel</button>
              {hasPermission('qc', 'edit') && <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">Save Resolution</button>}
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default NCRPage;
