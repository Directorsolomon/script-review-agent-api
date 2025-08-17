import React, { useMemo, useState } from "react";
import { useRouter } from "./components/Router";
import Navigation from "./components/Navigation";
import ValidationMessage from "./components/ValidationMessage";
import Button from "./components/Button";
import LoadingSpinner from "./components/LoadingSpinner";
import backend from "~backend/client";

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

function SuccessMessage({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-3">
        <div className="text-green-600">✓</div>
        <p className="text-sm text-green-700">{message}</p>
        <button
          onClick={onClose}
          className="text-green-400 hover:text-green-600 ml-auto"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
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
          <Button size="lg" onClick={() => navigate('#submit')}>
            Submit Your Script
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate('#status')}>
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    
    if (!formData.writerName.trim()) {
      newErrors.writerName = "Writer name is required";
    }
    
    if (!formData.writerEmail.trim()) {
      newErrors.writerEmail = "Email is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.writerEmail)) {
        newErrors.writerEmail = "Please enter a valid email address";
      }
    }
    
    if (!formData.scriptTitle.trim()) {
      newErrors.scriptTitle = "Script title is required";
    }
    
    if (!formData.file) {
      newErrors.file = "Please choose a script file";
    } else {
      if (formData.file.size > 20 * 1024 * 1024) {
        newErrors.file = "File too large (20 MB max)";
      }
      
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain',
        'application/x-fdx'
      ];
      
      if (!allowedTypes.includes(formData.file.type) && !formData.file.name.match(/\.(pdf|docx|doc|fdx|txt)$/i)) {
        newErrors.file = "Unsupported file type. Please use PDF, DOCX, DOC, FDX, or TXT files.";
      }
    }
    
    if (!formData.agree) {
      newErrors.agree = "Please agree to the terms";
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
        writer_name: formData.writerName.trim(),
        writer_email: formData.writerEmail.trim(),
        script_title: formData.scriptTitle.trim(),
        format: formData.format as any,
        draft_version: formData.draftVersion as any,
        genre: formData.genre.trim() || undefined,
        region: formData.region as any,
        platform: formData.platform as any,
        file_s3_key: presign.s3Key,
      });

      // Start the review process
      try {
        await backend.review.run({ submissionId: created.submissionId });
      } catch (err) {
        console.error("Failed to start review:", err);
        // Don't fail the submission if review start fails - user can retry later
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
      
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
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
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="text-green-600 text-2xl">✓</div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Script Submitted Successfully!</h3>
          <p className="text-gray-600">
            Your script has been uploaded and the review process has started.
          </p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-6 mb-8 max-w-md mx-auto">
          <p className="text-sm text-gray-600 mb-2">Your submission ID:</p>
          <code className="text-sm font-mono text-gray-900 bg-white px-3 py-2 rounded border">
            {success.submissionId}
          </code>
          <p className="text-xs text-gray-500 mt-2">
            Save this ID to check your review status later
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => window.location.href = "#status"}>
            Check Status
          </Button>
          <Button 
            variant="outline"
            onClick={async () => {
              const ok = await safeCopyToClipboard(success.submissionId);
              if (ok) {
                setSuccessMessage("Submission ID copied to clipboard!");
                setTimeout(() => setSuccessMessage(null), 3000);
              } else {
                alert('Copy failed. Please select the ID and copy manually.');
              }
            }}
          >
            Copy ID
          </Button>
        </div>
        
        {successMessage && (
          <div className="mt-4">
            <SuccessMessage 
              message={successMessage} 
              onClose={() => setSuccessMessage(null)} 
            />
          </div>
        )}
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
            accept=".pdf,.docx,.doc,.fdx,.txt"
            onChange={(e) => updateFormData('file', e.target.files?.[0] || null)}
            error={!!errors.file}
          />
          <p className="text-sm text-gray-500">
            Supported formats: PDF, DOCX, DOC, FDX, TXT • Maximum size: 20 MB
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
            I agree to the data retention policy and terms of service. My script will be processed for review purposes only.
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
  const [retrying, setRetrying] = useState(false);

  function validateSubmissionId(id: string): boolean {
    // Basic UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id.trim());
  }

  async function fetchReport(e: React.FormEvent) {
    e.preventDefault();
    
    const trimmedId = submissionId.trim();
    
    if (!trimmedId) {
      setError("Please enter a submission ID");
      return;
    }
    
    if (!validateSubmissionId(trimmedId)) {
      setError("Please enter a valid submission ID (should be in UUID format)");
      return;
    }
    
    setError(null);
    setReport(null);
    setLoading(true);
    
    try {
      const r = await backend.review.getReport({ submissionId: trimmedId });
      setReport(r);
    } catch (e: any) {
      console.error("Failed to fetch report:", e);
      setError("Report not found or not ready yet. Please check your submission ID and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function retryReview() {
    if (!submissionId.trim()) return;
    
    setRetrying(true);
    try {
      await backend.review.run({ submissionId: submissionId.trim() });
      setError(null);
      // Wait a moment then try to fetch the report again
      setTimeout(() => {
        fetchReport(new Event('submit') as any);
      }, 2000);
    } catch (e: any) {
      console.error("Failed to retry review:", e);
      setError("Failed to restart review: " + e.message);
    } finally {
      setRetrying(false);
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
                  placeholder="Enter your submission ID (e.g., 123e4567-e89b-12d3-a456-426614174000)"
                  value={submissionId}
                  onChange={(e) => {
                    setSubmissionId(e.target.value);
                    if (error) setError(null);
                  }}
                  required
                  error={!!error}
                />
              </div>
              <Button type="submit" disabled={loading || !submissionId.trim()}>
                {loading ? <LoadingSpinner size="sm" /> : "Check Status"}
              </Button>
            </div>
            
            {error && (
              <div className="space-y-3">
                <ValidationMessage type="error" message={error} />
                {error.includes("not ready yet") && (
                  <div className="text-center">
                    <Button 
                      variant="outline" 
                      onClick={retryReview}
                      disabled={retrying || !submissionId.trim()}
                    >
                      {retrying ? <LoadingSpinner size="sm" /> : "Retry Review"}
                    </Button>
                  </div>
                )}
              </div>
            )}
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
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">•</span>
                          <span>{highlight}</span>
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
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-orange-600 mt-0.5">•</span>
                          <span>{risk}</span>
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
                        <div className="flex items-start gap-3">
                          <span className={cx(
                            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                            action.priority === 'high' && "bg-red-100 text-red-800",
                            action.priority === 'med' && "bg-yellow-100 text-yellow-800",
                            action.priority === 'low' && "bg-green-100 text-green-800"
                          )}>
                            {action.priority?.toUpperCase() || 'MED'}
                          </span>
                          <p className="text-sm text-gray-700 flex-1">{action.description}</p>
                        </div>
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
export default function PublicApp() {
  const { currentPath, navigate } = useRouter();

  return (
    <div className="min-h-screen bg-white">
      <Navigation currentPath={currentPath} navigate={navigate} />
      
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
