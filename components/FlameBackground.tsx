export default function FlameBackground() {
  const embers = Array.from({ length: 28 }, (_, index) => index);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,76,12,0.24),transparent_54%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_100%,rgba(194,26,6,0.3),transparent_48%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_0%,rgba(255,108,34,0.2),transparent_34%)]" />
      {embers.map((index) => {
        const left = `${(index * 6.6) % 100}%`;
        const delay = `${(index * 0.58) % 7}s`;
        const duration = `${4.8 + (index % 7)}s`;

        return (
          <span
            key={index}
            className="ember-dot"
            style={{ left, bottom: "-10px", animationDelay: delay, ["--duration" as string]: duration }}
          />
        );
      })}
    </div>
  );
}