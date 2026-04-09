import { useState, useEffect } from "react";
import { useReadContract, usePublicClient, useWatchContractEvent } from "wagmi";
import { formatUnits } from "viem";
import { AUDIT_REGISTRY_ABI } from "../abi/AuditRegistry";
import { AUDIT_REGISTRY_ADDRESS, DEPLOY_BLOCK } from "../constants/contracts";
import type { Auditor } from "../types";

interface ProtocolStats {
  auditorCount: number;
  auditCount: number;
  exploitFreePercent: number;
  totalVolumeUsdc: string;
}

/**
 * Calcule les stats du protocole à partir des données on-chain.
 * - auditCount         : useReadContract sur AuditRegistry
 * - exploitFreePercent : dérivé de la liste des auditeurs passée en paramètre
 * - totalVolumeUsdc    : events AuditDeposited historiques + watch temps réel
 */
export function useProtocolStats(auditors: Auditor[]): ProtocolStats {
  const publicClient = usePublicClient();
  const [rawVolume, setRawVolume] = useState(0n);

  const { data: auditCountRaw } = useReadContract({
    address: AUDIT_REGISTRY_ADDRESS,
    abi: AUDIT_REGISTRY_ABI,
    functionName: "auditCount",
    query: { enabled: !!AUDIT_REGISTRY_ADDRESS },
  });

  // ── 1. Volume historique ──────────────────────────────────────────────────

  useEffect(() => {
    if (!publicClient || !AUDIT_REGISTRY_ADDRESS) return;

    publicClient.getContractEvents({
      address: AUDIT_REGISTRY_ADDRESS,
      abi: AUDIT_REGISTRY_ABI,
      eventName: "AuditDeposited",
      fromBlock: DEPLOY_BLOCK,
      toBlock: "latest",
    }).then((logs) => {
      const total = logs.reduce((sum, log) => sum + (log.args.amount ?? 0n), 0n);
      setRawVolume(total);
    }).catch(() => {});
  }, [publicClient]);

  // ── 2. Volume temps réel ──────────────────────────────────────────────────

  useWatchContractEvent({
    address: AUDIT_REGISTRY_ADDRESS,
    abi: AUDIT_REGISTRY_ABI,
    eventName: "AuditDeposited",
    onLogs: (logs) => {
      const added = logs.reduce((sum, log) => sum + (log.args.amount ?? 0n), 0n);
      setRawVolume((prev) => prev + added);
    },
  });

  // ── Calculs ───────────────────────────────────────────────────────────────

  const auditorCount = auditors.length;
  const auditCount = auditCountRaw !== undefined ? Number(auditCountRaw) : 0;

  const exploitFreeCount = auditors.filter((a) => a.totalExploits === 0).length;
  const exploitFreePercent =
    auditorCount > 0 ? Math.round((exploitFreeCount / auditorCount) * 100) : 0;

  const totalVolumeUsdc =
    rawVolume > 0n
      ? `${Math.round(Number(formatUnits(rawVolume, 6))).toLocaleString("fr-FR")} USDC`
      : "—";

  return { auditorCount, auditCount, exploitFreePercent, totalVolumeUsdc };
}
