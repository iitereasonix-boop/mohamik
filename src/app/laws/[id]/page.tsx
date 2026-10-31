import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink, FileClock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import HukmWidget from "@/components/hukm/HukmWidget";

export const dynamic = "force-dynamic";

export default async function LawPage({ params }: { params: { id: string } }) {
  const law = await prisma.publicLaw.findUnique({
    where: { id: params.id },
    select: {
      title: true, category: true, number: true, year: true, summary: true, sourceUrl: true, updatedAt: true,
      articles: { select: { idx: true, heading: true, text: true }, orderBy: { idx: "asc" } },
    },
  });
  if (!law) notFound();
  const index = law.articles.filter((a) => a.heading);

  return (
    <main className="min-h-screen bg-[#f7f4ee] font-arabic-body text-[#0f1c36]">
      <header className="bg-[#0a1428] px-4 py-10 text-white sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Link href="/laws" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-[#f1dfb3]"><ArrowRight size={15} /> كل القوانين</Link>
          <p className="mt-6 text-sm text-[#d4af6a]">{law.category}</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-5xl">{law.title}</h1>
          {law.number && law.year && <p className="tnum mt-3 text-white/60">رقم {law.number} لسنة {law.year}</p>}
          {law.sourceUrl && (
            <a href={law.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#f1dfb3] hover:underline">المصدر الرسمي <ExternalLink size={14} /></a>
          )}
        </div>
      </header>

      {law.articles.length === 0 ? (
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <FileClock size={34} className="mx-auto text-[#b08d57]" />
          <p className="mt-4 text-lg font-bold">النص الكامل قيد الإضافة</p>
          <p className="mt-2 text-sm leading-7 text-[#0f1c36]/60">نضيف نصوص القوانين بعد مراجعتها من مصادر رسمية.</p>
        </div>
      ) : (
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[230px_1fr]">
          {index.length > 0 && (
            <nav aria-label="فهرس المواد" className="rounded-2xl border border-[#0f1c36]/[0.08] bg-white p-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
              <p className="mb-2 px-2 text-sm font-bold">فهرس المواد</p>
              <div className="flex flex-wrap gap-1 lg:flex-col">
                {index.map((a) => <a key={a.idx} href={`#a-${a.idx}`} className="rounded-lg px-2 py-1 text-sm text-[#0f1c36]/70 hover:bg-[#f7f1e4]">{a.heading}</a>)}
              </div>
            </nav>
          )}
          <div className="space-y-3">
            {law.articles.map((a) => (
              <article key={a.idx} id={`a-${a.idx}`} className="scroll-mt-4 rounded-2xl border border-[#0f1c36]/[0.08] bg-white p-5">
                {a.heading && <a href={`#a-${a.idx}`} className="mb-1 block font-bold text-[#9a7436]">{a.heading}</a>}
                <p className="whitespace-pre-line font-arabic-heading text-[17px] leading-9">{a.text}</p>
              </article>
            ))}
            <p className="text-xs text-[#0f1c36]/50">هذا النص للاطلاع. تحقق من آخر التعديلات في المصادر الرسمية قبل الاعتماد عليه.</p>
          </div>
        </div>
      )}
      <HukmWidget actions={[{ label: "كل القوانين", href: "/laws" }, { label: "ابحث عن مكتب محاماة", href: "/firms" }]} />
    </main>
  );
}
