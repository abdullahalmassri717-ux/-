-- ============================================================================
-- دقة — المرحلة 1 (5/7): التسليمات وصفحاتها، الدرجات وتعديلاتها، التقارير
--
-- قواعد ثابتة مطبّقة هنا داخل قاعدة البيانات نفسها:
--   1) أعمدة الذكاء الاصطناعي (ai_*) يكتبها الخادم فقط، لا المتصفح.
--   2) كل تعديل من المدرّس على الدرجة يُحفظ (قبل/بعد/من/متى) ولا يُمسح.
--   3) لا يُرسل تقرير فيه درجة قبل اعتماد المدرّس، إلا مع «إرسال تلقائي».
-- ============================================================================

create type public.submission_source as enum ('teacher_scan', 'student_link');
create type public.submission_status as enum ('uploaded', 'grading', 'needs_review', 'approved', 'failed');
create type public.report_status as enum ('draft', 'queued', 'sent', 'failed');
create type public.report_kind as enum ('assessment_result', 'progress');

-- هل الجلسة الحالية من المتصفح (وليست الخادم/service_role)؟
-- نقرأ الدور المضبوط للجلسة (SET ROLE) لأنه لا يتغير داخل دوال SECURITY DEFINER.
create or replace function private.is_browser_session()
returns boolean language sql stable as $$
  select coalesce(nullif(current_setting('role', true), 'none'), current_user::text)
         in ('authenticated', 'anon')
$$;

-- ---------------------------------------------------------------------------
-- التسليمات
-- ---------------------------------------------------------------------------
create table public.submissions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null,
  assessment_id    uuid not null,
  student_id       uuid,          -- قد يكون فارغاً لحظة الرفع حتى يُطابَق الطالب
  source           public.submission_source not null default 'teacher_scan',
  status           public.submission_status not null default 'uploaded',
  submitted_at     timestamptz not null default now(),
  graded_at        timestamptz,
  approved_at      timestamptz,
  approved_by      uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (assessment_id, student_id),
  unique (id, organization_id),
  foreign key (assessment_id, organization_id) references public.assessments (id, organization_id) on delete cascade,
  foreign key (student_id, organization_id)    references public.students (id, organization_id) on delete cascade
);
create index submissions_org_idx on public.submissions (organization_id);
create index submissions_student_idx on public.submissions (student_id);
create trigger submissions_touch before update on public.submissions
  for each row execute function private.touch_updated_at();

-- تسجيل من اعتمد ومتى.
create or replace function private.stamp_submission_approval()
returns trigger language plpgsql as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    new.approved_at := now();
    new.approved_by := auth.uid();
  elsif new.status <> 'approved' then
    new.approved_at := null;
    new.approved_by := null;
  end if;
  return new;
end $$;
create trigger submissions_stamp_approval before update of status on public.submissions
  for each row execute function private.stamp_submission_approval();

create table public.submission_pages (
  id                      uuid primary key default gen_random_uuid(),
  submission_id           uuid not null,
  organization_id         uuid not null,
  page_number             int not null check (page_number > 0),
  storage_path            text not null,     -- داخل الحاوية الخاصة submission-pages
  corrected_storage_path  text,              -- نسخة الورقة المصحّحة (✓ ✗ وملاحظات)
  created_at              timestamptz not null default now(),
  unique (submission_id, page_number),
  foreign key (submission_id, organization_id) references public.submissions (id, organization_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- الدرجات لكل سؤال
-- ---------------------------------------------------------------------------
create table public.question_grades (
  id               uuid primary key default gen_random_uuid(),
  submission_id    uuid not null,
  organization_id  uuid not null,
  question_id      uuid not null references public.questions (id) on delete cascade,
  -- ما قاله الذكاء الاصطناعي (يكتبه الخادم فقط)
  ai_score         numeric(6,2),
  ai_reason        text,
  ai_transcription text,
  ai_confidence    numeric(3,2) check (ai_confidence between 0 and 1),
  ai_criteria      jsonb,        -- [{criterion, met, points}]
  ai_feedback      jsonb,        -- ملاحظات إضافية (مثل تصحيح الكتابة الإنجليزية)
  ai_model         text,         -- أي نموذج صحّح (للمقارنة بين Claude وGemini)
  graded_at        timestamptz,
  -- قرار المدرّس
  final_score      numeric(6,2),
  teacher_note     text,          -- الملاحظة التي تظهر على الورقة المصحّحة
  reviewed_by      uuid references public.profiles (id) on delete set null,
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (submission_id, question_id),
  foreign key (submission_id, organization_id) references public.submissions (id, organization_id) on delete cascade
);
create index question_grades_question_idx on public.question_grades (question_id);
create trigger question_grades_touch before update on public.question_grades
  for each row execute function private.touch_updated_at();

-- التحقق: الدرجة بين 0 والدرجة القصوى للسؤال، والسؤال من نفس الامتحان.
create or replace function private.validate_question_grade()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_max numeric;
begin
  select q.max_score into v_max
  from public.questions q
  join public.submissions s on s.assessment_id = q.assessment_id
  where q.id = new.question_id and s.id = new.submission_id;
  if v_max is null then
    raise exception 'السؤال لا ينتمي لامتحان هذا التسليم';
  end if;
  if new.final_score is not null and (new.final_score < 0 or new.final_score > v_max) then
    raise exception 'الدرجة % خارج المدى (0 – %)', new.final_score, v_max;
  end if;
  if new.ai_score is not null and (new.ai_score < 0 or new.ai_score > v_max) then
    raise exception 'درجة الذكاء الاصطناعي % خارج المدى (0 – %)', new.ai_score, v_max;
  end if;
  -- الدرجة النهائية تبدأ باقتراح الذكاء الاصطناعي إلى أن يغيّرها المدرّس.
  if tg_op = 'INSERT' and new.final_score is null then
    new.final_score := new.ai_score;
  end if;
  return new;
end $$;
create trigger question_grades_validate before insert or update on public.question_grades
  for each row execute function private.validate_question_grade();

-- سجل تعديلات المدرّس — للتحسين المستقبلي للدقة. لا يُعدَّل ولا يُحذف من المتصفح.
create table public.grade_edits (
  id                 uuid primary key default gen_random_uuid(),
  question_grade_id  uuid not null references public.question_grades (id) on delete cascade,
  organization_id    uuid not null references public.organizations (id) on delete cascade,
  ai_score           numeric(6,2),      -- لقطة من اقتراح الذكاء الاصطناعي وقت التعديل
  old_score          numeric(6,2),
  new_score          numeric(6,2),
  old_note           text,
  new_note           text,
  edited_by          uuid references public.profiles (id) on delete set null,
  edited_at          timestamptz not null default now()
);
create index grade_edits_grade_idx on public.grade_edits (question_grade_id);
create index grade_edits_org_idx on public.grade_edits (organization_id, edited_at);

create or replace function private.log_grade_edit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.final_score is distinct from old.final_score
     or new.teacher_note is distinct from old.teacher_note then
    insert into public.grade_edits
      (question_grade_id, organization_id, ai_score, old_score, new_score, old_note, new_note, edited_by)
    values
      (new.id, new.organization_id, new.ai_score, old.final_score, new.final_score,
       old.teacher_note, new.teacher_note, auth.uid());
  end if;
  return new;
end $$;
create trigger question_grades_log_edit after update on public.question_grades
  for each row execute function private.log_grade_edit();

-- عند أي تعديل من المدرّس: تسجيل أنه راجع السؤال.
create or replace function private.stamp_grade_review()
returns trigger language plpgsql as $$
begin
  if private.is_browser_session() then
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  end if;
  return new;
end $$;
create trigger question_grades_stamp_review before update of final_score, teacher_note on public.question_grades
  for each row execute function private.stamp_grade_review();

-- مجموع درجات كل تسليم.
create or replace view public.submission_scores
with (security_invoker = true) as
select s.id as submission_id,
       s.assessment_id,
       s.student_id,
       coalesce(sum(g.final_score), 0)::numeric(8,2) as total_score,
       count(g.id) filter (where g.reviewed_at is null and g.ai_confidence < 0.7)::int as low_confidence_unreviewed
from public.submissions s
left join public.question_grades g on g.submission_id = s.id
group by s.id;

-- ---------------------------------------------------------------------------
-- التقارير (واتساب لولي الأمر)
-- ---------------------------------------------------------------------------
create table public.reports (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null,
  student_id       uuid not null,
  submission_id    uuid,
  kind             public.report_kind not null default 'assessment_result',
  recipient_phone  text check (recipient_phone ~ '^\+[0-9]{8,15}$'),
  body             text,
  status           public.report_status not null default 'draft',
  queued_at        timestamptz,
  sent_at          timestamptz,
  error            text,
  created_by       uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  foreign key (student_id, organization_id) references public.students (id, organization_id) on delete cascade,
  foreign key (submission_id, organization_id) references public.submissions (id, organization_id) on delete cascade
);
create index reports_org_idx on public.reports (organization_id, created_at desc);
create index reports_student_idx on public.reports (student_id);
create index reports_submission_idx on public.reports (submission_id);
create trigger reports_touch before update on public.reports
  for each row execute function private.touch_updated_at();

create or replace function private.guard_report()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_ok boolean;
begin
  -- المتصفح يضع التقرير في طابور الإرسال فقط؛ «أُرسل/فشل» يكتبها الخادم.
  if private.is_browser_session() and new.status in ('sent', 'failed')
     and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    raise exception 'حالة الإرسال يحددها الخادم فقط';
  end if;

  if new.status in ('queued', 'sent') and new.submission_id is not null then
    select (s.status = 'approved' or a.auto_send_reports)
      into v_ok
    from public.submissions s
    join public.assessments a on a.id = s.assessment_id
    where s.id = new.submission_id and s.student_id = new.student_id;
    if not coalesce(v_ok, false) then
      raise exception 'لا يمكن إرسال الدرجة قبل اعتماد المدرّس';
    end if;
  end if;

  if new.status = 'queued' and new.queued_at is null then
    new.queued_at := now();
  end if;
  return new;
end $$;
create trigger reports_guard before insert or update on public.reports
  for each row execute function private.guard_report();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
create or replace function private.can_access_submission(p_submission uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.submissions s
    where s.id = p_submission and private.can_access_assessment(s.assessment_id))
$$;
grant execute on all functions in schema private to authenticated, service_role;

alter table public.submissions      enable row level security;
alter table public.submission_pages enable row level security;
alter table public.question_grades  enable row level security;
alter table public.grade_edits      enable row level security;
alter table public.reports          enable row level security;

create policy submissions_select on public.submissions for select to authenticated
  using (private.can_access_assessment(assessment_id));
create policy submissions_insert on public.submissions for insert to authenticated
  with check (private.can_access_assessment(assessment_id)
              and (student_id is null or private.can_access_student(student_id)));
create policy submissions_update on public.submissions for update to authenticated
  using (private.can_access_assessment(assessment_id))
  with check (private.can_access_assessment(assessment_id)
              and (student_id is null or private.can_access_student(student_id)));
create policy submissions_delete on public.submissions for delete to authenticated
  using (private.can_access_assessment(assessment_id));
-- المتصفح يغيّر الطالب والحالة فقط؛ أوقات التصحيح والاعتماد تُكتب تلقائياً.
revoke update on public.submissions from authenticated;
grant update (student_id, status) on public.submissions to authenticated;

create policy submission_pages_all on public.submission_pages for all to authenticated
  using (private.can_access_submission(submission_id))
  with check (private.can_access_submission(submission_id));

create policy question_grades_select on public.question_grades for select to authenticated
  using (private.can_access_submission(submission_id));
create policy question_grades_insert on public.question_grades for insert to authenticated
  with check (private.can_access_submission(submission_id));
create policy question_grades_update on public.question_grades for update to authenticated
  using (private.can_access_submission(submission_id))
  with check (private.can_access_submission(submission_id));
-- المدرّس يكتب الدرجة النهائية والملاحظة فقط. أعمدة ai_* للخادم.
revoke insert, update, delete on public.question_grades from authenticated;
grant insert (submission_id, organization_id, question_id, final_score, teacher_note)
  on public.question_grades to authenticated;
grant update (final_score, teacher_note) on public.question_grades to authenticated;

-- سجل التعديلات: قراءة فقط.
create policy grade_edits_select on public.grade_edits for select to authenticated
  using (exists (select 1 from public.question_grades g
                 where g.id = question_grade_id and private.can_access_submission(g.submission_id)));
revoke insert, update, delete on public.grade_edits from authenticated;

create policy reports_select on public.reports for select to authenticated
  using (private.can_access_student(student_id));
create policy reports_insert on public.reports for insert to authenticated
  with check (private.can_access_student(student_id));
create policy reports_update on public.reports for update to authenticated
  using (private.can_access_student(student_id)) with check (private.can_access_student(student_id));
create policy reports_delete on public.reports for delete to authenticated
  using (private.can_access_student(student_id) and status = 'draft');

revoke all on public.submissions, public.submission_pages, public.question_grades,
  public.grade_edits, public.reports, public.submission_scores from anon;
