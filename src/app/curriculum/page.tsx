import { AppShell } from "@/components/app-shell";
import { CurriculumMapClient } from "@/components/curriculum/curriculum-map-client";

export default function CurriculumPage() {
  return (
    <AppShell>
      <div className="px-8 py-7">
        <CurriculumMapClient />
      </div>
    </AppShell>
  );
}
