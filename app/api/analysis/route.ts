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

  if (!Number.isFinite(n)) {
    throw new Error(`parse error: ${raw}`);
  }

  return n;
}

async function fetchHtml(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`fetch error: ${url}`);
  }

  return res.text();
}

function extractByClass(html: string, className: string) {
  const re = new RegExp(`class="${className}"[^>]*>([\\d.,]+)<`, "i");
  const m = html.match(re);

  if (!m) throw new Error(`price not found: ${className}`);

  return parseTRNumber(m[1]);
}

function extractAltins1(html: string) {
  const re = /Son İşlem Fiyatı<\/span>\s*<span[^>]*>\s*([\d.,]+)\s*<\/span>/i;
  const m = html.match(re);

  if (!m) throw new Error("ALTINS1 not found");

  return parseTRNumber(m[1]);
}

function marketOpen() {
  const now = new Date();

  const tr = new Date(
    now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  );

  const day = tr.getDay();

  // Pazar = 0, Cumartesi = 6
  if (day === 0 || day === 6) return false;

  const hour = tr.getHours();
  const minute = tr.getMinutes();

  const afterStart = hour > 10 || (hour === 10 && minute >= 15);
  const beforeEnd = hour < 18 || (hour === 18 && minute <= 15);

  return afterStart && beforeEnd;
}

async function updateSystemStatus(payload: {
  last_cron_status: string;
  last_message: string;
  last_insert_at?: string | null;
  last_insert_count?: number;
}) {
  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from("system_status")
    .upsert(
      {
        id: 1,
        last_cron_run_at: nowIso,
        last_cron_status: payload.last_cron_status,
        last_insert_at: payload.last_insert_at ?? null,
        last_insert_count: payload.last_insert_count ?? 0,
        last_message: payload.last_message,
        updated_at: nowIso,
      },
      { onConflict: "id" }
    );

  if (error) {
    throw new Error(`system_status update error: ${error.message}`);
  }
}

export async function GET() {
  try {
    if (!marketOpen()) {
      await updateSystemStatus({
        last_cron_status: "MARKET_CLOSED",
        last_message: "Piyasa kapalı olduğu için kayıt alınmadı.",
        last_insert_count: 0,
        last_insert_at: null,
      });

      return NextResponse.json({
        market_closed: true,
        saved: false,
      });
    }

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

    const usdtry = extractByClass(usdHtml, "dynamic-price-USDTRY");
    const xauusd = extractByClass(xauHtml, "dynamic-price-XAUUSD");
    const gram_altin = extractByClass(gauHtml, "dynamic-price-GAUTRY");
    const altins1 = extractAltins1(s1Html);

    if (!altins1 || !usdtry || !xauusd || !gram_altin) {
      await updateSystemStatus({
        last_cron_status: "INVALID_DATA",
        last_message: "Kaynaklardan geçerli veri alınamadı.",
        last_insert_count: 0,
        last_insert_at: null,
      });

      return NextResponse.json({
        invalid_data: true,
        saved: false,
      });
    }

    const gramUsd = xauusd / 31.1034768;
    const gramTry = gramUsd * usdtry;
    const teorik = gramTry * 0.01;
    const prim = ((altins1 / teorik) - 1) * 100;

    const { data: last, error: lastError } = await supabase
      .from("altins1_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);

    if (lastError) {
      throw new Error(`last history read error: ${lastError.message}`);
    }

    if (last && last.length > 0) {
      const prev = last[0];

      if (
        Number(prev.altins1) === Number(altins1) &&
        Number(prev.usdtry) === Number(usdtry) &&
        Number(prev.xauusd) === Number(xauusd) &&
        Number(prev.gram_altin) === Number(gram_altin)
      ) {
        await updateSystemStatus({
          last_cron_status: "DUPLICATE",
          last_message: "Yeni veri önceki kayıtla aynı olduğu için kayıt eklenmedi.",
          last_insert_count: 0,
          last_insert_at: null,
        });

        return NextResponse.json({
          duplicate: true,
          saved: false,
        });
      }
    }

    const nowIso = new Date().toISOString();

    const { error: insertError } = await supabase
      .from("altins1_history")
      .insert({
        altins1,
        usdtry,
        xauusd,
        gram_altin,
        teorik_altins1: teorik,
        prim_yuzde: prim,
        source_altins1: ALTINS1_URL,
        source_usdtry: USDTRY_URL,
        source_xauusd: XAUUSD_URL,
        source_gram_altin: GAUTRY_URL,
      });

    if (insertError) {
      throw new Error(`history insert error: ${insertError.message}`);
    }

    await updateSystemStatus({
      last_cron_status: "SUCCESS",
      last_message: "Veri başarıyla çekildi ve kaydedildi.",
      last_insert_count: 1,
      last_insert_at: nowIso,
    });

    return NextResponse.json({
      saved: true,
    });
  } catch (err: any) {
    try {
      await updateSystemStatus({
        last_cron_status: "ERROR",
        last_message: err?.message ?? "Bilinmeyen hata",
        last_insert_count: 0,
        last_insert_at: null,
      });
    } catch {
      // status update bile patlarsa sessiz geç
    }

    return NextResponse.json({
      error: true,
      message: err?.message ?? "Bilinmeyen hata",
    });
  }
}