import { useState, useEffect } from "react";
import { usePublicClient, useWatchContractEvent } from "wagmi";
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
 *  1. getContractEvents historiques au montage => tous les auditeurs inscrits depuis le déploiement
 *  2. useWatchContractEvent en temps réel => mise à jour automatique sans rechargement
 */
export function useAuditors() {
  const publicClient = usePublicClient();
  const [auditors, setAuditors] = useState<Auditor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  async function fetchAuditorData(addr: Address) {
    return publicClient!.readContract({
      address: REPUTATION_BADGE_ADDRESS,
      abi: REPUTATION_BADGE_ABI,
      functionName: "getAuditorData",
      args: [addr],
    }).catch(() => null);
  }

  function buildAuditor(
    addr: Address,
    pseudo: string,
    specialties: string[],
    data: { registrationDate: bigint; reputationScore: bigint; totalAudits: number; totalExploits: number; isActive: boolean }
  ): Auditor {
    return {
      address: addr,
      pseudo,
      specialties: specialties as Specialty[],
      reputationScore: Number(data.reputationScore),
      totalAudits: Number(data.totalAudits),
      totalExploits: Number(data.totalExploits),
      registrationDate: Number(data.registrationDate),
      isActive: data.isActive,
    };
  }

  // ── 1. Chargement historique ────────────────────────────────────────────────

  useEffect(() => {
    if (!publicClient || !AUDIT_REGISTRY_ADDRESS) return;

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const [registeredLogs, updatedLogs] = await Promise.all([
          publicClient!.getContractEvents({
            address: AUDIT_REGISTRY_ADDRESS,
            abi: AUDIT_REGISTRY_ABI,
            eventName: "AuditorRegistered",
            fromBlock: DEPLOY_BLOCK,
            toBlock: "latest",
          }),
          publicClient!.getContractEvents({
            address: AUDIT_REGISTRY_ADDRESS,
            abi: AUDIT_REGISTRY_ABI,
            eventName: "AuditorSpecialtiesUpdated",
            fromBlock: DEPLOY_BLOCK,
            toBlock: "latest",
          }),
        ]);

        // Map adresse => { pseudo, specialties }
        const metaMap = new Map<string, { pseudo: string; specialties: string[] }>();

        for (const log of registeredLogs) {
          const { auditor, pseudo, specialties } = log.args;
          if (!auditor) continue;
          metaMap.set(getAddress(auditor), {
            pseudo: pseudo ?? "",
            specialties: specialties ? [...specialties] : [],
          });
        }

        for (const log of updatedLogs) {
          const { auditor, specialties } = log.args;
          if (!auditor) continue;
          const existing = metaMap.get(getAddress(auditor));
          if (existing) {
            metaMap.set(getAddress(auditor), {
              ...existing,
              specialties: specialties ? [...specialties] : [],
            });
          }
        }

        if (cancelled) return;

        const addresses = [...metaMap.keys()] as Address[];

        const results = await Promise.all(addresses.map(fetchAuditorData));

        if (cancelled) return;

        const list: Auditor[] = addresses.flatMap((addr, i) => {
          const data = results[i] as Parameters<typeof buildAuditor>[3] | null;
          if (!data) return [];
          const { pseudo, specialties } = metaMap.get(addr)!;
          return [buildAuditor(addr, pseudo, specialties, data)];
        });

        setAuditors(list);
      } catch (err) {
        if (!cancelled) setError(err as Error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [publicClient]);

  // ── 2. Mise à jour temps réel : nouvelle inscription ───────────────────────

  useWatchContractEvent({
    address: AUDIT_REGISTRY_ADDRESS,
    abi: AUDIT_REGISTRY_ABI,
    eventName: "AuditorRegistered",
    onLogs: async (logs) => {
      for (const log of logs) {
        const { auditor, pseudo, specialties } = log.args;
        if (!auditor) continue;
        const addr = getAddress(auditor);

        // Ne pas dupliquer si déjà présent
        if (auditors.some((a) => a.address === addr)) continue;

        const data = await fetchAuditorData(addr);
        if (!data) continue;

        setAuditors((prev) => [
          ...prev,
          buildAuditor(addr, pseudo ?? "", specialties ? [...specialties] : [], data as Parameters<typeof buildAuditor>[3]),
        ]);
      }
    },
  });

  // ── 3. Mise à jour temps réel : spécialités modifiées ─────────────────────

  useWatchContractEvent({
    address: AUDIT_REGISTRY_ADDRESS,
    abi: AUDIT_REGISTRY_ABI,
    eventName: "AuditorSpecialtiesUpdated",
    onLogs: (logs) => {
      for (const log of logs) {
        const { auditor, specialties } = log.args;
        if (!auditor) continue;
        const addr = getAddress(auditor);
        setAuditors((prev) =>
          prev.map((a) =>
            a.address === addr
              ? { ...a, specialties: (specialties ? [...specialties] : []) as Specialty[] }
              : a
          )
        );
      }
    },
  });

  return { auditors, isLoading, error };
}
