import React, { useMemo, useState } from "react";
import { useRouter } from "./components/Router";
import Navigation from "./components/Navigation";
import ConfirmDialog from "./components/ConfirmDialog";
import ValidationMessage from "./components/ValidationMessage";
import Button from "./components/Button";
import LoadingSpinner from "./components/LoadingSpinner";
import backend from "~backend/client";

// ----------------------------- Utilities -----------------------------
async function uploadToPresignedURL(url: string, file: File) {
  const res = await fetch(url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!res.ok) {
    if (res.status === 413) {
      throw new Error("File too large for upload. Please reduce file size and try again.");
    }
    throw new Error(`Upload failed: ${res.status}`);
  }
}

function cx(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

// ----------------------------- UI Primitives -----------------------------
function Input({ error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-lg border px-3 py-2 text-sm transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1",
        "placeholder:text-gray-400",
        error ? "border-red-300 focus:ring-red-500" : "border-gray-200",
        props.className
      )}
    />
  );
}

function Select({ error, className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <select
      {...props}
      className={cx(
        "w-full rounded-lg border px-3 py-2 text-sm bg-white transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1",
        error ? "border-red-300 focus:ring-red-500" : "border-gray-200",
        className
      )}
    />
  );
}

function Card({ title, description, children, actions }: { 
  title: string; 
  description?: string; 
  children: React.ReactNode; 
  actions?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-start justify-between p-8 border-b border-gray-100">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {description && <p className="text-sm text-gray-600 mt-2">{description}</p>}
        </div>
        {actions && <div className="ml-6 flex-shrink-0">{actions}</div>}
      </div>
      <div className="p-8">{children}</div>
    </div>
  );
}

function FormField({ label, error, required, children }: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function SuccessMessage({ message, onClose }: { message: string; onClose: () => void }) {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="text-green-600">✓</div>
        <p className="text-sm text-green-700">{message}</p>
        <button
          onClick={onClose}
          className="text-green-400 hover:text-green-600 ml-2"
          aria-label="Close"
        >
          ×
        </button>
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

// ----------------------------- Edit Doc Modal -----------------------------
function EditDocModal({ doc, isOpen, onClose, onSave }: { 
  doc: AdminDoc | null; 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: () => void; 
}) {
  const [formData, setFormData] = useState({
    title: "",
    version: "",
    docType: "",
    region: "",
    platform: "",
    tags: "",
    status: "",
  });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (doc) {
      setFormData({
        title: doc.title,
        version: doc.version,
        docType: doc.doc_type,
        region: doc.region || "",
        platform: doc.platform || "",
        tags: (doc.tags || []).join(", "),
        status: doc.status,
      });
      setErrors({});
    }
  }, [doc]);

  function validateForm() {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    
    if (!formData.version.trim()) {
      newErrors.version = "Version is required";
    }
    
    if (!formData.docType) {
      newErrors.docType = "Document type is required";
    }
    
    if (!formData.status) {
      newErrors.status = "Status is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!doc) return;
    
    if (!validateForm()) return;
    
    setBusy(true);
    
    try {
      await backend.admin.updateDoc({
        id: doc.id,
        title: formData.title.trim(),
        version: formData.version.trim(),
        doc_type: formData.docType as any,
        region: formData.region || undefined,
        platform: formData.platform || undefined,
        tags: formData.tags.split(",").map((t) => t.trim()).filter(Boolean),
        status: formData.status as any,
      });
      
      onSave();
      onClose();
    } catch (e: any) {
      console.error("Update error:", e);
      setErrors({ submit: e.message || "Failed to update document" });
    } finally {
      setBusy(false);
    }
  }

  function updateFormData(field: string, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Document">
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Title" required error={errors.title}>
            <Input
              value={formData.title}
              onChange={(e) => updateFormData('title', e.target.value)}
              placeholder="Document title"
              required
              error={!!errors.title}
            />
          </FormField>

          <FormField label="Version" required error={errors.version}>
            <Input
              value={formData.version}
              onChange={(e) => updateFormData('version', e.target.value)}
              placeholder="e.g., 1.0, 2.1"
              required
              error={!!errors.version}
            />
          </FormField>

          <FormField label="Document Type" required error={errors.docType}>
            <Select
              value={formData.docType}
              onChange={(e) => updateFormData('docType', e.target.value)}
              error={!!errors.docType}
            >
              <option value="">Select type</option>
              <option value="rubric">Rubric</option>
              <option value="style">Style</option>
              <option value="platform">Platform</option>
              <option value="legal">Legal</option>
              <option value="playbook">Playbook</option>
              <option value="other">Other</option>
            </Select>
          </FormField>

          <FormField label="Status" required error={errors.status}>
            <Select
              value={formData.status}
              onChange={(e) => updateFormData('status', e.target.value)}
              error={!!errors.status}
            >
              <option value="">Select status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="experimental">Experimental</option>
            </Select>
          </FormField>

          <FormField label="Region">
            <Select
              value={formData.region}
              onChange={(e) => updateFormData('region', e.target.value)}
            >
              <option value="">None</option>
              <option value="NG">Nigeria</option>
              <option value="KE">Kenya</option>
              <option value="GH">Ghana</option>
              <option value="ZA">South Africa</option>
              <option value="GLOBAL">Global</option>
            </Select>
          </FormField>

          <FormField label="Platform">
            <Select
              value={formData.platform}
              onChange={(e) => updateFormData('platform', e.target.value)}
            >
              <option value="">None</option>
              <option value="YouTube">YouTube</option>
              <option value="Cinema">Cinema</option>
              <option value="VOD">VOD</option>
              <option value="TV">TV</option>
            </Select>
          </FormField>
        </div>

        <FormField label="Tags">
          <Input
            value={formData.tags}
            onChange={(e) => updateFormData('tags', e.target.value)}
            placeholder="Comma-separated tags"
          />
        </FormField>

        {errors.submit && (
          <ValidationMessage type="error" message={errors.submit} />
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? <LoadingSpinner size="sm" /> : "Save Changes"}
          </Button>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ----------------------------- Docs Tab -----------------------------
function DocsTab() {
  const [formData, setFormData] = useState({
    file: null as File | null,
    title: "",
    version: "1.0",
    docType: "rubric",
    region: "NG",
    platform: "YouTube",
    tags: "Nollywood,YouTube",
  });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [docs, setDocs] = useState<AdminDoc[]>([]);
  const [editingDoc, setEditingDoc] = useState<AdminDoc | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AdminDoc | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadDocs() {
    try {
      const res = await backend.admin.listDocs();
      setDocs(res.items);
    } catch (e: any) {
      console.error("Failed to load docs:", e);
      setErrors({ load: e.message || "Failed to load documents" });
    }
  }

  React.useEffect(() => {
    loadDocs();
  }, []);

  function validateUploadForm() {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    
    if (!formData.version.trim()) {
      newErrors.version = "Version is required";
    }
    
    if (!formData.file) {
      newErrors.file = "Please choose a file";
    } else {
      // Check file size (20MB for docs)
      const maxSize = 20 * 1024 * 1024; // 20MB
      if (formData.file.size > maxSize) {
        const fileSizeMB = Math.round(formData.file.size / 1024 / 1024 * 10) / 10;
        newErrors.file = `File too large: ${fileSizeMB}MB (maximum 20MB)`;
      }
      
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain',
        'text/markdown'
      ];
      
      if (!allowedTypes.includes(formData.file.type) && !formData.file.name.match(/\.(pdf|docx|doc|txt|md)$/i)) {
        newErrors.file = "Unsupported file type. Please use PDF, DOCX, DOC, TXT, or MD files.";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    
    if (!validateUploadForm()) return;
    
    setBusy(true);
    setErrors({});
    
    try {
      const presign = await backend.admin.presignDoc({
        filename: formData.file!.name,
        contentType: formData.file!.type || "application/octet-stream",
        size: formData.file!.size,
        title: formData.title.trim(),
        version: formData.version.trim(),
        doc_type: formData.docType as any,
        region: formData.region as any,
        platform: formData.platform as any,
        tags: formData.tags.split(",").map((t) => t.trim()).filter(Boolean),
      });

      await uploadToPresignedURL(presign.uploadUrl, formData.file!);
      await backend.admin.completeDoc({ docId: presign.docId });
      await loadDocs();
      
      setFormData({
        file: null,
        title: "",
        version: "1.0",
        docType: "rubric",
        region: "NG",
        platform: "YouTube",
        tags: "Nollywood,YouTube",
      });
      
      setSuccessMessage("Document uploaded and processed successfully!");
      
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (e: any) {
      console.error("Upload error:", e);
      
      // Handle specific error types
      let errorMessage = "Failed to upload document";
      
      if (e.message?.includes("File too large") || e.message?.includes("maximum")) {
        errorMessage = e.message;
      } else if (e.message?.includes("Unsupported file type")) {
        errorMessage = e.message;
      } else if (e.message?.includes("413") || e.message?.includes("Payload Too Large")) {
        errorMessage = "File too large for upload. Please reduce file size to under 20MB and try again.";
      } else if (e.message?.includes("invalid_argument")) {
        errorMessage = e.message.replace("invalid_argument: ", "");
      } else if (e.message) {
        errorMessage = e.message;
      }
      
      setErrors({ submit: errorMessage });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(doc: AdminDoc) {
    try {
      await backend.admin.deleteDoc({ id: doc.id });
      await loadDocs();
      setConfirmDelete(null);
      setSuccessMessage("Document deleted successfully!");
    } catch (e: any) {
      console.error("Delete error:", e);
      setErrors({ delete: e.message || "Failed to delete document" });
    }
  }

  function updateFormData(field: string, value: any) {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  }

  return (
    <div className="space-y-12">
      {successMessage && (
        <SuccessMessage 
          message={successMessage} 
          onClose={() => setSuccessMessage(null)} 
        />
      )}

      <Card 
        title="Upload Documentation" 
        description="Upload guidelines, rubrics, and platform notes"
      >
        <form onSubmit={handleUpload} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Title" required error={errors.title}>
              <Input
                value={formData.title}
                onChange={(e) => updateFormData('title', e.target.value)}
                placeholder="e.g., Feature Rubric v3.1 (NG)"
                required
                error={!!errors.title}
              />
            </FormField>

            <FormField label="Version" required error={errors.version}>
              <Input
                value={formData.version}
                onChange={(e) => updateFormData('version', e.target.value)}
                placeholder="e.g., 3.1"
                required
                error={!!errors.version}
              />
            </FormField>

            <FormField label="Document Type" required>
              <Select
                value={formData.docType}
                onChange={(e) => updateFormData('docType', e.target.value)}
              >
                <option value="rubric">Rubric</option>
                <option value="style">Style Guide</option>
                <option value="platform">Platform Guidelines</option>
                <option value="legal">Legal Guidelines</option>
                <option value="playbook">Playbook</option>
                <option value="other">Other</option>
              </Select>
            </FormField>

            <FormField label="Region">
              <Select
                value={formData.region}
                onChange={(e) => updateFormData('region', e.target.value)}
              >
                <option value="NG">Nigeria</option>
                <option value="KE">Kenya</option>
                <option value="GH">Ghana</option>
                <option value="ZA">South Africa</option>
                <option value="GLOBAL">Global</option>
              </Select>
            </FormField>

            <FormField label="Platform">
              <Select
                value={formData.platform}
                onChange={(e) => updateFormData('platform', e.target.value)}
              >
                <option value="YouTube">YouTube</option>
                <option value="Cinema">Cinema</option>
                <option value="VOD">VOD</option>
                <option value="TV">TV</option>
              </Select>
            </FormField>

            <FormField label="Tags">
              <Input
                value={formData.tags}
                onChange={(e) => updateFormData('tags', e.target.value)}
                placeholder="Comma-separated tags"
              />
            </FormField>
          </div>

          <FormField label="Document File" required error={errors.file}>
            <Input
              type="file"
              accept=".pdf,.docx,.doc,.md,.txt"
              onChange={(e) => updateFormData('file', e.target.files?.[0] || null)}
              error={!!errors.file}
            />
            <p className="text-sm text-gray-500 mt-1">
              Supported formats: PDF, DOCX, DOC, Markdown, TXT • Maximum size: 20 MB
            </p>
            {formData.file && (
              <div className="text-sm text-gray-600 mt-1">
                Selected: {formData.file.name} ({Math.round(formData.file.size / 1024 / 1024 * 10) / 10} MB)
              </div>
            )}
          </FormField>

          {errors.submit && (
            <ValidationMessage type="error" message={errors.submit} />
          )}

          <Button type="submit" disabled={busy}>
            {busy ? <LoadingSpinner size="sm" /> : "Upload & Process"}
          </Button>
        </form>
      </Card>

      <Card title="Documentation Library" description={`${docs.length} documents available`}>
        {errors.load && (
          <ValidationMessage type="error" message={errors.load} className="mb-4" />
        )}
        
        {errors.delete && (
          <ValidationMessage type="error" message={errors.delete} className="mb-4" />
        )}
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 border-b border-gray-200">
                <th className="py-3 font-medium">Document</th>
                <th className="py-3 font-medium">Type</th>
                <th className="py-3 font-medium">Region</th>
                <th className="py-3 font-medium">Platform</th>
                <th className="py-3 font-medium">Status</th>
                <th className="py-3 font-medium">Updated</th>
                <th className="py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {docs.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="py-3">
                    <div>
                      <p className="font-medium text-gray-900">{doc.title}</p>
                      <p className="text-xs text-gray-500">v{doc.version}</p>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="text-gray-600">{doc.doc_type}</span>
                  </td>
                  <td className="py-3">{doc.region || "—"}</td>
                  <td className="py-3">{doc.platform || "—"}</td>
                  <td className="py-3">
                    <span className={cx(
                      "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                      doc.status === 'active' && "bg-green-100 text-green-800",
                      doc.status === 'inactive' && "bg-gray-100 text-gray-800",
                      doc.status === 'experimental' && "bg-yellow-100 text-yellow-800"
                    )}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="py-3 text-gray-600">
                    {new Date(doc.updated_at).toLocaleDateString()}
                  </td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingDoc(doc);
                          setShowEditModal(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setConfirmDelete(doc)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {docs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    No documents uploaded yet. Upload your first document above.
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
        onSave={() => {
          loadDocs();
          setSuccessMessage("Document updated successfully!");
        }}
      />

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        title="Delete Document"
        message={`Are you sure you want to delete "${confirmDelete?.title}"? This action cannot be undone and will remove all associated data.`}
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
  });

  async function loadSubmissions() {
    try {
      setError(null);
      const response = await backend.admin.listAdminSubmissions({
        status: filters.status || undefined,
        writer_email: filters.writer_email || undefined,
        region: filters.region || undefined,
        platform: filters.platform || undefined,
        limit: 100,
      });
      setSubmissions(response.items);
    } catch (e: any) {
      console.error("Failed to load submissions:", e);
      setError(e.message || "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadSubmissions();
  }, [filters]);

  function updateFilter(field: string, value: string) {
    setFilters(prev => ({ ...prev, [field]: value }));
  }

  function getStatusText(status: string): string {
    switch (status) {
      case "queued": return "Pending";
      case "processing": return "In Review";
      case "completed": return "Complete";
      case "failed": return "Failed";
      default: return status;
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case "queued": return "bg-yellow-100 text-yellow-800";
      case "processing": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-green-100 text-green-800";
      case "failed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Loading submissions...</span>
      </div>
    );
  }

  return (
    <Card 
      title="All Submissions" 
      description={`${submissions.length} total submissions`}
    >
      {error && (
        <ValidationMessage type="error" message={error} className="mb-6" />
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <Select
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="queued">Pending</option>
            <option value="processing">In Review</option>
            <option value="completed">Complete</option>
            <option value="failed">Failed</option>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Writer Email</label>
          <Input
            value={filters.writer_email}
            onChange={(e) => updateFilter('writer_email', e.target.value)}
            placeholder="Search by email..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
          <Select
            value={filters.region}
            onChange={(e) => updateFilter('region', e.target.value)}
          >
            <option value="">All Regions</option>
            <option value="NG">Nigeria</option>
            <option value="KE">Kenya</option>
            <option value="GH">Ghana</option>
            <option value="ZA">South Africa</option>
            <option value="GLOBAL">Global</option>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
          <Select
            value={filters.platform}
            onChange={(e) => updateFilter('platform', e.target.value)}
          >
            <option value="">All Platforms</option>
            <option value="YouTube">YouTube</option>
            <option value="Cinema">Cinema</option>
            <option value="VOD">VOD</option>
            <option value="TV">TV</option>
          </Select>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 border-b border-gray-200">
              <th className="py-3 font-medium">Script</th>
              <th className="py-3 font-medium">Writer</th>
              <th className="py-3 font-medium">Status</th>
              <th className="py-3 font-medium">Format</th>
              <th className="py-3 font-medium">Region</th>
              <th className="py-3 font-medium">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {submissions.map((submission) => (
              <tr key={submission.id} className="hover:bg-gray-50">
                <td className="py-3">
                  <div>
                    <p className="font-medium text-gray-900">{submission.script_title}</p>
                    <p className="text-xs text-gray-500">{submission.genre || 'No genre'}</p>
                  </div>
                </td>
                <td className="py-3">
                  <div>
                    <p className="text-gray-900">{submission.writer_name}</p>
                    <p className="text-xs text-gray-500">{submission.writer_email}</p>
                  </div>
                </td>
                <td className="py-3">
                  <span className={cx(
                    "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                    getStatusColor(submission.status)
                  )}>
                    {getStatusText(submission.status)}
                  </span>
                </td>
                <td className="py-3">
                  <span className="text-gray-600">
                    {submission.format} • {submission.draft_version}
                  </span>
                </td>
                <td className="py-3">{submission.region || "—"}</td>
                <td className="py-3 text-gray-600">
                  {formatDate(submission.created_at)}
                </td>
              </tr>
            ))}
            {submissions.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-500">
                  No submissions found matching the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ----------------------------- Admin Tabs -----------------------------
function AdminTabs() {
  const [activeTab, setActiveTab] = useState('docs');

  const tabs = [
    { id: 'docs', label: 'Documentation', component: DocsTab },
    { id: 'submissions', label: 'Submissions', component: SubmissionsTab },
  ];

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cx(
                "py-2 px-1 border-b-2 font-medium text-sm transition-colors",
                activeTab === tab.id
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {tabs.map((tab) => {
          if (tab.id === activeTab) {
            const Component = tab.component;
            return <Component key={tab.id} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}

// ----------------------------- Admin App Shell -----------------------------
export default function AdminApp() {
  const { currentPath, navigate } = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation currentPath={currentPath} navigate={navigate} />
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Panel</h1>
          <p className="text-gray-600">Manage documentation and review submissions</p>
        </div>
        <AdminTabs />
      </main>
    </div>
  );
}
