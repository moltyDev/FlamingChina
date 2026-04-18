"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AccessGlitch from "@/components/AccessGlitch";
import LoadingOverlay from "@/components/LoadingOverlay";
import { requestVerificationChallenge, submitVerification } from "@/lib/api";

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

function normalizeErrorMessage(message: string): string {
  const lowered = message.toLowerCase();

  if (lowered.includes("access forbidden") || lowered.includes("403")) {
    return "RPC access forbidden. Check FC_SOLANA_RPC_URL / NEXT_PUBLIC_FC_SOLANA_RPC_URL and your RPC allowlist.";
  }

  if (lowered.includes("expired")) {
    return "Unlock memo expired. Refresh this page to generate a new payment memo.";
  }

  return message;
}

export default function VerifyPage() {
  const router = useRouter();
  const pollInFlight = useRef(false);

  const [nonce, setNonce] = useState<string | null>(null);
  const [memo, setMemo] = useState<string>("-");
  const [receiverAddress, setReceiverAddress] = useState<string>(
    process.env.NEXT_PUBLIC_FC_SOLANA_PAYMENT_ADDRESS || "Configured server-side",
  );
  const [requiredSol, setRequiredSol] = useState<number>(
    Number(process.env.NEXT_PUBLIC_FC_ACCESS_PRICE_SOL || "5"),
  );
  const [status, setStatus] = useState<"booting" | "waiting" | "checking" | "granted" | "denied">(
    "booting",
  );
  const [progressText, setProgressText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verifyPayment = useCallback(async () => {
    if (!nonce || pollInFlight.current || status === "granted") {
      return;
    }

    pollInFlight.current = true;
    setStatus("checking");

    try {
      const result = await submitVerification({ nonce });
      setRequiredSol(result.requiredSol);
      setReceiverAddress(result.receiverAddress || receiverAddress);
      setMemo(result.memo || memo);

      if (result.granted) {
        setStatus("granted");
        setProgressText("Payment confirmed. Unlocking vault...");
        setError(null);
        window.localStorage.setItem("fc_portal_verified", "true");
        playFeedback("success");
        window.setTimeout(() => {
          router.push("/dashboard");
        }, 700);
        return;
      }

      if (result.pending) {
        setStatus("waiting");
        setError(null);
        setProgressText(
          result.message || "Payment not detected yet. Send the amount and keep this page open.",
        );
        return;
      }

      setStatus("denied");
      setProgressText(null);
      setError(
        result.message ||
          `ACCESS DENIED. Send at least ${result.requiredSol.toFixed(3)} SOL with the issued memo.`,
      );
      playFeedback("denied");
    } catch (err) {
      setStatus("denied");
      setProgressText(null);
      const raw = err instanceof Error ? err.message : "Payment check failed.";
      setError(normalizeErrorMessage(raw));
    } finally {
      pollInFlight.current = false;
    }
  }, [memo, nonce, receiverAddress, router, status]);

  useEffect(() => {
    const initializeInvoice = async () => {
      setStatus("booting");
      setError(null);
      setProgressText("Generating payment memo...");

      try {
        const challenge = await requestVerificationChallenge();
        setNonce(challenge.nonce);
        setMemo(challenge.memo);
        setReceiverAddress(challenge.receiverAddress);
        setRequiredSol(challenge.requiredSol);
        setStatus("waiting");
        setProgressText("Invoice ready. Send payment and this page will unlock automatically.");
      } catch (err) {
        setStatus("denied");
        const raw = err instanceof Error ? err.message : "Unable to initialize unlock invoice.";
        setError(normalizeErrorMessage(raw));
        setProgressText(null);
      }
    };

    void initializeInvoice();
  }, []);

  useEffect(() => {
    if (!nonce || status === "granted" || status === "denied") {
      return;
    }

    const timer = window.setInterval(() => {
      void verifyPayment();
    }, 4000);

    return () => {
      window.clearInterval(timer);
    };
  }, [nonce, status, verifyPayment]);

  const buttonLabel =
    status === "checking" || status === "booting"
      ? "Checking Payment..."
      : `I Sent ${requiredSol.toFixed(3)} SOL`;

  return (
    <>
      <LoadingOverlay active={status === "booting" || status === "checking"} label="Monitoring Chain Settlement..." />
      <div className="mx-auto max-w-3xl space-y-6 pb-10">
        <section className="glass-card rounded-2xl p-7 sm:p-8">
          <p className="section-title text-sm tracking-[0.18em] text-orange-200/75">
            Solana Access Gateway
          </p>
          <h1 className="section-title mt-2 text-5xl text-orange-100">
            Manual SOL Unlock
          </h1>
          <p className="mt-3 text-sm text-orange-100/80">
            Send the exact SOL amount to the address below and include the memo.
            This page auto-unlocks the archive as soon as the payment is confirmed on-chain.
          </p>

          <div className="mt-4 rounded border border-orange-500/40 bg-black/35 px-3 py-2 text-xs uppercase tracking-[0.13em] text-orange-100/80">
            Unlock mode: External Solana transfer
          </div>

          <div className="mt-4 space-y-1 text-xs uppercase tracking-[0.12em] text-orange-100/75">
            <p>Payment receiver: {receiverAddress}</p>
            <p>Required payment: {requiredSol.toFixed(3)} SOL</p>
            <p>Memo (required): {memo}</p>
          </div>

          <button
            type="button"
            disabled={status === "booting" || status === "checking" || !nonce}
            onClick={() => {
              void verifyPayment();
            }}
            className="section-title mt-6 rounded border border-orange-500/55 bg-gradient-to-r from-red-900/80 to-orange-900/70 px-5 py-3 text-lg tracking-[0.12em] text-orange-50 transition hover:shadow-[0_0_24px_rgba(255,93,29,0.45)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {buttonLabel}
          </button>

          {progressText ? (
            <p className="mt-3 rounded border border-orange-500/45 bg-orange-950/30 p-2 text-xs uppercase tracking-[0.12em] text-orange-100/90">
              {progressText}
            </p>
          ) : null}

          {status === "granted" ? (
            <p className="mt-5 text-sm uppercase tracking-[0.14em] text-green-300">
              Payment confirmed. Entering classified dashboard...
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
