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

function Button({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cx(
        "px-4 py-2 rounded-2xl border border-zinc-200 shadow-sm",
        "bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50",
        className
      )}
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

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-xs">{children}</span>;
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

// ----------------------------- Home Hero -----------------------------
function Hero({ onStart }: { onStart: () => void }) {
  return (
    <section className="px-4">
      <div className="max-w-5xl mx-auto py-16 sm:py-24 text-center">
        <div className="inline-flex items-center gap-2 mb-4">
          <Tag>YouTube‑first</Tag>
          <Tag>Nollywood‑aware</Tag>
          <Tag>Actionable Notes</Tag>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">Submit your script. Get evidence‑based notes.</h1>
        <p className="mt-4 text-zinc-600 max-w-2xl mx-auto">
          Our agent reviews your script against studio rubrics and platform guidelines, then delivers a concise report with
          strengths, risks, and a prioritized action plan.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button onClick={onStart}>Start your review</Button>
          <a href="#status" className="px-4 py-2 rounded-2xl border border-zinc-300 bg-white hover:bg-zinc-50">Check status</a>
        </div>
      </div>
    </section>
  );
}

// ----------------------------- Submission Form -----------------------------
function SubmissionForm() {
  const [file, setFile] = useState<File | null>(null);
  const [writerName, setWriterName] = useState("");
  const [writerEmail, setWriterEmail] = useState("");
  const [scriptTitle, setScriptTitle] = useState("");
  const [format, setFormat] = useState("youtube_movie");
  const [draftVersion, setDraftVersion] = useState("1st");
  const [genre, setGenre] = useState("Drama");
  const [region, setRegion] = useState("NG");
  const [platform, setPlatform] = useState("YouTube");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ submissionId: string } | null>(null);
  const backend = useBackend();

  const fileHint = "PDF/DOCX/FDX • Max 20 MB";

  async function uploadToPresignedURL(url: string, file: File) {
    const res = await fetch(url, { 
      method: "PUT", 
      headers: { "Content-Type": file.type }, 
      body: file 
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) return setError("Please choose a script file.");
    if (!agree) return setError("Please agree to the terms.");
    if (file.size > 20 * 1024 * 1024) return setError("File too large (20 MB max).");
    
    setBusy(true);
    try {
      // Get presigned URL for script upload
      const presign = await backend.submissions.presignScript({
        filename: file.name,
        contentType: file.type || "application/pdf",
        size: file.size,
      });

      // Upload file to S3
      await uploadToPresignedURL(presign.uploadUrl, file);

      // Create submission
      const created = await backend.submissions.create({
        writer_name: writerName,
        writer_email: writerEmail,
        script_title: scriptTitle,
        format: format as any,
        draft_version: draftVersion as any,
        genre,
        region: region as any,
        platform: platform as any,
        file_s3_key: presign.s3Key,
      });

      // Start review process - pass submissionId as path parameter
      try {
        await backend.review.run({ submissionId: created.submissionId });
      } catch (err) {
        console.error("Failed to start review:", err);
        // Continue anyway - review can be started later
      }

      setSuccess({ submissionId: created.submissionId });
      setFile(null);
      
      // Reset form
      setWriterName("");
      setWriterEmail("");
      setScriptTitle("");
      setFormat("youtube_movie");
      setDraftVersion("1st");
      setGenre("Drama");
      setRegion("NG");
      setPlatform("YouTube");
      setAgree(false);
      
    } catch (e: any) {
      console.error("Submission error:", e);
      setError(e.message || "Failed to submit script");
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
        <h3 className="text-lg font-semibold">Submitted 🎬</h3>
        <p className="text-sm text-zinc-700 mt-1">
          Your submission ID is <span className="font-mono font-semibold">{success.submissionId}</span>.
          Save this ID to check status and read your notes.
        </p>
        <div className="mt-4 flex gap-3">
          <a href="#status" className="px-4 py-2 rounded-2xl border bg-white">Go to Status</a>
          <Button onClick={async () => {
            const ok = await safeCopyToClipboard(success.submissionId);
            if (!ok) alert('Copy failed. Select the text and press Ctrl/Cmd+C.');
          }}>Copy ID</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label htmlFor="writer-name" className="block text-sm text-zinc-600 mb-1">Writer Name</label>
        <Input id="writer-name" value={writerName} onChange={(e) => setWriterName(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="writer-email" className="block text-sm text-zinc-600 mb-1">Writer Email</label>
        <Input id="writer-email" type="email" value={writerEmail} onChange={(e) => setWriterEmail(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="script-title" className="block text-sm text-zinc-600 mb-1">Script Title</label>
        <Input id="script-title" value={scriptTitle} onChange={(e) => setScriptTitle(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="format" className="block text-sm text-zinc-600 mb-1">Format</label>
        <Select id="format" value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="youtube_movie">YouTube Movie</option>
          <option value="feature">Feature</option>
          <option value="series">Series</option>
        </Select>
      </div>
      <div>
        <label htmlFor="draft-version" className="block text-sm text-zinc-600 mb-1">Draft Version</label>
        <Select id="draft-version" value={draftVersion} onChange={(e) => setDraftVersion(e.target.value)}>
          <option value="1st">1st</option>
          <option value="2nd">2nd</option>
          <option value="3rd">3rd</option>
        </Select>
      </div>
      <div>
        <label htmlFor="genre" className="block text-sm text-zinc-600 mb-1">Genre</label>
        <Input id="genre" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Drama" />
      </div>
      <div>
        <label htmlFor="region" className="block text-sm text-zinc-600 mb-1">Region</label>
        <Select id="region" value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="NG">NG</option>
          <option value="GLOBAL">GLOBAL</option>
          <option value="KE">KE</option>
          <option value="GH">GH</option>
          <option value="ZA">ZA</option>
        </Select>
      </div>
      <div>
        <label htmlFor="platform" className="block text-sm text-zinc-600 mb-1">Platform</label>
        <Select id="platform" value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option value="YouTube">YouTube</option>
          <option value="Cinema">Cinema</option>
          <option value="VOD">VOD</option>
          <option value="TV">TV</option>
        </Select>
      </div>
      <div className="md:col-span-2">
        <label htmlFor="script-file" className="block text-sm text-zinc-600 mb-1">
          Script File <span className="text-zinc-400">({fileHint})</span>
        </label>
        <Input id="script-file" type="file" accept=".pdf,.docx,.fdx,.txt" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </div>
      <div className="md:col-span-2 flex items-center gap-2">
        <input 
          id="agree" 
          type="checkbox" 
          className="h-4 w-4" 
          checked={agree} 
          onChange={(e) => setAgree(e.target.checked)} 
        />
        <label htmlFor="agree" className="text-sm text-zinc-600">
          I agree to the <a href="/privacy" className="text-zinc-900 hover:underline">80‑day data retention policy</a> and the <a href="/terms" className="text-zinc-900 hover:underline">review terms</a>.
        </label>
      </div>
      <div className="md:col-span-2 flex items-center gap-3">
        <Button disabled={busy}>{busy ? "Submitting…" : "Submit for Review"}</Button>
        {error && <ValidationMessage type="error" message={error} />}
      </div>
    </form>
  );
}

// ----------------------------- Status / Notes -----------------------------
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
      const r = await backend.review.getReport({ submissionId });
      setReport(r);
    } catch (e: any) {
      console.error("Failed to fetch report:", e);
      setError("Not ready yet or ID not found. Try again later.");
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

  const view = useMemo(() => report?.report_json || null, [report]);

  return (
    <section id="status" className="px-4">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Check status & read notes</h3>
          <form onSubmit={fetchReport} className="flex gap-3 mt-3">
            <Input 
              placeholder="Enter your submission ID" 
              value={submissionId} 
              onChange={(e) => setSubmissionId(e.target.value)} 
              required 
              aria-label="Submission ID"
            />
            <Button disabled={loading}>{loading ? "Loading..." : "Load"}</Button>
          </form>
          {loading && <p className="mt-3 text-sm text-zinc-600">Loading…</p>}
          {error && <ValidationMessage type="error" message={error} className="mt-3" />}

          {view && (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Executive Summary</h4>
                {Array.isArray(view.highlights) && view.highlights.length > 0 ? (
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {view.highlights.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                ) : <p className="text-sm text-zinc-500">No summary provided yet.</p>}

                <h4 className="font-semibold mt-6 mb-2">Key Risks</h4>
                {Array.isArray(view.risks) && view.risks.length > 0 ? (
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {view.risks.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                ) : <p className="text-sm text-zinc-500">—</p>}

                <div className="mt-6 text-sm text-zinc-600">
                  {typeof report?.overall_score === 'number' && (
                    <p><span className="font-semibold">Overall Score:</span> {report.overall_score.toFixed(1)}</p>
                  )}
                  {retentionInfo !== null && (
                    <p className="mt-1"><span className="font-semibold">Auto‑purge:</span> {retentionInfo} days remaining</p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Prioritized Action Plan</h4>
                {Array.isArray(view.action_plan) && view.action_plan.length > 0 ? (
                  <div className="space-y-2">
                    {view.action_plan.map((p: any, i: number) => (
                      <div key={i} className="rounded-xl border p-3 flex items-center justify-between">
                        <span className="text-sm">{p.description}</span>
                        <Tag>{String(p.priority || '').toUpperCase()}</Tag>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-zinc-500">—</p>}

                {view?.delivery?.pdf_uri && (
                  <a
                    href={view.delivery.pdf_uri}
                    className="mt-4 inline-block px-4 py-2 rounded-2xl border bg-white"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download PDF
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ----------------------------- FAQ -----------------------------
function FAQ() {
  const items = [
    { q: "What file types do you accept?", a: "PDF, DOCX, FDX, or TXT up to 20 MB." },
    { q: "How are notes generated?", a: "We reference your script against internal rubrics and platform/style guides, then synthesize findings and an action plan." },
    { q: "Will a human review my notes?", a: "An optional reviewer may refine the AI notes before delivery, depending on your plan." },
    { q: "How long is my data kept?", a: "Scripts and derived embeddings are kept up to 80 days, after which they are purged." },
  ];
  
  return (
    <section className="px-4">
      <div className="max-w-5xl mx-auto py-12">
        <h3 className="text-xl font-semibold">FAQ</h3>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((it, i) => (
            <div key={i} className="rounded-2xl border bg-white p-4">
              <p className="font-medium">{it.q}</p>
              <p className="text-sm text-zinc-600 mt-1">{it.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ----------------------------- Privacy & Terms Pages -----------------------------
function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold mb-6">Privacy Policy & Data Retention</h1>
        
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
      </div>
    </div>
  );
}

function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold mb-6">Terms of Service</h1>
        
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
      </div>
    </div>
  );
}

// ----------------------------- Public App -----------------------------
function PublicApp() {
  const [started, setStarted] = useState(false);
  const { user, logout } = useAuth();
  const { currentPath, navigate } = useRouter();

  // Handle routing
  if (currentPath === '/privacy') {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900">
        <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white border-b border-zinc-200">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <button onClick={() => navigate('/')} className="text-xl font-bold hover:text-zinc-600">
                Script Review
              </button>
            </div>
            <div className="flex items-center gap-3">
              <a href="/" className="px-4 py-1.5 rounded-2xl text-sm border hover:bg-zinc-50">Home</a>
            </div>
          </div>
        </header>
        <PrivacyPage />
      </div>
    );
  }

  if (currentPath === '/terms') {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900">
        <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white border-b border-zinc-200">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <button onClick={() => navigate('/')} className="text-xl font-bold hover:text-zinc-600">
                Script Review
              </button>
            </div>
            <div className="flex items-center gap-3">
              <a href="/" className="px-4 py-1.5 rounded-2xl text-sm border hover:bg-zinc-50">Home</a>
            </div>
          </div>
        </header>
        <TermsPage />
      </div>
    );
  }

  if (currentPath === '/dashboard' && user) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900">
        <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white border-b border-zinc-200">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <button onClick={() => navigate('/')} className="text-xl font-bold hover:text-zinc-600">
                Script Review
              </button>
              <p className="text-xs text-zinc-600">YouTube‑first • Evidence‑based notes • Nollywood‑aware</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-600">Welcome, {user.name}</span>
              <Button onClick={logout} className="px-3 py-1 text-sm">Logout</Button>
            </div>
          </div>
        </header>
        <UserDashboard />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Script Review</h1>
            <p className="text-xs text-zinc-600">YouTube‑first • Evidence‑based notes • Nollywood‑aware</p>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <a href="#status" className="px-4 py-1.5 rounded-2xl text-sm border hover:bg-zinc-50">Status</a>
            <a href="#submit" className="px-4 py-1.5 rounded-2xl text-sm border hover:bg-zinc-50">Submit</a>
            {user ? (
              <>
                <button onClick={() => navigate('/dashboard')} className="px-4 py-1.5 rounded-2xl text-sm border hover:bg-zinc-50">
                  Dashboard
                </button>
                <Button onClick={logout} className="px-3 py-1 text-sm">Logout</Button>
              </>
            ) : (
              <LoginForm showRegister={true} />
            )}
            <a href="/admin" className="px-4 py-1.5 rounded-2xl text-sm border hover:bg-zinc-50">Admin</a>
          </div>
        </div>
      </header>

      {!started && <Hero onStart={() => setStarted(true)} />}

      <section id="submit" className="px-4">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Submit your script</h3>
            <p className="text-sm text-zinc-600 mt-1">Focus: YouTube movies. We'll tailor feedback to platform retention and audience fit.</p>
            <div className="mt-4">
              <SubmissionForm />
            </div>
          </div>
        </div>
      </section>

      <StatusLookup />
      <FAQ />

      <footer className="max-w-6xl mx-auto px-4 py-10 text-xs text-zinc-500">
        <div className="flex justify-between items-center">
          <p>By submitting, you agree to an 80‑day retention policy and our respectful‑use terms.</p>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:text-zinc-700">Privacy Policy</a>
            <a href="/terms" className="hover:text-zinc-700">Terms of Service</a>
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
