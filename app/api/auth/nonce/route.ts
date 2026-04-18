import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  buildPaymentMemo,
  buildWalletChallengeMessage,
  getNonceCookieName,
  getNonceCookieOptions,
  issueNonceChallengeToken,
} from "@/lib/auth";
import { getAccessPaymentReceiver, getRequiredAccessPaymentSol } from "@/lib/web3";
import {
  UnlockMethod,
  getServerDefaultUnlockMethod,
  isServerUnlockMethodEnabled,
} from "@/lib/unlock-config";

interface NonceRequestBody {
  method?: UnlockMethod;
  walletAddress?: string;
  chain?: string;
}

function resolveRequestedMethod(bodyMethod?: UnlockMethod): UnlockMethod {
  return bodyMethod || getServerDefaultUnlockMethod();
}

export async function POST(request: NextRequest) {
  try {
    const body = ((await request.json().catch(() => ({}))) || {}) as NonceRequestBody;
    const chain = "solana" as const;

    if (body.chain && body.chain !== chain) {
      return NextResponse.json(
        { message: "Only Solana unlock methods are supported." },
        { status: 400 },
      );
    }

    const method = resolveRequestedMethod(body.method);

    if (!isServerUnlockMethodEnabled(method)) {
      return NextResponse.json(
        { message: `Unlock method '${method}' is disabled on this deployment.` },
        { status: 403 },
      );
    }

    const nonce = crypto.randomBytes(16).toString("hex");

    if (method === "holder") {
      const walletAddress = body.walletAddress?.trim();
      if (!walletAddress) {
        return NextResponse.json(
          { message: "Wallet address is required for holder unlock." },
          { status: 400 },
        );
      }

      const challengeMessage = buildWalletChallengeMessage({
        walletAddress,
        chain,
        nonce,
      });

      const nonceToken = await issueNonceChallengeToken({
        chain,
        nonce,
        createdAt: Date.now(),
        method,
        walletAddress,
        purpose: "unlock-intent",
      });

      const response = NextResponse.json({
        method,
        nonce,
        message: challengeMessage,
      });

      response.cookies.set(getNonceCookieName(), nonceToken, getNonceCookieOptions());
      return response;
    }

    const paymentMemo = buildPaymentMemo({ nonce });
    const requiredSol = getRequiredAccessPaymentSol();
    const receiverAddress = getAccessPaymentReceiver();

    const nonceToken = await issueNonceChallengeToken({
      chain,
      nonce,
      createdAt: Date.now(),
      method,
      purpose: "unlock-intent",
    });

    const response = NextResponse.json({
      method,
      nonce,
      memo: paymentMemo,
      requiredSol,
      receiverAddress,
    });

    response.cookies.set(getNonceCookieName(), nonceToken, getNonceCookieOptions());
    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate unlock challenge.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
