"use client";

import { Connection, PublicKey } from "@solana/web3.js";

const DEFAULT_SOLANA_RPC = "https://api.mainnet-beta.solana.com";

function getPhantomProvider() {
  const provider = window.phantom?.solana || window.solana;
  if (!provider?.isPhantom) {
    throw new Error("Phantom wallet was not detected in this browser.");
  }
  return provider;
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

function getClientRpcCandidates(): string[] {
  const primary = process.env.NEXT_PUBLIC_FC_SOLANA_RPC_URL?.trim();
  if (!primary || primary === DEFAULT_SOLANA_RPC) {
    return [DEFAULT_SOLANA_RPC];
  }
  return [primary, DEFAULT_SOLANA_RPC];
}

async function getSolanaBalance(walletAddress: string): Promise<number> {
  const mintAddress = process.env.NEXT_PUBLIC_FC_SOLANA_MINT_ADDRESS;

  if (!mintAddress) {
    return 0;
  }

  const owner = new PublicKey(walletAddress);
  const mint = new PublicKey(mintAddress);

  let lastError: unknown = null;

  for (const rpcUrl of getClientRpcCandidates()) {
    try {
      const connection = new Connection(rpcUrl, "confirmed");
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(owner, { mint });

      return tokenAccounts.value.reduce((sum, account) => {
        const parsed = account.account.data.parsed?.info?.tokenAmount?.uiAmount;
        return sum + (typeof parsed === "number" ? parsed : 0);
      }, 0);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to retrieve client-side Solana balance estimate.");
}

export async function connectWalletAndReadBalance(): Promise<{
  address: string;
  balance: number | null;
  balanceWarning?: string;
}> {
  const address = await connectSolana();

  try {
    const balance = await getSolanaBalance(address);
    return { address, balance };
  } catch {
    // This estimate is only UX. Access gating is still enforced server-side.
    return {
      address,
      balance: null,
      balanceWarning:
        "Client-side balance estimate unavailable (RPC policy/restriction). Server verification will still run.",
    };
  }
}

export async function signWalletChallenge(message: string): Promise<string> {
  return signSolanaChallenge(message);
}