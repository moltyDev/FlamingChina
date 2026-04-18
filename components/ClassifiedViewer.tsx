import { LeakDocument } from "@/lib/types";

function renderLine(line: string, idx: number) {
  const withRedactions = line.split("[[REDACTED]]");

  if (withRedactions.length === 1) {
    return <p key={idx}>{line}</p>;
  }

  return (
    <p key={idx}>
      {withRedactions.map((part, partIndex) => (
        <span key={`${idx}-${partIndex}`}>
          {part}
          {partIndex < withRedactions.length - 1 ? <span className="redacted">CLASSIFIED</span> : null}
        </span>
      ))}
    </p>
  );
}

export default function ClassifiedViewer({ doc }: { doc: LeakDocument }) {
  const lines = doc.content.split("\n");

  return (
    <section className="glass-card restricted-border subtle-scroll relative overflow-hidden rounded-2xl p-6 sm:p-8">
      <div className="absolute right-4 top-4 classified-stamp">Classified</div>
      <div className="absolute left-4 top-4 classified-stamp">Leak Copy</div>

      {doc.isSimulation ? (
        <div className="mt-6 rounded border border-orange-500/35 bg-orange-900/20 px-3 py-2 text-xs uppercase tracking-[0.12em] text-orange-100/85">
          Internal archive record with masked entities.
        </div>
      ) : null}

      <div className="mt-6 doc-view space-y-3 text-orange-50/90">{lines.map(renderLine)}</div>

      {doc.format === "pdf" && doc.assetPath ? (
        <div className="mt-8 space-y-3">
          <p className="section-title text-lg text-orange-100">PDF Preview</p>
          <div className="overflow-hidden rounded-lg border border-orange-500/35 bg-black/35">
            <iframe
              src={doc.assetPath}
              title={doc.title}
              className="h-[680px] w-full"
            />
          </div>
        </div>
      ) : null}

      {doc.media && doc.media.length > 0 ? (
        <div className="mt-8 space-y-4">
          <p className="section-title text-lg text-orange-100">Evidence Media</p>
          <div className="grid gap-4 md:grid-cols-2">
            {doc.media.map((item) => (
              <figure key={item.path} className="rounded-lg border border-orange-500/35 bg-black/35 p-3">
                <img
                  src={item.path}
                  alt={item.caption}
                  className="h-auto w-full rounded border border-orange-500/25"
                />
                <figcaption className="mt-2 text-xs uppercase tracking-[0.12em] text-orange-100/75">
                  {item.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
