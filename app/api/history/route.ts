import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1) Kayıtları al
    const { data, error } = await supabase
      .from("altins1_history")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Supabase history hatası: ${error.message}`);
    }

    // 2) Exact count'i ayrı al
    const { count, error: countError } = await supabase
      .from("altins1_history")
      .select("*", { count: "exact", head: true });

    if (countError) {
      throw new Error(`Supabase count hatası: ${countError.message}`);
    }

    const items = data ?? [];
    const latest = items.length > 0 ? items[items.length - 1] : null;

    return NextResponse.json({
      count: count ?? 0,
      latest,
      items,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: true,
        message: err?.message ?? "Bilinmeyen hata",
      },
      { status: 500 }
    );
  }
}