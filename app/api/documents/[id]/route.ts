import { NextRequest, NextResponse } from "next/server";
import { getSessionCookieName, verifySessionToken } from "@/lib/auth";
import { getDocumentById } from "@/lib/documents";

interface RouteContext {
  params: {
    id: string;
  };
}

function escapePdfText(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildSimplePdf(content: string): Buffer {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 28);

  const pdfText = lines.length > 0 ? lines : ["Archive document", "No additional lines"];

  const streamCommands: string[] = ["BT", "/F1 12 Tf", "72 740 Td"];
  pdfText.forEach((line, index) => {
    if (index > 0) {
      streamCommands.push("0 -18 Td");
    }
    streamCommands.push(`(${escapePdfText(line)}) Tj`);
  });
  streamCommands.push("ET");

  const stream = streamCommands.join("\n");

  const objects = [
    "",
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (let index = 1; index <= 5; index += 1) {
    offsets[index] = Buffer.byteLength(pdf, "utf8");
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += "xref\n0 6\n0000000000 65535 f \n";

  for (let index = 1; index <= 5; index += 1) {
    pdf += `${offsets[index].toString().padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

export async function GET(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get(getSessionCookieName())?.value;
  const session = await verifySessionToken(token);

  if (!session || session.role !== "holder") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const doc = getDocumentById(context.params.id);

  if (!doc) {
    return NextResponse.json({ message: "Document not found" }, { status: 404 });
  }

  const shouldDownload = request.nextUrl.searchParams.get("download") === "1";

  if (shouldDownload) {
    if (doc.format === "pdf") {
      const buffer = buildSimplePdf(doc.content);
      const bytes = new Uint8Array(buffer);
      return new NextResponse(bytes, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${doc.downloadFileName || `${doc.id}.pdf`}"`,
        },
      });
    }

    const fileName = doc.downloadFileName || `${doc.id}.md`;
    const contentType = doc.format === "markdown" ? "text/markdown; charset=utf-8" : "text/plain; charset=utf-8";

    return new NextResponse(doc.content, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  }

  return NextResponse.json({ document: doc });
}
