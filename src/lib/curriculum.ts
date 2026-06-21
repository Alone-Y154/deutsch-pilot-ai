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
  source?: "built-in" | "generated" | "custom";
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
    title: "Speak on a Topic",
    icon: GraduationCap,
    description: "Speak without interruption on exam-style and everyday topics.",
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
    id: "a1-daily-routine-pronunciation",
    mode: "pronunciation",
    level: "A1",
    title: "My Daily Routine",
    prompt: "Read the sentences clearly and keep the verbs easy to hear.",
    target:
      "Jeden Morgen stehe ich um sieben Uhr auf. Dann trinke ich Kaffee und fahre mit dem Bus zur Arbeit.",
    successCriteria: ["Clear verb endings", "Long and short vowels", "Steady rhythm"],
  },
  {
    id: "a2-appointment-pronunciation",
    mode: "pronunciation",
    level: "A2",
    title: "Make an Appointment",
    prompt: "Read the request politely with natural sentence stress.",
    target:
      "Guten Tag, ich möchte gern einen Termin vereinbaren. Hätten Sie am Donnerstagvormittag noch etwas frei?",
    successCriteria: ["Polite intonation", "Clear umlauts", "Natural phrasing"],
  },
  {
    id: "b1-experience-pronunciation",
    mode: "pronunciation",
    level: "B1",
    title: "Describe an Experience",
    prompt: "Read the short story smoothly without pausing after every word.",
    target:
      "Letztes Wochenende habe ich einen Ausflug gemacht, obwohl das Wetter zuerst nicht besonders gut aussah.",
    successCriteria: ["Clause rhythm", "Clear consonants", "Connected speech"],
  },
  {
    id: "b2-work-pronunciation",
    mode: "pronunciation",
    level: "B2",
    title: "Professional Introduction",
    prompt: "Read the professional introduction confidently and naturally.",
    target:
      "In meiner bisherigen Position war ich dafür verantwortlich, Kundenanfragen zu bearbeiten und komplexe Probleme verständlich zu erklären.",
    successCriteria: ["Professional pacing", "Compound words", "Sentence stress"],
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
    title: "Learning Through Daily Practice",
    prompt:
      "Read the entire passage naturally from beginning to end. Continue through small mistakes; feedback comes only after you finish.",
    target:
      "Viele Menschen möchten eine neue Sprache lernen, finden im Alltag aber nur wenig Zeit dafür. Oft glauben sie, dass eine erfolgreiche Lernstunde mindestens eine Stunde dauern muss. Tatsächlich können auch kurze, regelmäßige Einheiten sehr wirksam sein. Wer jeden Morgen zehn Minuten einen deutschen Podcast hört, auf dem Weg zur Arbeit neue Wörter wiederholt und am Abend ein paar Sätze laut spricht, begegnet der Sprache mehrmals am Tag. Entscheidend ist nicht nur die Dauer, sondern auch die Aufmerksamkeit. Es hilft, ein klares Ziel für jede Übung zu haben. An einem Tag kann man sich auf die Aussprache konzentrieren, an einem anderen auf neue Redemittel oder eine schwierige grammatische Struktur. Fehler gehören dabei zum Lernprozess. Wenn man versucht, vollkommen fehlerfrei zu sprechen, wird man oft langsamer und unsicherer. Besser ist es, eine Idee zuerst verständlich auszudrücken und sie danach gezielt zu verbessern. Mit der Zeit werden häufige Satzmuster automatisch, der Wortschatz wächst, und das Sprechen fühlt sich weniger anstrengend an. Kleine Schritte wirken vielleicht unspektakulär, führen aber langfristig zu deutlich mehr Sicherheit.",
    successCriteria: ["Sustained rhythm", "Stress on key words", "Complete passage"],
  },
  {
    id: "a2-shadow-weekend",
    mode: "shadow",
    level: "A2",
    title: "A Weekend Visit",
    prompt:
      "Read the complete passage naturally. Continue through small mistakes; analysis comes only after you finish.",
    target:
      "Am letzten Wochenende habe ich meine Schwester in Köln besucht. Am Samstag sind wir früh aufgestanden und haben zusammen gefrühstückt. Danach sind wir mit der Straßenbahn in die Innenstadt gefahren. Dort haben wir zuerst den Dom besichtigt und viele Fotos gemacht. Später wollten wir am Rhein spazieren gehen, aber plötzlich hat es stark geregnet. Deshalb sind wir in ein kleines Museum gegangen. Die Ausstellung war interessant, und wir haben viel über die Geschichte der Stadt gelernt. Am Abend haben wir in einem gemütlichen Restaurant gegessen. Ich habe eine regionale Spezialität probiert, die mir sehr gut geschmeckt hat. Am Sonntag war das Wetter besser. Bevor ich nach Hause gefahren bin, haben wir noch einen langen Spaziergang gemacht. Der Besuch war kurz, aber sehr schön, und wir möchten uns bald wiedersehen.",
    successCriteria: ["Complete passage", "Smooth sentence groups", "Clear past tense"],
  },
  {
    id: "b1-shadow-workday",
    mode: "shadow",
    level: "B1",
    title: "An Unexpected Workday",
    prompt:
      "Read the full passage at a calm, natural pace. The AI will not interrupt.",
    target:
      "Als ich gestern Morgen ins Büro kam, merkte ich sofort, dass etwas anders war. Normalerweise beginnen wir den Tag mit einer kurzen Besprechung, doch diesmal standen mehrere Kollegen auf dem Flur und diskutierten aufgeregt. Unser Computersystem funktionierte nicht, und niemand konnte auf wichtige Kundendaten zugreifen. Zuerst versuchten wir, das Problem selbst zu lösen. Wir starteten die Geräte neu, überprüften die Internetverbindung und riefen schließlich den technischen Support an. Während wir warteten, verteilte unsere Teamleiterin andere Aufgaben. Einige Kollegen beantworteten telefonische Anfragen, andere bereiteten Unterlagen für die nächsten Tage vor. Nach ungefähr zwei Stunden lief das System wieder. Obwohl der Vormittag chaotisch gewesen war, hatten wir als Team gut zusammengearbeitet. Am Ende des Tages waren fast alle Aufgaben erledigt, und wir wussten, wie wir bei einem ähnlichen Problem schneller reagieren könnten.",
    successCriteria: ["Sustained rhythm", "Natural clause stress", "Clear word endings"],
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
