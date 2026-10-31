import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { can, ROLE_LABELS_AR } from "@/lib/permissions";
import { withTenant } from "@/lib/tenant";
import { aiErrorMessage, firmAi, requireHukm } from "@/lib/ai/access";
import { citedRefs, mentionsArticle } from "@/lib/ai/citations";
import { STABLE_SYSTEM, dynamicSystem } from "@/lib/ai/prompt";
import { TOOLS, runTool, type SourceMap } from "@/lib/ai/tools";
import { compatibleApiErrorMessage, streamCompatibleTurn } from "@/lib/ai/openai-compatible";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_TOOL_ROUNDS = 10;
const HISTORY_LIMIT = 30;

const STATUS_LABELS: Record<string, string> = {
  firm_overview: "يراجع ملخص المكتب…",
  read_uploaded_file: "يقرأ الملف المرفوع…",
  find_clients: "يبحث في سجل العملاء…",
  get_client_file: "يقرأ ملف العميل…",
  search_cases: "يبحث في قضايا المكتب…",
  get_case_file: "يقرأ ملف القضية…",
  get_schedule: "يراجع الجلسات والمواعيد…",
  list_library: "يراجع محتويات المكتبة القانونية…",
  search_library: "يبحث في النصوص القانونية…",
  read_library_document: "يقرأ النص القانوني…",
};

const body = z.object({
  conversationId: z.string().min(1).max(40).optional(),
  message: z.string().trim().min(1, "اكتب سؤالك.").max(8000, "السؤال طويل جدًا."),
  attachmentIds: z.array(z.string().min(1).max(40)).max(5).optional(),
});

type Event =
  | { t: "meta"; conversationId: string }
  | { t: "status"; text: string }
  | { t: "delta"; text: string }
  | { t: "sources"; sources: SourceMap }
  | { t: "done"; messageId: string; sources: SourceMap; unverified: string[]; warnings: string[] }
  | { t: "error"; text: string };

export async function POST(request: Request) {
  const auth = await requireHukm();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "طلب غير صالح." }, { status: 400 });
  const { message } = parsed.data;

  let ai: Awaited<ReturnType<typeof firmAi>>;
  try {
    ai = await firmAi(ctx.tenantId);
  } catch (error) {
    console.error("hukm provider configuration error", error);
    return NextResponse.json({ error: "تعذّر الاتصال بمزوّد الذكاء الاصطناعي. راجع عنوان API من الإعدادات." }, { status: 503 });
  }
  if (!ai) return NextResponse.json({ error: "لم يُفعَّل «حُكم» بعد. يحتاج الشريك الإداري إلى إضافة مفتاح API من الإعدادات.", code: "NO_KEY" }, { status: 409 });

  // conversation + history (the user's own conversations only)
  const setup = await withTenant(ctx.tenantId, async (tx) => {
    const [tenant, user] = await Promise.all([
      tx.tenant.findUniqueOrThrow({ where: { id: ctx.tenantId }, select: { name: true } }),
      tx.user.findUniqueOrThrow({ where: { id: ctx.userId }, select: { name: true } }),
    ]);
    let conversation = parsed.data.conversationId
      ? await tx.aiConversation.findFirst({ where: { id: parsed.data.conversationId, tenantId: ctx.tenantId, userId: ctx.userId }, select: { id: true } })
      : null;
    if (parsed.data.conversationId && !conversation) return null;
    if (!conversation) {
      conversation = await tx.aiConversation.create({
        data: { tenantId: ctx.tenantId, userId: ctx.userId, title: message.replace(/\s+/g, " ").slice(0, 70) },
        select: { id: true },
      });
    }
    const files = parsed.data.attachmentIds?.length
      ? await tx.aiAttachment.findMany({
          where: { id: { in: parsed.data.attachmentIds }, conversationId: conversation.id, tenantId: ctx.tenantId, userId: ctx.userId },
          select: { id: true, fileName: true },
        })
      : [];
    const fullMessage = [message, ...files.map((f) => `[ملف مرفوع: «${f.fileName.replace(/[\[\]«»]/g, "")}» [AT-${f.id}]]`)].join("\n");
    const history = await tx.aiMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT,
      select: { role: true, content: true, sources: true },
    });
    await tx.aiMessage.create({ data: { tenantId: ctx.tenantId, conversationId: conversation.id, role: "user", content: fullMessage, unverified: [] } });
    await tx.aiConversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
    await tx.auditLog.create({
      data: { tenantId: ctx.tenantId, userId: ctx.userId, action: "AI_ACCESS", entityType: "AiConversation", entityId: conversation.id },
    });
    return { conversationId: conversation.id, firmName: tenant.name, userName: user.name, history: history.reverse(), fullMessage };
  });
  if (!setup) return NextResponse.json({ error: "المحادثة غير موجودة." }, { status: 404 });

  // refs already verified in earlier turns stay citable
  const sources: SourceMap = {};
  for (const m of setup.history) if (m.sources && typeof m.sources === "object") Object.assign(sources, m.sources as SourceMap);
  const turnSources: SourceMap = {};

  const messages: Anthropic.Beta.BetaMessageParam[] = [];
  for (const m of setup.history) {
    const role = m.role === "assistant" ? "assistant" : "user";
    // keep strict alternation: merge consecutive same-role turns
    const last = messages[messages.length - 1];
    if (last && last.role === role && typeof last.content === "string") last.content += "\n\n" + m.content;
    else messages.push({ role, content: m.content });
  }
  if (messages[0]?.role === "assistant") messages.shift();
  const lastMsg = messages[messages.length - 1];
  if (lastMsg?.role === "user" && typeof lastMsg.content === "string") lastMsg.content += "\n\n" + setup.fullMessage;
  else messages.push({ role: "user", content: setup.fullMessage });

  const canSeeNotes = can(ctx.role, "note.confidential.view");
  const dynamicInstructions = dynamicSystem({ firmName: setup.firmName, userName: setup.userName, roleLabel: ROLE_LABELS_AR[ctx.role], canSeeNotes });
  const systemText = `${STABLE_SYSTEM}\n\n${dynamicInstructions}`;
  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    { type: "text", text: STABLE_SYSTEM, cache_control: { type: "ephemeral" } },
    { type: "text", text: dynamicInstructions },
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const send = (e: Event) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
        } catch {
          open = false; // browser went away; whatever was generated is still saved below
        }
      };
      send({ t: "meta", conversationId: setup.conversationId });

      let answer = "";
      let failure: string | null = null;
      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          let roundText = "";
          const sendText = (delta: string) => {
            if (!roundText && answer) {
              answer += "\n\n";
              send({ t: "delta", text: "\n\n" });
            }
            roundText += delta;
            answer += delta;
            send({ t: "delta", text: delta });
          };
          let assistantContent: Anthropic.Beta.BetaContentBlockParam[];
          let toolUses: Array<{ id: string; name: string; input: unknown }>;

          if (ai.provider === "anthropic") {
            const turn = ai.client.beta.messages.stream(
              {
                model: ai.model,
                max_tokens: 16000,
                betas: ["server-side-fallback-2026-07-01"],
                fallbacks: "default",
                thinking: { type: "adaptive" },
                output_config: { effort: "medium" },
                system,
                tools: TOOLS,
                messages,
              },
              { signal: request.signal }
            );
            turn.on("text", sendText);
            turn.on("streamEvent", (event) => {
              if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
                send({ t: "status", text: STATUS_LABELS[event.content_block.name] ?? "يراجع ملفات المكتب…" });
              }
            });
            const final = await turn.finalMessage();
            if (final.stop_reason === "refusal") {
              if (!answer) failure = "اعتذر المساعد عن هذا الطلب. أعد صياغة السؤال بشكل مختلف.";
              break;
            }
            assistantContent = final.content;
            toolUses = final.content
              .filter((block): block is Anthropic.Beta.BetaToolUseBlock => block.type === "tool_use")
              .map((tool) => ({ id: tool.id, name: tool.name, input: tool.input }));
          } else {
            const final = await streamCompatibleTurn({
              baseUrl: ai.baseUrl,
              apiKey: ai.apiKey,
              model: ai.model,
              system: systemText,
              messages,
              tools: TOOLS,
              signal: request.signal,
              onText: sendText,
              onWait: (seconds) => send({ t: "status", text: `بانتظار حد الاستخدام لدى مزوّد الذكاء الاصطناعي (${Math.ceil(seconds)} ثانية)…` }),
            });
            if (final.refused) {
              if (!answer) failure = "اعتذر المساعد عن هذا الطلب. أعد صياغة السؤال بشكل مختلف.";
              break;
            }
            toolUses = final.toolCalls;
            if (toolUses[0]) send({ t: "status", text: STATUS_LABELS[toolUses[0].name] ?? "يراجع ملفات المكتب…" });
            assistantContent = [
              ...(roundText ? [{ type: "text" as const, text: roundText }] : []),
              ...toolUses.map((tool) => ({ type: "tool_use" as const, id: tool.id, name: tool.name, input: tool.input as Record<string, unknown> })),
            ];
          }
          if (toolUses.length === 0) break;

          messages.push({ role: "assistant", content: assistantContent });
          const results = await Promise.all(
            toolUses.map(async (use) => {
              try {
                const out = await runTool(use.name, use.input, { tenantId: ctx.tenantId, canSeeNotes, conversationId: setup.conversationId }, turnSources);
                return { type: "tool_result" as const, tool_use_id: use.id, content: out.content, is_error: out.isError };
              } catch (err) {
                console.error("hukm tool error", use.name, err);
                return { type: "tool_result" as const, tool_use_id: use.id, content: "Tool failed; tell the user this data could not be read right now.", is_error: true };
              }
            })
          );
          messages.push({ role: "user", content: results });
          send({ t: "sources", sources: turnSources });
          if (round === MAX_TOOL_ROUNDS - 1) {
            failure = "توقّف المساعد بعد عدد كبير من خطوات البحث. جرّب سؤالًا أكثر تحديدًا.";
          }
        }
      } catch (err) {
        if (request.signal.aborted) {
          failure = "أُوقف التوليد.";
        } else {
          console.error("hukm chat error", err);
          failure = ai.provider === "anthropic" ? aiErrorMessage(err) : compatibleApiErrorMessage(err);
        }
      }

      // verify every citation against what tools actually returned
      Object.assign(sources, turnSources);
      const cited = citedRefs(answer);
      const verified: SourceMap = {};
      const unverified: string[] = [];
      for (const ref of cited) {
        if (sources[ref]) verified[ref] = sources[ref];
        else unverified.push(ref);
      }
      const warnings: string[] = [];
      if (unverified.length) warnings.push("وردت في الإجابة مراجع لم يتم التحقق منها في ملفات المكتب. لا تعتمد على الجمل المرتبطة بها.");
      if (mentionsArticle(answer) && !cited.some((r) => r.startsWith("K-") && sources[r])) {
        warnings.push("تضمّنت الإجابة حكمًا أو مدة قانونية دون نص موثّق من مكتبة المكتب. تحقق منها قبل الاعتماد عليها.");
      }
      if (failure && !answer) answer = failure;
      else if (failure) warnings.push(failure);

      try {
        const saved = await withTenant(ctx.tenantId, (tx) =>
          tx.aiMessage.create({
            data: { tenantId: ctx.tenantId, conversationId: setup.conversationId, role: "assistant", content: answer, sources: verified, unverified },
            select: { id: true },
          })
        );
        if (failure && answer === failure) send({ t: "error", text: failure });
        send({ t: "done", messageId: saved.id, sources: verified, unverified, warnings });
      } catch (err) {
        console.error("hukm save error", err);
        send({ t: "error", text: "تعذّر حفظ الإجابة." });
      }
      if (open) controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
