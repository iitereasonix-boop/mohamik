import { NextResponse } from "next/server";
import { withTenant } from "@/lib/tenant";
import { requireHukm } from "@/lib/ai/access";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireHukm();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;
  const conversation = await withTenant(ctx.tenantId, (tx) =>
    tx.aiConversation.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId, userId: ctx.userId },
      select: {
        id: true, title: true,
        messages: { select: { id: true, role: true, content: true, sources: true, unverified: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      },
    })
  );
  if (!conversation) return NextResponse.json({ error: "المحادثة غير موجودة." }, { status: 404 });
  return NextResponse.json({ conversation });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireHukm();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;
  const result = await withTenant(ctx.tenantId, (tx) =>
    tx.aiConversation.deleteMany({ where: { id: params.id, tenantId: ctx.tenantId, userId: ctx.userId } })
  );
  if (!result.count) return NextResponse.json({ error: "المحادثة غير موجودة." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
