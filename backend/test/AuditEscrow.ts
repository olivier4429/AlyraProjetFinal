import { before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { getAddress, parseUnits } from "viem";

const { viem } = await network.connect();

// =========================================================================
// Constantes
// =========================================================================

const AMOUNT     = parseUnits("95", 6);   // 95 USDC : montant en séquestre (après frais treasury)
const IMMEDIATE  = (AMOUNT * 70n) / 100n; // 66.5 USDC
const GUARANTEE  = AMOUNT - IMMEDIATE;    // 28.5 USDC  (via amount - guarantee pour éviter l'écart d'arrondi)

// =========================================================================
// Suite
// =========================================================================

describe("AuditEscrow", () => {
    let owner:    any;
    let registry: any; // compte qui jouera le rôle de la registry
    let auditor:  any;
    let requester: any;
    let stranger: any;

    let mockUsdc: any;
    let escrow:   any;

    before(async () => {
        [owner, registry, auditor, requester, stranger] = await viem.getWalletClients();
    });

    beforeEach(async () => {
        mockUsdc = await viem.deployContract("MockUSDC");
        escrow   = await viem.deployContract("AuditEscrow", [mockUsdc.address]);

        // Lier l'escrow au compte "registry" (simule AuditRegistry)
        await escrow.write.setRegistryAddress([registry.account.address], {
            account: owner.account,
        });

        // Minter des USDC directement dans l'escrow (simule le transfert fait par depositAudit)
        await mockUsdc.write.mint([escrow.address, parseUnits("10000", 6)], {
            account: owner.account,
        });
    });

    // =========================================================================
    // Déploiement
    // =========================================================================

    describe("Déploiement", () => {
        it("usdc correctement défini", async () => {
            const addr = await escrow.read.usdc();
            assert.equal(getAddress(addr), getAddress(mockUsdc.address));
        });

        it("registryAddress correctement défini après setRegistryAddress", async () => {
            const addr = await escrow.read.registryAddress();
            assert.equal(getAddress(addr), getAddress(registry.account.address));
        });

        it("owner correctement défini", async () => {
            const addr = await escrow.read.owner();
            assert.equal(getAddress(addr), getAddress(owner.account.address));
        });
    });

    // =========================================================================
    // setRegistryAddress()
    // =========================================================================

    describe("setRegistryAddress()", () => {
        it("modifiable par le owner", async () => {
            await escrow.write.setRegistryAddress([stranger.account.address], {
                account: owner.account,
            });
            const addr = await escrow.read.registryAddress();
            assert.equal(getAddress(addr), getAddress(stranger.account.address));
        });

        it("revert ZeroAddress si address(0)", async () => {
            await assert.rejects(
                escrow.write.setRegistryAddress(
                    ["0x0000000000000000000000000000000000000000"],
                    { account: owner.account }
                ),
                /AuditEscrow__ZeroAddress/
            );
        });

        it("revert OwnableUnauthorizedAccount si non-owner", async () => {
            await assert.rejects(
                escrow.write.setRegistryAddress([stranger.account.address], {
                    account: stranger.account,
                }),
                /OwnableUnauthorizedAccount/
            );
        });
    });

    // =========================================================================
    // lockFunds()
    // =========================================================================

    describe("lockFunds()", () => {
        it("enregistre la ventilation 70/30 correctement", async () => {
            await escrow.write.lockFunds(
                [1n, auditor.account.address, requester.account.address, AMOUNT],
                { account: registry.account }
            );
            const esc = await escrow.read.escrows([1n]);
            // [auditor, paymentClaimed, guaranteeClaimed, requester, immediateAmount, guaranteeAmount]
            assert.equal(getAddress(esc[0]), getAddress(auditor.account.address));
            assert.equal(esc[1], false);  // paymentClaimed
            assert.equal(esc[2], false);  // guaranteeClaimed
            assert.equal(getAddress(esc[3]), getAddress(requester.account.address));
            assert.equal(esc[4], IMMEDIATE);
            assert.equal(esc[5], GUARANTEE);
        });

        it("revert NotRegistry si pas la registry", async () => {
            await assert.rejects(
                escrow.write.lockFunds(
                    [1n, auditor.account.address, requester.account.address, AMOUNT],
                    { account: stranger.account }
                ),
                /AuditEscrow__NotRegistry/
            );
        });
    });

    // =========================================================================
    // releasePayment()
    // =========================================================================

    describe("releasePayment()", () => {
        beforeEach(async () => {
            await escrow.write.lockFunds(
                [1n, auditor.account.address, requester.account.address, AMOUNT],
                { account: registry.account }
            );
        });

        it("transfère immediateAmount (70%) à l'auditeur", async () => {
            const before = await mockUsdc.read.balanceOf([auditor.account.address]);
            await escrow.write.releasePayment([1n, auditor.account.address], {
                account: registry.account,
            });
            const after = await mockUsdc.read.balanceOf([auditor.account.address]);
            assert.equal(after - before, IMMEDIATE);
        });

        it("marque paymentClaimed = true", async () => {
            await escrow.write.releasePayment([1n, auditor.account.address], {
                account: registry.account,
            });
            const esc = await escrow.read.escrows([1n]);
            assert.equal(esc[1], true); // paymentClaimed
        });

        it("revert AlreadyClaimed si réclamé deux fois", async () => {
            await escrow.write.releasePayment([1n, auditor.account.address], {
                account: registry.account,
            });
            await assert.rejects(
                escrow.write.releasePayment([1n, auditor.account.address], {
                    account: registry.account,
                }),
                /AuditEscrow__AlreadyClaimed/
            );
        });

        it("revert NothingToClaim si auditId inconnu (immediateAmount == 0)", async () => {
            await assert.rejects(
                escrow.write.releasePayment([99n, auditor.account.address], {
                    account: registry.account,
                }),
                /AuditEscrow__NothingToClaim/
            );
        });

        it("revert NotRegistry si pas la registry", async () => {
            await assert.rejects(
                escrow.write.releasePayment([1n, auditor.account.address], {
                    account: stranger.account,
                }),
                /AuditEscrow__NotRegistry/
            );
        });

        it("event PaymentReleased émis correctement", async () => {
            await viem.assertions.emitWithArgs(
                escrow.write.releasePayment([1n, auditor.account.address], {
                    account: registry.account,
                }),
                escrow,
                "PaymentReleased",
                [1n, getAddress(auditor.account.address), IMMEDIATE]
            );
        });
    });

    // =========================================================================
    // releaseGuarantee()
    // =========================================================================

    describe("releaseGuarantee()", () => {
        beforeEach(async () => {
            await escrow.write.lockFunds(
                [1n, auditor.account.address, requester.account.address, AMOUNT],
                { account: registry.account }
            );
        });

        it("transfère guaranteeAmount (30%) à l'auditeur", async () => {
            const before = await mockUsdc.read.balanceOf([auditor.account.address]);
            await escrow.write.releaseGuarantee([1n, auditor.account.address], {
                account: registry.account,
            });
            const after = await mockUsdc.read.balanceOf([auditor.account.address]);
            assert.equal(after - before, GUARANTEE);
        });

        it("marque guaranteeClaimed = true", async () => {
            await escrow.write.releaseGuarantee([1n, auditor.account.address], {
                account: registry.account,
            });
            const esc = await escrow.read.escrows([1n]);
            assert.equal(esc[2], true); // guaranteeClaimed
        });

        it("revert AlreadyClaimed si réclamé deux fois", async () => {
            await escrow.write.releaseGuarantee([1n, auditor.account.address], {
                account: registry.account,
            });
            await assert.rejects(
                escrow.write.releaseGuarantee([1n, auditor.account.address], {
                    account: registry.account,
                }),
                /AuditEscrow__AlreadyClaimed/
            );
        });

        it("revert NothingToClaim si auditId inconnu (guaranteeAmount == 0)", async () => {
            await assert.rejects(
                escrow.write.releaseGuarantee([99n, auditor.account.address], {
                    account: registry.account,
                }),
                /AuditEscrow__NothingToClaim/
            );
        });

        it("revert NotRegistry si pas la registry", async () => {
            await assert.rejects(
                escrow.write.releaseGuarantee([1n, auditor.account.address], {
                    account: stranger.account,
                }),
                /AuditEscrow__NotRegistry/
            );
        });

        it("event GuaranteeReleased émis correctement", async () => {
            await viem.assertions.emitWithArgs(
                escrow.write.releaseGuarantee([1n, auditor.account.address], {
                    account: registry.account,
                }),
                escrow,
                "GuaranteeReleased",
                [1n, getAddress(auditor.account.address), GUARANTEE]
            );
        });

        it("paymentClaimed et guaranteeClaimed indépendants", async () => {
            await escrow.write.releasePayment([1n, auditor.account.address], {
                account: registry.account,
            });
            // La garantie est toujours disponible après claimPayment
            const before = await mockUsdc.read.balanceOf([auditor.account.address]);
            await escrow.write.releaseGuarantee([1n, auditor.account.address], {
                account: registry.account,
            });
            const after = await mockUsdc.read.balanceOf([auditor.account.address]);
            assert.equal(after - before, GUARANTEE);
        });
    });

    // =========================================================================
    // refund()
    // =========================================================================

    describe("refund()", () => {
        it("transfère le montant au requester", async () => {
            const before = await mockUsdc.read.balanceOf([requester.account.address]);
            await escrow.write.refund([1n, requester.account.address, AMOUNT], {
                account: registry.account,
            });
            const after = await mockUsdc.read.balanceOf([requester.account.address]);
            assert.equal(after - before, AMOUNT);
        });

        it("revert NotRegistry si pas la registry", async () => {
            await assert.rejects(
                escrow.write.refund([1n, requester.account.address, AMOUNT], {
                    account: stranger.account,
                }),
                /AuditEscrow__NotRegistry/
            );
        });

        it("event Refunded émis correctement", async () => {
            await viem.assertions.emitWithArgs(
                escrow.write.refund([1n, requester.account.address, AMOUNT], {
                    account: registry.account,
                }),
                escrow,
                "Refunded",
                [1n, getAddress(requester.account.address), AMOUNT]
            );
        });
    });
});
