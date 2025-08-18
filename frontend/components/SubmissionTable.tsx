import React from "react";
import Button from "./Button";
import SubmissionStatusBadge from "./SubmissionStatusBadge";
import LoadingSpinner from "./LoadingSpinner";

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

interface SubmissionTableProps {
  submissions: Submission[];
  loading?: boolean;
  showActions?: boolean;
  onViewReport?: (submissionId: string) => void;
  onRetryReview?: (submissionId: string) => void;
  onUpdateStatus?: (submissionId: string, status: string) => void;
  onDeleteSubmission?: (submissionId: string) => void;
  retryingId?: string | null;
  updatingId?: string | null;
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

function formatFileSize(bytes?: number): string {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export default function SubmissionTable({
  submissions,
  loading = false,
  showActions = false,
  onViewReport,
  onRetryReview,
  onUpdateStatus,
  onDeleteSubmission,
  retryingId,
  updatingId,
}: SubmissionTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Loading submissions...</span>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-4xl mb-4">📄</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No submissions found</h3>
        <p className="text-gray-600">No submissions match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-600 border-b border-gray-200">
            <th className="py-3 font-medium">Script</th>
            <th className="py-3 font-medium">Writer</th>
            <th className="py-3 font-medium">Status</th>
            <th className="py-3 font-medium">Details</th>
            <th className="py-3 font-medium">Submitted</th>
            {showActions && <th className="py-3 font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {submissions.map((submission) => (
            <tr key={submission.id} className="hover:bg-gray-50">
              <td className="py-4">
                <div>
                  <p className="font-medium text-gray-900">{submission.script_title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {submission.genre || 'No genre specified'}
                  </p>
                </div>
              </td>
              <td className="py-4">
                <div>
                  <p className="text-gray-900">{submission.writer_name}</p>
                  <p className="text-xs text-gray-500">{submission.writer_email}</p>
                </div>
              </td>
              <td className="py-4">
                <SubmissionStatusBadge status={submission.status} size="sm" />
              </td>
              <td className="py-4">
                <div className="text-xs text-gray-600 space-y-1">
                  <div>{submission.format} • {submission.draft_version}</div>
                  <div>{submission.region || 'Global'} • {submission.platform || 'YouTube'}</div>
                </div>
              </td>
              <td className="py-4 text-gray-600">
                {formatDate(submission.created_at)}
              </td>
              {showActions && (
                <td className="py-4">
                  <div className="flex items-center gap-2">
                    {submission.status === "completed" && onViewReport && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onViewReport(submission.id)}
                      >
                        View Report
                      </Button>
                    )}
                    
                    {submission.status === "failed" && onRetryReview && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRetryReview(submission.id)}
                        disabled={retryingId === submission.id}
                      >
                        {retryingId === submission.id ? <LoadingSpinner size="sm" /> : "Retry"}
                      </Button>
                    )}
                    
                    {(submission.status === "queued" || submission.status === "failed") && onUpdateStatus && (
                      <select
                        className="text-xs border border-gray-200 rounded px-2 py-1"
                        value={submission.status}
                        onChange={(e) => onUpdateStatus(submission.id, e.target.value)}
                        disabled={updatingId === submission.id}
                      >
                        <option value="queued">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                      </select>
                    )}
                    
                    {onDeleteSubmission && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => onDeleteSubmission(submission.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
