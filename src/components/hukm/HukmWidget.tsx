"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, X } from "lucide-react";
import HukmRobot from "./HukmRobot";

type Msg = { role: "user" | "assistant"; content: string };
export type WidgetAction = { label: string; href: string };

// Floating «حُكم» robot for public pages. It answers general enquiries only and
// has no access to clients or cases. Answers are rendered as plain text.
export default function HukmWidget({ firm, firmName, actions }: { firm?: string; firmName?: string; actions: WidgetAction[] }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, busy, open]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    let reply = "تعذّر الاتصال الآن. حاول مرة أخرى بعد قليل.";
    try {
      const r = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firm, messages: next.slice(-8) }),
      });
      const result = await r.json().catch(() => null);
      if (result?.reply) reply = result.reply;
    } catch {
      // keep the fallback reply
    }
    setMessages([...next, { role: "assistant", content: reply }]);
    setBusy(false);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-start gap-3 font-arabic-body sm:bottom-6 sm:right-6">
      {open && (
        <section aria-label="محادثة حُكم" className="flex h-[min(540px,calc(100vh-130px))] w-[min(370px,calc(100vw-32px))] flex-col overflow-hidden rounded-3xl bg-white text-[#0f1c36] shadow-[0_30px_80px_-20px_rgba(5,10,25,0.65)] ring-1 ring-[#0f1c36]/10">
          <header className="flex items-center gap-3 bg-[#0a1428] px-4 py-3 text-white">
            <HukmRobot size={38} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">«حُكم»</p>
              <p className="truncate text-[11px] text-[#d4af6a]">{firmName ? `مساعد ${firmName}` : "مساعد منصة Mohamik"}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق" className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"><X size={18} /></button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-[#fbf9f4] p-4 text-sm leading-7">
            <p className="rounded-2xl rounded-tr-md bg-white p-3 shadow-sm">
              أهلًا فيك 👋 أنا «حُكم». بجاوبك على الاستفسارات العامة{firmName ? ` عن ${firmName}` : " عن المنصة"} وبدلّك على الخطوة المناسبة. شو بتحب تعرف؟
            </p>
            <div className="flex flex-wrap gap-2">
              {actions.map((a) => (
                <Link key={a.href} href={a.href} className="rounded-full border border-[#b08d57]/40 bg-white px-3 py-1.5 text-xs font-semibold text-[#7a5c2a] transition hover:bg-[#f7f1e4]">{a.label}</Link>
              ))}
            </div>
            {messages.map((m, i) => (
              <p key={i} className={`whitespace-pre-wrap rounded-2xl p-3 ${m.role === "user" ? "mr-8 rounded-tl-md bg-[#0f1c36] text-white" : "ml-4 rounded-tr-md bg-white shadow-sm"}`}>{m.content}</p>
            ))}
            {busy && <p className="flex items-center gap-2 text-xs text-[#0f1c36]/55"><Loader2 size={14} className="animate-spin" /> «حُكم» يكتب…</p>}
          </div>

          <form onSubmit={send} className="flex items-center gap-2 border-t border-[#0f1c36]/[0.08] bg-white p-3">
            <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={600} aria-label="اكتب استفسارك" placeholder="اكتب استفسارك…" className="min-w-0 flex-1 rounded-xl bg-[#f7f4ee] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#d4af6a]/50" />
            <button type="submit" disabled={busy || !input.trim()} aria-label="إرسال" className="bg-gold flex h-10 w-10 shrink-0 items-center justify-center rounded-xl disabled:opacity-40"><ArrowUp size={18} /></button>
          </form>
          <p className="bg-white px-3 pb-2 text-center text-[10px] text-[#0f1c36]/45">معلومات عامة وليست استشارة قانونية. لا تشارك بيانات حساسة هنا.</p>
        </section>
      )}
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={open ? "إغلاق حُكم" : "اسأل حُكم"} className="lux-float transition hover:scale-105">
        <HukmRobot size={72} className="drop-shadow-[0_12px_18px_rgba(5,10,25,0.5)]" />
      </button>
    </div>
  );
}
