-- Final data verification (no tenant context = no rows visible via RLS)
SELECT 'clients_visible_without_tenant_ctx=' || count(*) FROM "Client";
SELECT 'cases_visible_without_tenant_ctx=' || count(*) FROM "Case";
SELECT 'appointments_visible_without_tenant_ctx=' || count(*) FROM "Appointment";
