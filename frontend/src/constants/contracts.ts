import type { Address } from "viem";

export const AUDIT_REGISTRY_ADDRESS = import.meta.env
  .VITE_AUDIT_REGISTRY_ADDRESS as Address;

export const REPUTATION_BADGE_ADDRESS = import.meta.env
  .VITE_REPUTATION_BADGE_ADDRESS as Address;
