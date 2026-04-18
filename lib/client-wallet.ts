"use client";

import { Connection, PublicKey } from "@solana/web3.js";

const DEFAULT_SOLANA_RPC = "https://api.mainnet-beta.solana.com";
const RPC_FALLBACKS = [
  DEFAULT_SOLANA_RPC,
  "https://rpc.ankr.com/solana",
  "https://solana.public-rpc.com",
];

function getPhantomProvider() {
  const provider = window.phantom?.solana || window.solana;
  if (!provider?.isPhantom) {
    throw new Error("Phantom wallet was not detected in this browser.");
  }
  return provider;
}

function getClientRpcCandidates(): string[] {
  const primary = process.env.NEXT_PUBLIC_FC_SOLANA_RPC_URL?.trim();
  const candidates = [primary, ...RPC_FALLBACKS].filter(
    (value): value is string => Boolean(value && value.trim().length > 0),
  );
  return Array.from(new Set(candidates));
}

async function connectSolana(): Promise<string> {
  const provider = getPhantomProvider();
  const result = await provider.connect();
  return result.publicKey.toBase58();
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

async function signSolanaChallenge(message: string): Promise<string> {
  const provider = getPhantomProvider();

  if (!provider.signMessage) {
    throw new Error("Phantom signMessage is unavailable.");
  }

  const encoded = new TextEncoder().encode(message);
  const result = await provider.signMessage(encoded, "utf8");
  const signatureBytes = result instanceof Uint8Array ? result : result.signature;

  if (!signatureBytes) {
    throw new Error("Phantom did not return a signature.");
  }

  return bytesToBase64(signatureBytes);
}

async function getSolanaConnection(): Promise<Connection> {
  let lastError: unknown = null;

  for (const rpcUrl of getClientRpcCandidates()) {
    try {
      const connection = new Connection(rpcUrl, "confirmed");
      await connection.getLatestBlockhash("confirmed");
      return connection;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to connect to configured Solana RPC endpoint.");
}

async function readHolderTokenBalance(walletAddress: string): Promise<number> {
  const mintAddress = process.env.NEXT_PUBLIC_FC_SOLANA_MINT_ADDRESS;
  if (!mintAddress) {
    return 0;
  }

  const connection = await getSolanaConnection();
  const owner = new PublicKey(walletAddress);
  const mint = new PublicKey(mintAddress);
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(owner, { mint });

  return tokenAccounts.value.reduce((sum, account) => {
    const parsed = account.account.data.parsed?.info?.tokenAmount?.uiAmount;
    return sum + (typeof parsed === "number" ? parsed : 0);
  }, 0);
}

export async function connectWalletAndReadHolderBalance(): Promise<{
  address: string;
  balance: number | null;
  balanceWarning?: string;
}> {
  const address = await connectSolana();

  try {
    const balance = await readHolderTokenBalance(address);
    return { address, balance };
  } catch {
    return {
      address,
      balance: null,
      balanceWarning:
        "Client-side holder estimate unavailable (RPC policy/restriction). Server verification will still run.",
    };
  }
}

export async function signWalletChallenge(message: string): Promise<string> {
  return signSolanaChallenge(message);
}
