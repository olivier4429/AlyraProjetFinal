export const AUDIT_ESCROW_ABI = [
  {
    name: "GuaranteeReleased",
    type: "event",
    inputs: [
      { name: "auditId", type: "uint256", indexed: true },
      { name: "auditor", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;
