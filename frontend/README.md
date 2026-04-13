# AuditRegistry – Frontend

Interface utilisateur du protocole AuditRegistry, permettant aux demandeurs de déposer des audits, aux auditeurs de les valider et de récupérer leurs paiements, et à tout le monde d'explorer les audits enregistrés on-chain.

## Pages

| Page | Route | Qui l'utilise |
|---|---|---|
| Auditeurs | `/` | Tout le monde – liste des auditeurs inscrits avec leur score |
| Audits | `/audits` | Tout le monde – explorer tous les audits on-chain |
| Déposer | `/depot` | Demandeur – soumettre un audit + payer en USDC |
| Valider | `/validation` | Auditeur – valider, puis réclamer paiement et garantie |
| Profil | `/inscription` | Auditeur – s'inscrire ou mettre à jour ses spécialités |

## Diagrammes

![Flux de séquence](../docs/sequence.svg)

- [Flux de séquence – source PlantUML](../docs/sequence.puml)
- [Cas d'utilisation – source PlantUML](../docs/usecases.puml)

## Lancer en local

**Prérequis :** Node.js ≥ 22, contrats déployés via le [backend](../backend/README.md).

```bash
npm install
cp .env.example .env   # renseigner VITE_REOWN_PROJECT_ID
npm run dev            # http://localhost:5173
```

Configurer le wallet (MetaMask) sur `localhost:8545`, Chain ID `31337`.

## Variables d'environnement

| Variable | Description |
|---|---|
| `VITE_REOWN_PROJECT_ID` | Project ID [cloud.reown.com](https://cloud.reown.com) |
| `VITE_AUDIT_REGISTRY_ADDRESS` | Écrit automatiquement par le script de déploiement |
| `VITE_AUDIT_ESCROW_ADDRESS` | Écrit automatiquement par le script de déploiement |
| `VITE_REPUTATION_BADGE_ADDRESS` | Écrit automatiquement par le script de déploiement |
| `VITE_USDC_ADDRESS` | Écrit automatiquement par le script de déploiement |
| `VITE_DEPLOY_BLOCK` | Écrit automatiquement – bloc de départ pour la lecture des events |

## Stack

Vite · React 19 · TypeScript · Wagmi v3 · Viem v2 · Reown AppKit · TailwindCSS
