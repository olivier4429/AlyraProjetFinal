import { createContext, useContext } from "react";
import { useReadContract } from "wagmi";
import type { Address } from "viem";
import { AUDIT_REGISTRY_ABI } from "../abi/AuditRegistry";
import { AUDIT_REGISTRY_ADDRESS } from "../constants/contracts";

interface ContractAddresses {
  usdcAddress: Address | undefined;
  escrowAddress: Address | undefined;
  reputationBadgeAddress: Address | undefined;
}

const ContractAddressesContext = createContext<ContractAddresses>({
  usdcAddress: undefined,
  escrowAddress: undefined,
  reputationBadgeAddress: undefined,
});

/**
 * Lit les adresses des contrats déployés depuis AuditRegistry au démarrage de l'app.
 * Les trois appels RPC sont effectués une seule fois, mis en cache par Wagmi,
 * et partagés via Context avec tous les composants enfants.
 */
export function ContractAddressesProvider({ children }: { children: React.ReactNode }) {
  const { data: usdcAddress } = useReadContract({
    address: AUDIT_REGISTRY_ADDRESS,
    abi: AUDIT_REGISTRY_ABI,
    functionName: "usdc",
    query: { enabled: !!AUDIT_REGISTRY_ADDRESS },
  });

  const { data: escrowAddress } = useReadContract({
    address: AUDIT_REGISTRY_ADDRESS,
    abi: AUDIT_REGISTRY_ABI,
    functionName: "escrowAddress",
    query: { enabled: !!AUDIT_REGISTRY_ADDRESS },
  });

  const { data: reputationBadgeAddress } = useReadContract({
    address: AUDIT_REGISTRY_ADDRESS,
    abi: AUDIT_REGISTRY_ABI,
    functionName: "reputationBadge",
    query: { enabled: !!AUDIT_REGISTRY_ADDRESS },
  });

  return (
    <ContractAddressesContext.Provider
      value={{
        usdcAddress: usdcAddress as Address | undefined,
        escrowAddress: escrowAddress as Address | undefined,
        reputationBadgeAddress: reputationBadgeAddress as Address | undefined,
      }}
    >
      {children}
    </ContractAddressesContext.Provider>
  );
}

export function useContractAddresses() {
  return useContext(ContractAddressesContext);
}
