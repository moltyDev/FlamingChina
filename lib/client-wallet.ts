"use client";

import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { Buffer } from "buffer";

const DEFAULT_SOLANA_RPC = "https://api.mainnet-beta.solana.com";
const RPC_FALLBACKS = [
  DEFAULT_SOLANA_RPC,
  "https://rpc.ankr.com/solana",
  "https://solana.public-rpc.com",
];
const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

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

export async function connectPhantomWallet(): Promise<string> {
  return connectSolana();
}

export async function sendSolAccessPayment(params: {
  walletAddress: string;
  receiverAddress: string;
  requiredSol: number;
  memo: string;
}): Promise<{ txSignature: string; walletAddress: string }> {
  const provider = getPhantomProvider();
  const activeAddress = await connectSolana();

  if (activeAddress !== params.walletAddress) {
    throw new Error("Connected wallet changed. Reconnect and try payment again.");
  }

  const connection = await getSolanaConnection();
  const senderPubkey = new PublicKey(activeAddress);
  const receiverPubkey = new PublicKey(params.receiverAddress);
  const lamports = Math.max(1, Math.ceil(params.requiredSol * LAMPORTS_PER_SOL));

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: senderPubkey,
      toPubkey: receiverPubkey,
      lamports,
    }),
    new TransactionInstruction({
      keys: [],
      programId: new PublicKey(MEMO_PROGRAM_ID),
      data: Buffer.from(params.memo, "utf8"),
    }),
  );

  transaction.feePayer = senderPubkey;
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = latestBlockhash.blockhash;

  const sent = await provider.signAndSendTransaction(transaction);
  const txSignature = typeof sent === "string" ? sent : sent.signature;

  if (!txSignature) {
    throw new Error("Phantom did not return a transaction signature.");
  }

  await connection.confirmTransaction(
    {
      signature: txSignature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    },
    "confirmed",
  );

  return {
    txSignature,
    walletAddress: activeAddress,
  };
}
