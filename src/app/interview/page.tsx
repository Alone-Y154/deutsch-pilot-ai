import { AppShell } from "@/components/app-shell";
import { InterviewModeClient } from "@/components/interview/interview-mode-client";

export default function InterviewPage() {
  return (
    <AppShell>
      <div className="px-8 py-7">
        <InterviewModeClient />
      </div>
    </AppShell>
  );
}
