-- ============================================================================
-- دقة — آخر علامتين لكل طالب (لصفحة الطلاب: العلامة الأخيرة والاتجاه ↑↓).
-- كان المتصفح ينزّل كل الأوراق المعتمدة في الجهة ثم يحسب. Supabase يرسل 1000
-- سطر فقط، فبعد أول 1000 ورقة صارت العلامات تُحسب من جزء من البيانات.
-- الآن تُحسب هنا: لكل طالب آخر ورقتين معتمدتين ونسبتهما المئوية.
-- تعمل بصلاحيات المستخدم نفسه (security invoker): المعلم يرى طلابه فقط.
-- ============================================================================
create or replace function public.student_latest_scores(p_org uuid)
returns table (student_id uuid, latest_pct int, previous_pct int)
language sql stable security invoker set search_path = '' as $$
  with totals as (
    select q.assessment_id, sum(q.max_score) as total
    from public.questions q
    group by q.assessment_id
  ),
  ranked as (
    select s.id, s.student_id, t.total,
           row_number() over (partition by s.student_id order by s.submitted_at desc, s.id desc) as rn
    from public.submissions s
    join totals t on t.assessment_id = s.assessment_id and t.total > 0
    where s.organization_id = p_org
      and s.status = 'approved'
      and s.student_id is not null
  ),
  latest_two as (
    select r.student_id, r.rn,
           round(coalesce((select sum(g.final_score) from public.question_grades g where g.submission_id = r.id), 0)
                 / r.total * 100)::int as pct
    from ranked r
    where r.rn <= 2
  )
  select l.student_id,
         max(l.pct) filter (where l.rn = 1),
         max(l.pct) filter (where l.rn = 2)
  from latest_two l
  group by l.student_id
$$;
revoke execute on function public.student_latest_scores(uuid) from public, anon;
grant execute on function public.student_latest_scores(uuid) to authenticated;
