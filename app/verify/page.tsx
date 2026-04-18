"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AccessGlitch from "@/components/AccessGlitch";
import LoadingOverlay from "@/components/LoadingOverlay";
import { requestVerificationChallenge, submitVerification } from "@/lib/api";
import { connectWalletAndReadBalance, signWalletChallenge } from "@/lib/client-wallet";

const SOUND_KEY = "fc_portal_sound";

function playFeedback(type: "success" | "denied") {
  const enabled = window.localStorage.getItem(SOUND_KEY) === "on";
  if (!enabled) {
    return;
  }

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return;
  }

  const context = new AudioCtx();
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = type === "success" ? "sine" : "sawtooth";
  oscillator.frequency.value = type === "success" ? 420 : 170;
  gainNode.gain.value = 0.035;

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start();
  oscillator.stop(context.currentTime + 0.13);
}

function normalizeWalletErrorMessage(message: string): string {
  const lowered = message.toLowerCase();

  if (
    lowered.includes("user rejected") ||
    lowered.includes("user denied") ||
    lowered.includes("rejected the request")
  ) {
    return "Signature was rejected in Phantom. Please approve to verify access.";
  }

  if (lowered.includes("access forbidden") || lowered.includes("403")) {
    return "RPC access forbidden. Check FC_SOLANA_RPC_URL / NEXT_PUBLIC_FC_SOLANA_RPC_URL and API key allowlist.";
  }

  return message;
}

export default function VerifyPage() {
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [clientBalance, setClientBalance] = useState<number | null>(null);
  const [balanceWarning, setBalanceWarning] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<number>(
    Number(process.env.NEXT_PUBLIC_FC_TOKEN_THRESHOLD || "1000"),
  );
  const [status, setStatus] = useState<"idle" | "verifying" | "granted" | "denied">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  const buttonLabel =
    status === "verifying" ? "Decrypting Access..." : "Connect + Sign with Phantom";

  const handleVerify = async () => {
    setStatus("verifying");
    setError(null);
    setBalanceWarning(null);

    try {
      const clientRead = await connectWalletAndReadBalance();
      setWalletAddress(clientRead.address);
      setClientBalance(clientRead.balance);
      setBalanceWarning(clientRead.balanceWarning || null);

      const challenge = await requestVerificationChallenge(clientRead.address);
      const signature = await signWalletChallenge(challenge.message);

      const result = await submitVerification({
        walletAddress: clientRead.address,
        nonce: challenge.nonce,
        signature,
      });

      setThreshold(result.threshold);

      if (result.granted) {
        setStatus("granted");
        window.localStorage.setItem("fc_portal_verified", "true");
        playFeedback("success");
        setTimeout(() => {
          router.push("/dashboard");
        }, 700);
        return;
      }

      setStatus("denied");
      setError(result.message || "ACCESS DENIED");
      playFeedback("denied");
    } catch (err) {
      setStatus("idle");
      const raw = err instanceof Error ? err.message : "Wallet verification failed.";
      setError(normalizeWalletErrorMessage(raw));
    }
  };

  return (
    <>
      <LoadingOverlay active={status === "verifying"} label="Decrypting Access..." />
      <div className="mx-auto max-w-3xl space-y-6 pb-10">
        <section className="glass-card rounded-2xl p-7 sm:p-8">
          <p className="section-title text-sm tracking-[0.18em] text-orange-200/75">
            Solana Clearance Checkpoint
          </p>
          <h1 className="section-title mt-2 text-5xl text-orange-100">
            Phantom Wallet Verification
          </h1>
          <p className="mt-3 text-sm text-orange-100/80">
            Connect your Phantom wallet, sign a secure challenge, then prove your
            on-chain $FC holdings are at least ~1% of total token supply.
          </p>

          <div className="mt-4 rounded border border-orange-500/40 bg-black/35 px-3 py-2 text-xs uppercase tracking-[0.13em] text-orange-100/80">
            Network mode: Solana only
          </div>

          <button
            type="button"
            disabled={status === "verifying"}
            onClick={handleVerify}
            className="section-title mt-6 rounded border border-orange-500/55 bg-gradient-to-r from-red-900/80 to-orange-900/70 px-5 py-3 text-lg tracking-[0.12em] text-orange-50 transition hover:shadow-[0_0_24px_rgba(255,93,29,0.45)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {buttonLabel}
          </button>

          {walletAddress ? (
            <div className="mt-4 space-y-1 text-xs uppercase tracking-[0.12em] text-orange-100/75">
              <p>Wallet: {walletAddress}</p>
              <p>
                Client-side Estimate: {clientBalance === null ? "Unavailable" : clientBalance.toFixed(4)} $FC |
                Required (~1% supply): {threshold.toLocaleString(undefined, { maximumFractionDigits: 4 })} $FC
              </p>
            </div>
          ) : null}

          {balanceWarning ? (
            <p className="mt-3 rounded border border-orange-500/40 bg-orange-900/20 p-2 text-xs text-orange-100/85">
              {balanceWarning}
            </p>
          ) : null}

          {status === "granted" ? (
            <p className="mt-5 text-sm uppercase tracking-[0.14em] text-green-300">
              Access granted. Entering classified dashboard...
            </p>
          ) : null}

          {status === "denied" ? <AccessGlitch /> : null}

          {error ? (
            <p className="mt-4 rounded border border-red-500/45 bg-red-950/30 p-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}
        </section>
      </div>
    </>
  );
}
