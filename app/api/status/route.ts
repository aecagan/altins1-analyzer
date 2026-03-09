import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    return NextResponse.json({
      item: data ?? null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: true, message: err?.message ?? "Bilinmeyen hata" },
      { status: 500 }
    );
  }
}