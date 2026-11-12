-- ============================================================================
-- دقة — حسابات تجريبية على الموقع الحقيقي، لتجربة المنصة بدون دفع.
-- يشغّلها .github/workflows/demo-accounts.yml بعد إنشاء المستخدمين.
-- آمنة للتكرار: تضيف الناقص فقط ولا تحذف شيئاً. كل الأسماء والأرقام وهمية.
--
--   0599990001  مدرّس خصوصي (رياضيات العاشر)
--   0599990002  مدرّسة خصوصية (علوم التاسع)
--   0599990003  مديرة مدرسة تجريبية
--   0599990004  معلم في المدرسة + عنده دروس خصوصية (يجرّب مبدّل الجهات)
--   0599990005  بدون جهة، لتجربة التسجيل من الصفر
-- ============================================================================
do $$
declare
  u1 uuid; u2 uuid; u3 uuid; u4 uuid;
  o1 uuid := 'de300000-0000-4000-8000-000000000001';
  o2 uuid := 'de300000-0000-4000-8000-000000000002';
  o3 uuid := 'de300000-0000-4000-8000-000000000003';
  o4 uuid := 'de300000-0000-4000-8000-000000000004';
  g10 uuid; g9 uuid; g6 uuid;
  s10math uuid; s10phys uuid; s9sci uuid; s6math uuid; s6eng uuid;
  names text[] := array['سلمى أحمد','يزن خالد','ليان محمود','كرم سامي','جنى وائل','آدم يوسف','تالا عمر','حمزة نادر'];
  i int;
  st uuid;
begin
  select id into u1 from auth.users where phone = '970599990001';
  select id into u2 from auth.users where phone = '970599990002';
  select id into u3 from auth.users where phone = '970599990003';
  select id into u4 from auth.users where phone = '970599990004';
  if u1 is null or u2 is null or u3 is null or u4 is null then
    raise exception 'demo users are missing; create them first';
  end if;

  update public.profiles set full_name = v.n
  from (values (u1, 'أ. سامر (تجريبي)'), (u2, 'أ. هبة (تجريبي)'), (u3, 'أ. منى، مديرة (تجريبي)'), (u4, 'أ. رامي (تجريبي)')) v(id, n)
  where profiles.id = v.id and (profiles.full_name is null or profiles.full_name = '');

  -- المنهاج الفلسطيني (مستورد من قبل)
  select g.id into g10 from public.grades g join public.curricula c on c.id = g.curriculum_id where c.slug = 'palestinian' and g.name = 'الصف العاشر';
  select g.id into g9  from public.grades g join public.curricula c on c.id = g.curriculum_id where c.slug = 'palestinian' and g.name = 'الصف التاسع';
  select g.id into g6  from public.grades g join public.curricula c on c.id = g.curriculum_id where c.slug = 'palestinian' and g.name = 'الصف السادس';
  select id into s10math from public.subjects where grade_id = g10 and name = 'الرياضيات';
  select id into s10phys from public.subjects where grade_id = g10 and name = 'الفيزياء';
  select id into s9sci   from public.subjects where grade_id = g9  and name = 'العلوم والحياة';
  select id into s6math  from public.subjects where grade_id = g6  and name = 'الرياضيات';
  select id into s6eng   from public.subjects where grade_id = g6  and name = 'اللغة الإنجليزية';

  -- الجهات (مفعّلة مباشرة، بدون انتظار موافقة)
  insert into public.organizations (id, name, kind, region, created_by, status, approved_at) values
    (o1, 'تجربة: دروس أ. سامر في الرياضيات', 'individual_teacher', 'غزة', u1, 'active', now()),
    (o2, 'تجربة: دروس أ. هبة في العلوم', 'individual_teacher', 'غزة', u2, 'active', now()),
    (o3, 'مدرسة دقة التجريبية', 'school', 'غزة', u3, 'active', now()),
    (o4, 'تجربة: دروس أ. رامي الخصوصية', 'individual_teacher', 'غزة', u4, 'active', now())
  on conflict (id) do nothing;

  insert into public.memberships (organization_id, user_id, role, status) values
    (o1, u1, 'owner', 'active'),
    (o2, u2, 'owner', 'active'),
    (o3, u3, 'owner', 'active'),
    (o3, u4, 'teacher', 'active'),
    (o4, u4, 'owner', 'active')
  on conflict (organization_id, user_id) do nothing;

  -- المجموعات (المدرّس الفردي يُسند لمجموعته تلقائياً لأنه أنشأها)
  insert into public.groups (id, organization_id, name, label, grade_id, subject_id, schedule, created_by) values
    ('de301000-0000-4000-8000-000000000001', o1, 'مجموعة الأحد والثلاثاء', 'الصف العاشر', g10, s10math, 'الأحد والثلاثاء 4:00 م', u1),
    ('de301000-0000-4000-8000-000000000002', o2, 'مجموعة السبت', 'الصف التاسع', g9, s9sci, 'السبت 10:00 ص', u2),
    ('de301000-0000-4000-8000-000000000004', o4, 'مجموعة الفيزياء المسائية', 'الصف العاشر', g10, s10phys, 'الإثنين 6:00 م', u4)
  on conflict (id) do nothing;

  -- المدرسة: صف بطلابه، ثم مجموعات المواد مربوطة به
  insert into public.groups (id, organization_id, name, label, grade_id, created_by) values
    ('de301000-0000-4000-8000-000000000030', o3, 'الصف السادس (أ)', 'الشعبة أ', g6, u3)
  on conflict (id) do nothing;

  -- الطلاب: 8 لكل مجموعة/صف. الرمز (4 أرقام) يُولَّد تلقائياً.
  for i in 1..8 loop
    st := ('de302000-0000-4000-8000-0000000001' || lpad(i::text, 2, '0'))::uuid;
    insert into public.students (id, organization_id, full_name) values (st, o1, names[i] || ' (تجريبي)') on conflict (id) do nothing;
    insert into public.group_students (group_id, student_id, organization_id) values ('de301000-0000-4000-8000-000000000001', st, o1) on conflict do nothing;

    st := ('de302000-0000-4000-8000-0000000002' || lpad(i::text, 2, '0'))::uuid;
    insert into public.students (id, organization_id, full_name) values (st, o2, names[9 - i] || ' (تجريبي)') on conflict (id) do nothing;
    insert into public.group_students (group_id, student_id, organization_id) values ('de301000-0000-4000-8000-000000000002', st, o2) on conflict do nothing;

    st := ('de302000-0000-4000-8000-0000000003' || lpad(i::text, 2, '0'))::uuid;
    insert into public.students (id, organization_id, full_name) values (st, o3, names[i] || ' (تجريبي)') on conflict (id) do nothing;
    insert into public.group_students (group_id, student_id, organization_id) values ('de301000-0000-4000-8000-000000000030', st, o3) on conflict do nothing;

    if i <= 5 then
      st := ('de302000-0000-4000-8000-0000000004' || lpad(i::text, 2, '0'))::uuid;
      insert into public.students (id, organization_id, full_name) values (st, o4, names[i + 3] || ' (تجريبي)') on conflict (id) do nothing;
      insert into public.group_students (group_id, student_id, organization_id) values ('de301000-0000-4000-8000-000000000004', st, o4) on conflict do nothing;
    end if;
  end loop;

  -- مجموعات مواد الصف السادس (ينضم لها طلاب الصف تلقائياً)
  insert into public.groups (id, organization_id, name, label, grade_id, subject_id, class_group_id, created_by) values
    ('de301000-0000-4000-8000-000000000031', o3, 'الصف السادس (أ) – الرياضيات', 'الشعبة أ', g6, s6math, 'de301000-0000-4000-8000-000000000030', u3),
    ('de301000-0000-4000-8000-000000000032', o3, 'الصف السادس (أ) – اللغة الإنجليزية', 'الشعبة أ', g6, s6eng, 'de301000-0000-4000-8000-000000000030', u3)
  on conflict (id) do nothing;

  -- أ. رامي يدرّس رياضيات السادس في المدرسة
  insert into public.group_teachers (group_id, organization_id, user_id) values
    ('de301000-0000-4000-8000-000000000031', o3, u4)
  on conflict do nothing;
end $$;

select o.name, count(distinct m.user_id) as members, count(distinct s.id) as students
from public.organizations o
left join public.memberships m on m.organization_id = o.id
left join public.students s on s.organization_id = o.id
where o.id::text like 'de300000-%'
group by o.name order by o.name;
