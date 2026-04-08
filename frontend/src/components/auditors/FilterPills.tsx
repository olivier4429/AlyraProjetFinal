import { SPECIALTIES } from "../../constants/config";
import type { Specialty } from "../../types";

interface FilterPillsProps {
  active: Specialty | null;
  onChange: (specialty: Specialty | null) => void;
}

export default function FilterPills({ active, onChange }: FilterPillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange(null)}
        className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors cursor-pointer ${
          active === null
            ? "bg-blue-500 border-blue-500 text-white"
            : "bg-[#1F2937] border-[#374151] text-gray-300 hover:border-[#4B5563] hover:text-white"
        }`}
      >
        Tous
      </button>
      {SPECIALTIES.map((specialty) => (
        <button
          key={specialty}
          onClick={() => onChange(specialty === active ? null : specialty)}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors cursor-pointer ${
            active === specialty
              ? "bg-blue-500 border-blue-500 text-white"
              : "bg-[#1F2937] border-[#374151] text-gray-300 hover:border-[#4B5563] hover:text-white"
          }`}
        >
          {specialty}
        </button>
      ))}
    </div>
  );
}
