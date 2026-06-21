import { AppShell } from "@/components/app-shell";
import { SpeakingLabClient } from "@/components/speaking/speaking-lab-client";

export default function SpeakingLabPage() {
  return (
    <AppShell>
      <div className="px-4 py-5 sm:px-8 sm:py-7">
        <SpeakingLabClient />
      </div>
    </AppShell>
  );
}
