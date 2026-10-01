import type { Database } from "@/integrations/supabase/types";

export type Course = Database["public"]["Tables"]["courses"]["Row"];
export type Lecture = Database["public"]["Tables"]["lectures"]["Row"];
export type Summary = Database["public"]["Tables"]["summaries"]["Row"];
export type SummaryFile = Database["public"]["Tables"]["summary_files"]["Row"];
export type Question = Database["public"]["Tables"]["questions"]["Row"];
export type Assessment = Database["public"]["Tables"]["assessments"]["Row"];
export type Attempt = Database["public"]["Tables"]["attempts"]["Row"];
export type AttemptAnswer = Database["public"]["Tables"]["attempt_answers"]["Row"];

export type Difficulty = "easy" | "medium" | "hard";
export type QuestionType = "mcq" | "true_false";
export type AssessmentKind = "quiz" | "exam";
export type RunMode = "exam" | "instant";

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export function questionOptions(q: Pick<Question, "options" | "type">): string[] {
  if (q.type === "true_false") return ["True", "False"];
  const raw = q.options;
  if (Array.isArray(raw)) return raw.map((o) => String(o));
  return [];
}
