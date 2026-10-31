import Anthropic from "@anthropic-ai/sdk";
import { fixPdfArabic } from "./arabic";
import { compatibleVisionText } from "./openai-compatible";
import type { firmAi } from "./access";

export const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_CHARS = 500_000;

export class AttachmentError extends Error {}

const READ_PROMPT = "انسخ كل النص الظاهر في هذا المستند حرفيًا وبنفس ترتيبه، بلغته الأصلية. إن لم يكن فيه نص فصف محتواه بدقة. اكتب [غير واضح] لأي كلمة لا تستطيع قراءتها، ولا تخمّن ولا تُكمل من عندك. لا تضف تعليقًا.";

function imageType(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

type Ai = NonNullable<Awaited<ReturnType<typeof firmAi>>>;

/** Ask the firm's model to read an image (or a scanned PDF) into text. */
async function readWithVision(ai: Ai, mimeType: string, base64: string) {
  const unsupported = "نموذج الذكاء الاصطناعي المستخدم في مكتبك لا يقرأ الصور أو الملفات الممسوحة. استخدم نموذجًا يدعم الرؤية مثل Claude، أو ارفع نصًا.";
  try {
    if (ai.provider === "anthropic") {
      const source = { type: "base64" as const, data: base64 };
      const block: Anthropic.ContentBlockParam = mimeType === "application/pdf"
        ? { type: "document", source: { ...source, media_type: "application/pdf" } }
        : { type: "image", source: { ...source, media_type: mimeType as "image/png" } };
      const stream = ai.client.messages.stream({ model: ai.model, max_tokens: 16000, messages: [{ role: "user", content: [block, { type: "text", text: READ_PROMPT }] }] });
      const final = await stream.finalMessage();
      return final.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
    }
    if (mimeType === "application/pdf") throw new AttachmentError(unsupported);
    return await compatibleVisionText({ baseUrl: ai.baseUrl, apiKey: ai.apiKey, model: ai.model, mimeType, base64, prompt: READ_PROMPT, signal: AbortSignal.timeout(90_000) });
  } catch (error) {
    if (error instanceof AttachmentError) throw error;
    console.error("hukm vision error", error);
    throw new AttachmentError(unsupported);
  }
}

/** Text of an uploaded file; `viaVision` marks text read by the AI model. */
export async function fileToText(file: File, ai: Ai): Promise<{ text: string; mimeType: string; viaVision: boolean }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  let text = "";
  let mimeType = file.type || "text/plain";
  let viaVision = false;

  const image = imageType(bytes);
  if (image) {
    if (bytes.length > MAX_IMAGE_BYTES) throw new AttachmentError("حجم الصورة أكبر من 5 ميغابايت.");
    mimeType = image;
    viaVision = true;
    text = await readWithVision(ai, image, Buffer.from(bytes).toString("base64"));
  } else if (String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-") {
    mimeType = "application/pdf";
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await extractText(await getDocumentProxy(bytes), { mergePages: true });
    text = fixPdfArabic(pdf.text).trim();
    if (text.replace(/\s/g, "").length < 40) {
      viaVision = true; // scanned PDF: no text layer
      text = await readWithVision(ai, mimeType, Buffer.from(bytes).toString("base64"));
    }
  } else if (name.endsWith(".docx")) {
    const mammoth = (await import("mammoth")).default;
    text = (await mammoth.extractRawText({ buffer: Buffer.from(bytes) }).catch(() => ({ value: "" }))).value;
    mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  } else if (/\.(txt|md|text)$/.test(name) || file.type.startsWith("text/")) {
    text = new TextDecoder("utf-8").decode(bytes);
  } else {
    throw new AttachmentError("الصيغة غير مدعومة. ارفع PDF أو Word (docx) أو ملفًا نصيًا أو صورة PNG/JPG/WEBP.");
  }

  text = text.replace(/\u0000/g, "").trim();
  if (text.length < 10) throw new AttachmentError("لم أجد نصًا يمكن قراءته في هذا الملف.");
  if (text.length > MAX_TEXT_CHARS) throw new AttachmentError("الملف أطول من الحد المسموح (500 ألف حرف). قسّمه إلى أجزاء.");
  return { text, mimeType, viaVision };
}
