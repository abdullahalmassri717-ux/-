-- بنك أسئلة الجهة + سجل استخدام أدوات الذكاء الاصطناعي.
--
-- بنك الأسئلة خاص بكل جهة: أسئلة كتبها المدرّس، أو ولّدها الذكاء الاصطناعي
-- وحفظها، أو استُخرجت من امتحان قديم. أسئلة امتحانات الجهة السابقة تظهر في
-- البنك من جدول questions مباشرة، فلا تُنسخ هنا.

create type public.bank_source as enum ('teacher', 'ai_generated', 'old_exam', 'ministerial');
create type public.difficulty as enum ('easy', 'medium', 'hard');

create table public.bank_questions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  subject_id       uuid references public.subjects (id) on delete set null,
  lesson_id        uuid references public.lessons (id) on delete set null,
  outcome          text,
  text             text not null check (length(text) between 1 and 4000),
  type             public.question_type not null default 'problem_solving',
  max_score        numeric(6,2) not null default 10 check (max_score > 0),
  model_answer     text,
  criteria         jsonb not null default '[]'::jsonb,   -- [{description, points}]
  source           public.bank_source not null default 'teacher',
  source_note      text,                                 -- مثلاً «وزاري 2023»
  difficulty       public.difficulty not null default 'medium',
  created_by       uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now()
);
create index bank_questions_org_idx on public.bank_questions (organization_id, subject_id);
create index bank_questions_lesson_idx on public.bank_questions (lesson_id);

alter table public.bank_questions enable row level security;
create policy bank_questions_all on public.bank_questions for all to authenticated
  using (private.is_org_member(organization_id))
  with check (private.is_org_member(organization_id));
revoke all on public.bank_questions from anon;

-- كل استدعاء لأداة ذكاء اصطناعي (غير التصحيح) مع التكلفة. يكتبه الخادم فقط.
create table public.ai_tool_runs (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  user_id          uuid references public.profiles (id) on delete set null,
  task             text not null,
  model            text not null,
  input_tokens     int not null default 0,
  output_tokens    int not null default 0,
  cost_usd         numeric(10,5) not null default 0,
  ok               boolean not null default true,
  created_at       timestamptz not null default now()
);
create index ai_tool_runs_org_idx on public.ai_tool_runs (organization_id, created_at desc);
create index ai_tool_runs_user_idx on public.ai_tool_runs (user_id, created_at desc);

alter table public.ai_tool_runs enable row level security;
create policy ai_tool_runs_select on public.ai_tool_runs for select to authenticated
  using (private.is_org_owner(organization_id) or private.is_platform_admin());
revoke insert, update, delete on public.ai_tool_runs from authenticated;
revoke all on public.ai_tool_runs from anon;

-- حد يومي لاستدعاءات الأدوات لكل مستخدم (يمنع الاستهلاك غير المقصود). قابل للتعديل.
insert into public.platform_settings (key, value, is_public)
values ('ai_tools', '{"daily_limit_per_user": 200}', false)
on conflict (key) do nothing;
