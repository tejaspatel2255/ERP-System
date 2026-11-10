import React, { useState, useEffect, useMemo } from 'react';
import { FolderPlus, FileCode, RefreshCw, Search, CheckCircle2, XCircle, Clock, FileText } from 'lucide-react';
import { getDesignFiles, uploadDesignFile, getDesignFileById, uploadNewVersion } from '../../api/designApi';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../utils/formatDate';

export default function DesignFilesPage() {
  const [designFiles, setDesignFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [versionUploading, setVersionUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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
      const files = res.designFiles || [];
      setDesignFiles(files);
      if (selectedFile) {
        const updated = files.find(f => f.id === selectedFile.id);
        if (updated) setSelectedFile(prev => ({ ...prev, ...updated }));
      }
    } catch (err) {
      setError('Failed to fetch design files.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFile = async (df) => {
    try {
      setSelectedFile(df);
      const res = await getDesignFileById(df.id);
      setSelectedFile({ ...df, ...(res.designFile || {}) });
      setVersions(res.versions || []);
      setReviews(res.reviews || []);
    } catch (err) {
      setError('Failed to fetch design file versions.');
    }
  };

  // Status counts
  const counts = useMemo(() => {
    const res = { all: designFiles.length, approved: 0, rejected: 0, pending: 0 };
    designFiles.forEach((df) => {
      const s = (df.latest_status || 'pending').toLowerCase();
      if (s === 'approved') res.approved++;
      else if (s === 'rejected' || s === 'changes requested') res.rejected++;
      else res.pending++;
    });
    return res;
  }, [designFiles]);

  // Filtered files by search & status
  const filteredFiles = useMemo(() => {
    return designFiles.filter((df) => {
      const matchesSearch =
        !searchQuery ||
        df.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        df.project_ref?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        df.description?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      const s = (df.latest_status || 'pending').toLowerCase();
      if (statusFilter === 'all') return true;
      if (statusFilter === 'approved') return s === 'approved';
      if (statusFilter === 'rejected') return s === 'rejected' || s === 'changes requested';
      if (statusFilter === 'pending') return s === 'pending' || !df.latest_status;
      return true;
    });
  }, [designFiles, searchQuery, statusFilter]);

  const handleUploadFileSubmit = async (e) => {
    e.preventDefault();
    if (uploading) return;
    setError('');
    setSuccess('');

    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setUploading(true);
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
      await fetchFiles();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload design file.');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadVersionSubmit = async (e) => {
    e.preventDefault();
    if (versionUploading) return;
    setError('');
    setSuccess('');

    if (!versionFile) {
      setError('Please select a version file to upload.');
      return;
    }

    setVersionUploading(true);
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
      await fetchFiles();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload new version.');
    } finally {
      setVersionUploading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Design Files Directory"
        description="Upload CAD drawings, view version histories, and track engineering approvals."
        actions={
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-primary"
          >
            + Upload Design File
          </button>
        }
      />

      {error && <div className="rounded-md border px-3 py-2 text-sm border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]">{error}</div>}
      {success && <div className="rounded-md border px-3 py-2 text-sm border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]">{success}</div>}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`btn btn-xs ${statusFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('approved')}
            className={`btn btn-xs inline-flex items-center gap-1.5 ${
              statusFilter === 'approved' ? 'btn-primary' : 'btn-ghost'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>Approved ({counts.approved})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('rejected')}
            className={`btn btn-xs inline-flex items-center gap-1.5 ${
              statusFilter === 'rejected' ? 'btn-primary' : 'btn-ghost'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <span>Rejected ({counts.rejected})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`btn btn-xs inline-flex items-center gap-1.5 ${
              statusFilter === 'pending' ? 'btn-primary' : 'btn-ghost'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span>Pending ({counts.pending})</span>
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, ref, details..."
            className="field pl-8 py-1.5 text-xs w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Files Directory Left Panel */}
        <div className="lg:col-span-2 min-w-0 sheet overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-text-muted text-sm">Loading design files...</div>
          ) : filteredFiles.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={FolderPlus}
                title="No Design Files Found"
                description={
                  searchQuery || statusFilter !== 'all'
                    ? 'No design files match the selected filter or search keyword.'
                    : 'Upload CAD schematics, engineering drawings, or PDFs to begin version control and review workflows.'
                }
                actionLabel={searchQuery || statusFilter !== 'all' ? undefined : 'Upload Design File'}
                onAction={searchQuery || statusFilter !== 'all' ? undefined : () => setShowUploadModal(true)}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="bom w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="p-3">Design Title</th>
                    <th className="p-3">Project Ref</th>
                    <th className="p-3 text-center">Version</th>
                    <th className="p-3">Review Status</th>
                    <th className="p-3">Uploaded By</th>
                    <th className="p-3">Upload Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color text-sm">
                  {filteredFiles.map((df) => (
                    <tr
                      key={df.id}
                      onClick={() => handleSelectFile(df)}
                      className={`bom-row cursor-pointer transition-colors ${
                        selectedFile?.id === df.id ? 'bg-bg-subtle font-semibold' : ''
                      }`}
                    >
                      <td className="p-3 font-semibold text-text-primary">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-accent-primary shrink-0" />
                          <p>{df.title}</p>
                        </div>
                        <p className="text-xs text-text-muted font-normal max-w-xs truncate ml-6">
                          {df.description || 'No description'}
                        </p>
                      </td>
                      <td className="p-3 font-mono text-text-secondary">
                        {df.project_ref ? <span className="stamp">{df.project_ref}</span> : '—'}
                      </td>
                      <td className="p-3 font-mono font-semibold text-accent-primary text-center">
                        <span className="tb-cell">v{df.latest_version}</span>
                      </td>
                      <td className="p-3">
                        <StatusBadge
                          status={df.latest_status || 'Pending'}
                          label={df.latest_status || 'Pending Review'}
                        />
                      </td>
                      <td className="p-3 text-text-muted text-xs">{df.uploaded_by_name || 'System'}</td>
                      <td className="p-3 text-xs text-text-muted tabular-nums">{formatDate(df.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected File Details Right Panel */}
        <div className="min-w-0 sheet p-5 h-fit space-y-5">
          {selectedFile ? (
            <div className="space-y-5">
              <div className="flex justify-between items-start gap-2 border-b border-border-color pb-3">
                <div className="truncate">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-text-primary truncate">{selectedFile.title}</h3>
                    <StatusBadge
                      status={selectedFile.latest_status || 'Pending'}
                      label={selectedFile.latest_status || 'Pending Review'}
                    />
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    Ref: {selectedFile.project_ref ? <span className="stamp">{selectedFile.project_ref}</span> : 'N/A'}
                  </p>
                </div>
                <button
                  onClick={() => setShowNewVersionModal(true)}
                  className="btn-secondary btn-xs shrink-0"
                >
                  + New Ver.
                </button>
              </div>

              {/* Versions list */}
              <div>
                <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Version History</h4>
                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  {versions.map(v => (
                    <div key={v.id} className="p-2.5 bg-bg-subtle border border-border-color rounded flex justify-between items-center text-xs">
                      <div className="truncate pr-2">
                        <span className="tb-cell mr-2">v{v.version_number}</span>
                        <span className="text-text-muted tabular-nums">{formatDate(v.uploaded_at)}</span>
                        {v.notes && <p className="text-xs text-text-secondary mt-0.5 italic truncate">{v.notes}</p>}
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
                <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Review Status</h4>
                <div className="space-y-2 max-h-[220px] overflow-y-auto">
                  {reviews.length === 0 ? (
                    <div className="p-3 bg-bg-subtle border border-border-color rounded text-xs flex items-center justify-between">
                      <span className="text-text-muted italic">Awaiting engineering review</span>
                      <StatusBadge status="Pending" label="Pending Review" />
                    </div>
                  ) : (
                    reviews.map(r => (
                      <div key={r.id} className="p-3 bg-bg-subtle border border-border-color rounded text-xs space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="tb-cell font-bold">v{r.version_number}</span>
                          <StatusBadge status={r.status} />
                        </div>
                        <p className="text-text-primary italic leading-relaxed">{r.remarks || 'No remarks provided.'}</p>
                        <div className="flex justify-between items-center text-[11px] text-text-muted pt-1 border-t border-border-color/40">
                          <span>Reviewed by <strong className="text-text-secondary">{r.reviewer_name || 'System'}</strong></span>
                          <span className="tabular-nums">{formatDate(r.review_date)}</span>
                        </div>
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
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Design Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="field"
              placeholder="E.g., Component layout schematics"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Project Reference</label>
            <input
              type="text"
              value={projectRef}
              onChange={(e) => setProjectRef(e.target.value)}
              className="field"
              placeholder="E.g., PRJ-2026-X"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="field h-20"
              placeholder="Engineering file details..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Select File (PDF, PNG, JPG, DWG - Max 20MB) *</label>
            <div className="rounded border border-dashed border-border-color bg-bg-subtle p-3 text-center">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                className="w-full text-xs text-text-primary focus:outline-none file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-bg-card file:text-text-primary hover:file:bg-bg-hover"
                accept=".pdf,.png,.jpg,.jpeg,.dwg"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setShowUploadModal(false)}
              className="btn btn-secondary"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="btn btn-primary inline-flex items-center gap-1.5"
            >
              {uploading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{uploading ? 'Uploading File...' : 'Upload File'}</span>
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
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Version Notes / Revision Remarks *</label>
            <textarea
              value={versionNotes}
              onChange={(e) => setVersionNotes(e.target.value)}
              className="field h-24"
              placeholder="E.g., Added component dimensions, refined connectors"
              required
              disabled={versionUploading}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Select Revision File (Max 20MB) *</label>
            <div className="rounded border border-dashed border-border-color bg-bg-subtle p-3 text-center">
              <input
                type="file"
                onChange={(e) => setVersionFile(e.target.files[0])}
                className="w-full text-xs text-text-primary focus:outline-none file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-bg-card file:text-text-primary hover:file:bg-bg-hover"
                accept=".pdf,.png,.jpg,.jpeg,.dwg"
                required
                disabled={versionUploading}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setShowNewVersionModal(false)}
              className="btn btn-secondary"
              disabled={versionUploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={versionUploading}
              className="btn btn-primary inline-flex items-center gap-1.5"
            >
              {versionUploading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{versionUploading ? 'Uploading Version...' : 'Upload Version'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}