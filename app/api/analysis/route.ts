import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * TR sayı formatı:
 * "44,0170" => 44.0170
 * "5.082,67" => 5082.67
 * "7.192,8080" => 7192.8080
 * EN:
 * "88.74" => 88.74
 */
function parseTRNumber(raw: string): number {
  let s = raw.trim().replace(/\s/g, "");

  // 1.234,56
  if (s.includes(".") && s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    // 43,99
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
  // Örn: <span class="dynamic-price-USDTRY">44,0170</span>
  const re = new RegExp(
    `class="${className}"[^>]*>([\\d.,]+)<`,
    "i"
  );
  const m = html.match(re);
  if (!m) throw new Error(`Element bulunamadı: .${className}`);
  return parseTRNumber(m[1]);
}

function extractAltins1(html: string): number {
  // Senin gördüğün yapı:
  // <span>Son İşlem Fiyatı</span>
  // <span>88.74</span>
  // Arada başka attribute'lar olabilsin diye esnek tuttum.
  const re =
    /<span[^>]*>\s*Son İşlem Fiyatı\s*<\/span>\s*<span[^>]*>\s*([\d.,]+)\s*<\/span>/i;

  const m = html.match(re);
  if (!m) throw new Error(`ALTINS1 "Son İşlem Fiyatı" bloğu bulunamadı`);
  return parseTRNumber(m[1]); // 88.74 da düzgün parse eder
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

    // Teorik ALTINS1: ons->gram(USD)->TRY->0.01g sertifika
    const gramUsd = xauusd / 31.1034768;
    const gramTry = gramUsd * usdtry;
    const teorik_altins1 = gramTry * 0.01;

    const prim_yuzde = ((altins1 / teorik_altins1) - 1) * 100;

    return NextResponse.json({
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
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: true, message: err?.message ?? "Bilinmeyen hata" },
      { status: 500 }
    );
  }
}