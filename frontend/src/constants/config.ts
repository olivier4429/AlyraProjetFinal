export const SPECIALTIES = [
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
] as const;

export type Specialty = (typeof SPECIALTIES)[number];
