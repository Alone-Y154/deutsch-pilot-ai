import { AppShell } from "@/components/app-shell";
import { ExamsClient } from "@/components/workspace/exams-client";

export default function ExamsPage() {
  return (
    <AppShell>
      <div className="px-8 py-7">
        <ExamsClient />
      </div>
    </AppShell>
  );
}
