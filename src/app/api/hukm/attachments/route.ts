import { NextResponse } from "next/server";
import { withTenant } from "@/lib/tenant";
import { firmAi, requireHukm } from "@/lib/ai/access";
import { AttachmentError, MAX_FILE_BYTES, fileToText } from "@/lib/ai/attachments";

export const maxDuration = 120;

/** Upload a case file or image into a conversation (created when missing). */
export async function POST(request: Request) {
  const auth = await requireHukm();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "اختر ملفًا لرفعه." }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "حجم الملف أكبر من 15 ميغابايت." }, { status: 413 });

  const ai = await firmAi(ctx.tenantId);
  if (!ai) return NextResponse.json({ error: "لم يُفعَّل «حُكم» بعد." }, { status: 409 });

  const fileName = file.name.slice(0, 180);
  let extracted;
  try {
    extracted = await fileToText(file, ai);
  } catch (error) {
    if (error instanceof AttachmentError) return NextResponse.json({ error: error.message }, { status: 422 });
    console.error("hukm attachment error", error);
    return NextResponse.json({ error: "تعذّرت قراءة الملف. قد يكون تالفًا أو محميًا بكلمة مرور." }, { status: 422 });
  }

  const requested = form?.get("conversationId");
  const saved = await withTenant(ctx.tenantId, async (tx) => {
    const conversation = typeof requested === "string" && requested
      ? await tx.aiConversation.findFirst({ where: { id: requested, tenantId: ctx.tenantId, userId: ctx.userId }, select: { id: true } })
      : await tx.aiConversation.create({ data: { tenantId: ctx.tenantId, userId: ctx.userId, title: `ملف: ${fileName}`.slice(0, 70) }, select: { id: true } });
    if (!conversation) return null;
    const attachment = await tx.aiAttachment.create({
      data: { tenantId: ctx.tenantId, conversationId: conversation.id, userId: ctx.userId, fileName, mimeType: extracted.mimeType, text: extracted.text, charCount: extracted.text.length, viaVision: extracted.viaVision },
      select: { id: true },
    });
    await tx.auditLog.create({ data: { tenantId: ctx.tenantId, userId: ctx.userId, action: "AI_ACCESS", entityType: "AiAttachment", entityId: attachment.id, detail: { viaVision: extracted.viaVision } } });
    return { id: attachment.id, conversationId: conversation.id };
  }, { timeout: 20_000 });
  if (!saved) return NextResponse.json({ error: "المحادثة غير موجودة." }, { status: 404 });
  return NextResponse.json({ ...saved, fileName, chars: extracted.text.length, viaVision: extracted.viaVision }, { status: 201 });
}
