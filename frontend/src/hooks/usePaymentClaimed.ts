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
      const logs = await publicClient!.getContractEvents({
        address: AUDIT_ESCROW_ADDRESS,
        abi: AUDIT_ESCROW_ABI,
        eventName: "PaymentReleased",
        args: { auditId },
        fromBlock: DEPLOY_BLOCK,
        toBlock: "latest",
      });
      if (cancelled) return;
      if (logs.length > 0) setClaimed(true);
    }

    load().catch(() => {});
    return () => { cancelled = true; };
  }, [publicClient, auditId, enabled]);

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
