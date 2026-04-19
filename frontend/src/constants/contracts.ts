import type { Address } from "viem";

export const AUDIT_REGISTRY_ADDRESS = import.meta.env
  .VITE_AUDIT_REGISTRY_ADDRESS as Address;

/** Bloc à partir duquel chercher les events (écrit par le script de déploiement). */
export const DEPLOY_BLOCK = BigInt(import.meta.env.VITE_DEPLOY_BLOCK ?? "0");
