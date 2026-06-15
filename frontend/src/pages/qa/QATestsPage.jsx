import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { useRole } from '../../context/RoleContext';
import { getTests, createTest, getTestById, submitTestResults, approveTest, getPendingApprovals, getChecklists } from '../../api/qaApi';
import { getWorkOrders } from '../../api/productionApi';
import { formatDate } from '../../utils/formatDate';

const QATestsPage = () => {
  const { hasPermission } = useRole();
  const [tests, setTests] = useState([]);
  const [pending, setPending] = useState([]);
  const [wos, setWos] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('tests');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConductOpen, setIsConductOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);

  const [form, setForm] = useState({ work_order_id: '', checklist_id: '', test_date: '', notes: '' });
  const [conductTest, setConductTest] = useState(null);
  const [conductResults, setConductResults] = useState([]);
  const [approveTestObj, setApproveTestObj] = useState(null);
  const [approveForm, setApproveForm] = useState({ status: 'Approved', remarks: '' });

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const t = await getTests();
      if (t.success) setTests(t.tests);
      if (hasPermission('qa', 'approve')) {
        const p = await getPendingApprovals();
        if (p.success) setPending(p.tests);
      }
    } catch { toast.error('Failed to load QA Tests.'); }
    finally { setLoading(false); }
  }, [hasPermission]);

  useEffect(() => {
    fetchTests();
    getWorkOrders().then(d => { if (d.success) setWos(d.workOrders.filter(w => w.status === 'In Progress' || w.status === 'Completed')); }).catch(() => {});
    getChecklists().then(d => { if (d.success) setChecklists(d.checklists.filter(c => c.is_active)); }).catch(() => {});
  }, [fetchTests]);

  const openCreate = () => {
    setForm({ work_order_id: wos[0]?.id || '', checklist_id: checklists[0]?.id || '', test_date: new Date().toISOString().slice(0, 10), notes: '' });
    setIsFormOpen(true);
  };

  const handleCreateTest = async (e) => {
    e.preventDefault();
    try {
      const d = await createTest(form);
      if (d.success) {
        toast.success('QA Test record initialized.');
        setIsFormOpen(false);
        fetchTests();
      }
    } catch { toast.error('Failed to initialize test.'); }
  };

  const handleOpenConduct = async (test) => {
    try {
      const d = await getTestById(test.id);
      if (d.success) {
        setConductTest(d.test);
        // Map checklist items to results. If results exist, map them. Otherwise, initialize empty results.
        if (d.results?.length > 0) {
          setConductResults(d.results.map(r => ({ ...r, passed: String(r.passed) === 'true' })));
        } else {
          const clRes = await getChecklistById(d.test.checklist_id);
          if (clRes.success) {
            setConductResults(clRes.items.map(item => ({
              checklist_item_id: item.id,
              question: item.question,
              expected_value: item.expected_value,
              actual_value: '',
              passed: true
            })));
          }
        }
        setIsConductOpen(true);
      }
    } catch (err) { toast.error('Failed to load test card.'); }
  };

  const handleResultSubmit = async (e) => {
    e.preventDefault();
    try {
      const d = await submitTestResults(conductTest.id, { results: conductResults });
      if (d.success) {
        toast.success(`Results submitted. Overall Result: ${d.result}`);
        setIsConductOpen(false);
        fetchTests();
      }
    } catch (err) { toast.error('Failed to submit results.'); }
  };

  const handleOpenApprove = async (test) => {
    try {
      const d = await getTestById(test.id);
      if (d.success) {
        setApproveTestObj(d);
        setApproveForm({ status: 'Approved', remarks: '' });
        setIsApproveOpen(true);
      }
    } catch { toast.error('Failed to load test for approval.'); }
  };

  const handleApprovalSubmit = async (e) => {
    e.preventDefault();
    try {
      await approveTest(approveTestObj.test.id, approveForm);
      toast.success(`QA test marked ${approveForm.status}.`);
      setIsApproveOpen(false);
      fetchTests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval action failed.');
    }
  };

  const columns = [
    { key: 'wo_no', label: 'Work Order' },
    { key: 'checklist_name', label: 'Checklist' },
    { key: 'tested_by_name', label: 'Tested By', render: i => i.tested_by_name || '—' },
    { key: 'test_date', label: 'Test Date', render: i => formatDate(i.test_date) },
    { key: 'result', label: 'Test Result', render: i => {
      const cls = i.result === 'Pass' ? 'bg-green-100 text-green-800 border-green-200' : i.result === 'Fail' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-slate-100 text-slate-600 border-slate-200';
      return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold border ${cls}`}>{i.result}</span>;
    }},
    { key: 'approval_status', label: 'Approval', render: i => {
      const cls = i.approval_status === 'Approved' ? 'bg-green-100 text-green-800 border-green-200' : i.approval_status === 'Rejected' ? 'bg-red-100 text-red-800 border-red-200 font-bold' : 'bg-yellow-100 text-yellow-800 border-yellow-200';
      return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold border ${cls}`}>{i.approval_status}</span>;
    }},
    { key: 'actions', label: 'Actions', render: i => (
      <div className="flex gap-2">
        {i.approval_status === 'Pending' && <button onClick={() => handleOpenConduct(i)} className="text-white text-xs font-semibold bg-blue-600 px-2.5 py-1 rounded-md hover:bg-blue-500">Conduct Test</button>}
        {i.approval_status !== 'Pending' && <button onClick={() => handleOpenConduct(i)} className="text-slate-600 text-xs font-semibold bg-slate-50 px-2.5 py-1 rounded-md hover:bg-slate-100 font-medium">View Results</button>}
      </div>
    )}
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Quality Inspection Tests</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Log quality inspection tests, document test actuals, and manage approvals.</p>
        </div>
        {hasPermission('qa', 'create') && <button onClick={openCreate} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">Initialize QA Test</button>}
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 mb-6">
        <button onClick={() => setActiveTab('tests')} className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'tests' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>All Inspection Tests</button>
        {hasPermission('qa', 'approve') && (
          <button onClick={() => setActiveTab('pending')} className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'pending' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>Pending QA Approvals ({pending.length})</button>
        )}
      </div>

      {activeTab === 'tests' ? (
        <Table columns={columns} data={tests} loading={loading} emptyMessage="No QA tests registered." />
      ) : (
        <Table
          columns={[
            { key: 'wo_no', label: 'Work Order' },
            { key: 'checklist_name', label: 'Checklist' },
            { key: 'tested_by_name', label: 'Tested By' },
            { key: 'result', label: 'Conduct Result' },
            { key: 'actions', label: 'Action', render: i => <button onClick={() => handleOpenApprove(i)} className="text-white text-xs font-semibold bg-orange-600 px-3 py-1.5 rounded-lg hover:bg-orange-500">Review & Approve</button> }
          ]}
          data={pending}
          loading={loading}
          emptyMessage="No tests pending approval."
        />
      )}

      {/* Initialize Test Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Initialize Inspection Run">
        <form onSubmit={handleCreateTest} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Work Order Reference *</label>
            <select value={form.work_order_id} onChange={e => setForm(p => ({ ...p, work_order_id: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none">
              <option value="" disabled>Select Work Order</option>
              {wos.map(w => <option key={w.id} value={w.id}>{w.wo_no} (item: {w.finished_item_name})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">QA Checklist *</label>
            <select value={form.checklist_id} onChange={e => setForm(p => ({ ...p, checklist_id: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none">
              <option value="" disabled>Select Checklist</option>
              {checklists.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Test Date</label>
            <input type="date" value={form.test_date} onChange={e => setForm(p => ({ ...p, test_date: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Remarks</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">Initialize Test</button>
          </div>
        </form>
      </Modal>

      {/* Conduct Inspection Modal */}
      <Modal isOpen={isConductOpen} onClose={() => setIsConductOpen(false)} title="Conduct Quality Test Inspection" size="lg">
        {conductTest && (
          <form onSubmit={handleResultSubmit} className="space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <div><strong className="text-slate-800 dark:text-white">Work Order:</strong> {conductTest.wo_no}</div>
              <div><strong className="text-slate-800 dark:text-white">Checklist:</strong> {conductTest.checklist_name}</div>
            </div>

            <div className="space-y-3">
              {conductResults.map((item, idx) => (
                <div key={idx} className="border border-slate-100 dark:border-slate-800 p-3 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-500">Item #{idx+1}</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.question}</p>
                    <p className="text-[10px] text-blue-600">Expected: {item.expected_value}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      required
                      placeholder="Actual Val"
                      value={item.actual_value}
                      onChange={e => {
                        const val = e.target.value;
                        setConductResults(prev => prev.map((it, i) => i === idx ? { ...it, actual_value: val } : it));
                      }}
                      disabled={conductTest.approval_status !== 'Pending'}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-1 px-2.5 text-xs text-slate-900 dark:text-white focus:outline-none w-36"
                    />
                    <select
                      value={String(item.passed)}
                      onChange={e => {
                        const pass = e.target.value === 'true';
                        setConductResults(prev => prev.map((it, i) => i === idx ? { ...it, passed: pass } : it));
                      }}
                      disabled={conductTest.approval_status !== 'Pending'}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-1 px-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="true">Pass</option>
                      <option value="false">Fail</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => setIsConductOpen(false)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50">Cancel</button>
              {conductTest.approval_status === 'Pending' && <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">Submit Results</button>}
            </div>
          </form>
        )}
      </Modal>

      {/* Approval Modal */}
      <Modal isOpen={isApproveOpen} onClose={() => setIsApproveOpen(false)} title="QA Manager Review Inspection">
        {approveTestObj && (
          <form onSubmit={handleApprovalSubmit} className="space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border text-xs text-slate-600 dark:text-slate-400 space-y-1 mb-4">
              <div><strong>Work Order:</strong> {approveTestObj.test.wo_no}</div>
              <div><strong>Checklist:</strong> {approveTestObj.test.checklist_name}</div>
              <div><strong>Conducted By:</strong> {approveTestObj.test.tested_by_name}</div>
              <div><strong>Overall Result:</strong> <span className={approveTestObj.test.result === 'Pass' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{approveTestObj.test.result}</span></div>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto mb-4 border border-slate-100 dark:border-slate-800 p-2 rounded-lg">
              {approveTestObj.results?.map((r, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs p-1.5 border-b last:border-0 border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="font-semibold">{r.question}</span>
                    <span className="text-slate-400 ml-2">(expected: {r.expected_value})</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-500">Actual: {r.actual_value}</span>
                    <span className={r.passed ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{r.passed ? '✓ Pass' : '✕ Fail'}</span>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Approval Decision</label>
              <select value={approveForm.status} onChange={e => setApproveForm(p => ({ ...p, status: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none">
                <option value="Approved">Approve (Release WO for Dispatch)</option>
                <option value="Rejected">Reject & Flag WO</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Remarks / Rejection Reason</label>
              <textarea value={approveForm.remarks} onChange={e => setApproveForm(p => ({ ...p, remarks: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" rows={2} />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => setIsApproveOpen(false)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50">Cancel</button>
              <button type="submit" className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500 font-bold">Submit Review</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default QATestsPage;
