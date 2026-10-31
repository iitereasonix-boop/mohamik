import { guardSection } from "@/lib/admin-access";
import { can } from "@/lib/permissions";
import { withTenant } from "@/lib/tenant";
import HukmChat from "./HukmChat";

export const dynamic = "force-dynamic";

export default async function HukmPage() {
  const ctx = await guardSection("hukm");
  const [settings, libraryCount, user] = await withTenant(ctx.tenantId, (tx) =>
    Promise.all([
      tx.aiSettings.findUnique({ where: { tenantId: ctx.tenantId }, select: { enabled: true } }),
      tx.knowledgeDoc.count({ where: { tenantId: ctx.tenantId } }),
      tx.user.findUnique({ where: { id: ctx.userId }, select: { name: true } }),
    ])
  );
  return (
    <HukmChat
      configured={Boolean(settings?.enabled)}
      isManager={can(ctx.role, "settings.manage")}
      firstName={user?.name.split(" ")[0] ?? ""}
      libraryCount={libraryCount}
    />
  );
}
