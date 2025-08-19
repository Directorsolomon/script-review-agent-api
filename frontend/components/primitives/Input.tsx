import React from "react";

function cx(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export default function Input({ error, ...props }: InputProps) {
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
