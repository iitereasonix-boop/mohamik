import { redirect } from "next/navigation";
import type { TenantRole } from "@prisma/client";
import { getSessionCtx } from "@/lib/session";

// Which admin sections each firm role may open. A secretary works the
// appointments desk only; the managing partner alone manages team and website.
export const SECTIONS = {
  dashboard: { href: "/admin", label: "لوحة القيادة", roles: ["MANAGING_PARTNER", "LAWYER", "TRAINEE"] },
  hukm: { href: "/admin/hukm", label: "«حُكم» المساعد الذكي", roles: ["MANAGING_PARTNER", "LAWYER", "TRAINEE"] },
  cases: { href: "/admin/cases", label: "القضايا", roles: ["MANAGING_PARTNER", "LAWYER", "TRAINEE"] },
  intake: { href: "/admin/intake", label: "صندوق الطلبات", roles: ["MANAGING_PARTNER", "LAWYER", "TRAINEE"] },
  clients: { href: "/admin/clients", label: "العملاء", roles: ["MANAGING_PARTNER", "LAWYER", "TRAINEE"] },
  appointments: { href: "/admin/appointments", label: "المواعيد", roles: ["MANAGING_PARTNER", "LAWYER", "TRAINEE", "SECRETARY"] },
  team: { href: "/admin/team", label: "الفريق", roles: ["MANAGING_PARTNER"] },
  website: { href: "/admin/website", label: "موقع المكتب ورابط العملاء", roles: ["MANAGING_PARTNER"] },
} satisfies Record<string, { href: string; label: string; roles: TenantRole[] }>;

export type Section = keyof typeof SECTIONS;

export function canOpen(role: TenantRole, section: Section) {
  return (SECTIONS[section].roles as TenantRole[]).includes(role);
}

/** First section a role is allowed to open — its landing page in /admin. */
export function homeFor(role: TenantRole) {
  const first = (Object.keys(SECTIONS) as Section[]).find((s) => canOpen(role, s));
  return first ? SECTIONS[first].href : "/login";
}

/** Server-side guard for an admin page; returns the tenant context. */
export async function guardSection(section: Section) {
  const ctx = await getSessionCtx();
  if (ctx?.kind !== "TENANT" || !ctx.tenantId || !ctx.role) redirect("/login");
  if (!canOpen(ctx.role, section)) redirect(homeFor(ctx.role));
  return ctx as typeof ctx & { tenantId: string; role: TenantRole };
}
