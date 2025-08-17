import React, { useEffect, useState } from "react";
import { useBackend } from "./AuthProvider";
import ValidationMessage from "./ValidationMessage";

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

function Button({ children, className, variant = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }) {
  const baseClasses = "px-4 py-2 rounded-2xl border shadow-sm disabled:opacity-50";
  const variantClasses = {
    primary: "border-zinc-200 bg-zinc-900 text-white hover:bg-zinc-800",
    secondary: "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50",
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className || ""}`}
      {...props}
    >
      {children}
    </button>
  );
}

function Tag({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "success" | "warning" | "error" }) {
  const baseClasses = "px-2 py-0.5 rounded-full text-xs";
  const variantClasses = {
    default: "bg-zinc-100 text-zinc-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-yellow-100 text-yellow-700",
    error: "bg-red-100 text-red-700",
  };

  return (
    <span className={`${baseClasses} ${variantClasses[variant]}`}>
      {children}
    </span>
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

export default function UserDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const backend = useBackend();

  useEffect(() => {
    loadSubmissions();
  }, []);

  async function loadSubmissions() {
    try {
      setError(null);
      const response = await backend.submissions.listUserSubmissions();
      setSubmissions(response.items);
    } catch (e: any) {
      console.error("Failed to load submissions:", e);
      setError(e.message || "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }

  async function viewReport(submissionId: string) {
    try {
      const report = await backend.review.getReport({ submissionId });
      // Open report in new tab or modal
      console.log("Report:", report);
      // For now, just alert - in production, show in modal or navigate
      alert(`Report loaded for submission ${submissionId}. Check console for details.`);
    } catch (e: any) {
      console.error("Failed to load report:", e);
      alert("Report not ready yet or failed to load");
    }
  }

  function getStatusVariant(status: string): "default" | "success" | "warning" | "error" {
    switch (status) {
      case "completed": return "success";
      case "processing": return "warning";
      case "failed": return "error";
      default: return "default";
    }
  }

  function getStatusText(status: string): string {
    switch (status) {
      case "queued": return "Pending";
      case "processing": return "In Review";
      case "completed": return "Ready";
      case "failed": return "Failed";
      default: return status;
    }
  }

  function getDueDate(createdAt: string): string {
    const created = new Date(createdAt);
    const due = new Date(created.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    return due.toLocaleDateString();
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-center py-12">
          <p className="text-zinc-600">Loading your submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Card title="My Submissions" desc="Track your script reviews and access reports">
        {error && (
          <ValidationMessage type="error" message={error} className="mb-4" />
        )}
        
        {submissions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-zinc-500 mb-4">No submissions yet</p>
            <Button onClick={() => window.location.href = "/#submit"}>
              Submit Your First Script
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-600 border-b">
                  <th className="py-3 font-medium">Script Title</th>
                  <th className="py-3 font-medium">Format</th>
                  <th className="py-3 font-medium">Status</th>
                  <th className="py-3 font-medium">Submitted</th>
                  <th className="py-3 font-medium">Due Date</th>
                  <th className="py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => (
                  <tr key={submission.id} className="border-b border-zinc-100">
                    <td className="py-3">
                      <div>
                        <p className="font-medium">{submission.script_title}</p>
                        <p className="text-xs text-zinc-500">
                          {submission.draft_version} draft • {submission.genre}
                        </p>
                      </div>
                    </td>
                    <td className="py-3">
                      <Tag>{submission.format}</Tag>
                    </td>
                    <td className="py-3">
                      <Tag variant={getStatusVariant(submission.status)}>
                        {getStatusText(submission.status)}
                      </Tag>
                    </td>
                    <td className="py-3 text-zinc-600">
                      {new Date(submission.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-zinc-600">
                      {getDueDate(submission.created_at)}
                    </td>
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
                        {submission.status === "failed" && (
                          <Button
                            variant="secondary"
                            className="px-3 py-1 text-xs"
                            onClick={() => {
                              // Retry review
                              backend.review.run({ submissionId: submission.id })
                                .then(() => {
                                  alert("Review restarted");
                                  loadSubmissions();
                                })
                                .catch((e) => alert("Failed to restart review: " + e.message));
                            }}
                          >
                            Retry
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
