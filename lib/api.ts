interface VerifyResponse {
  granted: boolean;
  pending?: boolean;
  amountPaidSol: number;
  requiredSol: number;
  receiverAddress?: string;
  memo?: string;
  txSignature?: string;
  message?: string;
}

interface ChallengeResponse {
  nonce: string;
  memo: string;
  requiredSol: number;
  receiverAddress: string;
}

export async function requestVerificationChallenge(): Promise<ChallengeResponse> {
  const response = await fetch("/api/auth/nonce", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chain: "solana" }),
  });

  const data = (await response.json()) as ChallengeResponse & { message?: string };

  if (!response.ok || !data.nonce || !data.memo || !data.receiverAddress) {
    throw new Error(data.message || "Failed to prepare payment intent.");
  }

  return {
    nonce: data.nonce,
    memo: data.memo,
    requiredSol: data.requiredSol,
    receiverAddress: data.receiverAddress,
  };
}

export async function submitVerification(params: {
  nonce: string;
  chain?: "solana";
}): Promise<VerifyResponse> {
  const response = await fetch("/api/auth/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...params, chain: params.chain || "solana" }),
  });

  const data = (await response.json()) as VerifyResponse;

  if (!response.ok && response.status !== 202) {
    return {
      granted: false,
      pending: data.pending,
      amountPaidSol: data.amountPaidSol || 0,
      requiredSol: data.requiredSol || Number(process.env.NEXT_PUBLIC_FC_ACCESS_PRICE_SOL || "5"),
      receiverAddress: data.receiverAddress,
      memo: data.memo,
      txSignature: data.txSignature,
      message: data.message || "ACCESS DENIED",
    };
  }

  return data;
}
