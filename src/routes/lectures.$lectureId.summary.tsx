import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell, Container, EmptyState } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/site-header";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/lectures/$lectureId/summary")({
  head: () => ({
    meta: [
      { title: "Lecture Summary — Level 3 Academic Hub" },
      { name: "description", content: "Review the most important concepts from this lecture." },
      { property: "og:title", content: "Lecture Summary — Level 3 Academic Hub" },
      { property: "og:description", content: "Key concepts, definitions, formulas and examples for this lecture." },
    ],
  }),
  component: SummaryPage,
  errorComponent: ({ error }) => (
    <AppShell>
      <Container className="py-16">
        <p role="alert">{error.message}</p>
      </Container>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <Container className="py-16">
        <p>Summary not found.</p>
      </Container>
    </AppShell>
  ),
});

function SummaryPage() {
  const { lectureId } = Route.useParams();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["summary", lectureId],
    queryFn: async () => {
      const [lecture, summary] = await Promise.all([
        supabase.from("lectures").select("*, courses(id, code, title)").eq("id", lectureId).maybeSingle(),
        supabase.from("summaries").select("*").eq("lecture_id", lectureId).maybeSingle(),
      ]);
      return { lecture: lecture.data, summary: summary.data };
    },
  });

  useEffect(() => {
    if (!user || !data?.summary) return;
    void supabase.from("summary_reads").upsert(
      { user_id: user.id, lecture_id: lectureId },
      { onConflict: "user_id,lecture_id" },
    );
  }, [user, data?.summary, lectureId]);

  const course = (data?.lecture as { courses?: { id: string; code: string; title: string } } | null | undefined)?.courses;

  return (
    <AppShell>
      <Container className="py-10">
        <Breadcrumbs
          items={[
            { label: "Courses", to: "/courses" },
            ...(course ? [{ label: course.title, to: "/courses/$courseId", params: { courseId: course.id } }] : []),
            { label: `Lecture ${data?.lecture?.number ?? ""}` },
            { label: "Summary" },
          ]}
        />

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="label-eyebrow">
              {course?.code} · Lecture {String(data?.lecture?.number ?? "").padStart(2, "0")}
            </p>
            <h1 className="mt-1.5 text-3xl font-extrabold">{data?.lecture?.title ?? "Lecture summary"}</h1>
          </div>
          {course && (
            <Button asChild variant="outline" size="sm">
              <Link to="/courses/$courseId" params={{ courseId: course.id }}>
                <ArrowLeft className="size-4" /> Back to course
              </Link>
            </Button>
          )}
        </div>

        <div className="mt-8 max-w-3xl">
          {isLoading && <p className="text-sm text-muted-foreground">Loading summary…</p>}
          {!isLoading && !data?.summary?.content && (
            <EmptyState title="No summary yet" description="This lecture summary has not been published yet." />
          )}
          {data?.summary?.content && (
            <article className="card-surface px-6 py-8 sm:px-10 sm:py-10">
              <Markdown content={data.summary.content} />
            </article>
          )}
        </div>
      </Container>
    </AppShell>
  );
}
