import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, ClipboardList, GraduationCap, ScrollText } from "lucide-react";
import { AppShell, Container, StatTile } from "@/components/app-shell";
import { CourseCard } from "@/components/course-card";
import { courseStats, useOverview } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Level 3 Academic Hub — AI Faculty Student Platform" },
      {
        name: "description",
        content:
          "Lectures, quizzes, exams and study summaries for the six Level 3 courses at the Faculty of Artificial Intelligence.",
      },
      { property: "og:title", content: "Level 3 Academic Hub" },
      {
        property: "og:description",
        content: "Your lectures, quizzes, exams, and study summaries — all in one place.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { data } = useOverview();
  const { user } = useAuth();
  const courses = data?.courses ?? [];

  const totalLectures = data?.lectures.length ?? 0;
  const totalQuizzes = data?.assessments.filter((a) => a.kind === "quiz").length ?? 0;
  const totalExams = data?.assessments.filter((a) => a.kind === "exam").length ?? 0;

  const recent = (data?.attempts ?? []).slice(0, 4).map((attempt) => {
    const assessment = data?.assessments.find((a) => a.id === attempt.assessment_id);
    const lecture = data?.lectures.find((l) => l.id === assessment?.lecture_id);
    const course = data?.courses.find((c) => c.id === lecture?.course_id);
    return { attempt, assessment, lecture, course };
  });

  return (
    <AppShell>
      <section className="border-b border-border bg-card">
        <Container className="py-16 sm:py-20">
          <div className="max-w-3xl">
            <p className="label-eyebrow">Level 3 • Faculty of Artificial Intelligence</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] sm:text-5xl">Level 3 Academic Hub</h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              Your lectures, quizzes, exams, and study summaries — all in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/courses">Explore Courses</Link>
              </Button>
              {user ? (
                <Button asChild size="lg" variant="outline">
                  <Link to="/progress">View My Progress</Link>
                </Button>
              ) : (
                <Button asChild size="lg" variant="outline">
                  <Link to="/auth">Sign in to start</Link>
                </Button>
              )}
            </div>
          </div>
        </Container>
      </section>

      <Container className="py-12">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="Courses" value={courses.length} hint="Core Level 3 subjects" />
          <StatTile label="Lecture Resources" value={totalLectures} hint="Lectures published" />
          <StatTile label="Practice Quizzes" value={totalQuizzes} hint="Per-lecture practice" />
          <StatTile label="Mock Exams" value={totalExams} hint="Longer assessments" />
        </div>
      </Container>

      <Container className="pb-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold">Courses</h2>
            <p className="mt-1 text-sm text-muted-foreground">Open a course to browse its lectures and resources.</p>
          </div>
          <Link to="/courses" className="hidden text-sm font-semibold text-primary hover:underline sm:block">
            View all
          </Link>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} stats={courseStats(data, course.id)} />
          ))}
        </div>
      </Container>

      <Container className="py-14">
        <h2 className="text-2xl font-bold">Continue Learning</h2>
        <p className="mt-1 text-sm text-muted-foreground">Pick up where you left off.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {recent.length === 0 && (
            <div className="card-surface p-6 text-sm text-muted-foreground md:col-span-2">
              {user
                ? "No activity yet. Open a course and start your first quiz."
                : "Sign in to track quizzes, exams and summaries you have completed."}
            </div>
          )}
          {recent.map(({ attempt, assessment, lecture, course }) => (
            <Link
              key={attempt.id}
              to="/courses/$courseId"
              params={{ courseId: course?.id ?? "" }}
              className="card-interactive flex items-center gap-4 p-5"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                {assessment?.kind === "exam" ? (
                  <ScrollText className="size-5" />
                ) : (
                  <ClipboardList className="size-5" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{assessment?.title ?? "Assessment"}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {course?.code} · Lecture {lecture?.number} · {Math.round(Number(attempt.score_percent))}%
                </span>
              </span>
              <BookOpen className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </Container>

      <Container className="pb-16">
        <div className="card-surface flex flex-col gap-3 p-7 sm:flex-row sm:items-center">
          <GraduationCap className="size-8 text-primary" />
          <div>
            <p className="font-semibold">A student-to-student academic platform</p>
            <p className="text-sm text-muted-foreground">
              Organised by lecture, built for revision — independent and not affiliated with the university.
            </p>
          </div>
        </div>
      </Container>
    </AppShell>
  );
}
