/**
 * Script de déploiement et seed : déploie tous les contrats et inscrit des auditeurs de test.
 *
 * Usage :
 *   npx hardhat run scripts/deployAllAndSeed.ts --network localhost  (nœud Hardhat local)
 *   npx hardhat run scripts/deployAllAndSeed.ts --network sepolia    (Sepolia)
 *
 * Sur le réseau local, les comptes Hardhat pré-financés (accounts[1..4]) sont
 * utilisés pour les auditeurs.
 * Sur Sepolia, les clés privées AUDITOR_N_PRIVATE_KEY du fichier .env sont
 * utilisées. Ces comptes doivent avoir un peu d'ETH Sepolia pour signer.
 *
 * Après exécution, les adresses et le bloc de déploiement sont automatiquement
 * écrits dans frontend/.env (variables VITE_*).
 */

import "dotenv/config";
import { network } from "hardhat";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { privateKeyToAccount } from "viem/accounts";
import {
  parseUnits,
  type Account,
  type Hex,
} from "viem";

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
let requesterAccounts: Account[];

// Les clés privées sont indispensables ici car ces comptes doivent SIGNER des transactions :
//   - auditeurs  signe pour registerAuditor() 
//   - demandeurs signe pour depositAudit()    
// Une adresse publique seule ne suffit pas pour signer.
const auditorEnvKeys = [
  process.env.AUDITOR_1_PRIVATE_KEY,
  process.env.AUDITOR_2_PRIVATE_KEY,
  process.env.AUDITOR_3_PRIVATE_KEY,
  process.env.AUDITOR_4_PRIVATE_KEY,
].filter((k): k is string => !!k && k.length > 0); //Filter afin de retirer de potentiels éléments indéfinis ou vides.

// Les demandeurs d'audit. Ici on en prévoit 2 pour alimenter les activités de test.
const requesterEnvKeys = [
  process.env.DEMANDEUR_1_PRIVATE_KEY,
  process.env.DEMANDEUR_2_PRIVATE_KEY,
].filter((k): k is string => !!k && k.length > 0); //Filter afin de retirer de potentiels éléments indéfinis ou vides.

const isLocalNetwork = networkName === "localhost" || networkName === "hardhat";

if (!isLocalNetwork && auditorEnvKeys.length > 0) {
  // Réseau externe (Sepolia…) : clés privées dédiées depuis .env
  auditorAccounts = auditorEnvKeys.map((k) => privateKeyToAccount(k as Hex));
  requesterAccounts = requesterEnvKeys.map((k) => privateKeyToAccount(k as Hex));
  console.log(
    `👛 Auditeurs  : ${auditorAccounts.length} compte(s) depuis AUDITOR_N_PRIVATE_KEY (.env)`
  );
  console.log(
    `👛 Demandeurs : ${requesterAccounts.length} compte(s) depuis DEMANDEUR_N_PRIVATE_KEY (.env)\n`
  );
} else {
  // Réseau local Hardhat : comptes pré-financés (accounts[1..4] auditeurs, [5..6] demandeurs)
  auditorAccounts = walletClients.slice(1, 5).map((wc) => wc.account);
  requesterAccounts = walletClients.slice(5, 7).map((wc) => wc.account);
  console.log("👛 Auditeurs + demandeurs : comptes Hardhat locaux\n");
}

// =========================================================================
// Déploiement
// =========================================================================

const svgContent = readFileSync(
  resolve(process.cwd(), "svg", "reputation-nft.mint.svg"),
  "utf-8"
);

console.log("📦 Déploiement des contrats...");

// Bloc courant avant tout déploiement : utilisé par le frontend comme fromBlock
// pour les getLogs (évite de scanner depuis le bloc genesis)
const publicClient = await viem.getPublicClient();
const deployBlock = await publicClient.getBlockNumber();

const reputationBadge = await viem.deployContract("ReputationBadge", [
  svgContent,
]);
console.log(`  ✅ ReputationBadge : ${reputationBadge.address}`);

const mockUsdc = await viem.deployContract("MockUSDC");
console.log(`  ✅ MockUSDC        : ${mockUsdc.address}`);

const mockTreasury = await viem.deployContract("MockTreasury");
console.log(`  ✅ MockTreasury    : ${mockTreasury.address}`);

// AuditEscrow déployé sans l'adresse de la Registry (dépendance circulaire)
// setRegistryAddress() sera appelé après le déploiement d'AuditRegistry
const escrow = await viem.deployContract("AuditEscrow", [mockUsdc.address]);
console.log(`  ✅ AuditEscrow     : ${escrow.address}`);

const mockDao = await viem.deployContract("MockDAOVoting");
console.log(`  ✅ MockDAOVoting   : ${mockDao.address}`);

const registry = await viem.deployContract("AuditRegistry", [
  reputationBadge.address,
  mockUsdc.address,
  mockTreasury.address,
  escrow.address,
  mockDao.address,
]);
console.log(`  ✅ AuditRegistry   : ${registry.address}`);

// Lier ReputationBadge et AuditEscrow à AuditRegistry (résolution de la dépendance circulaire)

const linkBadgeHash = await reputationBadge.write.setRegistryAddress([registry.address]);
await publicClient.waitForTransactionReceipt({ hash: linkBadgeHash });

const linkEscrowHash = await escrow.write.setRegistryAddress([registry.address]);
await publicClient.waitForTransactionReceipt({ hash: linkEscrowHash });

console.log(`\n🔗 ReputationBadge + AuditEscrow liés à AuditRegistry`);

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
// Génération d'activités pour l'auditeur 1 avec le demandeur 1
// =========================================================================

// =========================================================================
// Mint USDC à tous les comptes de seed
// =========================================================================

const INITIAL_USDC = parseUnits("100000", 6); // 100 000 USDC par compte

console.log("\n💰 Mint USDC aux comptes de seed...");

const allSeedAccounts = [...auditorAccounts, ...requesterAccounts];
for (const account of allSeedAccounts) {
  const hash = await mockUsdc.write.mint([account.address, INITIAL_USDC]);
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`  ✅ ${account.address} => 100 000 USDC`);
}

// =========================================================================
// Génération d'activités pour l'auditeur 1 avec le demandeur 1
// =========================================================================

console.log("\n📋 Génération d'activités pour l'auditeur 1...");
const auditor1 = auditorAccounts[0];
const requester1 = requesterAccounts[0];
const AUDIT_AMOUNT = parseUnits("100", 6); // 100 USDC
const GUARANTEE_DURATION = 1; // 1 seconde, garantie très courte pour le seed (en conditions réelles : plusieurs jours/mois)
const VALID_CID = "QmSeedAuditReportCIDexample123";

// Étape 1 : Approbation : le requester autorise AuditRegistry à prélever ses USDC
// Clé privée requester1 requise : approve() utilise msg.sender comme propriétaire des fonds
const approveHash = await mockUsdc.write.approve(
  [registry.address, AUDIT_AMOUNT],
  { account: requester1 }
);
await publicClient.waitForTransactionReceipt({ hash: approveHash });

// Étape 2 : Dépôt de l'audit
// Clé privée requester1 requise : depositAudit() utilise msg.sender comme requester
const depositHash = await registry.write.depositAudit(
  [auditor1.address, mockUsdc.address, VALID_CID, AUDIT_AMOUNT, GUARANTEE_DURATION],
  { account: requester1 }
);
await publicClient.waitForTransactionReceipt({ hash: depositHash });

// Étape 3 : Validation de l'audit
// Clé privée auditor1 requise : validateAudit() vérifie msg.sender == audit.auditor
// C'est ici que incAudits() est appelé => le score de réputation est calculé et mis à jour
const validateHash = await registry.write.validateAudit(
  [1n],
  { account: auditor1 }
);
await publicClient.waitForTransactionReceipt({ hash: validateHash });

// Étape 4 : Réclamation du paiement immédiat (70%)
// Clé privée auditor1 requise : claimPayment() vérifie msg.sender == audit.auditor
const claimPaymentHash = await registry.write.claimPayment(
  [1n],
  { account: auditor1 }
);
await publicClient.waitForTransactionReceipt({ hash: claimPaymentHash });

// Étape 5 : Réclamation de la retenue de garantie (30%) : possible car GUARANTEE_DURATION = 1s
// Hardhat incrémente le timestamp de 1s par bloc : le bloc de cette tx aura timestamp >= guaranteeEnd
const claimGuaranteeHash = await registry.write.claimGuarantee(
  [1n],
  { account: auditor1 }
);
await publicClient.waitForTransactionReceipt({ hash: claimGuaranteeHash });

const auditorData = await reputationBadge.read.getAuditorData([auditor1.address]);
const auditorBalance = await mockUsdc.read.balanceOf([auditor1.address]);
console.log(`  ✅ Audit déposé, validé, paiement + garantie réclamés`);
console.log(`     Score auditeur 1 : ${auditorData.reputationScore} pts`);
console.log(`     Solde auditeur 1 : ${auditorBalance / 1_000_000n} USDC`);





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
envContent = setEnvVar(envContent, "VITE_AUDIT_ESCROW_ADDRESS", escrow.address);
envContent = setEnvVar(envContent, "VITE_REPUTATION_BADGE_ADDRESS", reputationBadge.address);
envContent = setEnvVar(envContent, "VITE_USDC_ADDRESS", mockUsdc.address);
envContent = setEnvVar(envContent, "VITE_DEPLOY_BLOCK", deployBlock.toString());

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
console.log(`  AuditEscrow     : ${escrow.address}`);
console.log(`  MockDAOVoting   : ${mockDao.address}`);
