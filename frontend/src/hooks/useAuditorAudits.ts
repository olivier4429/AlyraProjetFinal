import { useState, useEffect } from "react";
import { usePublicClient, useWatchContractEvent } from "wagmi";
import type { Address } from "viem";
import { AUDIT_REGISTRY_ABI } from "../abi/AuditRegistry";
import { AUDIT_REGISTRY_ADDRESS, DEPLOY_BLOCK } from "../constants/contracts";

export const AuditStatus = {
  PENDING: 0,
  VALIDATED: 1,
  CLOSED: 2,
} as const;

export interface AuditEntry {
  auditId: bigint;
  auditor: Address;
  requester: Address;
  auditedContractAddress: Address;
  reportCID: `0x${string}`;
  amount: bigint;
  guaranteeEnd: number;
  depositedAt: number;
  status: number;
  exploitValidated: boolean;
}

/**
 * Retourne tous les audits assignés à un auditeur donné.
 * Stratégie : getContractEvents(AuditDeposited, { auditor }) → getAudit(auditId) pour le statut actuel.
 */
export function useAuditorAudits(auditorAddress: Address | undefined) {
  const publicClient = usePublicClient();
  const [audits, setAudits] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function fetchAudit(auditId: bigint): Promise<AuditEntry | null> {
    try {
      const data = await publicClient!.readContract({
        address: AUDIT_REGISTRY_ADDRESS,
        abi: AUDIT_REGISTRY_ABI,
        functionName: "getAudit",
        args: [auditId],
      });
      return {
        auditId,
        auditor: data.auditor as Address,
        requester: data.requester as Address,
        auditedContractAddress: data.auditedContractAddress as Address,
        reportCID: data.reportCID as `0x${string}`,
        amount: data.amount,
        guaranteeEnd: Number(data.guaranteeEnd),
        depositedAt: Number(data.depositedAt),
        status: data.status,
        exploitValidated: (data as { exploitValidated?: boolean }).exploitValidated ?? false,
      };
    } catch {
      return null;
    }
  }

  useEffect(() => {
    if (!publicClient || !AUDIT_REGISTRY_ADDRESS || !auditorAddress) return;

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const logs = await publicClient!.getContractEvents({
          address: AUDIT_REGISTRY_ADDRESS,
          abi: AUDIT_REGISTRY_ABI,
          eventName: "AuditDeposited",
          args: { auditor: auditorAddress },
          fromBlock: DEPLOY_BLOCK,
          toBlock: "latest",
        });

        const auditIds = logs.map((l) => l.args.auditId).filter((id): id is bigint => id !== undefined);
        const results = await Promise.all(auditIds.map(fetchAudit));
        if (cancelled) return;

        setAudits(results.filter((a): a is AuditEntry => a !== null));
      } catch (err) {
        if (!cancelled) setError(err as Error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [publicClient, auditorAddress]);

  // Temps réel : nouvel audit assigné
  useWatchContractEvent({
    address: AUDIT_REGISTRY_ADDRESS,
    abi: AUDIT_REGISTRY_ABI,
    eventName: "AuditDeposited",
    args: { auditor: auditorAddress },
    onLogs: async (logs) => {
      for (const log of logs) {
        const { auditId } = log.args;
        if (!auditId) continue;
        if (audits.some((a) => a.auditId === auditId)) continue;
        const entry = await fetchAudit(auditId);
        if (entry) setAudits((prev) => [...prev, entry]);
      }
    },
  });

  // Rafraîchit le statut d'un audit après validation
  function refreshAudit(auditId: bigint) {
    fetchAudit(auditId).then((entry) => {
      if (!entry) return;
      setAudits((prev) => prev.map((a) => a.auditId === auditId ? entry : a));
    });
  }

  return { audits, isLoading, error, refreshAudit };
}
