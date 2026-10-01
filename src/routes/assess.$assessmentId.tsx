import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  Flag,
  ScrollText,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell, Container, EmptyState, ProgressBar, StatTile } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { questionOptions, type Question, type RunMode } from "@/lib/types";

export const Route = createFileRoute("/assess/$assessmentId")({
  head: () => ({
    meta: [
      { title: "Assessment — Level 3 Academic Hub" },
      { name: "description", content: "Take a lecture quiz or exam in exam mode or instant feedback mode." },
      { property: "og:title", content: "Assessment — Level 3 Academic Hub" },
      { property: "og:description", content: "Practice quizzes and mock exams for Level 3 courses." },
    ],
  }),
  component: AssessmentPage,
  errorComponent: ({ error }) => (
    <AppShell>
      <Container className="py-16">
        <p role="alert">{error instanceof Error ? error.message : "The assessment could not be loaded."}</p>
      </Container>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <Container className="py-16">
        <p>Assessment not found.</p>
      </Container>
    </AppShell>
  ),
});

type Stage = "mode" | "run" | "result";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = copy[i] as T;
    const b = copy[j] as T;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}

function AssessmentPage() {
  const { assessmentId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [stage, setStage] = useState<Stage>("mode");
  const [mode, setMode] = useState<RunMode>("exam");
  const [order, setOrder] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [startedAt, setStartedAt] = useState<number>(0);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<{
    correct: number;
    incorrect: number;
    unanswered: number;
    total: number;
    percent: number;
    seconds: number;
  } | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["assessment", assessmentId],
    enabled: Boolean(user),
    queryFn: async () => {
      const assessment = await supabase
        .from("assessments")
        .select("*, lectures(id, number, title, course_id, courses(id, code, title))")
        .eq("id", assessmentId)
        .maybeSingle();
      const rows = await supabase
        .from("assessment_questions")
        .select("position, questions(*)")
        .eq("assessment_id", assessmentId)
        .order("position");
      const questions = (rows.data ?? [])
        .map((row) => (row as unknown as { questions: Question }).questions)
        .filter(Boolean);
      return { assessment: assessment.data, questions };
    },
  });

  const assessment = data?.assessment as
    | (import("@/lib/types").Assessment & {
        lectures?: { id: string; number: number; title: string; course_id: string; courses?: { id: string; code: string; title: string } };
      })
    | null
    | undefined;
  const lecture = assessment?.lectures;
  const course = lecture?.courses;
  const questions = data?.questions ?? [];

  const durationSeconds = (assessment?.duration_minutes ?? 15) * 60;
  const remaining = Math.max(0, durationSeconds - elapsed);

  useEffect(() => {
    if (stage !== "run") return;
    const timer = window.setInterval(() => {
      setElapsed(Math.round((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [stage, startedAt]);

  const current = order[index];
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  function begin(selected: RunMode) {
    if (questions.length === 0) return;
    setMode(selected);
    setOrder(assessment?.randomize ? shuffle(questions) : questions);
    setIndex(0);
    setAnswers({});
    setRevealed({});
    setFlagged({});
    setStartedAt(Date.now());
    setElapsed(0);
    setResult(null);
    setReviewing(false);
    setStage("run");
  }

  async function submit() {
    if (!user || saving) return;
    setSaving(true);
    const seconds = Math.round((Date.now() - startedAt) / 1000);
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;
    order.forEach((question) => {
      const answer = answers[question.id];
      if (!answer) unanswered += 1;
      else if (answer === question.correct_answer) correct += 1;
      else incorrect += 1;
    });
    const total = order.length;
    const percent = total === 0 ? 0 : Math.round((correct / total) * 100);

    try {
      const attempt = await supabase
        .from("attempts")
        .insert({
          user_id: user.id,
          assessment_id: assessmentId,
          mode,
          total,
          correct,
          incorrect,
          unanswered,
          score_percent: percent,
          time_used_seconds: seconds,
        })
        .select("id")
        .single();
      if (attempt.error) throw attempt.error;

      const rows = order.map((question, position) => ({
        attempt_id: attempt.data.id,
        question_id: question.id,
        answer: answers[question.id] ?? null,
        is_correct: answers[question.id] === question.correct_answer,
        position,
      }));
      if (rows.length > 0) {
        const inserted = await supabase.from("attempt_answers").insert(rows);
        if (inserted.error) throw inserted.error;
      }
      void queryClient.invalidateQueries({ queryKey: ["overview"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your attempt");
    } finally {
      setSaving(false);
    }

    setResult({ correct, incorrect, unanswered, total, percent, seconds });
    setStage("result");
  }

  useEffect(() => {
    if (stage === "run" && mode === "exam" && remaining === 0 && elapsed > 0) {
      void submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, stage, mode]);

  const breadcrumbs = [
    { label: "Courses", to: "/courses" },
    ...(course ? [{ label: course.title, to: "/courses/$courseId", params: { courseId: course.id } }] : []),
    ...(lecture ? [{ label: `Lecture ${String(lecture.number).padStart(2, "0")}` }] : []),
    { label: assessment?.kind === "exam" ? "Exam" : "Quiz" },
  ];

  return (
    <AppShell>
      <Container className="py-8">
        <Breadcrumbs items={breadcrumbs} />

        {isLoading && <p className="mt-8 text-sm text-muted-foreground">Loading assessment…</p>}

        {!isLoading && questions.length === 0 && (
          <div className="mt-8">
            <EmptyState
              title="No questions yet"
              description="This assessment has no questions attached yet. Please check back later."
              action={
                course ? (
                  <Button asChild size="sm" className="mt-3">
                    <Link to="/courses/$courseId" params={{ courseId: course.id }}>
                      Back to course
                    </Link>
                  </Button>
                ) : undefined
              }
            />
          </div>
        )}

        {stage === "mode" && questions.length > 0 && (
          <div className="mt-6 max-w-3xl">
            <p className="label-eyebrow">
              {course?.code} · Lecture {String(lecture?.number ?? "").padStart(2, "0")}
            </p>
            <h1 className="mt-1.5 text-3xl font-extrabold">{assessment?.title}</h1>
            <p className="mt-2 text-muted-foreground">
              {assessment?.description ||
                (assessment?.kind === "exam"
                  ? "A longer assessment covering the lecture."
                  : "Practice with questions specifically based on this lecture.")}
            </p>

            <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
              <span className="rounded-md border border-border px-2 py-1">{questions.length} questions</span>
              <span className="rounded-md border border-border px-2 py-1 capitalize">{assessment?.difficulty}</span>
              <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1">
                <Clock className="size-3.5" /> {assessment?.duration_minutes} min
              </span>
            </div>

            <h2 className="mt-9 text-lg font-bold">Choose how you want to work</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <button onClick={() => begin("exam")} className="card-interactive p-6 text-left">
                <span className="flex size-10 items-center justify-center rounded-lg bg-secondary">
                  {assessment?.kind === "exam" ? <ScrollText className="size-5" /> : <ClipboardList className="size-5" />}
                </span>
                <span className="mt-4 block font-bold">Exam Mode</span>
                <span className="mt-1.5 block text-sm text-muted-foreground">
                  Answer everything with a timer running, then submit for your full result and review.
                </span>
              </button>
              <button onClick={() => begin("instant")} className="card-interactive p-6 text-left">
                <span className="flex size-10 items-center justify-center rounded-lg bg-secondary">
                  <Zap className="size-5" />
                </span>
                <span className="mt-4 block font-bold">Instant Feedback Mode</span>
                <span className="mt-1.5 block text-sm text-muted-foreground">
                  See whether each answer is right, with the correct answer and explanation, before moving on.
                </span>
              </button>
            </div>
          </div>
        )}

        {stage === "run" && current && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_260px]">
            <div>
              <div className="card-surface p-5 sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="label-eyebrow">
                      {course?.code} · Lecture {String(lecture?.number ?? "").padStart(2, "0")}
                    </p>
                    <p className="mt-0.5 text-sm font-bold">{assessment?.title}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-semibold">
                    <span className="text-muted-foreground">
                      Question {index + 1} / {order.length}
                    </span>
                    {mode === "exam" && (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1">
                        <Clock className="size-3.5" />
                        {String(Math.floor(remaining / 60)).padStart(2, "0")}:
                        {String(remaining % 60).padStart(2, "0")}
                      </span>
                    )}
                  </div>
                </div>

                <ProgressBar value={((index + 1) / order.length) * 100} className="mt-4" />

                <div className="mt-7">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-lg font-bold leading-snug sm:text-xl">{current.text}</h2>
                    <button
                      onClick={() => setFlagged((f) => ({ ...f, [current.id]: !f[current.id] }))}
                      className={`shrink-0 rounded-md border border-border p-2 transition-colors ${
                        flagged[current.id] ? "bg-accent text-accent-foreground" : "hover:bg-secondary"
                      }`}
                      aria-label="Mark for review"
                    >
                      <Flag className="size-4" />
                    </button>
                  </div>
                  {current.image_url && (
                    <img
                      src={current.image_url}
                      alt=""
                      className="mt-4 max-h-80 rounded-lg border border-border object-contain"
                    />
                  )}
                  <span className="mt-3 inline-block rounded-md border border-border px-2 py-0.5 text-[0.7rem] font-semibold capitalize text-muted-foreground">
                    {current.difficulty}
                  </span>
                </div>

                <div className="mt-6 space-y-3">
                  {questionOptions(current).map((option) => {
                    const selected = answers[current.id] === option;
                    const isRevealed = mode === "instant" && revealed[current.id];
                    const isCorrect = option === current.correct_answer;
                    let tone = "border-border bg-card hover:border-accent/50 hover:bg-secondary/50";
                    if (isRevealed && isCorrect) tone = "border-success bg-success/10";
                    else if (isRevealed && selected && !isCorrect) tone = "border-destructive bg-destructive/10";
                    else if (selected) tone = "border-primary bg-secondary";
                    return (
                      <button
                        key={option}
                        disabled={mode === "instant" && Boolean(revealed[current.id])}
                        onClick={() => {
                          setAnswers((a) => ({ ...a, [current.id]: option }));
                          if (mode === "instant") setRevealed((r) => ({ ...r, [current.id]: true }));
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-all ${tone}`}
                      >
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border text-xs font-bold">
                          {option === "True" || option === "False" ? option[0] : String.fromCharCode(65 + questionOptions(current).indexOf(option))}
                        </span>
                        <span className="flex-1">{option}</span>
                        {isRevealed && isCorrect && <CheckCircle2 className="size-4 text-success" />}
                        {isRevealed && selected && !isCorrect && <XCircle className="size-4 text-destructive" />}
                      </button>
                    );
                  })}
                </div>

                {mode === "instant" && revealed[current.id] && (
                  <div className="mt-5 rounded-xl border border-border bg-secondary/40 p-4">
                    <p className="text-sm font-bold">
                      {answers[current.id] === current.correct_answer ? "✓ Correct" : "✕ Incorrect"}
                    </p>
                    <p className="mt-1 text-sm">
                      <span className="font-semibold">Correct answer:</span> {current.correct_answer}
                    </p>
                    {current.explanation && (
                      <>
                        <p className="mt-3 label-eyebrow">Explanation</p>
                        <p className="mt-1 text-sm text-muted-foreground">{current.explanation}</p>
                      </>
                    )}
                  </div>
                )}

                <div className="mt-7 flex items-center justify-between gap-3">
                  <Button variant="outline" size="sm" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
                    <ArrowLeft className="size-4" /> Previous
                  </Button>
                  {index < order.length - 1 ? (
                    <Button size="sm" onClick={() => setIndex((i) => i + 1)}>
                      Next <ArrowRight className="size-4" />
                    </Button>
                  ) : (
                    <Button size="sm" onClick={submit} disabled={saving}>
                      {saving ? "Submitting…" : "Submit"}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <aside className="card-surface h-fit p-5">
              <p className="label-eyebrow">Question palette</p>
              <div className="mt-3 grid grid-cols-6 gap-2 lg:grid-cols-5">
                {order.map((question, position) => {
                  const answered = Boolean(answers[question.id]);
                  return (
                    <button
                      key={question.id}
                      onClick={() => setIndex(position)}
                      className={`relative flex aspect-square items-center justify-center rounded-md border text-xs font-bold transition-colors ${
                        position === index
                          ? "border-primary bg-primary text-primary-foreground"
                          : answered
                            ? "border-border bg-secondary"
                            : "border-border bg-card text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {position + 1}
                      {flagged[question.id] && (
                        <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-accent" />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 space-y-1 text-xs text-muted-foreground">
                <p>
                  Answered: <strong className="text-foreground">{answeredCount}</strong> / {order.length}
                </p>
                <p>
                  Marked for review:{" "}
                  <strong className="text-foreground">{Object.values(flagged).filter(Boolean).length}</strong>
                </p>
              </div>
              <Button className="mt-5 w-full" size="sm" onClick={submit} disabled={saving}>
                Submit {assessment?.kind === "exam" ? "Exam" : "Quiz"}
              </Button>
            </aside>
          </div>
        )}

        {stage === "result" && result && (
          <div className="mt-6 max-w-3xl">
            <p className="label-eyebrow">Assessment Complete</p>
            <h1 className="mt-2 text-5xl font-extrabold">{result.percent}%</h1>
            <p className="mt-2 text-muted-foreground">
              {assessment?.title} · {mode === "exam" ? "Exam mode" : "Instant feedback mode"}
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatTile label="Correct" value={result.correct} />
              <StatTile label="Incorrect" value={result.incorrect} />
              <StatTile label="Unanswered" value={result.unanswered} />
              <StatTile
                label="Time used"
                value={`${Math.floor(result.seconds / 60)}m ${result.seconds % 60}s`}
              />
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button onClick={() => setReviewing((v) => !v)}>
                {reviewing ? "Hide review" : "Review Answers"}
              </Button>
              <Button variant="outline" onClick={() => setStage("mode")}>
                Try Again
              </Button>
              {course && (
                <Button asChild variant="ghost">
                  <Link to="/courses/$courseId" params={{ courseId: course.id }}>
                    Back to Course
                  </Link>
                </Button>
              )}
            </div>

            {reviewing && (
              <div className="mt-8 space-y-4">
                {order.map((question, position) => {
                  const answer = answers[question.id];
                  const correct = answer === question.correct_answer;
                  return (
                    <div key={question.id} className="card-surface p-5">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold">
                          {position + 1}. {question.text}
                        </p>
                        {correct ? (
                          <CheckCircle2 className="size-5 shrink-0 text-success" />
                        ) : (
                          <XCircle className="size-5 shrink-0 text-destructive" />
                        )}
                      </div>
                      <p className="mt-3 text-sm">
                        <span className="text-muted-foreground">Your answer: </span>
                        <span className={correct ? "font-semibold text-success" : "font-semibold text-destructive"}>
                          {answer ?? "Not answered"}
                        </span>
                      </p>
                      <p className="mt-1 text-sm">
                        <span className="text-muted-foreground">Correct answer: </span>
                        <span className="font-semibold">{question.correct_answer}</span>
                      </p>
                      {question.explanation && (
                        <p className="mt-3 rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground">
                          {question.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Container>
    </AppShell>
  );
}
