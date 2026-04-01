import { before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import {
    getAddress,
    parseUnits,
    encodePacked,
    keccak256,
    zeroAddress,
    Address,
} from "viem";

const { viem } = await network.connect();

// =========================================================================
// Constantes
// =========================================================================

const AUDIT_AMOUNT = parseUnits("100", 6);  // 100 USDC
const FEE_AMOUNT = parseUnits("5", 6);    // 5%  = 5 USDC
const ESCROW_AMOUNT = parseUnits("95", 6);   // 95% = 95 USDC
const GUARANTEE_DURATION = 90n * 24n * 60n * 60n; // 90 jours en secondes
const VALIDATION_TIMEOUT = 10n * 24n * 60n * 60n; // 10 jours en secondes

const VALID_CID = keccak256(encodePacked(["string"], ["QmTest123"]));
const PREUVES_CID = keccak256(encodePacked(["string"], ["QmPreuves456"]));
const EMPTY_CID: Address = `0x${"0".repeat(64)}`;
const SVG_IMAGE = "<svg xmlns='http://www.w3.org/2000/svg'><text>TEST</text></svg>";

/// @notice pourc caster en unint40.
const UINT40_MASK = (1n << 40n) - 1n;


// =========================================================================
// Helpers
// =========================================================================

/// @notice Avance le temps du test de `seconds` secondes et mine un bloc. Utile pour tester la date d'expiration de la garantie et des remboursements.
async function mineTime(seconds: bigint) {
    const testClient = await viem.getTestClient();
    await testClient.increaseTime({ seconds: Number(seconds) });
    await testClient.mine({ blocks: 1 });
}


/// @notice Impersonne une adresse de contrat pour la faire passer dans msg.Sender.
/// par exemple, C'est la DAO qui doit appeler reseolveIncident() dans la registery mais viem refuse { account: mockDao.address } car il ne trouve
/// pas de clé privée associée. Cette fonction permet d'impersonner le contrat DAO pour pouvoir appeler les fonctions qui lui sont réservées.
async function impersonateDao(mockDaoAddress: Address) {
    const testClient = await viem.getTestClient();
    //pour que le compte impersonné puisse payer les frais de gaz, on lui envoie un peu d'ETH
    await testClient.setBalance({
        address: mockDaoAddress,
        value: parseUnits("1", 18),
    });
    await testClient.impersonateAccount({ address: mockDaoAddress });
    return {
        daoClient: await viem.getWalletClient(mockDaoAddress),
        stop: async () => testClient.stopImpersonatingAccount({ address: mockDaoAddress }),
    };
}


// Fonction pour déployer le contrat 
/* async function setUpSmartContract() {
    const publicClient = await viem.getPublicClient();
    const [owner, ...accounts] = await viem.getWalletClients();

    const registery = await viem.deployContract("AuditRegistry", [], {
        value: 10_000_000_000_000_000n, // 0.01 ETH pour financer le contrat
        client: { wallet: owner },
    });

    const signersRegistered = accounts.slice(0, -1);
    const signerNotRegistered = accounts[accounts.length - 1];

    return { registery, signersRegistered, signerNotRegistered, owner, publicClient };
}
 */



describe("AuditRegistry", () => {


    let owner: any;
    let auditor1: any;
    let auditor2: any;
    let requester: any;
    let stranger: any;
    let auditedContract: any;

    let mockUsdc: any;
    let mockTreasury: any;
    let mockEscrow: any;
    let mockDao: any;
    let badge: any;
    let registry: any;

    before(async () => {
        [owner, auditor1, auditor2, requester, stranger, auditedContract] =
            await viem.getWalletClients();
    });

    beforeEach(async () => {

        // Déploiement des mocks
        mockUsdc = await viem.deployContract("MockUSDC");
        mockTreasury = await viem.deployContract("MockTreasury");
        mockEscrow = await viem.deployContract("MockAuditEscrow", [mockUsdc.address]);
        mockDao = await viem.deployContract("MockDAOVoting");

        // Déploiement ReputationBadge
        badge = await viem.deployContract("ReputationBadge", [SVG_IMAGE]);

        // Déploiement AuditRegistry
        registry = await viem.deployContract("AuditRegistry", [
            badge.address,
            mockUsdc.address,
            mockTreasury.address,
            mockEscrow.address,
            mockDao.address,
        ]);

        // Lier ReputationBadge -> AuditRegistry
        await badge.write.setRegistryAddress([registry.address], {
            account: owner.account,
        });

        // Mint USDC vers requester (10 000 USDC)
        await mockUsdc.write.mint(
            [requester.account.address, parseUnits("10000", 6)],
            { account: owner.account }
        );

        // Mint USDC vers mockEscrow pour les remboursements
        await mockUsdc.write.mint(
            [mockEscrow.address, parseUnits("10000", 6)],
            { account: owner.account }
        );

        // Approve AuditRegistry depuis requester
        await mockUsdc.write.approve(
            [registry.address, parseUnits("10000", 6)],
            { account: requester.account }
        );

        // Alimenter mockDao en ETH pour les impersonations
        const testClient = await viem.getTestClient();
        await testClient.setBalance({
            address: mockDao.address,
            value: parseUnits("1", 18),
        });
    });

    // =========================================================================
    // Déploiement
    // =========================================================================

    describe("Déploiement", () => {
        it("owner correctement défini", async () => {
            const contractOwner = await registry.read.owner();
            assert.equal(getAddress(contractOwner), getAddress(owner.account.address));
        });

        it("reputationBadge correctement défini", async () => {
            const addr = await registry.read.reputationBadge();
            assert.equal(getAddress(addr), getAddress(badge.address));
        });

        it("usdc correctement défini", async () => {
            const addr = await registry.read.usdc();
            assert.equal(getAddress(addr), getAddress(mockUsdc.address));
        });

        it("treasuryAddress correctement défini", async () => {
            const addr = await registry.read.treasuryAddress();
            assert.equal(getAddress(addr), getAddress(mockTreasury.address));
        });

        it("escrowAddress correctement défini", async () => {
            const addr = await registry.read.escrowAddress();
            assert.equal(getAddress(addr), getAddress(mockEscrow.address));
        });

        it("daoVotingAddress correctement défini", async () => {
            const addr = await registry.read.daoVotingAddress();
            assert.equal(getAddress(addr), getAddress(mockDao.address));
        });

        it("auditCount initialisé à 0", async () => {
            const count = await registry.read.auditCount();
            assert.equal(count, 0n);
        });

        it("revert ZeroAddress si reputationBadge est address(0)", async () => {
            await assert.rejects(
                viem.deployContract("AuditRegistry", [
                    zeroAddress,
                    mockUsdc.address,
                    mockTreasury.address,
                    mockEscrow.address,
                    mockDao.address,
                ]),
                /AuditRegistry__ZeroAddress/
            );
        });

        it("revert ZeroAddress si usdc est address(0)", async () => {
            await assert.rejects(
                viem.deployContract("AuditRegistry", [
                    badge.address,
                    zeroAddress,
                    mockTreasury.address,
                    mockEscrow.address,
                    mockDao.address,
                ]),
                /AuditRegistry__ZeroAddress/
            );
        });

        it("revert ZeroAddress si treasury est address(0)", async () => {
            await assert.rejects(
                viem.deployContract("AuditRegistry", [
                    badge.address,
                    mockUsdc.address,
                    zeroAddress,
                    mockEscrow.address,
                    mockDao.address,
                ]),
                /AuditRegistry__ZeroAddress/
            );
        });

        it("revert ZeroAddress si escrow est address(0)", async () => {
            await assert.rejects(
                viem.deployContract("AuditRegistry", [
                    badge.address,
                    mockUsdc.address,
                    mockTreasury.address,
                    zeroAddress,
                    mockDao.address,
                ]),
                /AuditRegistry__ZeroAddress/
            );
        });

        it("revert ZeroAddress si daoVoting est address(0)", async () => {
            await assert.rejects(
                viem.deployContract("AuditRegistry", [
                    badge.address,
                    mockUsdc.address,
                    mockTreasury.address,
                    mockEscrow.address,
                    zeroAddress,
                ]),
                /AuditRegistry__ZeroAddress/
            );
        });
    });

    // =========================================================================
    // registerAuditor()
    // =========================================================================

    describe("registerAuditor()", () => {
        it("inscription réussie : badge minté", async () => {
            await registry.write.registerAuditor(
                ["alice", ["DeFi", "NFT"]],
                { account: auditor1.account }
            );
            const tokenId = await badge.read.tokenIdOf([auditor1.account.address]);
            assert.equal(tokenId, 1n);
        });

        it("pseudo stocké on-chain", async () => {
            await registry.write.registerAuditor(
                ["alice", ["DeFi"]],
                { account: auditor1.account }
            );
            const pseudo = await registry.read.pseudoOf([auditor1.account.address]);
            assert.equal(pseudo, "alice");
        });

        it("auditeur isActive après inscription", async () => {
            await registry.write.registerAuditor(
                ["alice", ["DeFi"]],
                { account: auditor1.account }
            );
            const data = await badge.read.getAuditorData([auditor1.account.address]);
            assert.equal(data.isActive, true);
        });

        it("score initial à 0", async () => {
            await registry.write.registerAuditor(
                ["alice", ["DeFi"]],
                { account: auditor1.account }
            );
            const data = await badge.read.getAuditorData([auditor1.account.address]);
            assert.equal(data.reputationScore, 0n);
        });

        it("revert AlreadyRegistered si double inscription", async () => {
            await registry.write.registerAuditor(
                ["alice", ["DeFi"]],
                { account: auditor1.account }
            );
            await assert.rejects(
                registry.write.registerAuditor(
                    ["alice2", ["NFT"]],
                    { account: auditor1.account }
                ),
                /AuditRegistry__AlreadyRegistered/
            );
        });

        it("revert PseudoTooLong si pseudo vide", async () => {
            await assert.rejects(
                registry.write.registerAuditor(
                    ["", ["DeFi"]],
                    { account: auditor1.account }
                ),
                /AuditRegistry__PseudoTooLong/
            );
        });

        it("revert PseudoTooLong si pseudo > 20 caractères", async () => {
            await assert.rejects(
                registry.write.registerAuditor(
                    ["pseudobeaucouptroplonggg", ["DeFi"]],
                    { account: auditor1.account }
                ),
                /AuditRegistry__PseudoTooLong/
            );
        });

        it("revert TooManySpecialties si > 10 spécialités", async () => {
            await assert.rejects(
                registry.write.registerAuditor(
                    ["alice", ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"]],
                    { account: auditor1.account }
                ),
                /AuditRegistry__TooManySpecialties/
            );
        });

        it("0 spécialités accepté", async () => {
            await assert.doesNotReject(
                registry.write.registerAuditor(
                    ["alice", []],
                    { account: auditor1.account }
                )
            );
        });

        it("event AuditorRegistered émis correctement", async () => {
            const publicClient = await viem.getPublicClient();
            const hash = await registry.write.registerAuditor(
                ["alice", ["DeFi", "NFT"]],
                { account: auditor1.account }
            );
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            const logs = await publicClient.getContractEvents({
                address: registry.address,
                abi: registry.abi,
                eventName: "AuditorRegistered",
                fromBlock: receipt.blockNumber,
                toBlock: receipt.blockNumber,
            });
            assert.equal(logs.length, 1);
            assert.equal(getAddress(logs[0].args.auditor!), getAddress(auditor1.account.address));
            assert.equal(logs[0].args.pseudo, "alice");
            assert.deepEqual(logs[0].args.specialties, ["DeFi", "NFT"]);
        });
    });

    // =========================================================================
    // updateSpecialties()
    // =========================================================================

    describe("updateSpecialties()", () => {
        beforeEach(async () => {
            await registry.write.registerAuditor(
                ["alice", ["DeFi"]],
                { account: auditor1.account }
            );
        });

        it("mise à jour réussie : event émis avec nouvelles spécialités", async () => {
            const publicClient = await viem.getPublicClient();
            const hash = await registry.write.updateSpecialties(
                [["DeFi", "DAO", "zkProof"]],
                { account: auditor1.account }
            );
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            const logs = await publicClient.getContractEvents({
                address: registry.address,
                abi: registry.abi,
                eventName: "AuditorSpecialtiesUpdated",
                fromBlock: receipt.blockNumber,
                toBlock: receipt.blockNumber,
            });
            assert.equal(logs.length, 1);
            assert.equal(getAddress(logs[0].args.auditor!), getAddress(auditor1.account.address));
            assert.deepEqual(logs[0].args.specialties, ["DeFi", "DAO", "zkProof"]);
        });

        it("liste vide acceptée : suppression de toutes les spécialités", async () => {
            await assert.doesNotReject(
                registry.write.updateSpecialties(
                    [[]],
                    { account: auditor1.account }
                )
            );
        });

        it("revert AuditorNotRegistered si non inscrit", async () => {
            await assert.rejects(
                registry.write.updateSpecialties(
                    [["DeFi"]],
                    { account: stranger.account }
                ),
                /AuditRegistry__AuditorNotRegistered/
            );
        });

        it("revert TooManySpecialties si > 10", async () => {
            await assert.rejects(
                registry.write.updateSpecialties(
                    [["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"]],
                    { account: auditor1.account }
                ),
                /AuditRegistry__TooManySpecialties/
            );
        });
    });

    // =========================================================================
    // depositAudit()
    // =========================================================================

    describe("depositAudit()", () => {
        beforeEach(async () => {
            await registry.write.registerAuditor(
                ["alice", ["DeFi"]],
                { account: auditor1.account }
            );
        });

        it("dépôt réussi : statut PENDING", async () => {
            await registry.write.depositAudit(
                [auditor1.account.address, auditedContract.account.address, VALID_CID, AUDIT_AMOUNT],
                { account: requester.account }
            );
            const audit = await registry.read.getAudit([1n]);

            assert.equal(audit.status, 0); // PENDING
        });

        it("auditor et requester correctement stockés", async () => {
            await registry.write.depositAudit(
                [auditor1.account.address, auditedContract.account.address, VALID_CID, AUDIT_AMOUNT],
                { account: requester.account }
            );
            const audit = await registry.read.getAudit([1n]);
            assert.equal(getAddress(audit.auditor), getAddress(auditor1.account.address));
            assert.equal(getAddress(audit.requester), getAddress(requester.account.address));
        });

        it("auditCount incrémenté à 1", async () => {
            await registry.write.depositAudit(
                [auditor1.account.address, auditedContract.account.address, VALID_CID, AUDIT_AMOUNT],
                { account: requester.account }
            );
            assert.equal(await registry.read.auditCount(), 1n);
        });

        it("montant escrow = 95% stocké dans la struct", async () => {
            await registry.write.depositAudit(
                [auditor1.account.address, auditedContract.account.address, VALID_CID, AUDIT_AMOUNT],
                { account: requester.account }
            );
            const audit = await registry.read.getAudit([1n]);
            assert.equal(audit.amount, ESCROW_AMOUNT);
        });

        it("5% envoyés à la Treasury", async () => {
            const before = await mockUsdc.read.balanceOf([mockTreasury.address]);
            await registry.write.depositAudit(
                [auditor1.account.address, auditedContract.account.address, VALID_CID, AUDIT_AMOUNT],
                { account: requester.account }
            );
            const after = await mockUsdc.read.balanceOf([mockTreasury.address]);
            assert.equal(after - before, FEE_AMOUNT);
        });

        it("95% envoyés à l'Escrow", async () => {
            const before = await mockUsdc.read.balanceOf([mockEscrow.address]);
            await registry.write.depositAudit(
                [auditor1.account.address, auditedContract.account.address, VALID_CID, AUDIT_AMOUNT],
                { account: requester.account }
            );
            const after = await mockUsdc.read.balanceOf([mockEscrow.address]);
            assert.equal(after - before, ESCROW_AMOUNT);
        });

        it("balance USDC du requester diminuée du montant total", async () => {
            const before = await mockUsdc.read.balanceOf([requester.account.address]);
            await registry.write.depositAudit(
                [auditor1.account.address, auditedContract.account.address, VALID_CID, AUDIT_AMOUNT],
                { account: requester.account }
            );
            const after = await mockUsdc.read.balanceOf([requester.account.address]);
            assert.equal(before - after, AUDIT_AMOUNT);
        });

        it("hasPendingAudit mis à true", async () => {
            await registry.write.depositAudit(
                [auditor1.account.address, auditedContract.account.address, VALID_CID, AUDIT_AMOUNT],
                { account: requester.account }
            );
            const pending = await registry.read.hasPendingAudit([
                requester.account.address,
                auditor1.account.address,
            ]);
            assert.equal(pending, true);
        });

        it("depositedAt correctement initialisé", async () => {
            const publicClient = await viem.getPublicClient();
            const hash = await registry.write.depositAudit(
                [auditor1.account.address, auditedContract.account.address, VALID_CID, AUDIT_AMOUNT],
                { account: requester.account }
            );
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
            const audit = await registry.read.getAudit([1n]);
            assert.strictEqual(audit.depositedAt, Number(block.timestamp));
        });

        it("revert AmountZero si amount == 0", async () => {
            await assert.rejects(
                registry.write.depositAudit(
                    [auditor1.account.address, auditedContract.account.address, VALID_CID, 0n],
                    { account: requester.account }
                ),
                /AuditRegistry__AmountZero/
            );
        });

        it("revert EmptyCID si reportCID == bytes32(0)", async () => {
            await assert.rejects(
                registry.write.depositAudit(
                    [auditor1.account.address, auditedContract.account.address, EMPTY_CID, AUDIT_AMOUNT],
                    { account: requester.account }
                ),
                /AuditRegistry__EmptyCID/
            );
        });

        it("revert AuditorNotRegistered si auditeur non inscrit", async () => {
            await assert.rejects(
                registry.write.depositAudit(
                    [stranger.account.address, auditor1.account.address, VALID_CID, AUDIT_AMOUNT],
                    { account: requester.account }
                ),
                /AuditRegistry__AuditorNotRegistered/
            );
        });

        it("revert AuditAlreadyPending si double dépôt même paire", async () => {
            await registry.write.depositAudit(
                [auditor1.account.address, auditedContract.account.address, VALID_CID, AUDIT_AMOUNT],
                { account: requester.account }
            );
            await assert.rejects(
                registry.write.depositAudit(
                    [auditor1.account.address, auditedContract.account.address, VALID_CID, AUDIT_AMOUNT],
                    { account: requester.account }
                ),
                /AuditRegistry__AuditAlreadyPending/
            );
        });

        it("deux audits distincts possibles avec deux auditeurs différents", async () => {
            await registry.write.registerAuditor(
                ["bob", ["NFT"]],
                { account: auditor2.account }
            );
            await registry.write.depositAudit(
                [auditor1.account.address, auditedContract.account.address, VALID_CID, AUDIT_AMOUNT],
                { account: requester.account }
            );
            await assert.doesNotReject(
                registry.write.depositAudit(
                    [auditor2.account.address, auditor2.account.address, VALID_CID, AUDIT_AMOUNT],
                    { account: requester.account }
                )
            );
            assert.equal(await registry.read.auditCount(), 2n);
        });

        it("event AuditDeposited émis correctement", async () => {
            const publicClient = await viem.getPublicClient();
            const hash = await registry.write.depositAudit(
                [auditor1.account.address, auditedContract.account.address, VALID_CID, AUDIT_AMOUNT],
                { account: requester.account }
            );
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            const logs = await publicClient.getContractEvents({
                address: registry.address,
                abi: registry.abi,
                eventName: "AuditDeposited",
                fromBlock: receipt.blockNumber,
                toBlock: receipt.blockNumber,
            });
            assert.equal(logs.length, 1);
            assert.equal(logs[0].args.auditId, 1n);
            assert.equal(getAddress(logs[0].args.auditor!), getAddress(auditor1.account.address));
            assert.equal(getAddress(logs[0].args.requester!), getAddress(requester.account.address));
            assert.equal(logs[0].args.amount, ESCROW_AMOUNT);
        });
    });

    // =========================================================================
    // validateAudit()
    // =========================================================================

    describe("validateAudit()", () => {
        beforeEach(async () => {
            await registry.write.registerAuditor(
                ["alice", ["DeFi"]],
                { account: auditor1.account }
            );
            await registry.write.depositAudit(
                [auditor1.account.address, auditedContract.account.address, VALID_CID, AUDIT_AMOUNT],
                { account: requester.account }
            );
        });

        it("statut VALIDATED après validation", async () => {
            await registry.write.validateAudit(
                [1n, GUARANTEE_DURATION],
                { account: auditor1.account }
            );
            const audit = await registry.read.getAudit([1n]);
            assert.equal(audit.status, 1); // VALIDATED
        });

        it("guaranteeEnd correctement calculé", async () => {
            const publicClient = await viem.getPublicClient();
            const hash = await registry.write.validateAudit(
                [1n, GUARANTEE_DURATION],
                { account: auditor1.account }
            );
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
            const audit = await registry.read.getAudit([1n]);
            assert.strictEqual(audit.guaranteeEnd, Number((block.timestamp + GUARANTEE_DURATION) ));
        });

        it("hasPendingAudit remis à false", async () => {
            await registry.write.validateAudit(
                [1n, GUARANTEE_DURATION],
                { account: auditor1.account }
            );
            const pending = await registry.read.hasPendingAudit([
                requester.account.address,
                auditor1.account.address,
            ]);
            assert.equal(pending, false);
        });

        it("lockFunds appelé sur l'Escrow avec les bons paramètres", async () => {
            await registry.write.validateAudit(
                [1n, GUARANTEE_DURATION],
                { account: auditor1.account }
            );
            const count = await mockEscrow.read.getLockCallsCount();
            assert.equal(count, 1n);
            const lastCall = await mockEscrow.read.getLastLockCall();
            assert.equal(lastCall.auditId, 1n);
            assert.equal(getAddress(lastCall.auditor), getAddress(auditor1.account.address));
            assert.equal(getAddress(lastCall.requester), getAddress(requester.account.address));
            assert.equal(lastCall.amount, ESCROW_AMOUNT);
        });

        it("incAudits appelé : totalAudits incrémenté", async () => {
            await registry.write.validateAudit(
                [1n, GUARANTEE_DURATION],
                { account: auditor1.account }
            );
            const data = await badge.read.getAuditorData([auditor1.account.address]);
            assert.equal(data.totalAudits, 1);
        });

        it("incAudits appelé : reputationScore augmenté", async () => {
            const before = (await badge.read.getAuditorData([auditor1.account.address])).reputationScore;
            await registry.write.validateAudit(
                [1n, GUARANTEE_DURATION],
                { account: auditor1.account }
            );
            const after = (await badge.read.getAuditorData([auditor1.account.address])).reputationScore;
            assert.ok(after > before);
        });

        it("revert NotTheAuditor si mauvais appelant", async () => {
            await assert.rejects(
                registry.write.validateAudit(
                    [1n, GUARANTEE_DURATION],
                    { account: stranger.account }
                ),
                /AuditRegistry__NotTheAuditor/
            );
        });

        it("revert InvalidStatus si audit déjà validé", async () => {
            await registry.write.validateAudit(
                [1n, GUARANTEE_DURATION],
                { account: auditor1.account }
            );
            await assert.rejects(
                registry.write.validateAudit(
                    [1n, GUARANTEE_DURATION],
                    { account: auditor1.account }
                ),
                /AuditRegistry__InvalidStatus/
            );
        });

        it("event AuditValidated émis avec immediatePayment = 70%", async () => {
            const publicClient = await viem.getPublicClient();
            const hash = await registry.write.validateAudit(
                [1n, GUARANTEE_DURATION],
                { account: auditor1.account }
            );
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            const logs = await publicClient.getContractEvents({
                address: registry.address,
                abi: registry.abi,
                eventName: "AuditValidated",
                fromBlock: receipt.blockNumber,
                toBlock: receipt.blockNumber,
            });
            assert.equal(logs.length, 1);
            assert.equal(logs[0].args.auditId, 1n);
            assert.equal(getAddress(logs[0].args.auditor!), getAddress(auditor1.account.address));
            assert.equal(logs[0].args.immediatePayment, ESCROW_AMOUNT * 70n / 100n);
        });
    });

    // =========================================================================
    // claimRefundAfterTimeout()
    // =========================================================================

    describe("claimRefundAfterTimeout()", () => {
        beforeEach(async () => {
            await registry.write.registerAuditor(
                ["alice", ["DeFi"]],
                { account: auditor1.account }
            );
            await registry.write.depositAudit(
                [auditor1.account.address, auditedContract.account.address, VALID_CID, AUDIT_AMOUNT],
                { account: requester.account }
            );
        });

        it("remboursement réussi après 10 jours", async () => {
            await mineTime(VALIDATION_TIMEOUT + 1n);
            const before = await mockUsdc.read.balanceOf([requester.account.address]);
            await registry.write.claimRefundAfterTimeout(
                [1n],
                { account: requester.account }
            );
            const after = await mockUsdc.read.balanceOf([requester.account.address]);
            assert.equal(after - before, ESCROW_AMOUNT);
        });

        it("statut CLOSED après remboursement", async () => {
            await mineTime(VALIDATION_TIMEOUT + 1n);
            await registry.write.claimRefundAfterTimeout(
                [1n],
                { account: requester.account }
            );
            const audit = await registry.read.getAudit([1n]);
            assert.equal(audit.status, 2); // CLOSED
        });

        it("hasPendingAudit remis à false", async () => {
            await mineTime(VALIDATION_TIMEOUT + 1n);
            await registry.write.claimRefundAfterTimeout(
                [1n],
                { account: requester.account }
            );
            const pending = await registry.read.hasPendingAudit([
                requester.account.address,
                auditor1.account.address,
            ]);
            assert.equal(pending, false);
        });

        it("refund appelé sur l'Escrow avec les bons paramètres", async () => {
            await mineTime(VALIDATION_TIMEOUT + 1n);
            await registry.write.claimRefundAfterTimeout(
                [1n],
                { account: requester.account }
            );
            const count = await mockEscrow.read.getRefundCallsCount();
            assert.equal(count, 1n);
            const lastCall = await mockEscrow.read.getLastRefundCall();
            assert.equal(lastCall.auditId, 1n);
            assert.equal(getAddress(lastCall.requester), getAddress(requester.account.address));
            assert.equal(lastCall.amount, ESCROW_AMOUNT);
        });

        it("revert ValidationTimeout si 10 jours pas encore passés", async () => {
            await mineTime(5n * 24n * 60n * 60n);
            await assert.rejects(
                registry.write.claimRefundAfterTimeout(
                    [1n],
                    { account: requester.account }
                ),
                /AuditRegistry__ValidationTimeout/
            );
        });

        it("revert NotTheRequester si mauvais appelant", async () => {
            await mineTime(VALIDATION_TIMEOUT + 1n);
            await assert.rejects(
                registry.write.claimRefundAfterTimeout(
                    [1n],
                    { account: stranger.account }
                ),
                /AuditRegistry__NotTheRequester/
            );
        });

        it("revert AuditNotPending si audit déjà validé", async () => {
            await registry.write.validateAudit(
                [1n, GUARANTEE_DURATION],
                { account: auditor1.account }
            );
            await mineTime(VALIDATION_TIMEOUT + 1n);
            await assert.rejects(
                registry.write.claimRefundAfterTimeout(
                    [1n],
                    { account: requester.account }
                ),
                /AuditRegistry__AuditNotPending/
            );
        });

        it("event RefundClaimed émis correctement", async () => {
            const publicClient = await viem.getPublicClient();
            await mineTime(VALIDATION_TIMEOUT + 1n);
            const hash = await registry.write.claimRefundAfterTimeout(
                [1n],
                { account: requester.account }
            );
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            const logs = await publicClient.getContractEvents({
                address: registry.address,
                abi: registry.abi,
                eventName: "RefundClaimed",
                fromBlock: receipt.blockNumber,
                toBlock: receipt.blockNumber,
            });
            assert.equal(logs.length, 1);
            assert.equal(logs[0].args.auditId, 1n);
            assert.equal(getAddress(logs[0].args.requester!), getAddress(requester.account.address));
            assert.equal(logs[0].args.refundAmount, ESCROW_AMOUNT);
        });
    });

    // =========================================================================
    // reportExploit()
    // =========================================================================

    describe("reportExploit()", () => {
        beforeEach(async () => {
            await registry.write.registerAuditor(
                ["alice", ["DeFi"]],
                { account: auditor1.account }
            );
            await registry.write.depositAudit(
                [auditor1.account.address, auditedContract.account.address, VALID_CID, AUDIT_AMOUNT],
                { account: requester.account }
            );
            await registry.write.validateAudit(
                [1n, GUARANTEE_DURATION],
                { account: auditor1.account }
            );
        });

        it("signalement réussi : incident créé dans DAOVoting", async () => {
            await registry.write.reportExploit(
                [1n, PREUVES_CID],
                { account: requester.account }
            );
            const count = await mockDao.read.getCreateIncidentCallsCount();
            assert.equal(count, 1n);
        });

        it("createIncident appelé avec les bons paramètres", async () => {
            await registry.write.reportExploit(
                [1n, PREUVES_CID],
                { account: requester.account }
            );
            const lastCall = await mockDao.read.getLastCreateIncidentCall();
            assert.equal(lastCall.auditId, 1n);
            assert.equal(getAddress(lastCall.reporter), getAddress(requester.account.address));
            assert.equal(lastCall.preuvesCID, PREUVES_CID);
        });

        it("preuvesCID optionnel : bytes32(0) accepté", async () => {
            await assert.doesNotReject(
                registry.write.reportExploit(
                    [1n, EMPTY_CID],
                    { account: requester.account }
                )
            );
        });

        it("revert NotTheRequester si mauvais appelant", async () => {
            await assert.rejects(
                registry.write.reportExploit(
                    [1n, PREUVES_CID],
                    { account: stranger.account }
                ),
                /AuditRegistry__NotTheRequester/
            );
        });

        it("revert GuaranteeExpired si garantie expirée", async () => {
            await mineTime(GUARANTEE_DURATION + 1n);
            await assert.rejects(
                registry.write.reportExploit(
                    [1n, PREUVES_CID],
                    { account: requester.account }
                ),
                /AuditRegistry__GuaranteeExpired/
            );
        });

        it("revert IncidentAlreadyExists si double signalement", async () => {
            await registry.write.reportExploit(
                [1n, PREUVES_CID],
                { account: requester.account }
            );
            await assert.rejects(
                registry.write.reportExploit(
                    [1n, PREUVES_CID],
                    { account: requester.account }
                ),
                /AuditRegistry__IncidentAlreadyExists/
            );
        });

        it("event ExploitReported émis correctement", async () => {
            const publicClient = await viem.getPublicClient();
            const hash = await registry.write.reportExploit(
                [1n, PREUVES_CID],
                { account: requester.account }
            );
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            const logs = await publicClient.getContractEvents({
                address: registry.address,
                abi: registry.abi,
                eventName: "ExploitReported",
                fromBlock: receipt.blockNumber,
                toBlock: receipt.blockNumber,
            });
            assert.equal(logs.length, 1);
            assert.equal(logs[0].args.auditId, 1n);
            assert.equal(getAddress(logs[0].args.requester!), getAddress(requester.account.address));
        });
    });

    // =========================================================================
    // resolveIncident()
    // =========================================================================

    describe("resolveIncident()", () => {
        beforeEach(async () => {
            await registry.write.registerAuditor(
                ["alice", ["DeFi"]],
                { account: auditor1.account }
            );
            await registry.write.depositAudit(
                [auditor1.account.address, auditedContract.account.address, VALID_CID, AUDIT_AMOUNT],
                { account: requester.account }
            );
            await registry.write.validateAudit(
                [1n, GUARANTEE_DURATION],
                { account: auditor1.account }
            );
            await registry.write.reportExploit(
                [1n, PREUVES_CID],
                { account: requester.account }
            );
        });

        it("exploit validé : statut CLOSED", async () => {
            const { daoClient, stop } = await impersonateDao(mockDao.address);
            await registry.write.resolveIncident([1n, true], { account: daoClient.account });
            await stop();

            const audit = await registry.read.getAudit([1n]);
            assert.equal(audit.status, 2); // CLOSED
        });

        it("exploit validé : totalExploits incrémenté", async () => {
            const { daoClient, stop } = await impersonateDao(mockDao.address);
            await registry.write.resolveIncident([1n, true], { account: daoClient.account });
            await stop();

            const data = await badge.read.getAuditorData([auditor1.account.address]);
            assert.equal(data.totalExploits, 1);
        });

        it("exploit rejeté : totalExploits NON incrémenté", async () => {
            const { daoClient, stop } = await impersonateDao(mockDao.address);
            await registry.write.resolveIncident([1n, false], { account: daoClient.account });
            await stop();

            const data = await badge.read.getAuditorData([auditor1.account.address]);
            assert.equal(data.totalExploits, 0);
        });

        it("exploit rejeté : statut CLOSED quand même", async () => {
            const { daoClient, stop } = await impersonateDao(mockDao.address);
            await registry.write.resolveIncident([1n, false], { account: daoClient.account });
            await stop();

            const audit = await registry.read.getAudit([1n]);
            assert.equal(audit.status, 2); // CLOSED
        });

        it("revert NotDAOVoting si mauvais appelant", async () => {
            await assert.rejects(
                registry.write.resolveIncident(
                    [1n, true],
                    { account: stranger.account }
                ),
                /AuditRegistry__NotDAOVoting/
            );
        });

        it("event IncidentResolved émis : validated = true", async () => {
            const publicClient = await viem.getPublicClient();
            const { daoClient, stop } = await impersonateDao(mockDao.address);
            const hash = await registry.write.resolveIncident(
                [1n, true],
                { account: daoClient.account }
            );
            await stop();

            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            const logs = await publicClient.getContractEvents({
                address: registry.address,
                abi: registry.abi,
                eventName: "IncidentResolved",
                fromBlock: receipt.blockNumber,
                toBlock: receipt.blockNumber,
            });
            assert.equal(logs.length, 1);
            assert.equal(logs[0].args.auditId, 1n);
            assert.equal(logs[0].args.validated, true);
        });

        it("event IncidentResolved émis : validated = false", async () => {
            const publicClient = await viem.getPublicClient();
            const { daoClient, stop } = await impersonateDao(mockDao.address);
            const hash = await registry.write.resolveIncident(
                [1n, false],
                { account: daoClient.account }
            );
            await stop();

            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            const logs = await publicClient.getContractEvents({
                address: registry.address,
                abi: registry.abi,
                eventName: "IncidentResolved",
                fromBlock: receipt.blockNumber,
                toBlock: receipt.blockNumber,
            });
            assert.equal(logs.length, 1);
            assert.equal(logs[0].args.validated, false);
        });
    });

    // =========================================================================
    // Scénarios process complet
    // =========================================================================

    describe("Scénarios process complet", () => {
        beforeEach(async () => {
            await registry.write.registerAuditor(
                ["alice", ["DeFi"]],
                { account: auditor1.account }
            );
        });

        it("flux nominal : inscription -> dépôt -> validation -> score mis à jour", async () => {
            await registry.write.depositAudit(
                [auditor1.account.address, auditedContract.account.address, VALID_CID, AUDIT_AMOUNT],
                { account: requester.account }
            );
            await registry.write.validateAudit(
                [1n, GUARANTEE_DURATION],
                { account: auditor1.account }
            );

            const audit = await registry.read.getAudit([1n]);
            assert.equal(audit.status, 1); // VALIDATED

            const data = await badge.read.getAuditorData([auditor1.account.address]);
            assert.ok(data.reputationScore > 0n);
            assert.equal(data.totalAudits, 1);
            assert.equal(data.totalExploits, 0);
        });

        it("flux timeout : dépôt -> 10 jours -> remboursement -> CLOSED", async () => {
            await registry.write.depositAudit(
                [auditor1.account.address, auditedContract.account.address, VALID_CID, AUDIT_AMOUNT],
                { account: requester.account }
            );

            const before = await mockUsdc.read.balanceOf([requester.account.address]);
            await mineTime(VALIDATION_TIMEOUT + 1n);
            await registry.write.claimRefundAfterTimeout(
                [1n],
                { account: requester.account }
            );
            const after = await mockUsdc.read.balanceOf([requester.account.address]);

            assert.equal(after - before, ESCROW_AMOUNT);
            const audit = await registry.read.getAudit([1n]);
            assert.equal(audit.status, 2); // CLOSED
        });

        it("flux exploit validé : score dégradé et statut CLOSED", async () => {
            await registry.write.depositAudit(
                [auditor1.account.address, auditedContract.account.address, VALID_CID, AUDIT_AMOUNT],
                { account: requester.account }
            );
            await registry.write.validateAudit(
                [1n, GUARANTEE_DURATION],
                { account: auditor1.account }
            );
            await registry.write.reportExploit(
                [1n, PREUVES_CID],
                { account: requester.account }
            );

            const { daoClient, stop } = await impersonateDao(mockDao.address);
            await registry.write.resolveIncident([1n, true], { account: daoClient.account });
            await stop();

            const audit = await registry.read.getAudit([1n]);
            assert.equal(audit.status, 2); // CLOSED

            const data = await badge.read.getAuditorData([auditor1.account.address]);
            assert.equal(data.totalExploits, 1);
        });

        it("flux exploit rejeté : score inchangé et statut CLOSED", async () => {
            await registry.write.depositAudit(
                [auditor1.account.address, auditedContract.account.address, VALID_CID, AUDIT_AMOUNT],
                { account: requester.account }
            );
            await registry.write.validateAudit(
                [1n, GUARANTEE_DURATION],
                { account: auditor1.account }
            );

            const scoreBefore = (await badge.read.getAuditorData([auditor1.account.address])).reputationScore;

            await registry.write.reportExploit(
                [1n, PREUVES_CID],
                { account: requester.account }
            );

            const { daoClient, stop } = await impersonateDao(mockDao.address);
            await registry.write.resolveIncident([1n, false], { account: daoClient.account });
            await stop();

            const dataAfter = await badge.read.getAuditorData([auditor1.account.address]);
            assert.equal(dataAfter.reputationScore, scoreBefore);
            assert.equal(dataAfter.totalExploits, 0);
        });

        it("deux auditeurs indépendants : pas d'interférence", async () => {
            await registry.write.registerAuditor(
                ["bob", ["NFT"]],
                { account: auditor2.account }
            );

            await registry.write.depositAudit(
                [auditor1.account.address, auditedContract.account.address, VALID_CID, AUDIT_AMOUNT],
                { account: requester.account }
            );
            await registry.write.depositAudit(
                [auditor2.account.address, auditor2.account.address, VALID_CID, AUDIT_AMOUNT],
                { account: requester.account }
            );
            await registry.write.validateAudit([1n, GUARANTEE_DURATION], { account: auditor1.account });
            await registry.write.validateAudit([2n, GUARANTEE_DURATION], { account: auditor2.account });

            const data1 = await badge.read.getAuditorData([auditor1.account.address]);
            const data2 = await badge.read.getAuditorData([auditor2.account.address]);

            assert.equal(data1.totalAudits, 1);
            assert.equal(data2.totalAudits, 1);
            assert.equal(data1.totalExploits, 0);
            assert.equal(data2.totalExploits, 0);
            assert.ok(data1.reputationScore > 0n);
            assert.ok(data2.reputationScore > 0n);
        });
    });
});