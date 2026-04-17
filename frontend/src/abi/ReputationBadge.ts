export const REPUTATION_BADGE_ABI = [
  {
    name: "tokenIdOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "auditor", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getAuditorData",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "auditor", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "registrationDate", type: "uint120" },
          { name: "reputationScore", type: "uint64" },
          { name: "totalAudits", type: "uint32" },
          { name: "totalExploits", type: "uint32" },
        ],
      },
    ],
  },
] as const;
