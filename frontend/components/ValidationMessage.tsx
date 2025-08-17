import React from "react";

interface ValidationMessageProps {
  type: "error" | "warning" | "success" | "info";
  message: string;
  className?: string;
}

export default function ValidationMessage({ type, message, className }: ValidationMessageProps) {
  const baseClasses = "p-3 rounded-xl text-sm";
  const typeClasses = {
    error: "bg-red-50 text-red-700 border border-red-200",
    warning: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    success: "bg-green-50 text-green-700 border border-green-200",
    info: "bg-blue-50 text-blue-700 border border-blue-200",
  };

  const icons = {
    error: "❌",
    warning: "⚠️",
    success: "✅",
    info: "ℹ️",
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]} ${className || ""}`} role="alert">
      <div className="flex items-center gap-2">
        <span>{icons[type]}</span>
        <span>{message}</span>
      </div>
    </div>
  );
}
