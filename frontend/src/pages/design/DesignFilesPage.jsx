import React, { useState, useEffect } from 'react';
import { FolderPlus, FileCode } from 'lucide-react';
import { getDesignFiles, uploadDesignFile, getDesignFileById, uploadNewVersion } from '../../api/designApi';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';

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
      handleSelectFile(selectedFile);
      fetchFiles();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload new version.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-300">
      <PageHeader
        title="Design Files Directory"
        description="Upload CAD drawings, view version histories, and track engineering approvals."
        actions={
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center justify-center rounded-xl bg-accent-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-colors"
          >
            + Upload Design File
          </button>
        }
      />

      {error && <div className="mb-6 p-4 bg-accent-danger/10 border border-accent-danger/30 rounded-2xl text-accent-danger text-sm">{error}</div>}
      {success && <div className="mb-6 p-4 bg-accent-success/10 border border-accent-success/30 rounded-2xl text-accent-success text-sm">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Files Directory Left Panel */}
        <div className="lg:col-span-2 min-w-0 bg-bg-card border border-border-color rounded-2xl overflow-hidden shadow-brand">
          {loading ? (
            <div className="p-12 text-center text-text-muted text-sm">Loading design files...</div>
          ) : designFiles.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={FolderPlus}
                title="No Design Files Found"
                description="Upload CAD schematics, engineering drawings, or PDFs to begin version control and review workflows."
                actionLabel="Upload Design File"
                onAction={() => setShowUploadModal(true)}
              />
            </div>
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
                        selectedFile?.id === df.id ? 'bg-bg-secondary font-semibold' : ''
                      }`}
                    >
                      <td className="p-4 font-semibold text-text-primary">
                        <p>{df.title}</p>
                        <p className="text-xs text-text-muted font-normal max-w-xs truncate">{df.description || 'No description'}</p>
                      </td>
                      <td className="p-4 font-mono text-text-secondary">{df.project_ref || '—'}</td>
                      <td className="p-4 font-mono font-semibold text-accent-primary">v{df.latest_version}</td>
                      <td className="p-4 text-text-muted text-xs">{df.uploaded_by_name || 'System'}</td>
                      <td className="p-4 text-xs text-text-muted">{new Date(df.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected File Details Right Panel */}
        <div className="min-w-0 bg-bg-card border border-border-color rounded-2xl p-6 shadow-brand h-fit space-y-6">
          {selectedFile ? (
            <div className="space-y-6">
              <div className="flex justify-between items-start gap-2">
                <div className="truncate">
                  <h3 className="text-lg font-bold text-text-primary truncate">{selectedFile.title}</h3>
                  <p className="text-xs text-text-muted font-mono mt-0.5">Ref: {selectedFile.project_ref || 'N/A'}</p>
                </div>
                <button
                  onClick={() => setShowNewVersionModal(true)}
                  className="bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary border border-accent-primary/30 font-semibold py-1.5 px-3 rounded-xl text-xs transition-all shrink-0"
                >
                  + New Ver.
                </button>
              </div>

              {/* Versions list */}
              <div>
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Version History</h4>
                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  {versions.map(v => (
                    <div key={v.id} className="p-3 bg-bg-secondary border border-border-color rounded-xl flex justify-between items-center text-xs">
                      <div className="truncate pr-2">
                        <span className="font-mono font-extrabold text-accent-primary mr-2">v{v.version_number}</span>
                        <span className="text-text-muted">{new Date(v.uploaded_at).toLocaleDateString()}</span>
                        {v.notes && <p className="text-[11px] text-text-secondary mt-0.5 italic truncate">{v.notes}</p>}
                      </div>
                      <a
                        href={v.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent-primary hover:underline font-semibold shrink-0"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviews List */}
              <div>
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Review Status</h4>
                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  {reviews.length === 0 ? (
                    <p className="text-text-muted text-xs italic">No reviews submitted for this file.</p>
                  ) : (
                    reviews.map(r => (
                      <div key={r.id} className="p-3 bg-bg-secondary border border-border-color rounded-xl text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[10px] text-text-muted">Ver: v{r.version_number}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'Approved' ? 'bg-accent-success/15 text-accent-success border border-accent-success/30' : 'bg-accent-danger/15 text-accent-danger border border-accent-danger/30'
                          }`}>
                            {r.status}
                          </span>
                        </div>
                        <p className="text-text-primary italic">{r.remarks || 'No remarks.'}</p>
                        <p className="text-[10px] text-text-muted text-right">By: {r.reviewer_name}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <EmptyState
                icon={FileCode}
                title="No File Selected"
                description="Select a design file from the directory table on the left to inspect version history, download drawings, and view review logs."
              />
            </div>
          )}
        </div>
      </div>

      {/* UPLOAD FILE MODAL */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload New Design File"
        size="md"
      >
        <form onSubmit={handleUploadFileSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Design Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-bg-secondary border border-border-color rounded-xl p-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-primary"
              placeholder="E.g., Component layout schematics"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Project Reference</label>
            <input
              type="text"
              value={projectRef}
              onChange={(e) => setProjectRef(e.target.value)}
              className="w-full bg-bg-secondary border border-border-color rounded-xl p-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-primary"
              placeholder="E.g., PRJ-2026-X"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-bg-secondary border border-border-color rounded-xl p-2.5 text-text-primary text-sm h-20 focus:outline-none focus:border-accent-primary"
              placeholder="Engineering file details..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Select File (PDF, PNG, JPG, DWG - Max 20MB) *</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full bg-bg-secondary border border-border-color rounded-xl p-2 text-text-primary text-xs focus:outline-none focus:border-accent-primary"
              accept=".pdf,.png,.jpg,.jpeg,.dwg"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setShowUploadModal(false)}
              className="px-4 py-2 bg-bg-secondary border border-border-color hover:bg-bg-hover rounded-xl text-text-secondary text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-accent-primary hover:opacity-90 rounded-xl text-white font-semibold text-sm shadow-sm"
            >
              Upload File
            </button>
          </div>
        </form>
      </Modal>

      {/* NEW VERSION MODAL */}
      <Modal
        isOpen={showNewVersionModal}
        onClose={() => setShowNewVersionModal(false)}
        title="Upload New Version"
        size="md"
      >
        <form onSubmit={handleUploadVersionSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Version Notes / Revision Remarks *</label>
            <textarea
              value={versionNotes}
              onChange={(e) => setVersionNotes(e.target.value)}
              className="w-full bg-bg-secondary border border-border-color rounded-xl p-2.5 text-text-primary text-sm h-24 focus:outline-none focus:border-accent-primary"
              placeholder="E.g., Added component dimensions, refined connectors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Select Revision File (Max 20MB) *</label>
            <input
              type="file"
              onChange={(e) => setVersionFile(e.target.files[0])}
              className="w-full bg-bg-secondary border border-border-color rounded-xl p-2 text-text-primary text-xs focus:outline-none focus:border-accent-primary"
              accept=".pdf,.png,.jpg,.jpeg,.dwg"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setShowNewVersionModal(false)}
              className="px-4 py-2 bg-bg-secondary border border-border-color hover:bg-bg-hover rounded-xl text-text-secondary text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-accent-primary hover:opacity-90 rounded-xl text-white font-semibold text-sm shadow-sm"
            >
              Upload Version
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
