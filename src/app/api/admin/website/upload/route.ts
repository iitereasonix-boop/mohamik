import { NextResponse } from "next/server";
import { can } from "@/lib/permissions";
import { getSessionCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";

const LIMITS = { LOGO: 2 * 1024 * 1024, COVER: 5 * 1024 * 1024, BACKGROUND: 5 * 1024 * 1024 } as const;
const FIELD = { LOGO: "logoUrl", COVER: "siteCoverImageUrl", BACKGROUND: "portalBackgroundUrl" } as const;
type Kind = keyof typeof LIMITS;

// Identify the image by its leading bytes rather than trusting the browser's
// declared type. SVG is deliberately not accepted (it can carry scripts).
function sniffImage(bytes: Uint8Array): string | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (
    bytes.length > 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) return "image/webp";
  if (bytes.length > 6 && String.fromCharCode(...bytes.slice(0, 4)) === "GIF8") return "image/gif";
  return null;
}

export async function POST(request: Request) {
  const ctx = await getSessionCtx();
  if (ctx?.kind !== "TENANT" || !ctx.tenantId || !ctx.role) {
    return NextResponse.json({ error: "يلزم تسجيل الدخول." }, { status: 401 });
  }
  if (!can(ctx.role, "settings.manage")) {
    return NextResponse.json({ error: "ليس لديك صلاحية تعديل الموقع." }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const kind = String(form?.get("kind") ?? "") as Kind;
  const file = form?.get("file");
  if (!(kind in LIMITS) || !(file instanceof File)) {
    return NextResponse.json({ error: "اختر صورة لرفعها." }, { status: 400 });
  }
  if (file.size > LIMITS[kind]) {
    return NextResponse.json(
      { error: `حجم الصورة أكبر من المسموح (${LIMITS[kind] / 1024 / 1024} ميغابايت).` },
      { status: 413 }
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = sniffImage(bytes);
  if (!mimeType) {
    return NextResponse.json({ error: "الصيغة غير مدعومة. استخدم PNG أو JPG أو WEBP." }, { status: 415 });
  }

  const tenantId = ctx.tenantId;
  const url = await withTenant(tenantId, async (tx) => {
    const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { subdomain: true } });
    // one current image per kind: replace the previous upload
    await tx.tenantAsset.deleteMany({ where: { tenantId, kind } });
    const asset = await tx.tenantAsset.create({
      data: { tenantId, kind, mimeType, sizeBytes: bytes.length, data: Buffer.from(bytes) },
      select: { id: true },
    });
    const assetUrl = `/api/f/${tenant.subdomain}/assets/${asset.id}`;
    await tx.tenant.update({
      where: { id: tenantId },
      data: { [FIELD[kind]]: assetUrl },
    });
    await tx.auditLog.create({
      data: { tenantId, userId: ctx.userId, action: "UPDATE", entityType: "TenantAsset", entityId: asset.id, detail: { kind } },
    });
    return assetUrl;
  });

  return NextResponse.json({ ok: true, url }, { status: 201 });
}
