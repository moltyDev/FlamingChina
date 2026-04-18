import { Connection, PublicKey } from "@solana/web3.js";
import { Contract, JsonRpcProvider, formatUnits, isAddress } from "ethers";
import { ChainKind } from "@/lib/types";

const DEFAULT_SOLANA_RPC = "https://api.mainnet-beta.solana.com";

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
];

function getThreshold(): number {
  const parsed = Number(process.env.FC_TOKEN_THRESHOLD || "1000");
  return Number.isFinite(parsed) ? parsed : 1000;
}

function isRpcForbiddenError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("403") || message.includes("forbidden") || message.includes("access forbidden");
}

async function getEthereumTokenBalance(walletAddress: string): Promise<number> {
  const rpcUrl = process.env.FC_ETHEREUM_RPC_URL;
  const tokenAddress = process.env.FC_ETHEREUM_TOKEN_ADDRESS;

  if (!rpcUrl || !tokenAddress) {
    throw new Error("Ethereum verification is not configured.");
  }

  if (!isAddress(walletAddress)) {
    throw new Error("Invalid EVM wallet address.");
  }

  const provider = new JsonRpcProvider(rpcUrl);
  const contract = new Contract(tokenAddress, ERC20_ABI, provider);
  const [rawBalance, decimals] = await Promise.all([
    contract.balanceOf(walletAddress),
    contract.decimals(),
  ]);

  return Number(formatUnits(rawBalance, Number(decimals)));
}

function getSolanaRpcCandidates(): string[] {
  const configured = process.env.FC_SOLANA_RPC_URL?.trim();

  if (!configured || configured === DEFAULT_SOLANA_RPC) {
    return [DEFAULT_SOLANA_RPC];
  }

  return [configured, DEFAULT_SOLANA_RPC];
}

async function fetchBalanceFromSolanaRpc(params: {
  rpcUrl: string;
  walletAddress: string;
  mintAddress: string;
}): Promise<{ balance: number; totalSupply: number }> {
  let owner: PublicKey;
  let mint: PublicKey;

  try {
    owner = new PublicKey(params.walletAddress);
    mint = new PublicKey(params.mintAddress);
  } catch {
    throw new Error("Invalid Solana wallet or mint address.");
  }

  const connection = new Connection(params.rpcUrl, "confirmed");
  const [parsedAccounts, tokenSupply] = await Promise.all([
    connection.getParsedTokenAccountsByOwner(owner, { mint }),
    connection.getTokenSupply(mint),
  ]);

  const balance = parsedAccounts.value.reduce((sum, accountInfo) => {
    const parsed = accountInfo.account.data.parsed?.info?.tokenAmount?.uiAmount;
    return sum + (typeof parsed === "number" ? parsed : 0);
  }, 0);

  const supplyFromUiAmount = tokenSupply.value.uiAmount;
  const supplyFromString = Number(tokenSupply.value.uiAmountString);
  const totalSupply =
    typeof supplyFromUiAmount === "number"
      ? supplyFromUiAmount
      : Number.isFinite(supplyFromString)
        ? supplyFromString
        : 0;

  return { balance, totalSupply };
}

async function getSolanaTokenStats(walletAddress: string): Promise<{
  balance: number;
  totalSupply: number;
}> {
  const mintAddress = process.env.FC_SOLANA_MINT_ADDRESS;

  if (!mintAddress) {
    throw new Error("Solana verification is not configured: missing FC_SOLANA_MINT_ADDRESS.");
  }

  const candidates = getSolanaRpcCandidates();
  let lastError: unknown = null;

  for (const rpcUrl of candidates) {
    try {
      return await fetchBalanceFromSolanaRpc({
        rpcUrl,
        walletAddress,
        mintAddress,
      });
    } catch (error) {
      lastError = error;

      // Continue to fallback RPC when provider forbids access.
      if (isRpcForbiddenError(error)) {
        continue;
      }

      if (rpcUrl !== candidates[candidates.length - 1]) {
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
    : new Error("Unable to verify Solana token balance.");
}

export async function verifyTokenBalance(chain: ChainKind, walletAddress: string) {
  // Security note:
  // We ALWAYS compute token balance and supply on the backend from chain RPC calls.
  // The client-side balance display is purely UX and is never trusted for access control.
  if (chain === "solana") {
    const { balance, totalSupply } = await getSolanaTokenStats(walletAddress);
    const thresholdFromSupply = totalSupply * 0.01;
    const threshold =
      Number.isFinite(thresholdFromSupply) && thresholdFromSupply > 0
        ? thresholdFromSupply
        : getThreshold();

    return {
      balance,
      threshold,
      totalSupply,
      requiredPercent: 1,
      granted: balance >= threshold,
    };
  }

  const balance = await getEthereumTokenBalance(walletAddress);
  const threshold = getThreshold();

  return {
    balance,
    threshold,
    totalSupply: 0,
    requiredPercent: 1,
    granted: balance >= threshold,
  };
}
