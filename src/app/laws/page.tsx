import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, BookOpen, FileClock, SearchX } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { normalizeArabic, searchTerms } from "@/lib/ai/arabic";
import HukmWidget from "@/components/hukm/HukmWidget";
import LawsSearch from "@/components/landing/LawsSearch";

export const metadata: Metadata = { title: "القوانين الأردنية" };
export const dynamic = "force-dynamic";

export default async function LawsPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? "").trim().slice(0, 100);
  const terms = searchTerms(q);
  const all = await prisma.publicLaw.findMany({
    select: { id: true, category: true, title: true, number: true, year: true, summary: true, articleCount: true },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });

  // match the title, category, number or year; then articles' text
  let laws = all;
  if (terms.length) {
    const inText = await prisma.publicLawArticle.findMany({
      where: { OR: terms.map((t) => ({ norm: { contains: t } })) },
      select: { lawId: true },
      distinct: ["lawId"],
    });
    const textIds = new Set(inText.map((a) => a.lawId));
    laws = all.filter((l) => {
      const meta = normalizeArabic(`${l.title} ${l.category} ${l.number ?? ""} ${l.year ?? ""}`);
      return textIds.has(l.id) || terms.some((t) => meta.includes(t));
    });
  }
  const groups = new Map<string, typeof laws>();
  for (const l of laws) groups.set(l.category, [...(groups.get(l.category) ?? []), l]);

  return (
    <main className="min-h-screen bg-[#f7f4ee] font-arabic-body text-[#0f1c36]">
      <div className="bg-[#0a1428]">
        <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-[#f1dfb3]"><ArrowRight size={15} /> الرئيسية</Link>
        </div>
      </div>
      <LawsSearch q={q} heading="h1" />
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {q && <p className="mb-6 text-sm text-[#0f1c36]/60">نتائج البحث عن «{q}»: {laws.length}</p>}
        {laws.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#0f1c36]/15 bg-white px-6 py-14 text-center">
            <SearchX size={32} className="mx-auto text-[#b08d57]" />
            <p className="mt-3 font-bold">لا توجد نتائج مطابقة</p>
            <Link href="/laws" className="mt-4 inline-block text-sm font-semibold text-[#9a7436] hover:underline">عرض كل القوانين</Link>
          </div>
        ) : (
          [...groups.entries()].map(([category, items]) => (
            <div key={category} className="mb-10">
              <h2 className="mb-4 text-2xl font-bold">{category}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((l) => (
                  <Link key={l.id} href={`/laws/${l.id}`} className="group flex flex-col rounded-2xl border border-[#0f1c36]/[0.08] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#b08d57]/50">
                    <BookOpen size={20} className="text-[#b08d57]" />
                    <h3 className="mt-3 font-bold leading-7">{l.title}</h3>
                    {l.number && l.year && <p className="tnum mt-1 text-sm text-[#0f1c36]/55">رقم {l.number} لسنة {l.year}</p>}
                    <div className="mt-4 flex items-center justify-between text-xs">
                      {l.articleCount > 0 ? (
                        <span className="font-semibold text-emerald-700"><span className="tnum">{l.articleCount}</span> مادة</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#0f1c36]/50"><FileClock size={13} /> النص قيد الإضافة</span>
                      )}
                      <ArrowLeft size={15} className="text-[#0f1c36]/30 transition group-hover:-translate-x-1" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
      <HukmWidget actions={[{ label: "ابحث عن مكتب محاماة", href: "/firms" }, { label: "الصفحة الرئيسية", href: "/" }]} />
    </main>
  );
}
