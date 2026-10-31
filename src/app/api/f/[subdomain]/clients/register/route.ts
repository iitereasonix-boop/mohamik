import { NextResponse } from "next/server";
import { Prisma, TenantStatus, UserKind } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  mobile: z.string().trim().min(7).max(20),
  email: z.string().trim().email().max(254),
  password: z
    .string()
    .min(10)
    .max(72)
    .refine((value) => Buffer.byteLength(value, "utf8") <= 72, "كلمة المرور طويلة جدًا."),
  privacyAccepted: z.boolean().refine((value) => value, "يجب الموافقة على استخدام البيانات."),
});

export async function POST(
  request: Request,
  { params }: { params: { subdomain: string } }
) {
  const firm = await prisma.tenant.findUnique({
    where: { subdomain: params.subdomain },
    select: { id: true, status: true },
  });
  if (!firm || firm.status !== TenantStatus.ACTIVE) {
    return NextResponse.json({ error: "المكتب غير متاح." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((issue) => issue.message).join("؛ ") },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const email = data.email.toLowerCase();
  try {
    const existingRecords = await withTenant(firm.id, async (tx) => {
      const [existingUser, existingClient] = await Promise.all([
        tx.user.findFirst({
          where: { tenantId: firm.id, email: { equals: email, mode: "insensitive" } },
          select: { id: true },
        }),
        tx.client.findFirst({
          where: { tenantId: firm.id, mobile: data.mobile },
          select: { id: true },
        }),
      ]);
      return { hasUser: Boolean(existingUser), hasClient: Boolean(existingClient) };
    });
    if (existingRecords.hasUser || existingRecords.hasClient) {
      return NextResponse.json(
        { error: "تعذّر إنشاء الحساب بهذه البيانات. تواصل مع المكتب للمساعدة." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${firm.id}, true)`;
      const user = await tx.user.create({
        data: {
          kind: UserKind.CLIENT,
          tenantId: firm.id,
          email,
          passwordHash,
          name: data.name,
          mobile: data.mobile,
        },
        select: { id: true },
      });
      await tx.client.create({
        data: {
          tenantId: firm.id,
          userId: user.id,
          name: data.name,
          mobile: data.mobile,
          email,
          source: "تسجيل بوابة العملاء",
          consentAt: data.privacyAccepted ? new Date() : null,
        },
        select: { id: true },
      });
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "تعذّر إنشاء الحساب بهذه البيانات. تواصل مع المكتب للمساعدة." },
        { status: 409 }
      );
    }
    console.error("client-registration error", error);
    return NextResponse.json({ error: "تعذّر إنشاء الحساب." }, { status: 500 });
  }
}
