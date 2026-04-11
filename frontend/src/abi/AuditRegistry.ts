export const AUDIT_REGISTRY_ABI = [
  // ── Fonctions d'écriture ─────────────────────────────────────────────────
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
    name: "updateSpecialties",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "specialties", type: "string[]" }],
    outputs: [],
  },
  {
    name: "depositAudit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "auditor", type: "address" },
      { name: "auditedContractAddress", type: "address" },
      { name: "reportCID", type: "string" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "validateAudit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "auditId", type: "uint256" },
      { name: "guaranteeDuration", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "claimPayment",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "auditId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "claimGuarantee",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "auditId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "claimRefundAfterTimeout",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "auditId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "reportExploit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "auditId", type: "uint256" },
      { name: "preuvesCID", type: "string" },
    ],
    outputs: [],
  },
  {
    name: "claimGuaranteeAfterExploit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "auditId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "setAuditedContractAddress",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "auditId", type: "uint256" },
      { name: "contractAddress", type: "address" },
    ],
    outputs: [],
  },
  // ── Fonctions de lecture ─────────────────────────────────────────────────
  {
    name: "auditCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getAudit",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "auditId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "auditor", type: "address" },
          { name: "guaranteeEnd", type: "uint40" },
          { name: "depositedAt", type: "uint40" },
          { name: "reportCID", type: "string" },
          { name: "amount", type: "uint256" },
          { name: "auditedContractAddress", type: "address" },
          { name: "status", type: "uint8" },
          { name: "requester", type: "address" },
        ],
      },
    ],
  },
  {
    name: "hasPendingAudit",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "requester", type: "address" },
      { name: "auditor", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  // ── Événements ───────────────────────────────────────────────────────────
  {
    name: "AuditorRegistered",
    type: "event",
    inputs: [
      { name: "auditor", type: "address", indexed: true },
      { name: "pseudo", type: "string", indexed: false },
      { name: "specialties", type: "string[]", indexed: false },
    ],
  },
  {
    name: "AuditorSpecialtiesUpdated",
    type: "event",
    inputs: [
      { name: "auditor", type: "address", indexed: true },
      { name: "specialties", type: "string[]", indexed: false },
    ],
  },
  {
    name: "AuditDeposited",
    type: "event",
    inputs: [
      { name: "auditId", type: "uint256", indexed: true },
      { name: "auditor", type: "address", indexed: true },
      { name: "requester", type: "address", indexed: true },
      { name: "auditedContractAddress", type: "address", indexed: false },
      { name: "reportCID", type: "string", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "AuditValidated",
    type: "event",
    inputs: [
      { name: "auditId", type: "uint256", indexed: true },
      { name: "auditor", type: "address", indexed: true },
      { name: "guaranteeEnd", type: "uint256", indexed: false },
      { name: "immediatePayment", type: "uint256", indexed: false },
    ],
  },
  {
    name: "RefundClaimed",
    type: "event",
    inputs: [
      { name: "auditId", type: "uint256", indexed: true },
      { name: "requester", type: "address", indexed: true },
      { name: "refundAmount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "ExploitReported",
    type: "event",
    inputs: [
      { name: "auditId", type: "uint256", indexed: true },
      { name: "requester", type: "address", indexed: true },
      { name: "preuvesCID", type: "string", indexed: false },
    ],
  },
  {
    name: "IncidentResolved",
    type: "event",
    inputs: [
      { name: "auditId", type: "uint256", indexed: true },
      { name: "validated", type: "bool", indexed: false },
    ],
  },
  {
    name: "AuditedContractAddressSet",
    type: "event",
    inputs: [
      { name: "auditId", type: "uint256", indexed: true },
      { name: "contractAddress", type: "address", indexed: true },
    ],
  },
] as const;
