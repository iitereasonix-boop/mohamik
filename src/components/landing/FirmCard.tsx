import Link from "next/link";
import { ArrowLeft, BadgeCheck } from "lucide-react";

export const AREA_LABELS: Record<string, string> = {
  CRIMINAL: "القضايا الجزائية",
  CIVIL: "القضايا المدنية",
  COMMERCIAL: "القضايا التجارية",
  LABOUR: "القضايا العمالية",
  FAMILY: "الأحوال الشخصية",
  REAL_ESTATE: "العقارات والإيجارات",
  COMPANIES: "قضايا الشركات",
  CYBERCRIME: "الجرائم الإلكترونية",
  ENFORCEMENT: "تنفيذ الأحكام",
  OTHER: "الاستشارات العامة",
};

export type FirmCardData = {
  name: string;
  subdomain: string;
  demo: boolean;
  practiceAreas: string[];
  siteTagline: string | null;
  logoUrl: string | null;
  accentColor: string | null;
};

export const firmCardSelect = {
  name: true,
  subdomain: true,
  demo: true,
  practiceAreas: true,
  siteTagline: true,
  logoUrl: true,
  accentColor: true,
} as const;

// Light "ivory" card used on the home page and the /firms directory.
export default function FirmCard({ firm, delay = 0 }: { firm: FirmCardData; delay?: number }) {
  return (
    <Link
      href={`/f/${firm.subdomain}`}
      className="reveal group relative flex flex-col overflow-hidden rounded-3xl border border-[#0f1c36]/[0.08] bg-white p-7 text-[#0f1c36] shadow-[0_1px_2px_rgba(15,28,54,0.04),0_12px_40px_-18px_rgba(15,28,54,0.18)] transition duration-500 hover:-translate-y-1.5 hover:shadow-[0_30px_60px_-24px_rgba(15,28,54,0.35)]"
      style={{ "--d": `${delay}ms` } as React.CSSProperties}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-[#8a6a32] via-[#e9d3a1] to-[#b08d57] opacity-0 transition group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-3">
        {firm.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={firm.logoUrl} alt="" className="h-16 w-16 rounded-2xl border border-[#0f1c36]/[0.06] bg-white object-contain p-1.5" />
        ) : (
          <span
            className="flex h-16 w-16 items-center justify-center rounded-2xl font-arabic-heading text-3xl font-bold text-[#f1dfb3] ring-1 ring-[#d4af6a]/40"
            style={{ background: `linear-gradient(150deg, ${firm.accentColor ?? "#13234a"}, #0a1428)` }}
          >
            {firm.name.trim().charAt(0)}
          </span>
        )}
        {firm.demo ? (
          <span className="rounded-full bg-[#0f1c36]/[0.05] px-3 py-1 text-[11px] font-medium text-[#0f1c36]/60">نموذج تجريبي</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
            <BadgeCheck size={13} /> مكتب موثّق
          </span>
        )}
      </div>
      <h3 className="mt-6 font-arabic-heading text-2xl font-bold">{firm.name}</h3>
      <p className="mt-2 line-clamp-2 min-h-[3rem] text-sm leading-6 text-[#0f1c36]/60">
        {firm.siteTagline || "مكتب محاماة على منصة Mohamik"}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {firm.practiceAreas.slice(0, 3).map((a) => (
          <span key={a} className="rounded-full border border-[#b08d57]/30 bg-[#f7f1e4] px-3 py-1 text-[11px] font-medium text-[#6b5021]">
            {AREA_LABELS[a] ?? a}
          </span>
        ))}
      </div>
      <span className="mt-auto pt-7">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#0f1c36] px-5 py-2.5 text-sm font-semibold text-white transition-all group-hover:gap-3 group-hover:bg-[#13234a]">
          عرض المكتب <ArrowLeft size={15} />
        </span>
      </span>
    </Link>
  );
}
