-- ============================================================================
-- دقة — المرحلة 1 (7/7): التخزين الخاص للملفات
--
-- كل الحاويات خاصة (لا روابط عامة). الملفات تُعرض بروابط مؤقتة (signed URLs).
-- أول جزء في مسار كل ملف هو معرّف الجهة، وعليه تُبنى الصلاحيات:
--   submission-pages : <org_id>/<assessment_id>/<submission_id>/<page>.jpg
--   payment-receipts : <org_id>/<invoice_id>/<file>
--   org-assets       : <org_id>/<file>          (شعار الجهة)
-- رفع الطالب من رابط التسليم /s/<code> يمر عبر الخادم (Edge Function) فقط.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('submission-pages', 'submission-pages', false, 15728640,
     array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']),
  ('payment-receipts', 'payment-receipts', false, 10485760,
     array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('org-assets', 'org-assets', false, 2097152,
     array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

-- تحويل نص إلى uuid بأمان (null إذا لم يكن صالحاً).
create or replace function private.try_uuid(p text)
returns uuid language plpgsql immutable as $$
begin
  return p::uuid;
exception when others then
  return null;
end $$;
grant execute on function private.try_uuid(text) to authenticated, service_role;

-- أوراق الطلاب: من يصل للامتحان (والجهة في المسار تطابق جهة الامتحان).
create or replace function private.can_access_submission_file(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.assessments a
    where a.id = private.try_uuid((storage.foldername(p_name))[2])
      and a.organization_id = private.try_uuid((storage.foldername(p_name))[1])
      and private.can_access_group(a.group_id))
$$;
grant execute on function private.can_access_submission_file(text) to authenticated, service_role;

create policy "submission pages: read" on storage.objects for select to authenticated
  using (bucket_id = 'submission-pages' and private.can_access_submission_file(name));
create policy "submission pages: upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'submission-pages' and private.can_access_submission_file(name));
create policy "submission pages: update" on storage.objects for update to authenticated
  using (bucket_id = 'submission-pages' and private.can_access_submission_file(name))
  with check (bucket_id = 'submission-pages' and private.can_access_submission_file(name));
create policy "submission pages: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'submission-pages' and private.can_access_submission_file(name));

-- إيصالات الدفع: مالك الجهة يرفع ويقرأ، ومدير المنصة يقرأ.
create policy "receipts: read" on storage.objects for select to authenticated
  using (bucket_id = 'payment-receipts'
         and (private.is_org_owner(private.try_uuid((storage.foldername(name))[1]))
              or private.is_platform_admin()));
create policy "receipts: upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-receipts'
              and private.is_org_owner(private.try_uuid((storage.foldername(name))[1])));

-- ملفات الجهة (الشعار): الأعضاء يقرؤون، والمالك يكتب.
create policy "org assets: read" on storage.objects for select to authenticated
  using (bucket_id = 'org-assets'
         and private.is_org_member(private.try_uuid((storage.foldername(name))[1])));
create policy "org assets: write" on storage.objects for insert to authenticated
  with check (bucket_id = 'org-assets'
              and private.is_org_owner(private.try_uuid((storage.foldername(name))[1])));
create policy "org assets: update" on storage.objects for update to authenticated
  using (bucket_id = 'org-assets'
         and private.is_org_owner(private.try_uuid((storage.foldername(name))[1])));
create policy "org assets: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'org-assets'
         and private.is_org_owner(private.try_uuid((storage.foldername(name))[1])));
