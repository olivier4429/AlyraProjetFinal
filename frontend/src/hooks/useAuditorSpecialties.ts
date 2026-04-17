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
      // On récupère les deux types d'events en parallèle :
      // - AuditorSpecialtiesUpdated : mis à jour après une modification
      // - AuditorRegistered : contient les spécialités initiales à l'inscription
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

      // On fusionne les deux listes et on trie par numéro de bloc décroissant
      // pour garder uniquement le dernier event, qui reflète l'état le plus récent
      const all = [...updated, ...registered].sort(
        (a, b) => Number(b.blockNumber) - Number(a.blockNumber)
      );

      if (all.length > 0) {
        setSpecialties((all[0].args as { specialties: string[] }).specialties ?? []);
      }
      setIsLoading(false);
    }

    load().catch(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; }; // cleanup : annule la mise à jour si le composant est démonté
  }, [address, client]);

  return { specialties, isLoading };
}
