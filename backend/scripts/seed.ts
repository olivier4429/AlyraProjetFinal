/**
 * Script de seed — déploie tous les contrats et inscrit des auditeurs de test.
 *
 * Usage :
 *   npx hardhat run scripts/seed.ts --network localhost  (nœud Hardhat local)
 *   npx hardhat run scripts/seed.ts --network sepolia    (Sepolia)
 *
 * Sur le réseau local, les comptes Hardhat pré-financés (accounts[1..4]) sont
 * utilisés pour les auditeurs.
 * Sur Sepolia, les clés privées AUDITOR_N_PRIVATE_KEY du fichier .env sont
 * utilisées. Ces comptes doivent avoir un peu d'ETH Sepolia pour signer.
 *
 * Après exécution, les adresses sont automatiquement écrites dans
 * frontend/src/constants/contracts.ts
 */

import "dotenv/config";
import { network } from "hardhat";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { privateKeyToAccount } from "viem/accounts";
import type { Account, Hex } from "viem";

const { viem, networkName } = await network.connect();

// =========================================================================
// Données de test : correspondent aux mockAuditors du frontend
// =========================================================================

const AUDITORS = [
  {
    pseudo: "Alice Xu",
    specialties: ["DeFi", "Lending", "Oracle"],
  },
  {
    pseudo: "Baptiste Moreau",
    specialties: ["Bridge", "Layer2", "DAO"],
  },
  {
    pseudo: "Clara Lefevre",
    specialties: ["NFT", "DEX", "Staking"],
  },
  {
    pseudo: "David Renard",
    specialties: ["Governance", "DeFi", "Staking"],
  },
];

// =========================================================================
// Résolution des comptes auditeurs selon le réseau
// =========================================================================

console.log(`\n🚀 Seed sur le réseau : ${networkName}\n`);

const walletClients = await viem.getWalletClients();

let auditorAccounts: Account[];

const auditorEnvKeys = [
  process.env.AUDITOR_1_PRIVATE_KEY,
  process.env.AUDITOR_2_PRIVATE_KEY,
  process.env.AUDITOR_3_PRIVATE_KEY,
  process.env.AUDITOR_4_PRIVATE_KEY,
].filter((k): k is string => !!k && k.length > 0);

if (auditorEnvKeys.length > 0) {
  // Réseau externe (Sepolia…) : clés privées dédiées depuis .env
  auditorAccounts = auditorEnvKeys.map((k) => privateKeyToAccount(k as Hex));
  console.log(
    `👛 Auditeurs : ${auditorAccounts.length} compte(s) depuis AUDITOR_N_PRIVATE_KEY (.env)\n`
  );
} else {
  // Réseau local Hardhat : comptes pré-financés accounts[1..4]
  auditorAccounts = walletClients.slice(1, 5).map((wc) => wc.account);
  console.log("👛 Auditeurs : comptes Hardhat locaux (accounts[1..4])\n");
}

// =========================================================================
// Déploiement
// =========================================================================

const svgContent = readFileSync(
  resolve(process.cwd(), "svg", "reputation-nft.mint.svg"),
  "utf-8"
);

console.log("📦 Déploiement des contrats...");

const reputationBadge = await viem.deployContract("ReputationBadge", [
  svgContent,
]);
console.log(`  ✅ ReputationBadge : ${reputationBadge.address}`);

const mockUsdc = await viem.deployContract("MockUSDC");
console.log(`  ✅ MockUSDC        : ${mockUsdc.address}`);

const mockTreasury = await viem.deployContract("MockTreasury");
console.log(`  ✅ MockTreasury    : ${mockTreasury.address}`);

const mockEscrow = await viem.deployContract("MockAuditEscrow", [
  mockUsdc.address,
]);
console.log(`  ✅ MockAuditEscrow : ${mockEscrow.address}`);

const mockDao = await viem.deployContract("MockDAOVoting");
console.log(`  ✅ MockDAOVoting   : ${mockDao.address}`);

const registry = await viem.deployContract("AuditRegistry", [
  reputationBadge.address,
  mockUsdc.address,
  mockTreasury.address,
  mockEscrow.address,
  mockDao.address,
]);
console.log(`  ✅ AuditRegistry   : ${registry.address}`);

// Lier ReputationBadge à AuditRegistry
const publicClient = await viem.getPublicClient();

const linkHash = await reputationBadge.write.setRegistryAddress([registry.address]);
await publicClient.waitForTransactionReceipt({ hash: linkHash });
console.log(`\n🔗 ReputationBadge lié à AuditRegistry`);

// =========================================================================
// Inscription des auditeurs
// =========================================================================

console.log("\n👤 Inscription des auditeurs...");

const registrationCount = Math.min(AUDITORS.length, auditorAccounts.length);
for (let i = 0; i < registrationCount; i++) {
  const { pseudo, specialties } = AUDITORS[i];
  const account = auditorAccounts[i];

  const registerHash = await registry.write.registerAuditor([pseudo, specialties], { account });
  await publicClient.waitForTransactionReceipt({ hash: registerHash });

  const tokenId = await reputationBadge.read.tokenIdOf([account.address]);

  console.log(
    `  ✅ ${pseudo.padEnd(18)} adresse: ${account.address}  tokenId: #${tokenId}`
  );
}

// =========================================================================
// Mise à jour de frontend/.env avec les adresses déployées
// =========================================================================

const envFilePath = resolve(process.cwd(), "../frontend/.env");

// Lit le .env existant et remplace uniquement les lignes d'adresses
let envContent = readFileSync(envFilePath, "utf-8");

const setEnvVar = (content: string, key: string, value: string): string => {
  const regex = new RegExp(`^${key}=.*$`, "m");
  const line = `${key}=${value}`;
  return regex.test(content) ? content.replace(regex, line) : content + `\n${line}`;
};

envContent = setEnvVar(envContent, "VITE_AUDIT_REGISTRY_ADDRESS", registry.address);
envContent = setEnvVar(envContent, "VITE_REPUTATION_BADGE_ADDRESS", reputationBadge.address);

writeFileSync(envFilePath, envContent);
console.log(`\n📝 frontend/.env mis à jour (réseau : ${networkName})`);

// =========================================================================
// Résumé
// =========================================================================

console.log("\n✨ Seed terminé !\n");
console.log("Adresses déployées :");
console.log(`  AuditRegistry   : ${registry.address}`);
console.log(`  ReputationBadge : ${reputationBadge.address}`);
console.log(`  MockUSDC        : ${mockUsdc.address}`);
console.log(`  MockTreasury    : ${mockTreasury.address}`);
console.log(`  MockAuditEscrow : ${mockEscrow.address}`);
console.log(`  MockDAOVoting   : ${mockDao.address}`);
