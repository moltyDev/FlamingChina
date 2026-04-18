import { NextRequest, NextResponse } from "next/server";
import { getSessionCookieName, verifySessionToken } from "@/lib/auth";
import { LEAK_DOCUMENTS } from "@/lib/documents";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(getSessionCookieName())?.value;
  const session = await verifySessionToken(token);

  if (!session || session.role !== "paid") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = LEAK_DOCUMENTS.map((doc) => ({
    id: doc.id,
    title: doc.title,
    date: doc.date,
    classification: doc.classification,
    preview: doc.preview,
    format: doc.format || "markdown",
    isSimulation: Boolean(doc.isSimulation),
  }));

  return NextResponse.json({ documents: payload });
}
