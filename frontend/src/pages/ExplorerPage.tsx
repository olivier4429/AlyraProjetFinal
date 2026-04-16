import { useState } from "react";
import { formatUnits, zeroAddress } from "viem";
import { useAudits, AuditStatus } from "../hooks/useAudits";
import { shortenAddress, shortenCid } from "../utils";


function statusLabel(status: number) {
  if (status === AuditStatus.PENDING) return "En attente";
  if (status === AuditStatus.VALIDATED) return "Validé";
  return "Clôturé";
}

function statusStyle(status: number) {
  if (status === AuditStatus.PENDING)
    return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
  if (status === AuditStatus.VALIDATED)
    return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
  return "bg-gray-500/10 text-gray-400 border border-gray-500/20";
}

// ── Filtres ───────────────────────────────────────────────────────────────────

type Filter = "all" | "pending" | "validated" | "closed";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "pending", label: "En attente" },
  { key: "validated", label: "Validés" },
  { key: "closed", label: "Clôturés" },
];

function matchesFilter(status: number, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "pending") return status === AuditStatus.PENDING;
  if (filter === "validated") return status === AuditStatus.VALIDATED;
  if (filter === "closed") return status === AuditStatus.CLOSED;
  return true;
}

// ── Carte audit ───────────────────────────────────────────────────────────────

interface AuditRowProps {
  auditId: bigint;
  auditor: string;
  requester: string;
  auditedContractAddress: string;
  reportCID: string;
  amount: bigint;
  depositedAt: number;
  guaranteeEnd: number;
  guaranteeDuration: number;
  status: number;
  exploitValidated: boolean;
}

function AuditRow({
  auditId,
  auditor,
  requester,
  auditedContractAddress,
  reportCID,
  amount,
  depositedAt,
  guaranteeEnd,
  guaranteeDuration,
  status,
  exploitValidated,
}: AuditRowProps) {
  const [expanded, setExpanded] = useState(false);

  const guaranteeEndDate =
    guaranteeEnd > 0
      ? new Date(guaranteeEnd * 1000).toLocaleDateString("fr-FR")
      : guaranteeDuration > 0
      ? `~${new Date((depositedAt + guaranteeDuration) * 1000).toLocaleDateString("fr-FR")} (estimé)`
      : "-";

  return (
    <div
      className={`bg-[#111827] border rounded-xl overflow-hidden transition-colors ${
        expanded ? "border-[#4B5563]" : "border-[#374151] hover:border-[#4B5563]"
      }`}
    >
      {/* Ligne principale - cliquable pour développer */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-5 py-4 flex items-center gap-4 text-left"
      >
        {/* ID */}
        <span className="font-mono text-xs text-gray-500 w-10 shrink-0">
          #{auditId.toString()}
        </span>

        {/* Status */}
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${statusStyle(status)}`}>
          {statusLabel(status)}
        </span>

        {/* Auditeur */}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs text-gray-500">Auditeur</span>
          <span className="font-mono text-gray-200 text-sm truncate">{shortenAddress(auditor)}</span>
        </div>

        {/* Requester */}
        <div className="flex flex-col min-w-0 flex-1 hidden sm:flex">
          <span className="text-xs text-gray-500">Demandeur</span>
          <span className="font-mono text-gray-200 text-sm truncate">{shortenAddress(requester)}</span>
        </div>

        {/* Montant */}
        <div className="flex flex-col items-end shrink-0">
          <span className="text-xs text-gray-500">Montant</span>
          <span className="font-mono text-white font-bold text-sm">
            {Number(formatUnits(amount, 6)).toLocaleString("fr-FR")} USDC
          </span>
        </div>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Détails dépliables */}
      {expanded && (
        <div className="border-t border-[#374151] px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
          <div className="flex flex-col gap-0.5">
            <span className="text-gray-500 uppercase tracking-wider font-semibold">Contrat audité</span>
            <span className="font-mono text-gray-300">
              {auditedContractAddress === zeroAddress ? (
                <span className="italic text-gray-500">Non déployé</span>
              ) : (
                shortenAddress(auditedContractAddress)
              )}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-gray-500 uppercase tracking-wider font-semibold">CID rapport</span>
            <span className="font-mono text-gray-300 break-all">{shortenCid(reportCID)}</span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-gray-500 uppercase tracking-wider font-semibold">Déposé le</span>
            <span className="text-gray-300">
              {new Date(depositedAt * 1000).toLocaleDateString("fr-FR")}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-gray-500 uppercase tracking-wider font-semibold">Fin de garantie</span>
            <span className="text-gray-300">{guaranteeEndDate}</span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-gray-500 uppercase tracking-wider font-semibold">Durée garantie</span>
            <span className="text-gray-300">
              {guaranteeDuration > 0
                ? `${Math.round(guaranteeDuration / 86400)} jours`
                : "-"}
            </span>
          </div>

          {exploitValidated && (
            <div className="flex flex-col gap-0.5">
              <span className="text-gray-500 uppercase tracking-wider font-semibold">Exploit</span>
              <span className="text-rose-400 font-bold">Validé par la DAO</span>
            </div>
          )}

          {/* Ventilation */}
          <div className="col-span-2 sm:col-span-3 flex gap-6 bg-[#0A0E1A] border border-[#374151] rounded-lg px-4 py-2.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-gray-500">Paiement immédiat (70%)</span>
              <span className="text-white font-mono">
                {Number(formatUnits(amount * 70n / 100n, 6)).toFixed(2)} USDC
              </span>
            </div>
            <div className="w-px bg-[#374151]" />
            <div className="flex flex-col gap-0.5">
              <span className="text-gray-500">Retenue garantie (30%)</span>
              <span className="text-white font-mono">
                {Number(formatUnits(amount * 30n / 100n, 6)).toFixed(2)} USDC
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ExplorerPage() {
  const { audits, isLoading, error } = useAudits();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = audits.filter((a) => matchesFilter(a.status, filter));

  const counts = {
    all: audits.length,
    pending: audits.filter((a) => a.status === AuditStatus.PENDING).length,
    validated: audits.filter((a) => a.status === AuditStatus.VALIDATED).length,
    closed: audits.filter((a) => a.status === AuditStatus.CLOSED).length,
  };

  return (
    <div className="max-w-4xl mx-auto py-8 flex flex-col gap-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold text-white font-display">Explorer les audits</h1>
        <p className="text-gray-400 text-sm mt-1">
          Tous les audits enregistrés on-chain, en temps réel.
        </p>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors flex items-center gap-2 ${
              filter === f.key
                ? "bg-blue-500/10 border-blue-500/40 text-blue-400"
                : "bg-[#111827] border-[#374151] text-gray-400 hover:text-white hover:border-[#4B5563]"
            }`}
          >
            {f.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${
              filter === f.key ? "bg-blue-500/20 text-blue-300" : "bg-[#1F2937] text-gray-500"
            }`}>
              {isLoading ? "…" : counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-400 text-sm">
          Erreur de chargement : {error.message}
        </div>
      )}

      {/* Liste */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-[#1F2937] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-[#374151] rounded-xl">
          <p className="text-gray-500 text-sm">
            {audits.length === 0
              ? "Aucun audit enregistré pour le moment."
              : "Aucun audit dans cette catégorie."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* En-tête de colonne */}
          <div className="hidden sm:grid grid-cols-[2.5rem_6rem_1fr_1fr_8rem_1.5rem] gap-4 px-5 text-xs text-gray-500 uppercase tracking-wider font-semibold">
            <span>ID</span>
            <span>Statut</span>
            <span>Auditeur</span>
            <span>Demandeur</span>
            <span className="text-right">Montant</span>
            <span />
          </div>
          {filtered
            .slice()
            .sort((a, b) => Number(b.auditId) - Number(a.auditId))
            .map((a) => (
              <AuditRow key={a.auditId.toString()} {...a} />
            ))}
        </div>
      )}
    </div>
  );
}
