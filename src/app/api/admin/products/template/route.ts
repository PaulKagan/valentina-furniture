/**
 * GET /api/admin/products/template — download the empty Excel template
 * (example row + instructions sheet) for bulk product import.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildTemplate } from "@/lib/excel";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const buffer = buildTemplate();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="valentina-products-template.xlsx"',
    },
  });
}
