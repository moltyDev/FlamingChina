import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

const DEFAULT_SOLANA_RPC = "https://api.mainnet-beta.solana.com";
const DEFAULT_PAYMENT_RECEIVER = "3XqcxjYy14VBtYdDZ4oyiEN6W8zKCxd6uej2WDPnRiBQ";
const RPC_FALLBACKS = [
  DEFAULT_SOLANA_RPC,
  "https://rpc.ankr.com/solana",
  "https://solana.public-rpc.com",
];
const ACCESS_WINDOW_SECONDS = 60 * 20;

function isRpcForbiddenError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("403") || message.includes("forbidden") || message.includes("access forbidden");
}

function getSolanaRpcCandidates(): string[] {
  const configured = process.env.FC_SOLANA_RPC_URL?.trim();
  const candidates = [configured, ...RPC_FALLBACKS].filter(
    (value): value is string => Boolean(value && value.trim().length > 0),
  );
  return Array.from(new Set(candidates));
}

export function getRequiredAccessPaymentSol(): number {
  const parsed = Number(process.env.FC_SOLANA_ACCESS_PRICE_SOL || "5");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 5;
  }
  return parsed;
}

function getHolderMintAddress(): string {
  const mint =
    process.env.FC_SOLANA_MINT_ADDRESS?.trim() ||
    process.env.NEXT_PUBLIC_FC_SOLANA_MINT_ADDRESS?.trim();
  if (!mint) {
    throw new Error(
      "Server is missing FC_SOLANA_MINT_ADDRESS (or NEXT_PUBLIC_FC_SOLANA_MINT_ADDRESS).",
    );
  }
  return mint;
}

function getRequiredHolderPercent(): number {
  const parsed = Number(process.env.FC_HOLDER_THRESHOLD_PERCENT || "1");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }
  return parsed;
}

export function getAccessPaymentReceiver(): string {
  const address =
    process.env.FC_SOLANA_PAYMENT_ADDRESS?.trim() ||
    process.env.NEXT_PUBLIC_FC_SOLANA_PAYMENT_ADDRESS?.trim() ||
    DEFAULT_PAYMENT_RECEIVER;
  try {
    return new PublicKey(address).toBase58();
  } catch {
    throw new Error("FC_SOLANA_PAYMENT_ADDRESS is not a valid Solana public key.");
  }
}

async function fetchSolanaTokenStats(params: {
  rpcUrl: string;
  walletAddress: string;
  mintAddress: string;
}): Promise<{ balance: number; totalSupply: number }> {
  const connection = new Connection(params.rpcUrl, "confirmed");
  const owner = new PublicKey(params.walletAddress);
  const mint = new PublicKey(params.mintAddress);
  const [parsedAccounts, tokenSupply] = await Promise.all([
    connection.getParsedTokenAccountsByOwner(owner, { mint }),
    connection.getTokenSupply(mint),
  ]);

  const balance = parsedAccounts.value.reduce((sum, accountInfo) => {
    const parsedAmount = accountInfo.account.data.parsed?.info?.tokenAmount?.uiAmount;
    return sum + (typeof parsedAmount === "number" ? parsedAmount : 0);
  }, 0);

  const supplyFromUiAmount = tokenSupply.value.uiAmount;
  const supplyFromString = Number(tokenSupply.value.uiAmountString);
  const totalSupply =
    typeof supplyFromUiAmount === "number"
      ? supplyFromUiAmount
      : Number.isFinite(supplyFromString)
        ? supplyFromString
        : 0;

  return {
    balance,
    totalSupply,
  };
}

function readAccountKeyBase58(input: unknown): string | null {
  if (typeof input === "string") {
    return input;
  }

  if (!input || typeof input !== "object") {
    return null;
  }

  const withPubkey = input as { pubkey?: unknown };
  if (typeof withPubkey.pubkey === "string") {
    return withPubkey.pubkey;
  }
  if (
    withPubkey.pubkey &&
    typeof withPubkey.pubkey === "object" &&
    "toBase58" in withPubkey.pubkey &&
    typeof (withPubkey.pubkey as { toBase58?: () => string }).toBase58 === "function"
  ) {
    return (withPubkey.pubkey as { toBase58: () => string }).toBase58();
  }

  if ("toBase58" in input && typeof (input as { toBase58?: () => string }).toBase58 === "function") {
    return (input as { toBase58: () => string }).toBase58();
  }

  return null;
}

function findMemoInstructionValue(parsedInstructions: unknown[]): string | null {
  for (const item of parsedInstructions) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const instruction = item as {
      program?: string;
      parsed?: unknown;
    };

    if (instruction.program !== "spl-memo") {
      continue;
    }

    if (typeof instruction.parsed === "string") {
      return instruction.parsed;
    }

    if (instruction.parsed && typeof instruction.parsed === "object") {
      const parsedObject = instruction.parsed as {
        memo?: unknown;
        info?: { memo?: unknown; data?: unknown };
      };

      if (typeof parsedObject.memo === "string") {
        return parsedObject.memo;
      }
      if (typeof parsedObject.info?.memo === "string") {
        return parsedObject.info.memo;
      }
      if (typeof parsedObject.info?.data === "string") {
        return parsedObject.info.data;
      }
    }
  }

  return null;
}

async function verifySolanaPaymentOnRpc(params: {
  rpcUrl: string;
  expectedMemo: string;
  receiverAddress: string;
  requiredLamports: number;
  notBeforeUnix: number;
}): Promise<{
  granted: boolean;
  pending: boolean;
  amountSol: number;
  blockTime: number | null;
  walletAddress?: string;
  txSignature?: string;
  message?: string;
}> {
  const connection = new Connection(params.rpcUrl, "confirmed");
  const signatures = await connection.getSignaturesForAddress(
    new PublicKey(params.receiverAddress),
    { limit: 80 },
    "confirmed",
  );

  if (signatures.length === 0) {
    return {
      granted: false,
      pending: true,
      amountSol: 0,
      blockTime: null,
      message: "Waiting for on-chain payment to arrive.",
    };
  }

  for (const signatureInfo of signatures) {
    if (signatureInfo.err) {
      continue;
    }

    if (signatureInfo.blockTime && signatureInfo.blockTime < params.notBeforeUnix - 60) {
      continue;
    }

    const transaction = await connection.getParsedTransaction(signatureInfo.signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!transaction?.meta) {
      continue;
    }

    const memoValue = findMemoInstructionValue(
      transaction.transaction.message.instructions as unknown[],
    );

    if (!memoValue || memoValue !== params.expectedMemo) {
      continue;
    }

    const accountKeysRaw = transaction.transaction.message.accountKeys as unknown[];
    const accountKeys = accountKeysRaw.map((key) => readAccountKeyBase58(key));
    const receiverIndex = accountKeys.findIndex((key) => key === params.receiverAddress);

    if (receiverIndex === -1) {
      return {
        granted: false,
        pending: false,
        amountSol: 0,
        blockTime: transaction.blockTime ?? null,
        message: "Payment was not sent to the configured unlock wallet.",
      };
    }

    let senderAddress: string | null = null;
    let parsedLamports = 0;

    for (const item of transaction.transaction.message.instructions as unknown[]) {
      if (!item || typeof item !== "object") {
        continue;
      }

      const instruction = item as {
        program?: string;
        parsed?: { type?: string; info?: { destination?: unknown; source?: unknown; lamports?: unknown } };
      };

      if (instruction.program !== "system" || !instruction.parsed) {
        continue;
      }

      const destination = instruction.parsed.info?.destination;
      const source = instruction.parsed.info?.source;
      const lamportsRaw = instruction.parsed.info?.lamports;
      const lamportsParsed =
        typeof lamportsRaw === "number" ? lamportsRaw : Number(lamportsRaw);

      if (
        instruction.parsed.type === "transfer" &&
        destination === params.receiverAddress &&
        Number.isFinite(lamportsParsed)
      ) {
        parsedLamports = Math.max(parsedLamports, lamportsParsed);
        if (typeof source === "string") {
          senderAddress = source;
        }
      }
    }

    const receiverPre = transaction.meta.preBalances[receiverIndex] ?? 0;
    const receiverPost = transaction.meta.postBalances[receiverIndex] ?? 0;
    const deltaLamports = receiverPost - receiverPre;
    const receivedLamports = Math.max(parsedLamports, deltaLamports);

    if (receivedLamports < params.requiredLamports) {
      return {
        granted: false,
        pending: false,
        amountSol: receivedLamports / LAMPORTS_PER_SOL,
        blockTime: transaction.blockTime ?? null,
        txSignature: signatureInfo.signature,
        message: "Payment amount is below the required SOL threshold.",
      };
    }

    if (!senderAddress) {
      senderAddress = accountKeys.find((key) => Boolean(key)) || null;
    }

    if (!senderAddress) {
      return {
        granted: false,
        pending: false,
        amountSol: receivedLamports / LAMPORTS_PER_SOL,
        blockTime: transaction.blockTime ?? null,
        txSignature: signatureInfo.signature,
        message: "Unable to identify sender wallet for this payment.",
      };
    }

    if (transaction.blockTime) {
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (nowSeconds - transaction.blockTime > ACCESS_WINDOW_SECONDS) {
        return {
          granted: false,
          pending: false,
          amountSol: receivedLamports / LAMPORTS_PER_SOL,
          blockTime: transaction.blockTime,
          walletAddress: senderAddress,
          txSignature: signatureInfo.signature,
          message: "Payment is too old for a new session. Submit a fresh transfer.",
        };
      }
    }

    return {
      granted: true,
      pending: false,
      amountSol: receivedLamports / LAMPORTS_PER_SOL,
      blockTime: transaction.blockTime ?? null,
      walletAddress: senderAddress,
      txSignature: signatureInfo.signature,
    };
  }

  return {
    granted: false,
    pending: true,
    amountSol: 0,
    blockTime: null,
    message: "Payment not detected yet. Keep this page open.",
  };
}

export async function verifySolanaAccessPayment(params: {
  expectedMemo: string;
  notBeforeUnix: number;
}) {
  const receiverAddress = getAccessPaymentReceiver();
  const requiredSol = getRequiredAccessPaymentSol();
  const requiredLamports = Math.max(1, Math.ceil(requiredSol * LAMPORTS_PER_SOL));
  const rpcCandidates = getSolanaRpcCandidates();
  let lastError: unknown = null;

  for (const rpcUrl of rpcCandidates) {
    try {
      const result = await verifySolanaPaymentOnRpc({
        rpcUrl,
        expectedMemo: params.expectedMemo,
        receiverAddress,
        requiredLamports,
        notBeforeUnix: params.notBeforeUnix,
      });

      return {
        ...result,
        receiverAddress,
        requiredSol,
      };
    } catch (error) {
      lastError = error;
      if (isRpcForbiddenError(error)) {
        continue;
      }
      if (rpcUrl !== rpcCandidates[rpcCandidates.length - 1]) {
        continue;
      }
    }
  }

  if (isRpcForbiddenError(lastError)) {
    throw new Error(
      "Solana RPC access forbidden. Update FC_SOLANA_RPC_URL with a valid key/allowlist.",
    );
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to validate Solana payment transaction.");
}

export async function verifySolanaHolderAccess(params: { walletAddress: string }) {
  const mintAddress = getHolderMintAddress();
  const requiredPercent = getRequiredHolderPercent();
  const rpcCandidates = getSolanaRpcCandidates();
  let lastError: unknown = null;

  for (const rpcUrl of rpcCandidates) {
    try {
      const stats = await fetchSolanaTokenStats({
        rpcUrl,
        walletAddress: params.walletAddress,
        mintAddress,
      });

      const threshold = (stats.totalSupply * requiredPercent) / 100;

      return {
        granted: stats.balance >= threshold,
        balance: stats.balance,
        threshold,
        totalSupply: stats.totalSupply,
        requiredPercent,
      };
    } catch (error) {
      lastError = error;
      if (isRpcForbiddenError(error)) {
        continue;
      }
      if (rpcUrl !== rpcCandidates[rpcCandidates.length - 1]) {
        continue;
      }
    }
  }

  if (isRpcForbiddenError(lastError)) {
    throw new Error(
      "Solana RPC access forbidden. Update FC_SOLANA_RPC_URL with a valid key/allowlist.",
    );
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to verify on-chain holder balance.");
}
