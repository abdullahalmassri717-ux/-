-- صور الجهة (الشعار): بدون SVG. ملف SVG قد يحمل كوداً يعمل عند فتحه مباشرة،
-- والشعار لا يحتاجه (JPG وPNG وWEBP تكفي).
update storage.buckets
   set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'org-assets';
