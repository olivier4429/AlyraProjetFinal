import { useState, useEffect } from "react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import type { Address } from "viem";
import { useAuditorAudits, AuditStatus } from "../hooks/useAuditorAudits";
import { useValidateAudit } from "../hooks/useAuditRegistry";
import Alert from "../components/ui/Alert";

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function shortenCid(cid: string) {
  if (cid.length <= 20) return cid;
  return `${cid.slice(0, 10)}…${cid.slice(-6)}`;
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function formatTimeRemaining(depositedAt: number): { label: string; urgent: boolean } {
  const deadline = depositedAt + 10 * 24 * 3600; // 10 jours
  const remaining = deadline - Math.floor(Date.now() / 1000);
  if (remaining <= 0) return { label: "Expiré", urgent: true };
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  if (days > 0) return { label: `${days}j ${hours}h`, urgent: days < 2 };
  return { label: `${hours}h`, urgent: true };
}

// ── Durées de garantie prédéfinies ────────────────────────────────────────────

const GUARANTEE_PRESETS = [
  { label: "30 j", days: 30 },
  { label: "90 j", days: 90 },
  { label: "180 j", days: 180 },
  { label: "365 j", days: 365 },
];

// ── Carte d'un audit ──────────────────────────────────────────────────────────

interface AuditCardProps {
  auditId: bigint;
  requester: Address;
  auditedContractAddress: Address;
  reportCID: string;
  amount: bigint;
  depositedAt: number;
  status: number;
  onValidated: (auditId: bigint) => void;
}

function AuditCard({
  auditId,
  requester,
  auditedContractAddress,
  reportCID,
  amount,
  depositedAt,
  status,
  onValidated,
}: AuditCardProps) {
  const { validate, isSignaturePending, isConfirming, isSuccess, error, reset } = useValidateAudit();
  const [expanded, setExpanded] = useState(false);
  const [selectedDays, setSelectedDays] = useState(90);
  const [customDays, setCustomDays] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  const isPending = status === AuditStatus.PENDING;
  const isValidated = status === AuditStatus.VALIDATED;
  const timeInfo = isPending ? formatTimeRemaining(depositedAt) : null;

  useEffect(() => {
    if (isSuccess) {
      onValidated(auditId);
      setExpanded(false);
      reset();
    }
  }, [isSuccess]);

  const guaranteeDays = useCustom ? parseInt(customDays || "0") : selectedDays;
  const guaranteeSeconds = BigInt(guaranteeDays * 24 * 3600);

  const handleValidate = () => {
    if (guaranteeDays <= 0) return;
    validate(auditId, guaranteeSeconds);
  };

  const isLoading = isSignaturePending || isConfirming;

  return (
    <div className={`bg-[#111827] border rounded-xl p-5 flex flex-col gap-4 transition-colors ${
      isValidated ? "border-green-500/20 opacity-70" : "border-[#374151] hover:border-[#4B5563]"
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-gray-500">#{auditId.toString()}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            isPending
              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              : isValidated
              ? "bg-green-500/10 text-green-400 border border-green-500/20"
              : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
          }`}>
            {isPending ? "En attente" : isValidated ? "Validé" : "Clôturé"}
          </span>
          {timeInfo && (
            <span className={`text-xs font-mono ${timeInfo.urgent ? "text-rose-400" : "text-gray-500"}`}>
              ⏱ {timeInfo.label}
            </span>
          )}
        </div>
        <span className="text-white font-bold font-mono text-sm">
          {Number(formatUnits(amount, 6)).toFixed(0)} USDC
        </span>
      </div>

      {/* Infos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div className="flex flex-col gap-0.5">
          <span className="text-gray-500 uppercase tracking-wider font-semibold">Demandeur</span>
          <span className="font-mono text-gray-300">{shortenAddress(requester)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-gray-500 uppercase tracking-wider font-semibold">Contrat audité</span>
          <span className="font-mono text-gray-300">
            {auditedContractAddress === ZERO_ADDRESS
              ? <span className="text-gray-500 italic">Non encore déployé</span>
              : shortenAddress(auditedContractAddress)
            }
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-gray-500 uppercase tracking-wider font-semibold">Rapport CID</span>
          <span className="font-mono text-gray-300">{shortenCid(reportCID)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-gray-500 uppercase tracking-wider font-semibold">Déposé le</span>
          <span className="text-gray-300">
            {new Date(depositedAt * 1000).toLocaleDateString("fr-FR")}
          </span>
        </div>
      </div>

      {/* Ventilation */}
      <div className="bg-[#0A0E1A] border border-[#374151] rounded-lg px-4 py-2.5 flex gap-6 text-xs text-gray-400">
        <div className="flex flex-col gap-0.5">
          <span>Paiement immédiat</span>
          <span className="text-white font-mono">{Number(formatUnits(amount * 70n / 100n, 6)).toFixed(2)} USDC</span>
        </div>
        <div className="h-full w-px bg-[#374151]" />
        <div className="flex flex-col gap-0.5">
          <span>Retenue garantie</span>
          <span className="text-white font-mono">{Number(formatUnits(amount * 30n / 100n, 6)).toFixed(2)} USDC</span>
        </div>
      </div>

      {/* Zone de validation (PENDING seulement) */}
      {isPending && (
        <>
          {!expanded ? (
            <button
              onClick={() => setExpanded(true)}
              className="w-full px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors text-sm"
            >
              Valider cet audit →
            </button>
          ) : (
            <div className="flex flex-col gap-3 border-t border-[#374151] pt-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-300">
                  Durée de garantie
                </label>

                {/* Presets */}
                <div className="flex gap-2 flex-wrap">
                  {GUARANTEE_PRESETS.map((p) => (
                    <button
                      key={p.days}
                      onClick={() => { setSelectedDays(p.days); setUseCustom(false); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                        !useCustom && selectedDays === p.days
                          ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                          : "bg-[#1F2937] border-[#374151] text-gray-400 hover:text-white"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setUseCustom(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      useCustom
                        ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                        : "bg-[#1F2937] border-[#374151] text-gray-400 hover:text-white"
                    }`}
                  >
                    Personnalisé
                  </button>
                </div>

                {/* Custom input */}
                {useCustom && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={customDays}
                      onChange={(e) => setCustomDays(e.target.value)}
                      placeholder="ex : 120"
                      className="w-28 bg-[#1F2937] border border-[#374151] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-sm text-gray-400">jours</span>
                  </div>
                )}

                {guaranteeDays > 0 && (
                  <p className="text-xs text-gray-500">
                    La garantie expirera le{" "}
                    <span className="text-gray-300">
                      {new Date(Date.now() + guaranteeDays * 86400_000).toLocaleDateString("fr-FR")}
                    </span>
                  </p>
                )}
              </div>

              {/* Statuts transaction */}
              {isSignaturePending && (
                <Alert variant="warn">
                  <div className="flex items-center gap-2">
                    <span className="animate-spin inline-block w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full" />
                    Signez la transaction dans votre wallet…
                  </div>
                </Alert>
              )}
              {isConfirming && (
                <Alert variant="info">Transaction envoyée, en attente de confirmation…</Alert>
              )}
              {error && (
                <Alert variant="danger">
                  <span className="text-xs">{error.message?.slice(0, 120)}</span>
                </Alert>
              )}

              {/* Boutons */}
              <div className="flex gap-2">
                <button
                  onClick={() => { setExpanded(false); reset(); }}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 border border-[#374151] text-gray-400 hover:text-white font-bold rounded-lg transition-colors text-sm disabled:opacity-40"
                >
                  Annuler
                </button>
                <button
                  onClick={handleValidate}
                  disabled={isLoading || guaranteeDays <= 0}
                  className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-600/40 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                >
                  {isLoading && (
                    <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                  )}
                  {isSignaturePending ? "Signature…" : isConfirming ? "Confirmation…" : "Confirmer la validation"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ValidationPage() {
  const { address, isConnected } = useAccount();
  const { audits, isLoading, error, refreshAudit } = useAuditorAudits(
    isConnected ? (address as Address) : undefined
  );

  const pending = audits.filter((a) => a.status === AuditStatus.PENDING);
  const validated = audits.filter((a) => a.status === AuditStatus.VALIDATED);
  const closed = audits.filter((a) => a.status === AuditStatus.CLOSED);

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className="text-gray-400 text-lg">Connectez votre wallet pour voir vos audits.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold text-white font-display">Mes audits</h1>
        <p className="text-gray-400 text-sm mt-1 font-mono">
          {shortenAddress(address!)}
        </p>
      </div>

      {error && (
        <Alert variant="danger">Erreur de chargement : {error.message}</Alert>
      )}

      {/* À valider */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">À valider</h2>
          <span className="text-xs text-gray-500 font-mono">
            {isLoading ? "…" : `${pending.length} audit${pending.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-40 rounded-xl bg-[#1F2937] animate-pulse" />
            ))}
          </div>
        ) : pending.length === 0 ? (
          <p className="text-gray-500 text-sm py-8 text-center border border-dashed border-[#374151] rounded-xl">
            Aucun audit en attente de validation.
          </p>
        ) : (
          pending.map((a) => (
            <AuditCard
              key={a.auditId.toString()}
              {...a}
              onValidated={refreshAudit}
            />
          ))
        )}
      </section>

      {/* Déjà validés */}
      {validated.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-white">Validés</h2>
          {validated.map((a) => (
            <AuditCard
              key={a.auditId.toString()}
              {...a}
              onValidated={refreshAudit}
            />
          ))}
        </section>
      )}

      {/* Clôturés */}
      {closed.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-white">Clôturés</h2>
          {closed.map((a) => (
            <AuditCard
              key={a.auditId.toString()}
              {...a}
              onValidated={refreshAudit}
            />
          ))}
        </section>
      )}
    </div>
  );
}
