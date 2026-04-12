import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { AUDIT_REGISTRY_ABI } from "../abi/AuditRegistry";
import { AUDIT_REGISTRY_ADDRESS } from "../constants/contracts";

export function useClaimPayment() {
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

  const claim = (auditId: bigint) => {
    writeContract({
      address: AUDIT_REGISTRY_ADDRESS,
      abi: AUDIT_REGISTRY_ABI,
      functionName: "claimPayment",
      args: [auditId],
    });
  };

  return {
    claim,
    txHash,
    isSignaturePending,
    isConfirming,
    isSuccess,
    error: writeError ?? receiptError,
    reset,
  };
}

export function useClaimGuarantee() {
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

  const claim = (auditId: bigint) => {
    writeContract({
      address: AUDIT_REGISTRY_ADDRESS,
      abi: AUDIT_REGISTRY_ABI,
      functionName: "claimGuarantee",
      args: [auditId],
    });
  };

  return {
    claim,
    txHash,
    isSignaturePending,
    isConfirming,
    isSuccess,
    error: writeError ?? receiptError,
    reset,
  };
}

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

  const validate = (auditId: bigint) => {
    writeContract({
      address: AUDIT_REGISTRY_ADDRESS,
      abi: AUDIT_REGISTRY_ABI,
      functionName: "validateAudit",
      args: [auditId],
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

export function useSetAuditedContractAddress() {
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

  const setAddress = (auditId: bigint, contractAddress: `0x${string}`) => {
    writeContract({
      address: AUDIT_REGISTRY_ADDRESS,
      abi: AUDIT_REGISTRY_ABI,
      functionName: "setAuditedContractAddress",
      args: [auditId, contractAddress],
    });
  };

  return {
    setAddress,
    txHash,
    isSignaturePending,
    isConfirming,
    isSuccess,
    error: writeError ?? receiptError,
    reset,
  };
}

export function useUpdateSpecialties() {
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

  const update = (specialties: string[]) => {
    writeContract({
      address: AUDIT_REGISTRY_ADDRESS,
      abi: AUDIT_REGISTRY_ABI,
      functionName: "updateSpecialties",
      args: [specialties],
    });
  };

  return {
    update,
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
