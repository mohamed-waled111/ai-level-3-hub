CREATE TABLE public.summary_chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lecture_id uuid NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.summary_chat_threads TO authenticated;
GRANT ALL ON public.summary_chat_threads TO service_role;

ALTER TABLE public.summary_chat_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own summary chat threads"
ON public.summary_chat_threads
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Students create own summary chat threads"
ON public.summary_chat_threads
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.summaries s
    WHERE s.lecture_id = summary_chat_threads.lecture_id
      AND s.published = true
  )
);

CREATE POLICY "Students update own summary chat threads"
ON public.summary_chat_threads
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students delete own summary chat threads"
ON public.summary_chat_threads
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX summary_chat_threads_owner_lecture_updated_idx
ON public.summary_chat_threads(user_id, lecture_id, updated_at DESC);

CREATE TRIGGER summary_chat_threads_touch
BEFORE UPDATE ON public.summary_chat_threads
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.summary_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.summary_chat_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  sdk_message_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, sdk_message_id)
);

GRANT SELECT, INSERT, DELETE ON public.summary_chat_messages TO authenticated;
GRANT ALL ON public.summary_chat_messages TO service_role;

ALTER TABLE public.summary_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own summary chat messages"
ON public.summary_chat_messages
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.summary_chat_threads t
    WHERE t.id = summary_chat_messages.thread_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Students create own summary chat messages"
ON public.summary_chat_messages
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.summary_chat_threads t
    WHERE t.id = summary_chat_messages.thread_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Students delete own summary chat messages"
ON public.summary_chat_messages
FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.summary_chat_threads t
    WHERE t.id = summary_chat_messages.thread_id
      AND t.user_id = auth.uid()
  )
);

CREATE INDEX summary_chat_messages_thread_created_idx
ON public.summary_chat_messages(thread_id, created_at);
