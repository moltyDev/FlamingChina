import { SignJWT, jwtVerify } from "jose";
import type { JWTPayload } from "jose";
import { ChainKind, SessionPayload } from "@/lib/types";
import { UnlockMethod } from "@/lib/unlock-config";

interface NonceChallengePayload {
  chain: ChainKind;
  nonce: string;
  createdAt: number;
  method: UnlockMethod;
  walletAddress?: string;
  purpose: "unlock-intent";
}

const SESSION_COOKIE_NAME = "fc_portal_session";
const NONCE_COOKIE_NAME = "fc_portal_nonce";

const SESSION_TTL_SECONDS = 60 * 60 * 8;
const NONCE_TTL_SECONDS = 60 * 30;
const FORCE_INSECURE_COOKIES = process.env.FC_COOKIE_SECURE === "false";

const secret = new TextEncoder().encode(
  process.env.FC_JWT_SECRET || "dev-only-secret-change-me-immediately",
);

export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

export function getNonceCookieName(): string {
  return NONCE_COOKIE_NAME;
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production" && !FORCE_INSECURE_COOKIES,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function getNonceCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production" && !FORCE_INSECURE_COOKIES,
    path: "/",
    maxAge: NONCE_TTL_SECONDS,
  };
}

export function buildPaymentMemo(params: {
  nonce: string;
}): string {
  return `FC-ACCESS:${params.nonce}`;
}

export function buildWalletChallengeMessage(params: {
  walletAddress: string;
  chain: ChainKind;
  nonce: string;
}): string {
  return [
    "Flaming China Intelligence Portal",
    "Sign this message to verify wallet ownership for holder unlock.",
    "This signature does not approve transactions.",
    `Wallet: ${params.walletAddress}`,
    `Chain: ${params.chain}`,
    `Nonce: ${params.nonce}`,
  ].join("\n");
}

export async function issueHolderSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as SessionPayload & JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret);
}

export async function issueNonceChallengeToken(
  payload: NonceChallengePayload,
): Promise<string> {
  return new SignJWT(payload as NonceChallengePayload & JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${NONCE_TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifyNonceChallengeToken(
  token?: string | null,
): Promise<NonceChallengePayload | null> {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret);

    if (
      payload.purpose === "unlock-intent" &&
      payload.chain === "solana" &&
      typeof payload.nonce === "string" &&
      typeof payload.createdAt === "number" &&
      (payload.method === "holder" || payload.method === "payment")
    ) {
      if (payload.method === "holder" && typeof payload.walletAddress !== "string") {
        return null;
      }

      return {
        purpose: "unlock-intent",
        chain: payload.chain,
        nonce: payload.nonce,
        createdAt: payload.createdAt,
        method: payload.method,
        walletAddress:
          typeof payload.walletAddress === "string"
            ? payload.walletAddress
            : undefined,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export async function verifySessionToken(token?: string | null): Promise<SessionPayload | null> {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret);

    if (
      payload.role === "paid" &&
      payload.chain === "solana" &&
      typeof payload.walletAddress === "string" &&
      typeof payload.accessPaymentSol === "number" &&
      typeof payload.paymentTxSignature === "string"
    ) {
      return {
        walletAddress: payload.walletAddress,
        role: "paid",
        chain: payload.chain,
        accessPaymentSol: payload.accessPaymentSol,
        paymentTxSignature: payload.paymentTxSignature,
      };
    }

    if (
      payload.role === "holder" &&
      payload.chain === "solana" &&
      typeof payload.walletAddress === "string" &&
      typeof payload.tokenBalance === "number" &&
      typeof payload.requiredHolderThreshold === "number"
    ) {
      return {
        walletAddress: payload.walletAddress,
        role: "holder",
        chain: payload.chain,
        tokenBalance: payload.tokenBalance,
        requiredHolderThreshold: payload.requiredHolderThreshold,
      };
    }

    return null;
  } catch {
    return null;
  }
}
