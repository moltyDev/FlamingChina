import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  buildPaymentMemo,
  getNonceCookieName,
  getNonceCookieOptions,
  issueNonceChallengeToken,
} from "@/lib/auth";
import { getAccessPaymentReceiver, getRequiredAccessPaymentSol } from "@/lib/web3";

interface NonceRequestBody {
  chain?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = ((await request.json().catch(() => ({}))) || {}) as NonceRequestBody;

    if (body.chain && body.chain !== "solana") {
      return NextResponse.json(
        { message: "Only Solana payment unlock is supported." },
        { status: 400 },
      );
    }

    const chain = "solana" as const;
    const nonce = crypto.randomBytes(16).toString("hex");
    const paymentMemo = buildPaymentMemo({
      nonce,
    });
    const requiredSol = getRequiredAccessPaymentSol();
    const receiverAddress = getAccessPaymentReceiver();

    const nonceToken = await issueNonceChallengeToken({
      chain,
      nonce,
      createdAt: Date.now(),
      purpose: "payment-intent",
    });

    const response = NextResponse.json({
      nonce,
      memo: paymentMemo,
      requiredSol,
      receiverAddress,
    });

    response.cookies.set(
      getNonceCookieName(),
      nonceToken,
      getNonceCookieOptions(),
    );

    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate payment intent.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
