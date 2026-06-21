import { AppShell } from "@/components/app-shell";
import { OnboardingClient } from "@/components/workspace/onboarding-client";

export default function OnboardingPage() {
  return (
    <AppShell>
      <div className="px-8 py-7">
        <OnboardingClient />
      </div>
    </AppShell>
  );
}
