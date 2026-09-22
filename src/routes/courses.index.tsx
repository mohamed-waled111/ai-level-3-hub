import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Container } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/site-header";
import { CourseCard } from "@/components/course-card";
import { courseStats, useOverview } from "@/lib/data";

export const Route = createFileRoute("/courses/")({
  head: () => ({
    meta: [
      { title: "Courses — Level 3 Academic Hub" },
      {
        name: "description",
        content: "The six Level 3 courses: Computational Vision, Deep Learning, Parallel Computing, Algorithms, Mobile Development and Data Analysis.",
      },
      { property: "og:title", content: "Courses — Level 3 Academic Hub" },
      { property: "og:description", content: "Browse the six Level 3 courses and their lecture resources." },
    ],
  }),
  component: CoursesPage,
});

function CoursesPage() {
  const { data, isLoading } = useOverview();

  return (
    <AppShell>
      <Container className="py-10">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Courses" }]} />
        <h1 className="mt-4 text-3xl font-extrabold">All Courses</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Every course is organised lecture by lecture, with a quiz, an exam and a written summary per lecture.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading courses…</p>}
          {(data?.courses ?? []).map((course) => (
            <CourseCard key={course.id} course={course} stats={courseStats(data, course.id)} />
          ))}
        </div>
      </Container>
    </AppShell>
  );
}
