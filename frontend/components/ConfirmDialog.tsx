import React from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}

function Button({ children, className, variant = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const baseClasses = "px-4 py-2 rounded-2xl border shadow-sm disabled:opacity-50";
  const variantClasses = {
    primary: "border-zinc-200 bg-zinc-900 text-white hover:bg-zinc-800",
    secondary: "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50",
    danger: "border-red-200 bg-red-600 text-white hover:bg-red-700",
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

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "info",
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const iconColors = {
    danger: "text-red-600",
    warning: "text-yellow-600",
    info: "text-blue-600",
  };

  const buttonVariant = variant === "danger" ? "danger" : "primary";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-lg max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${iconColors[variant]} bg-current bg-opacity-10`}>
              {variant === "danger" && "⚠"}
              {variant === "warning" && "⚠"}
              {variant === "info" && "ℹ"}
            </div>
            <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
          </div>
          
          <p className="text-zinc-600 mb-6">{message}</p>
          
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={onClose}>
              {cancelText}
            </Button>
            <Button variant={buttonVariant} onClick={onConfirm}>
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
