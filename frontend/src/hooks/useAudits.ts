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
  reportCID: string;
  amount: bigint;
  guaranteeEnd: number;
  guaranteeDuration: number;
  depositedAt: number;
  status: number;
  exploitValidated: boolean;
}

/**
 * Retourne les audits enregistrés on-chain.
 * - Sans argument : tous les audits
 * - Avec auditorAddress : uniquement ceux assignés à cet auditeur
 *
 * Stratégie : getContractEvents(AuditDeposited) => getAudit(id) pour l'état courant.
 */
export function useAudits(auditorAddress?: Address) {
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
    // Si un auditeur est spécifié, on attend son adresse avant de charger
    if (!publicClient || !AUDIT_REGISTRY_ADDRESS) return;
    if (auditorAddress !== undefined && !auditorAddress) return;

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        // utilisation de getContractEvents pour récupérer tous les auditId depuis le déploiement.
        // useReadContract ne peut pas être utilisé car on est dans un useEffect
        const logs = await publicClient!.getContractEvents({
          address: AUDIT_REGISTRY_ADDRESS,
          abi: AUDIT_REGISTRY_ABI,
          eventName: "AuditDeposited",
          args: auditorAddress ? { auditor: auditorAddress } : undefined,
          fromBlock: DEPLOY_BLOCK,
          toBlock: "latest",
        });

        const auditIds = logs
          .map((l) => l.args.auditId)          // on ne sort que les auditId des logs
          .filter((id): id is bigint => id !== undefined); // on filtre les undefined

        // map appelle fetchAudit pour chaque élément du tableau et retourne un nouveau tableau
        // avec les résultats. Promise.all les attend tous en parallèle.
        const results = await Promise.all(auditIds.map(fetchAudit));
        if (cancelled) return; // s'il y a eu du changement, on ne met pas à jour l'état. Cf. cleanup plus bas.

        setAudits(results.filter((a): a is AuditEntry => a !== null));
      } catch (err) {
        if (!cancelled) setError(err as Error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      // cleanup : code qui s'exécute quand l'effet est "annulé" (composant démonté ou dépendances changées).
      // En mettant cancelled à true, on indique que les résultats des appels asynchrones
      // ne doivent plus être traités, ce qui évite de mettre à jour l'état d'un composant démonté.
      cancelled = true;
    };
  }, [publicClient, auditorAddress]);

  // Temps réel : nouvel audit déposé
  useWatchContractEvent({
    address: AUDIT_REGISTRY_ADDRESS,
    abi: AUDIT_REGISTRY_ABI,
    eventName: "AuditDeposited",
    args: auditorAddress ? { auditor: auditorAddress } : undefined,
    onLogs: async (logs) => {
      for (const log of logs) {
        const { auditId } = log.args;
        if (!auditId) continue;
        if (audits.some((a) => a.auditId === auditId)) continue; // évite les doublons. some renvoie true si a.auditId === auditId
        const entry = await fetchAudit(auditId); // récupère les données complètes depuis le contrat. await attend que la promesse soit résolue.
        if (entry) setAudits((prev) => [...prev, entry]); // met à jour l'état en ajoutant le nouvel audit à la liste
      }
    },
  });

  function refreshAudit(auditId: bigint) {
    fetchAudit(auditId).then((entry) => {
      if (!entry) return;
      setAudits((prev) => prev.map((a) => (a.auditId === auditId ? entry : a))); // crée une nouvelle liste où l'audit est remplacé par sa version fraîche, ce qui déclenche un re-render
    });
  }

  return { audits, isLoading, error, refreshAudit };
}
