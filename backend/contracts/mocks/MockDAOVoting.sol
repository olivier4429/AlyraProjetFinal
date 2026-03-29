// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title MockDAOVoting
/// @notice contrôle des incidents pour les tests
contract MockDAOVoting {

    // =========================================================================
    // Structure pour enregistrer les appels
    // =========================================================================

    struct CreateIncidentCall {
        uint256 auditId;
        address reporter;
        bytes32 preuvesCID;
    }

    // =========================================================================
    // Storage
    // =========================================================================

    /// @notice Incidents existants par auditId
    mapping(uint256 => bool) public incidents;

    /// @notice Historique des appels createIncident
    CreateIncidentCall[] public createIncidentCalls;

    // =========================================================================
    // Fonctions de l'interface IDaoVoting
    // =========================================================================

    /// @notice Retourne true si un incident existe pour cet auditId
    function hasIncident(uint256 auditId) external view returns (bool) {
        return incidents[auditId];
    }

    /// @notice Crée un incident et enregistre l'appel
    function createIncident(
        uint256 auditId,
        address reporter,
        bytes32 preuvesCID
    ) external {
        incidents[auditId] = true;
        createIncidentCalls.push(CreateIncidentCall(auditId, reporter, preuvesCID));
    }

    // =========================================================================
    // Fonctions utilitaires pour les tests
    // =========================================================================

    /// @notice Retourne le nombre d'appels createIncident enregistrés
    function getCreateIncidentCallsCount() external view returns (uint256) {
        return createIncidentCalls.length;
    }

    /// @notice Retourne le dernier appel createIncident
    function getLastCreateIncidentCall() external view returns (CreateIncidentCall memory) {
        return createIncidentCalls[createIncidentCalls.length - 1];
    }

    /// @notice Retourne un appel createIncident par index
    function getCreateIncidentCall(uint256 index) external view returns (CreateIncidentCall memory) {
        return createIncidentCalls[index];
    }

    /// @notice Permet de simuler un incident existant sans passer par createIncident
    /// @dev Utile pour tester le revert IncidentAlreadyExists directement
    function setIncident(uint256 auditId, bool exists) external {
        incidents[auditId] = exists;
    }
}
