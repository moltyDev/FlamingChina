import { SignJWT, jwtVerify } from "jose";
import type { JWTPayload } from "jose";
import { ChainKind, SessionPayload } from "@/lib/types";

interface NonceChallengePayload {
  walletAddress: string;
  chain: ChainKind;
  nonce: string;
  purpose: "wallet-challenge";
}

const SESSION_COOKIE_NAME = "fc_portal_session";
const NONCE_COOKIE_NAME = "fc_portal_nonce";

const SESSION_TTL_SECONDS = 60 * 60 * 8;
const NONCE_TTL_SECONDS = 60 * 5;

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
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function getNonceCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: NONCE_TTL_SECONDS,
  };
}

export function buildWalletChallengeMessage(params: {
  walletAddress: string;
  chain: ChainKind;
  nonce: string;
}): string {
  return [
    "Flaming China Intelligence Portal",
    "Sign this message to verify wallet ownership.",
    "This signature grants no transaction permissions.",
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
      payload.purpose === "wallet-challenge" &&
      (payload.chain === "ethereum" || payload.chain === "solana") &&
      typeof payload.walletAddress === "string" &&
      typeof payload.nonce === "string"
    ) {
      return {
        purpose: "wallet-challenge",
        chain: payload.chain,
        walletAddress: payload.walletAddress,
        nonce: payload.nonce,
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
      payload.role === "holder" &&
      (payload.chain === "ethereum" || payload.chain === "solana") &&
      typeof payload.walletAddress === "string" &&
      typeof payload.tokenBalance === "number"
    ) {
      return {
        walletAddress: payload.walletAddress,
        role: "holder",
        chain: payload.chain,
        tokenBalance: payload.tokenBalance,
      };
    }

    return null;
  } catch {
    return null;
  }
}