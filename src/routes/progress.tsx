import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell, Container, EmptyState, ProgressBar, StatTile } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/site-header";
import { courseStats, useOverview } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "My Progress — Level 3 Academic Hub" },
      { name: "description", content: "Track quizzes, exams, average scores and study progress across all Level 3 courses." },
      { property: "og:title", content: "My Progress — Level 3 Academic Hub" },
      { property: "og:description", content: "Your study statistics across the six Level 3 courses." },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data } = useOverview();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);

  const attempts = data?.attempts ?? [];
  const quizIds = new Set((data?.assessments ?? []).filter((a) => a.kind === "quiz").map((a) => a.id));
  const quizAttempts = attempts.filter((a) => quizIds.has(a.assessment_id));
  const examAttempts = attempts.filter((a) => !quizIds.has(a.assessment_id));

  const average = (rows: typeof attempts) =>
    rows.length === 0 ? 0 : Math.round(rows.reduce((sum, a) => sum + Number(a.score_percent), 0) / rows.length);

  const questionsAnswered = attempts.reduce((sum, a) => sum + a.correct + a.incorrect, 0);
  const correctAnswers = attempts.reduce((sum, a) => sum + a.correct, 0);

  const courses = data?.courses ?? [];
  const overall =
    courses.length === 0
      ? 0
      : Math.round(courses.reduce((sum, c) => sum + courseStats(data, c.id).progress, 0) / courses.length);

  const recent = attempts.slice(0, 6).map((attempt) => {
    const assessment = data?.assessments.find((a) => a.id === attempt.assessment_id);
    const lecture = data?.lectures.find((l) => l.id === assessment?.lecture_id);
    const course = courses.find((c) => c.id === lecture?.course_id);
    return { attempt, assessment, lecture, course };
  });

  const continueLearning = courses
    .map((course) => ({ course, stats: courseStats(data, course.id) }))
    .filter((entry) => entry.stats.totalAssessments > 0 && entry.stats.progress < 100)
    .slice(0, 3);

  return (
    <AppShell>
      <Container className="py-10">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "My Progress" }]} />
        <h1 className="mt-4 text-3xl font-extrabold">My Progress</h1>
        <p className="mt-2 text-muted-foreground">Calculated automatically from your quizzes, exams and summaries.</p>

        <div className="card-surface mt-8 p-6">
          <div className="flex items-center justify-between">
            <p className="font-bold">Overall progress</p>
            <p className="text-2xl font-extrabold">{overall}%</p>
          </div>
          <ProgressBar value={overall} className="mt-4" />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="Quizzes completed" value={quizAttempts.length} />
          <StatTile label="Exams completed" value={examAttempts.length} />
          <StatTile label="Average quiz score" value={`${average(quizAttempts)}%`} />
          <StatTile label="Average exam score" value={`${average(examAttempts)}%`} />
          <StatTile label="Questions answered" value={questionsAnswered} />
          <StatTile label="Correct answers" value={correctAnswers} />
          <StatTile
            label="Accuracy"
            value={`${questionsAnswered === 0 ? 0 : Math.round((correctAnswers / questionsAnswered) * 100)}%`}
          />
          <StatTile label="Summaries read" value={data?.summaryReads.length ?? 0} />
        </div>

        <h2 className="mt-12 text-2xl font-bold">Course by course</h2>
        <div className="mt-5 space-y-3">
          {courses.map((course) => {
            const stats = courseStats(data, course.id);
            return (
              <Link
                key={course.id}
                to="/courses/$courseId"
                params={{ courseId: course.id }}
                className="card-interactive block p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="label-eyebrow">{course.code}</p>
                    <p className="mt-0.5 truncate font-bold">{course.title}</p>
                  </div>
                  <span className="text-sm font-bold">{stats.progress}%</span>
                </div>
                <ProgressBar value={stats.progress} className="mt-3" />
                <p className="mt-2 text-xs text-muted-foreground">
                  {stats.completedAssessments} of {stats.totalAssessments} assessments completed ·{" "}
                  {stats.lectures} lectures
                </p>
              </Link>
            );
          })}
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <section>
            <h2 className="text-2xl font-bold">Recently Completed</h2>
            <div className="mt-5 space-y-3">
              {recent.length === 0 && (
                <EmptyState title="Nothing yet" description="Your completed quizzes and exams will appear here." />
              )}
              {recent.map(({ attempt, assessment, lecture, course }) => (
                <div key={attempt.id} className="card-surface flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{assessment?.title ?? "Assessment"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {course?.code} · Lecture {lecture?.number} ·{" "}
                      {new Date(attempt.completed_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-secondary px-2 py-1 text-sm font-bold">
                    {Math.round(Number(attempt.score_percent))}%
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold">Continue Learning</h2>
            <div className="mt-5 space-y-3">
              {continueLearning.length === 0 && (
                <EmptyState
                  title="All caught up"
                  description="Once lectures and assessments are published, your next steps show up here."
                  action={
                    <Button asChild size="sm" className="mt-3">
                      <Link to="/courses">Browse courses</Link>
                    </Button>
                  }
                />
              )}
              {continueLearning.map(({ course, stats }) => (
                <Link
                  key={course.id}
                  to="/courses/$courseId"
                  params={{ courseId: course.id }}
                  className="card-interactive block p-4"
                >
                  <p className="text-sm font-semibold">{course.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {stats.totalAssessments - stats.completedAssessments} assessments left
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </Container>
    </AppShell>
  );
}
