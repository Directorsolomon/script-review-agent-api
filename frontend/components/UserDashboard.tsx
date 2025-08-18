import React, { useEffect, useState } from "react";
import ValidationMessage from "./ValidationMessage";
import Button from "./Button";
import LoadingSpinner from "./LoadingSpinner";
import SubmissionTable from "./SubmissionTable";
import SubmissionStatusBadge from "./SubmissionStatusBadge";
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
      <div className="text-gray-400 text-4xl mb-4">📄</div>
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

function QuickStats({ submissions }: { submissions: Submission[] }) {
  const stats = {
    total: submissions.length,
    completed: submissions.filter(s => s.status === 'completed').length,
    processing: submissions.filter(s => s.status === 'processing').length,
    pending: submissions.filter(s => s.status === 'queued').length,
    failed: submissions.filter(s => s.status === 'failed').length,
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        <div className="text-sm text-gray-600">Total</div>
      </div>
      <div className="bg-green-50 rounded-lg p-4 text-center">
        <div className="text-2xl font-bold text-green-900">{stats.completed}</div>
        <div className="text-sm text-green-700">Completed</div>
      </div>
      <div className="bg-blue-50 rounded-lg p-4 text-center">
        <div className="text-2xl font-bold text-blue-900">{stats.processing}</div>
        <div className="text-sm text-blue-700">Processing</div>
      </div>
      <div className="bg-yellow-50 rounded-lg p-4 text-center">
        <div className="text-2xl font-bold text-yellow-900">{stats.pending}</div>
        <div className="text-sm text-yellow-700">Pending</div>
      </div>
      <div className="bg-red-50 rounded-lg p-4 text-center">
        <div className="text-2xl font-bold text-red-900">{stats.failed}</div>
        <div className="text-sm text-red-700">Failed</div>
      </div>
    </div>
  );
}

export default function UserDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [emailFilter, setEmailFilter] = useState("");
  const [searchPerformed, setSearchPerformed] = useState(false);

  async function loadSubmissions() {
    if (!emailFilter.trim()) {
      setSubmissions([]);
      setSearchPerformed(false);
      return;
    }

    setLoading(true);
    setSearchPerformed(true);
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
        const reportData = report.report_json || {};
        
        reportWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Script Review Report</title>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { 
                  font-family: system-ui, -apple-system, sans-serif; 
                  max-width: 800px; 
                  margin: 0 auto; 
                  padding: 40px 20px; 
                  line-height: 1.6; 
                  color: #374151;
                }
                .header { 
                  text-align: center; 
                  margin-bottom: 40px; 
                  padding-bottom: 20px; 
                  border-bottom: 2px solid #e5e7eb; 
                }
                .score { 
                  font-size: 48px; 
                  font-weight: bold; 
                  color: #059669; 
                  margin: 20px 0; 
                }
                .section { 
                  margin: 30px 0; 
                  padding: 24px; 
                  border: 1px solid #e5e7eb; 
                  border-radius: 12px; 
                  background: #f9fafb;
                }
                h1 { 
                  color: #111827; 
                  margin-bottom: 10px; 
                  font-size: 28px;
                }
                h2 { 
                  color: #374151; 
                  margin-bottom: 16px; 
                  font-size: 20px;
                  border-bottom: 1px solid #d1d5db;
                  padding-bottom: 8px;
                }
                ul { 
                  padding-left: 0; 
                  list-style: none;
                }
                li { 
                  margin-bottom: 12px; 
                  color: #4b5563; 
                  padding: 8px 0;
                  border-bottom: 1px solid #f3f4f6;
                }
                li:last-child {
                  border-bottom: none;
                }
                .priority-high { color: #dc2626; font-weight: 600; }
                .priority-med { color: #d97706; font-weight: 500; }
                .priority-low { color: #059669; font-weight: 500; }
                .no-print { margin-top: 40px; text-align: center; }
                @media print {
                  .no-print { display: none; }
                }
                .markdown-content {
                  white-space: pre-wrap;
                  font-family: Georgia, serif;
                  line-height: 1.8;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>Script Review Report</h1>
                <div class="score">${report.overall_score?.toFixed(1) || 'N/A'}/10</div>
                <p>Generated on ${new Date().toLocaleDateString()}</p>
              </div>
              
              ${reportData.report_markdown ? `
                <div class="section">
                  <div class="markdown-content">${reportData.report_markdown}</div>
                </div>
              ` : `
                <div class="section">
                  <h2>✨ Strengths</h2>
                  <ul>
                    ${(reportData.highlights || ['No specific strengths identified yet.']).map((h: string) => `<li>• ${h}</li>`).join('')}
                  </ul>
                </div>
                
                <div class="section">
                  <h2>⚠️ Areas for Improvement</h2>
                  <ul>
                    ${(reportData.risks || ['No specific risks identified.']).map((r: string) => `<li>• ${r}</li>`).join('')}
                  </ul>
                </div>
                
                <div class="section">
                  <h2>📋 Action Plan</h2>
                  <ul>
                    ${(reportData.action_plan || []).map((a: any) => `
                      <li>
                        <span class="priority-${a.priority || 'med'}">[${(a.priority || 'MED').toUpperCase()}]</span> 
                        ${a.description}
                      </li>
                    `).join('')}
                  </ul>
                </div>
                
                ${reportData.buckets && reportData.buckets.length > 0 ? `
                  <div class="section">
                    <h2>📊 Detailed Scores</h2>
                    <ul>
                      ${reportData.buckets.map((b: any) => `<li><strong>${b.name}:</strong> ${b.score}/10</li>`).join('')}
                    </ul>
                  </div>
                ` : ''}
              `}
              
              <div class="no-print">
                <button onclick="window.print()" style="background: #374151; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin-right: 12px;">Print Report</button>
                <button onclick="window.close()" style="background: #6b7280; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer;">Close</button>
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
      const result = await backend.review.run({ submissionId });
      alert(result.message || "Review restarted successfully!");
      await loadSubmissions();
    } catch (e: any) {
      console.error("Failed to restart review:", e);
      
      let errorMessage = "Failed to restart review";
      if (e.message?.includes("Script too large") || e.message?.includes("extremely large")) {
        errorMessage = "Your script is too large for processing. Please split it into smaller parts.";
      } else if (e.message?.includes("payload_too_large")) {
        errorMessage = "Script too large for processing. Please split into smaller files.";
      } else if (e.message?.includes("failed_precondition")) {
        errorMessage = e.message.replace("failed_precondition: ", "");
      } else if (e.message) {
        errorMessage = e.message;
      }
      
      alert(errorMessage);
    } finally {
      setRetryingId(null);
    }
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      loadSubmissions();
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Track your script submissions and access your reviews</p>
      </div>

      <Card 
        title="My Script Submissions" 
        description="Enter your email address to view your submissions and track their progress"
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
                onKeyPress={handleKeyPress}
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

        {submissions.length > 0 && (
          <QuickStats submissions={submissions} />
        )}
        
        {!searchPerformed ? (
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
          <SubmissionTable
            submissions={submissions}
            loading={loading}
            showActions={true}
            onViewReport={viewReport}
            onRetryReview={retryReview}
            retryingId={retryingId}
          />
        )}
      </Card>
    </div>
  );
}
