"use client";

import { Fragment } from "react";
import { REF_GROUP } from "@/lib/ai/citations";

export type Source = { type: string; label: string; sub?: string; excerpt?: string };

// Minimal, safe markdown for answers: headings, lists, quotes, bold, and
// citation markers rendered as numbered chips. No raw HTML is ever injected.

type RefState = "ok" | "pending" | "bad";

function Chip({ n, state, source }: { n: number; state: RefState; source?: Source }) {
  const tone =
    state === "ok"
      ? "bg-[#f7f1e4] text-[#7a5c2a] ring-[#b08d57]/40 hover:bg-[#efe2c4]"
      : state === "bad"
        ? "bg-red-50 text-red-700 ring-red-300"
        : "bg-slate-100 text-slate-500 ring-slate-200";
  return (
    <a
      href={`#src-${n}`}
      title={state === "bad" ? "مرجع غير متحقق — لم يرد في ملفات المكتب" : source ? `${source.label}${source.sub ? " · " + source.sub : ""}` : "جارٍ التحقق"}
      className={`mx-0.5 inline-flex h-[18px] min-w-[18px] -translate-y-0.5 items-center justify-center rounded-md px-1 align-middle text-[10px] font-bold ring-1 ring-inset transition tnum ${tone}`}
    >
      {state === "bad" ? "!" : n}
    </a>
  );
}

function Inline({ text, refIndex, sources, unverified, done }: { text: string; refIndex: Map<string, number>; sources: Record<string, Source>; unverified: Set<string>; done: boolean }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  const re = new RegExp(REF_GROUP.source + "|\\*\\*([^*]+)\\*\\*", "g");
  for (const m of text.matchAll(re)) {
    if (m.index! > last) parts.push(text.slice(last, m.index));
    if (m[1]) {
      for (const ref of m[1].split(/\s*[,،]\s*/)) {
        if (!refIndex.has(ref)) refIndex.set(ref, refIndex.size + 1);
        const state: RefState = sources[ref] ? "ok" : unverified.has(ref) || done ? "bad" : "pending";
        parts.push(<Chip key={`${m.index}-${ref}`} n={refIndex.get(ref)!} state={state} source={sources[ref]} />);
      }
    } else if (m[2]) {
      parts.push(<strong key={m.index} className="font-bold text-[#0f1c36]">{m[2]}</strong>);
    }
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts.map((p, i) => <Fragment key={i}>{p}</Fragment>)}</>;
}

export default function Answer({
  text,
  sources,
  unverified = [],
  done,
}: {
  text: string;
  sources: Record<string, Source>;
  unverified?: string[];
  done: boolean;
}) {
  const refIndex = new Map<string, number>();
  const bad = new Set(unverified);
  const blocks: React.ReactNode[] = [];
  const lines = text.split("\n");
  let list: { ordered: boolean; items: string[] } | null = null;

  // called directly (not as <Inline/>) so ref numbers are assigned in reading
  // order before the source list below is built
  const inline = (s: string) => Inline({ text: s, refIndex, sources, unverified: bad, done });
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={`l${blocks.length}`} className={`my-2 space-y-1.5 pr-5 ${list.ordered ? "list-decimal" : "list-disc"} marker:text-[#b08d57]`}>
        {list.items.map((it, i) => <li key={i} className="leading-8">{inline(it)}</li>)}
      </Tag>
    );
    list = null;
  };

  // markdown tables: consecutive lines starting with "|"
  let table: string[][] | null = null;
  const cells = (row: string) => row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  // "<br>" inside a cell becomes a real line break (no HTML is injected)
  const cell = (text: string) =>
    text.split(/<br\s*\/?>/i).map((part, i) => <Fragment key={i}>{i > 0 && <br />}{inline(part)}</Fragment>);
  const flushTable = () => {
    if (!table) return;
    const [head, ...body] = table;
    blocks.push(
      <div key={`t${blocks.length}`} className="my-3 overflow-x-auto rounded-xl border border-[#0f1c36]/[0.08]">
        <table className="w-full min-w-[520px] border-collapse text-[13px] leading-6">
          <thead className="bg-[#0f1c36] text-[#f1dfb3]">
            <tr>{head.map((h, i) => <th key={i} className="px-3 py-2 text-right font-semibold">{cell(h)}</th>)}</tr>
          </thead>
          <tbody>
            {body.map((row, r) => (
              <tr key={r} className="border-t border-[#0f1c36]/[0.06] even:bg-[#fbf9f4]">
                {head.map((_, c) => <td key={c} className="px-3 py-2 align-top">{cell(row[c] ?? "")}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    table = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim().startsWith("|")) {
      flush();
      if (/^\s*\|?\s*:?-{2,}/.test(line.replace(/^\s*\|/, "|").slice(1)) && table) continue; // separator row
      (table ??= []).push(cells(line));
      continue;
    }
    flushTable();
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flush();
      blocks.push(<hr key={`r${blocks.length}`} className="my-4 border-[#0f1c36]/10" />);
      continue;
    }
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flush();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
      continue;
    }
    flush();
    if (!line.trim()) continue;
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      blocks.push(
        <h3 key={`h${blocks.length}`} className={`${heading[1].length <= 2 ? "mt-5 text-lg" : "mt-4 text-base"} mb-1.5 font-bold text-[#0f1c36] first:mt-0`}>
          {inline(heading[2])}
        </h3>
      );
    } else if (line.startsWith(">")) {
      blocks.push(
        <blockquote key={`q${blocks.length}`} className="my-2 rounded-lg border-r-4 border-[#b08d57] bg-[#fbf7ee] px-4 py-2 font-arabic-heading text-[15px] leading-8 text-[#3b3320]">
          {inline(line.replace(/^>\s?/, ""))}
        </blockquote>
      );
    } else {
      blocks.push(<p key={`p${blocks.length}`} className="my-1.5 leading-8">{inline(line)}</p>);
    }
  }
  flush();
  flushTable();

  const ordered = [...refIndex.entries()];
  return (
    <div>
      <div className="text-[15px] text-[#1f2a40]">{blocks}</div>
      {done && ordered.length > 0 && (
        <details className="group mt-4 rounded-xl border border-[#0f1c36]/[0.08] bg-[#fbf9f4]" open={ordered.length <= 4}>
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-xs font-bold text-[#0f1c36]/70">
            <span>المصادر ({ordered.length})</span>
            <span className="transition group-open:rotate-180">⌄</span>
          </summary>
          <ol className="space-y-1.5 px-3 pb-3">
            {ordered.map(([ref, n]) => {
              const s = sources[ref];
              return (
                <li key={ref} id={`src-${n}`} className={`flex gap-3 rounded-lg px-3 py-2 text-xs ${s ? "bg-white" : "bg-red-50"}`}>
                  <span className={`tnum flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${s ? "bg-[#f7f1e4] text-[#7a5c2a]" : "bg-red-100 text-red-700"}`}>{s ? n : "!"}</span>
                  {s ? (
                    <span className="min-w-0">
                      <span className="block font-semibold text-[#0f1c36]">{s.label}</span>
                      {s.sub && <span className="block text-[#0f1c36]/50">{s.sub}</span>}
                      {s.excerpt && <span className="mt-1 block font-arabic-heading text-[13px] leading-6 text-[#3b3320]">«{s.excerpt}»</span>}
                    </span>
                  ) : (
                    <span className="text-red-700">مرجع غير متحقق: لم يرد في ملفات المكتب أو مكتبته، فلا تعتمد على المعلومة المرتبطة به.</span>
                  )}
                </li>
              );
            })}
          </ol>
        </details>
      )}
    </div>
  );
}
