import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { can, Permission, TenantRole } from "@/lib/permissions";
import { TenantRole as PrismaTenantRole } from "@prisma/client";

export async function getSession() {
  return getServerSession(authOptions);
}

export type SessionCtx = {
  userId: string;
  kind?: "PLATFORM" | "TENANT" | "CLIENT";
  subdomain?: string;
  tenantId?: string;
  role?: TenantRole;
};

export async function getSessionCtx(): Promise<SessionCtx | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return {
    userId: session.user.id,
    kind: session.user.kind as SessionCtx["kind"],
    subdomain: session.user.subdomain,
    tenantId: session.user.tenantId,
    role: session.user.role as TenantRole | undefined,
  };
}

export async function requireTenantCtx(): Promise<SessionCtx & { tenantId: string; role: TenantRole }> {
  const ctx = await getSessionCtx();
  if (ctx?.kind !== "TENANT" || !ctx.tenantId || !ctx.role) throw new Error("UNAUTHORIZED");
  return ctx as SessionCtx & { tenantId: string; role: TenantRole };
}

// Every permission check is enforced on the server.
export async function requirePermission(permission: Permission) {
  const ctx = await requireTenantCtx();
  if (!can(ctx.role, permission)) throw new Error("FORBIDDEN");
  return ctx;
}

export function isTenantRole(v: string): v is PrismaTenantRole {
  return ["MANAGING_PARTNER", "LAWYER", "TRAINEE", "SECRETARY", "ACCOUNTANT"].includes(v);
}
