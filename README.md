# AuditRegistry

**Registre on-chain des audits de smart contracts**  
Alyra – Promotion Gladys West · Avril 2026

---


AuditRegistry est un protocole décentralisé qui crée un registre on-chain des audits de smart contracts. Il met en relation des demandeurs d'audit et des auditeurs certifiés, sécurise les paiements via un escrow intégrant Aave v3 pour générer du yield, et maintient un score de réputation on-chain pour chaque auditeur via un NFT soul-bound non transférable (EIP-5192).

---

## Problème adressé

Il est difficile pour un utilisateur de smart contract d'évaluer le niveau de sécurité d'un protocole : a-t-il été audité ? Par qui ? Avec quelle garantie ? AuditRegistry répond à ce besoin en rendant l'historique des audits public, immuable et vérifiable on-chain.


---

## Acteurs

| Acteur | Rôle |
|---|---|
| **Demandeur** | Dépose le paiement + CID du rapport IPFS, peut signaler un exploit |
| **Auditeur** | S'inscrit, valide les audits, réclame ses paiements |
| **DAO** | Vote sur les incidents signalés par les demandeurs |
| **Treasury** | Reçoit automatiquement les frais de protocole (5 %) |

---

## Flux fonctionnels

### Cas nominal

1. **Dépôt** – Le demandeur appelle `depositAudit()` : 5 % vont à la Treasury, 95 % sont placés en escrow
2. **Validation** – L'auditeur appelle `validateAudit()` dans les 10 jours ; la durée de garantie (fixée par le demandeur au dépôt) démarre
3. **Paiement immédiat** – L'auditeur réclame ses 70 % via `claimPayment()`, sans délai
4. **Retenue de garantie** – À expiration de la période de garantie, l'auditeur réclame ses 30 % via `claimGuarantee()`

### Timeout (pas de validation sous 10 jours)

Le demandeur peut récupérer ses 95 % via `claimRefundAfterTimeout()`.

### Exploit signalé pendant la garantie

1. Le demandeur appelle `reportExploit()` => incident créé dans DAOVoting
2. La DAO vote dans `MockDAOVoting`, qui appelle `resolveIncident()` sur `AuditRegistry` une fois le quorum atteint
   - **Exploit validé** : les 30 % de garantie vont au demandeur (`claimGuaranteeAfterExploit()`)
   - **Exploit rejeté** : l'auditeur conserve sa garantie (`claimGuarantee()` reste disponible)

---

## Modèle économique

Exemple sur 100 USDC :

```
Dépôt : 100 USDC
├── 5 USDC  => Treasury (frais immédiat)
└── 95 USDC => Escrow
    ├── 66,50 USDC (70 %) => Auditeur, dès la validation
    └── 28,50 USDC (30 %) => Auditeur, après la période de garantie
```

---

## Score de réputation

À chaque `validateAudit()`, le score de l'auditeur est incrémenté :

```
Bonus = log10(garantie_en_USDC) × 10
```

Si un exploit est ensuite validé par la DAO (`resolveIncident(true)`), le même calcul est appliqué en pénalité (le score ne descend pas en dessous de 0).

---

## Diagrammes

![Flux de séquence](docs/sequence.svg)

- [Flux de séquence – source PlantUML](docs/sequence.puml)
- [Cas d'utilisation – source PlantUML](docs/usecases.puml)

---

## Démarrage rapide

Voir [backend/README.md](backend/README.md) et [frontend/README.md](frontend/README.md).

```bash
# Terminal 1 – nœud local
cd backend && npx hardhat node

# Terminal 2 – déploiement + seed
cd backend && npx hardhat run scripts/deployAllAndSeed.ts --network localhost

# Terminal 3 – frontend
cd frontend && npm run dev
```

---

## Ce qui reste à faire

### Contrats

| Fonctionnalité | État |
|---|---|
| Intégration Aave v3 (yield sur la garantie) | Non implémenté – `AuditEscrow` fait un transfert USDC direct |
| `DAOVoting.sol` de production | Mock uniquement – pas de vrai système de vote |
| `Treasury.sol` de production | Mock uniquement |
| USDC mainnet / Sepolia réel | Mock uniquement |

### Frontend

| Fonctionnalité | État |
|---|---|
| Page demandeur : remboursement après timeout (`claimRefundAfterTimeout`) | Manquant |
| Page demandeur : signalement d'exploit (`reportExploit`) | Manquant |
| Page demandeur : récupérer la garantie après exploit validé (`claimGuaranteeAfterExploit`) | Manquant |
| Interface de vote DAO (`resolveIncident`) | Manquant |
| Upload IPFS intégré (Pinata) | Manquant – le CID est saisi manuellement |

---

## Stack

**Backend :** Solidity 0.8.28 · Hardhat 3 · TypeScript · OpenZeppelin v5  
**Frontend :** React 19 · TypeScript · Vite · Wagmi v3 · Viem · Reown AppKit · TailwindCSS  
**Stockage rapports :** IPFS via Pinata (seul le CID est on-chain)  
**Déploiement :** Sepolia testnet · Vercel (frontend)
