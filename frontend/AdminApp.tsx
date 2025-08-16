import React, { useEffect, useMemo, useState } from "react";
import backend from "~backend/client";

// ----------------------------- Utilities -----------------------------
async function uploadToPresignedURL(url: string, file: File) {
  const res = await fetch(url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
}

function cx(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

// ----------------------------- UI Primitives -----------------------------
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
    setBusy(true);
    try {
      const presign = await backend.admin.presignDoc({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
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

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card title="Upload Documentation" desc="Guidelines, rubrics, platform notes. Versioned & vectorized on complete.">
        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-zinc-600">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Feature Rubric v3.1 (NG)" required />
          </div>
          <div>
            <label className="text-sm text-zinc-600">Version</label>
            <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="3.1" required />
          </div>
          <div>
            <label className="text-sm text-zinc-600">Doc Type</label>
            <Select value={docType} onChange={(e) => setDocType(e.target.value)}>
              <option value="rubric">Rubric</option>
              <option value="style">Style</option>
              <option value="platform">Platform</option>
              <option value="legal">Legal</option>
              <option value="playbook">Playbook</option>
              <option value="other">Other</option>
            </Select>
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
          <div>
            <label className="text-sm text-zinc-600">Tags (comma-separated)</label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm text-zinc-600">File</label>
            <Input type="file" accept=".pdf,.docx,.md,.txt" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <Button disabled={busy}>{busy ? "Uploading…" : "Upload & Vectorize"}</Button>
            {error && <span className="text-sm text-red-600">{error}</span>}
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
                  <td className="py-2">{d.status}</td>
                  <td className="py-2">{new Date(d.updated_at).toLocaleString()}</td>
                </tr>
              ))}
              {docs.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-zinc-500">
                    No docs yet. Upload above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ----------------------------- Submissions Tab -----------------------------
function SubmissionsTab() {
  const [file, setFile] = useState<File | null>(null);
  const [writerName, setWriterName] = useState("");
  const [writerEmail, setWriterEmail] = useState("");
  const [scriptTitle, setScriptTitle] = useState("");
  const [format, setFormat] = useState("youtube_movie");
  const [draftVersion, setDraftVersion] = useState("1st");
  const [genre, setGenre] = useState("Drama");
  const [region, setRegion] = useState("NG");
  const [platform, setPlatform] = useState("YouTube");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) return setError("Please choose a script file.");
    setBusy(true);
    try {
      // 1) presign for script
      const presign = await backend.submissions.presignScript({
        filename: file.name,
        contentType: file.type || "application/pdf",
      });

      await uploadToPresignedURL(presign.uploadUrl, file);

      // 2) create submission
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

      // 3) kick review immediately
      try {
        await backend.review.run({ submissionId: created.submissionId });
      } catch (err) {
        console.error("Failed to start review:", err);
        // Continue anyway - review can be started later
      }

      setSubmissionId(created.submissionId);
      setFile(null);
      setWriterName("");
      setWriterEmail("");
      setScriptTitle("");
      setGenre("Drama");
    } catch (e: any) {
      console.error("Submission error:", e);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (submissionId) {
    return (
      <div className="grid grid-cols-1 gap-6">
        <Card title="Submission Created" desc="Review process has been started">
          <div className="space-y-4">
            <p className="text-sm">
              Submission ID: <span className="font-mono font-semibold">{submissionId}</span>
            </p>
            <div className="flex gap-3">
              <Button onClick={() => navigator.clipboard.writeText(submissionId)}>Copy ID</Button>
              <Button 
                className="bg-white text-zinc-900 border" 
                onClick={() => setSubmissionId(null)}
              >
                Create Another
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card title="New Submission" desc="Upload script and kick off the review">
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
            <Input value={genre} onChange={(e) => setGenre(e.target.value)} />
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
            <label className="text-sm text-zinc-600">Script File</label>
            <Input type="file" accept=".pdf,.docx,.fdx,.txt" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <Button disabled={busy}>{busy ? "Submitting…" : "Submit & Run Review"}</Button>
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </form>
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
          <Input placeholder="submission-id" value={submissionId} onChange={(e) => setSubmissionId(e.target.value)} required />
          <Button disabled={loading}>{loading ? "Loading..." : "Load"}</Button>
        </form>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
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
            <Textarea rows={5} placeholder="Edit or supplement recommendations… (wire to a PATCH /reports/:id later)" value={editorNotes} onChange={(e) => setEditorNotes(e.target.value)} />
            <div className="mt-3 flex gap-2">
              <Button onClick={() => navigator.clipboard.writeText(editorNotes)}>Copy Notes</Button>
              <Button className="bg-white text-zinc-900 border" onClick={() => setEditorNotes("")}>Clear</Button>
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

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Script Review Admin</h1>
            <p className="text-xs text-zinc-600">YouTube‑first • All agents enabled • 80‑day retention</p>
          </div>
          <Tabs value={tab} onChange={setTab} />
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
