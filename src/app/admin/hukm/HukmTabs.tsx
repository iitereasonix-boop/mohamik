"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, KeyRound, MessagesSquare } from "lucide-react";

export default function HukmTabs({ showSettings }: { showSettings: boolean }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/admin/hukm", label: "المحادثة", icon: MessagesSquare, exact: true },
    { href: "/admin/hukm/library", label: "المكتبة القانونية", icon: BookOpen },
    ...(showSettings ? [{ href: "/admin/hukm/settings", label: "الإعدادات ومفتاح API", icon: KeyRound }] : []),
  ];
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-2xl bg-white/[0.06] p-1 [scrollbar-width:none]">
      {tabs.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm transition ${active ? "bg-[#d4af6a] font-bold text-[#17120a]" : "text-white/70 hover:bg-white/[0.06] hover:text-white"}`}
          >
            <Icon size={16} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
