import Link from "next/link";
import { redirect } from "next/navigation";
import { Scale } from "lucide-react";
import { getSessionCtx } from "@/lib/session";
import { ROLE_LABELS_AR } from "@/lib/permissions";
import { SECTIONS, canOpen, type Section } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import SignOutButton from "@/components/portal/SignOutButton";
import HukmRobotLink from "@/components/hukm/HukmRobotLink";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getSessionCtx();
  // only firm staff may enter the admin area; clients go back to their own portal
  if (ctx?.kind === "CLIENT" && ctx.subdomain) redirect(`/f/${ctx.subdomain}/portal/cases`);
  if (ctx?.kind !== "TENANT" || !ctx.tenantId || !ctx.role) redirect("/login");

  const role = ctx.role;
  const nav = (Object.keys(SECTIONS) as Section[]).filter((s) => canOpen(role, s)).map((s) => SECTIONS[s]);

  const firm = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { name: true },
  });

  return (
    <div className="min-h-screen bg-paper md:flex">
      <aside className="hidden w-64 shrink-0 flex-col bg-[#0a1428] text-white md:flex">
        <div className="flex items-center gap-3 px-5 py-6">
          <span className="bg-gold flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"><Scale size={20} /></span>
          <div className="min-w-0">
            <p className="truncate font-arabic-heading text-lg font-bold">{firm?.name ?? "Mohamik"}</p>
            <p className="text-xs text-[#d4af6a]">غرفة الإدارة</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="sidebar-link">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-between gap-2 border-t border-white/10 px-5 py-4 text-xs text-white/60">
          <span>{ROLE_LABELS_AR[role]}</span>
          <SignOutButton redirectTo="/login" />
        </div>
      </aside>

      {/* phones: compact header + scrollable section tabs */}
      <header className="bg-[#0a1428] text-white md:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="min-w-0">
            <span className="block truncate font-arabic-heading font-bold">{firm?.name ?? "Mohamik"}</span>
            <span className="text-[11px] text-[#d4af6a]">{ROLE_LABELS_AR[role]}</span>
          </span>
          <SignOutButton redirectTo="/login" />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 [scrollbar-width:none]">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="shrink-0 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/10 hover:text-white">
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1 px-4 py-8 sm:px-6">{children}</main>
      {canOpen(role, "hukm") && <HukmRobotLink />}
    </div>
  );
}
