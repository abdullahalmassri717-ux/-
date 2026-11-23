-- ============================================================================
-- دقة — تقرير أسبوعي تجريبي لطالب في الصف العاشر (كل المواد في رسالة واحدة).
-- يشغّله .github/workflows/sample-report.yml. كل البيانات وهمية، في جهة تجريبية
-- منفصلة (is_demo) تُحذف تلقائياً مع البيانات التجريبية الأخرى.
-- آمن للتكرار: يحذف نسخته السابقة أولاً.
-- المتغير: :phone (رقم ولي الأمر +970...). مالك الجهة: مستخدم الرقم التجريبي 0599990003 إن وُجد.
-- ============================================================================
\set ON_ERROR_STOP on
select set_config('sample.phone', :'phone', false);

do $$
declare
  v_uid   uuid := (select id from auth.users where phone = '970599990003');
  v_phone text := current_setting('sample.phone');
  o   uuid := 'de300000-0000-4000-8000-0000000000a0';
  cls uuid := 'de301000-0000-4000-8000-0000000000a0';
  st  uuid := 'de302000-0000-4000-8000-0000000000a1';
  g10 uuid;
  v_subj uuid; v_grp uuid; v_asm uuid; v_sub uuid; v_q uuid;
  v_lessons uuid[];
  s record; p record;
  k int;
  v_at timestamptz;
  v_d1 date := (now() at time zone 'Asia/Gaza')::date;
begin
  delete from public.organizations where id = o;

  select g.id into g10 from public.grades g join public.curricula c on c.id = g.curriculum_id
   where c.slug = 'palestinian' and g.name = 'الصف العاشر';
  if g10 is null then raise exception 'grade 10 not found'; end if;

  -- is_demo من أول لحظة، حتى لا يُعتبر طالبها «أول طالب حقيقي».
  insert into public.organizations (id, name, kind, region, created_by, status, approved_at, is_demo)
  values (o, 'مدرسة دقة التجريبية', 'school', 'غزة', v_uid, 'active', now(), true);
  if v_uid is not null then
    insert into public.memberships (organization_id, user_id, role, status) values (o, v_uid, 'owner', 'active')
    on conflict (organization_id, user_id) do update set role = 'owner', status = 'active';
  end if;

  insert into public.groups (id, organization_id, name, label, grade_id, created_by)
  values (cls, o, 'الصف العاشر (أ)', 'الشعبة أ', g10, v_uid);
  insert into public.students (id, organization_id, full_name, student_code, parent_phone, parent_whatsapp_consent)
  values (st, o, 'أحمد خالد النجار', '1010', v_phone, true);
  insert into public.group_students (group_id, student_id, organization_id) values (cls, st, o);

  -- أوراق الطالب: المادة، العنوان، النوع، قبل كم يوم اعتُمدت، الدرجات القصوى، درجاته، رقم الدرس، ملاحظة المعلم.
  create temp table sample_papers (subj text, title text, kind public.assessment_kind, days numeric,
                                   maxes numeric[], scores numeric[], lessons int[], notes text[]) on commit drop;
  insert into sample_papers values
    ('الرياضيات', 'واجب الدرس الأول', 'homework', 16, '{5,5}', '{3,3.5}', '{1,2}', '{}'),
    ('الرياضيات', 'اختبار قصير', 'exam', 2, '{4,3,3}', '{4,2.5,1}', '{1,2,3}', '{NULL,NULL,"يرتّب خطوات الحل ويكتب القانون أولاً"}'),
    ('اللغة العربية', 'واجب الإملاء', 'homework', 5, '{5,5}', '{5,4}', '{1,2}', '{}'),
    ('اللغة العربية', 'اختبار القواعد', 'exam', 2, '{4,3,3}', '{3.5,3,2}', '{1,2,3}', '{"خط جميل وإجابات مرتبة"}'),
    ('اللغة الإنجليزية', 'Unit 1 Quiz', 'exam', 3, '{5,5,5}', '{4,3,5}', '{1,2,3}', '{NULL,"يحتاج تدريباً على زمن الماضي"}'),
    ('الفيزياء', 'واجب القياس', 'homework', 20, '{10}', '{7}', '{1}', '{}'),
    ('الفيزياء', 'اختبار الوحدة الأولى', 'exam', 4, '{5,5}', '{2,3.5}', '{1,2}', '{}'),
    ('الكيمياء', 'واجب', 'homework', 1, '{5,5}', '{5,4.5}', '{1,2}', '{}'),
    ('التربية الإسلامية', 'اختبار قصير', 'exam', 3, '{10}', '{9.5}', '{1}', '{}');

  for s in select distinct subj from sample_papers loop
    select id into v_subj from public.subjects where grade_id = g10 and name = s.subj limit 1;
    if v_subj is null then raise notice 'subject % not found, skipped', s.subj; continue; end if;

    insert into public.groups (organization_id, name, label, grade_id, subject_id, class_group_id, created_by)
    values (o, 'الصف العاشر (أ) – ' || s.subj, 'الشعبة أ', g10, v_subj, cls, v_uid)
    returning id into v_grp;

    select array_agg(l.id order by u.sort_order, l.sort_order, l.title) into v_lessons
    from public.lessons l
    join public.units u on u.id = l.unit_id
    where u.subject_id = v_subj;
    v_lessons := v_lessons[1:4];

    -- «وين وصلنا»: درسان قبل أسبوعين، والثالث هذا الأسبوع.
    insert into public.group_lesson_progress (group_id, organization_id, lesson_id, taught_at, marked_by)
    select v_grp, o, v_lessons[i], now() - make_interval(days => case when i < 3 then 15 - i else 3 end), v_uid
    from generate_series(1, least(3, coalesce(array_length(v_lessons, 1), 0))) i;

    for p in select * from sample_papers where subj = s.subj order by days desc loop
      v_at := now() - make_interval(days => p.days::int, hours => 2);
      insert into public.assessments (organization_id, group_id, subject_id, title, kind, scheduled_on, status, created_by)
      values (o, v_grp, v_subj, p.title, p.kind, (v_at at time zone 'Asia/Gaza')::date, 'completed', v_uid)
      returning id into v_asm;
      insert into public.submissions (organization_id, assessment_id, student_id, source, status,
                                      submitted_at, graded_at, approved_at, approved_by)
      values (o, v_asm, st, 'teacher_scan', 'approved', v_at - interval '1 hour', v_at - interval '50 minutes', v_at, v_uid)
      returning id into v_sub;
      for k in 1 .. array_length(p.maxes, 1) loop
        insert into public.questions (assessment_id, number, text, max_score, lesson_id)
        values (v_asm, k, 'السؤال ' || k, p.maxes[k], v_lessons[p.lessons[k]])
        returning id into v_q;
        insert into public.question_grades (submission_id, organization_id, question_id, ai_score, ai_confidence,
                                            ai_model, graded_at, final_score, teacher_note, reviewed_by, reviewed_at)
        values (v_sub, o, v_q, p.scores[k], 0.95, 'sample', v_at - interval '50 minutes',
                p.scores[k], p.notes[k], v_uid, v_at);
      end loop;
    end loop;
  end loop;

  -- نفس ما يفعله الجدول الأسبوعي (queue_weekly_reports) لكن لهذه الجهة فقط.
  insert into public.reports
    (organization_id, student_id, kind, recipient_phone, body, status, period_start, period_end, subject_id, created_by)
  select o, r.student_id, 'progress', r.parent_phone, r.body, 'queued', v_d1 - 6, v_d1, r.subject_id, v_uid
  from private.weekly_report_rows(o, now(), false) r
  where r.parent_phone is not null;
end $$;

-- السطر الأول: معرّف التقرير ورمز رابطه. بعده نص التقرير كما يراه ولي الأمر.
select r.id || ' ' || r.share_code from public.reports r
 where r.organization_id = 'de300000-0000-4000-8000-0000000000a0' and r.kind = 'progress';
select r.body from public.reports r
 where r.organization_id = 'de300000-0000-4000-8000-0000000000a0' and r.kind = 'progress';
