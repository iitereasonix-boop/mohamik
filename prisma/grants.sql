-- Grant RLS-protected access to the application role hukm_app.
-- hukm_user remains the table owner (migrations); hukm_app is what the
-- app connects AS at runtime, so RLS actually applies to its queries.
GRANT USAGE ON SCHEMA public TO hukm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hukm_app;
ALTER DEFAULT PRIVILEGES FOR ROLE hukm_user IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hukm_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hukm_app;
ALTER DEFAULT PRIVILEGES FOR ROLE hukm_user IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO hukm_app;
GRANT hukm_app TO hukm_user;
