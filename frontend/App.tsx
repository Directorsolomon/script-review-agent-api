import React, { useMemo, useState } from "react";
import { AuthProvider, useAuth, useBackend } from "./components/AuthProvider";
import LoginForm from "./components/LoginForm";
import UserDashboard from "./components/UserDashboard";
import ValidationMessage from "./components/ValidationMessage";
import AdminApp from "./AdminApp";

// ----------------------------- Utils -----------------------------
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

function Button({ children, className, variant = "primary", size = "md", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: "primary" | "secondary" | "outline" | "ghost"; 
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

function Textarea({ error, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return (
    <textarea
      {...props}
      className={cx(
        "w-full rounded-lg border px-3 py-2 text-sm transition-colors resize-vertical",
        "focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1",
        "placeholder:text-gray-400",
        error ? "border-red-300 focus:ring-red-500" : "border-gray-200",
        props.className
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

// ----------------------------- Router -----------------------------
function useRouter() {
  const [currentPath, setCurrentPath] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname + window.location.search;
    }
    return '/';
  });

  React.useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname + window.location.search);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  return { currentPath, navigate };
}

// ----------------------------- Navigation -----------------------------
function Navigation() {
  const { user, logout } = useAuth();
  const { navigate } = useRouter();

  return (
    <header className="border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <button 
            onClick={() => navigate('/')} 
            className="text-lg font-semibold text-gray-900 hover:text-gray-700 transition-colors"
          >
            Script Review
          </button>

          {user ? (
            <div className="flex items-center space-x-6">
              <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                Dashboard
              </Button>
              {['admin', 'editor', 'viewer'].includes(user.role) && (
                <Button variant="ghost" onClick={() => navigate('/admin')}>
                  Admin
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={logout}>
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate('/#submit')}>
                Submit Script
              </Button>
              <Button variant="ghost" onClick={() => navigate('/#status')}>
                Check Status
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ----------------------------- Home Hero -----------------------------
function Hero() {
  const { navigate } = useRouter();

  return (
    <section className="py-24">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          Professional script feedback
        </h1>
        
        <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
          Get comprehensive analysis and actionable recommendations for your screenplay
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" onClick={() => navigate('/#submit')}>
            Submit Your Script
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate('/#status')}>
            Check Status
          </Button>
        </div>
      </div>
    </section>
  );
}

// ----------------------------- Submission Form -----------------------------
function SubmissionForm() {
  const [formData, setFormData] = useState({
    file: null as File | null,
    writerName: "",
    writerEmail: "",
    scriptTitle: "",
    format: "youtube_movie",
    draftVersion: "1st",
    genre: "",
    region: "NG",
    platform: "YouTube",
    agree: false,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<{ submissionId: string } | null>(null);
  const backend = useBackend();

  async function uploadToPresignedURL(url: string, file: File) {
    const res = await fetch(url, { 
      method: "PUT", 
      headers: { "Content-Type": file.type }, 
      body: file 
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  }

  function validateForm() {
    const newErrors: Record<string, string> = {};
    
    if (!formData.writerName.trim()) newErrors.writerName = "Writer name is required";
    if (!formData.writerEmail.trim()) newErrors.writerEmail = "Email is required";
    if (!formData.scriptTitle.trim()) newErrors.scriptTitle = "Script title is required";
    if (!formData.file) newErrors.file = "Please choose a script file";
    if (!formData.agree) newErrors.agree = "Please agree to the terms";
    
    if (formData.file && formData.file.size > 20 * 1024 * 1024) {
      newErrors.file = "File too large (20 MB max)";
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.writerEmail && !emailRegex.test(formData.writerEmail)) {
      newErrors.writerEmail = "Please enter a valid email address";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setBusy(true);
    setErrors({});
    
    try {
      const presign = await backend.submissions.presignScript({
        filename: formData.file!.name,
        contentType: formData.file!.type || "application/pdf",
        size: formData.file!.size,
      });

      await uploadToPresignedURL(presign.uploadUrl, formData.file!);

      const created = await backend.submissions.create({
        writer_name: formData.writerName,
        writer_email: formData.writerEmail,
        script_title: formData.scriptTitle,
        format: formData.format as any,
        draft_version: formData.draftVersion as any,
        genre: formData.genre || undefined,
        region: formData.region as any,
        platform: formData.platform as any,
        file_s3_key: presign.s3Key,
      });

      try {
        await backend.review.run({ submissionId: created.submissionId });
      } catch (err) {
        console.error("Failed to start review:", err);
      }

      setSuccess({ submissionId: created.submissionId });
      
      setFormData({
        file: null,
        writerName: "",
        writerEmail: "",
        scriptTitle: "",
        format: "youtube_movie",
        draftVersion: "1st",
        genre: "",
        region: "NG",
        platform: "YouTube",
        agree: false,
      });
      
    } catch (e: any) {
      console.error("Submission error:", e);
      setErrors({ submit: e.message || "Failed to submit script" });
    } finally {
      setBusy(false);
    }
  }

  function updateFormData(field: string, value: any) {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  }

  if (success) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Script Submitted</h3>
        <p className="text-gray-600 mb-6">
          Your submission ID:
        </p>
        <div className="bg-gray-50 rounded-lg p-4 mb-8 max-w-md mx-auto">
          <code className="text-sm font-mono text-gray-900">{success.submissionId}</code>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => window.location.href = "#status"}>
            Check Status
          </Button>
          <Button 
            variant="outline"
            onClick={async () => {
              const ok = await safeCopyToClipboard(success.submissionId);
              if (!ok) alert('Copy failed. Please select the ID and copy manually.');
            }}
          >
            Copy ID
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField label="Writer Name" required error={errors.writerName}>
          <Input
            value={formData.writerName}
            onChange={(e) => updateFormData('writerName', e.target.value)}
            placeholder="Your full name"
            error={!!errors.writerName}
          />
        </FormField>

        <FormField label="Email Address" required error={errors.writerEmail}>
          <Input
            type="email"
            value={formData.writerEmail}
            onChange={(e) => updateFormData('writerEmail', e.target.value)}
            placeholder="your.email@example.com"
            error={!!errors.writerEmail}
          />
        </FormField>

        <FormField label="Script Title" required error={errors.scriptTitle}>
          <Input
            value={formData.scriptTitle}
            onChange={(e) => updateFormData('scriptTitle', e.target.value)}
            placeholder="The title of your script"
            error={!!errors.scriptTitle}
          />
        </FormField>

        <FormField label="Format" required>
          <Select
            value={formData.format}
            onChange={(e) => updateFormData('format', e.target.value)}
          >
            <option value="youtube_movie">YouTube Movie</option>
            <option value="feature">Feature Film</option>
            <option value="series">Series/Episode</option>
          </Select>
        </FormField>

        <FormField label="Draft Version" required>
          <Select
            value={formData.draftVersion}
            onChange={(e) => updateFormData('draftVersion', e.target.value)}
          >
            <option value="1st">First Draft</option>
            <option value="2nd">Second Draft</option>
            <option value="3rd">Third Draft</option>
          </Select>
        </FormField>

        <FormField label="Genre">
          <Input
            value={formData.genre}
            onChange={(e) => updateFormData('genre', e.target.value)}
            placeholder="e.g., Drama, Comedy, Thriller"
          />
        </FormField>

        <FormField label="Region" required>
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

        <FormField label="Target Platform" required>
          <Select
            value={formData.platform}
            onChange={(e) => updateFormData('platform', e.target.value)}
          >
            <option value="YouTube">YouTube</option>
            <option value="Cinema">Cinema</option>
            <option value="VOD">Video on Demand</option>
            <option value="TV">Television</option>
          </Select>
        </FormField>
      </div>

      <FormField label="Script File" required error={errors.file}>
        <div className="space-y-2">
          <Input
            type="file"
            accept=".pdf,.docx,.fdx,.txt"
            onChange={(e) => updateFormData('file', e.target.files?.[0] || null)}
            error={!!errors.file}
          />
          <p className="text-sm text-gray-500">
            Supported formats: PDF, DOCX, FDX, TXT • Maximum size: 20 MB
          </p>
        </div>
      </FormField>

      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <input
            id="agree"
            type="checkbox"
            checked={formData.agree}
            onChange={(e) => updateFormData('agree', e.target.checked)}
            className="mt-1 h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded"
          />
          <label htmlFor="agree" className="text-sm text-gray-600">
            I agree to the data retention policy and terms of service.
          </label>
        </div>
        {errors.agree && <p className="text-sm text-red-600">{errors.agree}</p>}
      </div>

      {errors.submit && (
        <ValidationMessage type="error" message={errors.submit} />
      )}

      <div className="flex justify-center pt-4">
        <Button type="submit" disabled={busy} size="lg">
          {busy ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="ml-2">Submitting...</span>
            </>
          ) : (
            "Submit for Review"
          )}
        </Button>
      </div>
    </form>
  );
}

// ----------------------------- Status Lookup -----------------------------
function StatusLookup() {
  const [submissionId, setSubmissionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<any | null>(null);
  const backend = useBackend();

  async function fetchReport(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setReport(null);
    setLoading(true);
    
    try {
      const r = await backend.review.getReport({ submissionId: submissionId.trim() });
      setReport(r);
    } catch (e: any) {
      console.error("Failed to fetch report:", e);
      setError("Report not found or not ready yet. Please check your submission ID and try again.");
    } finally {
      setLoading(false);
    }
  }

  const reportData = useMemo(() => report?.report_json || null, [report]);

  return (
    <section id="status" className="py-24">
      <div className="max-w-4xl mx-auto px-6">
        <Card 
          title="Check Your Review Status" 
          description="Enter your submission ID to view your script review"
        >
          <form onSubmit={fetchReport} className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Enter your submission ID"
                  value={submissionId}
                  onChange={(e) => setSubmissionId(e.target.value)}
                  required
                  error={!!error}
                />
              </div>
              <Button type="submit" disabled={loading || !submissionId.trim()}>
                {loading ? <LoadingSpinner size="sm" /> : "Check Status"}
              </Button>
            </div>
            
            {error && <ValidationMessage type="error" message={error} />}
          </form>

          {reportData && (
            <div className="mt-12 space-y-8">
              <div className="text-center">
                <h4 className="text-lg font-semibold mb-2">Review Complete</h4>
                {typeof report?.overall_score === 'number' && (
                  <p className="text-2xl font-bold text-gray-900">
                    {report.overall_score.toFixed(1)}/10
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h5 className="font-semibold text-gray-900 mb-4">Strengths</h5>
                  {Array.isArray(reportData.highlights) && reportData.highlights.length > 0 ? (
                    <ul className="space-y-2">
                      {reportData.highlights.map((highlight: string, i: number) => (
                        <li key={i} className="text-sm text-gray-700">
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No highlights available yet.</p>
                  )}
                </div>

                <div>
                  <h5 className="font-semibold text-gray-900 mb-4">Areas for Improvement</h5>
                  {Array.isArray(reportData.risks) && reportData.risks.length > 0 ? (
                    <ul className="space-y-2">
                      {reportData.risks.map((risk: string, i: number) => (
                        <li key={i} className="text-sm text-gray-700">
                          {risk}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No specific risks identified.</p>
                  )}
                </div>
              </div>

              <div>
                <h5 className="font-semibold text-gray-900 mb-4">Action Plan</h5>
                {Array.isArray(reportData.action_plan) && reportData.action_plan.length > 0 ? (
                  <div className="space-y-3">
                    {reportData.action_plan.map((action: any, i: number) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-700">{action.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No specific actions recommended.</p>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}

// ----------------------------- Public App -----------------------------
function PublicApp() {
  const { currentPath } = useRouter();

  if (currentPath === '/dashboard') {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <UserDashboard />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <main>
        <Hero />
        
        <section id="submit" className="py-24 bg-gray-50">
          <div className="max-w-4xl mx-auto px-6">
            <Card 
              title="Submit Your Script" 
              description="Get professional feedback for your screenplay"
            >
              <SubmissionForm />
            </Card>
          </div>
        </section>

        <StatusLookup />
      </main>
    </div>
  );
}

// ----------------------------- Main App with Routing -----------------------------
function AppInner() {
  const { currentPath } = useRouter();

  if (currentPath.startsWith('/admin')) {
    return <AdminApp />;
  }

  return <PublicApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
