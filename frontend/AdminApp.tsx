import React, { useEffect, useMemo, useState } from "react";
import { useAuth, useBackend } from "./components/AuthProvider";
import LoginForm from "./components/LoginForm";
import ConfirmDialog from "./components/ConfirmDialog";
import ValidationMessage from "./components/ValidationMessage";

// ----------------------------- Utilities -----------------------------
async function uploadToPresignedURL(url: string, file: File) {
  const res = await fetch(url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
}

function cx(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

async function safeCopyToClipboard(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// ----------------------------- UI Primitives -----------------------------
function Button({ children, className, variant = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const baseClasses = "px-4 py-2 rounded-2xl border shadow-sm disabled:opacity-50";
  const variantClasses = {
    primary: "border-zinc-200 bg-zinc-900 text-white hover:bg-zinc-800",
    secondary: "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50",
    danger: "border-red-200 bg-red-600 text-white hover:bg-red-700",
  };

  return (
    <button
      className={cx(baseClasses, variantClasses[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-xl border border-zinc-300 px-3 py-2",
        "focus:outline-none focus:ring-2 focus:ring-zinc-900",
        props.className
      )}
    />
  );
}

function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cx(
        "w-full rounded-xl border border-zinc-300 px-3 py-2 bg-white",
        "focus:outline-none focus:ring-2 focus:ring-zinc-900",
        className
      )}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cx(
        "w-full rounded-xl border border-zinc-300 px-3 py-2",
        "focus:outline-none focus:ring-2 focus:ring-zinc-900",
        props.className
      )}
    />
  );
}

function Card({ title, desc, children, right }: { title: string; desc?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-zinc-100">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
          {desc && <p className="text-sm text-zinc-500 mt-1">{desc}</p>}
        </div>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-xs">{children}</span>;
}

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-zinc-100">
          <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 text-xl leading-none"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// ----------------------------- Types -----------------------------
interface AdminDoc {
  id: string;
  title: string;
  version: string;
  doc_type: string;
  region?: string;
  platform?: string;
  tags: string[];
  status: string;
  s3_key: string;
  created_at: string;
  updated_at: string;
}

interface Submission {
  id: string;
  writer_name: string;
  writer_email: string;
  script_title: string;
  format: "feature" | "series" | "youtube_movie";
  draft_version: "1st" | "2nd" | "3rd";
  genre?: string;
  region?: string;
  platform?: string;
  status: "queued" | "processing" | "completed" | "failed";
  file_s3Key?: string;
  created_at: string;
}

interface ReportRecord {
  submission_id: string;
  overall_score?: number;
  report_json?: any;
  created_at?: string;
  updated_at?: string;
}

// ----------------------------- Edit Doc Modal -----------------------------
function EditDocModal({ doc, isOpen, onClose, onSave }: { 
  doc: AdminDoc | null; 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: () => void; 
}) {
  const [title, setTitle] = useState("");
  const [version, setVersion] = useState("");
  const [docType, setDocType] = useState("");
  const [region, setRegion] = useState("");
  const [platform, setPlatform] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backend = useBackend();

  useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      setVersion(doc.version);
      setDocType(doc.doc_type);
      setRegion(doc.region || "");
      setPlatform(doc.platform || "");
      setTags((doc.tags || []).join(", "));
      setStatus(doc.status);
    }
  }, [doc]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!doc) return;
    
    setError(null);
    setBusy(true);
    
    try {
      await backend.admin.updateDoc({
        id: doc.id,
        title,
        version,
        doc_type: docType as any,
        region: region || undefined,
        platform: platform || undefined,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        status: status as any,
      });
      
      onSave();
      onClose();
    } catch (e: any) {
      console.error("Update error:", e);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Document">
      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="edit-title" className="block text-sm text-zinc-600 mb-1">Title</label>
          <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="edit-version" className="block text-sm text-zinc-600 mb-1">Version</label>
          <Input id="edit-version" value={version} onChange={(e) => setVersion(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="edit-doc-type" className="block text-sm text-zinc-600 mb-1">Doc Type</label>
          <Select id="edit-doc-type" value={docType} onChange={(e) => setDocType(e.target.value)}>
            <option value="rubric">Rubric</option>
            <option value="style">Style</option>
            <option value="platform">Platform</option>
            <option value="legal">Legal</option>
            <option value="playbook">Playbook</option>
            <option value="other">Other</option>
          </Select>
        </div>
        <div>
          <label htmlFor="edit-status" className="block text-sm text-zinc-600 mb-1">Status</label>
          <Select id="edit-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="experimental">Experimental</option>
          </Select>
        </div>
        <div>
          <label htmlFor="edit-region" className="block text-sm text-zinc-600 mb-1">Region</label>
          <Select id="edit-region" value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">None</option>
            <option value="NG">NG</option>
            <option value="GLOBAL">GLOBAL</option>
            <option value="KE">KE</option>
            <option value="GH">GH</option>
            <option value="ZA">ZA</option>
          </Select>
        </div>
        <div>
          <label htmlFor="edit-platform" className="block text-sm text-zinc-600 mb-1">Platform</label>
          <Select id="edit-platform" value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="">None</option>
            <option value="YouTube">YouTube</option>
            <option value="Cinema">Cinema</option>
            <option value="VOD">VOD</option>
            <option value="TV">TV</option>
          </Select>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="edit-tags" className="block text-sm text-zinc-600 mb-1">Tags (comma-separated)</label>
          <Input id="edit-tags" value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>
        <div className="md:col-span-2 flex items-center gap-3">
          <Button disabled={busy}>{busy ? "Saving…" : "Save Changes"}</Button>
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          {error && <ValidationMessage type="error" message={error} />}
        </div>
      </form>
    </Modal>
  );
}

// ----------------------------- Docs Tab -----------------------------
function DocsTab() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [version, setVersion] = useState("1.0");
  const [docType, setDocType] = useState("rubric");
  const [region, setRegion] = useState("NG");
  const [platform, setPlatform] = useState("YouTube");
  const [tags, setTags] = useState("Nollywood,YouTube");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docs, setDocs] = useState<AdminDoc[]>([]);
  const [editingDoc, setEditingDoc] = useState<AdminDoc | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AdminDoc | null>(null);
  const backend = useBackend();

  async function loadDocs() {
    try {
      const res = await backend.admin.listDocs();
      setDocs(res.items);
    } catch (e: any) {
      console.error("Failed to load docs:", e);
      setError(e.message);
    }
  }

  useEffect(() => {
    loadDocs();
  }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) return setError("Please choose a file.");
    if (file.size > 20 * 1024 * 1024) return setError("File too large (20 MB max).");
    setBusy(true);
    try {
      const presign = await backend.admin.presignDoc({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
        title,
        version,
        doc_type: docType as any,
        region: region as any,
        platform: platform as any,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });

      await uploadToPresignedURL(presign.uploadUrl, file);

      await backend.admin.completeDoc({ docId: presign.docId });

      await loadDocs();
      setFile(null);
      setTitle("");
      setVersion("1.0");
      setTags("Nollywood,YouTube");
    } catch (e: any) {
      console.error("Upload error:", e);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(doc: AdminDoc) {
    try {
      await backend.admin.deleteDoc({ id: doc.id });
      await loadDocs();
      setConfirmDelete(null);
    } catch (e: any) {
      console.error("Delete error:", e);
      setError(e.message);
    }
  }

  function handleEdit(doc: AdminDoc) {
    setEditingDoc(doc);
    setShowEditModal(true);
  }

  function handleEditSave() {
    loadDocs();
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card title="Upload Documentation" desc="Guidelines, rubrics, platform notes. Versioned & vectorized on complete.">
        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="doc-title" className="block text-sm text-zinc-600 mb-1">Title</label>
            <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Feature Rubric v3.1 (NG)" required />
          </div>
          <div>
            <label htmlFor="doc-version" className="block text-sm text-zinc-600 mb-1">Version</label>
            <Input id="doc-version" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="3.1" required />
          </div>
          <div>
            <label htmlFor="doc-type" className="block text-sm text-zinc-600 mb-1">Doc Type</label>
            <Select id="doc-type" value={docType} onChange={(e) => setDocType(e.target.value)}>
              <option value="rubric">Rubric</option>
              <option value="style">Style</option>
              <option value="platform">Platform</option>
              <option value="legal">Legal</option>
              <option value="playbook">Playbook</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div>
            <label htmlFor="doc-region" className="block text-sm text-zinc-600 mb-1">Region</label>
            <Select id="doc-region" value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="NG">NG</option>
              <option value="GLOBAL">GLOBAL</option>
              <option value="KE">KE</option>
              <option value="GH">GH</option>
              <option value="ZA">ZA</option>
            </Select>
          </div>
          <div>
            <label htmlFor="doc-platform" className="block text-sm text-zinc-600 mb-1">Platform</label>
            <Select id="doc-platform" value={platform} onChange={(e) => setPlatform(e.target.value)}>
              <option value="YouTube">YouTube</option>
              <option value="Cinema">Cinema</option>
              <option value="VOD">VOD</option>
              <option value="TV">TV</option>
            </Select>
          </div>
          <div>
            <label htmlFor="doc-tags" className="block text-sm text-zinc-600 mb-1">Tags (comma-separated)</label>
            <Input id="doc-tags" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="doc-file" className="block text-sm text-zinc-600 mb-1">File</label>
            <Input id="doc-file" type="file" accept=".pdf,.docx,.md,.txt" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <Button disabled={busy}>{busy ? "Uploading…" : "Upload & Vectorize"}</Button>
            {error && <ValidationMessage type="error" message={error} />}
          </div>
        </form>
      </Card>

      <Card title="Documentation" desc="Active & experimental docs">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-600">
                <th className="py-2">Title</th>
                <th className="py-2">Version</th>
                <th className="py-2">Type</th>
                <th className="py-2">Region</th>
                <th className="py-2">Platform</th>
                <th className="py-2">Tags</th>
                <th className="py-2">Status</th>
                <th className="py-2">Updated</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="py-2">{d.title}</td>
                  <td className="py-2">{d.version}</td>
                  <td className="py-2">{d.doc_type}</td>
                  <td className="py-2">{d.region || "—"}</td>
                  <td className="py-2">{d.platform || "—"}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {(d.tags || []).map((t) => (
                        <Tag key={t}>{t}</Tag>
                      ))}
                    </div>
                  </td>
                  <td className="py-2">
                    <Tag>{d.status}</Tag>
                  </td>
                  <td className="py-2">{new Date(d.updated_at).toLocaleString()}</td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        className="px-2 py-1 text-xs"
                        onClick={() => handleEdit(d)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        className="px-2 py-1 text-xs"
                        onClick={() => setConfirmDelete(d)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {docs.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-zinc-500">
                    No docs yet. Upload above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <EditDocModal
        doc={editingDoc}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingDoc(null);
        }}
        onSave={handleEditSave}
      />

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        title="Delete Document"
        message={`Are you sure you want to delete "${confirmDelete?.title}"? This action cannot be undone and will remove all associated chunks.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}

// ----------------------------- Submissions Tab -----------------------------
function SubmissionsTab() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: "",
    writer_email: "",
    region: "",
    platform: "",
    from_date: "",
    to_date: "",
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const backend = useBackend();

  async function loadSubmissions() {
    try {
      setError(null);
      setLoading(true);
      
      const params: any = {
        limit: pageSize,
        offset: page * pageSize,
      };

      // Add filters
      if (filters.status) params.status = filters.status;
      if (filters.writer_email) params.writer_email = filters.writer_email;
      if (filters.region) params.region = filters.region;
      if (filters.platform) params.platform = filters.platform;
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date) params.to_date = filters.to_date;

      const response = await backend.submissions.listAdminSubmissions(params);
      setSubmissions(response.items);
      setTotal(response.total);
    } catch (e: any) {
      console.error("Failed to load submissions:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubmissions();
  }, [page, filters]);

  function handleFilterChange(key: string, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0); // Reset to first page when filtering
  }

  async function viewReport(submissionId: string) {
    try {
      const report = await backend.review.getReport({ submissionId });
      // In production, open in modal or new tab
      console.log("Report:", report);
      alert(`Report loaded for submission ${submissionId}. Check console for details.`);
    } catch (e: any) {
      console.error("Failed to load report:", e);
      alert("Report not ready yet or failed to load");
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card title="All Submissions" desc={`${total} total submissions`}>
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div>
            <label htmlFor="filter-status" className="block text-sm text-zinc-600 mb-1">Status</label>
            <Select
              id="filter-status"
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              <option value="">All</option>
              <option value="queued">Queued</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </Select>
          </div>
          <div>
            <label htmlFor="filter-email" className="block text-sm text-zinc-600 mb-1">Writer Email</label>
            <Input
              id="filter-email"
              value={filters.writer_email}
              onChange={(e) => handleFilterChange("writer_email", e.target.value)}
              placeholder="Search email..."
            />
          </div>
          <div>
            <label htmlFor="filter-region" className="block text-sm text-zinc-600 mb-1">Region</label>
            <Select
              id="filter-region"
              value={filters.region}
              onChange={(e) => handleFilterChange("region", e.target.value)}
            >
              <option value="">All</option>
              <option value="NG">NG</option>
              <option value="KE">KE</option>
              <option value="GH">GH</option>
              <option value="ZA">ZA</option>
              <option value="GLOBAL">GLOBAL</option>
            </Select>
          </div>
          <div>
            <label htmlFor="filter-platform" className="block text-sm text-zinc-600 mb-1">Platform</label>
            <Select
              id="filter-platform"
              value={filters.platform}
              onChange={(e) => handleFilterChange("platform", e.target.value)}
            >
              <option value="">All</option>
              <option value="YouTube">YouTube</option>
              <option value="Cinema">Cinema</option>
              <option value="VOD">VOD</option>
              <option value="TV">TV</option>
            </Select>
          </div>
          <div>
            <label htmlFor="filter-from" className="block text-sm text-zinc-600 mb-1">From Date</label>
            <Input
              id="filter-from"
              type="date"
              value={filters.from_date}
              onChange={(e) => handleFilterChange("from_date", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="filter-to" className="block text-sm text-zinc-600 mb-1">To Date</label>
            <Input
              id="filter-to"
              type="date"
              value={filters.to_date}
              onChange={(e) => handleFilterChange("to_date", e.target.value)}
            />
          </div>
        </div>

        {error && <ValidationMessage type="error" message={error} className="mb-4" />}

        {loading ? (
          <div className="text-center py-8">
            <p className="text-zinc-600">Loading submissions...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-zinc-600 border-b">
                    <th className="py-3">Writer</th>
                    <th className="py-3">Script Title</th>
                    <th className="py-3">Format</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Region</th>
                    <th className="py-3">Submitted</th>
                    <th className="py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => (
                    <tr key={submission.id} className="border-b border-zinc-100">
                      <td className="py-3">
                        <div>
                          <p className="font-medium">{submission.writer_name}</p>
                          <p className="text-xs text-zinc-500">{submission.writer_email}</p>
                        </div>
                      </td>
                      <td className="py-3">
                        <div>
                          <p className="font-medium">{submission.script_title}</p>
                          <p className="text-xs text-zinc-500">
                            {submission.draft_version} • {submission.genre}
                          </p>
                        </div>
                      </td>
                      <td className="py-3">
                        <Tag>{submission.format}</Tag>
                      </td>
                      <td className="py-3">
                        <Tag>{submission.status}</Tag>
                      </td>
                      <td className="py-3">{submission.region || "—"}</td>
                      <td className="py-3">{new Date(submission.created_at).toLocaleDateString()}</td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          {submission.status === "completed" && (
                            <Button
                              variant="primary"
                              className="px-3 py-1 text-xs"
                              onClick={() => viewReport(submission.id)}
                            >
                              View Report
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            className="px-3 py-1 text-xs"
                            onClick={async () => {
                              const ok = await safeCopyToClipboard(submission.id);
                              if (!ok) alert('Copy failed');
                            }}
                          >
                            Copy ID
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-zinc-600">
                  Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total} submissions
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1 text-sm"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1 text-sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

// ----------------------------- Reports Tab -----------------------------
function ReportsTab() {
  const [submissionId, setSubmissionId] = useState("");
  const [report, setReport] = useState<ReportRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editorNotes, setEditorNotes] = useState("");
  const backend = useBackend();

  async function fetchReport(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await backend.review.getReport({ submissionId });
      setReport(r);
    } catch (e: any) {
      console.error("Failed to fetch report:", e);
      setError(e.message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  const retentionInfo = useMemo(() => {
    if (!report?.created_at) return null;
    const created = new Date(report.created_at).getTime();
    const days80 = 80 * 24 * 60 * 60 * 1000;
    const remainingMs = created + days80 - Date.now();
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
    return remainingDays;
  }, [report?.created_at]);

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card title="Find Report" desc="Enter Submission ID to view the latest report">
        <form onSubmit={fetchReport} className="flex gap-3 max-w-2xl">
          <Input 
            placeholder="submission-id" 
            value={submissionId} 
            onChange={(e) => setSubmissionId(e.target.value)} 
            required 
            aria-label="Submission ID"
          />
          <Button disabled={loading}>{loading ? "Loading..." : "Load"}</Button>
        </form>
        {error && <ValidationMessage type="error" message={error} className="mt-2" />}
      </Card>

      {report && (
        <Card
          title={`Report for ${report.submission_id}`}
          desc={typeof report.overall_score === "number" ? `Overall Score: ${report.overall_score.toFixed(1)}` : "Report JSON loaded"}
          right={retentionInfo !== null ? <Tag>{retentionInfo} days to auto‑purge</Tag> : undefined}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Readable View</h4>
              {report.report_json ? <ReadableReport report={report.report_json} /> : <p className="text-zinc-500">No formatted report in payload.</p>}
            </div>
            <div>
              <h4 className="font-semibold mb-2">Raw JSON</h4>
              <pre className="bg-zinc-50 p-3 rounded-xl overflow-auto text-xs max-h-[420px]">{JSON.stringify(report, null, 2)}</pre>
            </div>
          </div>

          <div className="mt-6 border-t pt-4">
            <h4 className="font-semibold mb-2">Human Reviewer Notes (local draft)</h4>
            <Textarea 
              rows={5} 
              placeholder="Edit or supplement recommendations… (wire to a PATCH /reports/:id later)" 
              value={editorNotes} 
              onChange={(e) => setEditorNotes(e.target.value)}
              aria-label="Editor notes"
            />
            <div className="mt-3 flex gap-2">
              <Button onClick={async () => {
                const ok = await safeCopyToClipboard(editorNotes || "");
                if (!ok) alert('Copy failed. Select the text and press Ctrl/Cmd+C.');
              }}>Copy Notes</Button>
              <Button variant="secondary" onClick={() => setEditorNotes("")}>Clear</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function ReadableReport({ report }: { report: any }) {
  const buckets: { name: string; score: number }[] = report?.buckets || [];
  const strengths: string[] = report?.highlights || [];
  const risks: string[] = report?.risks || [];
  const plan: { description: string; priority: string }[] = report?.action_plan || [];

  return (
    <div className="space-y-6">
      <section>
        <h5 className="text-sm font-semibold text-zinc-700">Buckets</h5>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {buckets.map((b) => (
            <div key={b.name} className="rounded-xl border p-3 flex items-center justify-between">
              <span>{b.name}</span>
              <span className="font-semibold">{b.score.toFixed(1)}</span>
            </div>
          ))}
          {buckets.length === 0 && <p className="text-zinc-500">No bucket scores available.</p>}
        </div>
      </section>

      <section>
        <h5 className="text-sm font-semibold text-zinc-700">Strengths</h5>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          {strengths.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
          {strengths.length === 0 && <p className="text-zinc-500">—</p>}
        </ul>
      </section>

      <section>
        <h5 className="text-sm font-semibold text-zinc-700">Key Risks</h5>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          {risks.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
          {risks.length === 0 && <p className="text-zinc-500">—</p>}
        </ul>
      </section>

      <section>
        <h5 className="text-sm font-semibold text-zinc-700">Prioritized Action Plan</h5>
        <div className="space-y-2 mt-2">
          {plan.map((p, i) => (
            <div key={i} className="rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <span>{p.description}</span>
                <Tag>{p.priority.toUpperCase()}</Tag>
              </div>
            </div>
          ))}
          {plan.length === 0 && <p className="text-zinc-500">—</p>}
        </div>
      </section>
    </div>
  );
}

// ----------------------------- Shell -----------------------------
function Tabs({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const tabs = [
    { id: "docs", label: "Docs" },
    { id: "submissions", label: "Submissions" },
    { id: "reports", label: "Reports" },
  ];
  return (
    <div className="flex gap-2 bg-zinc-100 p-1 rounded-2xl w-fit">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cx(
            "px-4 py-1.5 rounded-2xl text-sm",
            value === t.id ? "bg-white shadow-sm" : "text-zinc-600 hover:text-zinc-900"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export default function AdminApp() {
  const [tab, setTab] = useState("docs");
  const { user, logout } = useAuth();

  // Check if user has admin access
  if (!user || !['admin', 'editor', 'viewer'].includes(user.role)) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">Admin Access Required</h1>
            <p className="text-zinc-600 mt-2">Please sign in with an admin account</p>
          </div>
          <LoginForm showRegister={false} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Script Review Admin</h1>
            <p className="text-xs text-zinc-600">YouTube‑first • All agents enabled • 80‑day retention</p>
          </div>
          <div className="flex items-center gap-4">
            <Tabs value={tab} onChange={setTab} />
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-600">
                {user.name} ({user.role})
              </span>
              <Button variant="secondary" className="px-3 py-1 text-sm" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {tab === "docs" && <DocsTab />}
        {tab === "submissions" && <SubmissionsTab />}
        {tab === "reports" && <ReportsTab />}
      </main>

      <footer className="max-w-6xl mx-auto px-4 pb-10 text-xs text-zinc-500">
        <p>Admin interface for managing documentation and script submissions.</p>
      </footer>
    </div>
  );
}
