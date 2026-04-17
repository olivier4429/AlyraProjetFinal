import { before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { getAddress,Hash } from "viem";

const { viem } = await network.connect();

// =========================================================================
// Helpers
// =========================================================================

/**
 * Décode une tokenURI ERC-721 encodée en base64.
 * Le contrat retourne : "data:application/json;base64,<payload>"
 * où <payload> est un objet JSON { name, description, image, attributes }.
 */
function decodeTokenURI(uri: string): Record<string, unknown> {
    const base64 = uri.replace("data:application/json;base64,", "");
    return JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
}

/**
 * Extrait la valeur d'un attribut ERC-721 par son trait_type.
 * Les attributs sont stockés dans json.attributes sous la forme :
 *   [{ trait_type: "reputationScore", value: 10 }, ...]
 * Retourne undefined si le trait n'existe pas.
 */
function getAttribute(
    json: Record<string, unknown>,
    traitType: string
): unknown {
    const attributes = json.attributes as Array<{
        trait_type: string;
        value: unknown;
    }>;
    return attributes.find((a) => a.trait_type === traitType)?.value;
}

// =========================================================================
// Constantes
// =========================================================================
const SVG_IMAGE =
    "<svg xmlns='http://www.w3.org/2000/svg'><text>TEST</text></svg>";
const GUARANTEE_30_USDC = 30_000_000n;   // log10(30)  = 1 => +10 pts
const GUARANTEE_100_USDC = 100_000_000n; // log10(100) = 2 => +20 pts
const GUARANTEE_300_USDC = 300_000_000n; // log10(300) = 2 => +20 pts (même palier)

// =========================================================================
// Suite principale
// =========================================================================

describe("ReputationBadge", () => {
    let owner: Awaited<ReturnType<typeof viem.getWalletClients>>[number];
    let registry: Awaited<ReturnType<typeof viem.getWalletClients>>[number];
    let auditor1: Awaited<ReturnType<typeof viem.getWalletClients>>[number];
    let auditor2: Awaited<ReturnType<typeof viem.getWalletClients>>[number];
    let stranger: Awaited<ReturnType<typeof viem.getWalletClients>>[number];
    let badge: Awaited<ReturnType<typeof viem.deployContract>>;

    before(async () => {
        //initialisation des comptes
        [owner, registry, auditor1, auditor2, stranger] =
            await viem.getWalletClients();
    });

    beforeEach(async () => {
        //déploiement du contrat ReputationBadge. On le recréé avant chaque test pour avoir un état propre.
        badge = await viem.deployContract("ReputationBadge", [SVG_IMAGE]);
        //liaison du contrat ReputationBadge au contrat AuditRegistry
        await badge.write.setRegistryAddress([registry.account.address], {
            account: owner.account,
        });
    });

    // =========================================================================
    // Déploiement & configuration
    // =========================================================================

    describe("Déploiement & configuration", () => {
        it("le owner est correctement défini", async () => {
            const contractOwner = await badge.read.owner();
            assert.equal(
                getAddress(contractOwner),
                getAddress(owner.account.address)
            );
        });

        it("registryAddress est address(0) avant setRegistryAddress", async () => {
            const freshBadge = await viem.deployContract("ReputationBadge", [SVG_IMAGE]);
            const addr = await freshBadge.read.registryAddress();
            assert.equal(addr, "0x0000000000000000000000000000000000000000");
        });

        it("imageURI est correctement encodée en base64 au déploiement", async () => {
            const svg = await badge.read.getSVG();
            assert.ok(svg.startsWith("data:image/svg+xml;base64,"));
        });

        it("setRegistryAddress fonctionne si appelé par le owner", async () => {
            const addr = await badge.read.registryAddress();
            assert.equal(getAddress(addr), getAddress(registry.account.address));
        });

        it("setRegistryAddress revert si appelé par un non-owner", async () => {
            await assert.rejects(
                badge.write.setRegistryAddress([stranger.account.address], {
                    account: stranger.account,
                }),
                /OwnableUnauthorizedAccount/
            );
        });

        it("setRegistryAddress revert avec ZeroAddress si address(0)", async () => {
            await assert.rejects(
                badge.write.setRegistryAddress(
                    ["0x0000000000000000000000000000000000000000"],
                    { account: owner.account }
                ),
                /ReputationBadge__ZeroAddress/
            );
        });

        it("setRegistryAddress peut être modifiée plusieurs fois par le owner", async () => {
            await badge.write.setRegistryAddress([auditor1.account.address], {
                account: owner.account,
            });
            const addr = await badge.read.registryAddress();
            assert.equal(getAddress(addr), getAddress(auditor1.account.address));
        });
    });

    // =========================================================================
    // mintNft()
    // =========================================================================

    describe("mintNft()", () => {
        it("balanceOf(auditor) == 1 après mint", async () => {
            await badge.write.mintNft([auditor1.account.address], {
                account: registry.account,
            });
            const bal = await badge.read.balanceOf([auditor1.account.address]);
            assert.equal(bal, 1n);
        });

        it("ownerOf(tokenId) == auditor après mint", async () => {
            await badge.write.mintNft([auditor1.account.address], {
                account: registry.account,
            });
            const tokenOwner = await badge.read.ownerOf([1n]);
            assert.equal(getAddress(tokenOwner), getAddress(auditor1.account.address));
        });

        it("tokenIdOf[auditor] == 1 pour le premier mint", async () => {
            await badge.write.mintNft([auditor1.account.address], {
                account: registry.account,
            });
            const tokenId = await badge.read.tokenIdOf([auditor1.account.address]);
            assert.equal(tokenId, 1n);
        });

        it("retourne le bon tokenId", async () => {
            const publicClient = await viem.getPublicClient();
            const { result } = await publicClient.simulateContract({
                address: badge.address,
                abi: badge.abi,
                functionName: "mintNft",
                args: [auditor1.account.address],
                account: registry.account,
            });
            assert.equal(result, 1n);
        });

        it("deux mints successifs : tokenIds sont 1 et 2", async () => {
            await badge.write.mintNft([auditor1.account.address], {
                account: registry.account,
            });
            await badge.write.mintNft([auditor2.account.address], {
                account: registry.account,
            });
            const id1 = await badge.read.tokenIdOf([auditor1.account.address]);
            const id2 = await badge.read.tokenIdOf([auditor2.account.address]);
            assert.equal(id1, 1n);
            assert.equal(id2, 2n);
        });

        it("_auditorData : reputationScore == 0 après mint", async () => {
            await badge.write.mintNft([auditor1.account.address], {
                account: registry.account,
            });
            const data = await badge.read.getAuditorData([auditor1.account.address]);
            assert.equal(data.reputationScore, 0n);
        });

        it("_auditorData : totalAudits == 0 après mint", async () => {
            await badge.write.mintNft([auditor1.account.address], {
                account: registry.account,
            });
            const data = await badge.read.getAuditorData([auditor1.account.address]);
            assert.equal(data.totalAudits, 0);
        });

        it("_auditorData : totalExploits == 0 après mint", async () => {
            await badge.write.mintNft([auditor1.account.address], {
                account: registry.account,
            });
            const data = await badge.read.getAuditorData([auditor1.account.address]);
            assert.equal(data.totalExploits, 0);
        });

        it("_auditorData : registrationDate > 0 après mint", async () => {
            await badge.write.mintNft([auditor1.account.address], {
                account: registry.account,
            });
            const data = await badge.read.getAuditorData([auditor1.account.address]);
            assert.ok(data.registrationDate > 0n);
        });

        it("_auditorData : registrationDate correspond au timestamp du bloc de mint", async () => {
            const publicClient = await viem.getPublicClient();

            const hash = await badge.write.mintNft([auditor1.account.address], {
                account: registry.account,
            });

            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });

            const data = await badge.read.getAuditorData([auditor1.account.address]);

            assert.equal(data.registrationDate, block.timestamp);
        });


        it("revert NotRegistry si appelé par un non-registry", async () => {
            await assert.rejects(
                badge.write.mintNft([auditor1.account.address], {
                    account: stranger.account,
                }),
                /ReputationBadge__NotRegistry/
            );
        });

        it("revert AlreadyMinted si même adresse tente un second mint", async () => {
            await badge.write.mintNft([auditor1.account.address], {
                account: registry.account,
            });
            await assert.rejects(
                badge.write.mintNft([auditor1.account.address], {
                    account: registry.account,
                }),
                /ReputationBadge__AlreadyMinted/
            );
        });

        it("event Locked émis avec le bon tokenId", async () => {
            const publicClient = await viem.getPublicClient();
            const hash = await badge.write.mintNft([auditor1.account.address], {
                account: registry.account,
            });
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            const logs = await publicClient.getContractEvents({
                address: badge.address,
                abi: badge.abi,
                eventName: "Locked",
                fromBlock: receipt.blockNumber,
                toBlock: receipt.blockNumber,
            });
            assert.equal(logs.length, 1);
            assert.equal(logs[0].args.tokenId, 1n);
        });
    });

    // =========================================================================
    // Soul-bound
    // =========================================================================

    describe("Soul-bound (_update / transferts)", () => {
        beforeEach(async () => {
            await badge.write.mintNft([auditor1.account.address], {
                account: registry.account,
            });
        });

        it("transferFrom revert avec Soulbound", async () => {
            await assert.rejects(
                badge.write.transferFrom(
                    [auditor1.account.address, auditor2.account.address, 1n],
                    { account: auditor1.account }
                ),
                /ReputationBadge__Soulbound/
            );
        });

        it("safeTransferFrom revert avec Soulbound", async () => {
            await assert.rejects(
                badge.write.safeTransferFrom(
                    [auditor1.account.address, auditor2.account.address, 1n],
                    { account: auditor1.account }
                ),
                /ReputationBadge__Soulbound/
            );
        });

        it("approve puis transferFrom par un tiers revert avec Soulbound", async () => {
            await badge.write.approve([stranger.account.address, 1n], {
                account: auditor1.account,
            });
            await assert.rejects(
                badge.write.transferFrom(
                    [auditor1.account.address, auditor2.account.address, 1n],
                    { account: stranger.account }
                ),
                /ReputationBadge__Soulbound/
            );
        });

        it("le mint lui-même n'est pas bloqué par _update", async () => {
            const bal = await badge.read.balanceOf([auditor1.account.address]);
            assert.equal(bal, 1n);
        });

        it("locked(tokenId) retourne true", async () => {
            const isLocked = await badge.read.locked([1n]);
            assert.equal(isLocked, true);
        });

        it("locked sur un tokenId inexistant revert avec TokenDoesNotExist", async () => {
            await assert.rejects(
                badge.read.locked([999n]),
                /ReputationBadge__TokenDoesNotExist/
            );
        });
    });

    // =========================================================================
    // supportsInterface / ERC-165
    // =========================================================================

    describe("supportsInterface / ERC-165", () => {
        it("supporte ERC-165 (0x01ffc9a7)", async () => {
            assert.equal(await badge.read.supportsInterface(["0x01ffc9a7"]), true);
        });

        it("supporte ERC-721 (0x80ac58cd)", async () => {
            assert.equal(await badge.read.supportsInterface(["0x80ac58cd"]), true);
        });

        it("supporte EIP-5192 (0xb45a3c0e)", async () => {
            assert.equal(await badge.read.supportsInterface(["0xb45a3c0e"]), true);
        });

        it("supporte EIP-4906 (0x49064906)", async () => {
            assert.equal(await badge.read.supportsInterface(["0x49064906"]), true);
        });

        it("retourne false pour une interface inconnue", async () => {
            assert.equal(await badge.read.supportsInterface(["0xdeadbeef"]), false);
        });
    });

    // =========================================================================
    // incAudits()
    // =========================================================================

    describe("incAudits()", () => {
        beforeEach(async () => {
            await badge.write.mintNft([auditor1.account.address], {
                account: registry.account,
            });
        });

        it("totalAudits incrémenté de 1", async () => {
            await badge.write.incAudits([1n, GUARANTEE_100_USDC], {
                account: registry.account,
            });
            const data = await badge.read.getAuditorData([auditor1.account.address]);
            assert.equal(data.totalAudits, 1);
        });

        it("reputationScore augmenté de log10(100 USDC) * 10 = 20 pts", async () => {
            await badge.write.incAudits([1n, GUARANTEE_100_USDC], {
                account: registry.account,
            });
            const data = await badge.read.getAuditorData([auditor1.account.address]);
            assert.equal(data.reputationScore, 20n);
        });

        it("reputationScore augmenté de log10(30 USDC) * 10 = 10 pts", async () => {
            await badge.write.incAudits([1n, GUARANTEE_30_USDC], {
                account: registry.account,
            });
            const data = await badge.read.getAuditorData([auditor1.account.address]);
            assert.equal(data.reputationScore, 10n);
        });

        it("log10(300 USDC) = 2 => 20 pts (même palier que 100)", async () => {
            await badge.write.incAudits([1n, GUARANTEE_300_USDC], {
                account: registry.account,
            });
            const data = await badge.read.getAuditorData([auditor1.account.address]);
            assert.equal(data.reputationScore, 20n);
        });

        it("plusieurs appels successifs : score cumulatif correct (20 + 10 = 30)", async () => {
            await badge.write.incAudits([1n, GUARANTEE_100_USDC], {
                account: registry.account,
            });
            await badge.write.incAudits([1n, GUARANTEE_30_USDC], {
                account: registry.account,
            });
            const data = await badge.read.getAuditorData([auditor1.account.address]);
            assert.equal(data.reputationScore, 30n);
            assert.equal(data.totalAudits, 2);
        });

        it("revert NotRegistry si appelé par un non-registry", async () => {
            await assert.rejects(
                badge.write.incAudits([1n, GUARANTEE_100_USDC], {
                    account: stranger.account,
                }),
                /ReputationBadge__NotRegistry/
            );
        });

        it("event MetadataUpdate émis avec le bon tokenId", async () => {
            const publicClient = await viem.getPublicClient();
            const hash = await badge.write.incAudits([1n, GUARANTEE_100_USDC], {
                account: registry.account,
            });
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            const logs = await publicClient.getContractEvents({
                address: badge.address,
                abi: badge.abi,
                eventName: "MetadataUpdate",
                fromBlock: receipt.blockNumber,
                toBlock: receipt.blockNumber,
            });
            assert.equal(logs.length, 1);
            assert.equal(logs[0].args.tokenId, 1n);
        });
    });

    // =========================================================================
    // incExploits()
    // =========================================================================

    describe("incExploits()", () => {
        beforeEach(async () => {
            await badge.write.mintNft([auditor1.account.address], {
                account: registry.account,
            });
            await badge.write.incAudits([1n, GUARANTEE_100_USDC], {
                account: registry.account,
            });
        });

        it("totalExploits incrémenté de 1", async () => {
            await badge.write.incExploits([1n, GUARANTEE_30_USDC], {
                account: registry.account,
            });
            const data = await badge.read.getAuditorData([auditor1.account.address]);
            assert.equal(data.totalExploits, 1);
        });

        it("score diminué correctement si score > penalty (20 - 10 = 10)", async () => {
            await badge.write.incExploits([1n, GUARANTEE_30_USDC], {
                account: registry.account,
            });
            const data = await badge.read.getAuditorData([auditor1.account.address]);
            assert.equal(data.reputationScore, 10n);
        });

        it("score reste à 0 si penalty >= score (plancher)", async () => {
            await badge.write.incExploits([1n, GUARANTEE_100_USDC], {
                account: registry.account,
            });
            const data = await badge.read.getAuditorData([auditor1.account.address]);
            assert.equal(data.reputationScore, 0n);
        });

        it("score reste à 0 si appelé avec score déjà à 0 : pas de underflow", async () => {
            await badge.write.incExploits([1n, GUARANTEE_100_USDC], {
                account: registry.account,
            });
            await badge.write.incExploits([1n, GUARANTEE_100_USDC], {
                account: registry.account,
            });
            const data = await badge.read.getAuditorData([auditor1.account.address]);
            assert.equal(data.reputationScore, 0n);
        });

        it("revert NotRegistry si appelé par un non-registry", async () => {
            await assert.rejects(
                badge.write.incExploits([1n, GUARANTEE_30_USDC], {
                    account: stranger.account,
                }),
                /ReputationBadge__NotRegistry/
            );
        });

        it("event MetadataUpdate émis avec le bon tokenId", async () => {
            const publicClient = await viem.getPublicClient();
            const hash = await badge.write.incExploits([1n, GUARANTEE_30_USDC], {
                account: registry.account,
            });
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            const logs = await publicClient.getContractEvents({
                address: badge.address,
                abi: badge.abi,
                eventName: "MetadataUpdate",
                fromBlock: receipt.blockNumber,
                toBlock: receipt.blockNumber,
            });
            assert.equal(logs.length, 1);
            assert.equal(logs[0].args.tokenId, 1n);
        });
    });

    // =========================================================================
    // tokenURI()
    // =========================================================================

    describe("tokenURI()", () => {
        let hash: Hash;
        beforeEach(async () => {
            hash =  await badge.write.mintNft([auditor1.account.address], {
                account: registry.account,
            });
        });

        it("retourne une string commençant par data:application/json;base64,", async () => {
            const uri = await badge.read.tokenURI([1n]);
            assert.ok(uri.startsWith("data:application/json;base64,"));
        });

        it("JSON décodé contient le name correct", async () => {
            const json = decodeTokenURI(await badge.read.tokenURI([1n]));
            assert.ok((json.name as string).includes("AuditRegistry ReputationBadge"));
        });

        it("JSON décodé : Reputation Score == 0 après mint", async () => {
            const json = decodeTokenURI(await badge.read.tokenURI([1n]));
            assert.equal(getAttribute(json, "Reputation Score"), 0);
        });

        it("JSON décodé : Total Audits == 0 après mint", async () => {
            const json = decodeTokenURI(await badge.read.tokenURI([1n]));
            assert.equal(getAttribute(json, "Total Audits"), 0);
        });

        it("JSON décodé : Total Exploits == 0 après mint", async () => {
            const json = decodeTokenURI(await badge.read.tokenURI([1n]));
            assert.equal(getAttribute(json, "Total Exploits"), 0);
        });

        it("JSON décodé : Registration Date > 0", async () => {
            const json = decodeTokenURI(await badge.read.tokenURI([1n]));
            assert.ok(Number(getAttribute(json, "Registration Date")) > 0);
        });

        it("JSON décodé : Registration Date dans le tokenURI correspond au timestamp du bloc de mint", async () => {
            const publicClient = await viem.getPublicClient();

            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });

            const json = decodeTokenURI(await badge.read.tokenURI([1n]));
            const registrationDate = getAttribute(json, "Registration Date");

            // Le JSON encode les nombres en string via Strings.toString()
            // => on compare en castant en BigInt
            assert.equal(BigInt(registrationDate as string), block.timestamp);
        });

        it("JSON décodé : image non vide", async () => {
            const json = decodeTokenURI(await badge.read.tokenURI([1n]));
            assert.ok((json.image as string).length > 0);
        });

        it("tokenURI reflète le score mis à jour après incAudits", async () => {
            await badge.write.incAudits([1n, GUARANTEE_100_USDC], {
                account: registry.account,
            });
            const json = decodeTokenURI(await badge.read.tokenURI([1n]));
            assert.equal(getAttribute(json, "Reputation Score"), 20);
        });

        it("tokenURI reflète le score mis à jour après incExploits", async () => {
            await badge.write.incAudits([1n, GUARANTEE_100_USDC], {
                account: registry.account,
            });
            await badge.write.incExploits([1n, GUARANTEE_30_USDC], {
                account: registry.account,
            });
            const json = decodeTokenURI(await badge.read.tokenURI([1n]));
            assert.equal(getAttribute(json, "Reputation Score"), 10);
        });

        it("revert TokenDoesNotExist sur un tokenId inexistant", async () => {
            await assert.rejects(
                badge.read.tokenURI([999n]),
                /ReputationBadge__TokenDoesNotExist/
            );
        });
    });

    // =========================================================================
    // svgToImageURI()
    // =========================================================================

    describe("svgToImageURI()", () => {
        it("retourne une string commençant par data:image/svg+xml;base64,", async () => {
            const uri = await badge.read.svgToImageURI([SVG_IMAGE]);
            assert.ok(uri.startsWith("data:image/svg+xml;base64,"));
        });

        it("SVG vide encode correctement", async () => {
            const uri = await badge.read.svgToImageURI([""]);
            assert.ok(uri.startsWith("data:image/svg+xml;base64,"));
        });

        it("SVG non vide est décodable et correspond à l'original", async () => {
            const uri = await badge.read.svgToImageURI([SVG_IMAGE]);
            const base64 = uri.replace("data:image/svg+xml;base64,", "");
            const decoded = Buffer.from(base64, "base64").toString("utf8");
            assert.equal(decoded, SVG_IMAGE);
        });
    });

    // =========================================================================
    // Scénarios end-to-end
    // =========================================================================

    describe("Scénarios end-to-end", () => {
        it("inscription => mint => 3 audits réussis => score correct", async () => {
            await badge.write.mintNft([auditor1.account.address], {
                account: registry.account,
            });
            for (let i = 0; i < 3; i++) {
                await badge.write.incAudits([1n, GUARANTEE_100_USDC], {
                    account: registry.account,
                });
            }
            const data = await badge.read.getAuditorData([auditor1.account.address]);
            assert.equal(data.reputationScore, 60n);
            assert.equal(data.totalAudits, 3);
            assert.equal(data.totalExploits, 0);
        });

        it("inscription => mint => 1 audit => 1 exploit => score correct (20 - 10 = 10)", async () => {
            await badge.write.mintNft([auditor1.account.address], {
                account: registry.account,
            });
            await badge.write.incAudits([1n, GUARANTEE_100_USDC], {
                account: registry.account,
            });
            await badge.write.incExploits([1n, GUARANTEE_30_USDC], {
                account: registry.account,
            });
            const data = await badge.read.getAuditorData([auditor1.account.address]);
            assert.equal(data.reputationScore, 10n);
            assert.equal(data.totalAudits, 1);
            assert.equal(data.totalExploits, 1);
        });

        it("exploit direct avec score à 0 => score reste à 0", async () => {
            await badge.write.mintNft([auditor1.account.address], {
                account: registry.account,
            });
            await badge.write.incExploits([1n, GUARANTEE_100_USDC], {
                account: registry.account,
            });
            const data = await badge.read.getAuditorData([auditor1.account.address]);
            assert.equal(data.reputationScore, 0n);
        });

        it("deux auditeurs indépendants : leurs scores n'interfèrent pas", async () => {
            await badge.write.mintNft([auditor1.account.address], {
                account: registry.account,
            });
            await badge.write.mintNft([auditor2.account.address], {
                account: registry.account,
            });

            const tokenId1 = await badge.read.tokenIdOf([auditor1.account.address]);
            const tokenId2 = await badge.read.tokenIdOf([auditor2.account.address]);

            await badge.write.incAudits([tokenId1, GUARANTEE_100_USDC], {
                account: registry.account,
            });
            await badge.write.incAudits([tokenId1, GUARANTEE_100_USDC], {
                account: registry.account,
            });
            await badge.write.incExploits([tokenId2, GUARANTEE_100_USDC], {
                account: registry.account,
            });

            const data1 = await badge.read.getAuditorData([auditor1.account.address]);
            const data2 = await badge.read.getAuditorData([auditor2.account.address]);

            assert.equal(data1.reputationScore, 40n);
            assert.equal(data2.reputationScore, 0n);
            assert.equal(data1.totalAudits, 2);
            assert.equal(data2.totalExploits, 1);
        });
    });
});