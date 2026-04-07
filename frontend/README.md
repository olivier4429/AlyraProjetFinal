# AuditRegistry – Frontend

Interface React du protocole AuditRegistry.

**Stack :** Vite · React 19 · TypeScript · Wagmi v3 · Viem v2 · Reown AppKit · TanStack Query v5

---

## Prérequis

- Node.js ≥ 22
- Un project ID Reown → [cloud.reown.com](https://cloud.reown.com)

---

## Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer les variables d'environnement
cp .env.example .env
# Ouvrir .env et renseigner VITE_REOWN_PROJECT_ID

# 3. Lancer le serveur de développement
npm run dev
```

---

## Développement local avec Hardhat

Pour tester l'interface contre des contrats réels en local, utiliser le script de seed du backend.

**Terminal 1 — nœud Hardhat local**

```bash
cd ../backend
npx hardhat node
```

**Terminal 2 — déploiement + données de test**

```bash
cd ../backend
npx hardhat run scripts/seed.ts --network localhost
```

Le script déploie tous les contrats, inscrit 4 auditeurs de test et met à jour automatiquement `src/constants/contracts.ts` avec les adresses déployées.

**Terminal 3 — frontend**

```bash
npm run dev
```

> Configurer Metamask (ou autre wallet) sur le réseau `localhost:8545`, Chain ID `31337`.

Le projet est accessible sur [http://localhost:5173](http://localhost:5173)

---

## Commandes disponibles

```bash
# Développement (hot reload)
npm run dev

# Build de production
npm run build

# Prévisualiser le build de production
npm run preview
```

---

## Variables d'environnement

| Variable | Description | Obligatoire |
|---|---|---|
| `VITE_REOWN_PROJECT_ID` | Project ID obtenu sur [cloud.reown.com](https://cloud.reown.com) | ✅ |

---

## Structure du projet

```
src/
├── appkitConfig.ts   # Configuration Reown AppKit + WagmiAdapter
├── main.tsx          # Point d'entrée : WagmiProvider + QueryClientProvider
├── App.tsx           # Composant racine
├── index.css         # Styles globaux
└── vite-env.d.ts     # Types Vite + déclaration des web components AppKit
```

---

## Architecture de la connexion wallet

```
Reown AppKit (createAppKit)
  └── WagmiAdapter
        └── wagmiConfig  →  <WagmiProvider>
                                └── <QueryClientProvider>   (TanStack Query)
                                      └── <App />
```

Les hooks Wagmi (`useAccount`, `useReadContract`, `useWriteContract`…) sont disponibles dans tous les composants enfants de `<WagmiProvider>`.

Les boutons de connexion sont des web components Reown (`<appkit-button />`, `<appkit-network-button />`) utilisables directement dans le JSX.

---

## Déploiement sur Vercel

```bash
# Depuis la racine du repo
vercel --cwd frontend

# Ajouter la variable d'environnement dans Vercel :
# VITE_REOWN_PROJECT_ID = <votre project ID>
```
