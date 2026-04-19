import { useState, useEffect } from "react";
import { usePublicClient, useWatchContractEvent } from "wagmi";
import { getAddress } from "viem";
import type { Address } from "viem";
import { AUDIT_REGISTRY_ABI } from "../abi/AuditRegistry";
import { REPUTATION_BADGE_ABI } from "../abi/ReputationBadge";
import { AUDIT_REGISTRY_ADDRESS, DEPLOY_BLOCK } from "../constants/contracts";
import { useContractAddresses } from "./useContractAddresses";
import type { Auditor, Specialty } from "../types";

/**
 * Lit la liste complète des auditeurs depuis la blockchain.
 *
 * Stratégie :
 *  1. getContractEvents historiques au montage => tous les auditeurs inscrits depuis le déploiement
 *  2. useWatchContractEvent en temps réel => mise à jour automatique sans rechargement
 */
export function useAuditors() {
  const { reputationBadgeAddress } = useContractAddresses();
  const publicClient = usePublicClient();
  const [auditors, setAuditors] = useState<Auditor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  // Récupère les données de réputation d'un auditeur depuis ReputationBadge
  async function fetchAuditorData(addr: Address) {
    if (!reputationBadgeAddress) return null;
    return publicClient!.readContract({
      address: reputationBadgeAddress,
      abi: REPUTATION_BADGE_ABI,
      functionName: "getAuditorData",
      args: [addr],
    }).catch(() => null);
  }

  // Construit un objet Auditor à partir des données on-chain
  function buildAuditor(
    addr: Address,
    pseudo: string,
    specialties: string[],
    data: { registrationDate: bigint; reputationScore: bigint; totalAudits: number; totalExploits: number }
  ): Auditor {
    return {
      address: addr,
      pseudo,
      specialties: specialties as Specialty[],
      reputationScore: Number(data.reputationScore),
      totalAudits: Number(data.totalAudits),
      totalExploits: Number(data.totalExploits),
      registrationDate: Number(data.registrationDate),
    };
  }

  // ── 1. Chargement historique ────────────────────────────────────────────────

  useEffect(() => {
    if (!publicClient || !AUDIT_REGISTRY_ADDRESS || !reputationBadgeAddress) return;

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        // On récupère les deux types d'events en parallèle pour reconstruire
        // l'état courant de chaque auditeur : inscription initiale + mises à jour
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

        // Map adresse => { pseudo, specialties } : on part de l'inscription
        // puis on écrase les spécialités avec la dernière mise à jour
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
            // On remplace les spécialités par la version la plus récente
            metaMap.set(getAddress(auditor), {
              ...existing,
              specialties: specialties ? [...specialties] : [],
            });
          }
        }

        if (cancelled) return;

        const addresses = [...metaMap.keys()] as Address[];

        // Pour chaque auditeur, on récupère ses données de réputation en parallèle
        const results = await Promise.all(addresses.map(fetchAuditorData));

        if (cancelled) return;

        const list: Auditor[] = addresses.flatMap((addr, i) => {
          const data = results[i] as Parameters<typeof buildAuditor>[3] | null;
          if (!data) return []; // flatMap ignore les tableaux vides => filtre les erreurs
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
    return () => { cancelled = true; }; // cleanup : évite de mettre à jour l'état si le composant est démonté
  }, [publicClient, reputationBadgeAddress]);

  // ── 2. Mise à jour temps réel : nouvelle inscription ───────────────────────

  // useWatchContractEvent ouvre une souscription connexion : onLogs est appelé
  // automatiquement dès qu'un auditeur s'inscrit, sans rechargement de page
  useWatchContractEvent({
    address: AUDIT_REGISTRY_ADDRESS,
    abi: AUDIT_REGISTRY_ABI,
    eventName: "AuditorRegistered",
    onLogs: async (logs) => {
      for (const log of logs) {
        const { auditor, pseudo, specialties } = log.args;
        if (!auditor) continue;
        const addr = getAddress(auditor);

        if (auditors.some((a) => a.address === addr)) continue; // évite les doublons

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
        // On remplace les spécialités de l'auditeur concerné dans la liste existante
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
