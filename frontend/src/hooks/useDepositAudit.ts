import { useEffect, useRef } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import type { Address } from "viem";
import { AUDIT_REGISTRY_ABI } from "../abi/AuditRegistry";
import { USDC_ABI } from "../abi/MockUSDC";
import { AUDIT_REGISTRY_ADDRESS, USDC_ADDRESS } from "../constants/contracts";

export interface DepositParams {
  auditor: Address;
  auditedContractAddress: Address;
  /** CID IPFS en texte brut (ex : "QmXxx...") - stocké tel quel on-chain */
  reportCid: string;
  /** Montant en USDC lisible (ex : "100") - converti en 6 décimales */
  amountUsdc: string;
  /** Durée de garantie en secondes (ex : 90 * 24 * 3600) */
  guaranteeDuration: number;
}

export type DepositStep =
  | "idle"
  | "approvePending"
  | "approveConfirming"
  | "depositPending"
  | "depositConfirming"
  | "success"
  | "error";

/**
 * Gère le flux en deux transactions : approve USDC => depositAudit.
 *
 * Utilisation :
 *   const { startFlow, reset, step, approveTxHash, depositTxHash, error } = useDepositAudit();
 *   startFlow(params)  => déclenche l'approbation, puis le dépôt automatiquement après confirmation.
 */
export function useDepositAudit() {
  // ── Étape 1 : approbation USDC ────────────────────────────────────────────

  const {
    writeContract: writeApprove,
    data: approveTxHash,
    isPending: isApprovePending,
    error: approveWriteError,
    reset: resetApprove,
  } = useWriteContract();

  const {
    isLoading: isApproveConfirming,
    isSuccess: isApproveSuccess,
    error: approveReceiptError,
  } = useWaitForTransactionReceipt({ hash: approveTxHash });

  // ── Étape 2 : dépôt de l'audit ────────────────────────────────────────────

  const {
    writeContract: writeDeposit,
    data: depositTxHash,
    isPending: isDepositPending,
    error: depositWriteError,
    reset: resetDeposit,
  } = useWriteContract();

  const {
    isLoading: isDepositConfirming,
    isSuccess: isDepositSuccess,
    error: depositReceiptError,
  } = useWaitForTransactionReceipt({ hash: depositTxHash });

  // ── Paramètres en attente (ref pour éviter les stale closures) ────────────

  const pendingRef = useRef<{
    auditor: Address;
    auditedContractAddress: Address;
    reportCID: string;
    amount: bigint;
    guaranteeDuration: number;
  } | null>(null);

  // ── Déclenchement automatique du dépôt après approval ────────────────────

  useEffect(() => {
    if (isApproveSuccess && pendingRef.current) {
      const p = pendingRef.current;
      writeDeposit({
        address: AUDIT_REGISTRY_ADDRESS,
        abi: AUDIT_REGISTRY_ABI,
        functionName: "depositAudit",
        args: [p.auditor, p.auditedContractAddress, p.reportCID, p.amount, p.guaranteeDuration],
      });
    }
  }, [isApproveSuccess]);

  // ── API publique ──────────────────────────────────────────────────────────

  function startFlow(params: DepositParams) {
    const amount = parseUnits(params.amountUsdc, 6);
    const reportCID = params.reportCid;

    pendingRef.current = {
      auditor: params.auditor,
      auditedContractAddress: params.auditedContractAddress,
      reportCID,
      amount,
      guaranteeDuration: params.guaranteeDuration,
    };

    writeApprove({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: "approve",
      args: [AUDIT_REGISTRY_ADDRESS, amount],
    });
  }

  function reset() {
    pendingRef.current = null;
    resetApprove();
    resetDeposit();
  }

  const error =
    approveWriteError ??
    approveReceiptError ??
    depositWriteError ??
    depositReceiptError;

  const step: DepositStep = (() => {
    if (isDepositSuccess) return "success";
    if (error) return "error";
    if (isDepositConfirming) return "depositConfirming";
    if (isDepositPending) return "depositPending";
    if (isApproveConfirming) return "approveConfirming";
    if (isApprovePending) return "approvePending";
    return "idle";
  })();

  return {
    startFlow,
    reset,
    step,
    approveTxHash,
    depositTxHash,
    error,
  };
}
