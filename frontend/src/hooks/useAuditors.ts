import { useState, useEffect } from "react";
import { usePublicClient } from "wagmi";
import { getAddress } from "viem";
import type { Address } from "viem";
import { AUDIT_REGISTRY_ABI } from "../abi/AuditRegistry";
import { REPUTATION_BADGE_ABI } from "../abi/ReputationBadge";
import { AUDIT_REGISTRY_ADDRESS, REPUTATION_BADGE_ADDRESS, DEPLOY_BLOCK } from "../constants/contracts";
import type { Auditor, Specialty } from "../types";

/**
 * Lit la liste complète des auditeurs depuis la blockchain.
 *
 * Stratégie :
 *  1. getLogs(AuditorRegistered)        → adresse + pseudo + spécialités initiales
 *  2. getLogs(AuditorSpecialtiesUpdated) → surcharge les spécialités si mises à jour
 *  3. readContract(getAuditorData) par adresse → score, compteurs, isActive
 */
export function useAuditors() {
  const publicClient = usePublicClient();
  const [auditors, setAuditors] = useState<Auditor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // useEffect se déclenche une fois au montage du composant qui utilise useAuditors, puis à chaque fois que publicClient change : quand l'utilisateur change de réseau.
  useEffect(() => {
    if (!publicClient || !AUDIT_REGISTRY_ADDRESS) return;

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        // 1. Tous les events AuditorRegistered
        const registeredLogs = await publicClient!.getLogs({
          address: AUDIT_REGISTRY_ADDRESS,
          event: AUDIT_REGISTRY_ABI.find((e) => e.name === "AuditorRegistered" && e.type === "event") as never,
          fromBlock: DEPLOY_BLOCK,
          toBlock: "latest",
        });

        // 2. Tous les events AuditorSpecialtiesUpdated
        const updatedLogs = await publicClient!.getLogs({
          address: AUDIT_REGISTRY_ADDRESS,
          event: AUDIT_REGISTRY_ABI.find((e) => e.name === "AuditorSpecialtiesUpdated" && e.type === "event") as never,
          fromBlock: DEPLOY_BLOCK,
          toBlock: "latest",
        });

        // Map adresse → { pseudo, specialties }
        const auditorMap = new Map<string, { pseudo: string; specialties: string[] }>();

        for (const log of registeredLogs) {
          const args = log.args as { auditor: Address; pseudo: string; specialties: string[] };
          const addr = getAddress(args.auditor);
          auditorMap.set(addr, { pseudo: args.pseudo, specialties: args.specialties ?? [] });
        }

        // Surcharger les spécialités si l'auditeur les a mises à jour
        for (const log of updatedLogs) {
          const args = log.args as { auditor: Address; specialties: string[] };
          const addr = getAddress(args.auditor);
          const existing = auditorMap.get(addr);
          if (existing) {
            auditorMap.set(addr, { ...existing, specialties: args.specialties ?? [] });
          }
        }

        const addresses = [...auditorMap.keys()] as Address[];

        if (cancelled) return;

        if (addresses.length === 0) {
          setAuditors([]);
          setIsLoading(false);
          return;
        }

        // 3. Un readContract par adresse (pas de multicall : fonctionne sur tous les réseaux)
        const results = await Promise.all(
          addresses.map((addr) =>
            publicClient!.readContract({
              address: REPUTATION_BADGE_ADDRESS,
              abi: REPUTATION_BADGE_ABI,
              functionName: "getAuditorData",
              args: [addr],
            }).catch(() => null)
          )
        );

        if (cancelled) return;

        const auditorList: Auditor[] = addresses.flatMap((addr, i) => {
          const data = results[i] as {
            registrationDate: bigint;
            reputationScore: bigint;
            totalAudits: number;
            totalExploits: number;
            isActive: boolean;
          } | null;

          if (!data) return [];

          const { pseudo, specialties } = auditorMap.get(addr)!;

          return [{
            address: addr,
            pseudo,
            specialties: specialties as Specialty[],
            reputationScore: Number(data.reputationScore),
            totalAudits: Number(data.totalAudits),
            totalExploits: Number(data.totalExploits),
            registrationDate: Number(data.registrationDate),
            isActive: data.isActive,
          }];
        });

        setAuditors(auditorList);
      } catch (err) {
        if (!cancelled) setError(err as Error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [publicClient]);

  return { auditors, isLoading, error };
}
