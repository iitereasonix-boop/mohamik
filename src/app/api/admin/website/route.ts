import { NextResponse } from "next/server";
import { z } from "zod";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getSessionCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";

const imageUrl = z
  .string()
  .max(2048)
  .refine((value) => {
    if (!value) return true;
    // images uploaded from the firm's device are served from our own origin
    if (/^\/api\/f\/[a-z0-9-]+\/assets\/[a-z0-9]+$/.test(value)) return true;
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "يجب أن يكون رابط الصورة صالحًا وآمنًا (HTTPS).");

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  logoUrl: imageUrl,
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  siteCoverImageUrl: imageUrl,
  portalBackgroundUrl: imageUrl,
  siteTagline: z.string().trim().max(180),
  siteAbout: z.string().trim().max(2000),
});

export async function PATCH(request: Request) {
  const ctx = await getSessionCtx();
  if (!ctx?.tenantId || !ctx.role) {
    return NextResponse.json({ error: "يلزم تسجيل الدخول." }, { status: 401 });
  }
  if (!can(ctx.role, "settings.manage")) {
    return NextResponse.json({ error: "ليس لديك صلاحية تعديل الموقع." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((issue) => issue.message).join("؛ ") },
      { status: 400 }
    );
  }

  try {
    await withTenant(ctx.tenantId, async (tx) => {
      const tenant = await tx.tenant.update({
        where: { id: ctx.tenantId },
        data: {
          name: parsed.data.name,
          logoUrl: parsed.data.logoUrl || null,
          accentColor: parsed.data.accentColor,
          siteCoverImageUrl: parsed.data.siteCoverImageUrl || null,
          portalBackgroundUrl: parsed.data.portalBackgroundUrl || null,
          siteTagline: parsed.data.siteTagline || null,
          siteAbout: parsed.data.siteAbout || null,
        },
        select: { id: true },
      });
      await tx.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: "UPDATE",
          entityType: "TenantWebsite",
          entityId: tenant.id,
        },
      });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("update-firm-website error", error);
    return NextResponse.json({ error: "تعذّر حفظ إعدادات الموقع." }, { status: 500 });
  }
}
