-- التقرير الأسبوعي لولي الأمر: اسم الجهة والطالب والصف في أعلى الرسالة، ملاحظات المعلم ونصيحة للبيت،
-- وتسمية «نقاط القوة» و«نقاط تحتاج تقوية» (طلب صاحب المشروع 2026-11-14).
-- نفس الدالة من 20261111000300_weekly_reports.sql مع هذه الإضافات فقط.

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
  -- ملاحظات المعلم على أسئلة أوراق هذا الأسبوع.
  notes as (
    select p.student_id, p.subj, btrim(qg.teacher_note) as note, p.approved_at
    from paper p
    join public.question_grades qg on qg.submission_id = p.submission_id
    where p.this_week and nullif(btrim(qg.teacher_note), '') is not null
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
        (select '💪 نقاط القوة: ' || string_agg(x.lesson, '، ')
           from (select ll.lesson from lesson_level ll
                 where ll.student_id = ps.student_id and ll.subj is not distinct from ps.subj and ll.ratio >= 0.8
                 order by ll.ratio desc, ll.lesson limit 2) x),
        (select '🎯 نقاط تحتاج تقوية: ' || string_agg(x.lesson, '، ')
           from (select ll.lesson from lesson_level ll
                 where ll.student_id = ps.student_id and ll.subj is not distinct from ps.subj and ll.ratio < 0.6
                 order by ll.ratio, ll.lesson limit 2) x),
        (select '📝 ملاحظات المعلم: ' || string_agg(left(x.note, 120), '، ')
           from (select n.note from notes n
                 where n.student_id = ps.student_id and n.subj is not distinct from ps.subj
                 order by n.approved_at desc limit 2) x),
        coalesce(
          (select '💡 نصيحة للبيت: راجعوا مع الطالب ' || string_agg('«' || x.lesson || '»', ' و')
                  || '، وخلّوه يحلّ تمرينين إضافيين على كل درس.'
             from (select ll.lesson from lesson_level ll
                   where ll.student_id = ps.student_id and ll.subj is not distinct from ps.subj and ll.ratio < 0.6
                   order by ll.ratio, ll.lesson limit 2) x),
          case when ps.avg_now >= 85 then '💡 نصيحة للبيت: أداء ممتاز، شجّعوه واستمروا على نفس المراجعة.'
               else '💡 نصيحة للبيت: مراجعة دروس هذا الأسبوع ربع ساعة يومياً بتثبّت المعلومة.' end),
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
  -- صف الطالب وشعبته (كل الرسائل تصل من رقم «دقة» نفسه، فلازم يبان مين الطالب ومن أي جهة).
  cls as (
    select distinct on (gs.student_id) gs.student_id,
           case when gr.name is null or position(gr.name in g.name) > 0 then g.name
                else gr.name || ' – ' || g.name end as label
    from public.group_students gs
    join public.groups g on g.id = gs.group_id and g.organization_id = p_org and g.archived_at is null
    left join public.grades gr on gr.id = g.grade_id
    where gs.left_at is null
    order by gs.student_id, gr.sort_order nulls last, g.name
  ),
  header as (
    select '🗓️ من ' || to_char(w.d0, 'DD/MM') || ' إلى ' || to_char(w.d1, 'DD/MM') as period,
           case o.kind when 'individual_teacher' then '👨‍🏫 المعلم: '
                       when 'school' then '🏫 المدرسة: ' else '🏫 المركز: ' end || o.name as org_line,
           null::text as footer, o.kind
    from win w, org o
  )
  -- مدرّس خصوصي: رسالة لكل مادة.
  select st.id, st.full_name, st.parent_phone, st.parent_whatsapp_consent,
         s.subj, s.subject_name, s.papers,
         concat_ws(E'\n',
           '📘 التقرير الأسبوعي لمادة ' || s.subject_name,
           h.org_line,
           '👤 الطالب: ' || st.full_name || coalesce(' | الصف: ' || c.label, ''),
           h.period,
           '',
           s.text,
           h.footer)
  from section s
  join stu st on st.id = s.student_id
  left join cls c on c.student_id = st.id
  cross join header h
  where h.kind = 'individual_teacher'
  union all
  -- مدرسة أو مركز: رسالة واحدة فيها قسم لكل مادة.
  select st.id, st.full_name, st.parent_phone, st.parent_whatsapp_consent,
         null::uuid, null::text, sum(s.papers)::int,
         concat_ws(E'\n',
           '📋 التقرير الأسبوعي',
           h.org_line,
           '👤 الطالب: ' || st.full_name || coalesce(' | الصف: ' || c.label, ''),
           h.period,
           '',
           string_agg('📘 ' || s.subject_name || E'\n' || s.text, E'\n\n' order by s.subject_name),
           '',
           h.footer)
  from section s
  join stu st on st.id = s.student_id
  left join cls c on c.student_id = st.id
  cross join header h
  where h.kind <> 'individual_teacher'
  group by st.id, st.full_name, st.parent_phone, st.parent_whatsapp_consent, c.label, h.period, h.org_line, h.footer
$$;
revoke execute on function private.weekly_report_rows(uuid, timestamptz, boolean) from public, anon, authenticated;
