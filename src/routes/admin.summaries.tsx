import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, FileImage, FileText, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Course, Lecture, Summary, SummaryFile } from "@/lib/types";

export const Route = createFileRoute("/admin/summaries")({ component: AdminSummaries });

type FileWithUrl = SummaryFile & { signedUrl: string };

function AdminSummaries() {
  const queryClient = useQueryClient();
  const [courseId, setCourseId] = useState("");
  const [lectureId, setLectureId] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: courses } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").order("sort_order");
      if (error) throw error;
      return data as Course[];
    },
  });
  const activeCourse = courseId || courses?.[0]?.id || "";

  const { data: lectures } = useQuery({
    queryKey: ["admin-lectures", activeCourse],
    enabled: Boolean(activeCourse),
    queryFn: async () => {
      const { data, error } = await supabase.from("lectures").select("*").eq("course_id", activeCourse).order("number");
      if (error) throw error;
      return data as Lecture[];
    },
  });
  const activeLecture = lectureId || lectures?.[0]?.id || "";

  const { data } = useQuery({
    queryKey: ["admin-summary-files", activeLecture],
    enabled: Boolean(activeLecture),
    queryFn: async () => {
      const summaryResult = await supabase.from("summaries").select("*").eq("lecture_id", activeLecture).maybeSingle();
      if (summaryResult.error) throw summaryResult.error;
      const summary = summaryResult.data as Summary | null;
      if (!summary) return { summary: null, files: [] as FileWithUrl[] };
      const filesResult = await supabase.from("summary_files").select("*").eq("summary_id", summary.id).order("page_order");
      if (filesResult.error) throw filesResult.error;
      const files = await Promise.all(
        (filesResult.data as SummaryFile[]).map(async (file) => {
          const signed = await supabase.storage.from("summary-files").createSignedUrl(file.storage_path, 3600);
          return { ...file, signedUrl: signed.data?.signedUrl ?? "" };
        }),
      );
      return { summary, files };
    },
  });

  async function ensureSummary(): Promise<Summary> {
    if (data?.summary) return data.summary;
    const result = await supabase
      .from("summaries")
      .insert({ lecture_id: activeLecture, content: "", published: false })
      .select("*")
      .single();
    if (result.error) throw result.error;
    return result.data as Summary;
  }

  async function removeStoredFiles(files: FileWithUrl[]) {
    if (files.length === 0) return;
    const paths = files.map((file) => file.storage_path);
    const storageResult = await supabase.storage.from("summary-files").remove(paths);
    if (storageResult.error) throw storageResult.error;
  }

  async function uploadFiles(selected: File[]) {
    if (!activeLecture || selected.length === 0) return;
    const pdfs = selected.filter((file) => file.type === "application/pdf");
    const images = selected.filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type));
    if (pdfs.length > 1 || (pdfs.length > 0 && images.length > 0)) {
      toast.error("Upload one PDF, or upload one or more images as summary pages.");
      return;
    }
    if (pdfs.length + images.length !== selected.length) {
      toast.error("Only PDF, JPG, JPEG, PNG and WEBP files are supported.");
      return;
    }
    setUploading(true);
    try {
      const summary = await ensureSummary();
      await removeStoredFiles(data?.files ?? []);
      if ((data?.files.length ?? 0) > 0) {
        const deleteResult = await supabase.from("summary_files").delete().eq("summary_id", summary.id);
        if (deleteResult.error) throw deleteResult.error;
      }
      const rows = [];
      for (let index = 0; index < selected.length; index++) {
        const file = selected[index];
        if (!file) continue;
        const safeName = file.name.replace(/[^\w.\-]/g, "_");
        const path = `${summary.id}/${Date.now()}-${index}-${safeName}`;
        const uploaded = await supabase.storage.from("summary-files").upload(path, file);
        if (uploaded.error) throw uploaded.error;
        rows.push({
          summary_id: summary.id,
          file_type: file.type === "application/pdf" ? "pdf" : "image",
          storage_path: path,
          original_file_name: file.name,
          page_order: index,
        });
      }
      const inserted = await supabase.from("summary_files").insert(rows);
      if (inserted.error) throw inserted.error;
      await supabase.from("summaries").update({ published: false }).eq("id", summary.id);
      toast.success("Summary uploaded as a draft");
      await queryClient.invalidateQueries({ queryKey: ["admin-summary-files", activeLecture] });
      await queryClient.invalidateQueries({ queryKey: ["overview"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const publish = useMutation({
    mutationFn: async (published: boolean) => {
      if (!data?.summary || data.files.length === 0) throw new Error("Upload a summary before publishing.");
      const result = await supabase.from("summaries").update({ published }).eq("id", data.summary.id);
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      toast.success(data?.summary?.published ? "Summary unpublished" : "Summary published");
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!data?.summary) return;
      await removeStoredFiles(data.files);
      const result = await supabase.from("summaries").delete().eq("id", data.summary.id);
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      toast.success("Summary deleted");
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reorder = useMutation({
    mutationFn: async ({ index, direction }: { index: number; direction: -1 | 1 }) => {
      const first = data?.files[index];
      const second = data?.files[index + direction];
      if (!first || !second) return;
      const firstUpdate = await supabase.from("summary_files").update({ page_order: second.page_order }).eq("id", first.id);
      if (firstUpdate.error) throw firstUpdate.error;
      const secondUpdate = await supabase.from("summary_files").update({ page_order: first.page_order }).eq("id", second.id);
      if (secondUpdate.error) throw secondUpdate.error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-summary-files", activeLecture] }),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Summaries</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Upload a PDF or a set of ordered images for each lecture.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Course</Label>
          <select className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm" value={activeCourse} onChange={(event) => { setCourseId(event.target.value); setLectureId(""); }}>
            {(courses ?? []).map((course) => <option key={course.id} value={course.id}>{course.code} — {course.title}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Lecture</Label>
          <select className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm" value={activeLecture} onChange={(event) => setLectureId(event.target.value)}>
            {(lectures ?? []).map((lecture) => <option key={lecture.id} value={lecture.id}>Lecture {lecture.number} — {lecture.title}</option>)}
          </select>
        </div>
      </div>

      {(lectures?.length ?? 0) === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Add a lecture to this course first.</p>
      ) : (
        <>
          <div className="card-surface mt-6 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">Upload Summary</h2>
                <p className="mt-1 text-xs text-muted-foreground">Choose one PDF or multiple image pages. Uploading replaces the current summary.</p>
              </div>
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                <Upload className="size-4" /> {uploading ? "Uploading…" : "Choose files"}
                <Input className="sr-only" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" multiple disabled={uploading} onChange={(event) => { const files = Array.from(event.target.files ?? []); void uploadFiles(files); event.target.value = ""; }} />
              </label>
            </div>
          </div>

          {(data?.files.length ?? 0) > 0 && (
            <div className="mt-5">
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant={data?.summary?.published ? "outline" : "default"} onClick={() => publish.mutate(!data?.summary?.published)}>
                  {data?.summary?.published ? "Unpublish" : "Publish summary"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { if (window.confirm("Delete this summary and all its files?")) remove.mutate(); }}>
                  <Trash2 className="size-4 text-destructive" /> Delete summary
                </Button>
                <span className={`text-xs font-semibold ${data?.summary?.published ? "text-success" : "text-muted-foreground"}`}>{data?.summary?.published ? "Published" : "Draft"}</span>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {(data?.files ?? []).map((file, index) => (
                  <div key={file.id} className="card-surface overflow-hidden">
                    <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-secondary/40">
                      {file.file_type === "image" ? <img src={file.signedUrl} alt={`Summary page ${index + 1}`} className="h-full w-full object-contain" /> : <div className="text-center"><FileText className="mx-auto size-12 text-primary" /><p className="mt-2 text-sm font-semibold">PDF summary</p></div>}
                    </div>
                    <div className="flex items-center gap-2 border-t border-border p-3">
                      {file.file_type === "image" ? <FileImage className="size-4 text-accent" /> : <FileText className="size-4 text-primary" />}
                      <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{file.original_file_name}</p><p className="text-[0.7rem] text-muted-foreground">Page {index + 1}</p></div>
                      {file.file_type === "image" && <><Button size="sm" variant="ghost" disabled={index === 0} onClick={() => reorder.mutate({ index, direction: -1 })}><ArrowUp className="size-3.5" /></Button><Button size="sm" variant="ghost" disabled={index === (data?.files.length ?? 0) - 1} onClick={() => reorder.mutate({ index, direction: 1 })}><ArrowDown className="size-3.5" /></Button></>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}