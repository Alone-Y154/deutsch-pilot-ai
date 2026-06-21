import { AppShell } from "@/components/app-shell";
import { WeakSpotsClient } from "@/components/workspace/weak-spots-client";

export default function WeakSpotsPage() {
  return (
    <AppShell>
      <div className="px-8 py-7">
        <WeakSpotsClient />
      </div>
    </AppShell>
  );
}
