import { redirect } from "next/navigation";
import { guardSection } from "@/lib/admin-access";
import { can } from "@/lib/permissions";
import { withTenant } from "@/lib/tenant";
import { AI_MODELS, AI_PROVIDERS } from "@/lib/ai/access";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function HukmSettingsPage() {
  const ctx = await guardSection("hukm");
  if (!can(ctx.role, "settings.manage")) redirect("/admin/hukm");
  const s = await withTenant(ctx.tenantId, (tx) =>
    tx.aiSettings.findUnique({ where: { tenantId: ctx.tenantId }, select: { apiKeyLast4: true, provider: true, baseUrl: true, model: true, enabled: true, verifiedAt: true } })
  );
  return (
    <SettingsForm
      current={s ? {
        last4: s.apiKeyLast4,
        provider: s.provider === "openai-compatible" ? "openai-compatible" : "anthropic",
        baseUrl: s.baseUrl,
        model: s.model,
        enabled: s.enabled,
        verifiedAt: s.verifiedAt?.toISOString() ?? null,
      } : null}
      models={AI_MODELS}
      providers={AI_PROVIDERS}
    />
  );
}
