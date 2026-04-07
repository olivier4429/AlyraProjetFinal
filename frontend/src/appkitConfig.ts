import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { sepolia, hardhat } from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";

// Récupéré sur https://cloud.reown.com
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID;

if (!projectId) {
  throw new Error(
    "VITE_REOWN_PROJECT_ID manquant. Copiez .env.example vers .env et renseignez votre project ID."
  );
}
//pour forcer à la compilation que le tableau contient au moins un réseau, on utilise une tuple avec un élément obligatoire suivi de zéro ou plusieurs éléments optionnels
//c'est une obligation de reown qui veut qu'il y ait au moins un réseau dans la configuration.
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [sepolia, hardhat];

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: "AuditRegistry",
    description: "Smart Contract Audit Reputation System",
    url: window.location.origin,
    icons: [],
  },
  features: {
    analytics: false,
  },
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
