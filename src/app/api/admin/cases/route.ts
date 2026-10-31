import { NextResponse } from "next/server";
import { CaseStage, CaseType, ClientRoleInCase, Prisma } from "@prisma/client";
import { z } from "zod";
import { can } from "@/lib/permissions";
import { getSessionCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";

const schema = z.object({
  clientId: z.string().min(1).max(40).optional(),
  newClient: z.object({
    name: z.string().trim().min(2, "اسم صاحب القضية قصير جدًا.").max(120),
    mobile: z.string().trim().min(7, "رقم جوال صاحب القضية غير صالح.").max(20),
    email: z.string().trim().email("بريد صاحب القضية غير صالح.").max(254).optional().or(z.literal("")),
  }).optional(),
  title: z.string().trim().min(3, "عنوان القضية قصير جدًا.").max(200),
  internalNumber: z.string().trim().max(40).optional().or(z.literal("")),
  courtNumber: z.string().trim().max(60).optional().or(z.literal("")),
  type: z.nativeEnum(CaseType),
  stage: z.nativeEnum(CaseStage),
  clientRole: z.nativeEnum(ClientRoleInCase),
  court: z.string().trim().max(120).optional().or(z.literal("")),
  chamber: z.string().trim().max(120).optional().or(z.literal("")),
  judge: z.string().trim().max(120).optional().or(z.literal("")),
  opposingName: z.string().trim().max(200).optional().or(z.literal("")),
  opposingCounsel: z.string().trim().max(200).optional().or(z.literal("")),
  claimValue: z.number().nonnegative("قيمة الدعوى غير صالحة.").max(999_999_999_999).nullable().optional(),
  summary: z.string().trim().min(10, "اكتب نص القضية ووقائعها.").max(50_000),
}).refine((d) => d.clientId || d.newClient, { message: "اختر صاحب القضية." });

export async function POST(request: Request) {
  const ctx = await getSessionCtx();
  if (ctx?.kind !== "TENANT" || !ctx.tenantId || !ctx.role) return NextResponse.json({ error: "يلزم تسجيل الدخول." }, { status: 401 });
  if (!can(ctx.role, "case.edit")) return NextResponse.json({ error: "لا تملك صلاحية إضافة القضايا." }, { status: 403 });
  const tenantId = ctx.tenantId;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join("؛ ") }, { status: 400 });
  const d = parsed.data;

  try {
    const created = await withTenant(tenantId, async (tx) => {
      let clientId = d.clientId;
      if (clientId) {
        const owned = await tx.client.findFirst({ where: { id: clientId, tenantId }, select: { id: true } });
        if (!owned) return null;
      } else {
        const c = d.newClient!;
        clientId = (await tx.client.create({ data: { tenantId, name: c.name, mobile: c.mobile, email: c.email || null, source: "أضافه المكتب" }, select: { id: true } })).id;
      }
      const internalNumber = d.internalNumber || (await nextNumber(tx, tenantId));
      const kase = await tx.case.create({
        data: {
          tenantId, clientId, internalNumber, title: d.title, type: d.type, stage: d.stage, status: "ACTIVE", clientRole: d.clientRole,
          courtNumber: d.courtNumber || null, court: d.court || null, chamber: d.chamber || null, judge: d.judge || null,
          opposingParties: d.opposingName ? [{ name: d.opposingName, counsel: d.opposingCounsel || undefined }] : undefined,
          claimValue: d.claimValue ?? null, clientSummary: d.summary,
          lawyers: { connect: { id: ctx.userId } },
        },
        select: { id: true },
      });
      await tx.auditLog.create({ data: { tenantId, userId: ctx.userId, action: "CREATE", entityType: "Case", entityId: kase.id, detail: { internalNumber } } });
      return kase;
    });
    if (!created) return NextResponse.json({ error: "العميل غير موجود." }, { status: 404 });
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "رقم القضية مستخدم من قبل في مكتبك." }, { status: 409 });
    }
    throw e;
  }
}

/** Next free "2026-007" style number of this firm. */
async function nextNumber(tx: Prisma.TransactionClient, tenantId: string) {
  const year = new Date().getFullYear();
  const used = await tx.case.findMany({ where: { tenantId, internalNumber: { startsWith: `${year}-` } }, select: { internalNumber: true } });
  const max = used.reduce((m, c) => Math.max(m, Number(c.internalNumber.split("-")[1]) || 0), 0);
  return `${year}-${String(max + 1).padStart(3, "0")}`;
}
