import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { guardSection } from "@/lib/admin-access";
import { can } from "@/lib/permissions";
import WebsiteEditor from "./WebsiteEditor";

export const dynamic = "force-dynamic";

export default async function WebsiteSettingsPage() {
  const ctx = await guardSection("website");
  if (!ctx?.tenantId || !ctx.role) redirect("/login");
  if (!can(ctx.role, "settings.manage")) redirect("/admin");

  const firm = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: {
      name: true,
      subdomain: true,
      logoUrl: true,
      accentColor: true,
      siteCoverImageUrl: true,
      portalBackgroundUrl: true,
      siteTagline: true,
      siteAbout: true,
    },
  });
  if (!firm) redirect("/login");

  const requestHeaders = headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold">موقع المكتب</h1>
      <p className="mt-1 text-sm text-warmgray-500">
        خصّص الصفحة العامة لمكتبك؛ بيانات القضايا والعملاء تبقى داخل مساحة مكتبك ولا تظهر للزوار.
      </p>
      <WebsiteEditor
        publicBaseUrl={`${protocol}://${host}`}
        initial={{
          ...firm,
          logoUrl: firm.logoUrl ?? "",
          accentColor: firm.accentColor ?? "#6b1e2e",
          siteCoverImageUrl: firm.siteCoverImageUrl ?? "",
          portalBackgroundUrl: firm.portalBackgroundUrl ?? "",
          siteTagline: firm.siteTagline ?? "",
          siteAbout: firm.siteAbout ?? "",
        }}
      />
    </div>
  );
}
