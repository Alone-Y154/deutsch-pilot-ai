import { AppShell } from "@/components/app-shell";
import { ReportsClient } from "@/components/workspace/reports-client";
import { getLearnerReportsData } from "@/lib/reports";

export default async function ReportsPage() {
  const reports = await getLearnerReportsData();

  return (
    <AppShell>
      <div className="px-4 py-5 sm:px-8 sm:py-7">
        <ReportsClient initialData={reports} />
      </div>
    </AppShell>
  );
}
