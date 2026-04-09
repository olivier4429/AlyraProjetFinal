import type { Address } from "viem";

import type { Specialty } from "../constants/config";

export type { Specialty };

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
