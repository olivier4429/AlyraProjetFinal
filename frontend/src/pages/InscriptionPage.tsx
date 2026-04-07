import { useState, useCallback } from "react";
import { useConnection } from "wagmi";
import { useNavigate } from "react-router-dom";
import type { Specialty } from "../types";
import RegistrationStepper from "../components/registration/RegistrationStepper";
import StepConnexion from "../components/registration/StepConnexion";
import StepIdentite from "../components/registration/StepIdentite";
import StepConfirmation from "../components/registration/StepConfirmation";
import Alert from "../components/ui/Alert";
import { useIsRegistered } from "../hooks/useReputationBadge";

export default function InscriptionPage() {
  const { address, isConnected } = useConnection();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [pseudo, setPseudo] = useState("");
  const [selectedSpecialties, setSelectedSpecialties] = useState<Specialty[]>([]);

  const { isRegistered, isLoading: isCheckingRegistration } = useIsRegistered(address);

  const handleSuccess = useCallback(() => {
    navigate("/");
  }, [navigate]);

  if (isCheckingRegistration) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="flex flex-col items-center gap-3">
          <span className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
          <span className="text-gray-400 text-sm">
            Vérification de votre inscription...
          </span>
        </div>
      </div>
    );
  }

  if (isConnected && isRegistered) {
    return (
      <div className="max-w-lg mx-auto py-12">
        <div className="bg-[#111827] border border-[#374151] rounded-xl p-8 text-center flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <span className="text-3xl">✓</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">
              Déjà inscrit
            </h2>
            <p className="text-gray-400 text-sm">
              Ce wallet est déjà enregistré comme auditeur. Chaque adresse ne
              peut posséder qu'un seul badge NFT de réputation.
            </p>
          </div>
          <Alert variant="info" className="text-left w-full">
            Adresse :{" "}
            <span className="font-mono text-xs">{address}</span>
          </Alert>
          <button
            onClick={() => navigate("/")}
            className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors"
          >
            Voir les auditeurs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-8">
      {/* Page title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold font-display text-white mb-2">
          Inscription Auditeur
        </h1>
        <p className="text-gray-400 text-sm">
          Rejoignez le registre décentralisé des auditeurs de smart contracts
        </p>
      </div>

      {/* Stepper */}
      <RegistrationStepper currentStep={currentStep} />

      {/* Step content */}
      <div className="bg-[#111827] border border-[#374151] rounded-xl p-6 sm:p-8">
        {currentStep === 1 && (
          <StepConnexion
            isConnected={isConnected}
            onNext={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 2 && (
          <StepIdentite
            pseudo={pseudo}
            selectedSpecialties={selectedSpecialties}
            onPseudoChange={setPseudo}
            onSpecialtiesChange={setSelectedSpecialties}
            onNext={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && address && (
          <StepConfirmation
            address={address}
            pseudo={pseudo}
            specialties={selectedSpecialties}
            onBack={() => setCurrentStep(2)}
            onSuccess={handleSuccess}
          />
        )}

        {currentStep === 3 && !address && (
          <Alert variant="danger">
            Wallet déconnecté. Veuillez revenir à l'étape 1.
          </Alert>
        )}
      </div>
    </div>
  );
}
