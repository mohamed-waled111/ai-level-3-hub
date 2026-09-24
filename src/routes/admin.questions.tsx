import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DIFFICULTIES, type Course, type Difficulty, type Lecture, type Question, type QuestionType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/questions")({
  component: AdminQuestions,
});

type Draft = {
  id?: string;
  course_id: string;
  lecture_id: string;
  type: QuestionType;
  text: string;
  image_url: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  difficulty: Difficulty;
  reference: string;
};

function emptyDraft(course_id: string, lecture_id: string): Draft {
  return {
    course_id,
    lecture_id,
    type: "mcq",
    text: "",
    image_url: "",
    options: ["", "", "", ""],
    correct_answer: "",
    explanation: "",
    difficulty: "medium",
    reference: "",
  };
}

function AdminQuestions() {
  const queryClient = useQueryClient();
  const [courseFilter, setCourseFilter] = useState("");
  const [lectureFilter, setLectureFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [usageFilter, setUsageFilter] = useState("");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [preview, setPreview] = useState<Question | null>(null);

  const { data: courses } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").order("sort_order");
      if (error) throw error;
      return data as Course[];
    },
  });

  const { data: lectures } = useQuery({
    queryKey: ["admin-all-lectures"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lectures").select("*").order("number");
      if (error) throw error;
      return data as Lecture[];
    },
  });

  const { data: questions } = useQuery({
    queryKey: ["admin-questions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("questions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Question[];
    },
  });

  const { data: used } = useQuery({
    queryKey: ["admin-question-usage"],
    queryFn: async () => {
      const { data } = await supabase.from("assessment_questions").select("question_id");
      return new Set((data ?? []).map((row) => row.question_id));
    },
  });

  const save = useMutation({
    mutationFn: async (value: Draft) => {
      const options = value.type === "true_false" ? ["True", "False"] : value.options.filter((o) => o.trim() !== "");
      const payload = {
        course_id: value.course_id,
        lecture_id: value.lecture_id || null,
        type: value.type,
        text: value.text,
        image_url: value.image_url || null,
        options,
        correct_answer: value.correct_answer,
        explanation: value.explanation,
        difficulty: value.difficulty,
        reference: value.reference || null,
      };
      if (!options.includes(value.correct_answer)) {
        throw new Error("The correct answer must match one of the options exactly.");
      }
      const { error } = value.id
        ? await supabase.from("questions").update(payload).eq("id", value.id)
        : await supabase.from("questions").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Question saved");
      setDraft(null);
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Question deleted");
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const duplicate = useMutation({
    mutationFn: async (question: Question) => {
      const { id, created_at, ...rest } = question;
      void id;
      void created_at;
      const { error } = await supabase.from("questions").insert({ ...rest, text: `${question.text} (copy)` });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Question duplicated");
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const filtered = (questions ?? []).filter((question) => {
    if (courseFilter && question.course_id !== courseFilter) return false;
    if (lectureFilter && question.lecture_id !== lectureFilter) return false;
    if (typeFilter && question.type !== typeFilter) return false;
    if (difficultyFilter && question.difficulty !== difficultyFilter) return false;
    if (usageFilter === "used" && !used?.has(question.id)) return false;
    if (usageFilter === "unused" && used?.has(question.id)) return false;
    if (search && !question.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const draftLectures = (lectures ?? []).filter((l) => l.course_id === (draft?.course_id ?? ""));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Question Bank</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Centralised questions, reusable across quizzes and exams.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setDraft(emptyDraft(courseFilter || courses?.[0]?.id || "", lectureFilter))}
          disabled={(courses?.length ?? 0) === 0}
        >
          <Plus className="size-4" /> New question
        </Button>
      </div>

      <div className="card-surface mt-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <Input placeholder="Search question text…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select
          className="h-9 rounded-md border border-input bg-card px-3 text-sm"
          value={courseFilter}
          onChange={(e) => {
            setCourseFilter(e.target.value);
            setLectureFilter("");
          }}
        >
          <option value="">All courses</option>
          {(courses ?? []).map((course) => (
            <option key={course.id} value={course.id}>
              {course.code}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-card px-3 text-sm"
          value={lectureFilter}
          onChange={(e) => setLectureFilter(e.target.value)}
        >
          <option value="">All lectures</option>
          {(lectures ?? [])
            .filter((l) => !courseFilter || l.course_id === courseFilter)
            .map((lecture) => (
              <option key={lecture.id} value={lecture.id}>
                Lecture {lecture.number} — {lecture.title}
              </option>
            ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-card px-3 text-sm"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All types</option>
          <option value="mcq">Multiple choice</option>
          <option value="true_false">True / False</option>
        </select>
        <select
          className="h-9 rounded-md border border-input bg-card px-3 text-sm"
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
        >
          <option value="">All difficulties</option>
          {DIFFICULTIES.map((difficulty) => (
            <option key={difficulty} value={difficulty}>
              {difficulty}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-card px-3 text-sm"
          value={usageFilter}
          onChange={(e) => setUsageFilter(e.target.value)}
        >
          <option value="">Used and unused</option>
          <option value="used">Used</option>
          <option value="unused">Unused</option>
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
            <Label>Course</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
              value={draft.course_id}
              onChange={(e) => setDraft({ ...draft, course_id: e.target.value, lecture_id: "" })}
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
              value={draft.lecture_id}
              onChange={(e) => setDraft({ ...draft, lecture_id: e.target.value })}
            >
              <option value="">Unassigned</option>
              {draftLectures.map((lecture) => (
                <option key={lecture.id} value={lecture.id}>
                  Lecture {lecture.number} — {lecture.title}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Question</Label>
            <Textarea rows={3} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label>Question type</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
              value={draft.type}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  type: e.target.value as QuestionType,
                  correct_answer: "",
                })
              }
            >
              <option value="mcq">Multiple choice</option>
              <option value="true_false">True / False</option>
            </select>
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

          {draft.type === "mcq" ? (
            <div className="space-y-2 sm:col-span-2">
              <Label>Options</Label>
              {draft.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-5 text-sm font-bold text-muted-foreground">{String.fromCharCode(65 + index)}</span>
                  <Input
                    value={option}
                    onChange={(e) => {
                      const next = [...draft.options];
                      next[index] = e.target.value;
                      setDraft({ ...draft, options: next });
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant={draft.correct_answer === option && option !== "" ? "default" : "outline"}
                    onClick={() => setDraft({ ...draft, correct_answer: option })}
                  >
                    Correct
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setDraft({ ...draft, options: [...draft.options, ""] })}
              >
                <Plus className="size-3.5" /> Add option
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Correct answer</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={draft.correct_answer}
                onChange={(e) => setDraft({ ...draft, correct_answer: e.target.value })}
              >
                <option value="">Choose…</option>
                <option value="True">True</option>
                <option value="False">False</option>
              </select>
            </div>
          )}

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Explanation</Label>
            <Textarea
              rows={3}
              value={draft.explanation}
              onChange={(e) => setDraft({ ...draft, explanation: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Image URL (optional)</Label>
            <Input value={draft.image_url} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Lecture section reference (optional)</Label>
            <Input value={draft.reference} onChange={(e) => setDraft({ ...draft, reference: e.target.value })} />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="sm" disabled={save.isPending}>
              Save question
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <p className="mt-6 text-xs text-muted-foreground">{filtered.length} questions</p>
      <div className="mt-3 space-y-3">
        {filtered.map((question) => {
          const course = courses?.find((c) => c.id === question.course_id);
          const lecture = lectures?.find((l) => l.id === question.lecture_id);
          return (
            <div key={question.id} className="card-surface p-5">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-1.5 text-[0.7rem] font-semibold text-muted-foreground">
                    <span className="rounded-md border border-border px-1.5 py-0.5">{course?.code}</span>
                    {lecture && (
                      <span className="rounded-md border border-border px-1.5 py-0.5">Lecture {lecture.number}</span>
                    )}
                    <span className="rounded-md border border-border px-1.5 py-0.5 capitalize">{question.difficulty}</span>
                    <span className="rounded-md border border-border px-1.5 py-0.5">
                      {question.type === "mcq" ? "MCQ" : "True/False"}
                    </span>
                    <span
                      className={`rounded-md px-1.5 py-0.5 ${used?.has(question.id) ? "bg-success/15 text-success" : "bg-secondary"}`}
                    >
                      {used?.has(question.id) ? "Used" : "Unused"}
                    </span>
                  </div>
                  <p className="mt-2 font-semibold">{question.text}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setPreview(preview?.id === question.id ? null : question)}>
                    <Eye className="size-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => duplicate.mutate(question)}>
                    <Copy className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDraft({
                        id: question.id,
                        course_id: question.course_id,
                        lecture_id: question.lecture_id ?? "",
                        type: question.type as QuestionType,
                        text: question.text,
                        image_url: question.image_url ?? "",
                        options: Array.isArray(question.options) ? question.options.map(String) : ["", "", "", ""],
                        correct_answer: question.correct_answer,
                        explanation: question.explanation,
                        difficulty: question.difficulty as Difficulty,
                        reference: question.reference ?? "",
                      })
                    }
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (window.confirm("Delete this question?")) remove.mutate(question.id);
                    }}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </div>

              {preview?.id === question.id && (
                <div className="mt-4 rounded-lg bg-secondary/40 p-4 text-sm">
                  <ul className="space-y-1">
                    {(Array.isArray(question.options) ? question.options.map(String) : []).map((option) => (
                      <li
                        key={option}
                        className={option === question.correct_answer ? "font-bold text-success" : "text-muted-foreground"}
                      >
                        {option}
                      </li>
                    ))}
                  </ul>
                  {question.explanation && <p className="mt-3 text-muted-foreground">{question.explanation}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
