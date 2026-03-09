import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("altins1_history")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Supabase history hatası: ${error.message}`);
    }

    const items = data ?? [];
    const latest = items.length > 0 ? items[items.length - 1] : null;

    return NextResponse.json({
      count: items.length,
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