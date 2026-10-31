"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Search, SearchX } from "lucide-react";
import { normalizeArabic } from "@/lib/ai/arabic";

type Row = { id: string; name: string; mobile: string; email: string | null; source: string | null; cases: number; appointments: number };

export default function ClientsTable({ clients }: { clients: Row[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const terms = normalizeArabic(query).split(/\s+/).filter(Boolean);
    if (!terms.length) return clients;
    return clients.filter((c) => {
      const haystack = normalizeArabic(`${c.name} ${c.mobile} ${c.mobile.replace(/\D/g, "")} ${c.email ?? ""}`);
      return terms.every((t) => haystack.includes(t));
    });
  }, [clients, query]);

  return (
    <>
      <label className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm focus-within:border-[#b08d57] focus-within:ring-2 focus-within:ring-[#d4af6a]/25">
        <Search size={18} className="shrink-0 text-[#b08d57]" />
        <span className="sr-only">ابحث عن عميل</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن عميل بالاسم أو الجوال أو البريد…"
          className="w-full bg-transparent py-3 text-sm outline-none"
        />
        <span className="tnum shrink-0 text-xs text-warmgray-500">{shown.length} عميل</span>
      </label>

      {shown.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <SearchX size={28} className="mx-auto text-[#b08d57]" />
          <p className="mt-3 text-sm text-warmgray-500">{clients.length ? "لا يوجد عميل مطابق للبحث." : "لا يوجد عملاء بعد."}</p>
        </div>
      ) : (
        <div className="card mt-4 overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-paper-100 text-xs text-warmgray-500">
              <tr>
                <th className="px-4 py-2 text-right">الاسم</th>
                <th className="px-4 py-2 text-right">الجوال</th>
                <th className="px-4 py-2 text-right">المصدر</th>
                <th className="px-4 py-2 text-right">قضايا</th>
                <th className="px-4 py-2 text-right">مواعيد</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id} onClick={() => router.push(`/admin/clients/${c.id}`)} className="cursor-pointer border-t border-paper-200 transition hover:bg-[#fbf7ee]">
                  <td className="px-4 py-3 font-semibold">
                    <Link href={`/admin/clients/${c.id}`} className="hover:text-[#9a7436]" onClick={(e) => e.stopPropagation()}>{c.name}</Link>
                  </td>
                  <td className="px-4 py-3 tnum" dir="ltr" style={{ textAlign: "right" }}>{c.mobile}</td>
                  <td className="px-4 py-3 text-xs text-warmgray-500">{c.source ?? "-"}</td>
                  <td className="px-4 py-3 tnum">{c.cases}</td>
                  <td className="px-4 py-3 tnum">{c.appointments}</td>
                  <td className="px-4 py-3 text-left"><ChevronLeft size={16} className="inline text-warmgray-400" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
