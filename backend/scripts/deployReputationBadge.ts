import { network } from "hardhat";
import { formatEther } from "viem";
const { viem, networkName } = await network.connect();
const client = await viem.getPublicClient();

console.log(`Deploying ReputationBadge to ${networkName}...`);

const nftContract = await viem.deployContract("ReputationBadge");

console.log("ReputationBadge address:", nftContract.address);
const owner = await nftContract.read.owner();
console.log("Owner in contract:", owner);


console.log("\nDeployment successful!");
