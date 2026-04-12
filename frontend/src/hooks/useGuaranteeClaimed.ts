import { useState, useEffect } from "react";
import { usePublicClient, useWatchContractEvent } from "wagmi";
import { AUDIT_ESCROW_ABI } from "../abi/AuditEscrow";
import { AUDIT_ESCROW_ADDRESS, DEPLOY_BLOCK } from "../constants/contracts";

/**
 * Détermine si la retenue de garantie d'un audit a été récupérée,
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
      const logs = await publicClient!.getContractEvents({
        address: AUDIT_ESCROW_ADDRESS,
        abi: AUDIT_ESCROW_ABI,
        eventName: "GuaranteeReleased",
        args: { auditId },
        fromBlock: DEPLOY_BLOCK,
        toBlock: "latest",
      });
      if (cancelled) return;
      if (logs.length > 0) {
        setClaimed(true);
        setClaimedAmount(logs[0].args.amount ?? 0n);
      }
    }

    load().catch(() => {});
    return () => { cancelled = true; };
  }, [publicClient, auditId, enabled]);

  // Temps réel : écoute le moment où l'event est émis
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
