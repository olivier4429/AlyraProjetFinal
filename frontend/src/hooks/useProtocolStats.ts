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

  // useReadContract est utilisé ici car auditCount est une valeur unique : pas besoin de boucle ni de useEffect
  const { data: auditCountRaw } = useReadContract({
    address: AUDIT_REGISTRY_ADDRESS,
    abi: AUDIT_REGISTRY_ABI,
    functionName: "auditCount",
    query: { enabled: !!AUDIT_REGISTRY_ADDRESS },
  });

  // ── 1. On va chercher le passé
  useEffect(() => {
    if (!publicClient || !AUDIT_REGISTRY_ADDRESS) return;

    // utilisation de getContractEvents pour recupérer les montants depuis le déploiement.
    // useReadContract ne peut pas être utilisé car on est dans un useEffect
    publicClient.getContractEvents({
      address: AUDIT_REGISTRY_ADDRESS,
      abi: AUDIT_REGISTRY_ABI,
      eventName: "AuditDeposited",
      fromBlock: DEPLOY_BLOCK,
      toBlock: "latest",
    }).then((logs) => {
      // reduce parcourt tous les logs et accumule la somme des montants
      const total = logs.reduce((sum, log) => sum + (log.args.amount ?? 0n), 0n);
      setRawVolume(total);
    }).catch(() => {});
  }, [publicClient]);

  // ── 2. Hook pour aller chercher tout ce qui arrive en temps réel après le chargement initial.
  // useWatchContractEvent ouvre une  WebSocket : onLogs est appelé
  // automatiquement à chaque nouvel audit déposé, sans rechargement de page
  useWatchContractEvent({
    address: AUDIT_REGISTRY_ADDRESS,
    abi: AUDIT_REGISTRY_ABI,
    eventName: "AuditDeposited",
    onLogs: (logs) => {
      const added = logs.reduce((sum, log) => sum + (log.args.amount ?? 0n), 0n);
      setRawVolume((prev) => prev + added); // on additionne au volume existant
    },
  });

  // ── Calculs éxécuté à chaque changement de données setRawVolume(), auditCountRaw ou auditors.
  const auditorCount = auditors.length;
  const auditCount = auditCountRaw !== undefined ? Number(auditCountRaw) : 0; //auditCountRaw !== undefined car useReadContract pourrait ne aps avoir encore retourné de données au premier rendu du composant.C'est pas grave, tout sera recalculé lorsqu'il arrivera.

  // exploitFreePercent : part des auditeurs n'ayant jamais subi d'exploit validé
  const exploitFreeCount = auditors.filter((a) => a.totalExploits === 0).length;
  const exploitFreePercent =
    auditorCount > 0 ? Math.round((exploitFreeCount / auditorCount) * 100) : 0;

  // formatUnits convertit les 6 décimales USDC en valeur lisible (ex : 95000000 => 95)
  const totalVolumeUsdc =
    rawVolume > 0n
      ? `${Math.round(Number(formatUnits(rawVolume, 6))).toLocaleString("fr-FR")} USDC`
      : "-";

  return { auditorCount, auditCount, exploitFreePercent, totalVolumeUsdc };
}
