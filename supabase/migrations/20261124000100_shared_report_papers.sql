-- الأوراق المصحّحة في تقرير ولي الأمر (طلب صاحب المشروع 2026-11-23).
-- صفحة الرابط dequa.study/r/<share_code> تعرض تحت التقرير زر «شوف الورقة المصحّحة»
-- لكل ورقة معتمدة من أسبوع التقرير: صورة الورقة، والدرجة لكل سؤال، وملاحظة المعلم.
--
-- الدالة للخادم فقط (service_role): وظيفة shared-report-papers تتحقق من الرمز وتنشئ
-- روابط صور مؤقتة (30 دقيقة) من الحاوية الخاصة. المتصفح لا يقرأ الجداول مباشرة.
-- نفس شروط get_shared_report: رمز صحيح، تقرير في الطابور أو أُرسل، عمره أقل من 60 يوماً.
-- لا أرقام هواتف ولا رموز طلاب ولا أسماء طلاب آخرين.

create or replace function public.shared_report_papers(p_code text)
returns jsonb
language sql stable security definer set search_path = '' as $$
  with r as (
    select r.organization_id, r.student_id, r.submission_id, r.period_start, r.period_end, r.subject_id
    from public.reports r
    where p_code ~ '^[0-9a-f]{12}([0-9a-f]{4})?$'
      and r.share_code = p_code
      and r.status in ('queued', 'sent')
      and r.created_at > now() - interval '60 days'
    limit 1
  ),
  subs as (
    select s.id, s.approved_at, a.title, coalesce(sub.name, '') as subject,
           sc.total_score as score, t.total_score as total
    from r
    join public.submissions s
      on s.organization_id = r.organization_id and s.student_id = r.student_id and s.status = 'approved'
    join public.assessments a on a.id = s.assessment_id
    join public.groups g on g.id = a.group_id
    left join public.subjects sub on sub.id = coalesce(a.subject_id, g.subject_id)
    join public.submission_scores sc on sc.submission_id = s.id
    join public.assessment_totals t on t.assessment_id = a.id
    where case
      when r.submission_id is not null then s.id = r.submission_id
      else r.period_end is not null
           -- نفس نافذة التقرير الأسبوعي: الأيام السبعة المنتهية بيوم التقرير (بتوقيت غزة).
           and s.approved_at >= ((r.period_end - 6)::timestamp at time zone 'Asia/Gaza') - interval '1 day'
           and s.approved_at <  ((r.period_end + 1)::timestamp at time zone 'Asia/Gaza')
           and (r.subject_id is null or coalesce(a.subject_id, g.subject_id) = r.subject_id)
    end
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', s.id,
           'title', s.title,
           'subject', s.subject,
           'score', s.score,
           'total', s.total,
           'approvedAt', s.approved_at,
           'questions', (
             select coalesce(jsonb_agg(jsonb_build_object(
                      'number', q.number,
                      'lesson', l.title,
                      'score', coalesce(qg.final_score, 0),
                      'max', q.max_score,
                      'note', nullif(btrim(qg.teacher_note), '')) order by q.number), '[]'::jsonb)
             from public.question_grades qg
             join public.questions q on q.id = qg.question_id
             left join public.lessons l on l.id = q.lesson_id
             where qg.submission_id = s.id),
           'pages', (
             select coalesce(jsonb_agg(coalesce(p.corrected_storage_path, p.storage_path) order by p.page_number), '[]'::jsonb)
             from public.submission_pages p
             where p.submission_id = s.id)
         ) order by s.subject, s.approved_at), '[]'::jsonb)
  from subs s
$$;
revoke all on function public.shared_report_papers(text) from public, anon, authenticated;
grant execute on function public.shared_report_papers(text) to service_role;
