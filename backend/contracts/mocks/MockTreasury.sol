// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title MockTreasury
/// @notice reçoit les frais USDC sans rien faire
contract MockTreasury {
    // Pas de logique nécessaire
    // Les transferts USDC arrivent directement via usdc.transfer()
    // Le solde est vérifiable via usdc.balanceOf(mockTreasury.address)
}