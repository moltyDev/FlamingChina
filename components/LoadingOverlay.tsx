"use client";

export default function LoadingOverlay({ active, label }: { active: boolean; label: string }) {
  if (!active) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/85 backdrop-blur-sm">
      <div className="glass-card restricted-border rounded-xl px-8 py-6 text-center">
        <p className="section-title animate-pulse text-3xl text-orange-200">{label}</p>
        <div className="mt-4 h-1.5 w-56 overflow-hidden rounded-full bg-red-950/70">
          <div className="h-full w-1/2 animate-[pulse_1.2s_ease-in-out_infinite] bg-gradient-to-r from-red-700 via-orange-400 to-red-700" />
        </div>
      </div>
    </div>
  );
}
