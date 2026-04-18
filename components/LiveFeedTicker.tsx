const FEED_ITEMS = [
  "0x8d11...6Ae1 granted clearance",
  "4GfPj...mSxK unlocked Scarlet Archive",
  "0x13B2...Cfa0 entered Top Secret vault",
  "AjfN4...8Pz2 verified $FC threshold",
  "0x09fE...91D7 decrypted Obsidian Cable",
  "3EmzA...vL21 acquired classified briefing",
];

export default function LiveFeedTicker() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 overflow-hidden border-t border-orange-600/35 bg-black/80 py-2 text-xs uppercase tracking-[0.18em] text-orange-100/80 backdrop-blur-md">
      <div className="live-ticker-track">
        {[...FEED_ITEMS, ...FEED_ITEMS].map((entry, idx) => (
          <span key={`${entry}-${idx}`} className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500/90 shadow-[0_0_12px_rgba(255,100,0,0.75)]" />
            {entry}
          </span>
        ))}
      </div>
    </div>
  );
}
