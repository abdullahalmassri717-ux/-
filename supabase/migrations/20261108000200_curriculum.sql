-- ============================================================================
-- دقة — المرحلة 1 (2/7): شجرة المنهج
-- منهج ← صف ← مادة ← وحدة ← درس ← نواتج تعلّم (+ مصطلحات ورموز)
--
-- المنهج بيانات وليس كوداً: يديره مدير المنصة، ويقرؤه كل مستخدم مسجّل.
-- المواد بحالة «مسودة» لا تظهر إلا لمدير المنصة.
-- ============================================================================

create type public.content_status as enum ('draft', 'published');
create type public.school_stage as enum ('elementary', 'middle', 'secondary');
create type public.lesson_term_kind as enum ('term', 'symbol');

create table public.curricula (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,                 -- مثل palestinian
  name           text not null,
  country        text,
  currency_code  text,                                 -- مثل ILS (العرض يأتي من الإعدادات)
  is_available   boolean not null default false,       -- false = «قريباً»
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);

create table public.grades (
  id             uuid primary key default gen_random_uuid(),
  curriculum_id  uuid not null references public.curricula (id) on delete cascade,
  name           text not null,
  stage          public.school_stage,
  sort_order     int not null default 0
);
create index grades_curriculum_idx on public.grades (curriculum_id);

create table public.subjects (
  id          uuid primary key default gen_random_uuid(),
  grade_id    uuid not null references public.grades (id) on delete cascade,
  name        text not null,
  code        text,
  status      public.content_status not null default 'draft',
  sort_order  int not null default 0
);
create index subjects_grade_idx on public.subjects (grade_id);

create table public.units (
  id          uuid primary key default gen_random_uuid(),
  subject_id  uuid not null references public.subjects (id) on delete cascade,
  title       text not null,
  sort_order  int not null default 0
);
create index units_subject_idx on public.units (subject_id);

create table public.lessons (
  id          uuid primary key default gen_random_uuid(),
  unit_id     uuid not null references public.units (id) on delete cascade,
  title       text not null,
  content     text,          -- محتوى الدرس الذي يُرسل للنموذج عند توليد الأسئلة
  sort_order  int not null default 0
);
create index lessons_unit_idx on public.lessons (unit_id);

create table public.learning_outcomes (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references public.lessons (id) on delete cascade,
  text        text not null,
  sort_order  int not null default 0
);
create index learning_outcomes_lesson_idx on public.learning_outcomes (lesson_id);

create table public.lesson_terms (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references public.lessons (id) on delete cascade,
  kind        public.lesson_term_kind not null,
  text        text not null,
  sort_order  int not null default 0
);
create index lesson_terms_lesson_idx on public.lesson_terms (lesson_id);

-- هل المادة منشورة؟ (تُستخدم لإخفاء المسودات عن المعلمين)
create or replace function private.subject_published(p_subject uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.subjects where id = p_subject and status = 'published')
$$;
create or replace function private.unit_published(p_unit uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.units u join public.subjects s on s.id = u.subject_id
    where u.id = p_unit and s.status = 'published')
$$;
create or replace function private.lesson_published(p_lesson uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.lessons l
    join public.units u on u.id = l.unit_id
    join public.subjects s on s.id = u.subject_id
    where l.id = p_lesson and s.status = 'published')
$$;
grant execute on all functions in schema private to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.curricula         enable row level security;
alter table public.grades            enable row level security;
alter table public.subjects          enable row level security;
alter table public.units             enable row level security;
alter table public.lessons           enable row level security;
alter table public.learning_outcomes enable row level security;
alter table public.lesson_terms      enable row level security;

-- القراءة: المناهج والصفوف للجميع (تظهر في الصفحة التعريفية)، والباقي للمسجّلين.
create policy curricula_read on public.curricula for select to anon, authenticated using (true);
create policy grades_read    on public.grades    for select to anon, authenticated using (true);
create policy subjects_read  on public.subjects  for select to authenticated
  using (status = 'published' or private.is_platform_admin());
create policy units_read     on public.units     for select to authenticated
  using (private.subject_published(subject_id) or private.is_platform_admin());
create policy lessons_read   on public.lessons   for select to authenticated
  using (private.unit_published(unit_id) or private.is_platform_admin());
create policy outcomes_read  on public.learning_outcomes for select to authenticated
  using (private.lesson_published(lesson_id) or private.is_platform_admin());
create policy terms_read     on public.lesson_terms for select to authenticated
  using (private.lesson_published(lesson_id) or private.is_platform_admin());

-- الكتابة: مدير المنصة فقط.
create policy curricula_admin on public.curricula for all to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());
create policy grades_admin on public.grades for all to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());
create policy subjects_admin on public.subjects for all to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());
create policy units_admin on public.units for all to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());
create policy lessons_admin on public.lessons for all to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());
create policy outcomes_admin on public.learning_outcomes for all to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());
create policy terms_admin on public.lesson_terms for all to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());

revoke insert, update, delete on
  public.curricula, public.grades, public.subjects, public.units,
  public.lessons, public.learning_outcomes, public.lesson_terms
from anon;
