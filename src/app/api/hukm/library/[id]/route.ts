import { NextResponse } from "next/server";
import { withTenant } from "@/lib/tenant";
import { requireHukm } from "@/lib/ai/access";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireHukm();
  if ("error" in auth) return auth.error;
  const doc = await withTenant(auth.ctx.tenantId, (tx) =>
    tx.knowledgeDoc.findFirst({
      where: { id: params.id, tenantId: auth.ctx.tenantId },
      select: {
        id: true, kind: true, title: true, reference: true, chunkCount: true, createdAt: true,
        chunks: { select: { idx: true, heading: true, text: true }, orderBy: { idx: "asc" }, take: 400 },
      },
    })
  );
  if (!doc) return NextResponse.json({ error: "المستند غير موجود." }, { status: 404 });
  return NextResponse.json({ doc });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireHukm("knowledge.approve");
  if ("error" in auth) return auth.error;
  const { ctx } = auth;
  const removed = await withTenant(ctx.tenantId, async (tx) => {
    const result = await tx.knowledgeDoc.deleteMany({ where: { id: params.id, tenantId: ctx.tenantId } });
    if (result.count) {
      await tx.auditLog.create({ data: { tenantId: ctx.tenantId, userId: ctx.userId, action: "DELETE", entityType: "KnowledgeDoc", entityId: params.id } });
    }
    return result.count;
  });
  if (!removed) return NextResponse.json({ error: "المستند غير موجود." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
