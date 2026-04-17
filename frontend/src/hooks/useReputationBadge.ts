import { useReadContract } from "wagmi";
import type { Address } from "viem";
import { REPUTATION_BADGE_ABI } from "../abi/ReputationBadge";
import { REPUTATION_BADGE_ADDRESS } from "../constants/contracts";
import type { AuditorData } from "../types";

/**
 * Vérifie si un auditeur est enregistré.
 * Est utilisé lors de la souscription pour ne pas lancer une souscription déjà faite.
 * @param address adresse de l'auditeur à vérifier. Si aucune adresse n'est fournie, la requête ne sera pas exécutée.
 */
export function useIsRegistered(address?: Address) {
  // useReadContract est utilisé ici car tokenIdOf est une valeur unique : pas besoin de boucle ni de useEffect
  // query.enabled évite d'envoyer la requête si l'adresse n'est pas encore disponible (wallet non connecté)
  const { data: tokenId, isLoading } = useReadContract({
    address: REPUTATION_BADGE_ADDRESS,
    abi: REPUTATION_BADGE_ABI,
    functionName: "tokenIdOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address }, // !! convertit en booléen : undefined => false, adresse => true
  });

  return {
    tokenId: tokenId as bigint | undefined,
    isRegistered: tokenId !== undefined && tokenId > 0n, // tokenId > 0 signifie qu'un NFT a été minté pour cette adresse
    isLoading,
  };
}

/**
 * Récupère les données de réputation d'un auditeur depuis ReputationBadge.
 * Retourne le score, le nombre d'audits, d'exploits et la date d'inscription.
 * @param address adresse de l'auditeur. Si absente, la requête ne sera pas exécutée.
 */
export function useAuditorData(address?: Address) {
  const { data, isLoading, error } = useReadContract({
    address: REPUTATION_BADGE_ADDRESS,
    abi: REPUTATION_BADGE_ABI,
    functionName: "getAuditorData",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Le retour de viem est un tuple non typé : on le caste explicitement
  const auditorData = data as
    | {
        registrationDate: bigint;
        reputationScore: bigint;
        totalAudits: number;
        totalExploits: number;
      }
    | undefined;

  // On mappe vers le type AuditorData de l'application
  const mapped: AuditorData | undefined = auditorData
    ? {
        registrationDate: auditorData.registrationDate,
        reputationScore: auditorData.reputationScore,
        totalAudits: auditorData.totalAudits,
        totalExploits: auditorData.totalExploits,
      }
    : undefined;

  return { auditorData: mapped, isLoading, error };
}
