import Link from "next/link";

const LEAK_PREVIEWS = [
  {
    title: "Obsidian Cable 019",
    detail: "Intercept traces indicate synchronized market pressure across mirrored entities.",
  },
  {
    title: "Vault 777 Extract",
    detail: "Historic intelligence budget routes appear alive under modern treasury wrappers.",
  },
  {
    title: "Emberline Ledger",
    detail: "Supply records show compartmentalized signatures and timed asset rotations.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-12 pb-10">
      <section className="inferno-hero rounded-3xl">
        <div className="inferno-hero-media" />
        <div className="inferno-hero-overlay" />
        <div className="inferno-hero-content p-7 sm:p-12">
          <div className="inferno-emblem">Flaming China Directorate</div>
          <p className="section-title mt-6 text-sm tracking-[0.2em] text-orange-200/80">
            Restricted Flame Division
          </p>
          <h1 className="inferno-title mt-3 text-5xl sm:text-7xl lg:text-8xl">
            Access Restricted Intelligence
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-orange-50/90 sm:text-base">
            Only verified $FC holders can unlock classified files.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="section-title inline-block rounded border border-orange-400/65 bg-gradient-to-r from-red-950/80 via-orange-900/80 to-red-900/80 px-5 py-3 text-lg tracking-[0.12em] text-orange-50 transition hover:shadow-[0_0_28px_rgba(255,102,20,0.5)]"
              href="/verify"
            >
              Verify Wallet
            </Link>
            <a
              className="section-title inline-block rounded border border-orange-500/40 bg-black/45 px-5 py-3 text-lg tracking-[0.12em] text-orange-100/90"
              href="#recent-leaks"
            >
              Inspect Leaks
            </a>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <article className="glass-card rounded-xl p-6">
          <h2 className="section-title text-3xl text-orange-100">What Is This?</h2>
          <p className="mt-3 text-sm leading-relaxed text-orange-100/85">
            The Flaming China Intelligence Portal is an encrypted leak index where sensitive files are mirrored to
            token-gated vaults. Every unlock is logged. Every record carries controlled burn markers.
          </p>
        </article>
        <article className="glass-card rounded-xl p-6">
          <h2 className="section-title text-3xl text-orange-100">How To Access</h2>
          <ol className="mt-3 space-y-2 text-sm uppercase tracking-[0.12em] text-orange-100/85">
            <li>1. Connect your Phantom wallet (Solana only).</li>
            <li>2. Sign the challenge prompt to prove wallet ownership.</li>
            <li>3. Hold about 1% of token supply to unlock classified vault access.</li>
          </ol>
        </article>
      </section>

      <section id="recent-leaks" className="glass-card rounded-xl p-6">
        <h2 className="section-title text-3xl text-orange-100">Recent Leaks</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {LEAK_PREVIEWS.map((item) => (
            <article key={item.title} className="restricted-border rounded-lg bg-black/40 p-4">
              <p className="section-title text-xl text-orange-100">{item.title}</p>
              <p className="preview-blur mt-2 text-sm text-orange-50/85">{item.detail}</p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-red-200">Verification required</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
