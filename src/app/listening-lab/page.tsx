import { ListeningLabClient } from "@/components/listening/listening-lab-client";
import { AppShell } from "@/components/app-shell";

export default function ListeningLabPage() {
  return (
    <AppShell>
      <div className="px-4 py-5 sm:px-8 sm:py-7">
        <ListeningLabClient />
      </div>
    </AppShell>
  );
}
