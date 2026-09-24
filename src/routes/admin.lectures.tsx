import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDown, ArrowUp, Paperclip, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Course, Lecture } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/lectures")({
  component: AdminLectures,
});

type Draft = {
  id?: string;
  course_id: string;
  number: number;
  title: string;
  description: string;
  file_url: string | null;
  file_name: string | null;
};

function AdminLectures() {
  const queryClient = useQueryClient();
  const [courseId, setCourseId] = useState<string>("");
  const [draft, setDraft] = useState<Draft | null>(null);
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
      const { data, error } = await supabase
        .from("lectures")
        .select("*")
        .eq("course_id", activeCourse)
        .order("number");
      if (error) throw error;
      return data as Lecture[];
    },
  });

  const save = useMutation({
    mutationFn: async (value: Draft) => {
      const payload = {
        course_id: value.course_id,
        number: value.number,
        title: value.title,
        description: value.description,
        file_url: value.file_url,
        file_name: value.file_name,
      };
      const { error } = value.id
        ? await supabase.from("lectures").update(payload).eq("id", value.id)
        : await supabase.from("lectures").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lecture saved");
      setDraft(null);
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lectures").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lecture deleted");
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reorder = useMutation({
    mutationFn: async ({ lecture, direction }: { lecture: Lecture; direction: -1 | 1 }) => {
      const list = lectures ?? [];
      const index = list.findIndex((l) => l.id === lecture.id);
      const target = list[index + direction];
      if (!target) return;
      await supabase.from("lectures").update({ number: target.number }).eq("id", lecture.id);
      await supabase.from("lectures").update({ number: lecture.number }).eq("id", target.id);
    },
    onSuccess: () => void queryClient.invalidateQueries(),
    onError: (error: Error) => toast.error(error.message),
  });

  async function upload(file: File) {
    if (!draft) return;
    setUploading(true);
    try {
      const path = `${draft.course_id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const { error } = await supabase.storage.from("lecture-files").upload(path, file, { upsert: true });
      if (error) throw error;
      const signed = await supabase.storage.from("lecture-files").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      setDraft({ ...draft, file_url: signed.data?.signedUrl ?? null, file_name: file.name });
      toast.success("File attached");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Lectures</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Add unlimited lectures per course and attach files.</p>
        </div>
        <Button
          size="sm"
          onClick={() =>
            setDraft({
              course_id: activeCourse,
              number: (lectures?.length ?? 0) + 1,
              title: "",
              description: "",
              file_url: null,
              file_name: null,
            })
          }
          disabled={!activeCourse}
        >
          <Plus className="size-4" /> New lecture
        </Button>
      </div>

      <div className="mt-5 max-w-sm space-y-1.5">
        <Label>Course</Label>
        <select
          className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
          value={activeCourse}
          onChange={(e) => setCourseId(e.target.value)}
        >
          {(courses ?? []).map((course) => (
            <option key={course.id} value={course.id}>
              {course.code} — {course.title}
            </option>
          ))}
        </select>
      </div>

      {draft && (
        <form
          className="card-surface mt-6 grid gap-4 p-6 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate(draft);
          }}
        >
          <div className="space-y-1.5">
            <Label>Lecture number</Label>
            <Input
              type="number"
              min={1}
              value={draft.number}
              onChange={(e) => setDraft({ ...draft, number: Number(e.target.value) })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Lecture title</Label>
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Lecture file (PDF, PPTX, DOCX, image)</Label>
            <Input
              type="file"
              accept=".pdf,.pptx,.ppt,.docx,.doc,image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
              }}
            />
            {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
            {draft.file_name && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Paperclip className="size-3.5" /> {draft.file_name}
              </p>
            )}
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="sm" disabled={save.isPending}>
              Save lecture
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="mt-6 space-y-3">
        {(lectures ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No lectures for this course yet.</p>
        )}
        {(lectures ?? []).map((lecture, index) => (
          <div key={lecture.id} className="card-surface flex items-center gap-3 p-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-bold">
              {String(lecture.number).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{lecture.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {lecture.description || "No description"}
                {lecture.file_name ? ` · ${lecture.file_name}` : ""}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              disabled={index === 0}
              onClick={() => reorder.mutate({ lecture, direction: -1 })}
            >
              <ArrowUp className="size-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={index === (lectures?.length ?? 0) - 1}
              onClick={() => reorder.mutate({ lecture, direction: 1 })}
            >
              <ArrowDown className="size-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setDraft({
                  id: lecture.id,
                  course_id: lecture.course_id,
                  number: lecture.number,
                  title: lecture.title,
                  description: lecture.description,
                  file_url: lecture.file_url,
                  file_name: lecture.file_name,
                })
              }
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (window.confirm("Delete this lecture and everything attached to it?")) remove.mutate(lecture.id);
              }}
            >
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
