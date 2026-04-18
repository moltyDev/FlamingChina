"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DocumentCard from "@/components/DocumentCard";
import { ClassificationLevel, DocumentFormat } from "@/lib/types";

interface DashboardDocument {
  id: string;
  title: string;
  date: string;
  classification: ClassificationLevel;
  preview: string;
  format: DocumentFormat;
  isSimulation: boolean;
}

export default function DashboardClient() {
  const router = useRouter();
  const [docs, setDocs] = useState<DashboardDocument[]>([]);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocs = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/documents", { cache: "no-store" });
        const data = (await response.json()) as {
          documents?: DashboardDocument[];
          message?: string;
        };

        if (!response.ok || !data.documents) {
          throw new Error(data.message || "Unable to load documents.");
        }

        setDocs(data.documents);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Document retrieval failed.");
      } finally {
        setLoading(false);
      }
    };

    void fetchDocs();
  }, []);

  const togglePreview = (id: string) => {
    setRevealed((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/unlock");
  };

  if (loading) {
    return (
      <p className="animate-pulse text-sm uppercase tracking-[0.13em] text-orange-100/80">
        Syncing classified archive...
      </p>
    );
  }

  if (error) {
    return (
      <div className="rounded border border-red-500/45 bg-red-950/30 p-4 text-sm text-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={logout}
          className="rounded border border-red-500/45 bg-black/40 px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-red-100 transition hover:bg-red-950/70"
        >
          End Session
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {docs.map((doc) => (
          <DocumentCard
            key={doc.id}
            id={doc.id}
            title={doc.title}
            date={doc.date}
            classification={doc.classification}
            preview={doc.preview}
            format={doc.format}
            isSimulation={doc.isSimulation}
            revealed={Boolean(revealed[doc.id])}
            onTogglePreview={togglePreview}
          />
        ))}
      </div>
    </div>
  );
}
