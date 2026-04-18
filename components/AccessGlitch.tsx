export default function AccessGlitch({
  title = "Access Denied",
  detail = "Clearance requirements not met for classified access.",
}: {
  title?: string;
  detail?: string;
}) {
  return (
    <div className="mt-5 rounded-lg border border-red-500/45 bg-red-950/30 p-4 text-center">
      <p className="glitch-text section-title text-3xl" data-text={title}>
        {title}
      </p>
      <p className="mt-2 text-sm uppercase tracking-[0.14em] text-red-200/80">{detail}</p>
    </div>
  );
}
