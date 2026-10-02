import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, type ModelMessage, type UIMessage } from "ai";
import { z } from "zod";
import { createGatewayRunIdFetch, gatewayResponseHeaders } from "@/lib/ai-gateway.server";
import type { Database, Json } from "@/integrations/supabase/types";

const requestSchema = z.object({
  threadId: z.string().uuid(),
  messages: z.array(z.custom<UIMessage>()),
});

function safeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "The study assistant could not answer right now.";
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authorization = request.headers.get("authorization");
        if (!authorization?.startsWith("Bearer ")) {
          return Response.json({ message: "Please sign in to use the study assistant." }, { status: 401 });
        }

        const supabaseUrl = process.env["SUPABASE_URL"];
        const publishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
        const lovableApiKey = process.env["LOVABLE_API_KEY"];
        if (!supabaseUrl || !publishableKey || !lovableApiKey) {
          return Response.json({ message: "The study assistant is not configured." }, { status: 500 });
        }

        const parsed = requestSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ message: "Invalid chat request." }, { status: 400 });

        const supabase = createClient<Database>(supabaseUrl, publishableKey, {
          global: { headers: { Authorization: authorization } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: authData, error: authError } = await supabase.auth.getUser(authorization.slice(7));
        if (authError || !authData.user) {
          return Response.json({ message: "Your session has expired. Please sign in again." }, { status: 401 });
        }

        const { data: thread, error: threadError } = await supabase
          .from("summary_chat_threads")
          .select("id, title, lecture_id, lectures(number, title, courses(code, title)), summaries:lectures(summaries(id, published))")
          .eq("id", parsed.data.threadId)
          .eq("user_id", authData.user.id)
          .maybeSingle();
        if (threadError) return Response.json({ message: threadError.message }, { status: 500 });
        if (!thread) return Response.json({ message: "Conversation not found." }, { status: 404 });

        const { data: summary, error: summaryError } = await supabase
          .from("summaries")
          .select("id, published, content")
          .eq("lecture_id", thread.lecture_id)
          .eq("published", true)
          .maybeSingle();
        if (summaryError) return Response.json({ message: summaryError.message }, { status: 500 });
        if (!summary) return Response.json({ message: "This summary is not published." }, { status: 403 });

        const { data: files, error: filesError } = await supabase
          .from("summary_files")
          .select("storage_path, original_file_name, file_type, page_order")
          .eq("summary_id", summary.id)
          .order("page_order");
        if (filesError) return Response.json({ message: filesError.message }, { status: 500 });
        if (!files?.length && !summary.content.trim()) {
          return Response.json({ message: "This summary has no readable material yet." }, { status: 400 });
        }

        const signedFiles = await Promise.all((files ?? []).map(async (file) => {
          const { data, error } = await supabase.storage.from("summary-files").createSignedUrl(file.storage_path, 3600);
          if (error) throw error;
          return { ...file, url: data.signedUrl };
        })).catch((error: unknown) => error);
        if (signedFiles instanceof Error) return Response.json({ message: signedFiles.message }, { status: 500 });

        const userMessages = parsed.data.messages.filter((message) => message.role === "user");
        const latestUser = userMessages.at(-1);
        if (!latestUser) return Response.json({ message: "Ask a question to continue." }, { status: 400 });

        const { error: saveUserError } = await supabase.from("summary_chat_messages").upsert({
          thread_id: thread.id,
          user_id: authData.user.id,
          sdk_message_id: latestUser.id,
          role: "user",
          parts: latestUser.parts as unknown as Json,
        }, { onConflict: "thread_id,sdk_message_id", ignoreDuplicates: true });
        if (saveUserError) return Response.json({ message: saveUserError.message }, { status: 500 });

        const lecture = thread.lectures as unknown as { number: number; title: string; courses: { code: string; title: string } } | null;
        const referenceParts: ModelMessage[] = [{
          role: "user",
          content: [
            ...(summary.content.trim() ? [{ type: "text" as const, text: `Summary text:\n${summary.content}` }] : []),
            ...signedFiles.map((file) => ({
              type: "file" as const,
              data: new URL(file.url),
              mediaType: file.file_type === "pdf" ? "application/pdf" : "image/*",
              filename: file.original_file_name,
            })),
            { type: "text" as const, text: "The files above are the complete selected lecture summary." },
          ],
        }];

        const modelMessages = await convertToModelMessages(parsed.data.messages);
        const runIdFetch = createGatewayRunIdFetch(request.headers.get("X-Lovable-AIG-Run-ID") ?? undefined);
        const openai = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey: lovableApiKey,
          headers: {
            "Lovable-API-Key": lovableApiKey,
            "X-Lovable-AIG-SDK": "vercel-ai-sdk",
          },
          fetch: runIdFetch.fetch,
        });

        const result = streamText({
          model: openai.responses("openai/gpt-6-astra"),
          maxRetries: 0,
          system: `You are the private Level 3 Academic Hub study assistant for ${lecture?.courses.code ?? "this course"}, Lecture ${lecture?.number ?? ""}: ${lecture?.title ?? "selected lecture"}. Answer only from the supplied summary. If the summary does not support an answer, say exactly that and suggest what related detail the student can look for in the summary. Never invent facts or use outside knowledge. Explain clearly and concisely, using equations or short lists when useful.`,
          messages: [...referenceParts, ...modelMessages],
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "medium",
              reasoningSummary: "auto",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
        });

        const response = result.toUIMessageStreamResponse({
          originalMessages: parsed.data.messages,
          sendReasoning: true,
          onError: safeErrorMessage,
          onFinish: async ({ responseMessage, isAborted }) => {
            if (isAborted) return;
            const { error } = await supabase.from("summary_chat_messages").upsert({
              thread_id: thread.id,
              user_id: authData.user.id,
              sdk_message_id: responseMessage.id,
              role: "assistant",
              parts: responseMessage.parts as unknown as Json,
            }, { onConflict: "thread_id,sdk_message_id", ignoreDuplicates: true });
            if (error) throw error;

            const firstQuestion = latestUser.parts
              .filter((part) => part.type === "text")
              .map((part) => part.text)
              .join(" ")
              .trim();
            const title = thread.title === "New conversation" && firstQuestion
              ? firstQuestion.slice(0, 64)
              : thread.title;
            const { error: updateError } = await supabase
              .from("summary_chat_threads")
              .update({ title, updated_at: new Date().toISOString() })
              .eq("id", thread.id);
            if (updateError) throw updateError;
          },
        });
        const headers = new Headers(response.headers);
        gatewayResponseHeaders(runIdFetch.getRunId()).forEach((value, key) => headers.set(key, value));
        return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
      },
    },
  },
});