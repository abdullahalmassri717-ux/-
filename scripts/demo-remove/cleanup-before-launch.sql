-- ============================================================================
-- دقة — تنظيف بيانات التجربة قبل التجربة الحقيقية (2026-11-26، بموافقة صاحب المشروع).
-- يحذف الجهات المذكورة بالمعرّف فقط (مع كل صفوفها وطلابها وامتحاناتها وأوراقها
-- وتقاريرها)، وصور أوراقها، ومستخدمي الأرقام التجريبية، وسجلات التجربة الصغيرة.
-- يُشغَّل داخل معاملة واحدة: أي خطأ = لا يتغيّر شيء.
-- المتغير extra_user_ids: معرّفات مستخدمين إضافيين للحذف (أو فارغ).
-- ============================================================================
\set ON_ERROR_STOP 1
begin;

create temp table target_orgs as
select id from public.organizations
 where id in ('4f6d59b4-0b32-4109-bf31-7726cf02e3b1',   -- مدرسة الامل (200 طالب تجريبي)
              'de300000-0000-4000-8000-0000000000a0')  -- مدرسة دقة التجريبية
    or (is_demo and id::text not like 'de3a0000-%');  -- جهات عرض مدير المنصة تبقى

\echo 'الجهات التي ستُحذف:'
select o.name from public.organizations o join target_orgs t using (id);

-- صور الأوراق والشعارات المخزّنة تحت هذه الجهات (التخزين يمنع الحذف المباشر إلا بهذا الإعداد).
set local storage.allow_delete_query = 'true';
delete from storage.objects
 where (storage.foldername(name))[1] in (select id::text from target_orgs);

delete from public.organizations where id in (select id from target_orgs);

delete from auth.users
 where phone in ('970599990001','970599990002','970599990003','970599990004','970599990005')
    or id::text = any(string_to_array(:'extra_user_ids', ','));

-- سجلات التجربة الصغيرة.
delete from public.whatsapp_login_codes;
delete from public.submission_link_attempts;

\echo 'بعد الحذف:'
select (select count(*) from public.organizations) as orgs_left,
       (select count(*) from public.students) as students_left,
       (select count(*) from public.submissions) as papers_left,
       (select count(*) from storage.objects) as files_left,
       (select count(*) from auth.users) as users_left,
       (select count(*) from public.platform_admins) as staff_left,
       (select count(*) from public.lessons) as lessons_left,
       (select count(*) from public.curricula) as curricula_left;

-- حماية: حساب صاحب المنصة والمنهج يجب أن يبقيا.
do $$ begin
  if not exists (select 1 from public.platform_admins) then raise exception 'platform admin missing, rolling back'; end if;
  if (select count(*) from public.lessons) < 5000 then raise exception 'lessons missing, rolling back'; end if;
end $$;

commit;
