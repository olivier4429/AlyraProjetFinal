import { useReadContract } from "wagmi";
import type { Address } from "viem";
import { REPUTATION_BADGE_ABI } from "../abi/ReputationBadge";
import { REPUTATION_BADGE_ADDRESS } from "../constants/contracts";
import type { AuditorData } from "../types";


/**
 * Vérifie si un auditeur est enregistré. 
 * Est utilisé lors de la souscription pour ne pas lancer une souscription déjà faite.
 * @param address adressse de l'auditeur à vérifier. Si aucune adresse n'est fournie, la requête ne sera pas exécutée.
 * @returns 
 */
export function useIsRegistered(address?: Address) {
  const { data: tokenId, isLoading } = useReadContract({
    address: REPUTATION_BADGE_ADDRESS,
    abi: REPUTATION_BADGE_ABI,
    functionName: "tokenIdOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address }, //!! permet de convertir une valeur en booléen meme si null ou undefined
  });

  return {
    tokenId: tokenId as bigint | undefined,
    isRegistered: tokenId !== undefined && tokenId > 0n,
    isLoading,
  };
}

export function useAuditorData(address?: Address) {
  const { data, isLoading, error } = useReadContract({
    address: REPUTATION_BADGE_ADDRESS,
    abi: REPUTATION_BADGE_ABI,
    functionName: "getAuditorData",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const auditorData = data as
    | {
        registrationDate: bigint;
        reputationScore: bigint;
        totalAudits: number;
        totalExploits: number;
        isActive: boolean;
      }
    | undefined;

  const mapped: AuditorData | undefined = auditorData
    ? {
        registrationDate: auditorData.registrationDate,
        reputationScore: auditorData.reputationScore,
        totalAudits: auditorData.totalAudits,
        totalExploits: auditorData.totalExploits,
        isActive: auditorData.isActive,
      }
    : undefined;

  return { auditorData: mapped, isLoading, error };
}
