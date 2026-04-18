import { NextRequest, NextResponse } from "next/server";
import {
  buildWalletChallengeMessage,
  getNonceCookieName,
  getNonceCookieOptions,
  getSessionCookieName,
  getSessionCookieOptions,
  issueHolderSession,
  verifyNonceChallengeToken,
} from "@/lib/auth";
import { verifyWalletSignature } from "@/lib/signature";
import { SessionPayload } from "@/lib/types";
import { verifyTokenBalance } from "@/lib/web3";

interface VerifyRequestBody {
  walletAddress?: string;
  chain?: string;
  nonce?: string;
  signature?: string;
}

function formatTokenAmount(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  if (value >= 1_000_000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  if (value >= 1) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VerifyRequestBody;
    const walletAddress = body.walletAddress?.trim();
    const nonce = body.nonce?.trim();
    const signature = body.signature?.trim();

    if (!walletAddress || !nonce || !signature) {
      return NextResponse.json(
        { message: "Wallet, nonce, and signature are required." },
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

    const challengeCookie = request.cookies.get(getNonceCookieName())?.value;
    const challenge = await verifyNonceChallengeToken(challengeCookie);

    if (
      !challenge ||
      challenge.walletAddress !== walletAddress ||
      challenge.chain !== chain ||
      challenge.nonce !== nonce
    ) {
      return NextResponse.json(
        { message: "Challenge expired. Please reconnect and sign again." },
        { status: 401 },
      );
    }

    const challengeMessage = buildWalletChallengeMessage({
      walletAddress,
      chain,
      nonce,
    });

    // Critical verification logic:
    // 1) Server issues nonce challenge and stores signed nonce cookie.
    // 2) Wallet signs server challenge message on the client.
    // 3) Server verifies signature matches wallet ownership.
    // 4) Server checks on-chain $FC balance before granting session.
    const signatureValid = verifyWalletSignature({
      chain,
      walletAddress,
      message: challengeMessage,
      signature,
    });

    if (!signatureValid) {
      const deny = NextResponse.json(
        { message: "Invalid wallet signature." },
        { status: 401 },
      );
      deny.cookies.set(getNonceCookieName(), "", {
        ...getNonceCookieOptions(),
        maxAge: 0,
      });
      return deny;
    }

    const result = await verifyTokenBalance(chain, walletAddress);

    if (!result.granted) {
      const formattedBalance = formatTokenAmount(result.balance);
      const formattedThreshold = formatTokenAmount(result.threshold);
      const deny = NextResponse.json(
        {
          granted: false,
          balance: result.balance,
          threshold: result.threshold,
          requiredPercent: result.requiredPercent,
          totalSupply: result.totalSupply,
          message: `ACCESS DENIED. Hold at least ~1% of token supply to unlock documents. Current: ${formattedBalance} $FC. Required: ${formattedThreshold} $FC.`,
        },
        { status: 403 },
      );

      deny.cookies.set(getNonceCookieName(), "", {
        ...getNonceCookieOptions(),
        maxAge: 0,
      });

      return deny;
    }

    const sessionPayload: SessionPayload = {
      walletAddress,
      role: "holder",
      chain,
      tokenBalance: result.balance,
    };

    const token = await issueHolderSession(sessionPayload);
    const response = NextResponse.json({
      granted: true,
      balance: result.balance,
      threshold: result.threshold,
      requiredPercent: result.requiredPercent,
      totalSupply: result.totalSupply,
      role: "holder",
    });

    response.cookies.set(getSessionCookieName(), token, getSessionCookieOptions());
    response.cookies.set(getNonceCookieName(), "", {
      ...getNonceCookieOptions(),
      maxAge: 0,
    });

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Verification request failed.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
