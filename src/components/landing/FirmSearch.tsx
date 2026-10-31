import { Search } from "lucide-react";
import { AREA_LABELS } from "./FirmCard";

// Plain GET form so it works without client JS: submits to /firms?q=&area=
export default function FirmSearch({ q = "", area = "" }: { q?: string; area?: string }) {
  return (
    <form
      action="/firms"
      method="get"
      role="search"
      className="flex w-full flex-col gap-2 rounded-[1.4rem] bg-white p-2 text-[#0f1c36] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] ring-1 ring-[#d4af6a]/30 sm:flex-row sm:items-center sm:rounded-full"
    >
      <label className="flex flex-1 items-center gap-3 px-4 py-2">
        <Search size={19} className="shrink-0 text-[#b08d57]" />
        <span className="sr-only">ابحث عن مكتب أو خدمة</span>
        <input
          name="q"
          defaultValue={q}
          placeholder="ابحث باسم المكتب أو الخدمة القانونية..."
          className="w-full bg-transparent py-2 text-[15px] outline-none placeholder:text-[#0f1c36]/40"
        />
      </label>
      <span aria-hidden className="hidden h-8 w-px bg-[#0f1c36]/10 sm:block" />
      <label className="flex items-center px-4 sm:px-2">
        <span className="sr-only">مجال العمل</span>
        <select
          name="area"
          defaultValue={area}
          className="w-full cursor-pointer bg-transparent py-2 text-sm text-[#0f1c36]/75 outline-none sm:w-44"
        >
          <option value="">كل المجالات</option>
          {Object.entries(AREA_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      <button type="submit" className="bg-gold rounded-full px-8 py-3.5 text-[15px] font-bold">
        بحث
      </button>
    </form>
  );
}
