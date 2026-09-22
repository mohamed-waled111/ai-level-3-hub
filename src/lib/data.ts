import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Assessment, Attempt, Course, Lecture } from "@/lib/types";

export type OverviewData = {
  courses: Course[];
  lectures: Pick<Lecture, "id" | "course_id" | "number" | "title">[];
  assessments: Pick<Assessment, "id" | "lecture_id" | "kind" | "title">[];
  summaries: { lecture_id: string; published: boolean }[];
  attempts: Attempt[];
  summaryReads: { lecture_id: string }[];
};

export function useOverview() {
  const { user, loading } = useAuth();
  return useQuery({
    queryKey: ["overview", user?.id ?? "anon"],
    enabled: !loading,
    queryFn: async (): Promise<OverviewData> => {
      const coursesRes = await supabase.from("courses").select("*").order("sort_order");
      if (coursesRes.error) throw coursesRes.error;
      if (!user) {
        return {
          courses: coursesRes.data ?? [],
          lectures: [],
          assessments: [],
          summaries: [],
          attempts: [],
          summaryReads: [],
        };
      }
      const [lectures, assessments, summaries, attempts, reads] = await Promise.all([
        supabase.from("lectures").select("id, course_id, number, title").order("number"),
        supabase.from("assessments").select("id, lecture_id, kind, title"),
        supabase.from("summaries").select("lecture_id, published"),
        supabase.from("attempts").select("*").order("completed_at", { ascending: false }),
        supabase.from("summary_reads").select("lecture_id"),
      ]);
      return {
        courses: coursesRes.data ?? [],
        lectures: lectures.data ?? [],
        assessments: assessments.data ?? [],
        summaries: summaries.data ?? [],
        attempts: attempts.data ?? [],
        summaryReads: reads.data ?? [],
      };
    },
  });
}

export type CourseStats = {
  lectures: number;
  quizzes: number;
  exams: number;
  summaries: number;
  completedAssessments: number;
  totalAssessments: number;
  progress: number;
};

export function courseStats(data: OverviewData | undefined, courseId: string): CourseStats {
  const empty: CourseStats = {
    lectures: 0,
    quizzes: 0,
    exams: 0,
    summaries: 0,
    completedAssessments: 0,
    totalAssessments: 0,
    progress: 0,
  };
  if (!data) return empty;
  const lectureIds = data.lectures.filter((l) => l.course_id === courseId).map((l) => l.id);
  const assessments = data.assessments.filter((a) => lectureIds.includes(a.lecture_id));
  const summaries = data.summaries.filter((s) => lectureIds.includes(s.lecture_id) && s.published);
  const attemptedIds = new Set(data.attempts.map((a) => a.assessment_id));
  const completedAssessments = assessments.filter((a) => attemptedIds.has(a.id)).length;
  const readSummaries = summaries.filter((s) =>
    data.summaryReads.some((r) => r.lecture_id === s.lecture_id),
  ).length;
  const totalUnits = assessments.length + summaries.length;
  const doneUnits = completedAssessments + readSummaries;
  return {
    lectures: lectureIds.length,
    quizzes: assessments.filter((a) => a.kind === "quiz").length,
    exams: assessments.filter((a) => a.kind === "exam").length,
    summaries: summaries.length,
    completedAssessments,
    totalAssessments: assessments.length,
    progress: totalUnits === 0 ? 0 : Math.round((doneUnits / totalUnits) * 100),
  };
}

export const accentStyles: Record<string, string> = {
  burgundy: "bg-primary",
  terracotta: "bg-accent",
  sage: "bg-success",
  clay: "bg-chart-4",
  ink: "bg-ink",
  olive: "bg-chart-3",
};
