// Citation markers the assistant writes, e.g. [CA-ckx...] or [CA-a, H-b].
export const REF_PREFIXES = ["CL", "CA", "H", "AP", "DL", "TL", "UP", "FD", "NT", "TS", "CR", "K", "DOC", "AT"] as const;

const ONE = `(?:${REF_PREFIXES.join("|")})-[a-z0-9]{6,40}`;
export const REF_GROUP = new RegExp(`\\[\\s*(${ONE}(?:\\s*[,،]\\s*${ONE})*)\\s*\\]`, "g");
const REF_ONE = new RegExp(ONE, "g");

/** Every ref cited in a text, in order of first appearance. */
export function citedRefs(text: string): string[] {
  const out: string[] = [];
  for (const group of text.matchAll(REF_GROUP)) {
    for (const ref of group[1].match(REF_ONE) ?? []) if (!out.includes(ref)) out.push(ref);
  }
  return out;
}

/**
 * The answer states law: an article number, a law number, or a legal period /
 * rule phrased as such ("المدة القانونية", "ينص القانون", "خلال 30 يومًا من …").
 */
export function mentionsArticle(text: string) {
  return [
    /(?:ال)?ماد[ةه]\s*\(?\s*[0-9٠-٩]+/,
    /قانون\s+رقم\s*[0-9٠-٩]+/,
    /(?:المد[ةه]|المهل[ةه]|الحد)\s+(?:القانوني[ةه]|المقرر[ةه]\s+قانون)/,
    /(?:ينص|نص|يشترط|يوجب|يمنح)\s+القانون/,
    /(?:حسب|بموجب|وفق[اًا]*\s*(?:لل|ل)?|طبق[اًا]*\s*(?:لل|ل)?)\s*(?:ال)?قانون/,
    /(?:خلال|بعد|قبل)\s+[0-9٠-٩]+\s+(?:يوم|أيام|يومًا|شهر|أشهر|سنة|سنوات)\s+(?:من\s+تاريخ|من\s+ال)/,
  ].some((re) => re.test(text));
}
