import { useState, useEffect } from "react";
import { usePublicClient, useWatchContractEvent } from "wagmi";
import { AUDIT_ESCROW_ABI } from "../abi/AuditEscrow";
import { AUDIT_ESCROW_ADDRESS, DEPLOY_BLOCK } from "../constants/contracts";

/**
 * Détermine si le paiement immédiat (70%) d'un audit a été récupéré,
 * en se basant sur l'event PaymentReleased émis par AuditEscrow.
 */
export function usePaymentClaimed(auditId: bigint, enabled = true) {
  const publicClient = usePublicClient();
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (!publicClient || !AUDIT_ESCROW_ADDRESS || !enabled) return;

    let cancelled = false;

    async function load() {
      // On cherche si un event PaymentReleased existe déjà pour cet auditId
      // Si oui, le paiement a déjà été réclamé dans le passé
      const logs = await publicClient!.getContractEvents({
        address: AUDIT_ESCROW_ADDRESS,
        abi: AUDIT_ESCROW_ABI,
        eventName: "PaymentReleased",
        args: { auditId }, // filtre sur l'auditId pour ne pas charger tous les events
        fromBlock: DEPLOY_BLOCK,
        toBlock: "latest",
      });
      if (cancelled) return;
      if (logs.length > 0) setClaimed(true);
    }

    load().catch(() => {});
    return () => { cancelled = true; }; // cleanup : évite de mettre à jour l'état si le composant est démonté
  }, [publicClient, auditId, enabled]);

  // Temps réel : écoute le moment où le paiement est réclamé
  // enabled à false une fois réclamé : inutile de continuer à écouter
  useWatchContractEvent({
    address: AUDIT_ESCROW_ADDRESS,
    abi: AUDIT_ESCROW_ABI,
    eventName: "PaymentReleased",
    args: { auditId },
    enabled: !claimed && enabled && !!AUDIT_ESCROW_ADDRESS,
    onLogs: (logs) => {
      if (logs.length > 0) setClaimed(true);
    },
  });

  return { claimed };
}

/**
 * Détermine si la retenue de garantie (30%) d'un audit a été récupérée,
 * en se basant sur l'event GuaranteeReleased émis par AuditEscrow.
 */
export function useGuaranteeClaimed(auditId: bigint, enabled = true) {
  const publicClient = usePublicClient();
  const [claimed, setClaimed] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState<bigint>(0n);

  useEffect(() => {
    if (!publicClient || !AUDIT_ESCROW_ADDRESS || !enabled) return;

    let cancelled = false;

    async function load() {
      // On cherche si un event GuaranteeReleased existe déjà pour cet auditId
      // Si oui, la garantie a déjà été réclamée dans le passé
      const logs = await publicClient!.getContractEvents({
        address: AUDIT_ESCROW_ADDRESS,
        abi: AUDIT_ESCROW_ABI,
        eventName: "GuaranteeReleased",
        args: { auditId }, // filtre sur l'auditId pour ne pas charger tous les events
        fromBlock: DEPLOY_BLOCK,
        toBlock: "latest",
      });
      if (cancelled) return;
      if (logs.length > 0) {
        setClaimed(true);
        setClaimedAmount(logs[0].args.amount ?? 0n); // on récupère le montant depuis le premier log
      }
    }

    load().catch(() => {});
    return () => { cancelled = true; }; // cleanup : évite de mettre à jour l'état si le composant est démonté
  }, [publicClient, auditId, enabled]);

  // Temps réel : écoute le moment où la garantie est réclamée
  // enabled à false une fois réclamée : inutile de continuer à écouter
  useWatchContractEvent({
    address: AUDIT_ESCROW_ADDRESS,
    abi: AUDIT_ESCROW_ABI,
    eventName: "GuaranteeReleased",
    args: { auditId },
    enabled: !claimed && enabled && !!AUDIT_ESCROW_ADDRESS,
    onLogs: (logs) => {
      if (logs.length > 0) {
        setClaimed(true);
        setClaimedAmount(logs[0].args.amount ?? 0n);
      }
    },
  });

  return { claimed, claimedAmount };
}
