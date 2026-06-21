# DeutschPilot AI

Production-minded German learning app with realtime AI Speaking and Listening Labs, structured CEFR curriculum, weak-area training, and unofficial exam practice.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS
- OpenAI Realtime API for live microphone sessions
- OpenAI transcription + structured feedback for correction
- Supabase Auth/Postgres with RLS for learner progress

## Local Setup

```bash
npm install
copy .env.example .env.local
npm run dev
```

Set these values in `.env.local`:

- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional model overrides:

- `OPENAI_REALTIME_MODEL`
- `OPENAI_REALTIME_VOICE`
- `OPENAI_TRANSCRIPTION_MODEL`
- `OPENAI_FEEDBACK_MODEL`
- `OPENAI_TTS_MODEL`
- `OPENAI_TTS_VOICE`

## Supabase

Run `supabase/schema.sql` in the Supabase SQL editor. It creates profiles, skill scores, speaking attempts, weakness events, AI reports, conversation reports, interview sessions, interview questions, interview answers, interview reports, and RLS policies so users can only access their own data.

If the base schema was applied before the service-role grants were added, also run `supabase/migrations/20260621_service_role_grants.sql`. This is required for beta-cap checks, waitlist writes, and admin profile reads.

## Authentication

Auth uses Supabase Auth because the database RLS policies already use Supabase `auth.uid()`.

- `/`: public beta landing page
- `/dashboard`: private learner dashboard
- `/login`: password login or magic-link login
- `/signup`: email/password beta signup with a 15 active-user cap
- `/auth/callback`: exchanges magic-link confirmation codes for a session
- `/auth/signout`: clears the Supabase session
- `/account-deactivated`: permanent deactivation state

Learning routes and AI API routes require login. The dashboard reads the signed-in user's own Supabase rows server-side.

Signup and admin user management require `SUPABASE_SERVICE_ROLE_KEY`, because beta-cap enforcement and user creation must happen server-side.

## Admin

The creator profile route is `/yashwanthkrishna`.
The unlinked admin route is `/yashwanthkrishna/admin`.

- Public profile page for Yashwanth Krishna
- Admin login backed by `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET`
- Admin user console for creating, viewing, and deleting Supabase users
- Admin APIs require both the admin cookie and `SUPABASE_SERVICE_ROLE_KEY`

## Account Deactivation

Signed-in users can deactivate their account from `/settings` by typing `sure`.
This sets `profiles.is_active=false`, stores `deactivated_at`, signs the user out, and blocks future learning access for that account.

## AI Workspaces

The app avoids static training surfaces. These routes now generate content on demand through server-side OpenAI routes:

- `/curriculum`: AI curriculum maps by CEFR level and learner focus
- `/learn`: AI lesson player with more-content and scenario generation
- `/train/weak-spots`: targeted weak-area drill plans from learner mistakes
- `/exams`: unofficial Goethe/telc/TestDaF-style practice sets
- `/onboarding`: diagnostic level estimate and first-week plan
- `/reports`: readiness and skill analysis from learner context
- `/settings`: live environment readiness check without exposing secret values

## Speaking Lab

The `/speaking-lab` route supports:

- Live microphone practice through OpenAI Realtime WebRTC
- Live transcript display from realtime transcription events
- Structured AI feedback for pronunciation, grammar, vocabulary, fluency, CEFR estimate, and retry prompt
- Audio upload fallback through `/api/ai/transcribe-upload`
- Manual transcript fallback through `/api/ai/speech-feedback`
- Supabase persistence through `/api/speaking-attempts`

Raw audio is not stored by the app. Transcripts and AI feedback are stored when Supabase is configured and the learner is signed in.

Pronunciation notes are practice suggestions inferred from the transcript. They are not acoustic phoneme measurements.

## Listening Lab

The `/listening-lab` route supports:

- A1-C2 German listening exercises generated on demand
- Dialogue, announcement, interview, story, and news formats
- OpenAI-generated German audio with browser text-to-speech fallback
- Hidden transcripts until the learner submits all MCQ answers
- Deterministic scoring plus an AI skill report
- Per-question answers and explanations after grading
- Saved listening sessions, skill scores, and weak tags through Supabase

The generated voice is AI-generated and is disclosed as such in the interface.

## Interactive Lesson Player

The `/learn` route now supports:

- AI-generated lesson content by CEFR level and topic
- Tutorial explanation, grammar focus, vocabulary, micro drills, and quiz checks
- German-only conversation calls with an AI roleplay partner
- Browser dictation when available, plus typed replies
- Spoken AI replies through browser text-to-speech
- On-demand scenario generation after the starter scenarios
- End-of-call results with CEFR estimate, skill scores, corrections, weak tags, and a training plan
- Supabase persistence through `/api/conversation-reports`

Generated lesson pages, expansions, quizzes, and scenarios are currently on-demand
session content and are not stored. Completed lesson conversations and their scored
feedback are stored. Persisting full generated lessons can be added later without
blocking learner progress reporting.

## German Interview Mode

The `/interview` route supports:

- Pasted job description and resume analysis
- AI-generated German interview question banks
- HR, behavioral, technical, role-fit, and culture-fit question categories
- Listen Mode, where the question is played before text is shown
- Read Mode, where the question is visible while answering
- Spoken answer capture through browser dictation where available
- Audio upload transcription fallback through `/api/ai/interview/transcribe-answer`
- Per-answer language and interview-performance feedback
- Final report with German language scores, role-fit scores, missing job signals, and a 7-day training plan
- Supabase persistence through `/api/interview-sessions`

Interview data is stored only in user-owned RLS tables. Raw audio is not stored.

## Learner Reports

The `/reports` route is hydrated automatically from saved learner evidence:

- Speaking transcripts, corrections, scores, strengths, and weak tags
- Listening questions, selected answers, correct answers, explanations, and reports
- Lesson conversation history, corrections, skill scores, and training plans
- Interview answers, language feedback, interview scores, and final recommendations

Learners are not asked to manually describe their recent practice or concerns. The
optional AI progress snapshot is generated only from these saved records and is
stored in `ai_reports` as a `progress_report`.

## Verification

```bash
npm run lint
npm run typecheck
npm run build
```
