import { clampScore } from "@/lib/utils";

export function ScoreRing({
  score,
  label,
  accent = "#0f766e",
}: {
  score: number;
  label: string;
  accent?: string;
}) {
  const normalized = clampScore(score);

  return (
    <div className="flex items-center gap-4">
      <div
        className="grid h-24 w-24 place-items-center rounded-full"
        style={{
          background: `conic-gradient(${accent} ${normalized * 3.6}deg, #e7e5e4 0deg)`,
        }}
      >
        <div className="grid h-16 w-16 place-items-center rounded-full bg-white">
          <span className="text-xl font-semibold">{normalized}</span>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {label}
        </p>
        <p className="mt-1 text-sm text-neutral-700">Adaptive practice target</p>
      </div>
    </div>
  );
}
