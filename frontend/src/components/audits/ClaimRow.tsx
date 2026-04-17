import { useEffect } from "react";
import { formatUnits } from "viem";
import Alert from "../ui/Alert";

interface ClaimRowProps {
  auditId: bigint;
  label: string;
  amount: bigint;
  onClaimed: () => void;
  useClaimHook: () => {
    claim: (id: bigint) => void;
    isSignaturePending: boolean;
    isConfirming: boolean;
    isSuccess: boolean;
    error: Error | null;
    reset: () => void;
  };
}
/**
 * Composant pour afficher une ligne de claim d'un paiement de l'audit ou de la garantie.
 * @param param0 
 * @returns 
 */
export default function ClaimRow({ auditId, label, amount, onClaimed, useClaimHook }: ClaimRowProps) {
  const { claim, isSignaturePending, isConfirming, isSuccess, error, reset } = useClaimHook();

  useEffect(() => {
    if (isSuccess) { onClaimed(); reset(); }
  }, [isSuccess]);

  const isLoading = isSignaturePending || isConfirming;

  return (
    <div className="border-t border-[#374151] pt-4 flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className="text-green-400 font-bold font-mono">
          +{Number(formatUnits(amount, 6)).toFixed(2)} USDC
        </span>
      </div>
      {isSignaturePending && (
        <Alert variant="warn">
          <div className="flex items-center gap-2">
            <span className="animate-spin inline-block w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full" />
            Signez la transaction dans votre wallet…
          </div>
        </Alert>
      )}
      {isConfirming && <Alert variant="info">Transaction envoyée, en attente de confirmation…</Alert>}
      {error && <Alert variant="danger"><span className="text-xs">{error.message?.slice(0, 150)}</span></Alert>}
      <button
        onClick={() => claim(auditId)}
        disabled={isLoading}
        className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-600/40 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
      >
        {isLoading && <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />}
        {isSignaturePending ? "Signature…" : isConfirming ? "Confirmation…" : label}
      </button>
    </div>
  );
}
