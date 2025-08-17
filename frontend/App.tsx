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
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };
  
  const variantClasses = {
    primary: "bg-zinc-900 text-white hover:bg-zinc-800 border border-zinc-900",
    secondary: "bg-white text-zinc-900 hover:bg-zinc-50 border border-zinc-300",
    outline: "bg-transparent text-zinc-900 hover:bg-zinc-50 border border-zinc-300",
    ghost: "bg-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border border-transparent",
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
        "w-full rounded-xl border px-3 py-2 text-sm transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1",
        "placeholder:text-zinc-400",
        error ? "border-red-300 focus:ring-red-500" : "border-zinc-300",
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
        "w-full rounded-xl border px-3 py-2 text-sm bg-white transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1",
        error ? "border-red-300 focus:ring-red-500" : "border-zinc-300",
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
        "w-full rounded-xl border px-3 py-2 text-sm transition-colors resize-vertical",
        "focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1",
        "placeholder:text-zinc-400",
        error ? "border-red-300 focus:ring-red-500" : "border-zinc-300",
        props.className
      )}
    />
  );
}

function Tag({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "success" | "warning" | "error" | "info" }) {
  const variantClasses = {
    default: "bg-zinc-100 text-zinc-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-yellow-100 text-yellow-700",
    error: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-700",
  };

  return (
    <span className={cx("px-2 py-0.5 rounded-full text-xs font-medium", variantClasses[variant])}>
      {children}
    </span>
  );
}

function Card({ title, description, children, actions }: { 
  title: string; 
  description?: string; 
  children: React.ReactNode; 
  actions?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-start justify-between p-6 border-b border-zinc-100">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
          {description && <p className="text-sm text-zinc-600 mt-1">{description}</p>}
        </div>
        {actions && <div className="ml-4 flex-shrink-0">{actions}</div>}
      </div>
      <div className="p-6">{children}</div>
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
    <div className="space-y-1">
      <label className="block text-sm font-medium text-zinc-700">
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
    <div className={cx("animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900", sizeClasses[size])} />
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <button 
              onClick={() => navigate('/')} 
              className="text-xl font-bold text-zinc-900 hover:text-zinc-700 transition-colors"
            >
              Script Review
            </button>
            <div className="hidden sm:block ml-3">
              <Tag variant="info">Beta</Tag>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <Button variant="ghost" onClick={() => navigate('/#features')}>
              Features
            </Button>
            <Button variant="ghost" onClick={() => navigate('/#submit')}>
              Submit Script
            </Button>
            <Button variant="ghost" onClick={() => navigate('/#status')}>
              Check Status
            </Button>
            {user ? (
              <>
                <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                  Dashboard
                </Button>
                {['admin', 'editor', 'viewer'].includes(user.role) && (
                  <Button variant="ghost" onClick={() => navigate('/admin')}>
                    Admin
                  </Button>
                )}
                <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-zinc-200">
                  <span className="text-sm text-zinc-600">
                    {user.name}
                  </span>
                  <Button variant="outline" size="sm" onClick={logout}>
                    Sign Out
                  </Button>
                </div>
              </>
            ) : (
              <div className="ml-4 pl-4 border-l border-zinc-200">
                <LoginForm showRegister={true} />
              </div>
            )}
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-200 py-4">
            <nav className="flex flex-col space-y-2">
              <Button variant="ghost" className="justify-start" onClick={() => {
                navigate('/#features');
                setMobileMenuOpen(false);
              }}>
                Features
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => {
                navigate('/#submit');
                setMobileMenuOpen(false);
              }}>
                Submit Script
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => {
                navigate('/#status');
                setMobileMenuOpen(false);
              }}>
                Check Status
              </Button>
              {user ? (
                <>
                  <Button variant="ghost" className="justify-start" onClick={() => {
                    navigate('/dashboard');
                    setMobileMenuOpen(false);
                  }}>
                    Dashboard
                  </Button>
                  {['admin', 'editor', 'viewer'].includes(user.role) && (
                    <Button variant="ghost" className="justify-start" onClick={() => {
                      navigate('/admin');
                      setMobileMenuOpen(false);
                    }}>
                      Admin
                    </Button>
                  )}
                  <div className="pt-4 border-t border-zinc-200">
                    <p className="text-sm text-zinc-600 mb-2">Signed in as {user.name}</p>
                    <Button variant="outline" size="sm" onClick={logout}>
                      Sign Out
                    </Button>
                  </div>
                </>
              ) : (
                <div className="pt-4 border-t border-zinc-200">
                  <LoginForm showRegister={true} />
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

// ----------------------------- Home Hero -----------------------------
function Hero() {
  const { navigate } = useRouter();

  return (
    <section className="relative py-20 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="flex justify-center items-center gap-2 mb-6">
            <Tag variant="info">YouTube-first</Tag>
            <Tag variant="success">Nollywood-aware</Tag>
            <Tag variant="warning">AI-powered</Tag>
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-zinc-900 mb-6">
            Get professional script feedback in{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              minutes
            </span>
          </h1>
          
          <p className="text-xl text-zinc-600 max-w-3xl mx-auto mb-8">
            Our AI agents review your script against industry rubrics and platform guidelines, 
            delivering actionable feedback with strengths, risks, and a prioritized action plan.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" onClick={() => navigate('/#submit')}>
              Submit Your Script
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/#status')}>
              Check Status
            </Button>
          </div>
          
          <div className="mt-12 text-sm text-zinc-500">
            <p>✓ 24-hour turnaround • ✓ Evidence-based feedback • ✓ 80-day data retention</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ----------------------------- Features Section -----------------------------
function Features() {
  const features = [
    {
      icon: "🎯",
      title: "Platform-Specific Analysis",
      description: "Tailored feedback for YouTube, Cinema, VOD, and TV platforms with retention-focused insights."
    },
    {
      icon: "🌍",
      title: "Cultural Authenticity",
      description: "Nollywood-aware analysis that respects cultural nuances while avoiding stereotypes."
    },
    {
      icon: "📊",
      title: "Evidence-Based Scoring",
      description: "Detailed scoring across 8 key areas: structure, character, dialogue, pacing, and more."
    },
    {
      icon: "⚡",
      title: "Fast Turnaround",
      description: "Get comprehensive feedback within 24 hours of submission."
    },
    {
      icon: "🔒",
      title: "Secure & Private",
      description: "Your scripts are processed securely and automatically deleted after 80 days."
    },
    {
      icon: "📋",
      title: "Actionable Reports",
      description: "Prioritized action plans with specific recommendations you can implement immediately."
    }
  ];

  return (
    <section id="features" className="py-20 bg-zinc-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-4">
            Professional feedback, powered by AI
          </h2>
          <p className="text-xl text-zinc-600 max-w-2xl mx-auto">
            Our specialized agents analyze your script from multiple angles to provide comprehensive, actionable feedback.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200">
              <div className="text-3xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">{feature.title}</h3>
              <p className="text-zinc-600">{feature.description}</p>
            </div>
          ))}
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
      // Get presigned URL for script upload
      const presign = await backend.submissions.presignScript({
        filename: formData.file!.name,
        contentType: formData.file!.type || "application/pdf",
        size: formData.file!.size,
      });

      // Upload file to S3
      await uploadToPresignedURL(presign.uploadUrl, formData.file!);

      // Create submission
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

      // Start review process
      try {
        await backend.review.run({ submissionId: created.submissionId });
      } catch (err) {
        console.error("Failed to start review:", err);
        // Continue anyway - review can be started later
      }

      setSuccess({ submissionId: created.submissionId });
      
      // Reset form
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
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8">
        <div className="text-center">
          <div className="text-4xl mb-4">🎬</div>
          <h3 className="text-xl font-semibold text-green-900 mb-2">Script Submitted Successfully!</h3>
          <p className="text-green-700 mb-4">
            Your submission ID is:
          </p>
          <div className="bg-white rounded-xl p-4 mb-6">
            <code className="text-lg font-mono text-zinc-900">{success.submissionId}</code>
          </div>
          <p className="text-sm text-green-700 mb-6">
            Save this ID to check your review status and access your report. You'll receive feedback within 24 hours.
          </p>
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
          <p className="text-sm text-zinc-500">
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
            className="mt-1 h-4 w-4 text-zinc-900 focus:ring-zinc-900 border-zinc-300 rounded"
          />
          <label htmlFor="agree" className="text-sm text-zinc-600">
            I agree to the{" "}
            <a href="/privacy" className="text-zinc-900 hover:underline font-medium">
              80-day data retention policy
            </a>{" "}
            and{" "}
            <a href="/terms" className="text-zinc-900 hover:underline font-medium">
              terms of service
            </a>
            .
          </label>
        </div>
        {errors.agree && <p className="text-sm text-red-600">{errors.agree}</p>}
      </div>

      {errors.submit && (
        <ValidationMessage type="error" message={errors.submit} />
      )}

      <div className="flex justify-center">
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

  const retentionInfo = useMemo(() => {
    if (!report?.created_at) return null;
    const created = new Date(report.created_at).getTime();
    const days80 = 80 * 24 * 60 * 60 * 1000;
    const remainingMs = created + days80 - Date.now();
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
    return remainingDays;
  }, [report?.created_at]);

  const reportData = useMemo(() => report?.report_json || null, [report]);

  return (
    <section id="status" className="py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card 
          title="Check Your Review Status" 
          description="Enter your submission ID to view your script review and feedback"
        >
          <form onSubmit={fetchReport} className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Enter your submission ID (e.g., abc123-def456-ghi789)"
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
            <div className="mt-8 space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold">Review Complete</h4>
                <div className="flex items-center gap-4">
                  {typeof report?.overall_score === 'number' && (
                    <Tag variant="info">
                      Score: {report.overall_score.toFixed(1)}/10
                    </Tag>
                  )}
                  {retentionInfo !== null && (
                    <Tag variant="warning">
                      {retentionInfo} days until auto-deletion
                    </Tag>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div>
                    <h5 className="font-semibold text-zinc-900 mb-3">Key Strengths</h5>
                    {Array.isArray(reportData.highlights) && reportData.highlights.length > 0 ? (
                      <ul className="space-y-2">
                        {reportData.highlights.map((highlight: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            <span className="text-sm text-zinc-700">{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-zinc-500">No highlights available yet.</p>
                    )}
                  </div>

                  <div>
                    <h5 className="font-semibold text-zinc-900 mb-3">Areas for Improvement</h5>
                    {Array.isArray(reportData.risks) && reportData.risks.length > 0 ? (
                      <ul className="space-y-2">
                        {reportData.risks.map((risk: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-yellow-500 mt-0.5">⚠</span>
                            <span className="text-sm text-zinc-700">{risk}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-zinc-500">No specific risks identified.</p>
                    )}
                  </div>
                </div>

                <div>
                  <h5 className="font-semibold text-zinc-900 mb-3">Action Plan</h5>
                  {Array.isArray(reportData.action_plan) && reportData.action_plan.length > 0 ? (
                    <div className="space-y-3">
                      {reportData.action_plan.map((action: any, i: number) => (
                        <div key={i} className="bg-zinc-50 rounded-xl p-4">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm text-zinc-700 flex-1">{action.description}</p>
                            <Tag variant={action.priority === 'high' ? 'error' : action.priority === 'med' ? 'warning' : 'default'}>
                              {action.priority?.toUpperCase() || 'LOW'}
                            </Tag>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">No specific actions recommended.</p>
                  )}
                </div>
              </div>

              {reportData?.delivery?.pdf_uri && (
                <div className="pt-6 border-t border-zinc-200">
                  <Button
                    onClick={() => window.open(reportData.delivery.pdf_uri, '_blank')}
                    variant="outline"
                  >
                    Download Full Report (PDF)
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}

// ----------------------------- FAQ -----------------------------
function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  
  const faqs = [
    {
      question: "What file formats do you accept?",
      answer: "We accept PDF, DOCX, FDX (Final Draft), and TXT files up to 20 MB in size."
    },
    {
      question: "How long does the review process take?",
      answer: "Most reviews are completed within 24 hours of submission. You'll receive an email notification when your review is ready."
    },
    {
      question: "How are the reviews generated?",
      answer: "Our AI agents analyze your script against industry rubrics, platform guidelines, and cultural best practices. The system provides evidence-based feedback across 8 key areas including structure, character development, dialogue, and market fit."
    },
    {
      question: "Is my script data secure?",
      answer: "Yes, we take security seriously. Your scripts are encrypted during transmission and storage. All data is automatically deleted after 80 days as part of our privacy policy."
    },
    {
      question: "What makes this Nollywood-aware?",
      answer: "Our system is trained on Nollywood storytelling conventions, cultural nuances, and regional preferences. It provides culturally authentic feedback while avoiding stereotypes."
    },
    {
      question: "Can I get feedback for different platforms?",
      answer: "Yes! We provide platform-specific analysis for YouTube, Cinema, VOD, and TV, with particular expertise in YouTube-first content optimization."
    }
  ];

  return (
    <section className="py-20 bg-zinc-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">Frequently Asked Questions</h2>
          <p className="text-xl text-zinc-600">Everything you need to know about our script review service</p>
        </div>
        
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
              <button
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-zinc-50 transition-colors"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="font-medium text-zinc-900">{faq.question}</span>
                <svg
                  className={`w-5 h-5 text-zinc-500 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === index && (
                <div className="px-6 pb-4">
                  <p className="text-zinc-600">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ----------------------------- Privacy & Terms Pages -----------------------------
function PrivacyPage() {
  const { navigate } = useRouter();

  return (
    <div className="min-h-screen bg-zinc-50">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card title="Privacy Policy & Data Retention">
          <div className="prose prose-zinc max-w-none">
            <h2>Data Collection</h2>
            <p>We collect the following information when you submit a script for review:</p>
            <ul>
              <li>Your name and email address</li>
              <li>Script title, format, and metadata</li>
              <li>The script file you upload</li>
              <li>Generated embeddings and analysis data</li>
            </ul>

            <h2>Data Usage</h2>
            <p>Your data is used solely for:</p>
            <ul>
              <li>Generating script reviews and feedback</li>
              <li>Improving our review algorithms</li>
              <li>Communicating with you about your submission</li>
            </ul>

            <h2>Data Retention</h2>
            <p>
              <strong>80-Day Retention Policy:</strong> All submitted scripts, personal information, 
              and generated analysis are automatically deleted after 80 days from submission. 
              This includes:
            </p>
            <ul>
              <li>Original script files</li>
              <li>Text embeddings and chunks</li>
              <li>Review reports and analysis</li>
              <li>Personal information</li>
            </ul>

            <h2>Data Security</h2>
            <p>We implement industry-standard security measures including:</p>
            <ul>
              <li>Encrypted data transmission (HTTPS)</li>
              <li>Secure cloud storage with access controls</li>
              <li>Regular security audits and updates</li>
              <li>Limited access to authorized personnel only</li>
            </ul>

            <h2>Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Request deletion of your data before the 80-day period</li>
              <li>Access copies of your submitted data</li>
              <li>Correct any inaccurate personal information</li>
              <li>Withdraw consent for data processing</li>
            </ul>

            <h2>Contact</h2>
            <p>For privacy-related questions, contact us at privacy@scriptreview.com</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function TermsPage() {
  const { navigate } = useRouter();

  return (
    <div className="min-h-screen bg-zinc-50">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card title="Terms of Service">
          <div className="prose prose-zinc max-w-none">
            <h2>Service Description</h2>
            <p>
              Script Review provides automated analysis and feedback for film and video scripts, 
              with a focus on YouTube-first content and Nollywood storytelling conventions.
            </p>

            <h2>Acceptable Use</h2>
            <p>You agree to:</p>
            <ul>
              <li>Submit only original content or content you have rights to</li>
              <li>Provide accurate information in your submissions</li>
              <li>Use the service for legitimate creative purposes</li>
              <li>Respect intellectual property rights</li>
            </ul>

            <h2>Prohibited Content</h2>
            <p>Do not submit scripts containing:</p>
            <ul>
              <li>Illegal content or activities</li>
              <li>Hate speech or discriminatory content</li>
              <li>Explicit violence or graphic content</li>
              <li>Copyrighted material without permission</li>
            </ul>

            <h2>Review Process</h2>
            <p>
              Our AI-powered system analyzes scripts against industry rubrics and platform guidelines. 
              Reviews are generated automatically and may be supplemented by human reviewers. 
              We do not guarantee specific outcomes or acceptance by any platform or studio.
            </p>

            <h2>Intellectual Property</h2>
            <p>
              You retain all rights to your submitted scripts. We do not claim ownership of your content. 
              Our analysis and feedback are provided as a service and do not transfer any rights to us.
            </p>

            <h2>Limitation of Liability</h2>
            <p>
              Script Review provides feedback for educational and improvement purposes only. 
              We are not responsible for any decisions made based on our analysis or any 
              outcomes related to your script's development or distribution.
            </p>

            <h2>Service Availability</h2>
            <p>
              We strive to provide reliable service but do not guarantee 100% uptime. 
              We reserve the right to modify or discontinue the service with reasonable notice.
            </p>

            <h2>Changes to Terms</h2>
            <p>
              We may update these terms periodically. Continued use of the service constitutes 
              acceptance of any changes.
            </p>

            <h2>Contact</h2>
            <p>For questions about these terms, contact us at legal@scriptreview.com</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ----------------------------- Public App -----------------------------
function PublicApp() {
  const { currentPath } = useRouter();

  // Handle routing
  if (currentPath === '/privacy') {
    return <PrivacyPage />;
  }

  if (currentPath === '/terms') {
    return <TermsPage />;
  }

  if (currentPath === '/dashboard') {
    return (
      <div className="min-h-screen bg-zinc-50">
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
        <Features />
        
        <section id="submit" className="py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card 
              title="Submit Your Script" 
              description="Get professional feedback tailored to your target platform and audience"
            >
              <SubmissionForm />
            </Card>
          </div>
        </section>

        <StatusLookup />
        <FAQ />
      </main>

      <footer className="bg-zinc-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Script Review</h3>
              <p className="text-zinc-400">
                Professional script feedback powered by AI, designed for YouTube-first content and Nollywood storytelling.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-zinc-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#submit" className="hover:text-white transition-colors">Submit Script</a></li>
                <li><a href="#status" className="hover:text-white transition-colors">Check Status</a></li>
                <li><a href="/admin" className="hover:text-white transition-colors">Admin</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-zinc-400">
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-zinc-800 mt-8 pt-8 text-center text-zinc-400">
            <p>&copy; 2024 Script Review. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ----------------------------- Main App with Routing -----------------------------
function AppInner() {
  const { currentPath } = useRouter();

  // Simple routing based on pathname
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
