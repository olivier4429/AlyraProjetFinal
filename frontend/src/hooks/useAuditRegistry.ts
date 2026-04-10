import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { AUDIT_REGISTRY_ABI } from "../abi/AuditRegistry";
import { AUDIT_REGISTRY_ADDRESS } from "../constants/contracts";

export function useValidateAudit() {
  const {
    writeContract,
    data: txHash,
    isPending: isSignaturePending,
    error: writeError,
    reset,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash: txHash });

  const validate = (auditId: bigint, guaranteeDurationSeconds: bigint) => {
    writeContract({
      address: AUDIT_REGISTRY_ADDRESS,
      abi: AUDIT_REGISTRY_ABI,
      functionName: "validateAudit",
      args: [auditId, guaranteeDurationSeconds],
    });
  };

  return {
    validate,
    txHash,
    isSignaturePending,
    isConfirming,
    isSuccess,
    error: writeError ?? receiptError,
    reset,
  };
}

export function useRegisterAuditor() {
  const {
    writeContract,
    data: txHash,
    isPending: isSignaturePending,
    error: writeError,
    reset,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const register = (pseudo: string, specialties: string[]) => {
    writeContract({
      address: AUDIT_REGISTRY_ADDRESS,
      abi: AUDIT_REGISTRY_ABI,
      functionName: "registerAuditor",
      args: [pseudo, specialties],
    });
  };

  const error = writeError || receiptError;

  return {
    register,
    txHash,
    isSignaturePending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}
