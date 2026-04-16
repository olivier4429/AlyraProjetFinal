import { useEffect } from "react";
import type { Address } from "viem";
import type { Specialty } from "../../types";
import Badge, { getVariantForSpecialty } from "../ui/Badge";
import Alert from "../ui/Alert";
import { useRegisterAuditor } from "../../hooks/useAuditRegistry";
import { shortenAddress } from "../../utils";

interface StepConfirmationProps {
  address: Address;
  pseudo: string;
  specialties: Specialty[];
  onBack: () => void;
  onSuccess: () => void;
}

type TxStatus = "idle" | "pending" | "confirming" | "success" | "error";

export default function StepConfirmation({
  address,
  pseudo,
  specialties,
  onBack,
  onSuccess,
}: StepConfirmationProps) {
  const {
    register,
    isSignaturePending,
    isConfirming,
    isSuccess,
    error,
    txHash,
  } = useRegisterAuditor();

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => onSuccess(), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, onSuccess]);

  const getStatus = (): TxStatus => {
    if (isSuccess) return "success";
    if (error) return "error";
    if (isConfirming) return "confirming";
    if (isSignaturePending) return "pending";
    return "idle";
  };

  const status = getStatus();
  const isLoading = status === "pending" || status === "confirming";

  const handleSubmit = () => {
    register(pseudo, specialties);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-2">Confirmation</h2>
        <p className="text-gray-400 text-sm">
          Vérifiez vos informations avant de signer la transaction.
        </p>
      </div>

      {/* Summary card */}
      <div className="bg-[#0A0E1A] border border-[#374151] rounded-xl p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
            Wallet
          </span>
          <span className="font-mono text-sm text-gray-300">
            {shortenAddress(address)}
          </span>
        </div>

        <div className="h-px bg-[#374151]" />

        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
            Pseudo
          </span>
          <span className="text-white font-bold text-base">{pseudo}</span>
        </div>

        <div className="h-px bg-[#374151]" />

        <div className="flex flex-col gap-2">
          <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
            Spécialités ({specialties.length})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {specialties.map((s) => (
              <Badge key={s} variant={getVariantForSpecialty(s)}>
                {s}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Status alerts */}
      {status === "idle" && (
        <Alert variant="info">
          En cliquant sur "Inscrire", votre wallet vous demandera de signer une
          transaction sur le réseau Sepolia.
        </Alert>
      )}

      {status === "pending" && (
        <Alert variant="warn">
          <div className="flex items-center gap-2">
            <span className="animate-spin inline-block w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full" />
            En attente de votre signature dans le wallet...
          </div>
        </Alert>
      )}

      {status === "confirming" && (
        <Alert variant="info">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="animate-spin inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full" />
              Transaction envoyée, en attente de confirmation...
            </div>
            {txHash && (
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline font-mono text-xs mt-1"
              >
                {txHash.slice(0, 20)}...{txHash.slice(-8)} ↗
              </a>
            )}
          </div>
        </Alert>
      )}

      {status === "success" && (
        <Alert variant="success">
          <div className="flex flex-col gap-1">
            <span className="font-bold">Inscription réussie !</span>
            <span>Votre badge NFT de réputation a été émis. Redirection...</span>
          </div>
        </Alert>
      )}

      {status === "error" && (
        <Alert variant="danger">
          <div className="flex flex-col gap-1">
            <span className="font-bold">Erreur lors de la transaction</span>
            <span className="text-xs opacity-80">
              {error?.message?.slice(0, 120) ?? "Une erreur est survenue."}
            </span>
          </div>
        </Alert>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={isLoading || status === "success"}
          className="flex-1 px-6 py-3 border border-[#374151] text-gray-400 hover:text-white hover:border-[#4B5563] font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Retour
        </button>
        <button
          onClick={handleSubmit}
          disabled={isLoading || status === "success"}
          className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/40 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isLoading && (
            <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
          )}
          {status === "idle" || status === "error"
            ? "Inscrire"
            : status === "pending"
            ? "Signature..."
            : status === "confirming"
            ? "Confirmation..."
            : "Inscrit !"}
        </button>
      </div>
    </div>
  );
}
