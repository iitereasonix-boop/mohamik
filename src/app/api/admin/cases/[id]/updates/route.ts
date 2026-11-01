import { NextResponse } from "next/server";
import { DocumentFolder } from "@prisma/client";
import { firmAi } from "@/lib/ai/access";
import { fileToText, MAX_FILE_BYTES } from "@/lib/ai/attachments";
import { can } from "@/lib/permissions";
import { getSessionCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";

const MAX_FILES = 5;

// Identify the file by its leading bytes, not the browser's declared type.
function sniffFile(bytes: Uint8Array, name: string): string | null {
  const head = String.fromCharCode(...bytes.slice(0, 5));
  if (head === "%PDF-") return "application/pdf";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && head.slice(1, 4) === "PNG") return "image/png";
  if (head.startsWith("RIFF") && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  if (head.startsWith("PK") && name.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && name.endsWith(".doc")) return "application/msword";
  if (name.endsWith(".txt") && !bytes.includes(0)) return "text/plain";
  return null;
}

/** Text for «حُكم»; the file is kept even when it cannot be read. */
async function readForHukm(tenantId: string, file: File) {
  try {
    const ai = await firmAi(tenantId);
    return ai ? (await fileToText(file, ai)).text : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const ctx = await getSessionCtx();
  if (ctx?.kind !== "TENANT" || !ctx.tenantId || !ctx.role) return NextResponse.json({ error: "يلزم تسجيل الدخول." }, { status: 401 });
  if (!can(ctx.role, "case.edit")) return NextResponse.json({ error: "لا تملك صلاحية تعديل القضايا." }, { status: 403 });
  const tenantId = ctx.tenantId;

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim().slice(0, 20_000);
  const eventDate = new Date(String(form.get("date") ?? ""));
  const visibleToClient = form.get("visibleToClient") === "true";
  const folder = String(form.get("folder") ?? "OTHER") as DocumentFolder;
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

  if (title.length < 3 || title.length > 200) return NextResponse.json({ error: "اكتب عنوانًا لما حدث في القضية." }, { status: 400 });
  if (Number.isNaN(eventDate.getTime())) return NextResponse.json({ error: "تاريخ غير صالح." }, { status: 400 });
  if (!(folder in DocumentFolder)) return NextResponse.json({ error: "تصنيف الملف غير صالح." }, { status: 400 });
  if (files.length > MAX_FILES) return NextResponse.json({ error: `الحد الأقصى ${MAX_FILES} ملفات في المرة الواحدة.` }, { status: 400 });

  const uploads: { name: string; bytes: Uint8Array; mimeType: string; text: string | null }[] = [];
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: `حجم «${file.name}» أكبر من 15 ميغابايت.` }, { status: 413 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mimeType = sniffFile(bytes, file.name.toLowerCase());
    if (!mimeType) return NextResponse.json({ error: `صيغة «${file.name}» غير مدعومة. استخدم PDF أو Word أو صورة أو ملفًا نصيًا.` }, { status: 415 });
    uploads.push({ name: file.name.slice(0, 200), bytes, mimeType, text: await readForHukm(tenantId, file) });
  }

  const saved = await withTenant(tenantId, async (tx) => {
    const kase = await tx.case.findFirst({ where: { id: params.id, tenantId }, select: { id: true, clientId: true } });
    if (!kase) return null;
    const event = await tx.timelineEvent.create({
      data: { caseId: kase.id, kind: "note", title, description: description || null, eventDate, visibleToClient, createdByUserId: ctx.userId },
      select: { id: true },
    });
    for (const u of uploads) {
      const asset = await tx.tenantAsset.create({
        data: { tenantId, kind: "CASE_DOCUMENT", mimeType: u.mimeType, sizeBytes: u.bytes.length, data: Buffer.from(u.bytes) },
        select: { id: true },
      });
      await tx.document.create({
        data: {
          tenantId, caseId: kase.id, clientId: kase.clientId, folder, title: u.name, storageKey: `asset:${asset.id}`, mimeType: u.mimeType,
          sizeBytes: u.bytes.length, ocrText: u.text, visibleToClient, uploadedByUserId: ctx.userId,
        },
      });
    }
    await tx.case.update({ where: { id: kase.id }, data: { updatedAt: new Date() } });
    await tx.auditLog.create({ data: { tenantId, userId: ctx.userId, action: "CREATE", entityType: "TimelineEvent", entityId: event.id, detail: { caseId: kase.id, files: uploads.length } } });
    return event;
  });
  if (!saved) return NextResponse.json({ error: "القضية غير موجودة." }, { status: 404 });
  return NextResponse.json({ ok: true, files: uploads.length, readable: uploads.filter((u) => u.text).length }, { status: 201 });
}
