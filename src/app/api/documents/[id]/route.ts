import { canOpen } from "@/lib/admin-access";
import { getSessionCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";

// Private download of a case file: firm staff, or the case's own client when
// the file was shared with them.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const ctx = await getSessionCtx();
  if (!ctx?.tenantId) return new Response("Unauthorized", { status: 401 });
  const tenantId = ctx.tenantId;

  const file = await withTenant(tenantId, async (tx) => {
    const doc = await tx.document.findFirst({
      where: { id: params.id, tenantId },
      select: { title: true, mimeType: true, storageKey: true, visibleToClient: true, case: { select: { client: { select: { userId: true } } } } },
    });
    if (!doc?.storageKey.startsWith("asset:")) return null;
    const staff = ctx.kind === "TENANT" && !!ctx.role && canOpen(ctx.role, "cases");
    const owner = ctx.kind === "CLIENT" && doc.visibleToClient && doc.case?.client.userId === ctx.userId;
    if (!staff && !owner) return null;
    const asset = await tx.tenantAsset.findFirst({ where: { id: doc.storageKey.slice(6), tenantId, kind: "CASE_DOCUMENT" }, select: { data: true } });
    return asset ? { ...doc, data: asset.data } : null;
  });
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.title)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
