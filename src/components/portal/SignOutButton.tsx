"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function SignOutButton({ redirectTo }: { redirectTo: string }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: redirectTo })}
      className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:border-[#d4af6a]/60 hover:text-[#f1dfb3]"
    >
      <LogOut size={15} />
      <span className="hidden sm:inline">خروج</span>
    </button>
  );
}
