import { NextRequest, NextResponse } from "next/server";
import {
  buildPaymentMemo,
  getNonceCookieName,
  getNonceCookieOptions,
  getSessionCookieName,
  getSessionCookieOptions,
  issueHolderSession,
  verifyNonceChallengeToken,
} from "@/lib/auth";
import { SessionPayload } from "@/lib/types";
import { verifySolanaAccessPayment } from "@/lib/web3";

interface VerifyRequestBody {
  nonce?: string;
  chain?: string;
}

const consumedPaymentSignatures = new Set<string>();

function clearNonceCookie(response: NextResponse) {
  response.cookies.set(getNonceCookieName(), "", {
    ...getNonceCookieOptions(),
    maxAge: 0,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = ((await request.json().catch(() => ({}))) || {}) as VerifyRequestBody;

    if (body.chain && body.chain !== "solana") {
      return NextResponse.json(
        { message: "Only Solana payment unlock is supported." },
        { status: 400 },
      );
    }

    const challengeCookie = request.cookies.get(getNonceCookieName())?.value;
    const challenge = await verifyNonceChallengeToken(challengeCookie);

    if (!challenge) {
      return NextResponse.json(
        { message: "Unlock session expired. Refresh page to generate a new payment memo." },
        { status: 401 },
      );
    }

    if (body.nonce && body.nonce.trim() !== challenge.nonce) {
      const deny = NextResponse.json(
        { message: "Unlock memo mismatch. Refresh and try again." },
        { status: 401 },
      );
      clearNonceCookie(deny);
      return deny;
    }

    const expectedMemo = buildPaymentMemo({
      nonce: challenge.nonce,
    });

    // Critical unlock logic:
    // 1) Server issues a unique invoice memo in a short-lived cookie.
    // 2) User sends SOL manually to the configured receiver with that memo.
    // 3) Server scans recent receiver transactions and validates memo + amount.
    // 4) When a valid payment is detected, server creates unlock session automatically.
    const payment = await verifySolanaAccessPayment({
      expectedMemo,
      notBeforeUnix: Math.floor(challenge.createdAt / 1000),
    });

    if (payment.pending) {
      return NextResponse.json(
        {
          granted: false,
          pending: true,
          amountPaidSol: payment.amountSol,
          requiredSol: payment.requiredSol,
          receiverAddress: payment.receiverAddress,
          memo: expectedMemo,
          message: payment.message || "Waiting for payment confirmation.",
        },
        { status: 202 },
      );
    }

    if (!payment.granted || !payment.walletAddress || !payment.txSignature) {
      return NextResponse.json(
        {
          granted: false,
          pending: false,
          amountPaidSol: payment.amountSol,
          requiredSol: payment.requiredSol,
          receiverAddress: payment.receiverAddress,
          memo: expectedMemo,
          message:
            payment.message ||
            `ACCESS DENIED. Send at least ${payment.requiredSol.toFixed(3)} SOL with the issued memo.`,
        },
        { status: 403 },
      );
    }

    if (consumedPaymentSignatures.has(payment.txSignature)) {
      return NextResponse.json(
        {
          granted: false,
          pending: false,
          amountPaidSol: payment.amountSol,
          requiredSol: payment.requiredSol,
          receiverAddress: payment.receiverAddress,
          memo: expectedMemo,
          message: "This payment transaction has already been used for unlock.",
        },
        { status: 409 },
      );
    }

    consumedPaymentSignatures.add(payment.txSignature);

    const sessionPayload: SessionPayload = {
      walletAddress: payment.walletAddress,
      role: "paid",
      chain: "solana",
      accessPaymentSol: payment.amountSol,
      paymentTxSignature: payment.txSignature,
    };

    const token = await issueHolderSession(sessionPayload);
    const response = NextResponse.json({
      granted: true,
      pending: false,
      amountPaidSol: payment.amountSol,
      requiredSol: payment.requiredSol,
      receiverAddress: payment.receiverAddress,
      memo: expectedMemo,
      txSignature: payment.txSignature,
      role: "paid",
    });

    response.cookies.set(getSessionCookieName(), token, getSessionCookieOptions());
    clearNonceCookie(response);
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Payment verification failed.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
