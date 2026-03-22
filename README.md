# AuditRegistry

> Protocole décentralisé de certification et de réputation pour les audits de smart contracts.

Projet de certification — Alyra · Promotion Gladys West · Avril 2026

---

## Présentation

AuditRegistry met en relation des demandeurs d'audit et des auditeurs certifiés. Les paiements sont sécurisés via un escrow on-chain avec intégration Aave v3, et chaque auditeur dispose d'un NFT soul-bound (ReputationBadge) dont le score évolue au fil de ses audits.

---



## Flux nominal

```
1. Découverte    →  Le demandeur consulte le classement des auditeurs
2. Négociation   →  Accord off-chain sur le périmètre et le montant
3. Réalisation   →  L'auditeur réalise l'audit (off-chain)
4. Dépôt         →  Le demandeur dépose le montant + rapport (CID IPFS)
5. Validation    →  L'auditeur valide
6b. Claim        →  À expiration du timelock
```

En cas d'exploit signalé pendant le timelock (phase 6a), la DAO vote (quorum 3/5 en 7 jours). Si validé : remboursement au demandeur + pénalité de score pour l'auditeur.

---
