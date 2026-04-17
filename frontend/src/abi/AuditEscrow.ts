export const AUDIT_ESCROW_ABI = [
  {
    name: "escrows",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "auditId", type: "uint256" }],
    outputs: [
      { name: "auditor",          type: "address" },
      { name: "paymentClaimed",   type: "bool"    },
      { name: "guaranteeClaimed", type: "bool"    },
      { name: "requester",        type: "address" },
      { name: "immediateAmount",  type: "uint256" },
      { name: "guaranteeAmount",  type: "uint256" },
    ],
  },
  {
    name: "PaymentReleased",
    type: "event",
    inputs: [
      { name: "auditId", type: "uint256", indexed: true },
      { name: "auditor", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
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
