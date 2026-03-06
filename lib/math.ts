export const OUNCE_TO_GRAM = 31.1034768;
export const CERT_GRAM = 0.01;
export const FINENESS = 0.995;

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function theoreticalFromGram(gramTry: number) {
  return gramTry * CERT_GRAM * FINENESS;
}

export function theoreticalFromOns(xauUsd: number, usdTry: number) {
  const gramTry = (xauUsd * usdTry) / OUNCE_TO_GRAM;
  return gramTry * CERT_GRAM * FINENESS;
}

export function premiumPct(market: number, theoretical: number) {
  if (!isFinite(market) || !isFinite(theoretical) || theoretical <= 0) return NaN;
  return (market / theoretical - 1) * 100;
}

export function statusFromPrim(p: number) {
  if (!isFinite(p)) return "BILINMIYOR";
  if (p < -5) return "COK_UCUZ";
  if (p <= 5) return "NORMAL";
  if (p <= 10) return "PAHALI";
  return "ASIRI_PRIMLI";
}