import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { withTenant } from "@/lib/tenant";

export const STATUS_AR: Record<string, string> = {
  INTAKE_REVIEW: "قيد المراجعة",
  ACTIVE: "نشطة",
  SUSPENDED: "موقوفة",
  CLOSED_WON: "مغلقة – مكسب",
  CLOSED_LOST: "مغلقة – خسارة",
  CLOSED_SETTLED: "مغلقة – تسوية",
  CLOSED_OTHER: "مغلقة – أخرى",
};

export const TYPE_AR: Record<string, string> = {
  CRIMINAL: "جزائية", CIVIL: "مدنية", COMMERCIAL: "تجارية", LABOUR: "عمالية",
  FAMILY: "أحوال شخصية", REAL_ESTATE: "عقارية وإيجارات", COMPANIES: "شركات",
  CYBERCRIME: "جرائم إلكترونية", ENFORCEMENT: "تنفيذ", OTHER: "أخرى",
};

export const STAGES = [
  ["PRE_LITIGATION", "ما قبل التقاضي"],
  ["FIRST_INSTANCE", "أول درجة"],
  ["APPEAL", "استئناف"],
  ["CASSATION", "تمييز"],
  ["ENFORCEMENT", "تنفيذ"],
] as const;
export const STAGE_AR: Record<string, string> = Object.fromEntries(STAGES);

export const APPT_KIND_AR: Record<string, string> = { IN_OFFICE: "في المكتب", PHONE: "هاتفي", VIDEO: "مرئي" };
export const APPT_STATUS_AR: Record<string, string> = {
  SCHEDULED: "بانتظار التأكيد", CONFIRMED: "مؤكد", COMPLETED: "منجز", CANCELLED: "ملغى", NO_SHOW: "لم يحضر",
};

/** Tailwind classes for a case-status chip. */
export function statusTone(status: string) {
  if (status === "ACTIVE") return "bg-emerald-50 text-emerald-700 ring-emerald-600/15";
  if (status === "INTAKE_REVIEW") return "bg-amber-50 text-amber-700 ring-amber-600/15";
  if (status === "SUSPENDED") return "bg-slate-100 text-slate-600 ring-slate-500/15";
  if (status === "CLOSED_WON") return "bg-[#f7f1e4] text-[#7a5c2a] ring-[#b08d57]/30";
  return "bg-slate-100 text-slate-600 ring-slate-500/15";
}

export const fmtDate = (d: Date) => new Intl.DateTimeFormat("ar-JO", { dateStyle: "long", timeZone: "Asia/Amman" }).format(d);
export const fmtDateTime = (d: Date) =>
  new Intl.DateTimeFormat("ar-JO", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Amman" }).format(d);

/**
 * The active firm behind a portal URL plus, when the visitor is a client of
 * THIS firm, their client record. Cached per request so the layout and the
 * page share one lookup.
 */
export const getPortal = cache(async (subdomain: string) => {
  const firm = await prisma.tenant.findUnique({
    where: { subdomain },
    select: { id: true, name: true, subdomain: true, status: true, logoUrl: true, portalBackgroundUrl: true, phone: true, email: true, address: true },
  });
  if (!firm || firm.status !== "ACTIVE") notFound();

  const session = await getSession();
  const isClientHere =
    session?.user.kind === "CLIENT" && session.user.subdomain === subdomain && session.user.tenantId === firm.id;

  const client = isClientHere
    ? await withTenant(firm.id, (tx) =>
        tx.client.findFirst({
          where: { tenantId: firm.id, userId: session!.user.id },
          select: { id: true, name: true, mobile: true, email: true },
        })
      )
    : null;

  return { firm, client, signedInElsewhere: Boolean(session?.user && !client) };
});
