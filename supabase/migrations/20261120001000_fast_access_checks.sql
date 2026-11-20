-- ============================================================================
-- دقة — تسريع فحص الصلاحيات (نفس الصلاحيات بالضبط، لكن أسرع بكثير).
--
-- المشكلة: سياسات الأمان كانت تستدعي can_access_submission() وأخواتها لكل سطر
-- على حدة. في مدرسة كبيرة (60 ألف ورقة و600 ألف علامة) صارت صفحة نتائج
-- الامتحان والصفحة الرئيسية تتجاوز 8 ثوانٍ، وSupabase يقطع الطلب بعدها.
--
-- الحل: نحسب مرة واحدة لكل طلب «الجهات التي أديرها» و«المجموعات/الامتحانات/
-- التسليمات/الطلاب المسندين إليّ»، ثم نقارن كل سطر بهذه القائمة (organization_id
-- أو المعرّف موجود فيها؟). القاعدة تبني القائمة مرة واحدة وتفحص كل سطر بسرعة.
--
-- لماذا هي نفس الصلاحيات: كل جدول هنا مربوط بجهته بمفتاح مركّب
-- (group_id/assessment_id/submission_id/student_id + organization_id)، فجهة
-- السطر هي نفسها جهة المجموعة أو الامتحان أو التسليم أو الطالب الذي يتبعه.
-- الدوال القديمة (can_access_*) باقية كما هي لمن يستخدمها في دوال أخرى.
-- ============================================================================

-- الجهات النشطة التي أنا مالكها، خارج «صفحتي كأستاذ».
-- (= شرط المالك في can_access_group و can_access_student)
create or replace function private.managed_org_ids()
returns setof uuid language sql stable security definer set search_path = '' rows 3 as $$
  select m.organization_id
  from public.memberships m
  join public.organizations o on o.id = m.organization_id and o.status = 'active'
  where m.user_id = (select auth.uid())
    and m.status = 'active'
    and m.role = 'owner'
    and not private.teacher_view()
$$;

-- المجموعات المسندة إليّ في جهات نشطة أنا عضو نشط فيها.
-- (= شرط المعلم في can_access_group: is_group_teacher + عضوية نشطة + جهة نشطة)
create or replace function private.taught_group_ids()
returns setof uuid language sql stable security definer set search_path = '' rows 20 as $$
  select gt.group_id
  from public.group_teachers gt
  join public.memberships m
    on m.organization_id = gt.organization_id and m.user_id = gt.user_id and m.status = 'active'
  join public.organizations o on o.id = gt.organization_id and o.status = 'active'
  where gt.user_id = (select auth.uid())
$$;

create or replace function private.taught_assessment_ids()
returns setof uuid language sql stable security definer set search_path = '' rows 200 as $$
  select a.id from public.assessments a
  where a.group_id in (select private.taught_group_ids())
$$;

create or replace function private.taught_submission_ids()
returns setof uuid language sql stable security definer set search_path = '' rows 5000 as $$
  select s.id from public.submissions s
  where s.assessment_id in (select private.taught_assessment_ids())
$$;

-- كل الامتحانات التي أصل إليها (للجداول التي لا تحمل organization_id مثل questions).
create or replace function private.accessible_assessment_ids()
returns setof uuid language sql stable security definer set search_path = '' rows 500 as $$
  select a.id from public.assessments a
  where a.organization_id in (select private.managed_org_ids())
     or a.group_id in (select private.taught_group_ids())
$$;

-- الطلاب في مجموعات مسندة إليّ، في جهة نشطة أنا عضو نشط فيها.
-- (= شرط المعلم في can_access_student)
create or replace function private.taught_student_ids()
returns setof uuid language sql stable security definer set search_path = '' rows 500 as $$
  select gs.student_id
  from public.group_students gs
  join public.group_teachers gt on gt.group_id = gs.group_id and gt.user_id = (select auth.uid())
  join public.memberships m
    on m.organization_id = gs.organization_id and m.user_id = gt.user_id and m.status = 'active'
  join public.organizations o on o.id = gs.organization_id and o.status = 'active'
$$;

revoke execute on function private.managed_org_ids(), private.taught_group_ids(), private.taught_assessment_ids(),
  private.taught_submission_ids(), private.accessible_assessment_ids(), private.taught_student_ids() from public, anon;
grant execute on function private.managed_org_ids(), private.taught_group_ids(), private.taught_assessment_ids(),
  private.taught_submission_ids(), private.accessible_assessment_ids(), private.taught_student_ids()
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- الامتحانات
-- ---------------------------------------------------------------------------
drop policy assessments_select on public.assessments;
create policy assessments_select on public.assessments for select to authenticated
  using (organization_id in (select private.managed_org_ids()) or group_id in (select private.taught_group_ids()));
drop policy assessments_insert on public.assessments;
create policy assessments_insert on public.assessments for insert to authenticated
  with check (organization_id in (select private.managed_org_ids()) or group_id in (select private.taught_group_ids()));
drop policy assessments_update on public.assessments;
create policy assessments_update on public.assessments for update to authenticated
  using (organization_id in (select private.managed_org_ids()) or group_id in (select private.taught_group_ids()))
  with check (organization_id in (select private.managed_org_ids()) or group_id in (select private.taught_group_ids()));
drop policy assessments_delete on public.assessments;
create policy assessments_delete on public.assessments for delete to authenticated
  using (organization_id in (select private.managed_org_ids()) or group_id in (select private.taught_group_ids()));

drop policy questions_all on public.questions;
create policy questions_all on public.questions for all to authenticated
  using (assessment_id in (select private.accessible_assessment_ids()))
  with check (assessment_id in (select private.accessible_assessment_ids()));

-- ---------------------------------------------------------------------------
-- التسليمات وصفحاتها والعلامات
-- ---------------------------------------------------------------------------
drop policy submissions_select on public.submissions;
create policy submissions_select on public.submissions for select to authenticated
  using (organization_id in (select private.managed_org_ids()) or assessment_id in (select private.taught_assessment_ids()));
drop policy submissions_insert on public.submissions;
create policy submissions_insert on public.submissions for insert to authenticated
  with check ((organization_id in (select private.managed_org_ids()) or assessment_id in (select private.taught_assessment_ids()))
              and (student_id is null or private.can_access_student(student_id)));
drop policy submissions_update on public.submissions;
create policy submissions_update on public.submissions for update to authenticated
  using (organization_id in (select private.managed_org_ids()) or assessment_id in (select private.taught_assessment_ids()))
  with check ((organization_id in (select private.managed_org_ids()) or assessment_id in (select private.taught_assessment_ids()))
              and (student_id is null or private.can_access_student(student_id)));
drop policy submissions_delete on public.submissions;
create policy submissions_delete on public.submissions for delete to authenticated
  using (organization_id in (select private.managed_org_ids()) or assessment_id in (select private.taught_assessment_ids()));

drop policy submission_pages_all on public.submission_pages;
create policy submission_pages_all on public.submission_pages for all to authenticated
  using (organization_id in (select private.managed_org_ids()) or submission_id in (select private.taught_submission_ids()))
  with check (organization_id in (select private.managed_org_ids()) or submission_id in (select private.taught_submission_ids()));

drop policy question_grades_select on public.question_grades;
create policy question_grades_select on public.question_grades for select to authenticated
  using (organization_id in (select private.managed_org_ids()) or submission_id in (select private.taught_submission_ids()));
drop policy question_grades_insert on public.question_grades;
create policy question_grades_insert on public.question_grades for insert to authenticated
  with check (organization_id in (select private.managed_org_ids()) or submission_id in (select private.taught_submission_ids()));
drop policy question_grades_update on public.question_grades;
create policy question_grades_update on public.question_grades for update to authenticated
  using (organization_id in (select private.managed_org_ids()) or submission_id in (select private.taught_submission_ids()))
  with check (organization_id in (select private.managed_org_ids()) or submission_id in (select private.taught_submission_ids()));

drop policy grade_edits_select on public.grade_edits;
create policy grade_edits_select on public.grade_edits for select to authenticated
  using (exists (
    select 1 from public.question_grades g
    where g.id = grade_edits.question_grade_id
      and (g.organization_id in (select private.managed_org_ids()) or g.submission_id in (select private.taught_submission_ids()))));

drop policy grading_runs_select on public.grading_runs;
create policy grading_runs_select on public.grading_runs for select to authenticated
  using (private.is_org_owner(organization_id) or private.admin_can(variadic array['quality'])
         or organization_id in (select private.managed_org_ids())
         or submission_id in (select private.taught_submission_ids()));

-- ---------------------------------------------------------------------------
-- المجموعات: الطلاب وتقدّم الدروس
-- ---------------------------------------------------------------------------
drop policy group_students_select on public.group_students;
create policy group_students_select on public.group_students for select to authenticated
  using (organization_id in (select private.managed_org_ids()) or group_id in (select private.taught_group_ids()));
drop policy group_students_write on public.group_students;
create policy group_students_write on public.group_students for all to authenticated
  using (organization_id in (select private.managed_org_ids()) or group_id in (select private.taught_group_ids()))
  with check (organization_id in (select private.managed_org_ids()) or group_id in (select private.taught_group_ids()));

drop policy progress_select on public.group_lesson_progress;
create policy progress_select on public.group_lesson_progress for select to authenticated
  using (organization_id in (select private.managed_org_ids()) or group_id in (select private.taught_group_ids()));
drop policy progress_write on public.group_lesson_progress;
create policy progress_write on public.group_lesson_progress for all to authenticated
  using (organization_id in (select private.managed_org_ids()) or group_id in (select private.taught_group_ids()))
  with check (organization_id in (select private.managed_org_ids()) or group_id in (select private.taught_group_ids()));

-- ---------------------------------------------------------------------------
-- الطلاب والتقارير
-- ---------------------------------------------------------------------------
drop policy students_select on public.students;
create policy students_select on public.students for select to authenticated
  using (organization_id in (select private.managed_org_ids()) or id in (select private.taught_student_ids()));
drop policy students_update on public.students;
create policy students_update on public.students for update to authenticated
  using (organization_id in (select private.managed_org_ids()) or id in (select private.taught_student_ids()))
  with check (private.is_org_member(organization_id));

drop policy reports_select on public.reports;
create policy reports_select on public.reports for select to authenticated
  using ((organization_id in (select private.managed_org_ids()) or student_id in (select private.taught_student_ids()))
         and (kind <> 'progress' or period_end is null or subject_id is not null or private.is_org_owner(organization_id)));
drop policy reports_insert on public.reports;
create policy reports_insert on public.reports for insert to authenticated
  with check (organization_id in (select private.managed_org_ids()) or student_id in (select private.taught_student_ids()));
drop policy reports_update on public.reports;
create policy reports_update on public.reports for update to authenticated
  using (organization_id in (select private.managed_org_ids()) or student_id in (select private.taught_student_ids()))
  with check (organization_id in (select private.managed_org_ids()) or student_id in (select private.taught_student_ids()));
drop policy reports_delete on public.reports;
create policy reports_delete on public.reports for delete to authenticated
  using ((organization_id in (select private.managed_org_ids()) or student_id in (select private.taught_student_ids()))
         and status = 'draft');

-- ---------------------------------------------------------------------------
-- فهارس ناقصة على أعمدة تُستخدم في الربط والفلترة
-- ---------------------------------------------------------------------------
create index if not exists question_grades_org_idx on public.question_grades (organization_id);
create index if not exists submission_pages_org_idx on public.submission_pages (organization_id);
create index if not exists group_students_org_idx on public.group_students (organization_id);
create index if not exists group_lesson_progress_org_idx on public.group_lesson_progress (organization_id);
create index if not exists group_lesson_progress_lesson_idx on public.group_lesson_progress (lesson_id);
create index if not exists questions_lesson_idx on public.questions (lesson_id);
create index if not exists groups_subject_idx on public.groups (subject_id);
create index if not exists groups_grade_idx on public.groups (grade_id);
create index if not exists assessments_subject_idx on public.assessments (subject_id);
create index if not exists reports_subject_idx on public.reports (subject_id);
create index if not exists tuition_payments_charge_idx on public.tuition_payments (charge_id);
create index if not exists support_tickets_org_idx on public.support_tickets (organization_id);
create index if not exists payment_receipts_org_idx on public.payment_receipts (organization_id);
