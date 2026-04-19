import { useState, useEffect } from "react";
import { formatUnits, zeroAddress } from "viem";
import type { Address } from "viem";
import { AuditStatus } from "../../hooks/useAudits";
import { useValidateAudit, useClaimPayment, useClaimGuarantee, useSetAuditedContractAddress } from "../../hooks/useAuditRegistry";
import { usePaymentClaimed, useGuaranteeClaimed, useEscrowInfo } from "../../hooks/useEscrowClaimed";
import Alert from "../ui/Alert";
import ClaimRow from "./ClaimRow";
import { shortenAddress, shortenCid } from "../../utils";

function formatTimeRemaining(depositedAt: number): { label: string; urgent: boolean } {
  const deadline = depositedAt + 10 * 24 * 3600;
  const remaining = deadline - Math.floor(Date.now() / 1000);
  if (remaining <= 0) return { label: "Expiré", urgent: true };
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  if (days > 0) return { label: `${days}j ${hours}h`, urgent: days < 2 };
  return { label: `${hours}h`, urgent: true };
}

function SetContractAddressForm({ auditId, onSuccess }: { auditId: bigint; onSuccess: () => void }) {
  const [value, setValue] = useState("");
  const { setAddress, isSignaturePending, isConfirming, isSuccess, error, reset } =
    useSetAuditedContractAddress();

  useEffect(() => {
    if (isSuccess) { onSuccess(); reset(); }
  }, [isSuccess]);

  const isLoading = isSignaturePending || isConfirming;
  const isValid = /^0x[0-9a-fA-F]{40}$/.test(value);

  return (
    <div className="border-t border-[#374151] pt-4 flex flex-col gap-3">
      <p className="text-xs text-gray-400">
        Le contrat audité n'est pas encore déployé. Définissez son adresse une fois déployé.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0x..."
          disabled={isLoading}
          className="flex-1 bg-[#1F2937] border border-[#374151] rounded-lg px-3 py-2 text-white text-xs font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />
        <button
          onClick={() => setAddress(auditId, value as Address)}
          disabled={isLoading || !isValid}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/30 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors text-xs shrink-0"
        >
          {isLoading ? "…" : "Définir"}
        </button>
      </div>
      {isSignaturePending && <Alert variant="warn"><div className="flex items-center gap-2"><span className="animate-spin inline-block w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full" />Signez dans votre wallet…</div></Alert>}
      {isConfirming && <Alert variant="info">En attente de confirmation…</Alert>}
      {error && <Alert variant="danger"><span className="text-xs">{error.message?.slice(0, 150)}</span></Alert>}
    </div>
  );
}

export interface AuditCardProps {
  auditId: bigint;
  requester: Address;
  auditedContractAddress: Address;
  reportCID: string;
  amount: bigint;
  depositedAt: number;
  guaranteeEnd: number;
  guaranteeDuration: number;
  status: number;
  exploitValidated: boolean;
  onRefresh: (auditId: bigint) => void;
}

export default function AuditCard({
  auditId,
  requester,
  auditedContractAddress,
  reportCID,
  amount,
  depositedAt,
  guaranteeEnd,
  guaranteeDuration,
  status,
  exploitValidated,
  onRefresh,
}: AuditCardProps) {
  const { validate, isSignaturePending, isConfirming, isSuccess, error, reset } =
    useValidateAudit();
  const [expanded, setExpanded] = useState(false);

  const isPending = status === AuditStatus.PENDING;
  const isValidated = status === AuditStatus.VALIDATED;
  const isClosed = status === AuditStatus.CLOSED;
  const timeInfo = isPending ? formatTimeRemaining(depositedAt) : null;

  const { claimed: paymentClaimed } = usePaymentClaimed(auditId, isValidated || isClosed);
  const { claimed: guaranteeClaimed } = useGuaranteeClaimed(auditId, isValidated || isClosed);

  const { immediateAmount: rawImmediate, guaranteeAmount: rawGuarantee } = useEscrowInfo(auditId, isValidated || isClosed);

  // amount est déjà l'escrow amount (95% déduit par le contrat) — fallback sur 70%/30%
  const immediateAmount = rawImmediate ?? (amount * 70n / 100n);
  const guaranteeAmount = rawGuarantee ?? (amount * 30n / 100n);

  const now = Math.floor(Date.now() / 1000);
  const canClaimPayment = !paymentClaimed && (isValidated || isClosed);
  const canClaimGuarantee =
    !guaranteeClaimed &&
    ((isValidated && guaranteeEnd > 0 && now >= guaranteeEnd) ||
      (isClosed && !exploitValidated));

  useEffect(() => {
    if (isSuccess) {
      onRefresh(auditId);
      setExpanded(false);
      reset();
    }
  }, [isSuccess]);

  const isLoading = isSignaturePending || isConfirming;

  return (
    <div
      className={`bg-[#111827] border rounded-xl p-5 flex flex-col gap-4 transition-colors ${
        guaranteeClaimed
          ? "border-gray-700/50 opacity-60"
          : isValidated || isClosed
          ? "border-[#374151]"
          : "border-[#374151] hover:border-[#4B5563]"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-xs text-gray-500">#{auditId.toString()}</span>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              isPending
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : isValidated
                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
            }`}
          >
            {isPending ? "En attente" : isValidated ? "Validé" : "Clôturé"}
          </span>
          {paymentClaimed && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
              Paiement réclamé
            </span>
          )}
          {guaranteeClaimed && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
              Garantie réclamée
            </span>
          )}
          {timeInfo && (
            <span className={`text-xs font-mono ${timeInfo.urgent ? "text-rose-400" : "text-gray-500"}`}>
              ⏱ {timeInfo.label}
            </span>
          )}
        </div>
        <span className="text-white font-bold font-mono text-sm shrink-0">
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
            {auditedContractAddress === zeroAddress ? (
              <span className="text-gray-500 italic">Non encore déployé</span>
            ) : (
              shortenAddress(auditedContractAddress)
            )}
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
        {(isValidated || isClosed) && guaranteeEnd > 0 && (
          <div className="flex flex-col gap-0.5">
            <span className="text-gray-500 uppercase tracking-wider font-semibold">Fin de garantie</span>
            <span className={`${now >= guaranteeEnd ? "text-green-400" : "text-gray-300"}`}>
              {new Date(guaranteeEnd * 1000).toLocaleDateString("fr-FR")}
              {now >= guaranteeEnd && " ✓"}
            </span>
          </div>
        )}
      </div>

      {/* Définir l'adresse du contrat audité */}
      {auditedContractAddress === zeroAddress && (
        <SetContractAddressForm auditId={auditId} onSuccess={() => onRefresh(auditId)} />
      )}

      {/* Ventilation */}
      <div className="bg-[#0A0E1A] border border-[#374151] rounded-lg px-4 py-2.5 flex gap-6 text-xs text-gray-400">
        <div className="flex flex-col gap-0.5">
          <span>Paiement immédiat (70%)</span>
          <span className={`font-mono ${paymentClaimed ? "text-green-400 line-through" : "text-white"}`}>
            {Number(formatUnits(immediateAmount, 6)).toFixed(2)} USDC
          </span>
        </div>
        <div className="h-full w-px bg-[#374151]" />
        <div className="flex flex-col gap-0.5">
          <span>Retenue de garantie (30%)</span>
          <span className={`font-mono ${guaranteeClaimed ? "text-green-400 line-through" : "text-white"}`}>
            {Number(formatUnits(guaranteeAmount, 6)).toFixed(2)} USDC
          </span>
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
              Valider cet audit
            </button>
          ) : (
            <div className="flex flex-col gap-3 border-t border-[#374151] pt-4">
              {guaranteeDuration > 0 && (
                <p className="text-xs text-gray-500">
                  Garantie de{" "}
                  <span className="text-gray-300">{Math.round(guaranteeDuration / 86400)} jours</span>
                  {" "}- expirera vers le{" "}
                  <span className="text-gray-300">
                    {new Date((now + guaranteeDuration) * 1000).toLocaleDateString("fr-FR")}
                  </span>
                  {" "}(définie par le demandeur)
                </p>
              )}

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

              <div className="flex gap-2">
                <button
                  onClick={() => { setExpanded(false); reset(); }}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 border border-[#374151] text-gray-400 hover:text-white font-bold rounded-lg transition-colors text-sm disabled:opacity-40"
                >
                  Annuler
                </button>
                <button
                  onClick={() => validate(auditId)}
                  disabled={isLoading}
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

      {/* Zone réclamation paiement immédiat */}
      {canClaimPayment && (
        <ClaimRow
          auditId={auditId}
          label="Récupérer le paiement immédiat (70%)"
          amount={immediateAmount}
          onClaimed={() => onRefresh(auditId)}
          useClaimHook={useClaimPayment}
        />
      )}

      {/* Zone réclamation garantie */}
      {canClaimGuarantee && (
        <ClaimRow
          auditId={auditId}
          label="Récupérer la retenue de garantie (30%)"
          amount={guaranteeAmount}
          onClaimed={() => onRefresh(auditId)}
          useClaimHook={useClaimGuarantee}
        />
      )}

      {/* Exploit validé - la garantie va au demandeur */}
      {isClosed && exploitValidated && !guaranteeClaimed && (
        <div className="border-t border-[#374151] pt-4">
          <p className="text-xs text-rose-400 text-center">
            Exploit validé par la DAO - la retenue de garantie a été attribuée au demandeur.
          </p>
        </div>
      )}
    </div>
  );
}
