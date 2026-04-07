interface ScoreBarProps {
  score: number;
  maxScore?: number;
  showLabel?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 900) return "#34D399";
  if (score >= 700) return "#3B82F6";
  if (score >= 500) return "#F59E0B";
  return "#FB7185";
}

export default function ScoreBar({
  score,
  maxScore = 1000,
  showLabel = true,
}: ScoreBarProps) {
  const percentage = Math.min(100, (score / maxScore) * 100);
  const color = getScoreColor(score);

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-gray-400 font-mono">Score</span>
          <span className="text-sm font-bold font-mono" style={{ color }}>
            {score}
          </span>
        </div>
      )}
      <div className="bg-[#1F2937] rounded-full h-1.5 w-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
