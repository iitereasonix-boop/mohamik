import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Run a query inside a transaction with the tenant id set so PostgreSQL
 * Row-Level Security enforces isolation in the database itself.
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: { timeout?: number }
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return fn(tx);
  }, options);
}

/** Structured audit log — who viewed, edited, downloaded or shared what. */
export async function audit(entry: {
  tenantId?: string;
  userId?: string;
  action: "VIEW" | "CREATE" | "UPDATE" | "DELETE" | "DOWNLOAD" | "SHARE" | "LOGIN" | "LOGOUT" | "AI_ACCESS";
  entityType: string;
  entityId?: string;
  detail?: object;
  ip?: string;
  userAgent?: string;
}) {
  try {
    if (entry.tenantId) {
      await withTenant(entry.tenantId, (tx) => tx.auditLog.create({ data: entry as any }));
    } else {
      await prisma.auditLog.create({ data: entry as any });
    }
  } catch (e) {
    // audit must never break the request, but log loudly in dev
    console.error("AUDIT_WRITE_FAILED", e);
  }
}
