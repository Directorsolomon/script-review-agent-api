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
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className || ""}`}
      {...props}
    >
      {children}
    </button>
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

function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-200 border-t-gray-900 ${sizeClasses[size]}`} />
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

export default function UserDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
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

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-600">Loading your submissions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Track your script submissions and access your reviews</p>
      </div>

      <Card 
        title="Script Submissions" 
        description={`${submissions.length} total submission${submissions.length !== 1 ? 's' : ''}`}
        actions={
          <Button onClick={() => window.location.href = "/#submit"} size="sm">
            Submit New Script
          </Button>
        }
      >
        {error && (
          <ValidationMessage type="error" message={error} className="mb-6" />
        )}
        
        {submissions.length === 0 ? (
          <EmptyState
            title="No submissions yet"
            description="Submit your first script to get professional feedback and actionable recommendations."
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
