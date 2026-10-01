import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  Download,
  FileText,
  ScrollText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell, Container, EmptyState, ProgressBar, StatTile } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { accentStyles, courseStats, useOverview } from "@/lib/data";
import type { Assessment } from "@/lib/types";

export const Route = createFileRoute("/courses/$courseId")({
  head: () => ({
    meta: [
      { title: "Course — Level 3 Academic Hub" },
      { name: "description", content: "Lectures, quizzes, exams and summaries for this Level 3 course." },
      { property: "og:title", content: "Course — Level 3 Academic Hub" },
      { property: "og:description", content: "Organise your learning material by lecture." },
    ],
  }),
  component: CoursePage,
  errorComponent: ({ error }) => (
    <AppShell>
      <Container className="py-16">
        <p role="alert" className="text-sm text-destructive">
          {error instanceof Error ? error.message : "The course could not be loaded."}
        </p>
      </Container>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <Container className="py-16">
        <p>Course not found.</p>
      </Container>
    </AppShell>
  ),
});

function CoursePage() {
  const { courseId } = Route.useParams();
  const { user } = useAuth();
  const { data: overview } = useOverview();
  const stats = courseStats(overview, courseId);

  const { data, isLoading } = useQuery({
    queryKey: ["course-detail", courseId],
    queryFn: async () => {
      const [course, lectures, assessments, summaries, counts] = await Promise.all([
        supabase.from("courses").select("*").eq("id", courseId).maybeSingle(),
        supabase.from("lectures").select("*").eq("course_id", courseId).order("number"),
        supabase.from("assessments").select("*, lectures!inner(course_id)").eq("lectures.course_id", courseId),
        supabase.from("summaries").select("lecture_id, published"),
        supabase.from("assessment_questions").select("assessment_id"),
      ]);
      return {
        course: course.data,
        lectures: lectures.data ?? [],
        assessments: (assessments.data ?? []) as unknown as Assessment[],
        summaries: summaries.data ?? [],
        questionCounts: (counts.data ?? []).reduce<Record<string, number>>((acc, row) => {
          acc[row.assessment_id] = (acc[row.assessment_id] ?? 0) + 1;
          return acc;
        }, {}),
      };
    },
  });

  const course = data?.course;
  const attemptedIds = new Set((overview?.attempts ?? []).map((a) => a.assessment_id));
  const readLectures = new Set((overview?.summaryReads ?? []).map((r) => r.lecture_id));

  return (
    <AppShell>
      <section className="border-b border-border bg-card">
        <Container className="py-10">
          <Breadcrumbs
            items={[{ label: "Courses", to: "/courses" }, { label: course?.title ?? "Course" }]}
          />
          <div className="mt-4 flex items-start gap-4">
            <span className={`mt-1.5 h-12 w-1.5 rounded-full ${accentStyles[course?.accent ?? "burgundy"]}`} />
            <div className="flex-1">
              <p className="label-eyebrow">{course?.code}</p>
              <h1 className="mt-1.5 text-3xl font-extrabold">{course?.title ?? "Loading…"}</h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                {course?.description || "Organize your learning material by lecture."}
              </p>
              <div className="mt-5 max-w-sm">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Course progress</span>
                  <span>{stats.progress}%</span>
                </div>
                <ProgressBar value={stats.progress} className="mt-2" />
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Container className="py-10">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="Lectures" value={stats.lectures} />
          <StatTile label="Quizzes completed" value={`${stats.completedAssessments}/${stats.totalAssessments}`} />
          <StatTile label="Exams" value={stats.exams} />
          <StatTile label="Summaries" value={stats.summaries} />
        </div>

        <h2 className="mt-12 text-2xl font-bold">Lectures</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Each lecture bundles a practice quiz, a longer exam and a written summary.
        </p>

        {!user && (
          <div className="card-surface mt-6 p-6 text-sm">
            <p className="font-semibold">Sign in to open lecture resources</p>
            <p className="mt-1 text-muted-foreground">
              Quizzes, exams and summaries are available to signed-in students.
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {isLoading && <p className="text-sm text-muted-foreground">Loading lectures…</p>}
          {!isLoading && (data?.lectures.length ?? 0) === 0 && (
            <EmptyState
              title="No lectures yet"
              description="The platform admin has not published lectures for this course yet. Check back soon."
            />
          )}
          {(data?.lectures ?? []).map((lecture) => {
            const quiz = data?.assessments.find((a) => a.lecture_id === lecture.id && a.kind === "quiz");
            const exam = data?.assessments.find((a) => a.lecture_id === lecture.id && a.kind === "exam");
            const summary = data?.summaries.find((s) => s.lecture_id === lecture.id && s.published);
            return (
              <LectureRow
                key={lecture.id}
                lecture={lecture}
                courseCode={course?.code ?? ""}
                quiz={quiz}
                exam={exam}
                hasSummary={Boolean(summary)}
                summaryRead={readLectures.has(lecture.id)}
                questionCounts={data?.questionCounts ?? {}}
                attemptedIds={attemptedIds}
                signedIn={Boolean(user)}
              />
            );
          })}
        </div>
      </Container>
    </AppShell>
  );
}

type LectureRowProps = {
  lecture: { id: string; number: number; title: string; description: string; file_url: string | null; file_name: string | null };
  courseCode: string;
  quiz?: Assessment | undefined;
  exam?: Assessment | undefined;
  hasSummary: boolean;
  summaryRead: boolean;
  questionCounts: Record<string, number>;
  attemptedIds: Set<string>;
  signedIn: boolean;
};

function LectureRow({
  lecture,
  quiz,
  exam,
  hasSummary,
  summaryRead,
  questionCounts,
  attemptedIds,
  signedIn,
}: LectureRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card-surface overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 px-6 py-5 text-left transition-colors hover:bg-secondary/50"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-bold text-secondary-foreground">
          {String(lecture.number).padStart(2, "0")}
        </span>
        <span className="min-w-0 flex-1">
          <span className="label-eyebrow">Lecture {String(lecture.number).padStart(2, "0")}</span>
          <span className="mt-0.5 block truncate font-bold">{lecture.title}</span>
          {lecture.description && (
            <span className="mt-0.5 block truncate text-sm text-muted-foreground">{lecture.description}</span>
          )}
        </span>
        <ChevronDown className={`size-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-border bg-secondary/25 p-5">
          {lecture.file_url && (
            <a
              href={lecture.file_url}
              target="_blank"
              rel="noreferrer"
              className="mb-4 inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-secondary"
            >
              <Download className="size-3.5" /> {lecture.file_name ?? "Lecture file"}
            </a>
          )}
          <div className="grid gap-4 lg:grid-cols-3">
            <ResourceCard
              icon={<ClipboardList className="size-5" />}
              title="Lecture Quiz"
              description="Practice with questions specifically based on this lecture."
              subtitle={quiz ? quiz.title : `Quiz — Lecture ${lecture.number}`}
              meta={
                quiz
                  ? [
                      `${questionCounts[quiz.id] ?? 0} questions`,
                      quiz.difficulty,
                      `${quiz.duration_minutes} min`,
                    ]
                  : []
              }
              done={quiz ? attemptedIds.has(quiz.id) : false}
              actionLabel="Start Quiz"
              to={quiz && signedIn ? { to: "/assess/$assessmentId", params: { assessmentId: quiz.id } } : undefined}
              disabledNote={!quiz ? "Not published yet" : !signedIn ? "Sign in to start" : undefined}
            />
            <ResourceCard
              icon={<ScrollText className="size-5" />}
              title="Lecture Exam"
              description="A longer assessment covering the lecture."
              subtitle={exam ? exam.title : `Exam — Lecture ${lecture.number}`}
              meta={
                exam
                  ? [
                      `${questionCounts[exam.id] ?? 0} questions`,
                      exam.difficulty,
                      `${exam.duration_minutes} min`,
                    ]
                  : []
              }
              done={exam ? attemptedIds.has(exam.id) : false}
              actionLabel="Start Exam"
              to={exam && signedIn ? { to: "/assess/$assessmentId", params: { assessmentId: exam.id } } : undefined}
              disabledNote={!exam ? "Not published yet" : !signedIn ? "Sign in to start" : undefined}
            />
            <ResourceCard
              icon={<FileText className="size-5" />}
              title="Lecture Summary"
              description="Review the most important concepts from this lecture."
              subtitle={`Summary — Lecture ${lecture.number}`}
              meta={hasSummary ? ["Reading material"] : []}
              done={summaryRead}
              actionLabel="Read Summary"
              to={hasSummary && signedIn ? { to: "/lectures/$lectureId/summary", params: { lectureId: lecture.id } } : undefined}
              disabledNote={!hasSummary ? "Not published yet" : !signedIn ? "Sign in to read" : undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ResourceCard({
  icon,
  title,
  description,
  subtitle,
  meta,
  done,
  actionLabel,
  to,
  disabledNote,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  subtitle: string;
  meta: string[];
  done: boolean;
  actionLabel: string;
  to?: { to: string; params: Record<string, string> } | undefined;
  disabledNote?: string | undefined;
}) {
  return (
    <div className="card-surface flex flex-col p-5">
      <div className="flex items-start justify-between">
        <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          {icon}
        </span>
        {done && (
          <span className="inline-flex items-center gap-1 rounded-md bg-success/15 px-2 py-1 text-[0.7rem] font-semibold text-success">
            <CheckCircle2 className="size-3.5" /> Completed
          </span>
        )}
      </div>
      <h3 className="mt-4 font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <p className="mt-3 text-sm font-semibold">{subtitle}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {meta.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[0.7rem] font-semibold capitalize text-muted-foreground"
          >
            {item.includes("min") && <Clock className="size-3" />}
            {item}
          </span>
        ))}
      </div>
      <div className="mt-auto pt-5">
        {to ? (
          <Button asChild size="sm" className="w-full">
            <Link to={to.to} params={to.params}>
              {actionLabel}
            </Link>
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="w-full" disabled>
            {disabledNote ?? actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
