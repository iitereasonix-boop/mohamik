-- Dynamic ownership reassignment (works regardless of exact table list).
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO hukm_user', t);
  END LOOP;
END $$;
