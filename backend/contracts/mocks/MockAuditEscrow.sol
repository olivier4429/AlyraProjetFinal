// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockAuditEscrow
 * @notice enregistre les appels pour vérification dans les tests
 */
contract MockAuditEscrow {

    // =========================================================================
    // Structures pour enregistrer les appels
    // =========================================================================

    struct LockCall {
        uint256 auditId;
        address auditor;
        address requester;
        uint256 amount;
    }

    struct RefundCall {
        uint256 auditId;
        address requester;
        uint256 amount;
    }

    // =========================================================================
    // Storage
    // =========================================================================

    /** @notice Token USDC — nécessaire pour les remboursements */
    IERC20 public immutable usdc;

    /** @notice Historique des appels lockFunds */
    LockCall[] public lockCalls;

    /** @notice Historique des appels refund */
    RefundCall[] public refundCalls;

    // =========================================================================
    // Constructor
    // =========================================================================

    constructor(address usdc_) {
        usdc = IERC20(usdc_);
    }

    // =========================================================================
    // Fonctions de l'interface IAuditEscrow
    // =========================================================================

    /**
     * @notice Enregistre l'appel lockFunds sans logique réelle
     * @dev Dans le vrai AuditEscrow, cette fonction gère la ventilation 70/30 + Aave
     */
    function lockFunds(
        uint256 auditId,
        address auditor,
        address requester,
        uint256 amount
    ) external {
        lockCalls.push(LockCall(auditId, auditor, requester, amount));
    }

    /**
     * @notice Enregistre l'appel et transfère les USDC au requester
     * @dev Le MockAuditEscrow doit avoir des USDC pour pouvoir rembourser
     */
    function refund(
        uint256 auditId,
        address requester,
        uint256 amount
    ) external {
        refundCalls.push(RefundCall(auditId, requester, amount));
        usdc.transfer(requester, amount);
    }

    // =========================================================================
    // Fonctions utilitaires pour les tests
    // =========================================================================

    /** @notice Retourne le nombre d'appels lockFunds enregistrés */
    function getLockCallsCount() external view returns (uint256) {
        return lockCalls.length;
    }

    /** @notice Retourne le nombre d'appels refund enregistrés */
    function getRefundCallsCount() external view returns (uint256) {
        return refundCalls.length;
    }

    /** @notice Retourne le dernier appel lockFunds */
    function getLastLockCall() external view returns (LockCall memory) {
        return lockCalls[lockCalls.length - 1];
    }

    /** @notice Retourne le dernier appel refund */
    function getLastRefundCall() external view returns (RefundCall memory) {
        return refundCalls[refundCalls.length - 1];
    }

    /** @notice Retourne un appel lockFunds par index */
    function getLockCall(uint256 index) external view returns (LockCall memory) {
        return lockCalls[index];
    }

    /** @notice Retourne un appel refund par index */
    function getRefundCall(uint256 index) external view returns (RefundCall memory) {
        return refundCalls[index];
    }
}
