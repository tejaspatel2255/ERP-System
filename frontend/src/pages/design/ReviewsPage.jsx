import React, { useEffect, useState } from 'react';
import { CheckCircle2, FileSearch } from 'lucide-react';
import { getPendingReviews, submitReview, getDesignFileById } from '../../api/designApi';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';

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
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-300">
      <PageHeader
        title="Design Reviews"
        description="Open pending engineering files, inspect versions, and approve or request revisions."
      />

      {error && <div className="mb-6 p-4 rounded-2xl border border-accent-danger/30 bg-accent-danger/10 text-accent-danger text-sm">{error}</div>}

      {loading ? (
        <div className="p-12 text-center text-text-muted bg-bg-card border border-border-color rounded-2xl">Loading pending reviews...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Pending Reviews Table Left Panel */}
          <div className="lg:col-span-2 min-w-0 rounded-2xl border border-border-color bg-bg-card shadow-brand overflow-hidden">
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
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border-color bg-bg-secondary text-text-muted font-semibold text-xs uppercase tracking-wider">
                      <th className="p-4">File Title</th>
                      <th className="p-4">Version</th>
                      <th className="p-4">Uploaded By</th>
                      <th className="p-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-color text-sm">
                    {pendingReviews.map((review) => (
                      <tr
                        key={review.id}
                        className={`cursor-pointer hover:bg-bg-hover transition-colors ${
                          selectedReview?.id === review.id ? 'bg-bg-secondary font-semibold' : ''
                        }`}
                        onClick={() => openReview(review)}
                      >
                        <td className="p-4 font-semibold text-text-primary">{review.design_file_title}</td>
                        <td className="p-4 font-mono text-accent-primary font-bold">v{review.version_number}</td>
                        <td className="p-4 text-text-secondary">{review.uploaded_by_name || 'Unknown'}</td>
                        <td className="p-4 text-text-muted text-xs">{new Date(review.uploaded_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Selected File Inspection Right Panel */}
          <div className="min-w-0 rounded-2xl border border-border-color bg-bg-card p-6 shadow-brand h-fit space-y-6">
            {selectedReview ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-accent-primary font-bold">Reviewing Submission</p>
                  <h3 className="mt-1 text-lg font-bold text-text-primary truncate">{selectedReview.design_file_title}</h3>
                  <p className="text-xs text-text-secondary font-mono mt-0.5">Version v{selectedReview.version_number}</p>
                </div>

                {selectedFile?.versions?.find((v) => v.id === selectedReview.id)?.file_url && (
                  <a
                    href={selectedFile.versions.find((v) => v.id === selectedReview.id).file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-accent-primary/10 border border-accent-primary/30 px-3.5 py-2 text-xs font-bold text-accent-primary hover:bg-accent-primary/20 transition-all"
                  >
                    <span>📄</span> Open & Download File
                  </a>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">Review Remarks *</label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter approval comments or specify requested revisions..."
                    className="h-28 w-full rounded-xl border border-border-color bg-bg-secondary p-3 text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => handleReview('Approved')}
                    className="flex-1 rounded-xl bg-accent-success hover:opacity-90 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => handleReview('Changes Requested')}
                    className="flex-1 rounded-xl bg-accent-warning hover:opacity-90 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all"
                  >
                    ⚠ Request Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <EmptyState
                  icon={FileSearch}
                  title="No Review Selected"
                  description="Select a pending design file from the left table to open its CAD drawing, write evaluation remarks, and approve or request changes."
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
