export {};

declare global {
  interface PhantomProvider {
    isPhantom?: boolean;
    connect: () => Promise<{ publicKey: { toBase58: () => string } }>;
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
