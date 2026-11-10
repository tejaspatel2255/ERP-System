import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  FileSearch,
  Download,
  Check,
  XCircle,
  RefreshCw,
  FileText,
  User,
  Calendar,
  X,
  History,
  Clock
} from 'lucide-react';
import { getPendingReviews, submitReview, getDesignFileById } from '../../api/designApi';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../utils/formatDate';

export default function ReviewsPage() {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
  const [pendingReviews, setPendingReviews] = useState([]);
  const [reviewHistory, setReviewHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedReview, setSelectedReview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await getPendingReviews();
      setPendingReviews(res.pendingReviews || []);
      setReviewHistory(res.reviewHistory || []);
    } catch (err) {
      setError('Failed to load design reviews.');
    } finally {
      setLoading(false);
    }
  };

  const openReview = async (review) => {
    setSelectedReview(review);
    setRemarks('');
    setError('');
    try {
      const res = await getDesignFileById(review.design_file_id);
      setSelectedFile(res);
    } catch (err) {
      setError('Failed to load design file details.');
    }
  };

  const handleReview = async (status) => {
    if (!selectedReview || submitting) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await submitReview(selectedReview.design_file_id, {
        version_id: selectedReview.id,
        status,
        remarks: remarks.trim() || (status === 'Approved' ? 'Design verified and approved.' : 'Design rejected by reviewer.')
      });
      setSuccess(`Submission "${selectedReview.design_file_title}" (v${selectedReview.version_number}) has been marked as ${status}.`);
      setSelectedReview(null);
      setSelectedFile(null);
      setRemarks('');
      await fetchReviews();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Design Reviews"
        description="Inspect pending engineering drawings, verify versions, and record approvals or rejections."
        actions={
          <button
            onClick={fetchReviews}
            disabled={loading}
            className="btn btn-ghost btn-sm inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        }
      />

      {error && (
        <div className="rounded-md border px-3.5 py-2.5 text-xs border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)] flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-text-muted hover:text-text-primary ml-2 p-0.5 rounded"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {success && (
        <div className="rounded-md border px-3.5 py-2.5 text-xs border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)] flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span className="font-medium">{success}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccess('')}
            className="text-text-muted hover:text-text-primary ml-2 p-0.5 rounded"
            aria-label="Dismiss message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border-color pb-1 gap-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab('pending');
            setSelectedReview(null);
          }}
          className={`btn btn-sm inline-flex items-center gap-1.5 ${
            activeTab === 'pending' ? 'btn-primary' : 'btn-ghost'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending Submissions ({pendingReviews.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('history');
            setSelectedReview(null);
          }}
          className={`btn btn-sm inline-flex items-center gap-1.5 ${
            activeTab === 'history' ? 'btn-primary' : 'btn-ghost'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Review History ({reviewHistory.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="sheet p-16 flex flex-col items-center justify-center gap-2 text-text-muted text-xs">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary" />
          <p>Loading design reviews...</p>
        </div>
      ) : activeTab === 'pending' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* Pending Reviews Table Left Panel */}
          <div className="lg:col-span-2 min-w-0 sheet overflow-hidden">
            <div className="p-4 border-b border-border-color flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-text-primary">Awaiting Engineering Review</h3>
                <p className="text-xs text-text-muted mt-0.5">Click any submission to evaluate and approve or reject</p>
              </div>
              <span className="stamp font-mono text-xs font-semibold">
                {pendingReviews.length} pending
              </span>
            </div>

            {pendingReviews.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={CheckCircle2}
                  title="No Pending Reviews"
                  description="All engineering design files have been reviewed. Newly uploaded drawings will automatically appear here."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="bom w-full text-left border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="p-3">File Title</th>
                      <th className="p-3 text-center">Version</th>
                      <th className="p-3">Uploaded By</th>
                      <th className="p-3">Submission Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-color">
                    {pendingReviews.map((review) => {
                      const isSelected = selectedReview?.id === review.id;
                      return (
                        <tr
                          key={review.id}
                          className={`bom-row cursor-pointer transition-colors ${
                            isSelected ? 'bg-bg-hover ring-1 ring-inset ring-accent-primary/30' : ''
                          }`}
                          onClick={() => openReview(review)}
                        >
                          <td className="p-3 font-semibold text-text-primary">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-accent-primary shrink-0" />
                              <span className="truncate">{review.design_file_title}</span>
                            </div>
                            {review.project_ref && (
                              <span className="text-[11px] text-text-muted font-mono ml-6 block">
                                Ref: {review.project_ref}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono">
                            <span className="stamp font-bold text-accent-primary">
                              v{review.version_number}
                            </span>
                          </td>
                          <td className="p-3 text-text-secondary">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-text-muted shrink-0" />
                              <span>{review.uploaded_by_name || 'Design Engineer'}</span>
                            </div>
                          </td>
                          <td className="p-3 text-text-muted font-mono tabular-nums">
                            {formatDate(review.uploaded_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Selected File Inspection Right Panel */}
          <div className="min-w-0 sheet p-5 h-fit space-y-4">
            {selectedReview ? (
              <div className="space-y-4">
                <div className="border-b border-border-color pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] uppercase tracking-wider text-accent-primary font-bold">
                      Evaluating Drawing
                    </span>
                    <span className="stamp font-mono font-bold text-accent-primary">
                      Version v{selectedReview.version_number}
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-base font-bold text-text-primary truncate" title={selectedReview.design_file_title}>
                    {selectedReview.design_file_title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted mt-1 font-mono">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" /> {selectedReview.uploaded_by_name || 'Author'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatDate(selectedReview.uploaded_at)}
                    </span>
                  </div>
                </div>

                {/* Download / Open File Link */}
                {selectedFile?.versions?.find((v) => v.id === selectedReview.id)?.file_url && (
                  <div>
                    <a
                      href={selectedFile.versions.find((v) => v.id === selectedReview.id).file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-sm inline-flex items-center gap-1.5 w-full justify-center shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5 text-accent-primary" />
                      <span className="font-medium">Open & Download Drawing</span>
                    </a>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Evaluation Remarks
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter approval comments or specify rejection reasons..."
                    className="field h-28 text-xs leading-relaxed"
                    disabled={submitting}
                  />
                  <p className="text-[11px] text-text-muted">
                    Your decision will remove this file from pending reviews and update its permanent record.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleReview('Approved')}
                    disabled={submitting}
                    className="btn btn-primary btn-sm flex-1 justify-center inline-flex items-center gap-1.5 shadow-sm"
                  >
                    {submitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{submitting ? 'Processing...' : 'Approve'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReview('Rejected')}
                    disabled={submitting}
                    className="btn btn-danger btn-sm flex-1 justify-center inline-flex items-center gap-1.5 shadow-sm"
                  >
                    {submitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    <span>{submitting ? 'Processing...' : 'Reject'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <EmptyState
                  icon={FileSearch}
                  title="No Review Selected"
                  description="Select a pending submission from the left table to open its CAD drawing, write remarks, and click Approve or Reject."
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Review History Tab */
        <div className="sheet overflow-hidden">
          <div className="p-4 border-b border-border-color flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-text-primary">Completed Engineering Reviews</h3>
              <p className="text-xs text-text-muted mt-0.5">Historical log of all approved and rejected design files</p>
            </div>
            <span className="stamp font-mono text-xs font-semibold">
              {reviewHistory.length} total logged
            </span>
          </div>

          {reviewHistory.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={History}
                title="No Review History"
                description="Completed reviews will appear here once submissions have been evaluated."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="bom w-full text-left border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="p-3">File Title</th>
                    <th className="p-3 text-center">Version</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Remarks</th>
                    <th className="p-3">Reviewed By</th>
                    <th className="p-3">Review Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color">
                  {reviewHistory.map((item) => (
                    <tr key={item.id} className="bom-row text-text-secondary">
                      <td className="p-3 font-semibold text-text-primary">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-accent-primary shrink-0" />
                          <span>{item.design_file_title}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center font-mono">
                        <span className="stamp font-bold">v{item.version_number}</span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            item.status === 'Approved'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 italic text-text-muted max-w-xs truncate" title={item.remarks}>
                        {item.remarks || '—'}
                      </td>
                      <td className="p-3 text-text-secondary">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-text-muted shrink-0" />
                          <span>{item.reviewed_by_name || 'System Reviewer'}</span>
                        </div>
                      </td>
                      <td className="p-3 text-text-muted font-mono tabular-nums">
                        {formatDate(item.review_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
