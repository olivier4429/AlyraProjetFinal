import { useState, useEffect } from "react";
import { usePublicClient } from "wagmi";
import type { Address } from "viem";
import { AUDIT_REGISTRY_ABI } from "../abi/AuditRegistry";
import { AUDIT_REGISTRY_ADDRESS, DEPLOY_BLOCK } from "../constants/contracts";

/**
 * Récupère les spécialités actuelles d'un auditeur en lisant le dernier
 * événement AuditorSpecialtiesUpdated ou AuditorRegistered.
 */
export function useAuditorSpecialties(address?: Address) {
  const client = usePublicClient();
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!address || !client) return;

    let cancelled = false;
    setIsLoading(true);

    async function load() {
      const [updated, registered] = await Promise.all([
        client!.getContractEvents({
          address: AUDIT_REGISTRY_ADDRESS,
          abi: AUDIT_REGISTRY_ABI,
          eventName: "AuditorSpecialtiesUpdated",
          args: { auditor: address },
          fromBlock: DEPLOY_BLOCK,
        }),
        client!.getContractEvents({
          address: AUDIT_REGISTRY_ADDRESS,
          abi: AUDIT_REGISTRY_ABI,
          eventName: "AuditorRegistered",
          args: { auditor: address },
          fromBlock: DEPLOY_BLOCK,
        }),
      ]);

      if (cancelled) return;

      // Merge and sort by blockNumber desc, take the most recent
      const all = [...updated, ...registered].sort(
        (a, b) => Number(b.blockNumber) - Number(a.blockNumber)
      );

      if (all.length > 0) {
        setSpecialties((all[0].args as { specialties: string[] }).specialties ?? []);
      }
      setIsLoading(false);
    }

    load().catch(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [address, client]);

  return { specialties, isLoading };
}
