-- ============================================================================
-- دقة — حذف كل البيانات التجريبية من الموقع الحقيقي (قبل الإطلاق).
-- يشغّلها .github/workflows/remove-demo-accounts.yml يدوياً فقط.
-- تحذف: الجهات التجريبية الأربع (وأي جهة أنشأها رقم تجريبي) بكل صفوفها وطلابها وامتحاناتها وأوراقها،
-- ثم مستخدمي الأرقام التجريبية 0599990001–5. لا تلمس أي جهة أو مستخدم آخر.
-- ============================================================================
do $$
declare
  v_orgs int;
  v_users int;
begin
  delete from public.organizations
   where id::text like 'de300000-%'
      -- وأي جهة أنشأها أحد الأرقام التجريبية أثناء التجربة (مثل 0599990005).
      or created_by in (select id from auth.users
                         where phone in ('970599990001', '970599990002', '970599990003', '970599990004', '970599990005'));
  get diagnostics v_orgs = row_count;

  delete from auth.users
   where phone in ('970599990001', '970599990002', '970599990003', '970599990004', '970599990005');
  get diagnostics v_users = row_count;

  raise notice 'حُذفت % جهة تجريبية و% مستخدم تجريبي', v_orgs, v_users;
end $$;

select
  (select count(*) from public.organizations where id::text like 'de300000-%') as demo_orgs_left,
  (select count(*) from auth.users where phone like '9705999900%') as demo_users_left;
