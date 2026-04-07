interface StatBoxProps {
  value: string;
  label: string;
  accentColor?: string;
}

export default function StatBox({
  value,
  label,
  accentColor = "#3B82F6",
}: StatBoxProps) {
  return (
    <div className="bg-[#111827] border border-[#374151] rounded-xl p-6 flex flex-col items-center text-center">
      <span
        className="text-3xl font-bold font-mono mb-1"
        style={{ color: accentColor }}
      >
        {value}
      </span>
      <span className="text-sm text-gray-400">{label}</span>
    </div>
  );
}
