-- ============================================================================
-- التقرير الأسبوعي لولي الأمر (بدل رسالة واتساب لكل ورقة، لتقليل التكلفة)
--
-- كل أسبوع (الخميس مساءً بتوقيت فلسطين) تُجهَّز رسالة واحدة لكل طالب عن أوراقه
-- المعتمدة في آخر 7 أيام:
--   • مدرّس خصوصي (individual_teacher): رسالة لكل مادة، عنوانها اسم المادة.
--   • مدرسة أو مركز: رسالة واحدة فيها قسم منفصل لكل مادة.
-- الطالب الذي لا ورقة معتمدة له هذا الأسبوع لا تصله رسالة (لا تكلفة بلا محتوى).
-- لا تدخل في التقرير إلا الأوراق التي اعتمدها المدرّس.
--
-- التقارير تُكتب في جدول reports بنوع 'progress' وحالة 'queued'، ثم ترسلها وظيفة
-- الخادم weekly-reports عندما يكون واتساب للأعمال مفعّلاً. بدونه تبقى في الانتظار
-- ويستطيع المدرّس إرسالها يدوياً من شاشة التقارير.
-- ============================================================================

alter table public.reports
  add column period_start date,
  add column period_end   date,
  add column subject_id   uuid references public.subjects (id) on delete set null;

-- تقرير أسبوعي واحد لكل طالب (ولكل مادة عند المدرّس الخصوصي) في كل أسبوع.
create unique index reports_weekly_unique
  on public.reports (organization_id, student_id, period_end, subject_id) nulls not distinct
  where kind = 'progress' and period_end is not null;

-- المالك يستطيع إيقاف التقارير الأسبوعية لجهته.
alter table public.organizations
  add column weekly_reports_enabled boolean not null default true;
grant update (weekly_reports_enabled) on public.organizations to authenticated;

-- ---------------------------------------------------------------------------
-- بناء نص التقرير
-- ---------------------------------------------------------------------------
create or replace function private.fmt_score(p numeric)
returns text language sql immutable as $$
  select coalesce(trim_scale(p)::text, '0')
$$;

create or replace function private.fmt_change(p_now int, p_before int)
returns text language sql immutable as $$
  select case
    when p_before is null then ''
    when p_now = p_before then ' (نفس مستواه السابق)'
    when p_now > p_before then ' (أعلى بـ ' || (p_now - p_before) || '% من قبل ↗)'
    else ' (أقل بـ ' || (p_before - p_now) || '% من قبل ↘)'
  end
$$;

-- صفوف التقارير لجهة واحدة، للأيام السبعة المنتهية عند p_end.
-- p_check_access: عند الاستدعاء من المتصفح، يُبنى التقرير من امتحانات المستخدم المسموحة فقط
-- (معلم المدرسة لا يرى درجات مواد زملائه).
create or replace function private.weekly_report_rows(p_org uuid, p_end timestamptz, p_check_access boolean)
returns table (
  student_id    uuid,
  student_name  text,
  parent_phone  text,
  consent       boolean,
  subject_id    uuid,
  subject_name  text,
  papers        int,
  body          text
)
language sql stable security definer set search_path = '' as $$
  with org as (
    select o.id, o.name, o.kind from public.organizations o where o.id = p_org
  ),
  win as (
    select p_end - interval '7 days' as t0, p_end as t1,
           ((p_end at time zone 'Asia/Gaza')::date - 6) as d0,
           ((p_end at time zone 'Asia/Gaza')::date) as d1
  ),
  -- أوراق معتمدة في هذا الأسبوع وفي الأسابيع الأربعة قبله (للمقارنة).
  paper as (
    select s.id as submission_id, s.student_id, a.title, s.approved_at,
           coalesce(a.subject_id, g.subject_id) as subj,
           sc.total_score as score, t.total_score as total,
           round(100 * sc.total_score / nullif(t.total_score, 0))::int as pct,
           s.approved_at >= (select t0 from win) as this_week
    from public.submissions s
    join public.assessments a on a.id = s.assessment_id
    join public.groups g on g.id = a.group_id
    join public.submission_scores sc on sc.submission_id = s.id
    join public.assessment_totals t on t.assessment_id = a.id
    where s.organization_id = p_org
      and s.status = 'approved'
      and s.student_id is not null
      and s.approved_at >= (select t0 from win) - interval '28 days'
      and s.approved_at < (select t1 from win)
      and (not p_check_access or private.can_access_assessment(a.id))
  ),
  -- مستوى الطالب في كل درس من أسئلة هذا الأسبوع.
  lesson_level as (
    select p.student_id, p.subj, l.title as lesson,
           sum(coalesce(qg.final_score, 0)) / nullif(sum(q.max_score), 0) as ratio
    from paper p
    join public.question_grades qg on qg.submission_id = p.submission_id
    join public.questions q on q.id = qg.question_id
    join public.lessons l on l.id = q.lesson_id
    where p.this_week
    group by p.student_id, p.subj, l.title
  ),
  -- الدروس المشروحة هذا الأسبوع في مجموعات الطالب («وين وصلنا»).
  taught as (
    select gs.student_id, g.subject_id as subj, l.title as lesson, min(glp.taught_at) as taught_at
    from public.group_lesson_progress glp
    join public.groups g on g.id = glp.group_id
    join public.group_students gs on gs.group_id = g.id and gs.left_at is null
    join public.lessons l on l.id = glp.lesson_id
    where glp.organization_id = p_org
      and glp.taught_at >= (select t0 from win) and glp.taught_at < (select t1 from win)
      and (not p_check_access or private.can_access_group(g.id))
    group by gs.student_id, g.subject_id, l.title
  ),
  per_subject as (
    select p.student_id, p.subj,
           coalesce(sub.name, 'المادة') as subject_name,
           count(*) filter (where p.this_week)::int as papers,
           round(avg(p.pct) filter (where p.this_week))::int as avg_now,
           round(avg(p.pct) filter (where not p.this_week))::int as avg_before,
           string_agg('• ' || p.title || ': ' || private.fmt_score(p.score) || ' من ' || private.fmt_score(p.total)
                        || ' (' || coalesce(p.pct, 0) || '%)', E'\n' order by p.approved_at)
             filter (where p.this_week) as paper_lines
    from paper p
    left join public.subjects sub on sub.id = p.subj
    group by p.student_id, p.subj, sub.name
    having count(*) filter (where p.this_week) > 0
  ),
  section as (
    select ps.*,
      concat_ws(E'\n',
        ps.paper_lines,
        case when ps.papers > 1 then '📊 المعدل هذا الأسبوع: ' || ps.avg_now || '%' || private.fmt_change(ps.avg_now, ps.avg_before)
             when ps.avg_before is not null then '📊 مقارنة بما قبل:' || private.fmt_change(ps.avg_now, ps.avg_before) end,
        (select '💪 أتقن: ' || string_agg(x.lesson, '، ')
           from (select ll.lesson from lesson_level ll
                 where ll.student_id = ps.student_id and ll.subj is not distinct from ps.subj and ll.ratio >= 0.8
                 order by ll.ratio desc, ll.lesson limit 2) x),
        (select '🎯 يحتاج تركيزاً على: ' || string_agg(x.lesson, '، ')
           from (select ll.lesson from lesson_level ll
                 where ll.student_id = ps.student_id and ll.subj is not distinct from ps.subj and ll.ratio < 0.6
                 order by ll.ratio, ll.lesson limit 2) x),
        (select '📚 شُرح هذا الأسبوع: ' || string_agg(x.lesson, '، ')
           from (select tg.lesson from taught tg
                 where tg.student_id = ps.student_id and tg.subj is not distinct from ps.subj
                 order by tg.taught_at limit 3) x)
      ) as text
    from per_subject ps
  ),
  stu as (
    select st.id, st.full_name, st.parent_phone, st.parent_whatsapp_consent
    from public.students st
    where st.organization_id = p_org and st.status = 'active'
  ),
  header as (
    select '🗓️ من ' || to_char(w.d0, 'DD/MM') || ' إلى ' || to_char(w.d1, 'DD/MM') as period,
           '— ' || o.name as footer, o.kind
    from win w, org o
  )
  -- مدرّس خصوصي: رسالة لكل مادة.
  select st.id, st.full_name, st.parent_phone, st.parent_whatsapp_consent,
         s.subj, s.subject_name, s.papers,
         concat_ws(E'\n',
           '📘 التقرير الأسبوعي لمادة ' || s.subject_name,
           'ولي أمر الطالب ' || st.full_name || ' 🌸',
           h.period,
           '',
           s.text,
           h.footer)
  from section s
  join stu st on st.id = s.student_id
  cross join header h
  where h.kind = 'individual_teacher'
  union all
  -- مدرسة أو مركز: رسالة واحدة فيها قسم لكل مادة.
  select st.id, st.full_name, st.parent_phone, st.parent_whatsapp_consent,
         null::uuid, null::text, sum(s.papers)::int,
         concat_ws(E'\n',
           '📋 التقرير الأسبوعي للطالب ' || st.full_name,
           h.period,
           '',
           string_agg('📘 ' || s.subject_name || E'\n' || s.text, E'\n\n' order by s.subject_name),
           '',
           h.footer)
  from section s
  join stu st on st.id = s.student_id
  cross join header h
  where h.kind <> 'individual_teacher'
  group by st.id, st.full_name, st.parent_phone, st.parent_whatsapp_consent, h.period, h.footer
$$;
revoke execute on function private.weekly_report_rows(uuid, timestamptz, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- معاينة التقرير من شاشة المدرّس (تقرير هذا الأسبوع حتى الآن)
-- ---------------------------------------------------------------------------
create or replace function public.weekly_report_preview(p_org uuid)
returns table (
  student_id    uuid,
  student_name  text,
  parent_phone  text,
  consent       boolean,
  subject_id    uuid,
  subject_name  text,
  papers        int,
  body          text,
  last_status   text,
  last_period_end date
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_org_member(p_org) then
    raise exception 'ليس لديك صلاحية';
  end if;
  return query
    select r.student_id, r.student_name, r.parent_phone, r.consent, r.subject_id, r.subject_name, r.papers, r.body,
           last.status::text, last.period_end
    from private.weekly_report_rows(p_org, now(), true) r
    left join lateral (
      select rp.status, rp.period_end from public.reports rp
      where rp.organization_id = p_org and rp.student_id = r.student_id and rp.kind = 'progress'
        and rp.period_end is not null and rp.subject_id is not distinct from r.subject_id
      order by rp.period_end desc limit 1
    ) last on true
    where private.can_access_student(r.student_id)
    order by r.student_name, r.subject_name;
end $$;
revoke execute on function public.weekly_report_preview(uuid) from public, anon;
grant execute on function public.weekly_report_preview(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- تجهيز تقارير الأسبوع لكل الجهات (يشغّلها الجدول الأسبوعي، للخادم فقط)
-- ---------------------------------------------------------------------------
create or replace function public.queue_weekly_reports(p_end timestamptz default now())
returns int
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_org record;
  v_count int := 0;
  v_rows int;
  v_d1 date := (p_end at time zone 'Asia/Gaza')::date;
begin
  for v_org in
    select o.id from public.organizations o
    where o.status = 'active' and o.weekly_reports_enabled
  loop
    insert into public.reports
      (organization_id, student_id, kind, recipient_phone, body, status, period_start, period_end, subject_id, created_by)
    select v_org.id, r.student_id, 'progress', r.parent_phone, r.body, 'queued', v_d1 - 6, v_d1, r.subject_id, null
    from private.weekly_report_rows(v_org.id, p_end, false) r
    where r.parent_phone is not null
    on conflict do nothing;
    get diagnostics v_rows = row_count;
    v_count := v_count + v_rows;
  end loop;
  return v_count;
end $$;
revoke execute on function public.queue_weekly_reports(timestamptz) from public, anon, authenticated;
grant execute on function public.queue_weekly_reports(timestamptz) to service_role;

-- ---------------------------------------------------------------------------
-- تشغيل أسبوعي تلقائي
-- ---------------------------------------------------------------------------
-- رمز داخلي تتحقق به وظيفة الخادم أن الطلب جاء من الجدول الأسبوعي. يتولد داخل
-- القاعدة نفسها فلا يظهر في الكود ولا في Git.
create table if not exists private.app_secrets (
  name   text primary key,
  value  text not null
);
revoke all on private.app_secrets from public, anon, authenticated;
insert into private.app_secrets (name, value)
values ('weekly_reports_token', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (name) do nothing;
-- عنوان وظائف الخادم في المشروع الحقيقي (ليس سرّاً؛ نفس عنوان المشروع العام).
insert into private.app_secrets (name, value)
values ('functions_url', 'https://roeweplhofhjtcnbfmvo.supabase.co/functions/v1')
on conflict (name) do nothing;

create or replace function public.check_weekly_reports_token(p_token text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.app_secrets where name = 'weekly_reports_token' and value = p_token)
$$;
revoke execute on function public.check_weekly_reports_token(text) from public, anon, authenticated;
grant execute on function public.check_weekly_reports_token(text) to service_role;

-- يجهّز التقارير داخل القاعدة أولاً (فتظهر للمدرّس حتى لو لم يُفعَّل واتساب)،
-- ثم ينبّه وظيفة الخادم لترسلها.
create or replace function private.run_weekly_reports()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_url text;
  v_token text;
begin
  perform public.queue_weekly_reports(now());
  select value into v_url from private.app_secrets where name = 'functions_url';
  select value into v_token from private.app_secrets where name = 'weekly_reports_token';
  if v_url is null or to_regnamespace('net') is null then
    return;
  end if;
  execute 'select net.http_post(url := $1, headers := $2, body := $3)'
    using v_url || '/weekly-reports',
          jsonb_build_object('Content-Type', 'application/json', 'x-daqa-cron', v_token),
          '{}'::jsonb;
end $$;
revoke execute on function private.run_weekly_reports() from public, anon, authenticated;

-- كل خميس 16:00 UTC = 6 مساءً بتوقيت فلسطين شتاءً (7 صيفاً).
-- على PostgreSQL عادي (الاختبار المحلي) لا توجد هذه الإضافات، فيُتخطّى الجدول.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    execute 'create extension if not exists pg_net';
    execute 'create extension if not exists pg_cron';
    execute $cmd$select cron.schedule('daqa-weekly-reports', '0 16 * * 4', 'select private.run_weekly_reports()')$cmd$;
  end if;
exception when others then
  -- لا نُفشل النشر كله بسبب الجدولة؛ يمكن تفعيلها لاحقاً من لوحة Supabase (Cron).
  raise warning 'weekly reports schedule not created: %', sqlerrm;
end $$;

-- تقرير المدرسة الأسبوعي يجمع كل المواد، فيراه مالك الجهة فقط؛ المعلم يرى معاينة
-- مبنية من مواده هو (weekly_report_preview).
drop policy reports_select on public.reports;
create policy reports_select on public.reports for select to authenticated
  using (private.can_access_student(student_id)
         and (kind <> 'progress' or period_end is null or subject_id is not null
              or private.is_org_owner(organization_id)));
