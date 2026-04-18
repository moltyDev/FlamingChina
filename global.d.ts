export {};

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: { toBase58: () => string } }>;
      signMessage?: (
        message: Uint8Array,
        display?: "hex" | "utf8",
      ) => Promise<{ signature: Uint8Array } | Uint8Array>;
    };
    phantom?: {
      solana?: {
        isPhantom?: boolean;
        connect: () => Promise<{ publicKey: { toBase58: () => string } }>;
        signMessage?: (
          message: Uint8Array,
          display?: "hex" | "utf8",
        ) => Promise<{ signature: Uint8Array } | Uint8Array>;
      };
    };
    webkitAudioContext?: typeof AudioContext;
  }
}