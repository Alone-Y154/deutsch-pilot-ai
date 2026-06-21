import { AppShell } from "@/components/app-shell";
import { SettingsClient } from "@/components/workspace/settings-client";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="px-8 py-7">
        <SettingsClient />
      </div>
    </AppShell>
  );
}
