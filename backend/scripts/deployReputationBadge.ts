import { network } from "hardhat";
const { viem, networkName } = await network.connect();
const client = await viem.getPublicClient();

console.log(`Deploying ReputationBadge to ${networkName}...`);
//Lecture du svg
const svgContent = readFileSync(
  resolve(process.cwd(), "svg", "reputation-nft.mint.svg"),
  "utf-8"
);

const nftContract = await viem.deployContract("ReputationBadge", [svgContent]);

console.log("ReputationBadge address:", nftContract.address);
const owner = await nftContract.read.owner();
console.log("Owner in contract:", owner);


console.log("\nDeployment successful!");
