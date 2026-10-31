"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarPlus, FolderOpen, Home, MessageSquarePlus } from "lucide-react";

export default function PortalNav({ base }: { base: string }) {
  const pathname = usePathname();
  const items = [
    { href: base, label: "الرئيسية", icon: Home, exact: true },
    { href: `${base}/cases`, label: "قضاياي", icon: FolderOpen },
    { href: `${base}/book`, label: "حجز موعد", icon: CalendarPlus },
    { href: `${base}/consult`, label: "طلب استشارة", icon: MessageSquarePlus },
  ];

  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none]">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3.5 text-sm transition sm:px-4 ${active
              ? "border-[#d4af6a] font-semibold text-[#f1dfb3]"
              : "border-transparent text-white/60 hover:text-white"
              }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
