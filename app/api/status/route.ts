import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function computeActive(lastCronRunAt?: string | null) {
  if (!lastCronRunAt) return false;

  const last = new Date(lastCronRunAt).getTime();
  if (!Number.isFinite(last)) return false;

  const now = Date.now();
  const diffMinutes = (now - last) / 1000 / 60;

  return diffMinutes <= 20;
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("system_status")
      .select("*")
      .eq("id", 1)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(error.message);
    }

    const item = data ?? null;

    return NextResponse.json({
      item,
      active: computeActive(item?.last_cron_run_at ?? null),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: true, message: err?.message ?? "Bilinmeyen hata" },
      { status: 500 }
    );
  }
}