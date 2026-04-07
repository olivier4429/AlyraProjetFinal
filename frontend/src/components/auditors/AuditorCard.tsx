import type { Auditor } from "../../types";
import Badge, { getVariantForSpecialty } from "../ui/Badge";
import ScoreBar from "../ui/ScoreBar";

interface AuditorCardProps {
  auditor: Auditor;
  rank: number;
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(address: string): string {
  const colors = [
    "#3B82F6",
    "#22D3EE",
    "#818CF8",
    "#34D399",
    "#F59E0B",
    "#FB7185",
  ];
  const index =
    parseInt(address.slice(2, 4), 16) % colors.length;
  return colors[index];
}

function getRankBadgeStyle(rank: number): string {
  if (rank === 1) return "text-amber-400 bg-amber-400/10 border-amber-400/30";
  if (rank === 2) return "text-gray-300 bg-gray-300/10 border-gray-300/30";
  if (rank === 3) return "text-amber-600 bg-amber-600/10 border-amber-600/30";
  return "text-gray-500 bg-gray-500/10 border-gray-500/20";
}

export default function AuditorCard({ auditor, rank }: AuditorCardProps) {
  const avatarColor = getAvatarColor(auditor.address);
  const initials = getInitials(auditor.pseudo);

  return (
    <div className="bg-[#111827] border border-[#374151] rounded-xl p-6 hover:border-[#4B5563] transition-colors">
      <div className="flex items-start gap-4">
        {/* Rank */}
        <div
          className={`shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold font-mono ${getRankBadgeStyle(rank)}`}
        >
          #{rank}
        </div>

        {/* Avatar */}
        <div
          className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm"
          style={{ backgroundColor: avatarColor + "33", border: `2px solid ${avatarColor}` }}
        >
          <span style={{ color: avatarColor }}>{initials}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-white text-base">{auditor.pseudo}</h3>
            {auditor.totalExploits === 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                0 exploit
              </span>
            )}
          </div>

          <p className="font-mono text-xs text-gray-400 mb-3">
            {shortenAddress(auditor.address)}
          </p>

          {/* Specialties */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {auditor.specialties.map((s) => (
              <Badge key={s} variant={getVariantForSpecialty(s)}>
                {s}
              </Badge>
            ))}
          </div>

          {/* Score bar */}
          <ScoreBar score={auditor.reputationScore} />

          {/* Stats row */}
          <div className="flex gap-4 mt-3 text-xs text-gray-400 font-mono">
            <span>
              <span className="text-gray-200 font-bold">{auditor.totalAudits}</span> audits
            </span>
            <span>
              <span
                className={auditor.totalExploits > 0 ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}
              >
                {auditor.totalExploits}
              </span>{" "}
              exploit{auditor.totalExploits !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
