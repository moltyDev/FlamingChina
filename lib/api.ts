import { UnlockMethod } from "@/lib/unlock-config";

interface BaseVerifyResponse {
  granted: boolean;
  pending?: boolean;
  message?: string;
  method?: UnlockMethod;
}

export interface HolderChallengeResponse {
  method: "holder";
  nonce: string;
  message: string;
}

export interface PaymentChallengeResponse {
  method: "payment";
  nonce: string;
  memo: string;
  requiredSol: number;
  receiverAddress: string;
}

export interface HolderVerifyResponse extends BaseVerifyResponse {
  method: "holder";
  balance: number;
  threshold: number;
  totalSupply: number;
  requiredPercent: number;
}

export interface PaymentVerifyResponse extends BaseVerifyResponse {
  method: "payment";
  amountPaidSol: number;
  requiredSol: number;
  receiverAddress?: string;
  memo?: string;
  txSignature?: string;
}

export async function requestHolderChallenge(
  walletAddress: string,
): Promise<HolderChallengeResponse> {
  const response = await fetch("/api/auth/nonce", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ method: "holder", chain: "solana", walletAddress }),
  });

  const data = (await response.json()) as HolderChallengeResponse & { message?: string };

  if (!response.ok || data.method !== "holder" || !data.nonce || !data.message) {
    throw new Error(data.message || "Failed to prepare holder challenge.");
  }

  return data;
}

export async function requestPaymentIntent(): Promise<PaymentChallengeResponse> {
  const response = await fetch("/api/auth/nonce", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ method: "payment", chain: "solana" }),
  });

  const data = (await response.json()) as PaymentChallengeResponse & { message?: string };

  if (
    !response.ok ||
    data.method !== "payment" ||
    !data.nonce ||
    !data.memo ||
    !data.receiverAddress
  ) {
    throw new Error(data.message || "Failed to prepare payment intent.");
  }

  return data;
}

export async function submitHolderVerification(params: {
  walletAddress: string;
  nonce: string;
  signature: string;
}): Promise<HolderVerifyResponse> {
  const response = await fetch("/api/auth/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...params, method: "holder", chain: "solana" }),
  });

  const data = (await response.json()) as Partial<HolderVerifyResponse>;

  if (!response.ok) {
    return {
      granted: false,
      method: "holder",
      balance: Number(data.balance || 0),
      threshold: Number(data.threshold || 0),
      totalSupply: Number(data.totalSupply || 0),
      requiredPercent: Number(data.requiredPercent || 1),
      message: data.message || "ACCESS DENIED",
    };
  }

  return data as HolderVerifyResponse;
}

export async function submitPaymentVerification(params: {
  nonce: string;
}): Promise<PaymentVerifyResponse> {
  const response = await fetch("/api/auth/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...params, method: "payment", chain: "solana" }),
  });

  const data = (await response.json()) as Partial<PaymentVerifyResponse>;

  if (!response.ok && response.status !== 202) {
    return {
      granted: false,
      pending: data.pending,
      method: "payment",
      amountPaidSol: Number(data.amountPaidSol || 0),
      requiredSol:
        Number(data.requiredSol) ||
        Number(process.env.NEXT_PUBLIC_FC_ACCESS_PRICE_SOL || "5"),
      receiverAddress: data.receiverAddress,
      memo: data.memo,
      txSignature: data.txSignature,
      message: data.message || "ACCESS DENIED",
    };
  }

  return data as PaymentVerifyResponse;
}
