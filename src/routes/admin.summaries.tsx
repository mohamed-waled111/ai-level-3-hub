import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Eye, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Course, Lecture, Summary } from "@/lib/types";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/summaries")({
  component: AdminSummaries,
});

const cheatsheet = [
  "# Heading · ## Subheading",
  "**bold** · *italic* · ==highlight==",
  "- bullet list · 1. numbered list",
  "| table | header |",
  "```code block```",
  "$E = mc^2$ for formulas",
  "![caption](image-url)",
];

function AdminSummaries() {
  const queryClient = useQueryClient();
  const [courseId, setCourseId] = useState("");
  const [lectureId, setLectureId] = useState("");
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

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

  const { data: summary } = useQuery({
    queryKey: ["admin-summary", activeLecture],
    enabled: Boolean(activeLecture),
    queryFn: async () => {
      const { data, error } = await supabase.from("summaries").select("*").eq("lecture_id", activeLecture).maybeSingle();
      if (error) throw error;
      return (data as Summary | null) ?? null;
    },
  });

  useEffect(() => {
    setContent(summary?.content ?? "");
    setPublished(summary?.published ?? false);
  }, [summary, activeLecture]);

  const save = useMutation({
    mutationFn: async (nextPublished: boolean) => {
      const { error } = await supabase
        .from("summaries")
        .upsert({ lecture_id: activeLecture, content, published: nextPublished }, { onConflict: "lecture_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Summary saved");
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Summaries</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Write a study recap per lecture, then publish it.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Course</Label>
          <select
            className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
            value={activeCourse}
            onChange={(e) => {
              setCourseId(e.target.value);
              setLectureId("");
            }}
          >
            {(courses ?? []).map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} — {course.title}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Lecture</Label>
          <select
            className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
            value={activeLecture}
            onChange={(e) => setLectureId(e.target.value)}
          >
            {(lectures ?? []).map((lecture) => (
              <option key={lecture.id} value={lecture.id}>
                Lecture {lecture.number} — {lecture.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {(lectures?.length ?? 0) === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Add a lecture to this course first.</p>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => save.mutate(published)} disabled={save.isPending}>
              <Save className="size-4" /> Save draft
            </Button>
            <Button
              size="sm"
              variant={published ? "outline" : "default"}
              onClick={() => {
                const next = !published;
                setPublished(next);
                save.mutate(next);
              }}
            >
              {published ? "Unpublish" : "Publish"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowPreview(!showPreview)}>
              <Eye className="size-4" /> {showPreview ? "Hide preview" : "Show preview"}
            </Button>
            <span className={`text-xs font-semibold ${published ? "text-success" : "text-muted-foreground"}`}>
              {published ? "Published" : "Draft"}
            </span>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">{cheatsheet.join("   ·   ")}</p>

          <div className={`mt-4 grid gap-4 ${showPreview ? "lg:grid-cols-2" : ""}`}>
            <Textarea
              className="min-h-[28rem] font-mono text-sm"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={"# Lecture overview\n\n- Key idea one\n- Key idea two"}
            />
            {showPreview && (
              <div className="card-surface max-h-[28rem] overflow-y-auto p-6">
                {content.trim() ? (
                  <Markdown content={content} />
                ) : (
                  <p className="text-sm text-muted-foreground">Preview appears here as you type.</p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
