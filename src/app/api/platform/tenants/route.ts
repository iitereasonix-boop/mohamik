import { NextResponse } from "next/server";
import {
  AuditAction,
  Prisma,
  TenantRole,
  TenantStatus,
  UserKind,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const reviewSchema = z.object({
  tenantId: z.string().min(1),
  action: z.enum(["approve", "reject", "suspend", "reactivate"]),
});

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  subdomain: z.string().min(3).max(30).regex(/^[a-z0-9-]+$/),
  barNumber: z.string().trim().min(3).max(40),
  ownerName: z.string().trim().min(2).max(120),
  ownerEmail: z.string().trim().email().max(254),
  ownerPassword: z
    .string()
    .min(10)
    .max(72)
    .refine((value) => Buffer.byteLength(value, "utf8") <= 72),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

const RESERVED_SUBDOMAINS = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "cdn",
  "help",
  "login",
  "mail",
  "mohamik",
  "platform",
  "register",
  "static",
  "support",
  "www",
]);

async function getPlatformAdmin() {
  const session = await getSession();
  if (!session?.user?.id || session.user.kind !== "PLATFORM") return { status: 401 as const };
  if (session.user.platformRole !== "SUPER_ADMIN") return { status: 403 as const };
  return { status: 200 as const, userId: session.user.id };
}

export async function PATCH(request: Request) {
  const admin = await getPlatformAdmin();
  if (admin.status !== 200) {
    return NextResponse.json(
      { error: admin.status === 401 ? "يلزم تسجيل الدخول كمدير للمنصة." : "ليس لديك صلاحية تنفيذ هذا الإجراء." },
      { status: admin.status }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات الطلب غير صالحة." }, { status: 400 });
  }

  const nextStatus = {
    approve: TenantStatus.ACTIVE,
    reject: TenantStatus.REJECTED,
    suspend: TenantStatus.SUSPENDED,
    reactivate: TenantStatus.ACTIVE,
  }[parsed.data.action];
  const allowedCurrentStatuses =
    parsed.data.action === "approve" || parsed.data.action === "reject"
      ? [TenantStatus.PENDING_VERIFICATION]
      : parsed.data.action === "suspend"
        ? [TenantStatus.ACTIVE]
        : [TenantStatus.SUSPENDED];

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.tenant.updateMany({
        where: {
          id: parsed.data.tenantId,
          status: { in: allowedCurrentStatuses },
        },
        data: { status: nextStatus },
      });
      if (result.count !== 1) return null;

      const tenant = await tx.tenant.findUnique({
        where: { id: parsed.data.tenantId },
        select: { name: true, subdomain: true, email: true, phone: true },
      });
      if (!tenant) return null;

      await tx.auditLog.create({
        data: {
          platformUserId: admin.userId,
          action: AuditAction.UPDATE,
          entityType: "Tenant",
          entityId: parsed.data.tenantId,
          detail: { status: nextStatus },
        },
      });
      return tenant;
    });

    if (!updated) {
      return NextResponse.json(
        { error: "الطلب غير موجود أو سبق اتخاذ قرار بشأنه." },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true, status: nextStatus, ...updated });
  } catch (error) {
    console.error("review-tenant-application error", error);
    return NextResponse.json({ error: "تعذّرت معالجة طلب المكتب." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await getPlatformAdmin();
  if (admin.status !== 200) {
    return NextResponse.json(
      { error: admin.status === 401 ? "يلزم تسجيل الدخول كمدير للمنصة." : "ليس لديك صلاحية تنفيذ هذا الإجراء." },
      { status: admin.status }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((issue) => issue.message).join("؛ ") },
      { status: 400 }
    );
  }

  const data = parsed.data;
  if (RESERVED_SUBDOMAINS.has(data.subdomain)) {
    return NextResponse.json({ error: "هذا الرابط محجوز. اختر اسمًا آخر." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(data.ownerPassword, 12);
  try {
    const tenant = await prisma.$transaction(async (tx) => {
      const created = await tx.tenant.create({
        data: {
          name: data.name,
          subdomain: data.subdomain,
          status: TenantStatus.ACTIVE,
          barNumber: data.barNumber,
          email: data.ownerEmail.toLowerCase(),
          phone: data.phone || null,
        },
        select: { id: true, name: true, subdomain: true },
      });

      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${created.id}, true)`;
      await tx.user.create({
        data: {
          kind: UserKind.TENANT,
          tenantId: created.id,
          email: data.ownerEmail.toLowerCase(),
          passwordHash,
          name: data.ownerName,
          tenantRole: TenantRole.MANAGING_PARTNER,
        },
      });

      const plan = await tx.plan.findUnique({ where: { tier: "FIRM" } });
      if (plan) {
        const currentStart = new Date();
        const currentEnd = new Date(currentStart);
        currentEnd.setMonth(currentEnd.getMonth() + 1);
        await tx.subscription.create({
          data: {
            tenantId: created.id,
            planId: plan.id,
            status: "TRIALING",
            currentStart,
            currentEnd,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          platformUserId: admin.userId,
          action: AuditAction.CREATE,
          entityType: "Tenant",
          entityId: created.id,
          detail: { tenantId: created.id, source: "platform-console", status: TenantStatus.ACTIVE },
        },
      });
      return created;
    });

    return NextResponse.json(
      {
        ok: true,
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        email: data.ownerEmail.toLowerCase(),
        phone: data.phone || null,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "رابط المكتب أو بريده مستخدم مسبقًا." },
        { status: 409 }
      );
    }
    console.error("platform-create-tenant error", error);
    return NextResponse.json({ error: "تعذّر إنشاء حساب المكتب." }, { status: 500 });
  }
}
