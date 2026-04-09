/**
 * Script de déploiement standalone d'AuditEscrow.
 *
 * Usage :
 *   npx hardhat run scripts/deployAuditEscrow.ts --network localhost
 *   npx hardhat run scripts/deployAuditEscrow.ts --network sepolia
 *
 *
 * Après déploiement, appeler setRegistryAddress(registryAddress)
 * via le script ou manuellement pour lier l'escrow à la registry.
 */

import { network } from "hardhat";

const { viem, networkName } = await network.connect();
const publicClient = await viem.getPublicClient();

console.log(`\n📦 Déploiement d'AuditEscrow sur ${networkName}...\n`);

// ── Adresse USDC ──────────────────────────────────────────────────────────────

const mockUsdc = await viem.deployContract("MockUSDC");
const usdcAddress = mockUsdc.address;
console.log(`  ✅ MockUSDC déployé : ${usdcAddress}`);


// ── AuditEscrow ───────────────────────────────────────────────────────────────
const escrow = await viem.deployContract("AuditEscrow", [usdcAddress]);
console.log(`  ✅ AuditEscrow     : ${escrow.address}`);

const owner = await escrow.read.owner();
console.log(`  👤 Owner           : ${owner}`);

// ── setRegistryAddress optionnel ──────────────────────────────────────────────
if (process.env.REGISTRY_ADDRESS) {
  const hash = await escrow.write.setRegistryAddress([process.env.REGISTRY_ADDRESS]);
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`\n🔗 Registry liée   : ${process.env.REGISTRY_ADDRESS}`);
} else {
  console.log(`\n⚠️  REGISTRY_ADDRESS non défini : appeler setRegistryAddress() manuellement`);
}

console.log("\n✨ Déploiement terminé !\n");
