// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol"; //Pas tres utile car les contracts appelés sont le contrat USDC ou les contrats que j'ai développés
import "@openzeppelin/contracts/token/ERC20/IERC20.sol"; //Pour les USDC
import "./ReputationBadge.sol";
import "./AuditEscrow.sol";

/**
 * @title AuditRegistry
 * @author OLB
 * @notice Contrat principal du protocole AuditRegistry.
 *         Gère l'inscription des auditeurs, le dépôt des audits,
 *         la validation, et le signalement d'exploits.
 * @dev Ce contrat interagit avec ReputationBadge, AuditEscrow, DAOVoting.
 *      Il utilise des USDC 6 digits. Attention : ETH est sur 18 digits.
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
 *  PHASE 5 : validateAudit()  →  lockFunds()
 *  ─────────────────────────────────────────────────────────
 *  AuditRegistry ──────────────────────► AuditEscrow
 *                                          │
 *                             ┌────────────┴────────────┐
 *                             ▼                         ▼
 *                     Paiement immédiat          Retenue de garantie
 *                       70% = 66.5 USDC            30% = 28.5 USDC
 *                     (claimable aussitôt)       (bloqué jusqu'à guaranteeEnd)
 *
 *  PHASE 5b : claimPayment()  (pull payment, pas de délai)
 *  ─────────────────────────────────────────────────────────
 *  Auditeur ──► AuditRegistry ──► AuditEscrow.releasePayment()
 *  Auditeur ◄──[66.5 USDC]──────────────────────────────────
 *
 *  PHASE 5c : claimGuarantee()  (après guaranteeEnd)
 *  ─────────────────────────────────────────────────────────
 *  Auditeur ──► AuditRegistry ──► AuditEscrow.releaseGuarantee()
 *  Auditeur ◄──[28.5 USDC]──────────────────────────────────
 *
 *  PHASE 5d : claimRefundAfterTimeout()  (si pas de validation sous 10j)
 *  ─────────────────────────────────────────────────────────
 *  Requester ──► AuditRegistry ──► AuditEscrow.refund()
 *  Requester ◄──[95 USDC]──────────────────────────────────
 *  Note : les 5 USDC Treasury ne sont pas remboursés
 *
 *  CAS EXPLOIT : resolveIncident(validated=true)
 *  ─────────────────────────────────────────────────────────
 *  DAOVoting ──► AuditRegistry ──► ReputationBadge.incExploits()
 *  Note : la libération des 28.5 USDC vers le requester
 *         est gérée par AuditEscrow (hors scope de cette Registry)
 *
 * ============================================================
 */
contract AuditRegistry is Ownable, ReentrancyGuard {
    /** @notice Etat de l'audit */
    enum AuditStatus {
        PENDING,
        VALIDATED,
        CLOSED
    }

    /** @notice pas plus de 10 specialités par auditeur pour éviter les abus et limiter la taille des events */
    uint8 public constant MAX_SPECIALTIES = 10;

    /** @notice temps donné à l'auditeur pour valider l'audit après le dépôt. Passé ce délai, le demandeur peut réclamer un remboursement. */
    uint256 public constant VALIDATION_TIMEOUT = 10 days;

    /**
     * @notice Struct représentant un audit
     * @dev Pour le storage packing, on passe les dates de uint256 à uint40 ( année 36812 c'est assez loin)
     */
    struct Audit {
        //Slot 0 : 240 bits
        address auditor; //160 bits Adresse de l'auditeur désigné
        uint40 guaranteeEnd; //40 bits date de fin de la retenue de garantie: jusqu'au 20 novembre 36812
        uint40 depositedAt; //40 bits timestamp du dépôt de l'audit (ajouté pour gérer le timeout de validation)
        //Slot 1 : 256 bits
        uint256 amount; //256 bits Montant total de l'audit en USDC (on pourrait passer à uint96 pour regrouper avec le slot suivant. A voir plus tard, pour l'instant je laisse comme ça pour ne pas avoir à changer trop de code.)
        //slot 2 : 169 bits
        address auditedContractAddress; //160 bits Contrat audité
        AuditStatus status;             //8 bits   Etat de l'audit
        bool exploitValidated;          //1 bit    true si la DAO a validé un exploit sur cet audit
        //Slot 3 : 160 bits
        address requester; //160 bits Adresse du demandeur de l'audit
        //Slot 4 et + : dynamique
        string reportCID; //CID IPFS du rapport d'audit (ex : "QmXxx..." ou "ipfs://...")
    }

    /**
     * @notice Contrat ReputationBadge : source de vérité pour les auditeurs
     * @dev immutable parce qu'on ne veut qu'elle puisse être changée apres déploiement et pour économiser du gas car elle est inliné dans le code et n'occupe de storage.
     */
    ReputationBadge public immutable reputationBadge;

    /** @notice Token USDC utilisé pour les paiements */
    IERC20 public immutable usdc;

    /** @notice Adresse du contrat Treasury : Reçoit les frais du protocole : 5% de chaque dépôt d'audit, prélevés immédiatement. Retirable uniquement par le owner. */
    address public treasuryAddress;

    /** @notice Adresse du contrat AuditEscrow : Reçoit les fonds des audits validés et gère la retenue de garantie (30% du montant de l'audit) pendant la période de garantie. */
    address public escrowAddress;

    /** @notice Adresse du contrat DAOVoting : Gère les incidents signalés pendant la période de garantie et organise les votes */
    address public daoVotingAddress;

    /** @notice Audits asscoiés à un auditId */
    mapping(uint256 => Audit) public audits;

    /**
     * @notice Vérifie qu'un audit PENDING existe déjà pour une paire requester/auditeur.
     *          Ca encourage à n'avoir qu'un seul auditeur derrière une meme adresse et non pas une société qui pourrait traiter plusieurs audits en parralelle.
     * @dev RG-14 : 1 seul audit actif par paire
     */
    mapping(address => mapping(address => bool)) public hasPendingAudit;

    /** @notice Compteur d'audits : sert d'auditId */
    uint256 public auditCount;

    // =========================================================================
    // Erreurs
    // =========================================================================

    error AuditRegistry__AlreadyRegistered();
    error AuditRegistry__AuditorNotRegistered();
    error AuditRegistry__AuditorNotActive();
    error AuditRegistry__AmountZero();
    error AuditRegistry__EmptyCID();
    error AuditRegistry__AuditAlreadyPending();
    error AuditRegistry__NotTheAuditor();
    error AuditRegistry__InvalidStatus();
    error AuditRegistry__GuaranteeTooShort();
    error AuditRegistry__NotTheRequester();
    error AuditRegistry__AuditNotPending();
    error AuditRegistry__GuaranteeExpired();
    error AuditRegistry__IncidentAlreadyExists();
    error AuditRegistry__ZeroAddress();
    error AuditRegistry__TransferFailed();
    error AuditRegistry__NotDAOVoting();
    error AuditRegistry__TooManySpecialties();
    error AuditRegistry__ValidationTimeout();
    error AuditRegistry__AuditNotValidated();
    error AuditRegistry__GuaranteeNotExpired();
    error AuditRegistry__ExploitNotValidated();
    error AuditRegistry__AuditNotClosed();
    error AuditRegistry__ContractAddressAlreadySet();
    error AuditRegistry__CannotAuditYourself();

    // =========================================================================
    // Events
    // =========================================================================

    /**
     * @notice Émis à l'inscription d'un auditeur
     * @dev Les spécialités uniquement dans l'event (gas optimal)
     */
    event AuditorRegistered(
        address indexed auditor,
        string pseudo,
        string[] specialties
    );

    /** @notice Émis lors de la mise à jour des spécialités d'un auditeur */
    event AuditorSpecialtiesUpdated(
        address indexed auditor,
        string[] specialties
    );

    /** @notice Émis au dépôt d'un audit (phase 4) */
    event AuditDeposited(
        uint256 indexed auditId,
        address indexed auditor,
        address indexed requester,
        address auditedContractAddress,
        string reportCID,
        uint256 amount
    );

    /** @notice Émis à la validation d'un audit (phase 5) */
    event AuditValidated(
        uint256 indexed auditId,
        address indexed auditor,
        uint256 guaranteeEnd,
        uint256 immediatePayment
    );

    /** @notice Émis lors du signalement d'un exploit (phase 6a) */
    event ExploitReported(
        uint256 indexed auditId,
        address indexed requester,
        string preuvesCID
    );

    /** @notice Émis lors d'une réclamation de remboursement après timeout de validation */
    event RefundClaimed(
        uint256 indexed auditId,
        address indexed requester,
        uint256 refundAmount
    );

    /** @notice Émis lors de la résolution d'un incident par la DAO */
    event IncidentResolved(uint256 indexed auditId, bool validated);

    /** @notice Émis quand le demandeur récupère la retenue de garantie après un exploit validé */
    event GuaranteeClaimedByRequester(uint256 indexed auditId, address indexed requester, uint256 amount);

    // =========================================================================
    // Modifiers
    // =========================================================================

    /** @dev Vérifie que l'adresse est inscrite comme auditeur actif */
    modifier onlyRegisteredAuditor(address auditor) {
        if (reputationBadge.tokenIdOf(auditor) == 0)
            revert AuditRegistry__AuditorNotRegistered();
        if (!reputationBadge.getAuditorData(auditor).isActive)
            revert AuditRegistry__AuditorNotActive();
        _;
    }

    // =========================================================================
    // Constructor
    // =========================================================================

    constructor(
        address reputationBadgeContract,
        address USDCContract,
        address treasuryContract,
        address escrowContract,
        address daoVotingContract
    ) Ownable(msg.sender) {
        if (reputationBadgeContract == address(0))
            revert AuditRegistry__ZeroAddress();
        if (USDCContract == address(0)) revert AuditRegistry__ZeroAddress();
        if (treasuryContract == address(0)) revert AuditRegistry__ZeroAddress();
        if (escrowContract == address(0)) revert AuditRegistry__ZeroAddress();
        if (daoVotingContract == address(0))
            revert AuditRegistry__ZeroAddress();

        reputationBadge = ReputationBadge(reputationBadgeContract);
        usdc = IERC20(USDCContract);
        treasuryAddress = treasuryContract;
        escrowAddress = escrowContract;
        daoVotingAddress = daoVotingContract;
    }

    // =========================================================================
    // Phase 1 : Inscription auditeur
    // =========================================================================

    /**
     * @notice Inscrit un nouvel auditeur et lui mint un ReputationBadge
     * @dev RG-01 : 1 inscription par adresse
     *      RG-02 : score initial = 0 (géré par ReputationBadge)
     *      RG-03 : mint NFT dès l'inscription
     *      RG-04 : spécialités uniquement dans l'event (gas optimal)
     * @param pseudo      Pseudonyme de l'auditeur (uniquement dans l'event)
     * @param specialties Liste de spécialités (DeFi, NFT, DAO, zkProof...)
     */
    function registerAuditor(
        string calldata pseudo,
        string[] calldata specialties
    ) external {
        // ============ CHECKS ============
        if (reputationBadge.tokenIdOf(msg.sender) != 0)
            revert AuditRegistry__AlreadyRegistered();
        if (specialties.length > MAX_SPECIALTIES)
            revert AuditRegistry__TooManySpecialties();
        // ============ EFFECTS ============
        emit AuditorRegistered(
            msg.sender,
            pseudo,
            specialties
        );

        // ============ INTERACTIONS ============
        reputationBadge.mintNft(msg.sender);
    }

    /**
     * @notice Met à jour les spécialités d'un auditeur
     * @dev Les spécialités ne sont pas stockées on-chain : uniquement dans les events.
     *      La DApp indexe le dernier event AuditorSpecialtiesUpdated pour afficher
     *      les spécialités courantes. L'historique complet reste consultable.
     * @param specialties Nouvelle liste complète de spécialités (remplace l'ancienne)
     */
    function updateSpecialties(string[] calldata specialties) external {
        // Vérification que l'appelant est bien un auditeur inscrit
        if (reputationBadge.tokenIdOf(msg.sender) == 0)
            revert AuditRegistry__AuditorNotRegistered();
        if (specialties.length > MAX_SPECIALTIES)
            revert AuditRegistry__TooManySpecialties();

        emit AuditorSpecialtiesUpdated(
            msg.sender,
            specialties
        );
    }

    // =========================================================================
    // Phase 4 : Dépôt
    // =========================================================================

    /**
     * @notice Dépose le montant d'un audit et le rapport IPFS.
     *         C'est le demandeur qui dépose l'audit après qu'il l'ait lu.
     *         Il peut ainsi faire des retours à l'auditeur avant validation.
     * @dev RG-10 : auditeur doit être inscrit et actif
     *      RG-11 : montant > 0
     *      RG-12 : 5% → Treasury immédiat
     *      RG-13 : escrow = 95% du dépôt
     *      RG-14 : 1 seul audit PENDING par paire requester/auditeur
     *      RG-15 : CID obligatoire
     *      modifier nonReentrant parce qu'on appelle le contrat USDC qui est externe à ce protocol
     *      modifier onlyRegisteredAuditor(auditor) pour vérifier que l'auditeur désigné est bien inscrit et actif
     * @param auditor                Adresse de l'auditeur désigné
     * @param auditedContractAddress Adresse du smart contract audité
     * @param reportCID              CID IPFS du rapport (ex : "QmXxx...")
     * @param amount                 Montant total en USDC (6 décimales)
     */
    function depositAudit(
        address auditor,
        address auditedContractAddress,
        string calldata reportCID,
        uint256 amount
    ) external nonReentrant onlyRegisteredAuditor(auditor) {
        // ============ CHECKS ============
        if (msg.sender == auditor) revert AuditRegistry__CannotAuditYourself();
        if (amount == 0) revert AuditRegistry__AmountZero();
        if (bytes(reportCID).length == 0) revert AuditRegistry__EmptyCID();
        if (hasPendingAudit[msg.sender][auditor])
            revert AuditRegistry__AuditAlreadyPending();

        // ============ EFFECTS ============
        uint256 auditId = ++auditCount;
        uint256 fee = (amount * 5) / 100;
        uint256 escrowAmount = amount - fee;

        audits[auditId] = Audit({
            auditor: auditor,
            requester: msg.sender,
            auditedContractAddress: auditedContractAddress,
            reportCID: reportCID,
            status: AuditStatus.PENDING,
            exploitValidated: false,
            amount: escrowAmount,
            guaranteeEnd: 0,
            depositedAt: uint40(block.timestamp)
        });

        hasPendingAudit[msg.sender][auditor] = true;

        emit AuditDeposited(
            auditId,
            auditor,
            msg.sender,
            auditedContractAddress,
            reportCID,
            escrowAmount
        );

        // ============ INTERACTIONS ============

        //on va chercher les USDC directement sur le compte du requester. Un approve doit avoir été fait coté DApp. A ne pas oublier fdans le code ReactJS
        bool ok = usdc.transferFrom(msg.sender, address(this), amount);
        if (!ok) revert AuditRegistry__TransferFailed();

        //on prend les frais 5% de frais pour nous
        bool feeOk = usdc.transfer(treasuryAddress, fee);
        if (!feeOk) revert AuditRegistry__TransferFailed();

        //et on envoie le reste à l'escrow
        bool escrowOk = usdc.transfer(escrowAddress, escrowAmount);
        if (!escrowOk) revert AuditRegistry__TransferFailed();
    }

    // =========================================================================
    // Phase 5 : Validation
    // =========================================================================

    /**
     * @notice Valide un audit et déclenche la ventilation 70/30
     * @dev RG-20 : seul l'auditeur désigné peut valider
     *      RG-21 : audit doit être PENDING
     *      RG-22 : garantie minimum 90 jours
     *      RG-23 : 70% immédiat → auditeur (via AuditEscrow)
     *      RG-24 : 30% → Aave v3 (via AuditEscrow)
     *      RG-25 : statut → VALIDATED
     * @param auditId           Identifiant de l'audit
     * @param guaranteeDuration Durée de garantie en secondes
     */
    function validateAudit(
        uint256 auditId,
        uint256 guaranteeDuration
    ) external nonReentrant {
        // ============ CHECKS ============
        Audit storage audit = audits[auditId];

        //Seul l'auditeur désigné au debut de l'audit peut valider.
        if (msg.sender != audit.auditor) revert AuditRegistry__NotTheAuditor();

        //L'audit doit être en statut PENDING pour être validé. Ça évite de valider plusieurs fois le même audit ou de valider un audit déjà clôturé suite à un incident.
        if (audit.status != AuditStatus.PENDING)
            revert AuditRegistry__InvalidStatus();

        /* A VALIDER
       if (guaranteeDuration < 90 days)
            revert AuditRegistry__GuaranteeTooShort();
        */
        // ============ EFFECTS ============
        audit.status = AuditStatus.VALIDATED;
        audit.guaranteeEnd = uint40(block.timestamp + guaranteeDuration);

        hasPendingAudit[audit.requester][audit.auditor] = false;

        uint256 tokenId = reputationBadge.tokenIdOf(audit.auditor);
        uint256 guarantee = (audit.amount * 30) / 100;

        emit AuditValidated(
            auditId,
            audit.auditor,
            audit.guaranteeEnd,
            audit.amount - guarantee
        );

        // ============ INTERACTIONS ============
        reputationBadge.incAudits(tokenId, guarantee);

        AuditEscrow(escrowAddress).lockFunds(
            auditId,
            audit.auditor,
            audit.requester,
            audit.amount
        );
    }

    /**
     * @notice Permet au requester de récupérer ses fonds si l'auditeur
     *         n'a pas répondu dans les 10 jours suivant le dépôt
     * @dev Pas d'annulation volontaire - uniquement après expiration du timeout
     * @param auditId Identifiant de l'audit
     */
    function claimRefundAfterTimeout(uint256 auditId) external {
        // ============ CHECKS ============
        Audit storage audit = audits[auditId];

        if (msg.sender != audit.requester)
            revert AuditRegistry__NotTheRequester();
        if (audit.status != AuditStatus.PENDING)
            revert AuditRegistry__AuditNotPending();
        if (block.timestamp < audit.depositedAt + VALIDATION_TIMEOUT)
            revert AuditRegistry__ValidationTimeout();

        // ============ EFFECTS ============
        audit.status = AuditStatus.CLOSED;
        hasPendingAudit[audit.requester][audit.auditor] = false;

        uint256 refundAmount = audit.amount;

        emit RefundClaimed(auditId, audit.requester, refundAmount);

        // ============ INTERACTIONS ============
        AuditEscrow(escrowAddress).refund(
            auditId,
            audit.requester,
            refundAmount
        );
    }

    // =========================================================================
    // Phase 6a : Signalement exploit
    // =========================================================================

    /**
     * @notice Signale un exploit pendant la période de garantie. Seul le demandeur peut le faire et un seul exploit peut être signalé par audit.
     * @dev RG-40 : seul le requester peut signaler
     *      RG-41 : uniquement pendant le timelock
     *      RG-42 : 1 seul incident par audit
     * @param auditId    Identifiant de l'audit
     * @param preuvesCID CID IPFS des preuves (optionnel : bytes32(0) si absent)
     */
    function reportExploit(uint256 auditId, string calldata preuvesCID) external {
        // ============ CHECKS ============
        Audit storage audit = audits[auditId];

        if (msg.sender != audit.requester)
            revert AuditRegistry__NotTheRequester();
        if (block.timestamp > audit.guaranteeEnd)
            revert AuditRegistry__GuaranteeExpired();
        if (IDaoVoting(daoVotingAddress).hasIncident(auditId))
            revert AuditRegistry__IncidentAlreadyExists();

        // ============ EFFECTS ============
        emit ExploitReported(auditId, msg.sender, preuvesCID);

        // ============ INTERACTIONS ============
        IDaoVoting(daoVotingAddress).createIncident(
            auditId,
            msg.sender,
            preuvesCID
        );
    }

    // =========================================================================
    // Callback DAOVoting : résolution d'incident
    // =========================================================================

    /**
     * @notice Appelé par DAOVoting quand le quorum est atteint
     * @dev Seul DAOVoting peut appeler cette fonction
     *      Exploit validé → pénalité score auditeur
     *      Exploit rejeté → aucun effet sur le score
     * @param auditId   Identifiant de l'audit
     * @param validated true = exploit validé | false = exploit rejeté
     */
    function resolveIncident(uint256 auditId, bool validated) external {
        // ============ CHECKS ============
        if (msg.sender != daoVotingAddress)
            revert AuditRegistry__NotDAOVoting();

        // ============ EFFECTS ============
        Audit storage audit = audits[auditId];
        audit.status = AuditStatus.CLOSED;
        if (validated) audit.exploitValidated = true;

        emit IncidentResolved(auditId, validated);

        // ============ INTERACTIONS ============
        if (validated) {
            uint256 tokenId = reputationBadge.tokenIdOf(audit.auditor);
            uint256 guarantee = (audit.amount * 30) / 100;
            reputationBadge.incExploits(tokenId, guarantee);
        }
    }

    // =========================================================================
    // Phase 5b : Récupération des fonds par l'auditeur (pull payment)
    // =========================================================================

    /**
     * @notice L'auditeur récupère son paiement immédiat (70%) après validation.
     * @dev Vérifie les conditions ici (status, identité) puis ordonne le transfert à AuditEscrow.
     *      AuditEscrow ne fait confiance qu'à cette registry : il exécute sans reposer les checks.
     * @param auditId Identifiant de l'audit
     */
    function claimPayment(uint256 auditId) external nonReentrant {
        Audit storage audit = audits[auditId];
        if (msg.sender != audit.auditor) revert AuditRegistry__NotTheAuditor();
        if (audit.status != AuditStatus.VALIDATED) revert AuditRegistry__AuditNotValidated();

        AuditEscrow(escrowAddress).releasePayment(auditId, msg.sender);
    }

    /**
     * @notice L'auditeur récupère sa retenue de garantie (30%) après la fin de la période de garantie.
     * @dev C'est ici que le délai est vérifié : AuditEscrow ne connaît pas guaranteeEnd.
     * @param auditId Identifiant de l'audit
     */
    function claimGuarantee(uint256 auditId) external nonReentrant {
        Audit storage audit = audits[auditId];
        if (msg.sender != audit.auditor) revert AuditRegistry__NotTheAuditor();

        if (audit.status == AuditStatus.VALIDATED) {
            // Chemin normal : attendre la fin de la période de garantie
            if (block.timestamp < audit.guaranteeEnd) revert AuditRegistry__GuaranteeNotExpired();
        } else if (audit.status == AuditStatus.CLOSED && !audit.exploitValidated) {
            // Exploit rejeté par la DAO : l'auditeur récupère sa garantie sans délai supplémentaire
        } else {
            // Audit PENDING, ou CLOSED avec exploit validé (garantie réservée au requester)
            revert AuditRegistry__AuditNotValidated();
        }

        AuditEscrow(escrowAddress).releaseGuarantee(auditId, msg.sender);
    }

    /**
     * @notice Le demandeur récupère la retenue de garantie (30%) après validation d'un exploit par la DAO.
     * @dev AuditEscrow.releaseGuarantee() accepte un paramètre `to` : on lui passe le demandeur plutôt que l'auditeur.
     *      Le délai n'est pas vérifié ici : l'exploit a déjà été signalé et résolu, l'audit est CLOSED.
     * @param auditId Identifiant de l'audit
     */
    function claimGuaranteeAfterExploit(uint256 auditId) external nonReentrant {
        Audit storage audit = audits[auditId];
        if (msg.sender != audit.requester)     revert AuditRegistry__NotTheRequester();
        if (audit.status != AuditStatus.CLOSED) revert AuditRegistry__AuditNotClosed();
        if (!audit.exploitValidated)            revert AuditRegistry__ExploitNotValidated();

        uint256 guaranteeAmount = (audit.amount * 30) / 100;
        emit GuaranteeClaimedByRequester(auditId, msg.sender, guaranteeAmount);

        AuditEscrow(escrowAddress).releaseGuarantee(auditId, msg.sender);
    }

    /** @notice Émis quand l'auditeur renseigne l'adresse du contrat après déploiement */
    event AuditedContractAddressSet(
        uint256 indexed auditId,
        address indexed contractAddress
    );

    /**
     * @notice Permet à l'auditeur de renseigner l'adresse du contrat audité après son déploiement.
     * @dev L'auditeur est le seul autorisé : il vérifie que le code déployé correspond
     *      bien à ce qu'il a audité avant de fournir l'adresse.
     *      Ne peut être appelé qu'une seule fois : l'adresse ne peut pas être modifiée une fois définie.
     * @param auditId         Identifiant de l'audit
     * @param contractAddress Adresse du contrat maintenant déployé on-chain
     */
    function setAuditedContractAddress(uint256 auditId, address contractAddress) external {
        if (contractAddress == address(0)) revert AuditRegistry__ZeroAddress();
        Audit storage audit = audits[auditId];
        if (msg.sender != audit.auditor)                revert AuditRegistry__NotTheAuditor();
        if (audit.auditedContractAddress != address(0)) revert AuditRegistry__ContractAddressAlreadySet();

        audit.auditedContractAddress = contractAddress;
        emit AuditedContractAddressSet(auditId, contractAddress);
    }

    /**
     * @notice Retourne les données complètes d'un audit par son ID
     * @dev Retourne une struct memory : Viem expose les champs par nom (pas un tuple indexé)
     * @param auditId Identifiant de l'audit
     * @return Audit correspondant à cet ID
     */
    function getAudit(uint256 auditId) external view returns (Audit memory) {
        return audits[auditId];
    }
}

// =========================================================================
// Interfaces minimales
// =========================================================================

interface IDaoVoting {
    function hasIncident(uint256 auditId) external view returns (bool);
    function createIncident(
        uint256 auditId,
        address reporter,
        string calldata preuvesCID
    ) external;
}
