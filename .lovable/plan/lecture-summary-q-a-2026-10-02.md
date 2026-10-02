# Lecture Summary Q&A

## Goal
Add a private, lecture-specific study assistant where students can create multiple conversations and ask questions grounded only in the selected published summary.

## Student experience
- Add an **Ask about this summary** action on each published summary page.
- Open a dedicated conversation page with the full Course / Lecture / Summary context in its breadcrumbs.
- Show a compact conversation list, a **New conversation** action, and a stable URL for every conversation so reloads restore the correct history.
- Stream answers as they are generated, show a clear thinking state, keep the question box focused, and support stopping an in-progress answer.
- Render messages with the established academic visual language and responsive layouts; conversation navigation collapses cleanly on mobile.
- Clearly state when an answer cannot be found in the selected summary rather than inventing outside information.

## Private history and access
- Add conversation and message records tied to the signed-in student and lecture.
- Enforce ownership in the database: students can only read, create, rename, and delete their own conversations and messages.
- Require the selected lecture to have a published summary before a conversation can be created or answered.
- Save completed user and assistant messages to the selected conversation; changing or reloading conversation URLs restores only that conversation.

## Summary-grounded AI
- Add a protected streaming endpoint that verifies the signed-in user owns the conversation.
- Load the lecture, published summary, and ordered summary files on the server.
- Send the summary PDF or ordered images as private document context together with the conversation history, using the workspace AI Gateway and the required streaming Responses protocol.
- Instruct the model to answer from the summary only, identify uncertainty, and avoid claiming unsupported facts.
- Keep credentials, document access, and prompts server-side. Surface safe gateway errors for configuration, credit, policy, rate-limit, and service failures without silently retrying terminal errors.

## Technical details
- Add `summary_chat_threads` and `summary_chat_messages` with explicit grants, row-level security, ownership policies, foreign keys, uniqueness for message IDs, and indexes for lecture/thread ordering.
- Install the AI SDK, OpenAI adapter, React chat hook, and the official AI Elements conversation/message/prompt/loading primitives.
- Add server-only gateway run-ID and Responses helpers, plus the authenticated chat handler.
- Add client-safe conversation create/list/delete functions and the dedicated `/lectures/:lectureId/summary/chat/:threadId` page.
- Update generated database types and project architecture notes.
- Verify two separate conversations retain isolated history after reload, document grounding works for both PDF and image summaries, unauthorized conversation access is blocked, and desktop/mobile layouts remain usable.
