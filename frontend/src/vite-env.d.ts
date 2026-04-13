/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REOWN_PROJECT_ID: string;
  readonly VITE_AUDIT_REGISTRY_ADDRESS: string;
  readonly VITE_AUDIT_ESCROW_ADDRESS: string;
  readonly VITE_REPUTATION_BADGE_ADDRESS: string;
  readonly VITE_USDC_ADDRESS: string;
  readonly VITE_DEPLOY_BLOCK: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Déclaration des web components Reown AppKit pour JSX
declare namespace JSX {
  interface IntrinsicElements {
    "appkit-button": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & { balance?: "show" | "hide" },
      HTMLElement
    >;
    "appkit-network-button": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    >;
    "appkit-account-button": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    >;
  }
}
