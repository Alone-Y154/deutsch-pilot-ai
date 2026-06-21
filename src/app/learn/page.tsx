import { AppShell } from "@/components/app-shell";
import { LessonPlayerClient } from "@/components/lesson/lesson-player-client";

export default function LearnPage() {
  return (
    <AppShell>
      <div className="px-8 py-7">
        <LessonPlayerClient />
      </div>
    </AppShell>
  );
}
