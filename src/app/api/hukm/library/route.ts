import { NextResponse } from "next/server";
import { z } from "zod";
import { withTenant } from "@/lib/tenant";
import { requireHukm } from "@/lib/ai/access";
import { chunkLegalText, normalizeArabic } from "@/lib/ai/arabic";

const schema = z.object({
  kind: z.enum(["LAW", "PRECEDENT", "REFERENCE"]),
  title: z.string().trim().min(3, "العنوان قصير جدًا.").max(200),
  reference: z.string().trim().max(300).optional().or(z.literal("")),
  content: z.string().trim().min(30, "النص قصير جدًا.").max(1_500_000, "النص أطول من المسموح (1.5 مليون حرف)."),
});

export async function GET() {
  const auth = await requireHukm();
  if ("error" in auth) return auth.error;
  const docs = await withTenant(auth.ctx.tenantId, (tx) =>
    tx.knowledgeDoc.findMany({
      where: { tenantId: auth.ctx.tenantId },
      select: { id: true, kind: true, title: true, reference: true, chunkCount: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    })
  );
  return NextResponse.json({ docs });
}

export async function POST(request: Request) {
  const auth = await requireHukm("knowledge.approve");
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "طلب غير صالح." }, { status: 400 });
  const d = parsed.data;
  const chunks = chunkLegalText(d.content);

  const doc = await withTenant(ctx.tenantId, async (tx) => {
    const created = await tx.knowledgeDoc.create({
      data: {
        tenantId: ctx.tenantId, kind: d.kind, title: d.title, reference: d.reference || null,
        content: d.content, chunkCount: chunks.length, createdByUserId: ctx.userId,
      },
      select: { id: true },
    });
    for (let i = 0; i < chunks.length; i += 500) {
      await tx.knowledgeChunk.createMany({
        data: chunks.slice(i, i + 500).map((c, j) => ({
          tenantId: ctx.tenantId, docId: created.id, idx: i + j, heading: c.heading, text: c.text,
          norm: normalizeArabic(`${c.heading ?? ""} ${c.text}`),
        })),
      });
    }
    await tx.auditLog.create({
      data: { tenantId: ctx.tenantId, userId: ctx.userId, action: "CREATE", entityType: "KnowledgeDoc", entityId: created.id, detail: { kind: d.kind, chunks: chunks.length } },
    });
    return created;
  }, { timeout: 60_000 });

  const articles = chunks.filter((c) => c.heading).length;
  return NextResponse.json({ ok: true, id: doc.id, chunks: chunks.length, articles }, { status: 201 });
}
