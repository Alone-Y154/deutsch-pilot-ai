import { cn } from "@/lib/utils";

const toneStyles = {
  teal: "border-teal-200 bg-teal-50 text-teal-900",
  amber: "border-amber-200 bg-amber-50 text-amber-950",
  rose: "border-rose-200 bg-rose-50 text-rose-950",
  blue: "border-sky-200 bg-sky-50 text-sky-950",
};

export function MetricCard({
  label,
  value,
  tone,
  detail,
}: {
  label: string;
  value: string;
  tone: keyof typeof toneStyles;
  detail?: string;
}) {
  return (
    <div className={cn("rounded-lg border p-4", toneStyles[tone])}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-normal">{value}</p>
      {detail ? <p className="mt-2 text-xs leading-5 opacity-80">{detail}</p> : null}
    </div>
  );
}
