import React, { useEffect, useState } from 'react';
import { CheckCircle2, FileSearch, Download, Check, AlertTriangle } from 'lucide-react';
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
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Design Reviews"
        description="Open pending engineering files, inspect versions, and approve or request revisions."
      />

      {error && (
        <div className="p-3 bg-[var(--danger-soft)] border border-[var(--danger-rail)] rounded text-[var(--danger-rail)] text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="sheet p-12 text-center text-text-muted text-sm">
          Loading pending reviews...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* Pending Reviews Table Left Panel */}
          <div className="lg:col-span-2 min-w-0 sheet overflow-hidden">
            <div className="p-4 border-b border-border-color flex justify-between items-center">
              <h3 className="text-sm font-semibold text-text-primary">Pending Submissions</h3>
              <span className="tb-cell text-[11px] px-2 py-0.5 rounded font-mono">
                {pendingReviews.length} awaiting
              </span>
            </div>

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
                <table className="bom">
                  <thead>
                    <tr>
                      <th>File Title</th>
                      <th>Version</th>
                      <th>Uploaded By</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingReviews.map((review) => {
                      const isSelected = selectedReview?.id === review.id;
                      return (
                        <tr
                          key={review.id}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-bg-secondary font-semibold' : ''
                          }`}
                          onClick={() => openReview(review)}
                        >
                          <td className="font-medium text-text-primary">
                            {review.design_file_title}
                          </td>
                          <td>
                            <span className="tb-cell text-[11px] font-mono px-1.5 py-0.5 rounded text-accent-primary font-semibold">
                              v{review.version_number}
                            </span>
                          </td>
                          <td className="text-text-secondary">
                            {review.uploaded_by_name || 'Unknown'}
                          </td>
                          <td className="text-xs text-text-muted font-mono">
                            {new Date(review.uploaded_at).toLocaleDateString()}
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
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-accent-primary font-semibold">
                    Reviewing Submission
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-text-primary truncate">
                    {selectedReview.design_file_title}
                  </h3>
                  <p className="text-xs text-text-secondary font-mono mt-0.5">
                    Version v{selectedReview.version_number}
                  </p>
                </div>

                {selectedFile?.versions?.find((v) => v.id === selectedReview.id)?.file_url && (
                  <div>
                    <a
                      href={selectedFile.versions.find((v) => v.id === selectedReview.id).file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary btn-sm inline-flex items-center gap-1.5 w-full justify-center"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Open & Download File</span>
                    </a>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text-secondary">
                    Review Remarks *
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter approval comments or specify requested revisions..."
                    className="field h-28"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleReview('Approved')}
                    className="btn-primary btn-sm flex-1 justify-center"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" /> Approve
                  </button>
                  <button
                    onClick={() => handleReview('Changes Requested')}
                    className="btn-danger btn-sm flex-1 justify-center"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Request Changes
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
