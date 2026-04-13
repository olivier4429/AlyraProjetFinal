import { useState, useEffect } from "react";
import { usePublicClient, useWatchContractEvent } from "wagmi";
import type { Address } from "viem";
import { AUDIT_REGISTRY_ABI } from "../abi/AuditRegistry";
import { AUDIT_REGISTRY_ADDRESS, DEPLOY_BLOCK } from "../constants/contracts";
import type { AuditEntry } from "./useAuditorAudits";

/**
 * Liste tous les audits enregistrés on-chain (sans filtre d'auditeur).
 * Stratégie : getContractEvents(AuditDeposited) => getAudit(id) pour l'état courant.
 */
export function useAllAudits() {
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
        reportCID: data.reportCID as string,
        amount: data.amount,
        guaranteeEnd: Number(data.guaranteeEnd),
        guaranteeDuration: Number(data.guaranteeDuration),
        depositedAt: Number(data.depositedAt),
        status: data.status,
        exploitValidated: data.exploitValidated ?? false,
      };
    } catch {
      return null;
    }
  }

  useEffect(() => {
    if (!publicClient || !AUDIT_REGISTRY_ADDRESS) return;

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const logs = await publicClient!.getContractEvents({
          address: AUDIT_REGISTRY_ADDRESS,
          abi: AUDIT_REGISTRY_ABI,
          eventName: "AuditDeposited",
          fromBlock: DEPLOY_BLOCK,
          toBlock: "latest",
        });

        const auditIds = logs
          .map((l) => l.args.auditId)
          .filter((id): id is bigint => id !== undefined);

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
  }, [publicClient]);

  // Temps réel : nouvel audit déposé
  useWatchContractEvent({
    address: AUDIT_REGISTRY_ADDRESS,
    abi: AUDIT_REGISTRY_ABI,
    eventName: "AuditDeposited",
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

  function refreshAudit(auditId: bigint) {
    fetchAudit(auditId).then((entry) => {
      if (!entry) return;
      setAudits((prev) => prev.map((a) => (a.auditId === auditId ? entry : a)));
    });
  }

  return { audits, isLoading, error, refreshAudit };
}
