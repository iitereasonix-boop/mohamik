import { NextResponse } from "next/server";
import { z } from "zod";
import { CaseType, PlanTier, Prisma, UserKind, TenantRole, TenantStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(2).max(120),
  subdomain: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9-]+$/, "النطاق الفرعي يجب أن يكون أحرفاً لاتينية صغيرة وأرقاماً وشرطات فقط"),
  barNumber: z.string().min(3).max(40),
  commercialReg: z.string().max(40).optional().or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  ownerEmail: z.string().email(),
  ownerPassword: z.string().min(10, "كلمة المرور يجب أن تكون 10 أحرف على الأقل"),
  plan: z.enum(["SOLO", "FIRM", "ENTERPRISE"]).default("FIRM"),
  practiceAreas: z.array(z.nativeEnum(CaseType)).default([]),
});

// reserved subdomains
const RESERVED = new Set([
  "admin", "api", "www", "app", "mail", "support", "help", "platform",
  "mohamik", "login", "register", "auth", "static", "cdn",
]);

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("؛ ") },
      { status: 400 }
    );
  }
  const data = parsed.data;

  if (RESERVED.has(data.subdomain)) {
    return NextResponse.json({ error: "هذا النطاق محجوز، اختر اسماً آخر." }, { status: 400 });
  }

  const existing = await prisma.tenant.findFirst({
    where: { OR: [{ subdomain: data.subdomain }, { email: data.ownerEmail }] },
    select: { id: true, subdomain: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "النطاق أو البريد مستخدم مسبقاً." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(data.ownerPassword, 12);
  const plan = await prisma.plan.findUnique({ where: { tier: data.plan as PlanTier } });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.name,
          subdomain: data.subdomain,
          email: data.ownerEmail,
          phone: data.phone || null,
          address: data.address || null,
          barNumber: data.barNumber,
          commercialReg: data.commercialReg || null,
          status: TenantStatus.PENDING_VERIFICATION,
          practiceAreas: data.practiceAreas,
        },
      });

      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.id}, true)`;
      await tx.user.create({
        data: {
          kind: UserKind.TENANT,
          tenantId: tenant.id,
          email: data.ownerEmail,
          passwordHash,
          name: "الشريك المدير",
          tenantRole: TenantRole.MANAGING_PARTNER,
        },
      });

      if (plan) {
        const currentStart = new Date();
        const currentEnd = new Date();
        currentEnd.setMonth(currentEnd.getMonth() + 1);
        await tx.subscription.create({
          data: {
            tenantId: tenant.id,
            planId: plan.id,
            status: "TRIALING",
            currentStart,
            currentEnd,
          },
        });
      }

      return tenant;
    });

    return NextResponse.json(
      {
        ok: true,
        tenantId: result.id,
        subdomain: result.subdomain,
        status: "PENDING_VERIFICATION",
        message:
          "تم استلام الطلب. سيتم التحقق من عضوية النقابة والسجل التجاري قبل التفعيل.",
      },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "النطاق أو البريد مستخدم مسبقاً." }, { status: 409 });
    }
    console.error("register-firm error", e);
    return NextResponse.json({ error: "خطأ غير متوقع." }, { status: 500 });
  }
}
