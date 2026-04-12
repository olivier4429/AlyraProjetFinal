import { useState, useCallback, useEffect } from "react";
import { useConnection } from "wagmi";
import { useNavigate } from "react-router-dom";
import type { Specialty } from "../types";
import { SPECIALTIES } from "../constants/config";
import RegistrationStepper from "../components/registration/RegistrationStepper";
import StepConnexion from "../components/registration/StepConnexion";
import StepIdentite from "../components/registration/StepIdentite";
import StepConfirmation from "../components/registration/StepConfirmation";
import Alert from "../components/ui/Alert";
import Badge, { getVariantForSpecialty } from "../components/ui/Badge";
import { useIsRegistered } from "../hooks/useReputationBadge";
import { useAuditorSpecialties } from "../hooks/useAuditorSpecialties";
import { useUpdateSpecialties } from "../hooks/useAuditRegistry";

function AuditorProfile({ address, onNavigateHome }: { address: string; onNavigateHome: () => void }) {
  const { specialties: currentSpecialties, isLoading: isLoadingSpecialties } =
    useAuditorSpecialties(address as `0x${string}`);
  const { update, isSignaturePending, isConfirming, isSuccess, error, reset } =
    useUpdateSpecialties();

  const [selected, setSelected] = useState<Specialty[]>([]);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  // Once loaded, initialise selected from current on-chain specialties
  useEffect(() => {
    if (!isLoadingSpecialties && currentSpecialties.length > 0 && !editing) {
      setSelected(currentSpecialties as Specialty[]);
    }
  }, [isLoadingSpecialties, currentSpecialties]);

  useEffect(() => {
    if (isSuccess) {
      setSaved(true);
      setEditing(false);
      reset();
      setTimeout(() => setSaved(false), 4000);
    }
  }, [isSuccess]);

  const toggleSpecialty = (s: Specialty) => {
    setSelected((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : prev.length < 10 ? [...prev, s] : prev
    );
  };

  const isLoading = isSignaturePending || isConfirming;

  return (
    <div className="max-w-lg mx-auto py-8 flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold font-display text-white mb-2">Mon profil auditeur</h1>
        <p className="text-gray-400 text-sm font-mono">{address}</p>
      </div>

      <div className="bg-[#111827] border border-[#374151] rounded-xl p-6 flex flex-col gap-5">
        <h2 className="text-lg font-bold text-white">Spécialités</h2>

        {saved && <Alert variant="info">Spécialités mises à jour avec succès.</Alert>}

        {isLoadingSpecialties ? (
          <div className="flex gap-2 flex-wrap">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-7 w-20 rounded-full bg-[#1F2937] animate-pulse" />
            ))}
          </div>
        ) : !editing ? (
          <>
            <div className="flex gap-2 flex-wrap">
              {selected.length === 0 ? (
                <span className="text-gray-500 text-sm italic">Aucune spécialité</span>
              ) : (
                selected.map((s) => (
                  <span
                    key={s}
                    className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  >
                    {s}
                  </span>
                ))
              )}
            </div>
            <div className="border-t border-[#374151] pt-4">
              <button
                onClick={() => setEditing(true)}
                className="w-full px-4 py-2.5 border border-[#374151] text-gray-400 hover:text-white hover:border-[#4B5563] font-bold rounded-lg transition-colors text-sm"
              >
                Modifier les spécialités
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Sélectionnez vos spécialités (max 10)</span>
              <span className={`text-xs font-mono ${selected.length >= 10 ? "text-amber-400" : "text-gray-500"}`}>
                {selected.length}/10
              </span>
            </div>

            {selected.length >= 10 && (
              <Alert variant="warn">Maximum 10 spécialités sélectionnées.</Alert>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SPECIALTIES.map((specialty) => {
                const isSelected = selected.includes(specialty as Specialty);
                const isDisabled = !isSelected && selected.length >= 10;
                return (
                  <label
                    key={specialty}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-500/10 border-blue-500/50 text-white"
                        : isDisabled
                        ? "bg-[#1F2937] border-[#374151] text-gray-600 cursor-not-allowed opacity-50"
                        : "bg-[#1F2937] border-[#374151] text-gray-300 hover:border-[#4B5563] hover:text-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={() => toggleSpecialty(specialty as Specialty)}
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-blue-500 border-blue-500" : "border-[#4B5563]"
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs font-semibold truncate">{specialty}</span>
                    <Badge variant={getVariantForSpecialty(specialty as Specialty)} className="ml-auto shrink-0">&nbsp;</Badge>
                  </label>
                );
              })}
            </div>

            {isSignaturePending && (
              <Alert variant="warn">
                <div className="flex items-center gap-2">
                  <span className="animate-spin inline-block w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full" />
                  Signez la transaction dans votre wallet…
                </div>
              </Alert>
            )}
            {isConfirming && <Alert variant="info">Transaction envoyée, en attente de confirmation…</Alert>}
            {error && <Alert variant="danger"><span className="text-xs">{error.message?.slice(0, 150)}</span></Alert>}

            <div className="flex gap-3">
              <button
                onClick={() => { setEditing(false); setSelected(currentSpecialties as Specialty[]); reset(); }}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 border border-[#374151] text-gray-400 hover:text-white font-bold rounded-lg transition-colors text-sm disabled:opacity-40"
              >
                Annuler
              </button>
              <button
                onClick={() => update(selected)}
                disabled={isLoading || selected.length === 0}
                className="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/30 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
              >
                {isLoading && <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />}
                {isSignaturePending ? "Signature…" : isConfirming ? "Confirmation…" : "Enregistrer"}
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onNavigateHome}
        className="text-sm text-gray-500 hover:text-white transition-colors text-center"
      >
        ← Voir les auditeurs
      </button>
    </div>
  );
}

export default function InscriptionPage() {
  const { address, isConnected } = useConnection();
  const navigate = useNavigate();

  // 
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
    return <AuditorProfile address={address!} onNavigateHome={() => navigate("/")} />;
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
