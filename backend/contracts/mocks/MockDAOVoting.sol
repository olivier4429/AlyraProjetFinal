// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title MockDAOVoting
 * @notice contrôle des incidents pour les tests
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
contract MockDAOVoting {

    // =========================================================================
    // Structure pour enregistrer les appels
    // =========================================================================

    struct CreateIncidentCall {
        uint256 auditId;
        address reporter;
        string preuvesCID;
    }

    // =========================================================================
    // Storage
    // =========================================================================

    /** @notice Incidents existants par auditId */
    mapping(uint256 => bool) public incidents;

    /** @notice Historique des appels createIncident */
    CreateIncidentCall[] public createIncidentCalls;

    // =========================================================================
    // Fonctions de l'interface IDaoVoting
    // =========================================================================

    /** @notice Retourne true si un incident existe pour cet auditId */
    function hasIncident(uint256 auditId) external view returns (bool) {
        return incidents[auditId];
    }

    /** @notice Crée un incident et enregistre l'appel */
    function createIncident(
        uint256 auditId,
        address reporter,
        string calldata preuvesCID
    ) external {
        incidents[auditId] = true;
        createIncidentCalls.push(CreateIncidentCall(auditId, reporter, preuvesCID));
    }

    // =========================================================================
    // Fonctions utilitaires pour les tests
    // =========================================================================

    /** @notice Retourne le nombre d'appels createIncident enregistrés */
    function getCreateIncidentCallsCount() external view returns (uint256) {
        return createIncidentCalls.length;
    }

    /** @notice Retourne le dernier appel createIncident */
    function getLastCreateIncidentCall() external view returns (CreateIncidentCall memory) {
        return createIncidentCalls[createIncidentCalls.length - 1];
    }

    /** @notice Retourne un appel createIncident par index */
    function getCreateIncidentCall(uint256 index) external view returns (CreateIncidentCall memory) {
        return createIncidentCalls[index];
    }

    /**
     * @notice Permet de simuler un incident existant sans passer par createIncident
     * @dev Utile pour tester le revert IncidentAlreadyExists directement
     */
    function setIncident(uint256 auditId, bool exists) external {
        incidents[auditId] = exists;
    }
}
