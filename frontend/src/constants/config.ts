// Liste statique des spécialités proposées dans l'UI.
// Amélioration possible : dériver dynamiquement cette liste en agrégeant
// les events AuditorRegistered et AuditorSpecialtiesUpdated pour refléter
// toutes les spécialités effectivement utilisées on-chain.
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
