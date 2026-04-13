import { useState } from "react";
import { isAddress, formatUnits } from "viem";
import type { Address } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { useAuditors } from "../hooks/useAuditors";
import { useDepositAudit } from "../hooks/useDepositAudit";
import { USDC_ABI } from "../abi/MockUSDC";
import { USDC_ADDRESS, AUDIT_REGISTRY_ADDRESS } from "../constants/contracts";
import Alert from "../components/ui/Alert";

// ── Helpers ──────────────────────────────────────────────────────────────────

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function etherscanTx(hash: string) {
  return `https://sepolia.etherscan.io/tx/${hash}`;
}

// ── Step indicator ────────────────────────────────────────────────────────────

interface StepRowProps {
  num: number;
  label: string;
  status: "waiting" | "active" | "done" | "error";
  txHash?: string;
}

function StepRow({ num, label, status, txHash }: StepRowProps) {
  const icon = {
    waiting: (
      <span className="w-6 h-6 rounded-full border-2 border-[#4B5563] flex items-center justify-center text-xs text-gray-500 font-bold">
        {num}
      </span>
    ),
    active: (
      <span className="w-6 h-6 rounded-full border-2 border-blue-400 flex items-center justify-center">
        <span className="animate-spin w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full" />
      </span>
    ),
    done: (
      <span className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    ),
    error: (
      <span className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
        <span className="text-white text-xs font-bold">!</span>
      </span>
    ),
  }[status];

  return (
    <div className="flex items-start gap-3">
      {icon}
      <div className="flex flex-col gap-0.5">
        <span className={`text-sm font-semibold ${status === "waiting" ? "text-gray-500" : "text-white"}`}>
          {label}
        </span>
        {txHash && (
          <a
            href={etherscanTx(txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline font-mono text-xs"
          >
            {txHash.slice(0, 18)}…{txHash.slice(-6)} ↗
          </a>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DepositPage() {
  const { address, isConnected } = useAccount();
  const { auditors, isLoading: auditorsLoading } = useAuditors();
  const { startFlow, reset, step, approveTxHash, depositTxHash, error } = useDepositAudit();

  // ── Presets durée de garantie ──────────────────────────────────────────────
  const GUARANTEE_PRESETS = [
    { label: "30 jours", value: 30 * 24 * 3600 },
    { label: "90 jours", value: 90 * 24 * 3600 },
    { label: "180 jours", value: 180 * 24 * 3600 },
    { label: "1 an", value: 365 * 24 * 3600 },
  ] as const;

  // ── Form state ─────────────────────────────────────────────────────────────
  const [auditor, setAuditor] = useState<Address | "">("");
  const [contractAddress, setContractAddress] = useState("");
  const [cid, setCid] = useState("");
  const [amountUsdc, setAmountUsdc] = useState("");
  const [guaranteeDuration, setGuaranteeDuration] = useState<number>(90 * 24 * 3600);
  const [customSeconds, setCustomSeconds] = useState("");
  const [useCustomDuration, setUseCustomDuration] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ── USDC balance ───────────────────────────────────────────────────────────
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!USDC_ADDRESS },
  });

  const balanceFormatted = usdcBalance !== undefined
    ? Number(formatUnits(usdcBalance as bigint, 6)).toFixed(2)
    : null;

  // ── Validation ─────────────────────────────────────────────────────────────
  // Adresse nulle si le contrat n'est pas encore déployé
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

  const effectiveDuration = useCustomDuration
    ? (parseInt(customSeconds) || 0)
    : guaranteeDuration;

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!auditor) errors.auditor = "Sélectionnez un auditeur.";
    if (contractAddress.trim() && !isAddress(contractAddress)) {
      errors.contractAddress = "Adresse Ethereum invalide (0x…).";
    }
    if (!cid.trim()) errors.cid = "Le CID du rapport est obligatoire.";
    const amount = parseFloat(amountUsdc);
    if (!amountUsdc || isNaN(amount) || amount <= 0) {
      errors.amountUsdc = "Montant USDC invalide.";
    } else if (usdcBalance !== undefined && amount > Number(formatUnits(usdcBalance as bigint, 6))) {
      errors.amountUsdc = `Solde insuffisant (${balanceFormatted} USDC disponibles).`;
    }
    if (effectiveDuration <= 0) errors.guarantee = "Durée de garantie invalide.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit() {
    if (!validate() || !auditor) return;
    startFlow({
      auditor,
      auditedContractAddress: (contractAddress.trim() && isAddress(contractAddress)
        ? contractAddress as Address
        : ZERO_ADDRESS),
      reportCid: cid.trim(),
      amountUsdc,
      guaranteeDuration: effectiveDuration,
    });
  }

  // ── Step statuses ──────────────────────────────────────────────────────────
  const approveStatus = (() => {
    if (["approvePending", "approveConfirming"].includes(step)) return "active";
    if (["depositPending", "depositConfirming", "success"].includes(step)) return "done";
    if (step === "error" && !approveTxHash) return "error";
    return "waiting";
  })();

  const depositStatus = (() => {
    if (["depositPending", "depositConfirming"].includes(step)) return "active";
    if (step === "success") return "done";
    if (step === "error" && approveTxHash) return "error";
    return "waiting";
  })();

  const isInProgress = ["approvePending", "approveConfirming", "depositPending", "depositConfirming"].includes(step);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!isConnected) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <p className="text-gray-400 text-lg">Connectez votre wallet pour déposer un audit.</p>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="max-w-xl mx-auto py-8">
        <div className="bg-[#111827] border border-[#374151] rounded-2xl p-8 flex flex-col gap-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white font-display">Audit déposé !</h2>
            <p className="text-gray-400 text-sm mt-2">L'auditeur a 10 jours pour valider le rapport.</p>
          </div>
          {depositTxHash && (
            <a
              href={etherscanTx(depositTxHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline font-mono text-xs"
            >
              Voir la transaction ↗
            </a>
          )}
          <button
            onClick={() => { reset(); setAuditor(""); setContractAddress(""); setCid(""); setAmountUsdc(""); setGuaranteeDuration(90 * 24 * 3600); setUseCustomDuration(false); setCustomSeconds(""); }}
            className="px-6 py-3 border border-[#374151] text-gray-400 hover:text-white hover:border-[#4B5563] font-bold rounded-lg transition-colors"
          >
            Nouveau dépôt
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-white font-display">Déposer un audit</h1>
        <p className="text-gray-400 text-sm mt-1">
          Sélectionnez un auditeur, renseignez le contrat à auditer et le rapport IPFS.
        </p>
      </div>

      {/* Form card */}
      <div className="bg-[#111827] border border-[#374151] rounded-2xl p-6 flex flex-col gap-5">

        {/* Auditeur */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-300">
            Auditeur désigné <span className="text-rose-400">*</span>
          </label>
          {auditorsLoading ? (
            <div className="h-11 rounded-lg bg-[#1F2937] animate-pulse" />
          ) : (
            <select
              value={auditor}
              onChange={(e) => { setAuditor(e.target.value as Address); setFormErrors((p) => ({ ...p, auditor: "" })); }}
              disabled={isInProgress}
              className="w-full bg-[#1F2937] border border-[#374151] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
            >
              <option value="">- Choisir un auditeur -</option>
              {auditors.filter((a) => a.isActive && a.address.toLowerCase() !== address?.toLowerCase()).map((a) => (
                <option key={a.address} value={a.address}>
                  {a.pseudo} - {shortenAddress(a.address)} (score {a.reputationScore})
                </option>
              ))}
            </select>
          )}
          {formErrors.auditor && <span className="text-xs text-rose-400">{formErrors.auditor}</span>}
        </div>

        {/* Contrat audité */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-300">
            Adresse du contrat audité
            <span className="ml-2 text-xs text-gray-500 font-normal">(optionnel)</span>
          </label>
          <input
            type="text"
            value={contractAddress}
            onChange={(e) => { setContractAddress(e.target.value); setFormErrors((p) => ({ ...p, contractAddress: "" })); }}
            disabled={isInProgress}
            placeholder="0x… - laisser vide si pas encore déployé"
            className="w-full bg-[#1F2937] border border-[#374151] rounded-lg px-4 py-2.5 text-white placeholder-gray-500 font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
          />
          {formErrors.contractAddress
            ? <span className="text-xs text-rose-400">{formErrors.contractAddress}</span>
            : <span className="text-xs text-gray-500">
                Adresse on-chain du contrat audité. Si le contrat n'est pas encore déployé,
                laissez vide - l'adresse sera <span className="font-mono">0x000…000</span>.
              </span>
          }
        </div>

        {/* CID du rapport */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-300">
            CID du rapport d'audit <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={cid}
            onChange={(e) => { setCid(e.target.value); setFormErrors((p) => ({ ...p, cid: "" })); }}
            disabled={isInProgress}
            placeholder="QmXxx... ou ipfs://..."
            className="w-full bg-[#1F2937] border border-[#374151] rounded-lg px-4 py-2.5 text-white placeholder-gray-500 font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
          />
          {formErrors.cid && <span className="text-xs text-rose-400">{formErrors.cid}</span>}
        </div>

        {/* Durée de garantie */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-300">
            Durée de garantie <span className="text-rose-400">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {GUARANTEE_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => { setUseCustomDuration(false); setGuaranteeDuration(p.value); }}
                disabled={isInProgress}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-50 ${
                  !useCustomDuration && guaranteeDuration === p.value
                    ? "bg-blue-500 border-blue-500 text-white"
                    : "bg-[#1F2937] border-[#374151] text-gray-300 hover:border-blue-500"
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setUseCustomDuration(true)}
              disabled={isInProgress}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-50 ${
                useCustomDuration
                  ? "bg-blue-500 border-blue-500 text-white"
                  : "bg-[#1F2937] border-[#374151] text-gray-300 hover:border-blue-500"
              }`}
            >
              Personnalisé
            </button>
          </div>
          {useCustomDuration && (
            <div className="relative mt-1">
              <input
                type="number"
                min="1"
                value={customSeconds}
                onChange={(e) => setCustomSeconds(e.target.value)}
                disabled={isInProgress}
                placeholder="ex : 7776000"
                className="w-full bg-[#1F2937] border border-[#374151] rounded-lg px-4 py-2.5 pr-20 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">secondes</span>
            </div>
          )}
          {formErrors.guarantee
            ? <span className="text-xs text-rose-400">{formErrors.guarantee}</span>
            : <span className="text-xs text-gray-500">
                Période pendant laquelle le requester peut signaler un exploit après validation.
              </span>
          }
        </div>

        {/* Montant USDC */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-300">
              Montant USDC <span className="text-rose-400">*</span>
            </label>
            {balanceFormatted !== null && (
              <span className="text-xs text-gray-500 font-mono">
                Solde : <span className="text-gray-300">{balanceFormatted} USDC</span>
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="1"
              value={amountUsdc}
              onChange={(e) => { setAmountUsdc(e.target.value); setFormErrors((p) => ({ ...p, amountUsdc: "" })); }}
              disabled={isInProgress}
              placeholder="10000"
              className="w-full bg-[#1F2937] border border-[#374151] rounded-lg px-4 py-2.5 pr-16 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">USDC</span>
          </div>
          {formErrors.amountUsdc
            ? <span className="text-xs text-rose-400">{formErrors.amountUsdc}</span>
            : amountUsdc && (
              <span className="text-xs text-gray-500">
                Frais protocole 5 % = {(parseFloat(amountUsdc || "0") * 0.05).toFixed(2)} USDC =>
                {" "}{(parseFloat(amountUsdc || "0") * 0.95).toFixed(2)} USDC en séquestre
              </span>
            )
          }
        </div>

        {/* Breakdowns info */}
        {amountUsdc && !isNaN(parseFloat(amountUsdc)) && parseFloat(amountUsdc) > 0 && (
          <div className="bg-[#0A0E1A] border border-[#374151] rounded-lg p-4 text-xs text-gray-400 flex flex-col gap-1.5">
            <div className="flex justify-between">
              <span>Paiement immédiat auditeur (70 %)</span>
              <span className="text-white font-mono">{(parseFloat(amountUsdc) * 0.95 * 0.70).toFixed(2)} USDC</span>
            </div>
            <div className="flex justify-between">
              <span>Retenue de garantie (30 %)</span>
              <span className="text-white font-mono">{(parseFloat(amountUsdc) * 0.95 * 0.30).toFixed(2)} USDC</span>
            </div>
            <div className="h-px bg-[#374151] my-0.5" />
            <div className="flex justify-between text-gray-500">
              <span>Frais protocole (5 %)</span>
              <span className="font-mono">{(parseFloat(amountUsdc) * 0.05).toFixed(2)} USDC</span>
            </div>
          </div>
        )}
      </div>

      {/* Status des transactions - visible dès le lancement */}
      {step !== "idle" && (
        <div className="bg-[#111827] border border-[#374151] rounded-2xl p-6 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Progression
          </h3>

          <div className="flex flex-col gap-4">
            <StepRow
              num={1}
              label="Approbation USDC"
              status={approveStatus as "waiting" | "active" | "done" | "error"}
              txHash={approveTxHash}
            />
            <div className="w-px h-4 bg-[#374151] ml-3" />
            <StepRow
              num={2}
              label="Dépôt de l'audit"
              status={depositStatus as "waiting" | "active" | "done" | "error"}
              txHash={depositTxHash}
            />
          </div>

          {step === "approvePending" && (
            <Alert variant="warn">
              <div className="flex items-center gap-2">
                <span className="animate-spin inline-block w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full" />
                Signez l'approbation dans votre wallet…
              </div>
            </Alert>
          )}
          {step === "approveConfirming" && (
            <Alert variant="info">Transaction d'approbation envoyée, en attente de confirmation…</Alert>
          )}
          {step === "depositPending" && (
            <Alert variant="warn">
              <div className="flex items-center gap-2">
                <span className="animate-spin inline-block w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full" />
                Signez le dépôt dans votre wallet…
              </div>
            </Alert>
          )}
          {step === "depositConfirming" && (
            <Alert variant="info">Transaction de dépôt envoyée, en attente de confirmation…</Alert>
          )}
          {step === "error" && (
            <Alert variant="danger">
              <div className="flex flex-col gap-1">
                <span className="font-bold">Erreur</span>
                <span className="text-xs opacity-80">
                  {error?.message?.slice(0, 150) ?? "Une erreur est survenue."}
                </span>
              </div>
            </Alert>
          )}
        </div>
      )}

      {/* CTA */}
      <div className="flex gap-3">
        {step === "error" && (
          <button
            onClick={reset}
            className="flex-1 px-6 py-3 border border-[#374151] text-gray-400 hover:text-white hover:border-[#4B5563] font-bold rounded-lg transition-colors"
          >
            Réinitialiser
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={isInProgress || !USDC_ADDRESS || !AUDIT_REGISTRY_ADDRESS}
          className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/40 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isInProgress && (
            <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
          )}
          {step === "idle" || step === "error"
            ? "Déposer l'audit"
            : step === "approvePending"
            ? "Approbation en cours…"
            : step === "approveConfirming"
            ? "Confirmation approbation…"
            : step === "depositPending"
            ? "Dépôt en cours…"
            : "Confirmation dépôt…"}
        </button>
      </div>

      {!USDC_ADDRESS && (
        <Alert variant="warn">
          VITE_USDC_ADDRESS non défini dans .env. Relancez le script de déploiement.
        </Alert>
      )}
    </div>
  );
}
