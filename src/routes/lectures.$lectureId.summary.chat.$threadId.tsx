import { useChat } from "@ai-sdk/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Bot, MessageSquareText, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { AppShell, Container, EmptyState } from "@/components/app-shell";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputBody, PromptInputFooter, PromptInputSubmit, PromptInputTextarea, PromptInputTools } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Breadcrumbs } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/lectures/$lectureId/summary/chat/$threadId")({
  head: () => ({ meta: [
    { title: "Ask About This Summary — Level 3 Academic Hub" },
    { name: "description", content: "Ask private questions grounded in a selected lecture summary." },
    { property: "og:title", content: "Ask About This Summary — Level 3 Academic Hub" },
    { property: "og:description", content: "Ask private questions grounded in a selected lecture summary." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: SummaryChatPage,
});

type Thread = { id: string; title: string; updated_at: string };

function SummaryChatPage() {
  const { lectureId, threadId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["summary-chat", lectureId, threadId, user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const [lectureResult, summaryResult, threadsResult, activeResult, messagesResult] = await Promise.all([
        supabase.from("lectures").select("id, number, title, courses(id, code, title)").eq("id", lectureId).maybeSingle(),
        supabase.from("summaries").select("id, published").eq("lecture_id", lectureId).eq("published", true).maybeSingle(),
        supabase.from("summary_chat_threads").select("id, title, updated_at").eq("lecture_id", lectureId).order("updated_at", { ascending: false }),
        supabase.from("summary_chat_threads").select("id, title").eq("id", threadId).eq("lecture_id", lectureId).maybeSingle(),
        supabase.from("summary_chat_messages").select("sdk_message_id, role, parts").eq("thread_id", threadId).order("created_at"),
      ]);
      const firstError = [lectureResult.error, summaryResult.error, threadsResult.error, activeResult.error, messagesResult.error].find(Boolean);
      if (firstError) throw firstError;
      return {
        lecture: lectureResult.data as unknown as { id: string; number: number; title: string; courses: { id: string; code: string; title: string } } | null,
        summary: summaryResult.data,
        threads: (threadsResult.data ?? []) as Thread[],
        active: activeResult.data,
        messages: (messagesResult.data ?? []).map((message) => ({
          id: message.sdk_message_id,
          role: message.role as "user" | "assistant",
          parts: message.parts as unknown as UIMessage["parts"],
        } satisfies UIMessage)),
      };
    },
  });

  if (loading || isLoading) return <AppShell><Container className="py-16"><p className="text-sm text-muted-foreground">Opening conversation…</p></Container></AppShell>;
  if (!user) return null;
  if (error || !data?.lecture || !data.summary || !data.active) {
    return <AppShell><Container className="py-16"><EmptyState title="Conversation unavailable" description={error instanceof Error ? error.message : "This conversation or published summary could not be found."} /></Container></AppShell>;
  }

  return <ChatWorkspace key={threadId} lectureId={lectureId} threadId={threadId} userId={user.id} data={data} onChanged={() => queryClient.invalidateQueries({ queryKey: ["summary-chat", lectureId] })} />;
}

function ChatWorkspace({ lectureId, threadId, userId, data, onChanged }: {
  lectureId: string;
  threadId: string;
  userId: string;
  data: NonNullable<ReturnType<typeof useQuery>["data"]> & { lecture: { id: string; number: number; title: string; courses: { id: string; code: string; title: string } }; threads: Thread[]; messages: UIMessage[] };
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/chat",
    prepareSendMessagesRequest: async ({ messages }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      return {
        body: { threadId, messages },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      };
    },
  }), [threadId]);
  const { messages, sendMessage, status, stop, error } = useChat({
    id: threadId,
    messages: data.messages,
    transport,
    onFinish: onChanged,
    onError: (chatError) => toast.error(chatError.message),
  });

  useEffect(() => { textareaRef.current?.focus(); }, [threadId, status]);

  async function createThread() {
    const { data: created, error: createError } = await supabase.from("summary_chat_threads").insert({ lecture_id: lectureId, user_id: userId }).select("id").single();
    if (createError) return toast.error(createError.message);
    navigate({ to: "/lectures/$lectureId/summary/chat/$threadId", params: { lectureId, threadId: created.id } });
  }

  async function removeThread(id: string) {
    const { error: removeError } = await supabase.from("summary_chat_threads").delete().eq("id", id);
    if (removeError) return toast.error(removeError.message);
    const next = data.threads.find((thread) => thread.id !== id);
    if (next) navigate({ to: "/lectures/$lectureId/summary/chat/$threadId", params: { lectureId, threadId: next.id } });
    else {
      const { data: created, error: createError } = await supabase.from("summary_chat_threads").insert({ lecture_id: lectureId, user_id: userId }).select("id").single();
      if (createError) return toast.error(createError.message);
      navigate({ to: "/lectures/$lectureId/summary/chat/$threadId", params: { lectureId, threadId: created.id } });
    }
  }

  const course = data.lecture.courses;
  return (
    <AppShell>
      <Container className="py-8">
        <Breadcrumbs items={[{ label: "Courses", to: "/courses" }, { label: course.title, to: "/courses/$courseId", params: { courseId: course.id } }, { label: `Lecture ${String(data.lecture.number).padStart(2, "0")}` }, { label: "Summary", to: "/lectures/$lectureId/summary", params: { lectureId } }, { label: "Ask" }]} />
        <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
          <div><p className="label-eyebrow">{course.code} · Lecture {String(data.lecture.number).padStart(2, "0")}</p><h1 className="mt-1.5 text-3xl font-extrabold">Ask about this summary</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Answers are limited to the selected lecture summary.</p></div>
          <Button asChild variant="outline" size="sm"><Link to="/lectures/$lectureId/summary" params={{ lectureId }}>View summary</Link></Button>
        </div>

        <div className="mt-7 grid min-h-[42rem] overflow-hidden rounded-lg border border-border bg-card shadow-sm lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="border-b border-border bg-secondary/25 p-3 lg:border-r lg:border-b-0">
            <Button className="w-full justify-start" size="sm" onClick={createThread}><Plus className="size-4" /> New conversation</Button>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
              {data.threads.map((thread) => (
                <div key={thread.id} className={`flex min-w-56 items-center rounded-md border ${thread.id === threadId ? "border-primary bg-card" : "border-transparent"}`}>
                  <Link to="/lectures/$lectureId/summary/chat/$threadId" params={{ lectureId, threadId: thread.id }} className="min-w-0 flex-1 px-3 py-2 text-left text-sm font-medium"><span className="block truncate">{thread.title}</span></Link>
                  <Button variant="ghost" size="icon-sm" aria-label={`Delete ${thread.title}`} onClick={() => removeThread(thread.id)}><Trash2 className="size-3.5" /></Button>
                </div>
              ))}
            </div>
          </aside>

          <section className="flex min-h-[38rem] min-w-0 flex-col">
            <div className="border-b border-border px-5 py-3"><p className="truncate text-sm font-semibold">{data.active.title}</p></div>
            <Conversation className="min-h-0 flex-1">
              <ConversationContent className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
                {messages.length === 0 && <ConversationEmptyState icon={<MessageSquareText className="size-8" />} title="Start with the lecture summary" description="Ask for an explanation, comparison, example, or revision question." />}
                {messages.map((message) => (
                  <Message key={message.id} from={message.role}>
                    <MessageContent>
                      {message.parts.map((part, index) => part.type === "text" ? <MessageResponse key={`${message.id}-${index}`}>{part.text}</MessageResponse> : null)}
                    </MessageContent>
                  </Message>
                ))}
                {status === "submitted" && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Bot className="size-4 text-primary" /><Shimmer>Reading the summary…</Shimmer></div>}
                {error && <p role="alert" className="text-sm text-destructive">{error.message}</p>}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>
            <div className="border-t border-border bg-background p-3 sm:p-4">
              <PromptInput className="mx-auto max-w-3xl" onSubmit={({ text }) => { const question = text.trim(); if (question) void sendMessage({ text: question }); }}>
                <PromptInputBody><PromptInputTextarea ref={textareaRef} aria-label="Ask about this lecture summary" placeholder="Ask a question about this summary…" /></PromptInputBody>
                <PromptInputFooter><PromptInputTools><span className="px-1 text-xs text-muted-foreground">Summary only</span></PromptInputTools><PromptInputSubmit status={status} onStop={stop} /></PromptInputFooter>
              </PromptInput>
            </div>
          </section>
        </div>
      </Container>
    </AppShell>
  );
}