import React, { useEffect, useState } from "react";
import ValidationMessage from "./ValidationMessage";
import Button from "./Button";
import LoadingSpinner from "./LoadingSpinner";
import backend from "~backend/client";

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

function EmptyState({ title, description, action }: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">{description}</p>
      {action}
    </div>
  );
}

function Input({ error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  function cx(...classes: (string | false | undefined | null)[]) {
    return classes.filter(Boolean).join(" ");
  }

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

export default function UserDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [emailFilter, setEmailFilter] = useState("");

  useEffect(() => {
    setLoading(false);
  }, []);

  async function loadSubmissions() {
    if (!emailFilter.trim()) {
      setSubmissions([]);
      return;
    }

    setLoading(true);
    try {
      setError(null);
      const response = await backend.submissions.listUserSubmissions({
        writer_email: emailFilter.trim(),
      });
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
      
      const reportWindow = window.open('', '_blank');
      if (reportWindow) {
        reportWindow.document.write(`
          <html>
            <head>
              <title>Script Review Report</title>
              <style>
                body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.6; }
                .score { font-size: 24px; font-weight: bold; color: #374151; margin-bottom: 30px; }
                .section { margin: 30px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }
                h1 { color: #111827; margin-bottom: 30px; }
                h2 { color: #374151; margin-bottom: 15px; }
                ul { padding-left: 20px; }
                li { margin-bottom: 8px; color: #4b5563; }
              </style>
            </head>
            <body>
              <h1>Script Review Report</h1>
              <div class="score">Overall Score: ${report.overall_score?.toFixed(1) || 'N/A'}/10</div>
              <div class="section">
                <h2>Strengths</h2>
                <ul>
                  ${(report.report_json?.highlights || []).map((h: string) => `<li>${h}</li>`).join('')}
                </ul>
              </div>
              <div class="section">
                <h2>Areas for Improvement</h2>
                <ul>
                  ${(report.report_json?.risks || []).map((r: string) => `<li>${r}</li>`).join('')}
                </ul>
              </div>
              <div class="section">
                <h2>Action Plan</h2>
                <ul>
                  ${(report.report_json?.action_plan || []).map((a: any) => `<li><strong>[${a.priority?.toUpperCase()}]</strong> ${a.description}</li>`).join('')}
                </ul>
              </div>
            </body>
          </html>
        `);
        reportWindow.document.close();
      }
    } catch (e: any) {
      console.error("Failed to load report:", e);
      alert("Report not ready yet or failed to load. Please try again later.");
    }
  }

  async function retryReview(submissionId: string) {
    setRetryingId(submissionId);
    try {
      await backend.review.run({ submissionId });
      alert("Review restarted successfully!");
      await loadSubmissions();
    } catch (e: any) {
      console.error("Failed to restart review:", e);
      alert("Failed to restart review: " + e.message);
    } finally {
      setRetryingId(null);
    }
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

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Track your script submissions and access your reviews</p>
      </div>

      <Card 
        title="Script Submissions" 
        description="Enter your email address to view your submissions"
        actions={
          <Button onClick={() => window.location.href = "/#submit"} size="sm">
            Submit New Script
          </Button>
        }
      >
        <div className="mb-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                type="email"
                placeholder="Enter your email address"
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
              />
            </div>
            <Button onClick={loadSubmissions} disabled={loading || !emailFilter.trim()}>
              {loading ? <LoadingSpinner size="sm" /> : "Load Submissions"}
            </Button>
          </div>
        </div>

        {error && (
          <ValidationMessage type="error" message={error} className="mb-6" />
        )}
        
        {!emailFilter.trim() ? (
          <EmptyState
            title="Enter your email to view submissions"
            description="Please enter the email address you used when submitting your scripts to view your submission history and reports."
          />
        ) : submissions.length === 0 && !loading ? (
          <EmptyState
            title="No submissions found"
            description="No submissions found for this email address. Submit your first script to get professional feedback and actionable recommendations."
            action={
              <Button onClick={() => window.location.href = "/#submit"}>
                Submit Your First Script
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-sm font-medium text-gray-600 border-b border-gray-200">
                    <th className="pb-3">Script</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Submitted</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {submissions.map((submission) => (
                    <tr key={submission.id} className="group hover:bg-gray-50">
                      <td className="py-4">
                        <div>
                          <p className="font-medium text-gray-900">{submission.script_title}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {submission.format} • {submission.draft_version} • {submission.genre || 'No genre'}
                          </p>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="text-sm text-gray-600">
                          {getStatusText(submission.status)}
                        </span>
                      </td>
                      <td className="py-4 text-sm text-gray-600">
                        {formatDate(submission.created_at)}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          {submission.status === "completed" && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => viewReport(submission.id)}
                            >
                              View Report
                            </Button>
                          )}
                          {submission.status === "failed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => retryReview(submission.id)}
                              disabled={retryingId === submission.id}
                            >
                              {retryingId === submission.id ? <LoadingSpinner size="sm" /> : "Retry"}
                            </Button>
                          )}
                          {submission.status === "processing" && (
                            <span className="text-sm text-gray-500">Processing...</span>
                          )}
                          {submission.status === "queued" && (
                            <span className="text-sm text-gray-500">In queue</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
