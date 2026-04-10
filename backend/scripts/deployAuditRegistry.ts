/**
 * Script de déploiement complet du protocole.
 *
 * Usage :
 *   npx hardhat run scripts/deployAuditRegistry.ts --network localhost
 *   npx hardhat run scripts/deployAuditRegistry.ts --network sepolia
 *
 * Déploie dans l'ordre :
 *   1. ReputationBadge
 *   2. MockUSDC / MockTreasury / MockDAOVoting
 *   3. AuditEscrow  (sans adresse registry : dépendance circulaire)
 *   4. AuditRegistry
 *   5. setRegistryAddress sur ReputationBadge et AuditEscrow
 */

import { network } from "hardhat";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const { viem, networkName } = await network.connect();
const publicClient = await viem.getPublicClient();

console.log(`\n📦 Déploiement du protocole sur ${networkName}...\n`);

// ── SVG ──────────────────────────────────────────────────────────────────────
const svgContent = readFileSync(
  resolve(process.cwd(), "svg", "reputation-nft.mint.svg"),
  "utf-8"
);

// ── Bloc de départ (pour les getLogs du frontend) ─────────────────────────────
const deployBlock = await publicClient.getBlockNumber();

// ── Contrats ─────────────────────────────────────────────────────────────────
const badge = await viem.deployContract("ReputationBadge", [svgContent]);
console.log(`  ✅ ReputationBadge : ${badge.address}`);

const mockUsdc = await viem.deployContract("MockUSDC");
console.log(`  ✅ MockUSDC        : ${mockUsdc.address}`);

const mockTreasury = await viem.deployContract("MockTreasury");
console.log(`  ✅ MockTreasury    : ${mockTreasury.address}`);

const mockDao = await viem.deployContract("MockDAOVoting");
console.log(`  ✅ MockDAOVoting   : ${mockDao.address}`);

// AuditEscrow déployé sans adresse registry (dépendance circulaire)
const escrow = await viem.deployContract("AuditEscrow", [mockUsdc.address]);
console.log(`  ✅ AuditEscrow     : ${escrow.address}`);

const registry = await viem.deployContract("AuditRegistry", [
  badge.address,
  mockUsdc.address,
  mockTreasury.address,
  escrow.address,
  mockDao.address,
]);
console.log(`  ✅ AuditRegistry   : ${registry.address}`);

// ── Liaison circulaire ────────────────────────────────────────────────────────
const linkBadgeHash = await badge.write.setRegistryAddress([registry.address]);
await publicClient.waitForTransactionReceipt({ hash: linkBadgeHash });

const linkEscrowHash = await escrow.write.setRegistryAddress([registry.address]);
await publicClient.waitForTransactionReceipt({ hash: linkEscrowHash });

console.log(`\n🔗 ReputationBadge + AuditEscrow liés à AuditRegistry`);

// ── Mise à jour frontend/.env ─────────────────────────────────────────────────
const envFilePath = resolve(process.cwd(), "../frontend/.env");
let envContent = readFileSync(envFilePath, "utf-8");

const setEnvVar = (content: string, key: string, value: string): string => {
  const regex = new RegExp(`^${key}=.*$`, "m");
  const line = `${key}=${value}`;
  return regex.test(content) ? content.replace(regex, line) : content + `\n${line}`;
};

envContent = setEnvVar(envContent, "VITE_AUDIT_REGISTRY_ADDRESS", registry.address);
envContent = setEnvVar(envContent, "VITE_REPUTATION_BADGE_ADDRESS", badge.address);
envContent = setEnvVar(envContent, "VITE_DEPLOY_BLOCK", deployBlock.toString());
writeFileSync(envFilePath, envContent);
console.log(`📝 frontend/.env mis à jour`);

// ── Résumé ────────────────────────────────────────────────────────────────────
console.log("\n✨ Déploiement terminé !\n");
console.log("Adresses déployées :");
console.log(`  AuditRegistry   : ${registry.address}`);
console.log(`  ReputationBadge : ${badge.address}`);
console.log(`  AuditEscrow     : ${escrow.address}`);
console.log(`  MockUSDC        : ${mockUsdc.address}`);
console.log(`  MockTreasury    : ${mockTreasury.address}`);
console.log(`  MockDAOVoting   : ${mockDao.address}`);
