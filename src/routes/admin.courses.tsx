import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { accentStyles } from "@/lib/data";
import type { Course } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/courses")({
  component: AdminCourses,
});

const accents = Object.keys(accentStyles);

type Draft = {
  id?: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  accent: string;
  sort_order: number;
};

const blank: Draft = { code: "", title: "", description: "", icon: "BookOpen", accent: "burgundy", sort_order: 0 };

function AdminCourses() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data: courses } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").order("sort_order");
      if (error) throw error;
      return data as Course[];
    },
  });

  const save = useMutation({
    mutationFn: async (value: Draft) => {
      const payload = {
        code: value.code,
        title: value.title,
        description: value.description,
        icon: value.icon,
        accent: value.accent,
        sort_order: value.sort_order,
      };
      const { error } = value.id
        ? await supabase.from("courses").update(payload).eq("id", value.id)
        : await supabase.from("courses").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Course saved");
      setDraft(null);
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Course deleted");
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Courses</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Create, edit and remove courses.</p>
        </div>
        <Button size="sm" onClick={() => setDraft({ ...blank, sort_order: (courses?.length ?? 0) + 1 })}>
          <Plus className="size-4" /> New course
        </Button>
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
            <Label>Course code</Label>
            <Input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label>Course title</Label>
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description</Label>
            <Textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Icon name</Label>
            <Input value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Accent colour</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
              value={draft.accent}
              onChange={(e) => setDraft({ ...draft, accent: e.target.value })}
            >
              {accents.map((accent) => (
                <option key={accent} value={accent}>
                  {accent}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Order</Label>
            <Input
              type="number"
              value={draft.sort_order}
              onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-end gap-2 sm:col-span-2">
            <Button type="submit" size="sm" disabled={save.isPending}>
              Save course
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="mt-6 space-y-3">
        {(courses ?? []).map((course) => (
          <div key={course.id} className="card-surface flex items-center gap-4 p-5">
            <span className={`h-10 w-1.5 rounded-full ${accentStyles[course.accent] ?? "bg-primary"}`} />
            <div className="min-w-0 flex-1">
              <p className="label-eyebrow">{course.code}</p>
              <p className="mt-0.5 truncate font-bold">{course.title}</p>
              <p className="truncate text-xs text-muted-foreground">{course.description}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setDraft({
                  id: course.id,
                  code: course.code,
                  title: course.title,
                  description: course.description,
                  icon: course.icon,
                  accent: course.accent,
                  sort_order: course.sort_order,
                })
              }
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (window.confirm(`Delete ${course.code}? All its lectures and questions go with it.`))
                  remove.mutate(course.id);
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
