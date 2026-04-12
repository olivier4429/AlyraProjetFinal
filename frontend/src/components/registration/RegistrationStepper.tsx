interface Step {
  number: number;
  label: string;
}

const STEPS: Step[] = [
  { number: 1, label: "Connexion" },
  { number: 2, label: "Identité" },
  { number: 3, label: "Confirmation" },
];

export default function RegistrationStepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, index) => {
        const isCompleted = currentStep > step.number;
        const isActive = currentStep === step.number;

        return (
          <div key={step.number} className="flex items-center">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                  isCompleted
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : isActive
                    ? "bg-blue-500 border-blue-500 text-white"
                    : "bg-[#1F2937] border-[#374151] text-gray-500"
                }`}
              >
                {isCompleted ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`text-xs mt-2 font-semibold ${
                  isActive
                    ? "text-blue-400"
                    : isCompleted
                    ? "text-emerald-400"
                    : "text-gray-500"
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {index < STEPS.length - 1 && (
              <div
                className={`w-16 h-0.5 mx-2 mb-5 transition-all ${
                  currentStep > step.number ? "bg-emerald-500" : "bg-[#374151]"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
