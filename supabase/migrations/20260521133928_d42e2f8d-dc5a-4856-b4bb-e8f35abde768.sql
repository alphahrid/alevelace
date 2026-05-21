
-- Enums
create type exam_board as enum ('cambridge','edexcel','both');
create type question_type as enum ('mcq','short');

-- profiles
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  exam_boards exam_board[] not null default '{both}',
  selected_subjects uuid[] not null default '{}',
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- subjects
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  color text not null default '#6366f1',
  icon text,
  board exam_board not null default 'both',
  description text,
  created_at timestamptz not null default now()
);
alter table public.subjects enable row level security;
create policy "subjects read" on public.subjects for select to authenticated using (true);

-- topics
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  parent_id uuid references public.topics(id) on delete cascade,
  name text not null,
  slug text not null,
  syllabus_ref text,
  position int not null default 0,
  description text,
  created_at timestamptz not null default now()
);
create index on public.topics(subject_id);
create index on public.topics(parent_id);
alter table public.topics enable row level security;
create policy "topics read" on public.topics for select to authenticated using (true);

-- flashcards
create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  front text not null,
  back text not null,
  ease real not null default 2.5,
  interval_days int not null default 0,
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  reps int not null default 0,
  lapses int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.flashcards(user_id, due_at);
create index on public.flashcards(user_id, topic_id);
alter table public.flashcards enable row level security;
create policy "own flashcards all" on public.flashcards for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- quiz questions (per user, AI-generated and cached)
create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  board exam_board not null default 'both',
  type question_type not null,
  prompt text not null,
  choices jsonb,
  answer text not null,
  explanation text,
  difficulty int not null default 2,
  created_at timestamptz not null default now()
);
create index on public.quiz_questions(user_id, topic_id);
alter table public.quiz_questions enable row level security;
create policy "own questions all" on public.quiz_questions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- quiz attempts
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  topic_id uuid references public.topics(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete cascade,
  mode text not null default 'quiz',
  score int not null default 0,
  total int not null default 0,
  duration_seconds int,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index on public.quiz_attempts(user_id, started_at desc);
alter table public.quiz_attempts enable row level security;
create policy "own attempts all" on public.quiz_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- attempt answers
create table public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  question_id uuid references public.quiz_questions(id) on delete set null,
  question_prompt text not null,
  user_answer text,
  correct boolean,
  score real,
  ai_feedback text,
  created_at timestamptz not null default now()
);
create index on public.attempt_answers(attempt_id);
alter table public.attempt_answers enable row level security;
create policy "own answers all" on public.attempt_answers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- tutor
create table public.tutor_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.tutor_conversations(user_id, updated_at desc);
alter table public.tutor_conversations enable row level security;
create policy "own convs all" on public.tutor_conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.tutor_conversations(id) on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);
create index on public.tutor_messages(conversation_id, created_at);
alter table public.tutor_messages enable row level security;
create policy "own msgs all" on public.tutor_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- study sessions
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  subject_id uuid references public.subjects(id) on delete set null,
  activity text not null,
  minutes int not null default 0,
  occurred_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index on public.study_sessions(user_id, occurred_on desc);
alter table public.study_sessions enable row level security;
create policy "own sessions all" on public.study_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed subjects
insert into public.subjects (slug, name, color, icon, description) values
  ('maths','Mathematics','#6366f1','Sigma','Pure, Mechanics, Statistics'),
  ('further-maths','Further Mathematics','#8b5cf6','Infinity','Further Pure, Mechanics, Statistics, Decision'),
  ('physics','Physics','#0ea5e9','Atom','Mechanics, Waves, Fields, Particles'),
  ('chemistry','Chemistry','#10b981','FlaskConical','Physical, Inorganic, Organic'),
  ('biology','Biology','#22c55e','Leaf','Cells, Genetics, Ecology, Physiology'),
  ('history','History','#f59e0b','Landmark','Modern, Medieval, World History'),
  ('economics','Economics','#ef4444','TrendingUp','Micro, Macro, Global'),
  ('psychology','Psychology','#ec4899','Brain','Cognitive, Social, Biological, Developmental'),
  ('business','Business','#14b8a6','Briefcase','Operations, Marketing, Finance, Strategy');

-- Seed core topics (subset; AI can expand later)
with s as (select id, slug from public.subjects)
insert into public.topics (subject_id, name, slug, position, syllabus_ref) values
  ((select id from s where slug='maths'),'Pure: Algebra & Functions','pure-algebra',1,'P1'),
  ((select id from s where slug='maths'),'Pure: Differentiation','pure-differentiation',2,'P2'),
  ((select id from s where slug='maths'),'Pure: Integration','pure-integration',3,'P3'),
  ((select id from s where slug='maths'),'Pure: Trigonometry','pure-trig',4,'P4'),
  ((select id from s where slug='maths'),'Pure: Vectors','pure-vectors',5,'P5'),
  ((select id from s where slug='maths'),'Mechanics: Kinematics','mech-kinematics',6,'M1'),
  ((select id from s where slug='maths'),'Mechanics: Forces','mech-forces',7,'M2'),
  ((select id from s where slug='maths'),'Statistics: Probability','stats-prob',8,'S1'),
  ((select id from s where slug='maths'),'Statistics: Hypothesis Testing','stats-hyp',9,'S2'),
  ((select id from s where slug='further-maths'),'Further Pure: Complex Numbers','fp-complex',1,'FP1'),
  ((select id from s where slug='further-maths'),'Further Pure: Matrices','fp-matrices',2,'FP2'),
  ((select id from s where slug='further-maths'),'Further Pure: Differential Equations','fp-de',3,'FP3'),
  ((select id from s where slug='physics'),'Mechanics & Materials','phy-mech',1,null),
  ((select id from s where slug='physics'),'Waves & Optics','phy-waves',2,null),
  ((select id from s where slug='physics'),'Electricity & Circuits','phy-electricity',3,null),
  ((select id from s where slug='physics'),'Fields & Their Consequences','phy-fields',4,null),
  ((select id from s where slug='physics'),'Nuclear & Particle Physics','phy-nuclear',5,null),
  ((select id from s where slug='physics'),'Thermal Physics','phy-thermal',6,null),
  ((select id from s where slug='chemistry'),'Atomic Structure & Bonding','chem-atomic',1,null),
  ((select id from s where slug='chemistry'),'Energetics & Thermodynamics','chem-energetics',2,null),
  ((select id from s where slug='chemistry'),'Kinetics & Equilibria','chem-kinetics',3,null),
  ((select id from s where slug='chemistry'),'Organic Chemistry','chem-organic',4,null),
  ((select id from s where slug='chemistry'),'Inorganic & Periodicity','chem-inorganic',5,null),
  ((select id from s where slug='chemistry'),'Analysis (NMR, IR, MS)','chem-analysis',6,null),
  ((select id from s where slug='biology'),'Biological Molecules','bio-molecules',1,null),
  ((select id from s where slug='biology'),'Cells & Cell Division','bio-cells',2,null),
  ((select id from s where slug='biology'),'Genetics & Inheritance','bio-genetics',3,null),
  ((select id from s where slug='biology'),'Ecology & Ecosystems','bio-ecology',4,null),
  ((select id from s where slug='biology'),'Physiology & Homeostasis','bio-physiology',5,null),
  ((select id from s where slug='biology'),'Evolution & Biodiversity','bio-evolution',6,null),
  ((select id from s where slug='history'),'Cold War 1945-1991','hist-coldwar',1,null),
  ((select id from s where slug='history'),'Britain 1900-1951','hist-britain',2,null),
  ((select id from s where slug='history'),'Nazi Germany 1918-1945','hist-germany',3,null),
  ((select id from s where slug='history'),'Russia & USSR 1855-1964','hist-russia',4,null),
  ((select id from s where slug='history'),'Civil Rights in the USA','hist-civilrights',5,null),
  ((select id from s where slug='economics'),'Microeconomics: Markets','econ-micro-markets',1,null),
  ((select id from s where slug='economics'),'Microeconomics: Market Failure','econ-micro-failure',2,null),
  ((select id from s where slug='economics'),'Macroeconomics: National Income','econ-macro-income',3,null),
  ((select id from s where slug='economics'),'Macroeconomics: Policy','econ-macro-policy',4,null),
  ((select id from s where slug='economics'),'Global Economy & Trade','econ-global',5,null),
  ((select id from s where slug='economics'),'Labour Markets','econ-labour',6,null),
  ((select id from s where slug='psychology'),'Social Influence','psy-social',1,null),
  ((select id from s where slug='psychology'),'Memory','psy-memory',2,null),
  ((select id from s where slug='psychology'),'Attachment','psy-attachment',3,null),
  ((select id from s where slug='psychology'),'Psychopathology','psy-pathology',4,null),
  ((select id from s where slug='psychology'),'Approaches in Psychology','psy-approaches',5,null),
  ((select id from s where slug='psychology'),'Research Methods','psy-methods',6,null),
  ((select id from s where slug='business'),'Marketing & Markets','biz-marketing',1,null),
  ((select id from s where slug='business'),'Operations Management','biz-ops',2,null),
  ((select id from s where slug='business'),'Finance & Accounts','biz-finance',3,null),
  ((select id from s where slug='business'),'Human Resources','biz-hr',4,null),
  ((select id from s where slug='business'),'Strategy & External Influences','biz-strategy',5,null),
  ((select id from s where slug='business'),'Global Business','biz-global',6,null);
