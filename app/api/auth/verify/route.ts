import { NextRequest, NextResponse } from "next/server";
import {
  buildPaymentMemo,
  buildWalletChallengeMessage,
  getNonceCookieName,
  getNonceCookieOptions,
  getSessionCookieName,
  getSessionCookieOptions,
  issueHolderSession,
  verifyNonceChallengeToken,
} from "@/lib/auth";
import { SessionPayload } from "@/lib/types";
import { verifyWalletSignature } from "@/lib/signature";
import { verifySolanaAccessPayment, verifySolanaHolderAccess } from "@/lib/web3";
import {
  UnlockMethod,
  getServerDefaultUnlockMethod,
  isServerUnlockMethodEnabled,
} from "@/lib/unlock-config";

interface VerifyRequestBody {
  method?: UnlockMethod;
  chain?: string;
  nonce?: string;
  walletAddress?: string;
  signature?: string;
}

const consumedPaymentSignatures = new Set<string>();

function clearNonceCookie(response: NextResponse) {
  response.cookies.set(getNonceCookieName(), "", {
    ...getNonceCookieOptions(),
    maxAge: 0,
  });
}

function resolveRequestedMethod(bodyMethod?: UnlockMethod): UnlockMethod {
  return bodyMethod || getServerDefaultUnlockMethod();
}

export async function POST(request: NextRequest) {
  try {
    const body = ((await request.json().catch(() => ({}))) || {}) as VerifyRequestBody;
    const chain = "solana" as const;

    if (body.chain && body.chain !== chain) {
      return NextResponse.json(
        { message: "Only Solana unlock methods are supported." },
        { status: 400 },
      );
    }

    const requestedMethod = resolveRequestedMethod(body.method);

    if (!isServerUnlockMethodEnabled(requestedMethod)) {
      return NextResponse.json(
        { message: `Unlock method '${requestedMethod}' is disabled on this deployment.` },
        { status: 403 },
      );
    }

    const challengeCookie = request.cookies.get(getNonceCookieName())?.value;
    const challenge = await verifyNonceChallengeToken(challengeCookie);

    if (!challenge) {
      return NextResponse.json(
        { message: "Unlock session expired. Refresh and try again." },
        { status: 401 },
      );
    }

    if (challenge.method !== requestedMethod) {
      return NextResponse.json(
        { message: "Unlock method changed. Request a fresh unlock challenge." },
        { status: 409 },
      );
    }

    if (body.nonce && body.nonce.trim() !== challenge.nonce) {
      const deny = NextResponse.json(
        { message: "Unlock nonce mismatch. Refresh and try again." },
        { status: 401 },
      );
      clearNonceCookie(deny);
      return deny;
    }

    if (requestedMethod === "holder") {
      const walletAddress = body.walletAddress?.trim();
      const signature = body.signature?.trim();

      if (!walletAddress || !signature) {
        return NextResponse.json(
          { message: "Wallet address and signature are required for holder unlock." },
          { status: 400 },
        );
      }

      if (!challenge.walletAddress || challenge.walletAddress !== walletAddress) {
        return NextResponse.json(
          { message: "Holder challenge wallet mismatch. Reconnect and sign again." },
          { status: 401 },
        );
      }

      const challengeMessage = buildWalletChallengeMessage({
        walletAddress,
        chain,
        nonce: challenge.nonce,
      });

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
        clearNonceCookie(deny);
        return deny;
      }

      const holderResult = await verifySolanaHolderAccess({ walletAddress });

      if (!holderResult.granted) {
        return NextResponse.json(
          {
            granted: false,
            method: "holder",
            balance: holderResult.balance,
            threshold: holderResult.threshold,
            totalSupply: holderResult.totalSupply,
            requiredPercent: holderResult.requiredPercent,
            message: `ACCESS DENIED. Hold at least ${holderResult.requiredPercent}% of token supply to unlock documents.`,
          },
          { status: 403 },
        );
      }

      const sessionPayload: SessionPayload = {
        walletAddress,
        role: "holder",
        chain,
        tokenBalance: holderResult.balance,
        requiredHolderThreshold: holderResult.threshold,
      };

      const token = await issueHolderSession(sessionPayload);
      const response = NextResponse.json({
        granted: true,
        method: "holder",
        balance: holderResult.balance,
        threshold: holderResult.threshold,
        totalSupply: holderResult.totalSupply,
        requiredPercent: holderResult.requiredPercent,
        role: "holder",
      });

      response.cookies.set(getSessionCookieName(), token, getSessionCookieOptions());
      clearNonceCookie(response);
      return response;
    }

    const expectedMemo = buildPaymentMemo({ nonce: challenge.nonce });

    const payment = await verifySolanaAccessPayment({
      expectedMemo,
      notBeforeUnix: Math.floor(challenge.createdAt / 1000),
    });

    if (payment.pending) {
      return NextResponse.json(
        {
          granted: false,
          pending: true,
          method: "payment",
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
          method: "payment",
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
          method: "payment",
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
      chain,
      accessPaymentSol: payment.amountSol,
      paymentTxSignature: payment.txSignature,
    };

    const token = await issueHolderSession(sessionPayload);
    const response = NextResponse.json({
      granted: true,
      pending: false,
      method: "payment",
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
      error instanceof Error ? error.message : "Unlock verification failed.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
