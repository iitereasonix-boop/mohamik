import Link from "next/link";
import type { Metadata } from "next";
import { CaseType, Prisma } from "@prisma/client";
import { ArrowRight, Scale, SearchX } from "lucide-react";
import { prisma } from "@/lib/prisma";
import LuxEffects from "@/components/landing/LuxEffects";
import FirmCard, { AREA_LABELS, firmCardSelect, type FirmCardData } from "@/components/landing/FirmCard";
import FirmSearch from "@/components/landing/FirmSearch";
import HukmWidget from "@/components/hukm/HukmWidget";

export const metadata: Metadata = { title: "مكاتب المحاماة المشاركة" };
export const dynamic = "force-dynamic";

export default async function FirmsDirectoryPage({
  searchParams,
}: {
  searchParams: { q?: string; area?: string };
}) {
  const q = (searchParams.q ?? "").trim().slice(0, 80);
  const area = Object.values(CaseType).includes(searchParams.area as CaseType)
    ? (searchParams.area as CaseType)
    : undefined;

  // a free-text query can also match a practice area by its Arabic label
  const areasFromText = q
    ? (Object.entries(AREA_LABELS).filter(([, label]) => label.includes(q)).map(([k]) => k) as CaseType[])
    : [];

  const where: Prisma.TenantWhereInput = {
    status: "ACTIVE",
    ...(area ? { practiceAreas: { has: area } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { siteTagline: { contains: q, mode: "insensitive" } },
            { siteAbout: { contains: q, mode: "insensitive" } },
            ...(areasFromText.length ? [{ practiceAreas: { hasSome: areasFromText } }] : []),
          ],
        }
      : {}),
  };

  let firms: FirmCardData[] = [];
  try {
    firms = await prisma.tenant.findMany({
      where,
      select: firmCardSelect,
      orderBy: [{ demo: "asc" }, { name: "asc" }],
      take: 60,
    });
  } catch {
    firms = [];
  }

  return (
    <main className="lux min-h-screen font-arabic-body">
      <LuxEffects />
      <section className="lux-grain relative isolate overflow-hidden pb-16 pt-10">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="lux-aurora absolute -top-40 right-[-10%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(212,175,106,0.25),transparent_62%)] blur-2xl" />
          <div className="lux-lattice absolute inset-0 opacity-[0.05] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        </div>
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <span className="bg-gold flex h-10 w-10 items-center justify-center rounded-xl"><Scale size={20} strokeWidth={1.8} /></span>
              <span className="font-arabic-heading text-xl font-bold text-gold">Mohamik</span>
            </Link>
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-[color:var(--lux-muted)] transition hover:text-[color:var(--lux-gold-soft)]">
              <ArrowRight size={15} /> الرئيسية
            </Link>
          </div>
          <h1 className="mt-14 text-center font-arabic-heading text-4xl font-bold sm:text-6xl">
            مكاتب المحاماة <span className="text-gold">المشاركة</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-center leading-8 text-[color:var(--lux-muted)]">
            اختر المكتب المناسب لك، ثم أنشئ حسابك الخاص من بوابته لتتابع قضيتك ومواعيدك معه مباشرة.
          </p>
          <div className="mx-auto mt-9 max-w-3xl">
            <FirmSearch q={q} area={area ?? ""} />
          </div>
        </div>
      </section>

      <section className="min-h-[50vh] bg-[#f7f4ee] py-16 text-[#0f1c36]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-sm text-[#0f1c36]/60">
            {q || area ? (
              <>
                نتائج البحث{q && <> عن «<strong className="text-[#0f1c36]">{q}</strong>»</>}
                {area && <> في <strong className="text-[#0f1c36]">{AREA_LABELS[area]}</strong></>} · {firms.length} مكتب
              </>
            ) : (
              <>{firms.length} مكتب على المنصة</>
            )}
          </p>
          {firms.length === 0 ? (
            <div className="mt-10 flex flex-col items-center rounded-3xl border border-dashed border-[#0f1c36]/15 bg-white px-6 py-16 text-center">
              <SearchX size={36} className="text-[#b08d57]" />
              <p className="mt-4 font-arabic-heading text-2xl font-bold">لا توجد مكاتب مطابقة</p>
              <p className="mt-2 text-sm text-[#0f1c36]/60">جرّب كلمة أخرى أو اختر «كل المجالات».</p>
              <Link href="/firms" className="mt-6 rounded-full bg-[#0f1c36] px-6 py-2.5 text-sm font-semibold text-white">عرض كل المكاتب</Link>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {firms.map((firm, i) => (
                <FirmCard key={firm.subdomain} firm={firm} delay={(i % 3) * 90} />
              ))}
            </div>
          )}
        </div>
      </section>
      <HukmWidget actions={[{ label: "القوانين الأردنية", href: "/laws" }, { label: "سجّل مكتبك", href: "/register-firm" }]} />
    </main>
  );
}
