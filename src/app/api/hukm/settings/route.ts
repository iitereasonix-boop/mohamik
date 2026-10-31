import { NextResponse } from "next/server";
import { z } from "zod";
import { withTenant } from "@/lib/tenant";
import { aiErrorMessage, requireHukm } from "@/lib/ai/access";
import { decryptSecret, encryptSecret } from "@/lib/ai/crypto";
import { compatibleApiErrorMessage, normalizePublicApiUrl, verifyCompatibleApi } from "@/lib/ai/openai-compatible";

const schema = z.object({
  apiKey: z.string().trim().min(1, "أدخل مفتاح API.").max(500).optional(),
  provider: z.enum(["anthropic", "openai-compatible"]),
  baseUrl: z.string().trim().max(500).optional(),
  model: z.string().trim().min(1, "أدخل اسم النموذج.").max(120),
  enabled: z.boolean(),
});

export async function GET() {
  const auth = await requireHukm("settings.manage");
  if ("error" in auth) return auth.error;
  const s = await withTenant(auth.ctx.tenantId, (tx) =>
    tx.aiSettings.findUnique({ where: { tenantId: auth.ctx.tenantId }, select: { apiKeyLast4: true, provider: true, baseUrl: true, model: true, enabled: true, verifiedAt: true, updatedAt: true } })
  );
  return NextResponse.json({ configured: Boolean(s), ...s });
}

/** Saves the provider settings only after checking the key and selected model. */
export async function PUT(request: Request) {
  const auth = await requireHukm("settings.manage");
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "طلب غير صالح." }, { status: 400 });
  const { model, enabled, provider } = parsed.data;

  const existing = await withTenant(ctx.tenantId, (tx) => tx.aiSettings.findUnique({ where: { tenantId: ctx.tenantId }, select: { apiKeyEnc: true } }));
  const apiKey = parsed.data.apiKey ?? (existing ? decryptSecret(existing.apiKeyEnc) : null);
  if (!apiKey) return NextResponse.json({ error: "أدخل مفتاح API." }, { status: 400 });

  let baseUrl: string | null = null;
  if (provider === "openai-compatible") {
    if (!parsed.data.baseUrl) return NextResponse.json({ error: "أدخل عنوان API للمزوّد." }, { status: 400 });
    try {
      baseUrl = await normalizePublicApiUrl(parsed.data.baseUrl);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "عنوان API غير صالح." }, { status: 400 });
    }
  }

  try {
    if (provider === "anthropic") {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      await new Anthropic({ apiKey, maxRetries: 1, timeout: 20_000 }).messages.countTokens({
        model,
        messages: [{ role: "user", content: "اختبار" }],
      });
    } else {
      if (!baseUrl) return NextResponse.json({ error: "أدخل عنوان API للمزوّد." }, { status: 400 });
      await verifyCompatibleApi(baseUrl, apiKey, model, AbortSignal.timeout(20_000));
    }
  } catch (error) {
    const message = provider === "anthropic" ? aiErrorMessage(error) : compatibleApiErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const data = {
    provider,
    baseUrl,
    model,
    enabled,
    verifiedAt: new Date(),
    updatedByUserId: ctx.userId,
    ...(parsed.data.apiKey ? { apiKeyEnc: encryptSecret(apiKey), apiKeyLast4: apiKey.slice(-4) } : {}),
  };
  await withTenant(ctx.tenantId, async (tx) => {
    await tx.aiSettings.upsert({
      where: { tenantId: ctx.tenantId },
      update: data,
      create: { tenantId: ctx.tenantId, apiKeyEnc: encryptSecret(apiKey), apiKeyLast4: apiKey.slice(-4), ...data },
    });
    await tx.auditLog.create({
      data: { tenantId: ctx.tenantId, userId: ctx.userId, action: "UPDATE", entityType: "AiSettings", detail: { provider, model, enabled, keyChanged: Boolean(parsed.data.apiKey) } },
    });
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const auth = await requireHukm("settings.manage");
  if ("error" in auth) return auth.error;
  const { ctx } = auth;
  await withTenant(ctx.tenantId, async (tx) => {
    await tx.aiSettings.deleteMany({ where: { tenantId: ctx.tenantId } });
    await tx.auditLog.create({ data: { tenantId: ctx.tenantId, userId: ctx.userId, action: "DELETE", entityType: "AiSettings" } });
  });
  return NextResponse.json({ ok: true });
}
