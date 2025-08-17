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
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className || ""}`}
      {...props}
    >
      {children}
    </button>
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
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]}`}>
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

function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 ${sizeClasses[size]}`} />
  );
}

function EmptyState({ title, description, action }: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-4">📝</div>
      <h3 className="text-lg font-semibold text-zinc-900 mb-2">{title}</h3>
      <p className="text-zinc-600 mb-6 max-w-md mx-auto">{description}</p>
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
      // In a real app, this would open a modal or navigate to a report page
      console.log("Report:", report);
      
      // Create a simple report display
      const reportWindow = window.open('', '_blank');
      if (reportWindow) {
        reportWindow.document.write(`
          <html>
            <head>
              <title>Script Review Report</title>
              <style>
                body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                .score { font-size: 24px; font-weight: bold; color: #059669; }
                .section { margin: 20px 0; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }
                .highlight { color: #059669; }
                .risk { color: #dc2626; }
                ul { padding-left: 20px; }
              </style>
            </head>
            <body>
              <h1>Script Review Report</h1>
              <div class="score">Overall Score: ${report.overall_score?.toFixed(1) || 'N/A'}/10</div>
              <div class="section">
                <h2>Strengths</h2>
                <ul>
                  ${(report.report_json?.highlights || []).map((h: string) => `<li class="highlight">${h}</li>`).join('')}
                </ul>
              </div>
              <div class="section">
                <h2>Areas for Improvement</h2>
                <ul>
                  ${(report.report_json?.risks || []).map((r: string) => `<li class="risk">${r}</li>`).join('')}
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

  function getStatusVariant(status: string): "default" | "success" | "warning" | "error" | "info" {
    switch (status) {
      case "completed": return "success";
      case "processing": return "info";
      case "failed": return "error";
      case "queued": return "warning";
      default: return "default";
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

  function getStatusIcon(status: string): string {
    switch (status) {
      case "completed": return "✅";
      case "processing": return "⏳";
      case "failed": return "❌";
      case "queued": return "⏸️";
      default: return "❓";
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

  function getExpectedCompletion(createdAt: string): string {
    const created = new Date(createdAt);
    const expected = new Date(created.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    const now = new Date();
    
    if (expected < now) {
      return "Overdue";
    }
    
    const hoursLeft = Math.ceil((expected.getTime() - now.getTime()) / (1000 * 60 * 60));
    return `~${hoursLeft}h remaining`;
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-zinc-600">Loading your submissions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">My Dashboard</h1>
        <p className="text-zinc-600">Track your script submissions and access your reviews</p>
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
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-sm font-medium text-zinc-600 border-b border-zinc-200">
                    <th className="pb-3">Script</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Submitted</th>
                    <th className="pb-3">Expected</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {submissions.map((submission) => (
                    <tr key={submission.id} className="group hover:bg-zinc-50">
                      <td className="py-4">
                        <div>
                          <p className="font-medium text-zinc-900">{submission.script_title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Tag variant="default">{submission.format}</Tag>
                            <span className="text-xs text-zinc-500">
                              {submission.draft_version} • {submission.genre || 'No genre'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getStatusIcon(submission.status)}</span>
                          <Tag variant={getStatusVariant(submission.status)}>
                            {getStatusText(submission.status)}
                          </Tag>
                        </div>
                      </td>
                      <td className="py-4 text-sm text-zinc-600">
                        {formatDate(submission.created_at)}
                      </td>
                      <td className="py-4 text-sm text-zinc-600">
                        {submission.status === "completed" ? "Complete" : 
                         submission.status === "failed" ? "Failed" :
                         getExpectedCompletion(submission.created_at)}
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
                            <span className="text-sm text-zinc-500">Processing...</span>
                          )}
                          {submission.status === "queued" && (
                            <span className="text-sm text-zinc-500">In queue</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {submissions.map((submission) => (
                <div key={submission.id} className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-zinc-900 mb-1">{submission.script_title}</h3>
                      <div className="flex items-center gap-2">
                        <Tag variant="default">{submission.format}</Tag>
                        <span className="text-xs text-zinc-500">
                          {submission.draft_version} • {submission.genre || 'No genre'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getStatusIcon(submission.status)}</span>
                      <Tag variant={getStatusVariant(submission.status)}>
                        {getStatusText(submission.status)}
                      </Tag>
                    </div>
                  </div>
                  
                  <div className="text-sm text-zinc-600 mb-3">
                    <p>Submitted: {formatDate(submission.created_at)}</p>
                    <p>
                      Expected: {submission.status === "completed" ? "Complete" : 
                                submission.status === "failed" ? "Failed" :
                                getExpectedCompletion(submission.created_at)}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
