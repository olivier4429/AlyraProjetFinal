export const AUDIT_REGISTRY_ABI = [
  {
    name: "registerAuditor",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "pseudo", type: "string" },
      { name: "specialties", type: "string[]" },
    ],
    outputs: [],
  },
  {
    name: "auditCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "AuditorRegistered",
    type: "event",
    inputs: [
      { name: "auditor", type: "address", indexed: true },
      { name: "pseudo", type: "string", indexed: false },
      { name: "tokenId", type: "uint256", indexed: false },
    ],
  },
] as const;
