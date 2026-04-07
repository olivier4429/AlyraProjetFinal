import type { Specialty } from "../types";

// TODO: Remplacer par les vraies adresses après déploiement
export const AUDIT_REGISTRY_ADDRESS =
  "0x0000000000000000000000000000000000000000" as const;

// TODO: Remplacer par la vraie adresse après déploiement
export const REPUTATION_BADGE_ADDRESS =
  "0x0000000000000000000000000000000000000000" as const;

export const SPECIALTIES: Specialty[] = [
  "DeFi",
  "NFT",
  "DAO",
  "Bridge",
  "Staking",
  "Lending",
  "DEX",
  "Oracle",
  "Governance",
  "Layer2",
];
