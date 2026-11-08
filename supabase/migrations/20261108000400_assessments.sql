-- ============================================================================
-- دقة — المرحلة 1 (4/7): الواجبات والامتحانات والأسئلة ومعايير التصحيح
-- ============================================================================

create type public.assessment_kind as enum ('exam', 'homework');
create type public.assessment_status as enum (
  'draft', 'awaiting_papers', 'grading', 'needs_review', 'completed', 'reports_sent');
create type public.submission_mode as enum ('link', 'teacher_scan');
create type public.question_type as enum ('multiple_choice', 'short_answer', 'problem_solving', 'essay');

create table public.assessments (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null,
  group_id           uuid not null,
  subject_id         uuid references public.subjects (id) on delete restrict,
  title              text not null,
  kind               public.assessment_kind not null default 'exam',
  scheduled_on       date,
  status             public.assessment_status not null default 'draft',
  submission_mode    public.submission_mode not null default 'teacher_scan',
  -- رابط التسليم /s/<code>: رمز طويل لا يُخمَّن. الرفع منه يمر عبر الخادم فقط.
  submission_code    text unique,
  submission_open    boolean not null default false,
  -- لا تُرسل الدرجات قبل اعتماد المدرّس إلا إذا فعّل هذا صراحة.
  auto_send_reports  boolean not null default false,
  created_by         uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (group_id, organization_id) references public.groups (id, organization_id) on delete cascade
);
create index assessments_org_idx on public.assessments (organization_id);
create index assessments_group_idx on public.assessments (group_id);
create trigger assessments_touch before update on public.assessments
  for each row execute function private.touch_updated_at();

-- توليد رمز رابط التسليم (10 أحرف من أبجدية بلا أحرف متشابهة).
create or replace function private.assign_submission_code()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  v_code text;
begin
  if new.submission_code is not null then
    return new;
  end if;
  loop
    select string_agg(substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1), '')
      into v_code from generate_series(1, 10);
    exit when not exists (select 1 from public.assessments where submission_code = v_code);
  end loop;
  new.submission_code := v_code;
  return new;
end $$;
create trigger assessments_assign_code before insert on public.assessments
  for each row execute function private.assign_submission_code();

create table public.questions (
  id                   uuid primary key default gen_random_uuid(),
  assessment_id        uuid not null references public.assessments (id) on delete cascade,
  number               int not null check (number > 0),
  text                 text not null,
  type                 public.question_type not null default 'problem_solving',
  max_score            numeric(6,2) not null check (max_score > 0),
  model_answer         text,
  lesson_id            uuid references public.lessons (id) on delete set null,
  learning_outcome_id  uuid references public.learning_outcomes (id) on delete set null,
  created_at           timestamptz not null default now(),
  unique (assessment_id, number)
);
create index questions_assessment_idx on public.questions (assessment_id);

create table public.rubric_criteria (
  id           uuid primary key default gen_random_uuid(),
  question_id  uuid not null references public.questions (id) on delete cascade,
  description  text not null,
  points       numeric(6,2) not null check (points >= 0),
  sort_order   int not null default 0
);
create index rubric_criteria_question_idx on public.rubric_criteria (question_id);

-- ---------------------------------------------------------------------------
-- الصلاحيات
-- ---------------------------------------------------------------------------
create or replace function private.can_access_assessment(p_assessment uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.assessments a
    where a.id = p_assessment and private.can_access_group(a.group_id))
$$;
create or replace function private.can_access_question(p_question uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.questions q
    where q.id = p_question and private.can_access_assessment(q.assessment_id))
$$;
grant execute on all functions in schema private to authenticated, service_role;

alter table public.assessments     enable row level security;
alter table public.questions       enable row level security;
alter table public.rubric_criteria enable row level security;

create policy assessments_select on public.assessments for select to authenticated
  using (private.can_access_group(group_id));
create policy assessments_insert on public.assessments for insert to authenticated
  with check (private.can_access_group(group_id));
create policy assessments_update on public.assessments for update to authenticated
  using (private.can_access_group(group_id)) with check (private.can_access_group(group_id));
create policy assessments_delete on public.assessments for delete to authenticated
  using (private.can_access_group(group_id));

create policy questions_all on public.questions for all to authenticated
  using (private.can_access_assessment(assessment_id))
  with check (private.can_access_assessment(assessment_id));

create policy rubric_criteria_all on public.rubric_criteria for all to authenticated
  using (private.can_access_question(question_id))
  with check (private.can_access_question(question_id));

-- ملخص لكل واجب/امتحان: الدرجة الكلية وعدد الأسئلة.
create or replace view public.assessment_totals
with (security_invoker = true) as
select a.id as assessment_id,
       coalesce(sum(q.max_score), 0)::numeric(8,2) as total_score,
       count(q.id)::int as questions_count
from public.assessments a
left join public.questions q on q.assessment_id = a.id
group by a.id;

revoke all on public.assessments, public.questions, public.rubric_criteria, public.assessment_totals from anon;
