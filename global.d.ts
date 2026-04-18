export {};

declare global {
  interface PhantomProvider {
    isPhantom?: boolean;
    connect: () => Promise<{ publicKey: { toBase58: () => string } }>;
    signMessage?: (
      message: Uint8Array,
      display?: "hex" | "utf8",
    ) => Promise<{ signature: Uint8Array } | Uint8Array>;
    signAndSendTransaction: (
      transaction: unknown,
    ) => Promise<{ signature: string } | string>;
  }

  interface Window {
    solana?: PhantomProvider;
    phantom?: {
      solana?: PhantomProvider;
    };
    webkitAudioContext?: typeof AudioContext;
  }
}
