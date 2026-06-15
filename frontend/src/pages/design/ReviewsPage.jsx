import React, { useEffect, useState } from 'react';
import { getPendingReviews, submitReview, getDesignFileById } from '../../api/designApi';

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
    <div className="p-6 bg-slate-900 min-h-screen text-slate-100">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Design Reviews</h2>
        <p className="text-slate-400 text-sm mt-1">Open pending files, inspect the version, and approve or request changes.</p>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-500/40 bg-red-950/80 p-3 text-red-200">{error}</div>}

      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading pending reviews...</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border border-slate-700/50 bg-slate-800/50 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-800/70 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="p-4">File Title</th>
                  <th className="p-4">Version</th>
                  <th className="p-4">Uploaded By</th>
                  <th className="p-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {pendingReviews.map((review) => (
                  <tr key={review.id} className="cursor-pointer hover:bg-slate-800/70" onClick={() => openReview(review)}>
                    <td className="p-4 font-semibold text-white">{review.design_file_title}</td>
                    <td className="p-4 font-mono text-teal-400">v{review.version_number}</td>
                    <td className="p-4 text-slate-300">{review.uploaded_by_name || 'Unknown'}</td>
                    <td className="p-4 text-slate-400">{new Date(review.uploaded_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {pendingReviews.length === 0 && (
                  <tr>
                    <td className="p-8 text-center text-slate-400" colSpan={4}>No pending reviews right now.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-slate-700/50 bg-slate-800 p-5">
            {selectedReview ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-teal-400">Reviewing</p>
                  <h3 className="mt-1 text-xl font-bold text-white">{selectedReview.design_file_title}</h3>
                  <p className="text-sm text-slate-400">Version v{selectedReview.version_number}</p>
                </div>

                {selectedFile?.versions?.find((v) => v.id === selectedReview.id)?.file_url && (
                  <a
                    href={selectedFile.versions.find((v) => v.id === selectedReview.id).file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-lg bg-teal-500/20 px-3 py-2 text-sm font-semibold text-teal-300"
                  >
                    Open file
                  </a>
                )}

                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Remarks for approval or change request"
                  className="h-28 w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-white"
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => handleReview('Approved')}
                    className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReview('Changes Requested')}
                    className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950"
                  >
                    Request Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-500">
                Select a pending design file to review it here.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
