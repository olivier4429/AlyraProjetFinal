// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AuditEscrow
 * @author OLB
 * @notice Coffre-fort des fonds d'audit. Exécute les transferts uniquement sur ordre d'AuditRegistry.
 *         Toute la logique métier (vérification des droits, délais, statuts) reste dans AuditRegistry.
 *         AuditEscrow ne fait confiance qu'à la Registry : c'est elle qui garantit la sécurité.
 * @dev Pattern pull payment : aucun transfert automatique.
 *      AuditEscrow ne connaît pas guaranteeEnd : c'est AuditRegistry qui vérifie les conditions
 *      avant d'autoriser chaque transfert.
 *      Version sans Aave : pas de yield, les fonds sont conservés en USDC.
 *
 * ============================================================
 * FLUX FINANCIERS  (exemple sur un dépôt de 100 USDC)
 * ============================================================
 *
 *  PHASE 4 : depositAudit()
 *  ─────────────────────────────────────────────────────────
 *  Requester ──[100 USDC]──► AuditRegistry
 *                                  │
 *                     ┌────────────┴────────────┐
 *                     ▼                         ▼
 *               Treasury (5%)            AuditEscrow (95%)
 *                5 USDC                    95 USDC
 *
 *  PHASE 5a : validateAudit()  =>  lockFunds()
 *  ─────────────────────────────────────────────────────────
 *  AuditRegistry ──────────────────────► AuditEscrow
 *                                          │
 *                             ┌────────────┴────────────┐
 *                             ▼                         ▼
 *                     Paiement immédiat          Retenue de garantie
 *                       70% = 66.5 USDC            30% = 28.5 USDC
 *                     (claimable aussitôt)       (bloqué jusqu'à guaranteeEnd)
 *
 *  PHASE 5b : claimRefundAfterTimeout()  (alternatif – si pas de validation sous 10j)
 *  ─────────────────────────────────────────────────────────
 *  Requester ──► AuditRegistry ──► AuditEscrow.refund()
 *  Requester ◄──[95 USDC]──────────────────────────────────
 *  Note : les 5 USDC Treasury ne sont pas remboursés
 *
 *  PHASE 6a : claimPayment()  (pull payment, pas de délai après validation)
 *  ─────────────────────────────────────────────────────────
 *  Auditeur ──► AuditRegistry ──► AuditEscrow.releasePayment()
 *  Auditeur ◄──[66.5 USDC]──────────────────────────────────
 *
 *  PHASE 7a : claimGuarantee()  (après guaranteeEnd, ou exploit rejeté)
 *  ─────────────────────────────────────────────────────────
 *  Auditeur ──► AuditRegistry ──► AuditEscrow.releaseGuarantee()
 *  Auditeur ◄──[28.5 USDC]──────────────────────────────────
 *
 *  CAS EXPLOIT : resolveIncident(validated=true)
 *  ─────────────────────────────────────────────────────────
 *  DAOVoting ──► AuditRegistry ──► ReputationBadge.incExploits()
 *  Note : la libération des 28.5 USDC vers le requester
 *         est gérée par AuditEscrow (hors scope de cette Registry)
 *
 * ============================================================
 */
contract AuditEscrow is ReentrancyGuard, Ownable {

    // =========================================================================
    // Types
    // =========================================================================

    /**
     * @notice Fonds séquestrés par audit
     * @dev Slot 0 : auditor (160) + paymentClaimed (1) + guaranteeClaimed (1) = 162 bits
     *      Slot 1 : requester (160)
     *      Slot 2 : immediateAmount (256) : 70%
     *      Slot 3 : guaranteeAmount (256) : 30%
     */
    struct EscrowInfo {
        address auditor;
        bool    paymentClaimed;
        bool    guaranteeClaimed;
        address requester;
        uint256 immediateAmount;
        uint256 guaranteeAmount;
    }

    // =========================================================================
    // Storage
    // =========================================================================

    /** @notice Token USDC utilisé pour tous les paiements */
    IERC20 public immutable usdc;

    /** @notice Seul AuditRegistry peut ordonner des transferts : défini après déploiement via setRegistryAddress() */
    address public registryAddress;

    /** @notice Fonds séquestrés par auditId */
    mapping(uint256 => EscrowInfo) public escrows;

    // =========================================================================
    // Erreurs
    // =========================================================================

    error AuditEscrow__NotRegistry();
    error AuditEscrow__AlreadyClaimed();
    error AuditEscrow__TransferFailed();
    error AuditEscrow__NothingToClaim();
    error AuditEscrow__ZeroAddress();

    // =========================================================================
    // Events
    // =========================================================================

    /** @notice Émis quand l'auditeur récupère son paiement immédiat (70%) */
    event PaymentReleased(uint256 indexed auditId, address indexed auditor, uint256 amount);

    /** @notice Émis quand l'auditeur récupère sa retenue de garantie (30%) */
    event GuaranteeReleased(uint256 indexed auditId, address indexed auditor, uint256 amount);

    /** @notice Émis quand un requester est remboursé */
    event Refunded(uint256 indexed auditId, address indexed requester, uint256 amount);

    // =========================================================================
    // Modifier
    // =========================================================================

    /** @dev Seul AuditRegistry peut autoriser des transferts : toute la logique métier est là-bas */
    modifier onlyRegistry() {
        if (msg.sender != registryAddress) revert AuditEscrow__NotRegistry();
        _;
    }

    // =========================================================================
    // Constructor
    // =========================================================================

    constructor(address usdc_) Ownable(msg.sender) {
        usdc = IERC20(usdc_);
    }

    // =========================================================================
    // Configuration
    // =========================================================================

    /**
     * @notice Définit l'adresse d'AuditRegistry après déploiement.
     * @dev Même pattern que ReputationBadge.setRegistryAddress().
     *      Appelé par le owner une fois AuditRegistry déployé.
     *      Résout la dépendance circulaire : AuditEscrow ↔ AuditRegistry.
     * @param registry Adresse du contrat AuditRegistry
     */
    function setRegistryAddress(address registry) external onlyOwner {
        if (registry == address(0)) revert AuditEscrow__ZeroAddress();
        registryAddress = registry;
    }

    // =========================================================================
    // Fonctions appelées par AuditRegistry
    // =========================================================================

    /**
     * @notice Enregistre le séquestre d'un audit validé (70% + 30%).
     *         Les USDC sont déjà dans ce contrat (transférés lors de depositAudit).
     * @dev Appelé par AuditRegistry.validateAudit().
     * @param auditId   Identifiant de l'audit
     * @param auditor   Adresse de l'auditeur
     * @param requester Adresse du demandeur
     * @param amount    Montant total en séquestre (95% du dépôt initial, après frais treasury)
     */
    function lockFunds(
        uint256 auditId,
        address auditor,
        address requester,
        uint256 amount
    ) external onlyRegistry {
        uint256 guarantee = (amount * 30) / 100;
        escrows[auditId] = EscrowInfo({
            auditor:           auditor,
            requester:         requester,
            immediateAmount:   amount - guarantee,
            guaranteeAmount:   guarantee,
            paymentClaimed:    false,
            guaranteeClaimed:  false
        });
    }

    /**
     * @notice Verse le paiement immédiat (70%) à l'auditeur.
     * @dev Appelé par AuditRegistry.claimPayment() après vérification des conditions.
     *      AuditRegistry a déjà vérifié que l'appelant est bien l'auditeur.
     * @param auditId Identifiant de l'audit
     * @param to      Adresse de l'auditeur (vérifiée par AuditRegistry)
     */
    function releasePayment(uint256 auditId, address to) external onlyRegistry nonReentrant {
        EscrowInfo storage esc = escrows[auditId];
        if (esc.paymentClaimed) revert AuditEscrow__AlreadyClaimed();
        if (esc.immediateAmount == 0) revert AuditEscrow__NothingToClaim();

        esc.paymentClaimed = true;
        uint256 amount = esc.immediateAmount;

        emit PaymentReleased(auditId, to, amount);
        bool ok = usdc.transfer(to, amount);
        if (!ok) revert AuditEscrow__TransferFailed();
    }

    /**
     * @notice Verse la retenue de garantie (30%) à l'auditeur.
     * @dev Appelé par AuditRegistry.claimGuarantee() après vérification de guaranteeEnd.
     *      AuditRegistry a déjà vérifié que la période de garantie est expirée.
     * @param auditId Identifiant de l'audit
     * @param to      Adresse de l'auditeur (vérifiée par AuditRegistry)
     */
    function releaseGuarantee(uint256 auditId, address to) external onlyRegistry nonReentrant {
        EscrowInfo storage esc = escrows[auditId];
        if (esc.guaranteeClaimed) revert AuditEscrow__AlreadyClaimed();
        if (esc.guaranteeAmount == 0) revert AuditEscrow__NothingToClaim();

        esc.guaranteeClaimed = true;
        uint256 amount = esc.guaranteeAmount;

        emit GuaranteeReleased(auditId, to, amount);
        bool ok = usdc.transfer(to, amount);
        if (!ok) revert AuditEscrow__TransferFailed();
    }

    /**
     * @notice Rembourse le requester en cas de timeout de validation.
     * @dev Appelé par AuditRegistry.claimRefundAfterTimeout() après vérification du timeout.
     * @param auditId   Identifiant de l'audit
     * @param requester Adresse du demandeur (vérifiée par AuditRegistry)
     * @param amount    Montant à rembourser
     */
    function refund(
        uint256 auditId,
        address requester,
        uint256 amount
    ) external onlyRegistry nonReentrant {
        emit Refunded(auditId, requester, amount);
        bool ok = usdc.transfer(requester, amount);
        if (!ok) revert AuditEscrow__TransferFailed();
    }
}
