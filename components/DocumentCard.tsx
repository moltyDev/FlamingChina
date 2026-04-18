import { ClassificationLevel, DocumentFormat } from "@/lib/types";

function badgeClass(level: ClassificationLevel): string {
  if (level === "Top Secret") {
    return "border-red-400/60 bg-red-950/60 text-red-100";
  }
  if (level === "Redacted") {
    return "border-orange-500/55 bg-orange-950/45 text-orange-100";
  }
  return "border-amber-500/40 bg-neutral-950/65 text-amber-100";
}

function formatLabel(format: DocumentFormat): string {
  if (format === "image") {
    return "Image Evidence";
  }
  if (format === "pdf") {
    return "PDF Dossier";
  }
  return "Text Brief";
}

export default function DocumentCard({
  id,
  title,
  date,
  classification,
  preview,
  format,
  isSimulation,
  revealed,
  onTogglePreview,
}: {
  id: string;
  title: string;
  date: string;
  classification: ClassificationLevel;
  preview: string;
  format: DocumentFormat;
  isSimulation: boolean;
  revealed: boolean;
  onTogglePreview: (id: string) => void;
}) {
  return (
    <article className="glass-card restricted-border rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="section-title text-2xl text-orange-100">{title}</h3>
          <p className="mt-1 text-xs uppercase tracking-[0.13em] text-orange-100/65">{date}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-orange-200/80">
            {formatLabel(format)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded border px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${badgeClass(classification)}`}>
            {classification}
          </span>
          {isSimulation ? (
            <span className="rounded border border-orange-400/35 bg-orange-900/20 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-orange-100/80">Internal</span>
          ) : null}
        </div>
      </div>
      <p className={`mt-4 text-sm text-orange-50/90 ${revealed ? "" : "preview-blur"}`}>{preview}</p>
      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onTogglePreview(id)}
          className="rounded border border-orange-500/40 bg-red-950/40 px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-orange-100 transition hover:border-orange-400"
        >
          {revealed ? "Mask Preview" : "Decrypt Preview"}
        </button>
        <a
          className="rounded border border-red-500/45 px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-red-100 transition hover:bg-red-950/60"
          href={`/dashboard/documents/${id}`}
        >
          Open File
        </a>
      </div>
    </article>
  );
}