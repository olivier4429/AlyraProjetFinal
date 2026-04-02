import { network } from "hardhat";
import { readFileSync } from "fs";
import { resolve } from "path";

const { viem, networkName } = await network.connect();
const client = await viem.getPublicClient();

console.log(`Deploying protocol Reputation auditeurs to ${networkName}...`);
//Lecture du svg
const svgContent = readFileSync(
  resolve(process.cwd(), "svg", "reputation-nft.mint.svg"),
  "utf-8"
);

const nftContract = await viem.deployContract("ReputationBadge", [svgContent]);

console.log("\nReputationBadge address:", nftContract.address);
const ownerReputationBadge = await nftContract.read.owner();
console.log("Owner in contract: ReputationBadge", ownerReputationBadge);





// Déploiement des mocks
const mockUsdc = await viem.deployContract("MockUSDC");
const mockTreasury = await viem.deployContract("MockTreasury");
const mockEscrow = await viem.deployContract("MockAuditEscrow", [mockUsdc.address]);
const mockDao = await viem.deployContract("MockDAOVoting");

// Déploiement AuditRegistry
const registry = await viem.deployContract("AuditRegistry", [
  nftContract.address,
  mockUsdc.address,
  mockTreasury.address,
  mockEscrow.address,
  mockDao.address,
]);



console.log("\nRegistry address:", registry.address);
const ownerRegistry = await registry.read.owner();
console.log("Owner in contract: Registry", ownerRegistry);


console.log("\nDeployment successful!");
