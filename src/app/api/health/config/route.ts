export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    openai: Boolean(process.env.OPENAI_API_KEY),
    realtimeModel: Boolean(process.env.OPENAI_REALTIME_MODEL),
    transcriptionModel: Boolean(process.env.OPENAI_TRANSCRIPTION_MODEL),
    feedbackModel: Boolean(process.env.OPENAI_FEEDBACK_MODEL),
    ttsModel: Boolean(process.env.OPENAI_TTS_MODEL || process.env.OPENAI_API_KEY),
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
}
