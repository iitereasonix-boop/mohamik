import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type Anthropic from "@anthropic-ai/sdk";

type ToolCall = { id: string; name: string; input: unknown };
type ChatMessage = { role: string; content?: unknown; tool_call_id?: string; tool_calls?: unknown[] };

export class CompatibleApiError extends Error {
  constructor(readonly status: number) {
    super(`OpenAI-compatible API returned ${status}`);
  }
}

function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const parts = address.split(".").map(Number);
    const [a, b, c] = parts;
    return !(
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || (b === 0 && c === 0) || (b === 0 && c === 2))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)
    );
  }
  if (isIP(address) === 6) {
    const normalized = address.toLowerCase();
    return (normalized.startsWith("2") || normalized.startsWith("3")) && !normalized.startsWith("2001:db8:");
  }
  return false;
}

export async function normalizePublicApiUrl(raw: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("أدخل عنوان API صالحًا.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.port && url.port !== "443") ||
    url.hostname === "localhost" ||
    url.hostname.endsWith(".localhost") ||
    url.hostname.endsWith(".local") ||
    url.hostname.endsWith(".internal")
  ) {
    throw new Error("يجب أن يكون عنوان API عامًا وآمنًا عبر HTTPS.");
  }
  const hostname = url.hostname.toLowerCase();
  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true, verbatim: true }).catch(() => []);
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error("عنوان API يجب أن يشير إلى خادم عام على الإنترنت.");
  }
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString().replace(/\/$/, "");
}

function completionUrl(baseUrl: string) {
  const url = new URL(baseUrl);
  const path = url.pathname.replace(/\/+$/, "");
  url.pathname = `${path || "/v1"}/chat/completions`;
  return url.toString();
}

const MAX_RATE_LIMIT_RETRIES = 4;
const MAX_WAIT_SECONDS = 60;

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
  });
}

/** Seconds to wait before retrying a 429, from the provider's headers when given. */
function retryDelay(response: Response, attempt: number) {
  const header = response.headers.get("retry-after") ?? response.headers.get("x-ratelimit-reset-tokens") ?? "";
  const seconds = parseFloat(header); // "7", "7.5" or "7.5s"
  return Math.min(Number.isFinite(seconds) && seconds > 0 ? seconds + 0.5 : 5 * 2 ** attempt, MAX_WAIT_SECONDS);
}

// Providers with small per-minute token limits (e.g. free tiers) answer 429
// mid-conversation; waiting the time they ask for lets the answer complete.
async function postJson(
  baseUrl: string,
  apiKey: string,
  payload: Record<string, unknown>,
  signal?: AbortSignal,
  onWait?: (seconds: number) => void,
) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(completionUrl(baseUrl), {
      method: "POST",
      redirect: "error",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
    if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
      const wait = retryDelay(response, attempt);
      await response.body?.cancel();
      onWait?.(wait);
      await sleep(wait * 1000, signal);
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new CompatibleApiError(response.status);
    }
    return response;
  }
}

export async function verifyCompatibleApi(
  baseUrl: string,
  apiKey: string,
  model: string,
  signal?: AbortSignal,
) {
  const response = await postJson(baseUrl, apiKey, {
    model,
    max_tokens: 1,
    messages: [{ role: "user", content: "اختبار" }],
  }, signal);
  await response.body?.cancel();
}

/** One-shot image reading; rejected by models without vision. */
export async function compatibleVisionText(options: { baseUrl: string; apiKey: string; model: string; mimeType: string; base64: string; prompt: string; signal: AbortSignal }) {
  const response = await postJson(options.baseUrl, options.apiKey, {
    model: options.model,
    max_tokens: 6000,
    messages: [{
      role: "user",
      content: [
        { type: "text", text: options.prompt },
        { type: "image_url", image_url: { url: `data:${options.mimeType};base64,${options.base64}` } },
      ],
    }],
  }, options.signal);
  const json = (await response.json()) as { choices?: Array<{ message?: { content?: string | null } }> };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

export function compatibleApiErrorMessage(error: unknown): string {
  if (error instanceof CompatibleApiError) {
    if (error.status === 401 || error.status === 403) return "مفتاح API غير صالح أو لا يملك الصلاحيات المطلوبة.";
    if (error.status === 404) return "النموذج أو عنوان API غير متاح. راجع اسم النموذج وعنوان الخدمة.";
    if (error.status === 413) return "حجم المحادثة أكبر من الحد الذي تسمح به خطة مفتاح الذكاء الاصطناعي الحالية (مثل الخطط المجانية محدودة الرموز في الدقيقة). رقِّ خطة المزوّد أو استخدم مفتاحًا بحدود أعلى من إعدادات «حُكم».";
    if (error.status === 429) return "تم تجاوز حد الاستخدام المسموح للمفتاح مؤقتًا. انتظر قليلًا ثم حاول مجددًا.";
    if (error.status >= 500) return "خدمة الذكاء الاصطناعي مشغولة حاليًا. حاول بعد قليل.";
    return "رفض مزوّد الذكاء الاصطناعي الطلب. تحقق من المفتاح والنموذج وإعدادات المزود.";
  }
  return "تعذّر الاتصال بمزوّد الذكاء الاصطناعي. تحقق من عنوان API واتصال الخادم بالإنترنت.";
}

export function compatibleMessages(
  system: string,
  messages: Anthropic.Beta.BetaMessageParam[],
): ChatMessage[] {
  const result: ChatMessage[] = [{ role: "system", content: system }];
  for (const message of messages) {
    if (typeof message.content === "string") {
      result.push({ role: message.role, content: message.content });
      continue;
    }
    if (!Array.isArray(message.content)) continue;
    if (message.role === "assistant") {
      const text = message.content
        .filter((block) => block.type === "text")
        .map((block) => (block as Anthropic.Beta.BetaTextBlockParam).text)
        .join("");
      const toolCalls = message.content
        .filter((block) => block.type === "tool_use")
        .map((block) => {
          const tool = block as Anthropic.Beta.BetaToolUseBlock;
          return {
            id: tool.id,
            type: "function",
            function: { name: tool.name, arguments: JSON.stringify(tool.input) },
          };
        });
      result.push({ role: "assistant", content: text || null, ...(toolCalls.length ? { tool_calls: toolCalls } : {}) });
      continue;
    }
    for (const block of message.content) {
      if (block.type === "tool_result") {
        const tool = block as Anthropic.Beta.BetaToolResultBlockParam;
        result.push({ role: "tool", tool_call_id: tool.tool_use_id, content: typeof tool.content === "string" ? tool.content : JSON.stringify(tool.content) });
      } else if (block.type === "text") {
        result.push({ role: "user", content: (block as Anthropic.Beta.BetaTextBlockParam).text });
      }
    }
  }
  return result;
}

export async function streamCompatibleTurn(options: {
  baseUrl: string;
  apiKey: string;
  model: string;
  system: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  tools: Anthropic.Tool[];
  signal: AbortSignal;
  onText: (text: string) => void;
  onWait?: (seconds: number) => void;
  maxTokens?: number;
}): Promise<{ toolCalls: ToolCall[]; refused: boolean }> {
  const response = await postJson(options.baseUrl, options.apiKey, {
    model: options.model,
    max_tokens: options.maxTokens ?? 16000,
    stream: true,
    messages: compatibleMessages(options.system, options.messages),
    ...(options.tools.length
      ? {
          tools: options.tools.map((tool) => ({
            type: "function",
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.input_schema,
            },
          })),
        }
      : {}),
  }, options.signal, options.onWait);
  if (!response.body) throw new Error("AI provider returned an empty stream");

  const toolCalls = new Map<number, { id: string; name: string; arguments: string }>();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let refused = false;
  const consume = (line: string) => {
    if (!line.startsWith("data:")) return;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") return;
    const event = JSON.parse(data) as {
      choices?: Array<{ delta?: { content?: string | null; refusal?: string | null; tool_calls?: Array<{ index: number; id?: string; function?: { name?: string; arguments?: string } }> } }>;
    };
    const delta = event.choices?.[0]?.delta;
    if (delta?.content) options.onText(delta.content);
    if (delta?.refusal) refused = true;
    for (const call of delta?.tool_calls ?? []) {
      const accumulated = toolCalls.get(call.index) ?? { id: "", name: "", arguments: "" };
      accumulated.id += call.id ?? "";
      accumulated.name += call.function?.name ?? "";
      accumulated.arguments += call.function?.arguments ?? "";
      toolCalls.set(call.index, accumulated);
    }
  };
  for (;;) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) consume(line);
    if (done) break;
  }
  if (buffer.trim()) consume(buffer);

  return {
    refused,
    toolCalls: [...toolCalls.values()].map((call) => {
      let input: Record<string, unknown> = {};
      try {
        const parsed: unknown = JSON.parse(call.arguments || "{}");
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) input = parsed as Record<string, unknown>;
      } catch {
        input = {};
      }
      return { id: call.id, name: call.name, input };
    }),
  };
}
