import { useState, useEffect } from "react";
import { useReadContract, usePublicClient } from "wagmi";
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
 * - auditCount         : lu directement sur AuditRegistry
 * - exploitFreePercent : dérivé de la liste des auditeurs passée en paramètre
 * - totalVolumeUsdc    : somme des events AuditDeposited
 */
export function useProtocolStats(auditors: Auditor[]): ProtocolStats {
  const publicClient = usePublicClient();
  const [totalVolumeUsdc, setTotalVolumeUsdc] = useState<string>("—");

  const { data: auditCountRaw } = useReadContract({
    address: AUDIT_REGISTRY_ADDRESS,
    abi: AUDIT_REGISTRY_ABI,
    functionName: "auditCount",
    query: { enabled: !!AUDIT_REGISTRY_ADDRESS },
  });

  // Volume total : somme des amounts dans les events AuditDeposited
  // useEffect se déclenche une fois au montage du composant qui utilise useProtocolStats, puis à chaque fois que publicClient change : quand l'utilisateur change de réseau.
  useEffect(() => {
    if (!publicClient || !AUDIT_REGISTRY_ADDRESS) return;

    publicClient.getLogs({
      address: AUDIT_REGISTRY_ADDRESS,
      event: AUDIT_REGISTRY_ABI.find(
        (e) => e.name === "AuditDeposited" && e.type === "event"
      ) as never,
      fromBlock: DEPLOY_BLOCK,
        toBlock: "latest",
    }).then((logs) => {
      const total = logs.reduce((sum, log) => {
        const args = log.args as { amount?: bigint };
        return sum + (args.amount ?? 0n);
      }, 0n);

      // USDC = 6 décimales. Arrondi à l'entier.
      const formatted = Math.round(Number(formatUnits(total, 6)));
      setTotalVolumeUsdc(
        formatted > 0 ? `${formatted.toLocaleString("fr-FR")} USDC` : "—"
      );
    }).catch(() => setTotalVolumeUsdc("—"));
  }, [publicClient]);

  const auditorCount = auditors.length;
  const auditCount = auditCountRaw !== undefined ? Number(auditCountRaw) : 0;

  const exploitFreeCount = auditors.filter((a) => a.totalExploits === 0).length;
  const exploitFreePercent =
    auditorCount > 0 ? Math.round((exploitFreeCount / auditorCount) * 100) : 0;

  return { auditorCount, auditCount, exploitFreePercent, totalVolumeUsdc };
}
