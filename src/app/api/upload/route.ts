/**
 * POST /api/upload — upload a product image to Cloudinary.
 *
 * Security (security-review):
 *   - Auth check first — only logged-in admin can upload
 *   - MIME type allowlist — rejects non-image files even if renamed
 *   - 10 MB size cap — prevents memory exhaustion from huge uploads
 *   Cloudinary does its own virus scanning on their end.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadImage } from "@/lib/cloudinary";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  // Auth before anything else
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate MIME type against an allowlist
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP, and AVIF images are allowed" },
      { status: 415 }
    );
  }

  // Validate file size
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large — maximum 10 MB" },
      { status: 413 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadImage(buffer);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[upload] Cloudinary error:", err);
    return NextResponse.json({ error: "Upload failed — try again" }, { status: 500 });
  }
}
