interface VerifyResponse {
  granted: boolean;
  balance: number;
  threshold: number;
  requiredPercent?: number;
  totalSupply?: number;
  message?: string;
}

interface ChallengeResponse {
  nonce: string;
  message: string;
}

export async function requestVerificationChallenge(
  walletAddress: string,
): Promise<ChallengeResponse> {
  const response = await fetch("/api/auth/nonce", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chain: "solana", walletAddress }),
  });

  const data = (await response.json()) as ChallengeResponse & { message?: string };

  if (!response.ok || !data.nonce || !data.message) {
    throw new Error(data.message || "Failed to prepare signature challenge.");
  }

  return {
    nonce: data.nonce,
    message: data.message,
  };
}

export async function submitVerification(params: {
  walletAddress: string;
  nonce: string;
  signature: string;
}): Promise<VerifyResponse> {
  const response = await fetch("/api/auth/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...params, chain: "solana" }),
  });

  const data = (await response.json()) as VerifyResponse;

  if (!response.ok) {
    return {
      granted: false,
      balance: data.balance || 0,
      threshold:
        data.threshold || Number(process.env.NEXT_PUBLIC_FC_TOKEN_THRESHOLD || "1000"),
      message: data.message || "ACCESS DENIED",
    };
  }

  return data;
}
