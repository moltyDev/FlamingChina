import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  buildWalletChallengeMessage,
  getNonceCookieName,
  getNonceCookieOptions,
  issueNonceChallengeToken,
} from "@/lib/auth";

interface NonceRequestBody {
  walletAddress?: string;
  chain?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as NonceRequestBody;
    const walletAddress = body.walletAddress?.trim();

    if (!walletAddress) {
      return NextResponse.json(
        { message: "Wallet address is required." },
        { status: 400 },
      );
    }

    if (body.chain && body.chain !== "solana") {
      return NextResponse.json(
        { message: "Only Solana Phantom wallet verification is supported." },
        { status: 400 },
      );
    }

    const chain = "solana" as const;

    const nonce = crypto.randomBytes(16).toString("hex");
    const challengeMessage = buildWalletChallengeMessage({
      walletAddress,
      chain,
      nonce,
    });

    const nonceToken = await issueNonceChallengeToken({
      walletAddress,
      chain,
      nonce,
      purpose: "wallet-challenge",
    });

    const response = NextResponse.json({
      nonce,
      message: challengeMessage,
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
        : "Unable to generate wallet challenge.";
    return NextResponse.json({ message }, { status: 500 });
  }
}