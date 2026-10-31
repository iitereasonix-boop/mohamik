-- Mohamik – Row-Level Security
-- Applied AFTER `prisma db push`. Enforces tenant isolation in the database
-- itself, not only in application code.
--
-- The app sets `SET LOCAL app.tenant_id = '<tenant-uuid>'` per transaction;
-- policies below only allow rows whose tenant_id matches (or NULL tenant_id
-- for platform-level rows).

-- Tables WITHOUT a direct tenantId column (TimelineEvent, Hearing, Deadline)
-- are protected via their parent Case in application queries and will get
-- tenantId columns in Phase 2 hardening.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'User','Client','Case','Document','Task','Appointment','IntakeRequest',
    'ClientMessage','ClientUpdate','CaseNote','Notification','AuditLog','Subscription',
    'ConsultRequest','TenantAsset',
    'AiSettings','KnowledgeDoc','KnowledgeChunk','AiConversation','AiMessage','AiAttachment'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    -- FORCE: the policies also bind the table owner. Without it, a runtime
    -- role that owns the tables silently bypasses every policy.
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
      USING (
        "tenantId" IS NULL
        OR "tenantId" = current_setting('app.tenant_id', true)
      )
    $f$, t);
  END LOOP;
END $$;
