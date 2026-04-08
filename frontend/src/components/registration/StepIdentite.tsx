import { useState } from "react";
import { SPECIALTIES } from "../../constants/config";
import type { Specialty } from "../../types";
import Badge, { getVariantForSpecialty } from "../ui/Badge";
import Alert from "../ui/Alert";

interface StepIdentiteProps {
  pseudo: string;
  selectedSpecialties: Specialty[];
  onPseudoChange: (value: string) => void;
  onSpecialtiesChange: (value: Specialty[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepIdentite({
  pseudo,
  selectedSpecialties,
  onPseudoChange,
  onSpecialtiesChange,
  onNext,
  onBack,
}: StepIdentiteProps) {
  const [pseudoError, setPseudoError] = useState("");

  const toggleSpecialty = (specialty: Specialty) => {
    if (selectedSpecialties.includes(specialty)) {
      onSpecialtiesChange(selectedSpecialties.filter((s) => s !== specialty));
    } else if (selectedSpecialties.length < 10) {
      onSpecialtiesChange([...selectedSpecialties, specialty]);
    }
  };

  const handleNext = () => {
    if (pseudo.trim().length < 2) {
      setPseudoError("Le pseudo doit contenir au moins 2 caractères.");
      return;
    }
    if (pseudo.trim().length > 32) {
      setPseudoError("Le pseudo ne peut pas dépasser 32 caractères.");
      return;
    }
    if (selectedSpecialties.length === 0) {
      setPseudoError("Sélectionnez au moins une spécialité.");
      return;
    }
    setPseudoError("");
    onNext();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-2">Votre identité</h2>
        <p className="text-gray-400 text-sm">
          Choisissez un pseudo et vos domaines d'expertise.
        </p>
      </div>

      {/* Pseudo input */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-300">
          Pseudo <span className="text-rose-400">*</span>
        </label>
        <input
          type="text"
          value={pseudo}
          onChange={(e) => {
            onPseudoChange(e.target.value);
            setPseudoError("");
          }}
          placeholder="ex: Alice Xu"
          maxLength={32}
          className="w-full bg-[#1F2937] border border-[#374151] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors font-mono"
        />
        <div className="flex justify-between">
          {pseudoError ? (
            <span className="text-xs text-rose-400">{pseudoError}</span>
          ) : (
            <span className="text-xs text-gray-500">
              Nom affiché publiquement
            </span>
          )}
          <span className="text-xs text-gray-500">{pseudo.length}/32</span>
        </div>
      </div>

      {/* Specialties */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-gray-300">
            Spécialités <span className="text-rose-400">*</span>
          </label>
          <span
            className={`text-xs font-mono ${
              selectedSpecialties.length >= 10
                ? "text-amber-400"
                : "text-gray-500"
            }`}
          >
            {selectedSpecialties.length}/10
          </span>
        </div>

        {selectedSpecialties.length >= 10 && (
          <Alert variant="warn">Maximum 10 spécialités sélectionnées.</Alert>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SPECIALTIES.map((specialty) => {
            const isSelected = selectedSpecialties.includes(specialty);
            const isDisabled =
              !isSelected && selectedSpecialties.length >= 10;

            return (
              <label
                key={specialty}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
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
                  onChange={() => toggleSpecialty(specialty)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                    isSelected
                      ? "bg-blue-500 border-blue-500"
                      : "border-[#4B5563]"
                  }`}
                >
                  {isSelected && (
                    <svg
                      className="w-2.5 h-2.5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-semibold">{specialty}</span>
                <Badge
                  variant={getVariantForSpecialty(specialty)}
                  className="ml-auto"
                >
                  &nbsp;
                </Badge>
              </label>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="flex-1 px-6 py-3 border border-[#374151] text-gray-400 hover:text-white hover:border-[#4B5563] font-bold rounded-lg transition-colors"
        >
          ← Retour
        </button>
        <button
          onClick={handleNext}
          className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors"
        >
          Continuer →
        </button>
      </div>
    </div>
  );
}
