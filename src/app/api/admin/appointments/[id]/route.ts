import { NextResponse } from "next/server";
import { AppointmentStatus } from "@prisma/client";
import { z } from "zod";
import { can } from "@/lib/permissions";
import { getSessionCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";

// Allowed moves for an appointment: approve or decline a request, then record
// how a confirmed appointment ended.
const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "NO_SHOW", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

const schema = z.object({ status: z.nativeEnum(AppointmentStatus) });

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const ctx = await getSessionCtx();
  if (ctx?.kind !== "TENANT" || !ctx.tenantId || !ctx.role) {
    return NextResponse.json({ error: "يلزم تسجيل الدخول." }, { status: 401 });
  }
  if (!can(ctx.role, "appointment.manage")) {
    return NextResponse.json({ error: "ليس لديك صلاحية إدارة المواعيد." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "حالة غير صالحة." }, { status: 400 });
  const next = parsed.data.status;
  const tenantId = ctx.tenantId;

  const result = await withTenant(tenantId, async (tx) => {
    const appt = await tx.appointment.findFirst({ where: { id: params.id, tenantId }, select: { status: true } });
    if (!appt) return { error: "الموعد غير موجود.", status: 404 } as const;
    if (!TRANSITIONS[appt.status].includes(next)) {
      return { error: "لا يمكن نقل الموعد إلى هذه الحالة.", status: 409 } as const;
    }
    await tx.appointment.update({
      where: { id: params.id },
      // whoever approves becomes the staff member on the appointment
      data: { status: next, ...(next === "CONFIRMED" ? { staffId: ctx.userId } : {}) },
    });
    await tx.auditLog.create({
      data: { tenantId, userId: ctx.userId, action: "UPDATE", entityType: "Appointment", entityId: params.id, detail: { from: appt.status, to: next } },
    });
    return { ok: true } as const;
  });

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
