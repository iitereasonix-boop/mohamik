import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";

// Public: serves a firm's uploaded logo/cover. Each upload gets a new id, so
// the response can be cached forever.
export async function GET(_request: Request, { params }: { params: { subdomain: string; id: string } }) {
  const firm = await prisma.tenant.findUnique({ where: { subdomain: params.subdomain }, select: { id: true } });
  if (!firm) return new Response("Not found", { status: 404 });

  const asset = await withTenant(firm.id, (tx) =>
    tx.tenantAsset.findFirst({
      where: { id: params.id, tenantId: firm.id },
      select: { data: true, mimeType: true },
    })
  );
  if (!asset) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(asset.data), {
    headers: {
      "Content-Type": asset.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
