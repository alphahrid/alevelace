## A-Level Mastery App

A study companion covering Maths, Further Maths, Physics, Chemistry, Biology, History, Economics, Psychology, and Business Studies — tagged for both Cambridge (CAIE) and Edexcel.

### Core features
1. **Auth & profiles** — email/password + Google sign-in. Profile stores name, exam board preference (Cambridge / Edexcel / both), and selected subjects.
2. **Subject & topic browser** — pick subject → syllabus topic tree (e.g. Maths → Pure → Differentiation). Each topic has theory notes, flashcards, quizzes.
3. **AI tutor chat** — per-topic chat. Streamed responses via Lovable AI. Renders markdown + LaTeX (KaTeX) so it can show worked maths solutions step-by-step. Conversation history saved per user.
4. **Flashcards with spaced repetition** — SM-2 style scheduling (due dates, ease factor). Auto-generate decks from a topic with AI, plus user-created cards. Daily review queue.
5. **Practice quizzes** — multiple choice + short answer. AI generates questions per topic and marks short answers with feedback. Tracks accuracy per topic to surface weak areas.
6. **Mock exam mode** — timed paper of mixed questions for a subject/board, with end-of-paper marking and breakdown.
7. **Progress dashboard** — streak, minutes studied, mastery % per topic, weak-topic recommendations.

### Pages (routes)
```
/                      landing + subject picker
/login, /signup        auth
/dashboard             progress + due reviews + continue studying
/subjects              all subjects grid
/subjects/$subject     topic tree for that subject
/topic/$topicId        topic hub (theory · flashcards · quiz · tutor)
/topic/$topicId/tutor  AI tutor chat
/topic/$topicId/cards  flashcard review
/topic/$topicId/quiz   quiz runner
/exam/$subject         mock exam runner
/settings              board, subjects, account
```
All under an `_authenticated` layout except landing/login/signup.

### Data model (Lovable Cloud)
- `profiles` (id, display_name, exam_boards[], selected_subjects[])
- `subjects` (id, name, board) and `topics` (id, subject_id, parent_id, name, order, syllabus_ref) — seeded
- `notes` (topic_id, content_md) — AI-generated, cached
- `flashcards` (id, user_id, topic_id, front, back, type)
- `card_reviews` (card_id, user_id, ease, interval_days, due_at, last_reviewed) — SM-2
- `quiz_questions` (id, topic_id, board, type, prompt, choices, answer, explanation)
- `quiz_attempts` (id, user_id, topic_id, score, total, started_at)
- `attempt_answers` (attempt_id, question_id, user_answer, correct, ai_feedback)
- `tutor_conversations` (id, user_id, topic_id, title) + `tutor_messages` (conv_id, role, content)
- `study_sessions` (user_id, topic_id, minutes, date) for streaks
RLS on every user-scoped table (own rows only).

### AI usage (Lovable AI Gateway, via server functions)
- `tutor.stream` — streamed chat with system prompt tailored to topic + board.
- `generate.flashcards` — structured output → batch of cards for a topic.
- `generate.quiz` — structured output → MCQ + short-answer set.
- `grade.shortAnswer` — marks free-text vs mark scheme with reasoning + score.
Default model: `google/gemini-3-flash-preview`; bump to `gemini-2.5-pro` for marking/maths reasoning.

### Stack
- TanStack Start routes; shadcn/ui; Tailwind tokens.
- KaTeX for math rendering, react-markdown for content.
- Lovable Cloud for auth/DB; Lovable AI for all AI calls.

### Build order
1. Cloud + auth + profiles + onboarding (board & subjects).
2. Subject/topic seed + browser UI.
3. AI tutor chat (streamed, markdown + KaTeX).
4. Flashcards + SM-2 reviews + AI deck generation.
5. Quizzes + AI generation + short-answer grading.
6. Mock exam mode.
7. Dashboard (streak, mastery, weak topics).

### Out of scope (v1)
Real past papers (copyright) — we generate exam-style questions instead. Offline mode. Mobile native app.