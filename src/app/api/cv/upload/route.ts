import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/server/api";

const MAX_PDF_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const { supabase, user, response } = await requireUser();
  if (response) return response;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "PDF file is required." }, { status: 400 });
    if (file.type !== "application/pdf") return NextResponse.json({ error: "Only PDF uploads are allowed." }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_PDF_SIZE) return NextResponse.json({ error: "PDF must be 10 MB or smaller." }, { status: 400 });

    await supabase.from("cv_files").update({ active: false }).eq("user_id", user.id);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
    const storagePath = `${user.id}/${Date.now()}-${safeName || "cv.pdf"}`;
    const { error: uploadError } = await supabase.storage.from("cv-files").upload(storagePath, file, {
      cacheControl: "3600",
      contentType: "application/pdf",
      upsert: false,
    });
    if (uploadError) return jsonError(uploadError, "Could not upload CV.");

    const { data: publicData } = supabase.storage.from("cv-files").getPublicUrl(storagePath);
    const publicUrl = publicData.publicUrl;

    const { data, error } = await supabase
      .from("cv_files")
      .insert({
        user_id: user.id,
        original_file_name: file.name,
        stored_file_path: storagePath,
        public_url: publicUrl,
        file_size: file.size,
        mime_type: file.type,
        active: true,
      })
      .select("*")
      .single();
    if (error) return jsonError(error);

    await supabase.from("profiles").update({ cv_file_url: publicUrl }).eq("user_id", user.id);
    return NextResponse.json({ cvFile: data }, { status: 201 });
  } catch (error) {
    return jsonError(error, "Could not upload CV.");
  }
}
