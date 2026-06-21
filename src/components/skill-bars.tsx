import { skillScores } from "@/lib/curriculum";

type SkillBar = {
  skill: string;
  score: number;
  detail: string;
};

export function SkillBars({ scores = skillScores }: { scores?: SkillBar[] }) {
  return (
    <div className="space-y-4">
      {scores.map((item) => (
        <div key={item.skill}>
          <div className="mb-1 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{item.skill}</p>
              <p className="text-xs text-neutral-500">{item.detail}</p>
            </div>
            <span className="text-sm font-semibold text-neutral-700">{item.score}%</span>
          </div>
          <div className="h-2 rounded-full bg-neutral-200">
            <div
              className="h-2 rounded-full bg-teal-700"
              style={{ width: `${item.score}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
