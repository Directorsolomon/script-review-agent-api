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

// ----------------------------- UI Primitives -----------------------------
function Button({ children, className, variant = "primary", size = "md", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost"; 
  size?: "sm" | "md" | "lg";
}) {
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };
  
  const variantClasses = {
    primary: "bg-gray-900 text-white hover:bg-gray-800",
    secondary: "bg-white text-gray-900 hover:bg-gray-50 border border-gray-200",
    danger: "bg-red-600 text-white hover:bg-red-700",
    outline: "bg-transparent text-gray-900 hover:bg-gray-50 border border-gray-200",
    ghost: "bg-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50",
  };

  return (
    <button
      className={cx(baseClasses, sizeClasses[size], variantClasses[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}

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

function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className={cx("animate-spin rounded-full border-2 border-gray-200 border-t-gray-900", sizeClasses[size])} />
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

// ----------------------------- Navigation -----------------------------
function AdminNavigation() {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <h1 className="text-lg font-semibold text-gray-900">Admin Panel</h1>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {user?.name} ({user?.role})
            </span>
            <Button variant="outline" size="sm" onClick={logout}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
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
  const backend = useBackend();

  useEffect(() => {
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
    }
  }, [doc]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!doc) return;
    
    setErrors({});
    setBusy(true);
    
    try {
      await backend.admin.updateDoc({
        id: doc.id,
        title: formData.title,
        version: formData.version,
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
      setErrors({ submit: e.message });
    } finally {
      setBusy(false);
    }
  }

  function updateFormData(field: string, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Document">
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Title" required>
            <Input
              value={formData.title}
              onChange={(e) => updateFormData('title', e.target.value)}
              required
            />
          </FormField>

          <FormField label="Version" required>
            <Input
              value={formData.version}
              onChange={(e) => updateFormData('version', e.target.value)}
              required
            />
          </FormField>

          <FormField label="Document Type" required>
            <Select
              value={formData.docType}
              onChange={(e) => updateFormData('docType', e.target.value)}
            >
              <option value="rubric">Rubric</option>
              <option value="style">Style</option>
              <option value="platform">Platform</option>
              <option value="legal">Legal</option>
              <option value="playbook">Playbook</option>
              <option value="other">Other</option>
            </Select>
          </FormField>

          <FormField label="Status" required>
            <Select
              value={formData.status}
              onChange={(e) => updateFormData('status', e.target.value)}
            >
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
  const backend = useBackend();

  async function loadDocs() {
    try {
      const res = await backend.admin.listDocs();
      setDocs(res.items);
    } catch (e: any) {
      console.error("Failed to load docs:", e);
      setErrors({ load: e.message });
    }
  }

  useEffect(() => {
    loadDocs();
  }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    
    if (!formData.file) {
      setErrors({ file: "Please choose a file" });
      return;
    }
    
    if (formData.file.size > 20 * 1024 * 1024) {
      setErrors({ file: "File too large (20 MB max)" });
      return;
    }
    
    setBusy(true);
    
    try {
      const presign = await backend.admin.presignDoc({
        filename: formData.file.name,
        contentType: formData.file.type || "application/octet-stream",
        size: formData.file.size,
        title: formData.title,
        version: formData.version,
        doc_type: formData.docType as any,
        region: formData.region as any,
        platform: formData.platform as any,
        tags: formData.tags.split(",").map((t) => t.trim()).filter(Boolean),
      });

      await uploadToPresignedURL(presign.uploadUrl, formData.file);
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
    } catch (e: any) {
      console.error("Upload error:", e);
      setErrors({ submit: e.message });
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
      setErrors({ delete: e.message });
    }
  }

  function updateFormData(field: string, value: any) {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
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
              accept=".pdf,.docx,.md,.txt"
              onChange={(e) => updateFormData('file', e.target.files?.[0] || null)}
              error={!!errors.file}
            />
            <p className="text-sm text-gray-500 mt-1">
              Supported formats: PDF, DOCX, Markdown, TXT • Maximum size: 20 MB
            </p>
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
                    <span className="text-gray-600">{doc.status}</span>
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
        onSave={loadDocs}
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

// ----------------------------- Admin App Shell -----------------------------
export default function AdminApp() {
  const { user } = useAuth();

  if (!user || !['admin', 'editor', 'viewer'].includes(user.role)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Access Required</h1>
          <p className="text-gray-600 mb-8">Please sign in with an admin account to access this panel</p>
          <LoginForm showRegister={false} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <AdminNavigation />
      <main>
        <DocsTab />
      </main>
    </div>
  );
}
