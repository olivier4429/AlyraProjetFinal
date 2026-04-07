import React from "react";

type AlertVariant = "info" | "success" | "warn" | "danger";

interface AlertProps {
  variant?: AlertVariant;
  children: React.ReactNode;
  className?: string;
}

const styles: Record<
  AlertVariant,
  { border: string; bg: string; text: string; icon: string }
> = {
  info: {
    border: "border-blue-500/30",
    bg: "bg-blue-500/10",
    text: "text-blue-300",
    icon: "ℹ",
  },
  success: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    text: "text-emerald-300",
    icon: "✓",
  },
  warn: {
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    text: "text-amber-300",
    icon: "⚠",
  },
  danger: {
    border: "border-rose-500/30",
    bg: "bg-rose-500/10",
    text: "text-rose-300",
    icon: "✕",
  },
};

export default function Alert({
  variant = "info",
  children,
  className = "",
}: AlertProps) {
  const s = styles[variant];
  return (
    <div
      className={`flex items-start gap-3 border rounded-lg p-4 ${s.border} ${s.bg} ${s.text} ${className}`}
    >
      <span className="font-bold text-base mt-0.5 shrink-0">{s.icon}</span>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}
