import React, { useState, useEffect } from 'react';
import { getDesignFiles, uploadDesignFile, getDesignFileById, uploadNewVersion } from '../../api/designApi';

export default function DesignFilesPage() {
  const [designFiles, setDesignFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selected File details
  const [selectedFile, setSelectedFile] = useState(null);
  const [versions, setVersions] = useState([]);
  const [reviews, setReviews] = useState([]);

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNewVersionModal, setShowNewVersionModal] = useState(false);

  // Form State - New Design File
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectRef, setProjectRef] = useState('');
  const [file, setFile] = useState(null);

  // Form State - New Version
  const [versionNotes, setVersionNotes] = useState('');
  const [versionFile, setVersionFile] = useState(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await getDesignFiles();
      setDesignFiles(res.designFiles || []);
    } catch (err) {
      setError('Failed to fetch design files.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFile = async (df) => {
    try {
      const res = await getDesignFileById(df.id);
      setSelectedFile(res.designFile);
      setVersions(res.versions || []);
      setReviews(res.reviews || []);
    } catch (err) {
      setError('Failed to fetch design file versions.');
    }
  };

  const handleUploadFileSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('project_ref', projectRef);
    formData.append('file', file);

    try {
      await uploadDesignFile(formData);
      setSuccess('Design file uploaded successfully.');
      setShowUploadModal(false);
      // Reset form
      setTitle('');
      setDescription('');
      setProjectRef('');
      setFile(null);
      fetchFiles();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload design file.');
    }
  };

  const handleUploadVersionSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!versionFile) {
      setError('Please select a version file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('notes', versionNotes);
    formData.append('file', versionFile);

    try {
      await uploadNewVersion(selectedFile.id, formData);
      setSuccess('New design version uploaded successfully.');
      setShowNewVersionModal(false);
      setVersionNotes('');
      setVersionFile(null);
      // Refresh current file details
      handleSelectFile(selectedFile);
      fetchFiles();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload new version.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Design Files Directory</h2>
          <p className="text-text-secondary text-sm mt-1">Upload CAD drawings, view version histories, and track engineering approvals.</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-accent-primary hover:opacity-90 text-white font-medium py-2 px-4 rounded-xl shadow-sm transition-all flex items-center gap-2"
        >
          <span>+</span> Upload Design File
        </button>
      </div>

      {error && <div className="p-3 bg-accent-danger/10 border border-accent-danger/30 rounded-xl text-accent-danger text-sm">{error}</div>}
      {success && <div className="p-3 bg-accent-success/10 border border-accent-success/30 rounded-xl text-accent-success text-sm">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Files Directory */}
        <div className="lg:col-span-2 bg-bg-card border border-border-color rounded-2xl overflow-hidden shadow-brand">
          {loading ? (
            <div className="p-8 text-center text-text-muted">Loading files...</div>
          ) : designFiles.length === 0 ? (
            <div className="p-8 text-center text-text-muted">No design files found. Upload one to get started.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-color bg-bg-secondary text-text-muted font-semibold text-xs uppercase tracking-wider">
                    <th className="p-4">Design Title</th>
                    <th className="p-4">Project Ref</th>
                    <th className="p-4">Latest Version</th>
                    <th className="p-4">Uploaded By</th>
                    <th className="p-4">Upload Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color text-sm">
                  {designFiles.map((df) => (
                    <tr
                      key={df.id}
                      onClick={() => handleSelectFile(df)}
                      className={`hover:bg-bg-hover cursor-pointer transition-colors ${
                        selectedFile?.id === df.id ? 'bg-bg-secondary' : ''
                      }`}
                    >
                      <td className="p-4 font-semibold text-text-primary">
                        <p>{df.title}</p>
                        <p className="text-xs text-text-muted font-normal max-w-xs truncate">{df.description || 'No description'}</p>
                      </td>
                      <td className="p-4 font-mono text-text-secondary">{df.project_ref || '—'}</td>
                      <td className="p-4 font-mono font-semibold text-accent-primary">v{df.latest_version}</td>
                      <td className="p-4 text-text-muted">{df.uploaded_by_name || 'System'}</td>
                      <td className="p-4 text-xs text-text-muted">{new Date(df.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected File Details */}
        <div className="bg-bg-card border border-border-color rounded-2xl p-6 shadow-brand h-fit space-y-6">
          {selectedFile ? (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedFile.title}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Ref: {selectedFile.project_ref || 'N/A'}</p>
                </div>
                <button
                  onClick={() => setShowNewVersionModal(true)}
                  className="bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 font-semibold py-1 px-2.5 rounded text-xs transition-all"
                >
                  + New Ver.
                </button>
              </div>

              {/* Versions list */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Version History</h4>
                <div className="space-y-2 max-h-[160px] overflow-y-auto">
                  {versions.map(v => (
                    <div key={v.id} className="p-2.5 bg-slate-900/40 border border-slate-800 rounded-lg flex justify-between items-center text-xs">
                      <div>
                        <span className="font-mono font-extrabold text-teal-400 mr-2">v{v.version_number}</span>
                        <span className="text-slate-400">{new Date(v.uploaded_at).toLocaleDateString()}</span>
                        {v.notes && <p className="text-[10px] text-slate-500 mt-0.5 italic">{v.notes}</p>}
                      </div>
                      <a
                        href={v.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-400 hover:underline font-semibold"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviews List */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Review Status</h4>
                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  {reviews.length === 0 ? (
                    <p className="text-slate-500 text-xs italic">No reviews submitted for this file.</p>
                  ) : (
                    reviews.map(r => (
                      <div key={r.id} className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="font-mono text-[10px] text-slate-400">Ver: v{r.version_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            r.status === 'Approved' ? 'bg-emerald-500/25 text-emerald-400' : 'bg-red-500/25 text-red-400'
                          }`}>
                            {r.status}
                          </span>
                        </div>
                        <p className="text-slate-300 italic">{r.remarks || 'No remarks.'}</p>
                        <p className="text-[10px] text-slate-500 text-right">By: {r.reviewer_name}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 italic text-sm">
              Select a design file to inspect version histories and review logs.
            </div>
          )}
        </div>
      </div>

      {/* UPLOAD FILE MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="border-b border-slate-700 p-4 bg-slate-900/50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white font-sans">Upload New Design File</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleUploadFileSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-sm">Design Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm"
                  placeholder="E.g., Component layout schematics"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-sm">Project Reference</label>
                <input
                  type="text"
                  value={projectRef}
                  onChange={(e) => setProjectRef(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm"
                  placeholder="E.g., PRJ-2026-X"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-sm">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm h-20"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-sm">Select File (PDF, PNG, JPG, DWG - Max 20MB)</label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
                  accept=".pdf,.png,.jpg,.jpeg,.dwg"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-white font-medium text-sm"
                >
                  Upload File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW VERSION MODAL */}
      {showNewVersionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="border-b border-slate-700 p-4 bg-slate-900/50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white font-sans">Upload New Version</h3>
              <button onClick={() => setShowNewVersionModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleUploadVersionSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-sm">Version Notes / Revision Remarks</label>
                <textarea
                  value={versionNotes}
                  onChange={(e) => setVersionNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm h-24"
                  placeholder="E.g., Added component dimensions, refined connectors"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-sm">Select Revision File (Max 20MB)</label>
                <input
                  type="file"
                  onChange={(e) => setVersionFile(e.target.files[0])}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
                  accept=".pdf,.png,.jpg,.jpeg,.dwg"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowNewVersionModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-white font-medium text-sm"
                >
                  Upload Version
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
