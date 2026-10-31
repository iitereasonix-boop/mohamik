"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, ArrowUp, Paperclip, X, BookOpen, CalendarClock, Check, Copy, Gavel, History, KeyRound,
  Loader2, MessageSquarePlus, Scale, ShieldCheck, Square, Trash2, UserSearch,
} from "lucide-react";
import HukmRobot from "@/components/hukm/HukmRobot";
import Answer, { type Source } from "./Answer";

type Msg = {
  key: string;
  role: "user" | "assistant";
  content: string;
  sources: Record<string, Source>;
  unverified: string[];
  warnings: string[];
  done: boolean;
  status?: string;
  error?: boolean;
};
type Conversation = { id: string; title: string; updatedAt: string };

const SUGGESTIONS = [
  { icon: CalendarClock, title: "جدول الأسبوع", prompt: "لخّصلي الجلسات والمواعيد والمواعيد النهائية خلال هالأسبوع، ورتّبها حسب الأولوية." },
  { icon: UserSearch, title: "وضع عميل", prompt: "شو آخر وضع العميل ", fill: true },
  { icon: Gavel, title: "ناقش قضية", prompt: "بدي أناقش معك قضية رقم ", fill: true },
  { icon: History, title: "خبرة المكتب", prompt: "شو القضايا العمالية اللي أغلقها المكتب وشو كانت نتائجها؟ شو نتعلم منها؟" },
  { icon: Scale, title: "سؤال قانوني", prompt: "شو بقول القانون الأردني عن ", fill: true },
  { icon: AlertTriangle, title: "المتأخر والعاجل", prompt: "في مواعيد نهائية متأخرة أو مهام متأخرة لازم ننتبه إلها؟" },
];

let seq = 0;
const key = () => `m${++seq}`;

export default function HukmChat({ configured, isManager, firstName, libraryCount }: { configured: boolean; isManager: boolean; firstName: string; libraryCount: number }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showList, setShowList] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, setPending] = useState<{ id: string; fileName: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadConversations = useCallback(async () => {
    const r = await fetch("/api/hukm/conversations").catch(() => null);
    if (r?.ok) setConversations((await r.json()).conversations);
  }, []);
  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 240) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  async function openConversation(id: string) {
    if (streaming) return;
    setShowList(false);
    const r = await fetch(`/api/hukm/conversations/${id}`).catch(() => null);
    if (!r?.ok) return;
    const { conversation } = await r.json();
    setActiveId(id);
    setMessages(
      conversation.messages.map((m: { role: string; content: string; sources: Record<string, Source> | null; unverified: string[] }) => ({
        key: key(), role: m.role === "assistant" ? "assistant" : "user", content: m.content.replace(/\[ملف مرفوع: «(.*?)» \[AT-[a-z0-9]+\]\]/g, "📎 $1"),
        sources: m.sources ?? {}, unverified: m.unverified ?? [], done: true,
        warnings: m.unverified?.length ? ["وردت في الإجابة مراجع لم يتم التحقق منها في ملفات المكتب. لا تعتمد على الجمل المرتبطة بها."] : [],
      }))
    );
    requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; });
  }

  function newConversation() {
    if (streaming) return;
    setActiveId(null);
    setMessages([]);
    setShowList(false);
    inputRef.current?.focus();
  }

  async function removeConversation(id: string) {
    if (!confirm("حذف هذه المحادثة نهائيًا؟")) return;
    const r = await fetch(`/api/hukm/conversations/${id}`, { method: "DELETE" }).catch(() => null);
    if (r?.ok) {
      if (id === activeId) newConversation();
      loadConversations();
    }
  }

  const patchLast = (fn: (m: Msg) => Msg) =>
    setMessages((all) => all.map((m, i) => (i === all.length - 1 ? fn(m) : m)));

  async function upload(files: FileList) {
    setUploading(true);
    setUploadError(null);
    let conversationId = activeId;
    for (const file of Array.from(files).slice(0, 5)) {
      const body = new FormData();
      body.append("file", file);
      if (conversationId) body.append("conversationId", conversationId);
      const r = await fetch("/api/hukm/attachments", { method: "POST", body }).catch(() => null);
      const result = await r?.json().catch(() => null);
      if (!r?.ok) {
        setUploadError(result?.error ?? "تعذّر رفع الملف.");
        continue;
      }
      conversationId = result.conversationId;
      setActiveId(result.conversationId);
      setPending((p) => [...p, { id: result.id, fileName: result.fileName }]);
    }
    setUploading(false);
    loadConversations();
  }

  async function send(text: string) {
    const attachments = pending;
    const question = text.trim() || (attachments.length ? "اقرأ الملف المرفوع، لخّصه، وأعطني رأيك فيه." : "");
    if (!question || streaming || uploading) return;
    setPending([]);
    setInput("");
    setStreaming(true);
    setMessages((all) => [
      ...all,
      { key: key(), role: "user", content: [question, ...attachments.map((a) => `📎 ${a.fileName}`)].join("\n"), sources: {}, unverified: [], warnings: [], done: true },
      { key: key(), role: "assistant", content: "", sources: {}, unverified: [], warnings: [], done: false, status: "يفكّر…" },
    ]);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/hukm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeId ?? undefined, message: question, attachmentIds: attachments.map((a) => a.id) }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const result = await response.json().catch(() => null);
        patchLast((m) => ({ ...m, content: result?.error ?? "تعذّر الوصول إلى «حُكم».", done: true, error: true, status: undefined }));
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const e = JSON.parse(line);
          if (e.t === "meta") {
            setActiveId(e.conversationId);
          } else if (e.t === "status") {
            patchLast((m) => ({ ...m, status: e.text }));
          } else if (e.t === "delta") {
            patchLast((m) => ({ ...m, content: m.content + e.text, status: undefined }));
          } else if (e.t === "sources") {
            patchLast((m) => ({ ...m, sources: { ...m.sources, ...e.sources } }));
          } else if (e.t === "error") {
            patchLast((m) => ({ ...m, content: e.text, error: true }));
          } else if (e.t === "done") {
            patchLast((m) => ({ ...m, sources: e.sources, unverified: e.unverified, warnings: e.warnings, done: true, status: undefined }));
          }
        }
      }
    } catch {
      patchLast((m) => ({ ...m, content: m.content || "أُوقف التوليد.", warnings: m.content ? ["أُوقف التوليد قبل اكتمال الإجابة."] : [] }));
    } finally {
      patchLast((m) => ({ ...m, done: true, status: undefined }));
      setStreaming(false);
      abortRef.current = null;
      loadConversations();
    }
  }

  async function copy(m: Msg) {
    const plain = m.content.replace(/\s*\[(?:[A-Z]{1,3}-[a-z0-9]+(?:\s*[,،]\s*)?)+\]/g, "");
    await navigator.clipboard.writeText(plain).catch(() => null);
    setCopied(m.key);
    setTimeout(() => setCopied(null), 2000);
  }

  if (!configured) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-[#0f1c36]/[0.08] bg-white p-10 text-center shadow-sm">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0f1c36] text-[#f1dfb3]"><KeyRound size={28} /></span>
        <h2 className="mt-6 font-arabic-heading text-2xl font-bold">«حُكم» غير مفعّل بعد</h2>
        <p className="mt-3 leading-8 text-[#0f1c36]/60">
          {isManager
            ? "أضف مفتاح API من مزود الذكاء الاصطناعي الذي تختاره ليبدأ «حُكم» بالعمل. المفتاح يُحفظ مشفّرًا ولا يظهر لأي أحد."
            : "يحتاج الشريك الإداري إلى إضافة مفتاح API من إعدادات «حُكم» ليبدأ المساعد بالعمل."}
        </p>
        {isManager && (
          <Link href="/admin/hukm/settings" className="bg-gold mt-7 inline-flex items-center gap-2 rounded-xl px-6 py-3 font-bold">
            <KeyRound size={17} /> إضافة مفتاح API
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="grid h-[calc(100vh-13rem)] min-h-[560px] gap-4 lg:grid-cols-[270px_1fr]">
      {/* conversation list */}
      <aside className={`${showList ? "fixed inset-0 z-40 flex bg-black/40 p-4" : "hidden"} lg:static lg:flex lg:bg-transparent lg:p-0`}>
        <div className="flex w-full max-w-xs flex-col overflow-hidden rounded-3xl border border-[#0f1c36]/[0.08] bg-white lg:max-w-none">
          <div className="border-b border-[#0f1c36]/[0.06] p-3">
            <button type="button" onClick={newConversation} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f1c36] px-4 py-3 text-sm font-bold text-[#f1dfb3] transition hover:bg-[#13234a]">
              <MessageSquarePlus size={17} /> محادثة جديدة
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {conversations.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-[#0f1c36]/45">محادثاتك مع «حُكم» تظهر هنا، وهي خاصة بك وحدك.</p>
            ) : (
              conversations.map((c) => (
                <div key={c.id} className={`group flex items-center gap-1 rounded-xl ${c.id === activeId ? "bg-[#f7f1e4]" : "hover:bg-[#f7f4ee]"}`}>
                  <button type="button" onClick={() => openConversation(c.id)} className="min-w-0 flex-1 px-3 py-2.5 text-right">
                    <span className="block truncate text-sm font-semibold text-[#0f1c36]">{c.title}</span>
                    <span className="block text-[11px] text-[#0f1c36]/45 tnum">{new Date(c.updatedAt).toLocaleDateString("ar-JO", { day: "numeric", month: "short" })}</span>
                  </button>
                  <button type="button" onClick={() => removeConversation(c.id)} aria-label="حذف المحادثة" className="ml-1 rounded-lg p-2 text-[#0f1c36]/30 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-[#0f1c36]/[0.06] p-3 text-[11px] leading-5 text-[#0f1c36]/50">
            <Link href="/admin/hukm/library" className="flex items-center gap-2 font-semibold text-[#9a7436] hover:underline">
              <BookOpen size={14} /> المكتبة القانونية: {libraryCount} مستند
            </Link>
          </div>
        </div>
        {showList && <button type="button" aria-label="إغلاق" className="flex-1 lg:hidden" onClick={() => setShowList(false)} />}
      </aside>

      {/* chat */}
      <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-[#0f1c36]/[0.08] bg-white">
        <div className="flex items-center justify-between border-b border-[#0f1c36]/[0.06] px-4 py-2.5 lg:hidden">
          <button type="button" onClick={() => setShowList(true)} className="flex items-center gap-2 text-sm font-semibold text-[#0f1c36]/70"><History size={16} /> المحادثات</button>
          <button type="button" onClick={newConversation} className="flex items-center gap-2 text-sm font-semibold text-[#9a7436]"><MessageSquarePlus size={16} /> جديدة</button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          {messages.length === 0 ? (
            <div className="mx-auto flex max-w-2xl flex-col items-center pt-4 text-center sm:pt-10">
              <HukmRobot size={84} className="lux-float" />
              <h2 className="mt-5 font-arabic-heading text-3xl font-bold text-[#0f1c36]">أهلًا {firstName}، كيف بقدر أساعدك؟</h2>
              <p className="mt-2 max-w-md text-sm leading-7 text-[#0f1c36]/55">اسألني عن أي عميل أو قضية أو جلسة في المكتب، أو ناقش معي قضية، أو اسألني سؤالًا قانونيًا من مكتبتك.</p>
              <div className="mt-8 grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {SUGGESTIONS.map(({ icon: Icon, title, prompt, fill }) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => (fill ? (setInput(prompt), inputRef.current?.focus()) : send(prompt))}
                    className="group rounded-2xl border border-[#0f1c36]/[0.08] bg-[#fbf9f4] p-4 text-right transition hover:-translate-y-0.5 hover:border-[#b08d57]/50 hover:bg-white hover:shadow-md"
                  >
                    <Icon size={18} className="text-[#b08d57]" />
                    <span className="mt-2 block text-sm font-bold text-[#0f1c36]">{title}</span>
                    <span className="mt-1 block line-clamp-2 text-xs leading-5 text-[#0f1c36]/50">{prompt}{fill ? "…" : ""}</span>
                  </button>
                ))}
              </div>
              {libraryCount === 0 && (
                <p className="mt-6 rounded-xl bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
                  المكتبة القانونية فارغة: أضف القوانين التي تعمل بها من <Link href="/admin/hukm/library" className="font-bold underline">المكتبة القانونية</Link> ليستشهد بنصوصها.
                </p>
              )}
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6">
              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.key} className="flex justify-end">
                    <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-md bg-[#0f1c36] px-4 py-3 text-[15px] leading-7 text-white">{m.content}</div>
                  </div>
                ) : (
                  <div key={m.key} className="flex gap-3">
                    <HukmRobot size={38} className="mt-1 shrink-0" />
                    <div className="min-w-0 flex-1">
                      {m.status && (
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#f7f1e4] px-3 py-1.5 text-xs font-semibold text-[#7a5c2a]">
                          <Loader2 size={13} className="animate-spin" /> {m.status}
                        </div>
                      )}
                      {m.error ? (
                        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                          <AlertTriangle size={17} className="mt-0.5 shrink-0" /> <span>{m.content}</span>
                        </div>
                      ) : (
                        m.content && <Answer text={m.content} sources={m.sources} unverified={m.unverified} done={m.done} />
                      )}
                      {m.done && m.warnings.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {m.warnings.map((w) => (
                            <p key={w} className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> {w}</p>
                          ))}
                        </div>
                      )}
                      {m.done && !m.error && m.content && (
                        <div className="mt-2 flex items-center gap-3 text-[11px] text-[#0f1c36]/40">
                          <button type="button" onClick={() => copy(m)} className="flex items-center gap-1 transition hover:text-[#9a7436]">
                            {copied === m.key ? <Check size={13} /> : <Copy size={13} />} {copied === m.key ? "تم النسخ" : "نسخ"}
                          </button>
                          {Object.keys(m.sources).length > 0 && m.unverified.length === 0 && (
                            <span className="flex items-center gap-1 text-emerald-700"><ShieldCheck size={13} /> كل المراجع متحقق منها</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* composer */}
        <div className="border-t border-[#0f1c36]/[0.06] bg-[#fbf9f4] p-3 sm:p-4">
          {(pending.length > 0 || uploading || uploadError) && (
            <div className="mx-auto mb-2 flex max-w-3xl flex-wrap items-center gap-2 text-xs">
              {pending.map((f) => (
                <span key={f.id} className="inline-flex max-w-[240px] items-center gap-1.5 rounded-full bg-[#f7f1e4] px-3 py-1.5 font-semibold text-[#7a5c2a]">
                  <Paperclip size={13} /> <span className="truncate">{f.fileName}</span>
                  <button type="button" aria-label="إزالة الملف" onClick={() => setPending((p) => p.filter((x) => x.id !== f.id))}><X size={13} /></button>
                </span>
              ))}
              {uploading && <span className="inline-flex items-center gap-1.5 text-[#0f1c36]/60"><Loader2 size={13} className="animate-spin" /> جارٍ قراءة الملف…</span>}
              {uploadError && <span role="alert" className="text-red-700">{uploadError}</span>}
            </div>
          )}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-[#0f1c36]/[0.1] bg-white p-2 shadow-sm focus-within:border-[#b08d57] focus-within:ring-4 focus-within:ring-[#d4af6a]/15"
          >
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md,image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => { if (e.target.files?.length) upload(e.target.files); e.target.value = ""; }}
            />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading || streaming} aria-label="رفع قضية أو ملف أو صورة" title="رفع قضية أو ملف أو صورة" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#9a7436] transition hover:bg-[#f7f1e4] disabled:opacity-40">
              <Paperclip size={19} />
            </button>
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input); }
              }}
              placeholder="اسأل «حُكم»، أو ارفع قضية أو ملفًا أو صورة…"
              className="max-h-[200px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] leading-7 outline-none placeholder:text-[#0f1c36]/35"
            />
            {streaming ? (
              <button type="button" onClick={() => abortRef.current?.abort()} aria-label="إيقاف" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0f1c36] text-white transition hover:bg-[#13234a]">
                <Square size={15} fill="currentColor" />
              </button>
            ) : (
              <button type="submit" disabled={(!input.trim() && pending.length === 0) || uploading} aria-label="إرسال" className="bg-gold flex h-11 w-11 shrink-0 items-center justify-center rounded-xl disabled:opacity-40">
                <ArrowUp size={19} />
              </button>
            )}
          </form>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-[#0f1c36]/40">
            «حُكم» يقرأ ملفات مكتبك ومكتبته القانونية فقط، ويضع مرجعًا يُفحص آليًا لكل معلومة. راجع التحليل القانوني قبل الاعتماد عليه.
          </p>
        </div>
      </section>
    </div>
  );
}
