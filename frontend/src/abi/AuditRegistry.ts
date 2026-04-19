export const AUDIT_REGISTRY_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "reputationBadgeContract",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "USDCContract",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "treasuryContract",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "escrowContract",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "daoVotingContract",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AuditRegistry__AlreadyRegistered",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AuditRegistry__AmountZero",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AuditRegistry__AuditNotClosed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AuditRegistry__AuditNotPending",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AuditRegistry__AuditNotValidated",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AuditRegistry__AuditorNotRegistered",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AuditRegistry__CannotAuditYourself",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AuditRegistry__ContractAddressAlreadySet",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AuditRegistry__EmptyCID",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AuditRegistry__ExploitNotValidated",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AuditRegistry__GuaranteeExpired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AuditRegistry__GuaranteeNotExpired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AuditRegistry__GuaranteeTooShort",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AuditRegistry__IncidentAlreadyExists",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AuditRegistry__InvalidStatus",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AuditRegistry__NotDAOVoting",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AuditRegistry__NotTheAuditor",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AuditRegistry__NotTheRequester",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AuditRegistry__TooManySpecialties",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AuditRegistry__TransferFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AuditRegistry__ValidationTimeout",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AuditRegistry__ZeroAddress",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "auditId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "auditor",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "requester",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "auditedContractAddress",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "AuditDeposited",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "auditId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "auditor",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "guaranteeEnd",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "immediatePayment",
        "type": "uint256"
      }
    ],
    "name": "AuditValidated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "auditId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "contractAddress",
        "type": "address"
      }
    ],
    "name": "AuditedContractAddressSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "auditor",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "pseudo",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string[]",
        "name": "specialties",
        "type": "string[]"
      }
    ],
    "name": "AuditorRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "auditor",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string[]",
        "name": "specialties",
        "type": "string[]"
      }
    ],
    "name": "AuditorSpecialtiesUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "auditId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "requester",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "preuvesCID",
        "type": "string"
      }
    ],
    "name": "ExploitReported",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "auditId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "requester",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "GuaranteeClaimedByRequester",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "auditId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "validated",
        "type": "bool"
      }
    ],
    "name": "IncidentResolved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "auditId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "requester",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "refundAmount",
        "type": "uint256"
      }
    ],
    "name": "RefundClaimed",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "MAX_SPECIALTIES",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "VALIDATION_TIMEOUT",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "auditCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "audits",
    "outputs": [
      {
        "internalType": "address",
        "name": "auditor",
        "type": "address"
      },
      {
        "internalType": "uint40",
        "name": "guaranteeEnd",
        "type": "uint40"
      },
      {
        "internalType": "uint40",
        "name": "depositedAt",
        "type": "uint40"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "auditedContractAddress",
        "type": "address"
      },
      {
        "internalType": "enum AuditRegistry.AuditStatus",
        "name": "status",
        "type": "uint8"
      },
      {
        "internalType": "bool",
        "name": "exploitValidated",
        "type": "bool"
      },
      {
        "internalType": "uint32",
        "name": "guaranteeDuration",
        "type": "uint32"
      },
      {
        "internalType": "address",
        "name": "requester",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "reportCID",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "auditId",
        "type": "uint256"
      }
    ],
    "name": "claimGuarantee",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "auditId",
        "type": "uint256"
      }
    ],
    "name": "claimGuaranteeAfterExploit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "auditId",
        "type": "uint256"
      }
    ],
    "name": "claimPayment",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "auditId",
        "type": "uint256"
      }
    ],
    "name": "claimRefundAfterTimeout",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "daoVotingAddress",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "auditor",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "auditedContractAddress",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "reportCID",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint32",
        "name": "guaranteeDuration",
        "type": "uint32"
      }
    ],
    "name": "depositAudit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "escrowAddress",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "auditId",
        "type": "uint256"
      }
    ],
    "name": "getAudit",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "auditor",
            "type": "address"
          },
          {
            "internalType": "uint40",
            "name": "guaranteeEnd",
            "type": "uint40"
          },
          {
            "internalType": "uint40",
            "name": "depositedAt",
            "type": "uint40"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "auditedContractAddress",
            "type": "address"
          },
          {
            "internalType": "enum AuditRegistry.AuditStatus",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "bool",
            "name": "exploitValidated",
            "type": "bool"
          },
          {
            "internalType": "uint32",
            "name": "guaranteeDuration",
            "type": "uint32"
          },
          {
            "internalType": "address",
            "name": "requester",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "reportCID",
            "type": "string"
          }
        ],
        "internalType": "struct AuditRegistry.Audit",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "pseudo",
        "type": "string"
      },
      {
        "internalType": "string[]",
        "name": "specialties",
        "type": "string[]"
      }
    ],
    "name": "registerAuditor",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "auditId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "preuvesCID",
        "type": "string"
      }
    ],
    "name": "reportExploit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "reputationBadge",
    "outputs": [
      {
        "internalType": "contract ReputationBadge",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "auditId",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "validated",
        "type": "bool"
      }
    ],
    "name": "resolveIncident",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "auditId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "contractAddress",
        "type": "address"
      }
    ],
    "name": "setAuditedContractAddress",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "treasuryAddress",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string[]",
        "name": "specialties",
        "type": "string[]"
      }
    ],
    "name": "updateSpecialties",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "usdc",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "auditId",
        "type": "uint256"
      }
    ],
    "name": "validateAudit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
