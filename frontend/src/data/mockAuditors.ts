import type { Auditor } from "../types";

export const mockAuditors: Auditor[] = [
  {
    address: "0xA1b2C3d4E5f6A7b8C9d0E1f2A3b4C5d6E7f8A9b0",
    pseudo: "Alice Xu",
    specialties: ["DeFi", "Lending", "Oracle"],
    reputationScore: 982,
    totalAudits: 24,
    totalExploits: 0,
    registrationDate: 1680000000,
    isActive: true,
  },
  {
    address: "0xB2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9B0c1",
    pseudo: "Baptiste Moreau",
    specialties: ["Bridge", "Layer2", "DAO"],
    reputationScore: 871,
    totalAudits: 17,
    totalExploits: 1,
    registrationDate: 1685000000,
    isActive: true,
  },
  {
    address: "0xC3d4E5f6A7b8C9d0E1f2A3b4C5d6E7f8A9b0C1d2",
    pseudo: "Clara Lefèvre",
    specialties: ["NFT", "DEX", "Staking"],
    reputationScore: 744,
    totalAudits: 11,
    totalExploits: 0,
    registrationDate: 1690000000,
    isActive: true,
  },
  {
    address: "0xD4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9B0c1D2e3",
    pseudo: "David Renard",
    specialties: ["Governance", "DeFi", "Staking"],
    reputationScore: 612,
    totalAudits: 8,
    totalExploits: 2,
    registrationDate: 1695000000,
    isActive: true,
  },
];
