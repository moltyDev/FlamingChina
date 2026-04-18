import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import ClassifiedViewer from "@/components/ClassifiedViewer";
import { getSessionCookieName, verifySessionToken } from "@/lib/auth";
import { getDocumentById } from "@/lib/documents";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function DocumentPage({ params }: PageProps) {
  const token = cookies().get(getSessionCookieName())?.value;
  const session = await verifySessionToken(token);

  if (!session || (session.role !== "paid" && session.role !== "holder")) {
    redirect("/unlock");
  }

  const doc = getDocumentById(params.id);

  if (!doc) {
    notFound();
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-title text-sm text-orange-200/75">Document Viewer</p>
          <h1 className="section-title text-4xl text-orange-100">{doc.title}</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-orange-100/70">{doc.date}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard"
            className="rounded border border-orange-500/40 bg-black/40 px-3 py-2 text-xs uppercase tracking-[0.12em] text-orange-100"
          >
            Back to Vault
          </Link>
          <a
            href={`/api/documents/${doc.id}?download=1`}
            className="rounded border border-red-500/45 bg-red-950/40 px-3 py-2 text-xs uppercase tracking-[0.12em] text-red-100"
          >
            Download Copy
          </a>
        </div>
      </div>

      <ClassifiedViewer doc={doc} />
    </div>
  );
}

