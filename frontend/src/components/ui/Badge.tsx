import React from "react";

type BadgeVariant = "navy" | "teal" | "amber" | "rose" | "indigo" | "green";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  navy: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  teal: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const specialtyVariants: Record<string, BadgeVariant> = {
  DeFi: "navy",
  NFT: "rose",
  DAO: "indigo",
  Bridge: "teal",
  Staking: "green",
  Lending: "amber",
  DEX: "teal",
  Oracle: "indigo",
  Governance: "navy",
  Layer2: "green",
};

export function getVariantForSpecialty(specialty: string): BadgeVariant {
  return specialtyVariants[specialty] ?? "navy";
}

export default function Badge({
  variant = "navy",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
