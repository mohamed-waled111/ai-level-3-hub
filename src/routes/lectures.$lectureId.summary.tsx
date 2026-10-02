import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Expand, MessageSquareText, Minus, Plus } from "lucide-react";
import { AppShell, Container, EmptyState } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { SummaryFile } from "@/lib/types";

export const Route = createFileRoute("/lectures/$lectureId/summary")({
  head: () => ({ meta: [
    { title: "Lecture Summary — Level 3 Academic Hub" },
    { name: "description", content: "View the published lecture summary." },
    { property: "og:title", content: "Lecture Summary — Level 3 Academic Hub" },
    { property: "og:description", content: "View the published lecture summary." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: SummaryPage,
  errorComponent: ({ error }) => <AppShell><Container className="py-16"><p role="alert">{error instanceof Error ? error.message : "The summary could not be loaded."}</p></Container></AppShell>,
  notFoundComponent: () => <AppShell><Container className="py-16"><p>Summary not found.</p></Container></AppShell>,
});

type ViewerFile = SummaryFile & { signedUrl: string };

function SummaryPage() {
  const { lectureId } = Route.useParams();
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const viewerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["summary-viewer", lectureId],
    queryFn: async () => {
      const [lectureResult, summaryResult] = await Promise.all([
        supabase.from("lectures").select("*, courses(id, code, title)").eq("id", lectureId).maybeSingle(),
        supabase.from("summaries").select("*").eq("lecture_id", lectureId).eq("published", true).maybeSingle(),
      ]);
      if (lectureResult.error) throw lectureResult.error;
      if (summaryResult.error) throw summaryResult.error;
      const summary = summaryResult.data;
      if (!summary) return { lecture: lectureResult.data, summary: null, files: [] as ViewerFile[] };
      const filesResult = await supabase.from("summary_files").select("*").eq("summary_id", summary.id).order("page_order");
      if (filesResult.error) throw filesResult.error;
      const files = await Promise.all((filesResult.data as SummaryFile[]).map(async (file) => {
        const signed = await supabase.storage.from("summary-files").createSignedUrl(file.storage_path, 3600);
        if (signed.error) throw signed.error;
        return { ...file, signedUrl: signed.data.signedUrl };
      }));
      return { lecture: lectureResult.data, summary, files };
    },
  });

  useEffect(() => {
    if (!user || !data?.summary || data.files.length === 0) return;
    void supabase.from("summary_reads").upsert({ user_id: user.id, lecture_id: lectureId }, { onConflict: "user_id,lecture_id" });
  }, [user, data?.summary, data?.files.length, lectureId]);

  const course = (data?.lecture as { courses?: { id: string; code: string; title: string } } | null | undefined)?.courses;
  const current = data?.files[page];

  return (
    <AppShell>
      <Container className="py-10">
        <Breadcrumbs items={[{ label: "Courses", to: "/courses" }, ...(course ? [{ label: course.title, to: "/courses/$courseId", params: { courseId: course.id } }] : []), { label: `Lecture ${data?.lecture?.number ?? ""}` }, { label: "Summary" }]} />
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div><p className="label-eyebrow">{course?.code} · Lecture {String(data?.lecture?.number ?? "").padStart(2, "0")}</p><h1 className="mt-1.5 text-3xl font-extrabold">{data?.lecture?.title ?? "Lecture summary"}</h1></div>
          <div className="flex flex-wrap items-center gap-2">
            {user && current && <Button asChild size="sm"><Link to="/lectures/$lectureId/summary/chat/$threadId" params={{ lectureId, threadId: "new" }} onClick={async (event) => {
              event.preventDefault();
              const existing = await supabase.from("summary_chat_threads").select("id").eq("lecture_id", lectureId).order("updated_at", { ascending: false }).limit(1).maybeSingle();
              if (existing.data) window.location.assign(`/lectures/${lectureId}/summary/chat/${existing.data.id}`);
              else {
                const created = await supabase.from("summary_chat_threads").insert({ lecture_id: lectureId, user_id: user.id }).select("id").single();
                if (created.data) window.location.assign(`/lectures/${lectureId}/summary/chat/${created.data.id}`);
              }
            }}><MessageSquareText className="size-4" /> Ask about this summary</Link></Button>}
            {course && <Button asChild variant="outline" size="sm"><Link to="/courses/$courseId" params={{ courseId: course.id }}><ArrowLeft className="size-4" /> Back to course</Link></Button>}
          </div>
        </div>

        <div className="mt-8">
          {isLoading && <p className="text-sm text-muted-foreground">Loading summary…</p>}
          {!isLoading && !current && <EmptyState title="No summary yet" description="This lecture summary has not been published yet." />}
          {current && current.file_type === "pdf" && (
            <div className="card-surface overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3"><p className="truncate text-sm font-semibold">{current.original_file_name}</p><a href={current.signedUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline">Open full screen</a></div>
              <iframe title="Lecture summary PDF" src={`${current.signedUrl}#toolbar=1&navpanes=0&view=FitH`} className="h-[75vh] min-h-[34rem] w-full bg-secondary/30" />
            </div>
          )}
          {current && current.file_type === "image" && (
            <div ref={viewerRef} className="card-surface overflow-hidden bg-background">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
                <div className="flex items-center gap-1"><Button size="sm" variant="ghost" aria-label="Previous page" disabled={page === 0} onClick={() => { setPage((value) => Math.max(0, value - 1)); setZoom(1); }}><ChevronLeft className="size-4" /></Button><span className="min-w-20 text-center text-xs font-semibold">Page {page + 1} of {data?.files.length ?? 0}</span><Button size="sm" variant="ghost" aria-label="Next page" disabled={page === (data?.files.length ?? 1) - 1} onClick={() => { setPage((value) => Math.min((data?.files.length ?? 1) - 1, value + 1)); setZoom(1); }}><ChevronRight className="size-4" /></Button></div>
                <div className="flex items-center gap-1"><Button size="sm" variant="ghost" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}><Minus className="size-4" /></Button><span className="w-12 text-center text-xs font-semibold">{Math.round(zoom * 100)}%</span><Button size="sm" variant="ghost" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(3, value + 0.25))}><Plus className="size-4" /></Button><Button size="sm" variant="ghost" aria-label="Full screen" onClick={() => void viewerRef.current?.requestFullscreen()}><Expand className="size-4" /></Button></div>
              </div>
              <div className="h-[72vh] min-h-[32rem] overflow-auto bg-secondary/30 p-3 sm:p-6"><img key={current.id} src={current.signedUrl} alt={`Summary page ${page + 1}`} className="mx-auto max-w-none origin-top object-contain transition-transform" style={{ width: `${zoom * 100}%` }} /></div>
              {(data?.files.length ?? 0) > 1 && <div className="flex gap-2 overflow-x-auto border-t border-border p-3">{data?.files.map((file, index) => <button key={file.id} type="button" onClick={() => { setPage(index); setZoom(1); }} className={`h-20 w-16 shrink-0 overflow-hidden rounded-md border-2 bg-secondary ${index === page ? "border-primary" : "border-transparent"}`}><img src={file.signedUrl} alt={`Page ${index + 1}`} className="h-full w-full object-cover" /></button>)}</div>}
            </div>
          )}
        </div>
      </Container>
    </AppShell>
  );
}