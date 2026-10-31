import { guardSection } from "@/lib/admin-access";
import { can } from "@/lib/permissions";
import HukmRobot from "@/components/hukm/HukmRobot";
import HukmTabs from "./HukmTabs";

export const dynamic = "force-dynamic";

export default async function HukmLayout({ children }: { children: React.ReactNode }) {
  const ctx = await guardSection("hukm");
  return (
    <div className="mx-auto max-w-7xl">
      <div className="relative overflow-hidden rounded-3xl bg-[#0a1428] px-5 py-5 text-white sm:px-7">
        <div aria-hidden className="lux-lattice pointer-events-none absolute inset-0 opacity-[0.06]" />
        <div aria-hidden className="pointer-events-none absolute -top-24 left-10 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(212,175,106,0.3),transparent_65%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <HukmRobot size={50} className="shrink-0" />
            <div>
              <h1 className="font-arabic-heading text-2xl font-bold">«حُكم» <span className="text-gold">المساعد القانوني</span></h1>
              <p className="text-xs text-white/60">يجيب من ملفات مكتبك ومكتبته القانونية فقط، مع مرجع لكل معلومة.</p>
            </div>
          </div>
          <HukmTabs showSettings={can(ctx.role, "settings.manage")} />
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}
