import { generateProgressReport } from "@/lib/ai/workspace-ai";
import {
  buildPersistedReportPrompt,
  getLearnerReportsData,
} from "@/lib/reports";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<{
    currentGoal: string;
    recentPractice: string;
    concerns: string;
    useSavedData: boolean;
  }>;

  try {
    if (body.useSavedData) {
      const learnerData = await getLearnerReportsData();

      if (!learnerData.signedIn) {
        return Response.json({ error: "Login is required." }, { status: 401 });
      }

      if (!learnerData.entries.length) {
        return Response.json(
          {
            error:
              "Complete at least one speaking, listening, conversation, or interview assessment before generating a report.",
          },
          { status: 400 },
        );
      }

      const evidence = buildPersistedReportPrompt(learnerData);
      const result = await generateProgressReport(evidence);
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = supabase
        ? await supabase.auth.getUser()
        : { data: { user: null } };

      if (supabase && user) {
        const { error } = await supabase.from("ai_reports").insert({
          user_id: user.id,
          report_type: "progress_report",
          payload: {
            report: result.data,
            source: result.source,
            generatedAt: new Date().toISOString(),
            evidence: {
              practiceCount: learnerData.practiceCount,
              entryIds: learnerData.entries.slice(0, 20).map((entry) => entry.id),
            },
          },
        });

        if (error) {
          return Response.json(
            { ...result, stored: false, warning: error.message },
            { status: 200 },
          );
        }
      }

      return Response.json({ ...result, stored: true });
    }

    return Response.json(
      await generateProgressReport({
        currentGoal: body.currentGoal || "Improve German",
        recentPractice: body.recentPractice || "",
        concerns: body.concerns || "",
      }),
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate progress report." },
      { status: 500 },
    );
  }
}
