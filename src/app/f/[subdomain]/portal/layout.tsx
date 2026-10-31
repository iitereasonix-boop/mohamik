import Link from "next/link";
import { Scale, ShieldCheck } from "lucide-react";
import { getPortal } from "@/lib/portal";
import PortalNav from "@/components/portal/PortalNav";
import SignOutButton from "@/components/portal/SignOutButton";
import HukmWidget from "@/components/hukm/HukmWidget";

export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { subdomain: string };
}) {
  const { firm, client } = await getPortal(params.subdomain);
  const base = `/f/${firm.subdomain}/portal`;
  const loginUrl = `/login?subdomain=${encodeURIComponent(firm.subdomain)}`;

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f4ee] font-arabic-body text-[#0f1c36]">
      <header className="relative isolate overflow-hidden bg-[#0a1428] text-white">
        {firm.portalBackgroundUrl ? (
          <>
            {/* the firm's own background image, under a navy veil for legible text */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={firm.portalBackgroundUrl} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
            <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(10,20,40,0.94),rgba(10,20,40,0.78)_55%,rgba(10,20,40,0.55))]" />
            <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-t from-[#0a1428]/90 to-transparent" />
          </>
        ) : (
          <div aria-hidden className="lux-lattice pointer-events-none absolute inset-0 opacity-[0.05]" />
        )}
        <div aria-hidden className="pointer-events-none absolute -top-32 right-[-5%] h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(212,175,106,0.22),transparent_65%)]" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className={`flex items-center justify-between gap-4 ${firm.portalBackgroundUrl ? "pb-8 pt-6" : "py-4"}`}>
            <Link href={base} className="flex min-w-0 items-center gap-3">
              {firm.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={firm.logoUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl bg-white object-contain p-1" />
              ) : (
                <span className="bg-gold flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                  <Scale size={21} strokeWidth={1.8} />
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate font-arabic-heading text-lg font-bold sm:text-xl">{firm.name}</span>
                <span className="flex items-center gap-1.5 text-[11px] text-[#d4af6a]">
                  <ShieldCheck size={12} /> بوابة العملاء الخاصة
                </span>
              </span>
            </Link>
            {client ? (
              <div className="flex shrink-0 items-center gap-3">
                <span className="hidden text-left sm:block">
                  <span className="block text-sm font-semibold">{client.name}</span>
                  <span className="block text-[11px] text-white/50">حساب عميل</span>
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 font-bold text-[#f1dfb3] ring-1 ring-[#d4af6a]/40">
                  {client.name.trim().charAt(0)}
                </span>
                <SignOutButton redirectTo={base} />
              </div>
            ) : (
              <div className="flex shrink-0 items-center gap-2">
                <Link href={loginUrl} className="whitespace-nowrap rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold transition hover:border-[#d4af6a]/60 sm:px-4">
                  دخول
                </Link>
                <Link href={`${base}/register`} className="bg-gold whitespace-nowrap rounded-xl px-3 py-2 text-sm font-bold sm:px-4">
                  إنشاء حساب
                </Link>
              </div>
            )}
          </div>
          <PortalNav base={base} />
        </div>
      </header>

      <main className="flex-1">{children}</main>
      <HukmWidget
        firm={firm.subdomain}
        firmName={firm.name}
        actions={[
          { label: "حجز موعد", href: `${base}/book` },
          { label: "طلب استشارة", href: `${base}/consult` },
          { label: "قضاياي", href: `${base}/cases` },
        ]}
      />

      <footer className="border-t border-[#0f1c36]/[0.08] bg-white/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-[#0f1c36]/55 sm:px-6">
          <span className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-[#b08d57]" />
            حسابك خاص بك وبهذا المكتب فقط — لا يطّلع عليه أي عميل آخر.
          </span>
          <Link href="/" className="font-arabic-heading text-sm font-bold text-[#9a7436]">Mohamik</Link>
        </div>
      </footer>
    </div>
  );
}
