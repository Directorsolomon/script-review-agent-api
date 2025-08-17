import React, { useMemo, useState } from "react";
import backend from "~backend/client";
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
        <label className="text-sm text-zinc-600">Writer Name</label>
        <Input value={writerName} onChange={(e) => setWriterName(e.target.value)} required />
      </div>
      <div>
        <label className="text-sm text-zinc-600">Writer Email</label>
        <Input type="email" value={writerEmail} onChange={(e) => setWriterEmail(e.target.value)} required />
      </div>
      <div>
        <label className="text-sm text-zinc-600">Script Title</label>
        <Input value={scriptTitle} onChange={(e) => setScriptTitle(e.target.value)} required />
      </div>
      <div>
        <label className="text-sm text-zinc-600">Format</label>
        <Select value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="youtube_movie">YouTube Movie</option>
          <option value="feature">Feature</option>
          <option value="series">Series</option>
        </Select>
      </div>
      <div>
        <label className="text-sm text-zinc-600">Draft Version</label>
        <Select value={draftVersion} onChange={(e) => setDraftVersion(e.target.value)}>
          <option value="1st">1st</option>
          <option value="2nd">2nd</option>
          <option value="3rd">3rd</option>
        </Select>
      </div>
      <div>
        <label className="text-sm text-zinc-600">Genre</label>
        <Input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Drama" />
      </div>
      <div>
        <label className="text-sm text-zinc-600">Region</label>
        <Select value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="NG">NG</option>
          <option value="GLOBAL">GLOBAL</option>
          <option value="KE">KE</option>
          <option value="GH">GH</option>
          <option value="ZA">ZA</option>
        </Select>
      </div>
      <div>
        <label className="text-sm text-zinc-600">Platform</label>
        <Select value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option value="YouTube">YouTube</option>
          <option value="Cinema">Cinema</option>
          <option value="VOD">VOD</option>
          <option value="TV">TV</option>
        </Select>
      </div>
      <div className="md:col-span-2">
        <label className="text-sm text-zinc-600">Script File <span className="text-zinc-400">({fileHint})</span></label>
        <Input type="file" accept=".pdf,.docx,.fdx,.txt" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </div>
      <div className="md:col-span-2 flex items-center gap-2">
        <input id="agree" type="checkbox" className="h-4 w-4" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <label htmlFor="agree" className="text-sm text-zinc-600">I agree to the 80‑day data retention policy and the review terms.</label>
      </div>
      <div className="md:col-span-2 flex items-center gap-3">
        <Button disabled={busy}>{busy ? "Submitting…" : "Submit for Review"}</Button>
        {error && <span className="text-sm text-red-600">{error}</span>}
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
            />
            <Button disabled={loading}>Load</Button>
          </form>
          {loading && <p className="mt-3 text-sm text-zinc-600">Loading…</p>}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

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

// ----------------------------- Public App -----------------------------
function PublicApp() {
  const [started, setStarted] = useState(false);

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
        <p>By submitting, you agree to an 80‑day retention policy and our respectful‑use terms.</p>
      </footer>
    </div>
  );
}

// ----------------------------- Main App with Routing -----------------------------
export default function App() {
  const { currentPath, navigate } = useRouter();

  // Simple routing based on pathname
  if (currentPath.startsWith('/admin')) {
    return <AdminApp />;
  }

  return <PublicApp />;
}
