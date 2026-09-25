import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Shuffle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DIFFICULTIES,
  type Assessment,
  type AssessmentKind,
  type Course,
  type Difficulty,
  type Lecture,
  type Question,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/assessments")({
  component: AdminAssessments,
});

type Draft = {
  id?: string;
  lecture_id: string;
  kind: AssessmentKind;
  title: string;
  description: string;
  duration_minutes: number;
  difficulty: Difficulty;
  randomize: boolean;
};

function AdminAssessments() {
  const queryClient = useQueryClient();
  const [courseId, setCourseId] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [genCount, setGenCount] = useState(10);
  const [genEasy, setGenEasy] = useState(30);
  const [genMedium, setGenMedium] = useState(50);
  const [genHard, setGenHard] = useState(20);

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

  const lectureIds = (lectures ?? []).map((l) => l.id);

  const { data: assessments } = useQuery({
    queryKey: ["admin-assessments", lectureIds.join(",")],
    enabled: lectureIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("*")
        .in("lecture_id", lectureIds)
        .order("created_at");
      if (error) throw error;
      return data as Assessment[];
    },
  });

  const { data: bank } = useQuery({
    queryKey: ["admin-bank", activeCourse],
    enabled: Boolean(activeCourse),
    queryFn: async () => {
      const { data, error } = await supabase.from("questions").select("*").eq("course_id", activeCourse);
      if (error) throw error;
      return data as Question[];
    },
  });

  const { data: links } = useQuery({
    queryKey: ["admin-assessment-questions", editingId],
    enabled: Boolean(editingId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_questions")
        .select("id, question_id, position")
        .eq("assessment_id", editingId!)
        .order("position");
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (value: Draft) => {
      const payload = {
        lecture_id: value.lecture_id,
        kind: value.kind,
        title: value.title,
        description: value.description,
        duration_minutes: value.duration_minutes,
        difficulty: value.difficulty,
        randomize: value.randomize,
      };
      if (value.id) {
        const { error } = await supabase.from("assessments").update(payload).eq("id", value.id);
        if (error) throw error;
        return value.id;
      }
      const { data, error } = await supabase.from("assessments").insert(payload).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Saved");
      setDraft(null);
      setEditingId(id);
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assessments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      setEditingId(null);
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const attach = useMutation({
    mutationFn: async (questionIds: string[]) => {
      const start = links?.length ?? 0;
      const rows = questionIds.map((question_id, index) => ({
        assessment_id: editingId!,
        question_id,
        position: start + index,
      }));
      const { error } = await supabase.from("assessment_questions").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries(),
    onError: (error: Error) => toast.error(error.message),
  });

  const detach = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assessment_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries(),
    onError: (error: Error) => toast.error(error.message),
  });

  const movePosition = useMutation({
    mutationFn: async ({ index, direction }: { index: number; direction: -1 | 1 }) => {
      const list = links ?? [];
      const a = list[index];
      const b = list[index + direction];
      if (!a || !b) return;
      await supabase.from("assessment_questions").update({ position: b.position }).eq("id", a.id);
      await supabase.from("assessment_questions").update({ position: a.position }).eq("id", b.id);
    },
    onSuccess: () => void queryClient.invalidateQueries(),
    onError: (error: Error) => toast.error(error.message),
  });

  const editing = assessments?.find((a) => a.id === editingId) ?? null;
  const attachedIds = new Set((links ?? []).map((l) => l.question_id));
  const editingLecture = lectures?.find((l) => l.id === editing?.lecture_id);

  function generateFromBank() {
    if (!editing) return;
    const pool = (bank ?? []).filter((q) => !attachedIds.has(q.id) && (!q.lecture_id || q.lecture_id === editing.lecture_id));
    const want: Record<Difficulty, number> = {
      easy: Math.round((genCount * genEasy) / 100),
      medium: Math.round((genCount * genMedium) / 100),
      hard: Math.round((genCount * genHard) / 100),
    };
    const picked: string[] = [];
    for (const difficulty of DIFFICULTIES) {
      const bucket = pool.filter((q) => q.difficulty === difficulty).sort(() => Math.random() - 0.5);
      picked.push(...bucket.slice(0, want[difficulty]).map((q) => q.id));
    }
    const rest = pool.filter((q) => !picked.includes(q.id)).sort(() => Math.random() - 0.5);
    while (picked.length < genCount && rest.length > 0) picked.push(rest.pop()!.id);
    if (picked.length === 0) {
      toast.error("No matching unused questions in the bank for this lecture.");
      return;
    }
    attach.mutate(picked);
    toast.success(`Added ${picked.length} questions`);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Quizzes &amp; Exams</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Build a quiz or an exam per lecture, then attach questions from the bank.
          </p>
        </div>
        <Button
          size="sm"
          disabled={(lectures?.length ?? 0) === 0}
          onClick={() =>
            setDraft({
              lecture_id: lectures?.[0]?.id ?? "",
              kind: "quiz",
              title: "",
              description: "",
              duration_minutes: 15,
              difficulty: "medium",
              randomize: false,
            })
          }
        >
          <Plus className="size-4" /> New assessment
        </Button>
      </div>

      <div className="mt-5 max-w-sm space-y-1.5">
        <Label>Course</Label>
        <select
          className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
          value={activeCourse}
          onChange={(e) => {
            setCourseId(e.target.value);
            setEditingId(null);
          }}
        >
          {(courses ?? []).map((course) => (
            <option key={course.id} value={course.id}>
              {course.code} — {course.title}
            </option>
          ))}
        </select>
      </div>

      {(lectures?.length ?? 0) === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">Add a lecture to this course first.</p>
      )}

      {draft && (
        <form
          className="card-surface mt-6 grid gap-4 p-6 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate(draft);
          }}
        >
          <div className="space-y-1.5">
            <Label>Lecture</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
              value={draft.lecture_id}
              onChange={(e) => setDraft({ ...draft, lecture_id: e.target.value })}
            >
              {(lectures ?? []).map((lecture) => (
                <option key={lecture.id} value={lecture.id}>
                  Lecture {lecture.number} — {lecture.title}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
              value={draft.kind}
              onChange={(e) => setDraft({ ...draft, kind: e.target.value as AssessmentKind })}
            >
              <option value="quiz">Quiz</option>
              <option value="exam">Exam</option>
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Title</Label>
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Duration (minutes)</Label>
            <Input
              type="number"
              min={1}
              value={draft.duration_minutes}
              onChange={(e) => setDraft({ ...draft, duration_minutes: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Difficulty</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
              value={draft.difficulty}
              onChange={(e) => setDraft({ ...draft, difficulty: e.target.value as Difficulty })}
            >
              {DIFFICULTIES.map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {difficulty}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={draft.randomize}
              onChange={(e) => setDraft({ ...draft, randomize: e.target.checked })}
            />
            Shuffle question order for every student
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="sm" disabled={save.isPending}>
              Save
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="mt-6 space-y-3">
        {(assessments ?? []).map((assessment) => {
          const lecture = lectures?.find((l) => l.id === assessment.lecture_id);
          return (
            <div key={assessment.id} className="card-surface flex flex-wrap items-center gap-3 p-5">
              <span
                className={`rounded-md px-2 py-0.5 text-[0.7rem] font-bold uppercase ${assessment.kind === "exam" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}
              >
                {assessment.kind}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{assessment.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  Lecture {lecture?.number} · {assessment.duration_minutes} min · {assessment.difficulty}
                  {assessment.randomize ? " · randomised" : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant={editingId === assessment.id ? "default" : "outline"}
                onClick={() => setEditingId(editingId === assessment.id ? null : assessment.id)}
              >
                Questions
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraft({
                    id: assessment.id,
                    lecture_id: assessment.lecture_id,
                    kind: assessment.kind as AssessmentKind,
                    title: assessment.title,
                    description: assessment.description,
                    duration_minutes: assessment.duration_minutes,
                    difficulty: assessment.difficulty as Difficulty,
                    randomize: assessment.randomize,
                  })
                }
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (window.confirm("Delete this assessment?")) remove.mutate(assessment.id);
                }}
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          );
        })}
      </div>

      {editing && (
        <div className="card-surface mt-6 p-6">
          <p className="label-eyebrow">Questions in</p>
          <h2 className="mt-1 text-lg font-extrabold">{editing.title}</h2>
          <p className="text-xs text-muted-foreground">
            Lecture {editingLecture?.number} · {links?.length ?? 0} attached
          </p>

          <div className="mt-5 rounded-xl border border-border bg-secondary/30 p-4">
            <p className="flex items-center gap-2 text-sm font-bold">
              <Shuffle className="size-4 text-primary" /> Generate from question bank
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs">Questions</Label>
                <Input type="number" min={1} value={genCount} onChange={(e) => setGenCount(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Easy %</Label>
                <Input type="number" min={0} max={100} value={genEasy} onChange={(e) => setGenEasy(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Medium %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={genMedium}
                  onChange={(e) => setGenMedium(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hard %</Label>
                <Input type="number" min={0} max={100} value={genHard} onChange={(e) => setGenHard(Number(e.target.value))} />
              </div>
            </div>
            <Button size="sm" className="mt-3" onClick={generateFromBank}>
              Generate
            </Button>
          </div>

          <div className="mt-5 space-y-2">
            {(links ?? []).map((link, index) => {
              const question = bank?.find((q) => q.id === link.question_id);
              return (
                <div key={link.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
                  <span className="w-6 text-xs font-bold text-muted-foreground">{index + 1}</span>
                  <p className="min-w-0 flex-1 truncate text-sm">{question?.text ?? "Question"}</p>
                  <Button size="sm" variant="ghost" disabled={index === 0} onClick={() => movePosition.mutate({ index, direction: -1 })}>
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={index === (links?.length ?? 0) - 1}
                    onClick={() => movePosition.mutate({ index, direction: 1 })}
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => detach.mutate(link.id)}>
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-sm font-bold">Add manually</p>
          <div className="mt-2 space-y-2">
            {(bank ?? [])
              .filter((q) => !attachedIds.has(q.id))
              .map((question) => (
                <div key={question.id} className="flex items-center gap-2 rounded-lg border border-border p-3">
                  <span className="rounded-md border border-border px-1.5 py-0.5 text-[0.7rem] font-semibold capitalize text-muted-foreground">
                    {question.difficulty}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-sm">{question.text}</p>
                  <Button size="sm" variant="outline" onClick={() => attach.mutate([question.id])}>
                    <Check className="size-3.5" /> Add
                  </Button>
                </div>
              ))}
            {(bank ?? []).filter((q) => !attachedIds.has(q.id)).length === 0 && (
              <p className="text-xs text-muted-foreground">Every question in this course is already attached.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
