"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AccessGlitch from "@/components/AccessGlitch";
import LoadingOverlay from "@/components/LoadingOverlay";
import {
  requestHolderChallenge,
  requestPaymentIntent,
  submitHolderVerification,
  submitPaymentVerification,
} from "@/lib/api";
import {
  connectWalletAndReadHolderBalance,
  signWalletChallenge,
} from "@/lib/client-wallet";
import {
  UnlockMethod,
  getClientDefaultUnlockMethod,
  getClientEnabledUnlockMethods,
} from "@/lib/unlock-config";

const SOUND_KEY = "fc_portal_sound";

type PageStatus = "idle" | "booting" | "waiting" | "checking" | "granted" | "denied";

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
    return "Unlock challenge expired. Refresh this page to generate a fresh challenge.";
  }

  return message;
}

function methodLabel(method: UnlockMethod): string {
  if (method === "holder") {
    return "Holder Verify";
  }
  return "5 SOL Payment";
}

export default function VerifyPage() {
  const router = useRouter();
  const pollInFlight = useRef(false);

  const enabledMethods = useMemo(() => getClientEnabledUnlockMethods(), []);

  const [activeMethod, setActiveMethod] = useState<UnlockMethod>(() => {
    const preferred = getClientDefaultUnlockMethod();
    return enabledMethods.includes(preferred) ? preferred : enabledMethods[0];
  });

  const [status, setStatus] = useState<PageStatus>("idle");
  const [progressText, setProgressText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [holderBalanceEstimate, setHolderBalanceEstimate] = useState<number | null>(null);
  const [holderBalance, setHolderBalance] = useState<number | null>(null);
  const [holderThreshold, setHolderThreshold] = useState<number | null>(null);
  const [requiredPercent, setRequiredPercent] = useState<number>(1);
  const [holderBalanceWarning, setHolderBalanceWarning] = useState<string | null>(null);

  const [nonce, setNonce] = useState<string | null>(null);
  const [memo, setMemo] = useState<string>("-");
  const [receiverAddress, setReceiverAddress] = useState<string>(
    process.env.NEXT_PUBLIC_FC_SOLANA_PAYMENT_ADDRESS || "Configured server-side",
  );
  const [requiredSol, setRequiredSol] = useState<number>(
    Number(process.env.NEXT_PUBLIC_FC_ACCESS_PRICE_SOL || "5"),
  );

  const initializePaymentIntent = useCallback(async () => {
    setStatus("booting");
    setError(null);
    setProgressText("Generating payment memo...");

    try {
      const challenge = await requestPaymentIntent();
      setNonce(challenge.nonce);
      setMemo(challenge.memo);
      setReceiverAddress(challenge.receiverAddress);
      setRequiredSol(challenge.requiredSol);
      setStatus("waiting");
      setProgressText("Invoice ready. Send payment and this page auto-unlocks after confirmation.");
    } catch (err) {
      setStatus("denied");
      const raw = err instanceof Error ? err.message : "Unable to initialize payment unlock.";
      setError(normalizeErrorMessage(raw));
      setProgressText(null);
    }
  }, []);

  const verifyPayment = useCallback(async () => {
    if (!nonce || pollInFlight.current || status === "granted" || activeMethod !== "payment") {
      return;
    }

    pollInFlight.current = true;
    setStatus("checking");

    try {
      const result = await submitPaymentVerification({ nonce });
      setRequiredSol(result.requiredSol);
      setReceiverAddress(result.receiverAddress || receiverAddress);
      setMemo(result.memo || memo);

      if (result.granted) {
        setStatus("granted");
        setProgressText("Payment confirmed. Unlocking vault...");
        setError(null);
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
  }, [activeMethod, memo, nonce, receiverAddress, requiredSol, router, status]);

  const runHolderUnlock = useCallback(async () => {
    setStatus("checking");
    setError(null);
    setProgressText("Connecting Phantom wallet...");

    try {
      const connected = await connectWalletAndReadHolderBalance();
      setWalletAddress(connected.address);
      setHolderBalanceEstimate(connected.balance);
      setHolderBalanceWarning(connected.balanceWarning || null);

      setProgressText("Requesting holder challenge...");
      const challenge = await requestHolderChallenge(connected.address);

      setProgressText("Sign the verification challenge in Phantom...");
      const signature = await signWalletChallenge(challenge.message);

      setProgressText("Verifying on-chain holder threshold...");
      const result = await submitHolderVerification({
        walletAddress: connected.address,
        nonce: challenge.nonce,
        signature,
      });

      setHolderBalance(result.balance);
      setHolderThreshold(result.threshold);
      setRequiredPercent(result.requiredPercent || 1);

      if (result.granted) {
        setStatus("granted");
        setProgressText("Holder verification confirmed. Unlocking vault...");
        playFeedback("success");
        window.setTimeout(() => {
          router.push("/dashboard");
        }, 700);
        return;
      }

      setStatus("denied");
      setProgressText(null);
      setError(result.message || "ACCESS DENIED. Holder threshold not met.");
      playFeedback("denied");
    } catch (err) {
      setStatus("denied");
      setProgressText(null);
      const raw = err instanceof Error ? err.message : "Holder verification failed.";
      setError(normalizeErrorMessage(raw));
    }
  }, [router]);

  useEffect(() => {
    setError(null);
    setProgressText(null);

    if (activeMethod === "payment") {
      void initializePaymentIntent();
      return;
    }

    setStatus("idle");
    setNonce(null);
    setMemo("-");
  }, [activeMethod, initializePaymentIntent]);

  useEffect(() => {
    if (activeMethod !== "payment" || !nonce || status === "granted" || status === "denied") {
      return;
    }

    const timer = window.setInterval(() => {
      void verifyPayment();
    }, 4000);

    return () => {
      window.clearInterval(timer);
    };
  }, [activeMethod, nonce, status, verifyPayment]);

  const loadingLabel =
    activeMethod === "payment" ? "Monitoring Chain Settlement..." : "Verifying Holder Clearance...";

  return (
    <>
      <LoadingOverlay active={status === "booting" || status === "checking"} label={loadingLabel} />
      <div className="mx-auto max-w-3xl space-y-6 pb-10">
        <section className="glass-card rounded-2xl p-7 sm:p-8">
          <p className="section-title text-sm tracking-[0.18em] text-orange-200/75">
            Solana Clearance Checkpoint
          </p>
          <h1 className="section-title mt-2 text-5xl text-orange-100">Dual Unlock Terminal</h1>
          <p className="mt-3 text-sm text-orange-100/80">
            Choose a clearance route: holder verification (Phantom signature + 1% supply check) or direct
            5 SOL payment unlock.
          </p>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {enabledMethods.map((method) => {
              const isActive = method === activeMethod;
              return (
                <button
                  key={method}
                  type="button"
                  onClick={() => {
                    setActiveMethod(method);
                  }}
                  className={`section-title rounded border px-4 py-2 text-sm uppercase tracking-[0.12em] transition ${
                    isActive
                      ? "border-orange-400/70 bg-gradient-to-r from-red-900/80 to-orange-900/70 text-orange-50"
                      : "border-orange-500/30 bg-black/35 text-orange-100/85 hover:border-orange-400/55"
                  }`}
                >
                  {methodLabel(method)}
                </button>
              );
            })}
          </div>

          {activeMethod === "holder" ? (
            <div className="mt-5 space-y-4">
              <div className="rounded border border-orange-500/40 bg-black/35 px-3 py-2 text-xs uppercase tracking-[0.13em] text-orange-100/80">
                Unlock mode: Phantom holder verification (1% supply threshold)
              </div>

              <button
                type="button"
                onClick={() => {
                  void runHolderUnlock();
                }}
                disabled={status === "checking" || status === "booting"}
                className="section-title rounded border border-orange-500/55 bg-gradient-to-r from-red-900/80 to-orange-900/70 px-5 py-3 text-lg tracking-[0.12em] text-orange-50 transition hover:shadow-[0_0_24px_rgba(255,93,29,0.45)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {status === "checking" ? "Verifying Holder..." : "Connect + Sign with Phantom"}
              </button>

              {walletAddress ? (
                <div className="space-y-1 text-xs uppercase tracking-[0.12em] text-orange-100/75">
                  <p>Wallet: {walletAddress}</p>
                  {holderBalanceEstimate !== null ? (
                    <p>Client token estimate: {holderBalanceEstimate.toLocaleString()}</p>
                  ) : null}
                  {holderBalance !== null ? <p>Verified token balance: {holderBalance.toLocaleString()}</p> : null}
                  {holderThreshold !== null ? (
                    <p>Required threshold ({requiredPercent}%): {holderThreshold.toLocaleString()}</p>
                  ) : null}
                </div>
              ) : null}

              {holderBalanceWarning ? (
                <p className="rounded border border-orange-500/45 bg-orange-950/30 p-2 text-xs uppercase tracking-[0.12em] text-orange-100/90">
                  {holderBalanceWarning}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="rounded border border-orange-500/40 bg-black/35 px-3 py-2 text-xs uppercase tracking-[0.13em] text-orange-100/80">
                Unlock mode: External transfer (no wallet connection required)
              </div>

              <div className="space-y-1 text-xs uppercase tracking-[0.12em] text-orange-100/75">
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
                className="section-title rounded border border-orange-500/55 bg-gradient-to-r from-red-900/80 to-orange-900/70 px-5 py-3 text-lg tracking-[0.12em] text-orange-50 transition hover:shadow-[0_0_24px_rgba(255,93,29,0.45)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {status === "checking" || status === "booting"
                  ? "Checking Payment..."
                  : `I Sent ${requiredSol.toFixed(3)} SOL`}
              </button>
            </div>
          )}

          {progressText ? (
            <p className="mt-4 rounded border border-orange-500/45 bg-orange-950/30 p-2 text-xs uppercase tracking-[0.12em] text-orange-100/90">
              {progressText}
            </p>
          ) : null}

          {status === "granted" ? (
            <p className="mt-4 text-sm uppercase tracking-[0.14em] text-green-300">
              Clearance confirmed. Entering classified dashboard...
            </p>
          ) : null}

          {status === "denied" ? (
            <AccessGlitch
              detail={
                activeMethod === "holder"
                  ? "Holder threshold not met. Hold at least 1% of the supply to unlock."
                  : "Required SOL payment not detected for this unlock memo."
              }
            />
          ) : null}

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
