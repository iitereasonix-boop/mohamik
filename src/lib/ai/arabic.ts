// Arabic text helpers for the firm library: normalisation for search and
// splitting legal texts into one chunk per article.

const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g; // tashkeel + tatweel
const ARABIC_DIGITS = /[٠-٩]/g;

export function normalizeArabic(input: string): string {
  return input
    .replace(DIACRITICS, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(ARABIC_DIGITS, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .toLowerCase();
}

const STOP_WORDS = new Set(
  ["في", "من", "على", "الى", "عن", "او", "ما", "هل", "هو", "هي", "مع", "ان", "كان", "التي", "الذي", "هذا", "هذه", "ذلك", "كل", "شو", "اي", "بعد", "قبل", "عند", "لا", "لم", "لن", "قد", "the", "of"].map(normalizeArabic)
);

/** Search terms from a free-text query: normalised, prefixes trimmed, stop words dropped. */
export function searchTerms(query: string): string[] {
  const terms = normalizeArabic(query)
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.replace(/^(وال|بال|كال|فال|لل|ال)(?=\p{L}{3,})/u, ""))
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
  return [...new Set(terms)].slice(0, 12);
}

// "المادة 23" / "مادة (23)" / "المادة ٢٣ -" at the start of a line
const ARTICLE_START = /^\s*(?:ال)?ماد(?:ة|ه)\s*[\(\[\-–:]?\s*([0-9٠-٩]+)\s*[\)\]\-–:.]?/;

export type Chunk = { heading: string | null; text: string };

const MAX_CHUNK = 2400;

function splitLong(text: string, heading: string | null): Chunk[] {
  if (text.length <= MAX_CHUNK) return [{ heading, text }];
  const out: Chunk[] = [];
  let buf = "";
  for (const para of text.split(/\n\s*\n|\n/)) {
    if ((buf + "\n" + para).length > MAX_CHUNK && buf) {
      out.push({ heading, text: buf.trim() });
      buf = "";
    }
    buf += (buf ? "\n" : "") + para;
  }
  if (buf.trim()) out.push({ heading, text: buf.trim() });
  return out;
}

/**
 * One chunk per article when the text is a statute ("المادة N"), otherwise
 * paragraph groups. Text before the first article becomes a preamble chunk.
 */
export function chunkLegalText(raw: string): Chunk[] {
  const text = raw.replace(/\r\n/g, "\n").trim();
  const lines = text.split("\n");
  const articles: Chunk[] = [];
  let current: { heading: string | null; lines: string[] } = { heading: null, lines: [] };

  for (const line of lines) {
    const match = line.match(ARTICLE_START);
    if (match) {
      if (current.lines.join("").trim()) articles.push({ heading: current.heading, text: current.lines.join("\n").trim() });
      const num = match[1].trim().replace(ARABIC_DIGITS, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
      current = { heading: `المادة ${num}`, lines: [line] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.join("").trim()) articles.push({ heading: current.heading, text: current.lines.join("\n").trim() });

  const hasArticles = articles.filter((a) => a.heading).length >= 2;
  const base = hasArticles ? articles : [{ heading: null, text }];
  return base.flatMap((c) => splitLong(c.text, c.heading));
}

const COMMON_WORD = /(?:^|\s)(?:ال[ء-ي]{2,}|في|من|على|إلى|عن|مع|هذا|هذه)(?=\s|[.,،؛:]|$)/g;
const commonWords = (text: string) => text.match(COMMON_WORD)?.length ?? 0;

function reverseLine(line: string) {
  const swap: Record<string, string> = { "(": ")", ")": "(", "[": "]", "]": "[", "«": "»", "»": "«" };
  const reversed = [...line].reverse().map((c) => swap[c] ?? c).join("");
  // numbers and Latin words read left-to-right: put them back
  return reversed.replace(/[0-9A-Za-z](?:[0-9A-Za-z.,/:_-]*[0-9A-Za-z])?/g, (run) => [...run].reverse().join(""));
}

/**
 * Many Arabic PDFs store text in visual order with presentation-form letters.
 * Normalise the letters, then keep whichever direction reads as real Arabic.
 */
export function fixPdfArabic(raw: string): string {
  const text = raw.normalize("NFKC").replace(/ی/g, "ي").replace(/ک/g, "ك");
  const reversed = text.split("\n").map(reverseLine).join("\n");
  return commonWords(reversed) > commonWords(text) ? reversed : text;
}
