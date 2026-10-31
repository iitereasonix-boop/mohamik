import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(2).max(120),
  mobile: z.string().min(7).max(20),
  email: z.string().email().optional().or(z.literal("")),
  subject: z.string().min(3).max(200),
  details: z.string().min(10).max(5000),
  caseType: z.string().optional().or(z.literal("")),
});

/**
 * Public portal endpoint – submits a consultation request for a firm.
 * Tenant-scoped by subdomain; creates ConsultRequest linked to that firm only.
 */
export async function POST(
  req: Request,
  { params }: { params: { subdomain: string } }
) {
  const firm = await prisma.tenant.findUnique({
    where: { subdomain: params.subdomain },
    select: { id: true, status: true },
  });
  if (!firm || firm.status !== "ACTIVE") {
    return NextResponse.json({ error: "المكتب غير متاح." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("؛ ") },
      { status: 400 }
    );
  }
  const d = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${firm.id}, true)`;

      let client = await tx.client.findFirst({
        where: { tenantId: firm.id, mobile: d.mobile },
      });
      if (!client) {
        client = await tx.client.create({
          data: {
            tenantId: firm.id,
            name: d.name,
            mobile: d.mobile,
            email: d.email || null,
            source: "بوابة العملاء – طلب استشارة",
          },
        });
      }

      return tx.consultRequest.create({
        data: {
          tenantId: firm.id,
          clientId: client.id,
          subject: d.subject,
          details: d.details,
          caseType: d.caseType || null,
          status: "NEW",
        },
      });
    });

    return NextResponse.json({ ok: true, requestId: result.id }, { status: 201 });
  } catch (e) {
    console.error("consult request error", e);
    return NextResponse.json({ error: "خطأ غير متوقع." }, { status: 500 });
  }
}
