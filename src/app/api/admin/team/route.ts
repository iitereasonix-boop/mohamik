import { NextResponse } from "next/server";
import { Prisma, TenantRole, UserKind } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { can } from "@/lib/permissions";
import { getSessionCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";

// Roles a managing partner can hand out from the team page.
const ASSIGNABLE = [TenantRole.LAWYER, TenantRole.TRAINEE, TenantRole.SECRETARY] as const;

const schema = z.object({
  name: z.string().trim().min(2, "الاسم قصير جدًا.").max(120),
  email: z.string().trim().email("البريد الإلكتروني غير صالح.").max(254),
  mobile: z.string().trim().max(20).optional().or(z.literal("")),
  role: z.enum(ASSIGNABLE),
  password: z
    .string()
    .min(10, "كلمة المرور 10 أحرف على الأقل.")
    .max(72)
    .refine((value) => Buffer.byteLength(value, "utf8") <= 72, "كلمة المرور طويلة جدًا."),
});

async function requireManager() {
  const ctx = await getSessionCtx();
  if (ctx?.kind !== "TENANT" || !ctx.tenantId || !ctx.role) return { error: "يلزم تسجيل الدخول.", status: 401 } as const;
  if (!can(ctx.role, "settings.manage")) return { error: "إدارة الفريق للشريك الإداري فقط.", status: 403 } as const;
  return { ctx: ctx as typeof ctx & { tenantId: string } } as const;
}

export async function POST(request: Request) {
  const auth = await requireManager();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { ctx } = auth;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join("؛ ") }, { status: 400 });
  }
  const data = parsed.data;
  const email = data.email.toLowerCase();
  const passwordHash = await bcrypt.hash(data.password, 12);

  try {
    const user = await withTenant(ctx.tenantId, async (tx) => {
      const created = await tx.user.create({
        data: {
          kind: UserKind.TENANT,
          tenantId: ctx.tenantId,
          email,
          passwordHash,
          name: data.name,
          mobile: data.mobile || null,
          tenantRole: data.role,
        },
        select: { id: true },
      });
      await tx.auditLog.create({
        data: { tenantId: ctx.tenantId, userId: ctx.userId, action: "CREATE", entityType: "User", entityId: created.id, detail: { role: data.role } },
      });
      return created;
    });
    return NextResponse.json({ ok: true, id: user.id }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "هذا البريد مستخدم لحساب آخر في المكتب." }, { status: 409 });
    }
    console.error("team-create error", error);
    return NextResponse.json({ error: "تعذّر إنشاء الحساب." }, { status: 500 });
  }
}

const toggleSchema = z.object({ id: z.string().min(1), active: z.boolean() });

export async function PATCH(request: Request) {
  const auth = await requireManager();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { ctx } = auth;

  const parsed = toggleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  const { id, active } = parsed.data;
  if (id === ctx.userId) return NextResponse.json({ error: "لا يمكنك تعطيل حسابك." }, { status: 400 });

  const updated = await withTenant(ctx.tenantId, async (tx) => {
    const result = await tx.user.updateMany({
      where: { id, tenantId: ctx.tenantId, kind: UserKind.TENANT, tenantRole: { not: TenantRole.MANAGING_PARTNER } },
      data: { active },
    });
    if (result.count) {
      await tx.auditLog.create({
        data: { tenantId: ctx.tenantId, userId: ctx.userId, action: "UPDATE", entityType: "User", entityId: id, detail: { active } },
      });
    }
    return result.count;
  });
  if (!updated) return NextResponse.json({ error: "العضو غير موجود." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
