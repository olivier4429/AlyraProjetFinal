# AuditRegistry – Backend

Contrats Solidity + tests Hardhat du protocole AuditRegistry.

**Stack :** Hardhat 3 · Solidity 0.8.28 · TypeScript · Viem · `node:test`

---

## Prérequis

- Node.js ≥ 22

---

## Installation

```bash
npm install
```

---

## Lancer les tests

```bash
# Tous les tests
npx hardhat test

# Uniquement les tests TypeScript (node:test)
npx hardhat test nodejs
```

Les tests utilisent le runner natif Node.js (`node:test`) et la bibliothèque `viem` pour les interactions on-chain.

---

## Seed — déploiement + données de test

Le script `scripts/seed.ts` déploie tous les contrats et inscrit 4 auditeurs de test.
Il met aussi à jour automatiquement `frontend/src/constants/contracts.ts` avec les adresses déployées.

### En local (réseau Hardhat)

**Terminal 1 — nœud Hardhat local**

```bash
npx hardhat node
```

**Terminal 2 — seed**

```bash
npx hardhat run scripts/seed.ts --network localhost
```

Cela déploie :

- `ReputationBadge`
- `MockUSDC`
- `MockTreasury`
- `MockAuditEscrow`
- `MockDAOVoting`
- `AuditRegistry`

Puis inscrit les 4 auditeurs de test :

| Pseudo | Spécialités |
|---|---|
| Alice Xu | DeFi, Lending, Oracle |
| Baptiste Moreau | Bridge, Layer2, DAO |
| Clara Lefèvre | NFT, DEX, Staking |
| David Renard | Governance, DeFi, Staking |

### Sur Sepolia

```bash
npx hardhat run scripts/seed.ts --network sepolia
```

Prérequis : créer un fichier `.env` à la racine du dossier `backend/` :

```env
PRIVATE_KEY=0x...          # clé privée du compte déployeur
SEPOLIA_RPC_URL=https://...  # URL RPC Sepolia (Alchemy, Infura…)
```

---

## Contrats

| Contrat | Responsabilité |
|---|---|
| `AuditRegistry.sol` | Contrat principal : inscriptions, dépôts, validations, exploits |
| `ReputationBadge.sol` | NFT ERC-721 soul-bound (EIP-5192), score de réputation |
| `mocks/MockUSDC.sol` | Token ERC-20 pour les tests |
| `mocks/MockTreasury.sol` | Contrat recevant les frais du protocole |
| `mocks/MockAuditEscrow.sol` | Escrow simplifié pour les tests |
| `mocks/MockDAOVoting.sol` | DAO simplifiée pour les tests |

---

## CI

Les tests s'exécutent automatiquement sur GitHub Actions à chaque push via `.github/workflows/test.yml`.
