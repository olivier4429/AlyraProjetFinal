import Alert from "../ui/Alert";

interface StepConnexionProps {
  isConnected: boolean;
  onNext: () => void;
}

export default function StepConnexion({
  isConnected,
  onNext,
}: StepConnexionProps) {
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-2">
          Connectez votre wallet
        </h2>
        <p className="text-gray-400 text-sm max-w-sm">
          Pour vous inscrire comme auditeur, vous devez d'abord connecter votre
          wallet Ethereum.
        </p>
      </div>

      {isConnected ? (
        <>
          <Alert variant="success">
            Wallet connecté avec succès. Vous pouvez passer à l'étape suivante.
          </Alert>
          <button
            onClick={onNext}
            className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors"
          >
            Continuer
          </button>
        </>
      ) : (
        <>
          <Alert variant="warn">
            Aucun wallet détecté. Connectez-vous pour continuer.
          </Alert>
          <div className="flex flex-col items-center gap-3">
            <appkit-button />
            <p className="text-xs text-gray-500">
              Utilisez MetaMask, WalletConnect ou tout autre wallet compatible
            </p>
          </div>
        </>
      )}
    </div>
  );
}
