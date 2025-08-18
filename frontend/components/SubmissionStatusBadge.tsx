import React from "react";

interface SubmissionStatusBadgeProps {
  status: "queued" | "processing" | "completed" | "failed";
  size?: "sm" | "md";
}

function cx(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function SubmissionStatusBadge({ status, size = "md" }: SubmissionStatusBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1 text-sm",
  };

  const statusConfig = {
    queued: {
      label: "Pending",
      className: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: "⏳",
    },
    processing: {
      label: "In Review",
      className: "bg-blue-100 text-blue-800 border-blue-200",
      icon: "🔄",
    },
    completed: {
      label: "Complete",
      className: "bg-green-100 text-green-800 border-green-200",
      icon: "✅",
    },
    failed: {
      label: "Failed",
      className: "bg-red-100 text-red-800 border-red-200",
      icon: "❌",
    },
  };

  const config = statusConfig[status];

  return (
    <span className={cx(
      "inline-flex items-center gap-1 rounded-full border font-medium",
      sizeClasses[size],
      config.className
    )}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
