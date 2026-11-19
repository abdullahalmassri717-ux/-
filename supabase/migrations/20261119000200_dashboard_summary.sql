-- أرقام لوحة المدرّس/المدرسة تُحسب داخل القاعدة دفعة واحدة، بدل تنزيل آلاف
-- السجلات إلى جهاز المدرّس وحسابها هناك. تعمل بصلاحيات المستخدم نفسه
-- (security invoker)، فالمعلم في مدرسة يرى أرقام مجموعاته فقط كما قبل.
create or replace function public.dashboard_summary(p_org uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with
  approved as (
    select s.id, s.approved_at,
           (select coalesce(sum(q.max_score), 0) from public.questions q where q.assessment_id = s.assessment_id) as max_total,
           sc.total_score
    from public.submissions s
    join public.submission_scores sc on sc.submission_id = s.id
    where s.organization_id = p_org and s.status = 'approved'
      and s.approved_at >= now() - interval '60 days'
  ),
  pct as (
    select approved_at >= now() - interval '30 days' as this_month, total_score / max_total * 100 as p
    from approved where max_total > 0
  ),
  avgs as (
    select round(avg(p) filter (where this_month), 1) as cur,
           round(avg(p) filter (where not this_month), 1) as prev
    from pct
  ),
  lesson_rows as (
    select l.title, g.final_score, q.max_score, g.ai_criteria
    from public.question_grades g
    join public.submissions s on s.id = g.submission_id and s.status = 'approved'
    join public.questions q on q.id = g.question_id
    join public.lessons l on l.id = q.lesson_id
    where g.organization_id = p_org
  ),
  lessons as (
    select title, round(sum(coalesce(final_score, 0)) / nullif(sum(max_score), 0) * 100)::int as mastery
    from lesson_rows group by title
  ),
  misses as (
    select r.title, c->>'criterion' as criterion, count(*) as n
    from lesson_rows r, jsonb_array_elements(case when jsonb_typeof(r.ai_criteria) = 'array' then r.ai_criteria else '[]'::jsonb end) c
    where (c->>'met')::boolean is false
    group by 1, 2
  ),
  weak as (
    select l.title, coalesce(l.mastery, 0) as mastery,
           (select m.criterion from misses m where m.title = l.title order by m.n desc, m.criterion limit 1) as common_miss
    from lessons l
    order by coalesce(l.mastery, 0), l.title
    limit 3
  ),
  review as (
    select count(*) as papers, coalesce(sum(sc.low_confidence_unreviewed), 0) as answers
    from public.submissions s
    join public.submission_scores sc on sc.submission_id = s.id
    where s.organization_id = p_org and s.status = 'needs_review'
  ),
  tuition as (
    select sum(amount_due) as due, sum(least(paid_amount, amount_due)) as paid,
           count(*) filter (where status <> 'paid') as unpaid, count(*) as n
    from public.tuition_balances
    where organization_id = p_org
      and period_month = date_trunc('month', now() at time zone 'Asia/Gaza')::date
  )
  select jsonb_build_object(
    'groupsCount', (select count(*) from public.groups where organization_id = p_org and archived_at is null),
    'studentsCount', (select count(*) from public.students where organization_id = p_org and status = 'active'),
    'papersThisWeek', (select count(*) from public.submissions where organization_id = p_org and submitted_at >= now() - interval '7 days'),
    'answersAwaitingReview', (select answers from review),
    'papersAwaitingReview', (select papers from review),
    'avgPct', (select cur from avgs),
    'avgPctChange', (select round(cur - prev, 1) from avgs),
    'reportsSent', (select count(*) from public.reports where organization_id = p_org and status = 'sent'),
    'weakLessons', coalesce((select jsonb_agg(jsonb_build_object('lesson', title, 'mastery', mastery, 'commonMiss', common_miss)
                                              order by mastery, title) from weak), '[]'::jsonb),
    'tuition', (select case when n = 0 then null else jsonb_build_object(
                   'collected', paid,
                   'remaining', greatest(0, due - paid),
                   'unpaidStudents', unpaid,
                   'pct', case when due > 0 then round(paid / due * 100, 1) else 100 end) end
                from tuition)
  )
$$;
revoke execute on function public.dashboard_summary(uuid) from public, anon;
grant execute on function public.dashboard_summary(uuid) to authenticated;
