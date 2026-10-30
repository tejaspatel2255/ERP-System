import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
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
        if (d.results?.length > 0) {
          setConductResults(d.results.map(r => ({ ...r, passed: String(r.passed) === 'true' })));
        } else {
          setConductResults([]);
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
    { key: 'wo_no', label: 'Work Order', render: i => <span className="font-mono font-bold text-accent-primary">{i.wo_no}</span> },
    { key: 'checklist_name', label: 'Checklist', render: i => <span className="font-medium text-text-primary">{i.checklist_name}</span> },
    { key: 'tested_by_name', label: 'Tested By', render: i => <span className="text-xs text-text-muted">{i.tested_by_name || '—'}</span> },
    { key: 'test_date', label: 'Test Date', render: i => <span className="font-mono text-xs text-text-muted">{formatDate(i.test_date)}</span> },
    { key: 'result', label: 'Test Result', render: i => <StatusBadge status={i.result || 'Pending'} /> },
    { key: 'approval_status', label: 'Approval', render: i => <StatusBadge status={i.approval_status} /> },
    { key: 'actions', label: 'Actions', render: i => (
      <div className="flex gap-2">
        {i.approval_status === 'Pending' ? (
          <button onClick={() => handleOpenConduct(i)} className="btn btn-primary text-xs py-1 px-2.5">
            Conduct Test
          </button>
        ) : (
          <button onClick={() => handleOpenConduct(i)} className="btn btn-secondary text-xs py-1 px-2.5">
            View Results
          </button>
        )}
      </div>
    )}
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 font-sans">
      <PageHeader
        title="Quality Inspection Tests"
        description="Log quality inspection tests, document test actuals against checklists, and manage release approvals."
        actions={
          hasPermission('qa', 'create') && (
            <button onClick={openCreate} className="btn btn-primary text-xs uppercase tracking-wider font-mono">
              + Initialize QA Test
            </button>
          )
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border-color pb-1">
        <button
          onClick={() => setActiveTab('tests')}
          className={`px-4 py-2 text-xs font-mono font-bold uppercase transition-colors border-b-2 -mb-[1px] ${
            activeTab === 'tests'
              ? 'border-accent-primary text-accent-primary'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          All Inspection Tests ({tests.length})
        </button>
        {hasPermission('qa', 'approve') && (
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase transition-colors border-b-2 -mb-[1px] ${
              activeTab === 'pending'
                ? 'border-accent-primary text-accent-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            Pending QA Approvals ({pending.length})
          </button>
        )}
      </div>

      <div className="sheet">
        {activeTab === 'tests' ? (
          <Table columns={columns} data={tests} loading={loading} emptyMessage="No QA tests registered." />
        ) : (
          <Table
            columns={[
              { key: 'wo_no', label: 'Work Order', render: i => <span className="font-mono font-bold text-accent-primary">{i.wo_no}</span> },
              { key: 'checklist_name', label: 'Checklist', render: i => <span className="font-medium text-text-primary">{i.checklist_name}</span> },
              { key: 'tested_by_name', label: 'Tested By', render: i => <span className="text-xs text-text-muted">{i.tested_by_name || '—'}</span> },
              { key: 'result', label: 'Conduct Result', render: i => <StatusBadge status={i.result} /> },
              { key: 'actions', label: 'Action', render: i => (
                <button onClick={() => handleOpenApprove(i)} className="btn btn-warning text-xs py-1 px-3">
                  Review & Approve
                </button>
              )}
            ]}
            data={pending}
            loading={loading}
            emptyMessage="No tests pending approval."
          />
        )}
      </div>

      {/* Initialize Test Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Initialize Inspection Run">
        <form onSubmit={handleCreateTest} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Work Order Reference *</label>
            <select value={form.work_order_id} onChange={e => setForm(p => ({ ...p, work_order_id: e.target.value }))} className="field w-full">
              <option value="" disabled>Select Work Order</option>
              {wos.map(w => <option key={w.id} value={w.id}>{w.wo_no} ({w.finished_item_name})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">QA Checklist *</label>
            <select value={form.checklist_id} onChange={e => setForm(p => ({ ...p, checklist_id: e.target.value }))} className="field w-full">
              <option value="" disabled>Select Checklist</option>
              {checklists.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Test Date</label>
            <input type="date" value={form.test_date} onChange={e => setForm(p => ({ ...p, test_date: e.target.value }))} className="field w-full" />
          </div>
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Remarks</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="field w-full" rows={2} placeholder="Optional initial notes..." />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button type="button" onClick={() => setIsFormOpen(false)} className="btn btn-secondary text-xs">Cancel</button>
            <button type="submit" className="btn btn-primary text-xs">Initialize Test</button>
          </div>
        </form>
      </Modal>

      {/* Conduct Inspection Modal */}
      <Modal isOpen={isConductOpen} onClose={() => setIsConductOpen(false)} title="Conduct Quality Test Inspection" size="lg">
        {conductTest && (
          <form onSubmit={handleResultSubmit} className="space-y-4">
            <div className="p-3 bg-bg-surface rounded-xs border border-border-color text-xs text-text-secondary space-y-1 font-mono">
              <div><strong className="text-text-primary">Work Order:</strong> {conductTest.wo_no}</div>
              <div><strong className="text-text-primary">Checklist:</strong> {conductTest.checklist_name}</div>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {conductResults.map((item, idx) => (
                <div key={idx} className="border border-border-color p-3 rounded-xs bg-bg-surface flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] font-mono font-bold text-text-muted uppercase">Item #{idx+1}</p>
                    <p className="text-sm font-semibold text-text-primary">{item.question}</p>
                    <p className="text-xs font-mono text-accent-primary mt-0.5">Expected: {item.expected_value}</p>
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
                      className="field w-36 text-xs"
                    />
                    <select
                      value={String(item.passed)}
                      onChange={e => {
                        const pass = e.target.value === 'true';
                        setConductResults(prev => prev.map((it, i) => i === idx ? { ...it, passed: pass } : it));
                      }}
                      disabled={conductTest.approval_status !== 'Pending'}
                      className="field text-xs"
                    >
                      <option value="true">Pass</option>
                      <option value="false">Fail</option>
                    </select>
                  </div>
                </div>
              ))}
              {conductResults.length === 0 && (
                <p className="text-center py-6 text-xs font-mono text-text-muted">No checklist questions recorded for this test.</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
              <button type="button" onClick={() => setIsConductOpen(false)} className="btn btn-secondary text-xs">Cancel</button>
              {conductTest.approval_status === 'Pending' && <button type="submit" className="btn btn-primary text-xs">Submit Results</button>}
            </div>
          </form>
        )}
      </Modal>

      {/* Approval Modal */}
      <Modal isOpen={isApproveOpen} onClose={() => setIsApproveOpen(false)} title="QA Manager Review Inspection">
        {approveTestObj && (
          <form onSubmit={handleApprovalSubmit} className="space-y-4">
            <div className="p-3 bg-bg-surface rounded-xs border border-border-color text-xs text-text-secondary space-y-1 mb-4 font-mono">
              <div><strong className="text-text-primary">Work Order:</strong> {approveTestObj.test.wo_no}</div>
              <div><strong className="text-text-primary">Checklist:</strong> {approveTestObj.test.checklist_name}</div>
              <div><strong className="text-text-primary">Conducted By:</strong> {approveTestObj.test.tested_by_name}</div>
              <div className="flex items-center gap-2">
                <strong className="text-text-primary">Overall Result:</strong>
                <StatusBadge status={approveTestObj.test.result} />
              </div>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto mb-4 border border-border-color p-2 rounded-xs bg-bg-surface">
              {approveTestObj.results?.map((r, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs p-1.5 border-b last:border-0 border-border-color font-mono">
                  <div>
                    <span className="font-semibold text-text-primary">{r.question}</span>
                    <span className="text-text-muted ml-2">(expected: {r.expected_value})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted">Actual: {r.actual_value}</span>
                    <span className={r.passed ? 'text-accent-success font-bold' : 'text-accent-danger font-bold'}>
                      {r.passed ? '✓ Pass' : '✕ Fail'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Approval Decision</label>
              <select value={approveForm.status} onChange={e => setApproveForm(p => ({ ...p, status: e.target.value }))} className="field w-full">
                <option value="Approved">Approve (Release WO for Dispatch)</option>
                <option value="Rejected">Reject & Flag WO</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Remarks / Rejection Reason</label>
              <textarea value={approveForm.remarks} onChange={e => setApproveForm(p => ({ ...p, remarks: e.target.value }))} className="field w-full" rows={2} placeholder="Inspection feedback..." />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
              <button type="button" onClick={() => setIsApproveOpen(false)} className="btn btn-secondary text-xs">Cancel</button>
              <button type="submit" className="btn btn-primary text-xs">Submit Review</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default QATestsPage;
