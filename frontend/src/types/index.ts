export type Specialty =
  | "DeFi"
  | "NFT"
  | "DAO"
  | "Bridge"
  | "Staking"
  | "Lending"
  | "DEX"
  | "Oracle"
  | "Governance"
  | "Layer2";

import type { Address } from "viem";

export interface Auditor {
  address: Address;
  pseudo: string;
  specialties: Specialty[];
  reputationScore: number;
  totalAudits: number;
  totalExploits: number;
  registrationDate: number;
  isActive: boolean;
}

export interface AuditorData {
  registrationDate: bigint;
  reputationScore: bigint;
  totalAudits: number;
  totalExploits: number;
  isActive: boolean;
}
