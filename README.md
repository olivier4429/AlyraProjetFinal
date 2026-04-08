# AuditRegistry

**Smart Contract Audit Reputation System**  
Alyra – Promotion Gladys West · Avril 2026

---

## Présentation

AuditRegistry est un protocole décentralisé qui crée un registre on-chain des audits de smart contracts. Il met en relation des demandeurs d'audit et des auditeurs certifiés, sécurise les paiements via un escrow intégrant Aave v3 pour générer du yield, et maintient un score de réputation on-chain pour chaque auditeur via un NFT soul-bound non transférable (EIP-5192).

---

## Problème adressé

Il est difficile pour un utilisateur de smart contract d'évaluer le niveau de sécurité d'un protocole : a-t-il été audité ? Par qui ? Avec quelle garantie ? AuditRegistry répond à ce besoin en rendant l'historique des audits public, immuable et vérifiable on-chain.

---

## Acteurs

| Acteur | Rôle |
|---|---|
| **Demandeur** | Dépose le paiement + rapport d'audit (CID IPFS), peut signaler un exploit |
| **Auditeur** | Inscrit sur la plateforme, valide le rapport, réclame sa garantie |
| **DAO / Validateurs** | Auditeurs accrédités votant sur les incidents (quorum 3/5) |
| **Treasury** | Contrat recevant automatiquement les frais du protocole (Owner-only) |
| **Aave v3** | Protocole externe générant du yield sur les fonds en garantie |

---

## Flux fonctionnels

### Cas nominal (sans exploit)

1. **Découverte** – Le demandeur consulte la DApp et choisit un auditeur selon son score et son NFT
2. **Négociation** – Accord off-chain sur le périmètre et le montant
3. **Réalisation** – L'auditeur réalise l'audit (off-chain), itérations jusqu'à validation
4. **Dépôt** (on-chain) – Le demandeur dépose le montant total + le CID du rapport vers l'Escrow
5. **Validation** (on-chain) – L'auditeur confirme : 70% lui sont versés immédiatement, 30% déposés sur Aave v3
6. **Claim** (on-chain) – À expiration du timelock, l'auditeur récupère les 30% + 2/3 du yield Aave

### Cas exploit (phase 6a)

- Le demandeur signale un exploit pendant le timelock → création d'un incident DAO
- Vote des auditeurs accrédités (quorum 3 sur 5, fenêtre 7 jours)
- **Exploit validé** : 30% capital + 2/3 yield → demandeur ; 1/3 yield → Treasury ; score auditeur dégradé
- **Exploit rejeté** : escrow conservé, `claimGuarantee()` reste disponible pour l'auditeur

### Autres flux

- **Refus auditeur (5b)** : l'auditeur refuse le rapport déposé → remboursement 95% au demandeur
- **Non-validation sous 10 jours (5c)** : le demandeur peut récupérer son dépôt

---

## Modèle économique

Exemple sur un audit de 10 USDC :

```
Dépôt initial : 10 USDC
├── 5%  → Treasury (immédiat)          = 0,50 USDC
└── 95% → Escrow                       = 9,50 USDC
    ├── 70% → Auditeur (à validation)  = 6,65 USDC
    └── 30% → Aave v3 (timelock)       = 2,85 USDC

À expiration :
  CAS NORMAL  → 2,85 USDC + 2/3 yield → Auditeur | 1/3 yield → Treasury
  CAS EXPLOIT → 2,85 USDC + 2/3 yield → Demandeur | 1/3 yield → Treasury
```

---

## Architecture des smart contracts

| Contrat | Responsabilité | Dépendances |
|---|---|---|
| `AuditRegistry.sol` | Contrat principal : gestion des audits, des auditeurs, orchestration | OZ: Ownable, AccessControl, ReentrancyGuard |
| `AuditEscrow.sol` | Gestion des fonds : dépôt, ventilation 70/30, intégration Aave v3 | Aave v3: IPool, IAToken ; OZ: ReentrancyGuard |
| `ReputationBadge.sol` | NFT ERC-721 soul-bound (EIP-5192), 1 par auditeur, metadata dynamiques | OZ: ERC721, EIP-4906 |
| `DAOVoting.sol` | Vote sur les incidents, calcul du quorum 3/5 | OZ: AccessControl |
| `Treasury.sol` | Réception et conservation des frais du protocole | OZ: Ownable |

---

## NFT ReputationBadge

- Standard **ERC-721** + **EIP-5192** (soul-bound) + **EIP-4906** (metadata dynamiques)
- Émis à l'inscription de l'auditeur, jamais transférable, jamais brûlé
- Metadata on-chain : `reputationScore`, `totalAudits`, `totalExploits`, `registrationDate`, `isActive`
- Sert de ticket d'entrée pour voter dans la DAO (`isActive == true` requis)

---

## Calcul du score de réputation

Le score est un `uint256` stocké dans la struct `Auditor`. Plancher : 0. Pas de plafond.

**Bonus (après `claimGuarantee()` sans exploit) :**

```
Bonus = log10(garantie_en_USDC) × 10
```

Approximation via `Math.log10()` d'OpenZeppelin (entier, pas de virgule flottante).

| Dépôt | Garantie (30%) | log10 | Bonus |
|---|---|---|---|
| 100 USDC | 30 USDC | 1 | +10 pts |
| 334 USDC | 100 USDC | 2 | +20 pts |
| 1 000 USDC | 300 USDC | 2 | +20 pts |
| 3 340 USDC | 1 000 USDC | 3 | +30 pts |

**Pénalité** : décrémentation proportionnelle si exploit validé par la DAO.

---

## Stockage des données

| Type | Quoi | Où |
|---|---|---|
| **On-chain (storage)** | Structs `Auditor`, `Audit`, `EscrowInfo`, `Incident`, `hasVoted`, compteurs | Smart contracts |
| **Events Solidity** | Nom/spécialités auditeur, historique audits, votes, scores — indexés par la DApp | RPC listener / The Graph |
| **IPFS (Pinata)** | Rapports d'audit PDF (500 Ko – 5 Mo), preuves d'exploit — seul le CID est on-chain | Pinata (pin permanent) |
| **Off-chain (DApp)** | Classement, taux sans exploit, yield Aave accumulé, progression timelock | Calculé à la volée |

---

## Démarrage rapide

### Tests backend

```bash
cd backend
npm install
npx hardhat test
```

### Développement local (frontend + contrats)

**Terminal 1 — nœud Hardhat**

```bash
cd backend
npx hardhat node
```

**Terminal 2 — déploiement + seed**

```bash
cd backend
npx hardhat run scripts/seed.ts --network localhost
```

Déploie tous les contrats, inscrit 4 auditeurs de test et met à jour automatiquement `frontend/src/constants/contracts.ts`.

**Terminal 3 — frontend**

```bash
cd frontend
npm install
cp .env.example .env   # renseigner VITE_REOWN_PROJECT_ID
npm run dev
```

### Déploiement sur Sepolia

```bash
# Créer backend/.env avec PRIVATE_KEY et SEPOLIA_RPC_URL
cd backend
npx hardhat run scripts/seed.ts --network sepolia
```

---

## Stack technique

**Backend / Blockchain**
- Solidity 0.8.28, Hardhat 3, TypeScript
- OpenZeppelin v5, Aave v3 (Sepolia : `0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951`)
- Tests : Viem + `node:test`, couverture cible > 90%
- Réseau de test : **Sepolia** | Cible : Ethereum Mainnet (Base à évaluer)

**Frontend**
- React + TypeScript
- Wagmi v2 + RainbowKit v2 (connexion wallet)
- Viem (appels contracts)
- IPFS via Pinata (stockage rapports)
- Déploiement : GitHub + Vercel

---

## Règles de gestion clés

- Un auditeur ne peut s'inscrire qu'une seule fois par adresse (RG-01)
- Un seul audit actif par paire demandeur/auditeur (RG-14)
- La durée de garantie minimum est de 3 mois (RG-22)
- Les 5% de frais sont prélevés immédiatement et ne sont pas remboursables même en cas de refus
- Pattern **pull payment** pour les versements (pas de push automatique)
- L'auditeur mis en cause ne peut pas voter sur son propre incident (RG-44)
- Un incident sans quorum après 7 jours expire : `claimGuarantee()` est débloqué pour l'auditeur (RG-49)

---

## Glossaire rapide

| Terme | Définition |
|---|---|
| **Escrow** | Séquestre – fonds bloqués par le smart contract jusqu'à condition remplie |
| **Timelock** | Période de blocage définie lors de la validation (min. 3 mois) |
| **aToken** | Token Aave représentant un dépôt + intérêts accumulés (ex : aUSDC) |
| **Soul-bound NFT** | NFT non transférable lié à une adresse wallet (EIP-5192) |
| **CID** | Content Identifier – identifiant unique d'un fichier IPFS |
| **Quorum** | Nombre minimum de votes requis (3/5 pour la DAO AuditRegistry) |
| **Pull Payment** | Pattern de sécurité : le destinataire retire ses fonds lui-même |
| **Yield** | Intérêts générés par un dépôt sur Aave v3 |
