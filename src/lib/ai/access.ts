import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { TenantRole } from "@prisma/client";
import { canOpen } from "@/lib/admin-access";
import { can } from "@/lib/permissions";
import { getSessionCtx } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import { decryptSecret } from "./crypto";
import { normalizePublicApiUrl } from "./openai-compatible";

export const AI_MODELS = [
  { id: "claude-opus-5-5", label: "Claude Opus 5.5", hint: "Anthropic" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", hint: "Anthropic" },
] as const;
export const AI_PROVIDERS = [
  { id: "anthropic", label: "Anthropic (Claude)" },
  { id: "openai-compatible", label: "OpenAI-compatible (OpenAI، OpenRouter، Groq، DeepSeek وغيرها)" },
] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number]["id"];

export type HukmCtx = { userId: string; tenantId: string; role: TenantRole };

/** Firm staff allowed to use «حُكم»; otherwise an error response. */
export async function requireHukm(permission?: "settings.manage" | "knowledge.approve") {
  const ctx = await getSessionCtx();
  if (ctx?.kind !== "TENANT" || !ctx.tenantId || !ctx.role) {
    return { error: NextResponse.json({ error: "يلزم تسجيل الدخول." }, { status: 401 }) } as const;
  }
  if (!canOpen(ctx.role, "hukm") || (permission && !can(ctx.role, permission))) {
    return { error: NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء." }, { status: 403 }) } as const;
  }
  return { ctx: { userId: ctx.userId, tenantId: ctx.tenantId, role: ctx.role } as HukmCtx } as const;
}

/** The firm's AI provider configuration, or null when no key is configured. */
export async function firmAi(tenantId: string) {
  const settings = await withTenant(tenantId, (tx) =>
    tx.aiSettings.findUnique({ where: { tenantId }, select: { apiKeyEnc: true, model: true, enabled: true, provider: true, baseUrl: true } })
  );
  if (!settings || !settings.enabled) return null;
  const apiKey = decryptSecret(settings.apiKeyEnc);
  if (settings.provider === "openai-compatible") {
    if (!settings.baseUrl) throw new Error("OpenAI-compatible provider is missing its API URL");
    const baseUrl = await normalizePublicApiUrl(settings.baseUrl);
    return { provider: "openai-compatible" as const, apiKey, baseUrl, model: settings.model };
  }
  return { provider: "anthropic" as const, client: new Anthropic({ apiKey, maxRetries: 2 }), model: settings.model };
}

/** Arabic message for an API failure, without leaking provider details. */
export function aiErrorMessage(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) return "مفتاح الذكاء الاصطناعي غير صالح أو أُلغي. حدّثه من إعدادات «حُكم».";
  if (error instanceof Anthropic.PermissionDeniedError) return "المفتاح لا يملك صلاحية استخدام هذا النموذج.";
  if (error instanceof Anthropic.NotFoundError) return "النموذج المختار غير متاح لهذا المفتاح. اختر نموذجًا آخر من الإعدادات.";
  if (error instanceof Anthropic.RateLimitError) return "تم تجاوز حد الاستخدام المسموح للمفتاح مؤقتًا. انتظر قليلًا ثم حاول مجددًا.";
  if (error instanceof Anthropic.BadRequestError) return "تعذّر تنفيذ الطلب (قد يكون رصيد الحساب منتهيًا أو الطلب طويلًا جدًا).";
  if (error instanceof Anthropic.InternalServerError) return "خدمة الذكاء الاصطناعي مشغولة حاليًا. حاول بعد قليل.";
  if (error instanceof Anthropic.APIConnectionError) return "تعذّر الاتصال بخدمة الذكاء الاصطناعي. تحقق من اتصال الخادم بالإنترنت.";
  return "حدث خطأ غير متوقع أثناء توليد الإجابة.";
}
