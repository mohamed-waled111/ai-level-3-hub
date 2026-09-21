
CREATE POLICY "lecture files read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'lecture-files');
CREATE POLICY "lecture files admin insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lecture-files' AND private.has_role(auth.uid(),'admin'));
CREATE POLICY "lecture files admin update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'lecture-files' AND private.has_role(auth.uid(),'admin'));
CREATE POLICY "lecture files admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'lecture-files' AND private.has_role(auth.uid(),'admin'));
