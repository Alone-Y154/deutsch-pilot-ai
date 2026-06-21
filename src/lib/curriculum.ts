import {
  BadgeCheck,
  BookOpenCheck,
  BriefcaseBusiness,
  GraduationCap,
  Landmark,
  MessageCircle,
  Mic,
  Repeat2,
  Sparkles,
  Target,
  Volume2,
} from "lucide-react";

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type SpeakingMode =
  | "pronunciation"
  | "roleplay"
  | "exam"
  | "weak-spot"
  | "shadow";

export type SpeakingTask = {
  id: string;
  mode: SpeakingMode;
  level: CefrLevel;
  title: string;
  prompt: string;
  target?: string;
  successCriteria: string[];
};

export type LessonSeed = {
  id: string;
  level: CefrLevel;
  title: string;
  topic: string;
  goal: string;
  weakTags: string[];
};

export const cefrLevels: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export const dashboardStats = [
  { label: "Exam readiness", value: "68%", tone: "teal" },
  { label: "Speaking fluency", value: "B1-", tone: "rose" },
  { label: "Weak spots active", value: "7", tone: "amber" },
  { label: "Lessons mapped", value: "126", tone: "blue" },
];

export const skillScores = [
  { skill: "Speaking", score: 62, detail: "Word order and confidence" },
  { skill: "Listening", score: 70, detail: "Everyday audio prompts" },
  { skill: "Writing", score: 58, detail: "Cases and verb position" },
  { skill: "Reading", score: 76, detail: "Main idea and details" },
  { skill: "Grammar", score: 54, detail: "Dative, accusative, articles" },
  { skill: "Vocabulary", score: 73, detail: "Travel and study topics" },
];

export const curriculumLevels = [
  {
    level: "A1",
    title: "Survival German",
    focus: "Introductions, numbers, food, directions, present tense, basic cases.",
    lessons: 18,
    status: "Deep launch path",
  },
  {
    level: "A2",
    title: "Everyday Control",
    focus: "Daily life, appointments, separable verbs, perfect tense, modal verbs.",
    lessons: 22,
    status: "Deep launch path",
  },
  {
    level: "B1",
    title: "Independent Speaker",
    focus: "Opinions, stories, work, travel problems, subordinate clauses.",
    lessons: 24,
    status: "Mapped + AI expansion",
  },
  {
    level: "B2",
    title: "Professional German",
    focus: "Argumentation, formal writing, presentations, nuanced listening.",
    lessons: 22,
    status: "Mapped + AI expansion",
  },
  {
    level: "C1",
    title: "Academic Precision",
    focus: "Complex texts, lectures, register control, exam performance.",
    lessons: 20,
    status: "Mapped + AI expansion",
  },
  {
    level: "C2",
    title: "Near-Native Mastery",
    focus: "Style, idiom, advanced debate, dense reading, flawless output.",
    lessons: 20,
    status: "Mapped + AI expansion",
  },
] as const;

export const speakingModes = [
  {
    id: "pronunciation",
    title: "Pronunciation Practice",
    icon: Volume2,
    description: "Repeat target German and get precise corrections.",
  },
  {
    id: "roleplay",
    title: "Conversation Roleplay",
    icon: MessageCircle,
    description: "Practice real situations with AI feedback after each turn.",
  },
  {
    id: "exam",
    title: "Exam Speaking",
    icon: GraduationCap,
    description: "Unofficial Goethe, telc, and TestDaF style speaking tasks.",
  },
  {
    id: "weak-spot",
    title: "Weak Spot Speaking",
    icon: Target,
    description: "Turn your mistakes into targeted speaking drills.",
  },
  {
    id: "shadow",
    title: "Shadow Mode",
    icon: Repeat2,
    description: "Listen, repeat, compare, and improve rhythm.",
  },
] satisfies Array<{
  id: SpeakingMode;
  title: string;
  icon: typeof Mic;
  description: string;
}>;

export const speakingTasks: SpeakingTask[] = [
  {
    id: "a1-intro",
    mode: "pronunciation",
    level: "A1",
    title: "Introduce Yourself",
    prompt: "Introduce yourself in German for 30 seconds. Include your name, country, city, and one hobby.",
    target: "Hallo, ich heisse ... Ich komme aus ... Ich wohne in ... Mein Hobby ist ...",
    successCriteria: ["Clear vowels", "Correct verb position", "Confident personal details"],
  },
  {
    id: "a2-cafe",
    mode: "roleplay",
    level: "A2",
    title: "Cafe Order",
    prompt: "You are in a cafe in Berlin. Order a drink and snack, ask the price, and request the bill.",
    target: "Ich moechte bitte einen Kaffee und ein Stueck Kuchen. Was kostet das? Die Rechnung, bitte.",
    successCriteria: ["Polite request", "Useful cafe vocabulary", "Natural sentence rhythm"],
  },
  {
    id: "b1-opinion",
    mode: "exam",
    level: "B1",
    title: "Goethe-Style Opinion",
    prompt: "Speak for one minute about whether online learning is better than classroom learning. Give two reasons.",
    successCriteria: ["Opinion marker", "Two reasons", "Connectors like weil, deshalb, trotzdem"],
  },
  {
    id: "b2-job",
    mode: "roleplay",
    level: "B2",
    title: "Job Interview",
    prompt: "Answer an interview question: Why are you a good fit for a German-speaking customer success role?",
    successCriteria: ["Professional register", "Specific examples", "Confident modal verbs"],
  },
  {
    id: "c1-testdaf",
    mode: "exam",
    level: "C1",
    title: "TestDaF-Style Campus Situation",
    prompt: "Summarize a university problem and propose a solution as if responding in a TestDaF speaking task.",
    successCriteria: ["Academic structure", "Problem and solution", "Clear transitions"],
  },
  {
    id: "weak-cases",
    mode: "weak-spot",
    level: "A2",
    title: "Dative Rescue Drill",
    prompt: "Describe who you gave something to yesterday. Use geben, schenken, helfen, and at least three dative forms.",
    successCriteria: ["Dative articles", "Past tense", "No English word order"],
  },
  {
    id: "shadow-rhythm",
    mode: "shadow",
    level: "B1",
    title: "Shadow A Natural Sentence",
    prompt: "Listen to the model sentence, then repeat it with the same rhythm and stress.",
    target: "Wenn ich mehr Zeit haette, wuerde ich jeden Tag Deutsch sprechen.",
    successCriteria: ["Subjunctive rhythm", "Stress on key words", "Smooth final clause"],
  },
];

export const examTracks = [
  {
    name: "Goethe-style",
    icon: BadgeCheck,
    modules: "Reading, listening, writing, speaking",
    note: "Unofficial practice mapped to public module patterns.",
  },
  {
    name: "telc-style",
    icon: BriefcaseBusiness,
    modules: "Language elements, communication, writing, speaking",
    note: "Everyday and professional scenarios with communicative scoring.",
  },
  {
    name: "TestDaF-style",
    icon: Landmark,
    modules: "Academic reading, listening, writing, speaking",
    note: "B2-C1 academic tasks for university readiness.",
  },
];

export const weakSpotDrills = [
  { icon: BookOpenCheck, label: "Verb position", action: "5 spoken sentence rebuilds" },
  { icon: Target, label: "Dative articles", action: "3 roleplay replies with corrections" },
  { icon: Sparkles, label: "Fluency pauses", action: "Shadow one B1 sentence twice" },
];

export const lessonSeeds: LessonSeed[] = [
  {
    id: "a1-introductions",
    level: "A1",
    title: "Introduce yourself naturally",
    topic: "Introductions",
    goal: "Say who you are, where you are from, where you live, and what you like.",
    weakTags: ["verb-position", "pronouns", "basic-vocabulary"],
  },
  {
    id: "a2-cafe-service",
    level: "A2",
    title: "Order at a cafe",
    topic: "Cafe and restaurant",
    goal: "Order politely, ask prices, and solve one small problem.",
    weakTags: ["polite-requests", "accusative", "numbers"],
  },
  {
    id: "b1-opinion-online-learning",
    level: "B1",
    title: "Give a clear opinion",
    topic: "Online learning",
    goal: "Give an opinion with reasons, examples, and connectors.",
    weakTags: ["weil-clauses", "connectors", "fluency"],
  },
  {
    id: "b2-work-interview",
    level: "B2",
    title: "Professional interview answers",
    topic: "Job interview",
    goal: "Explain experience, strengths, and motivation in professional German.",
    weakTags: ["formal-register", "subordinate-clauses", "precision"],
  },
  {
    id: "c1-academic-discussion",
    level: "C1",
    title: "Academic discussion",
    topic: "University problem solving",
    goal: "Summarize a complex situation and propose a structured solution.",
    weakTags: ["academic-register", "argumentation", "nominalization"],
  },
  {
    id: "c2-nuanced-debate",
    level: "C2",
    title: "Nuanced debate",
    topic: "Technology and society",
    goal: "Argue with nuance, idiomatic phrasing, and stylistic control.",
    weakTags: ["idiom", "style", "counterargument"],
  },
];

export const initialConversationScenarios = [
  {
    id: "scenario-cafe-problem",
    title: "Wrong Cafe Order",
    level: "A2" as CefrLevel,
    learnerRole: "Customer",
    aiRole: "Cafe worker",
    setting: "A busy cafe in Munich. Your order is wrong and you need to fix it politely.",
    openingLine: "Guten Tag! Stimmt etwas mit Ihrer Bestellung nicht?",
    goals: ["Explain the problem", "Ask for the correct item", "Stay polite"],
    vocabulary: [
      { german: "Ich habe ... bestellt.", english: "I ordered ..." },
      { german: "Das ist leider falsch.", english: "Unfortunately, this is wrong." },
      { german: "Koennten Sie ... bringen?", english: "Could you bring ...?" },
    ],
    assessmentFocus: ["polite-requests", "accusative", "clear-problem-statement"],
  },
  {
    id: "scenario-apartment-viewing",
    title: "Apartment Viewing",
    level: "B1" as CefrLevel,
    learnerRole: "Potential tenant",
    aiRole: "Landlord",
    setting: "You are viewing an apartment and need to ask about rent, deposit, and move-in date.",
    openingLine: "Willkommen zur Besichtigung. Was moechten Sie zuerst wissen?",
    goals: ["Ask three practical questions", "React to one problem", "Confirm next steps"],
    vocabulary: [
      { german: "die Kaution", english: "deposit" },
      { german: "die Nebenkosten", english: "utilities/service charges" },
      { german: "ab wann ist die Wohnung frei?", english: "from when is the apartment available?" },
    ],
    assessmentFocus: ["question-formation", "case-marking", "follow-up-questions"],
  },
  {
    id: "scenario-university-office",
    title: "University Office",
    level: "B2" as CefrLevel,
    learnerRole: "Student",
    aiRole: "University administrator",
    setting: "You need to explain a registration problem and ask for a deadline extension.",
    openingLine: "Guten Morgen. Worum geht es bei Ihrem Anliegen?",
    goals: ["Explain the issue", "Request an extension", "Justify your request"],
    vocabulary: [
      { german: "die Frist", english: "deadline" },
      { german: "die Anmeldung", english: "registration" },
      { german: "waere es moeglich", english: "would it be possible" },
    ],
    assessmentFocus: ["formal-register", "subordinate-clauses", "justification"],
  },
];
