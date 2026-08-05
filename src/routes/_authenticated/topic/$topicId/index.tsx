import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquareText, Layers, ClipboardCheck, ArrowRight } from "lucide-react";

type Topic = { id: string; name: string; syllabus_ref: string | null; subject_id: string };
type Subject = { id: string; name: string; slug: string; color: string };

export const Route = createFileRoute("/_authenticated/topic/$topicId/")({
  component: TopicHub,
});

function TopicHub() {
  const { topicId } = Route.useParams();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [cardsCount, setCardsCount] = useState(0);
  const [questionsCount, setQuestionsCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: t } = await supabase.from("topics").select("*").eq("id", topicId).single();
      setTopic(t as Topic);
      if (t) {
        const { data: s } = await supabase.from("subjects").select("*").eq("id", (t as Topic).subject_id).single();
        setSubject(s as Subject);
        const { data: u } = await supabase.auth.getUser();
        if (u.user) {
          const { count: cc } = await supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("user_id", u.user.id).eq("topic_id", topicId);
          setCardsCount(cc || 0);
          const { count: qc } = await supabase.from("quiz_questions").select("id", { count: "exact", head: true }).eq("user_id", u.user.id).eq("topic_id", topicId);
          setQuestionsCount(qc || 0);
        }
      }
    })();
  }, [topicId]);

  if (!topic) return <div className="p-8">Loading…</div>;

  const actions = [
    { icon: MessageSquareText, title: "AI tutor", desc: "Ask anything about this topic — worked solutions included.", to: "/topic/$topicId/tutor", badge: "Chat" },
    { icon: Layers, title: "Flashcards", desc: `${cardsCount} cards · spaced repetition`, to: "/topic/$topicId/cards", badge: "Review" },
    { icon: ClipboardCheck, title: "Practice quiz", desc: `${questionsCount} questions · MCQ & short answer`, to: "/topic/$topicId/quiz", badge: "Test" },
  ] as const;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {subject && (
        <Link to="/subjects/$slug" params={{ slug: subject.slug }} className="text-sm text-muted-foreground hover:text-foreground">
          ← {subject.name}
        </Link>
      )}
      <h1 className="text-3xl font-bold tracking-tight mt-2">{topic.name}</h1>
      {topic.syllabus_ref && <p className="text-sm text-muted-foreground">{topic.syllabus_ref}</p>}

      <div className="mt-8 grid gap-4">
        {actions.map((a) => (
          <Link key={a.title} to={a.to} params={{ topicId }} className="rounded-xl border bg-card p-5 hover:border-primary/40 transition flex items-center gap-4 group">
            <div className="size-12 rounded-lg bg-primary/10 text-primary grid place-items-center">
              <a.icon className="size-6" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">{a.title}</div>
              <div className="text-sm text-muted-foreground">{a.desc}</div>
            </div>
            <ArrowRight className="size-5 text-muted-foreground group-hover:text-primary transition" />
          </Link>
        ))}
      </div>
    </div>
  );
}
