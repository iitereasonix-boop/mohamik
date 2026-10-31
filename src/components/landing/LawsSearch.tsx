import Link from "next/link";
import { Library, Search } from "lucide-react";

const TRY = ["العمل", "العقوبات", "المالكين والمستأجرين"];

// Dark search band for the Jordanian law library. Plain GET form to /laws.
export default function LawsSearch({ q = "", heading = "h2" }: { q?: string; heading?: "h1" | "h2" }) {
  const Title = heading;
  return (
    <div className="lux-grain relative isolate overflow-hidden px-4 py-16 text-center text-white sm:py-20">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[#0a1428] bg-[radial-gradient(ellipse_at_20%_0%,rgba(212,175,106,0.14),transparent_55%)]" />
      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm text-[#d4af6a]">
        <Library size={16} /> مكتبة القوانين الأردنية
      </span>
      <Title className="mt-6 text-4xl font-bold text-white sm:text-6xl">القوانين <span className="text-gold">الأردنية</span></Title>
      <p className="mx-auto mt-5 max-w-2xl leading-8 text-white/70 sm:text-lg">
        القوانين الأردنية مرتّبة حسب الموضوع، مع فهرس للمواد ورابط مباشر لكل مادة.
      </p>
      <form action="/laws" method="get" role="search" className="mx-auto mt-9 flex max-w-3xl items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-2 focus-within:border-[#d4af6a]/60">
        <label className="flex min-w-0 flex-1 items-center gap-3 px-3">
          <Search size={19} className="shrink-0 text-[#d4af6a]" />
          <span className="sr-only">ابحث في القوانين</span>
          <input name="q" defaultValue={q} placeholder="ابحث باسم القانون أو رقمه أو سنته…" className="w-full bg-transparent py-3 text-white outline-none placeholder:text-white/40" />
        </label>
        <button type="submit" className="bg-gold rounded-xl px-6 py-3 font-bold">بحث</button>
      </form>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm">
        <span className="text-white/50">جرّب:</span>
        {TRY.map((t) => (
          <Link key={t} href={`/laws?q=${encodeURIComponent(t)}`} className="rounded-full border border-white/10 px-4 py-1.5 text-white/80 transition hover:border-[#d4af6a]/60 hover:text-[#f1dfb3]">{t}</Link>
        ))}
      </div>
    </div>
  );
}
