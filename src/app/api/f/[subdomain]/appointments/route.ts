import { NextResponse } from "next/server";
import { z } from "zod";
import { AppointmentKind, Prisma, UserKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(2).max(120),
  mobile: z.string().min(7).max(20),
  email: z.string().email().optional().or(z.literal("")),
  kind: z.nativeEnum(AppointmentKind),
  date: z.string(), // ISO date
  notes: z.string().max(2000).optional().or(z.literal("")),
});

/**
 * Public portal endpoint – books an appointment for a specific firm.
 * Scoped by tenantId from the subdomain so firm A can never create
 * appointments in firm B.
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
  const data = parsed.data;
  const startAt = new Date(data.date);
  if (isNaN(startAt.getTime())) {
    return NextResponse.json({ error: "تاريخ غير صالح." }, { status: 400 });
  }

  try {
    const appt = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${firm.id}, true)`;

      // find or create client inside THIS firm only
      let client = await tx.client.findFirst({
        where: { tenantId: firm.id, mobile: data.mobile },
      });
      if (!client) {
        client = await tx.client.create({
          data: {
            tenantId: firm.id,
            name: data.name,
            mobile: data.mobile,
            email: data.email || null,
            source: "بوابة العملاء – حجز موعد",
          },
        });
      }

      return tx.appointment.create({
        data: {
          tenantId: firm.id,
          clientId: client.id,
          kind: data.kind,
          startAt,
          notes: data.notes || null,
          status: "SCHEDULED",
        },
      });
    });

    return NextResponse.json(
      { ok: true, appointmentId: appt.id },
      { status: 201 }
    );
  } catch (e) {
    console.error("book appointment error", e);
    return NextResponse.json({ error: "خطأ غير متوقع." }, { status: 500 });
  }
}
