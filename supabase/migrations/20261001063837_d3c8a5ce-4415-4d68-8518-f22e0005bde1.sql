CREATE TABLE public.summary_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_id uuid NOT NULL REFERENCES public.summaries(id) ON DELETE CASCADE,
  file_type text NOT NULL CHECK (file_type IN ('pdf', 'image')),
  storage_path text NOT NULL UNIQUE,
  original_file_name text NOT NULL,
  page_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.summary_files TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.summary_files TO authenticated;
GRANT ALL ON public.summary_files TO service_role;

ALTER TABLE public.summary_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "summary files read published"
ON public.summary_files
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.summaries s
    WHERE s.id = summary_files.summary_id
      AND (s.published OR private.has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "summary files admin write"
ON public.summary_files
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX summary_files_summary_order_idx ON public.summary_files(summary_id, page_order);

CREATE POLICY "summary storage read published"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'summary-files'
  AND EXISTS (
    SELECT 1
    FROM public.summary_files sf
    JOIN public.summaries s ON s.id = sf.summary_id
    WHERE sf.storage_path = name
      AND (s.published OR private.has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "summary storage admin insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'summary-files' AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "summary storage admin update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'summary-files' AND private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'summary-files' AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "summary storage admin delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'summary-files' AND private.has_role(auth.uid(), 'admin'::app_role));