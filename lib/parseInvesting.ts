type ParseResult = { value: number; raw: string; method: string };

function normalizeNumberText(s: string) {
  // "7.306,103" -> "7306.103"
  const t = s.trim();
  if (t.includes(".") && t.includes(",")) return t.replace(/\./g, "").replace(",", ".");
  if (t.includes(",") && !t.includes(".")) return t.replace(",", ".");
  return t;
}

function toNumber(s: string) {
  return Number(normalizeNumberText(s));
}

export function parseInvestingLastPrice(html: string): ParseResult {
  const attempts: Array<{ method: string; re: RegExp }> = [
    { method: "data-test-instrument-price-last", re: /data-test="instrument-price-last"[^>]*>\s*([^<]+)\s*</i },
    { method: "json-near-instrument", re: /instrument-price-last[^]{0,250}?"text"\s*:\s*"([^"]+)"/i },
    { method: "faq-sentence", re: /şu anda\s+([\d\.,]+)\s+/i }
  ];

  for (const a of attempts) {
    const m = html.match(a.re);
    if (m?.[1]) {
      const raw = m[1].trim();
      const v = toNumber(raw);
      if (isFinite(v) && v > 0 && v < 5_000_000) return { value: v, raw, method: a.method };
    }
  }

  // fallback: sayfadaki ilk mantıklı sayı
  const mAll = html.match(/(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:,\d+)?)/g);
  if (mAll) {
    for (const cand of mAll) {
      const v = toNumber(cand);
      if (isFinite(v) && v > 0 && v < 5_000_000) return { value: v, raw: cand, method: "global-scan" };
    }
  }

  throw new Error("Fiyat parse edilemedi (HTML değişmiş olabilir).");
}