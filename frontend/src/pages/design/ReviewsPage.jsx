import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { getPendingReviews, submitReview, getDesignFileById } from '../../api/designApi';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';

export default function ReviewsPage() {
  const [pendingReviews, setPendingReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
    } catch (err) {
      setError('Failed to load pending design reviews.');
    } finally {
      setLoading(false);
    }
  };

  const openReview = async (review) => {
    setSelectedReview(review);
    setRemarks('');
    try {
      const res = await getDesignFileById(review.design_file_id);
      setSelectedFile(res);
    } catch (err) {
      setError('Failed to load design file detail.');
    }
  };

  const handleReview = async (status) => {
    if (!selectedReview) return;
    try {
      await submitReview(selectedReview.design_file_id, {
        version_id: selectedReview.id,
        status,
        remarks
      });
      setSelectedReview(null);
      setSelectedFile(null);
      fetchReviews();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review.');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 font-sans">
      <PageHeader
        title="Design Reviews"
        description="Inspect pending engineering files, inspect versions, and approve or request revisions."
      />

      {error && <div className="p-3 bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-xs font-mono">{error}</div>}

      {loading ? (
        <div className="p-12 text-center text-text-muted sheet text-xs font-mono">Loading pending reviews...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Pending Reviews Table Left Panel */}
          <div className="lg:col-span-2 min-w-0 sheet overflow-hidden">
            {pendingReviews.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={CheckCircle2}
                  title="No Pending Reviews"
                  description="All engineering design files are currently reviewed. New submissions will automatically appear here for evaluation."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border-color bg-bg-surface text-text-muted font-mono font-bold uppercase tracking-wider">
                      <th className="p-3">File Title</th>
                      <th className="p-3 font-mono">Version</th>
                      <th className="p-3">Uploaded By</th>
                      <th className="p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-color">
                    {pendingReviews.map((review) => (
                      <tr
                        key={review.id}
                        className={`cursor-pointer hover:bg-bg-hover transition-colors ${
                          selectedReview?.id === review.id ? 'bg-bg-surface font-semibold' : ''
                        }`}
                        onClick={() => openReview(review)}
                      >
                        <td className="p-3 font-semibold text-text-primary">
                          <p>{review.title}</p>
                          <p className="text-[11px] text-text-muted font-mono">{review.project_ref || 'No Project Ref'}</p>
                        </td>
                        <td className="p-3 font-mono font-bold text-accent-primary">v{review.version_number}</td>
                        <td className="p-3 text-text-muted text-xs">{review.uploaded_by_name || 'System'}</td>
                        <td className="p-3 text-xs font-mono text-text-muted">{new Date(review.uploaded_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Review Action Form Right Panel */}
          <div className="min-w-0 sheet p-5 space-y-5">
            {selectedReview ? (
              <div className="space-y-4">
                <div className="border-b border-border-color pb-3">
                  <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-text-primary">
                    Review Version v{selectedReview.version_number}
                  </h3>
                  <p className="text-xs text-text-secondary mt-1">{selectedReview.title}</p>
                  {selectedReview.notes && (
                    <p className="text-[11px] text-text-muted italic mt-1 font-mono">Notes: {selectedReview.notes}</p>
                  )}
                </div>

                {selectedFile && (
                  <div className="p-3 bg-bg-surface rounded-xs border border-border-color space-y-2 text-xs">
                    <p className="text-text-secondary font-mono">{selectedFile.designFile.description || 'No additional file details.'}</p>
                    <a
                      href={selectedReview.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary text-xs inline-flex items-center gap-1 font-mono"
                    >
                      <span>📥</span> Download Design Spec
                    </a>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Review Remarks / Modification Requests
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="field w-full h-24 text-xs"
                    placeholder="Enter approval comments or specify modifications required..."
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-border-color">
                  <button
                    onClick={() => handleReview('Approved')}
                    className="btn btn-success flex-1 text-xs"
                  >
                    ✓ Approve Spec
                  </button>
                  <button
                    onClick={() => handleReview('Rejected')}
                    className="btn btn-danger flex-1 text-xs"
                  >
                    ✕ Request Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-text-muted text-xs font-mono italic">
                Select a pending review from the list on the left to evaluate schematics and sign off.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
