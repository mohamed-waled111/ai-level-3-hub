import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StatTile } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [courses, lectures, assessments, questions, summaries, attempts] = await Promise.all([
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("lectures").select("id", { count: "exact", head: true }),
        supabase.from("assessments").select("id, kind"),
        supabase.from("questions").select("id", { count: "exact", head: true }),
        supabase.from("summaries").select("id, published"),
        supabase.from("attempts").select("id", { count: "exact", head: true }),
      ]);
      const list = assessments.data ?? [];
      return {
        courses: courses.count ?? 0,
        lectures: lectures.count ?? 0,
        quizzes: list.filter((a) => a.kind === "quiz").length,
        exams: list.filter((a) => a.kind === "exam").length,
        questions: questions.count ?? 0,
        summaries: (summaries.data ?? []).length,
        publishedSummaries: (summaries.data ?? []).filter((s) => s.published).length,
        attempts: attempts.count ?? 0,
      };
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Dashboard</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Everything published on the platform at a glance.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatTile label="Courses" value={data?.courses ?? 0} />
        <StatTile label="Lectures" value={data?.lectures ?? 0} />
        <StatTile label="Quizzes" value={data?.quizzes ?? 0} />
        <StatTile label="Exams" value={data?.exams ?? 0} />
        <StatTile label="Questions" value={data?.questions ?? 0} />
        <StatTile
          label="Summaries"
          value={data?.summaries ?? 0}
          hint={`${data?.publishedSummaries ?? 0} published`}
        />
      </div>

      <div className="card-surface mt-6 p-6">
        <p className="font-bold">Suggested next steps</p>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>
            Add lectures under <Link to="/admin/lectures" className="font-semibold text-primary hover:underline">Lectures</Link>.
          </li>
          <li>
            Write questions in the <Link to="/admin/questions" className="font-semibold text-primary hover:underline">Question Bank</Link>.
          </li>
          <li>
            Build a quiz and an exam per lecture in <Link to="/admin/assessments" className="font-semibold text-primary hover:underline">Quizzes &amp; Exams</Link>.
          </li>
          <li>
            Publish the written recap in <Link to="/admin/summaries" className="font-semibold text-primary hover:underline">Summaries</Link>.
          </li>
        </ol>
        <p className="mt-4 text-xs text-muted-foreground">{data?.attempts ?? 0} student attempts recorded so far.</p>
      </div>
    </div>
  );
}
