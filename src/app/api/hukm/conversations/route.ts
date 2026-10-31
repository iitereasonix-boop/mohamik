import { NextResponse } from "next/server";
import { withTenant } from "@/lib/tenant";
import { requireHukm } from "@/lib/ai/access";

// Each user sees only their own conversations with «حُكم».
export async function GET() {
  const auth = await requireHukm();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;
  const conversations = await withTenant(ctx.tenantId, (tx) =>
    tx.aiConversation.findMany({
      where: { tenantId: ctx.tenantId, userId: ctx.userId },
      select: { id: true, title: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 60,
    })
  );
  return NextResponse.json({ conversations });
}
