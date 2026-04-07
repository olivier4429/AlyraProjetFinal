import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { AUDIT_REGISTRY_ABI } from "../abi/AuditRegistry";
import { AUDIT_REGISTRY_ADDRESS } from "../constants/contracts";

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
