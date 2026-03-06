import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseTRNumber(raw: string): number {
  let s = raw.trim().replace(/\s/g, "");

  if (s.includes(".") && s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }

  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`Sayı parse edilemedi: "${raw}"`);
  return n;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Sayfa alınamadı (${res.status}): ${url}${txt ? " | " + txt.slice(0, 120) : ""}`);
  }

  return res.text();
}

function extractByDynamicClass(html: string, className: string): number {
  const re = new RegExp(`class="${className}"[^>]*>([\\d.,]+)<`, "i");
  const m = html.match(re);
  if (!m) throw new Error(`Element bulunamadı: .${className}`);
  return parseTRNumber(m[1]);
}

function extractAltins1(html: string): number {
  const re =
    /<span[^>]*>\s*Son İşlem Fiyatı\s*<\/span>\s*<span[^>]*>\s*([\d.,]+)\s*<\/span>/i;

  const m = html.match(re);
  if (!m) throw new Error(`ALTINS1 "Son İşlem Fiyatı" bloğu bulunamadı`);
  return parseTRNumber(m[1]);
}

async function saveHistory(payload: {
  altins1: number;
  usdtry: number;
  xauusd: number;
  gram_altin: number;
  teorik_altins1: number;
  prim_yuzde: number;
  source_altins1: string;
  source_usdtry: string;
  source_xauusd: string;
  source_gram_altin: string;
}) {
  const { error } = await supabase.from("altins1_history").insert(payload);
  if (error) {
    throw new Error(`Supabase kayıt hatası: ${error.message}`);
  }
}

export async function GET() {
  try {
    const USDTRY_URL = "https://finans.mynet.com/doviz/usd-dolar/";
    const XAUUSD_URL = "https://finans.mynet.com/altin/xau-usd-ons-altin/";
    const GAUTRY_URL = "https://finans.mynet.com/altin/xgld-spot-altin-tl-gr/";
    const ALTINS1_URL =
      "https://finans.mynet.com/borsa/hisseler/altins1-darphane-altin-sertifikasi/";

    const [usdHtml, xauHtml, gauHtml, s1Html] = await Promise.all([
      fetchHtml(USDTRY_URL),
      fetchHtml(XAUUSD_URL),
      fetchHtml(GAUTRY_URL),
      fetchHtml(ALTINS1_URL),
    ]);

    const usdtry = extractByDynamicClass(usdHtml, "dynamic-price-USDTRY");
    const xauusd = extractByDynamicClass(xauHtml, "dynamic-price-XAUUSD");
    const gram_altin = extractByDynamicClass(gauHtml, "dynamic-price-GAUTRY");
    const altins1 = extractAltins1(s1Html);

    const gramUsd = xauusd / 31.1034768;
    const gramTry = gramUsd * usdtry;
    const teorik_altins1 = gramTry * 0.01;
    const prim_yuzde = ((altins1 / teorik_altins1) - 1) * 100;

    const result = {
      timestamp: new Date().toISOString(),
      sources: {
        usdtry: USDTRY_URL,
        xauusd: XAUUSD_URL,
        gram_altin: GAUTRY_URL,
        altins1: ALTINS1_URL,
      },
      values: {
        altins1: Number(altins1.toFixed(4)),
        usdtry: Number(usdtry.toFixed(4)),
        xauusd: Number(xauusd.toFixed(4)),
        gram_altin: Number(gram_altin.toFixed(4)),
      },
      calculations: {
        teorik_altins1: Number(teorik_altins1.toFixed(4)),
        prim_yuzde: Number(prim_yuzde.toFixed(2)),
      },
    };

    await saveHistory({
      altins1: result.values.altins1,
      usdtry: result.values.usdtry,
      xauusd: result.values.xauusd,
      gram_altin: result.values.gram_altin,
      teorik_altins1: result.calculations.teorik_altins1,
      prim_yuzde: result.calculations.prim_yuzde,
      source_altins1: result.sources.altins1,
      source_usdtry: result.sources.usdtry,
      source_xauusd: result.sources.xauusd,
      source_gram_altin: result.sources.gram_altin,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: true, message: err?.message ?? "Bilinmeyen hata" },
      { status: 500 }
    );
  }
}