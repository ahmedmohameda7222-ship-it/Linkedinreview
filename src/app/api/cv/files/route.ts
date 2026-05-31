import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/server/api";

export async function GET() {
  const { supabase, response } = await requireUser();
  if (response) return response;
  const { data, error } = await supabase.from("cv_files").select("*").order("created_at", { ascending: false });
  if (error) return jsonError(error);
  return NextResponse.json({ cvFiles: data ?? [] });
}
