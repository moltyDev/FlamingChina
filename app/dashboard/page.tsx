import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/DashboardClient";
import { getSessionCookieName, verifySessionToken } from "@/lib/auth";

function maskAddress(address: string): string {
  if (address.length < 10) {
    return address;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default async function DashboardPage() {
  const token = cookies().get(getSessionCookieName())?.value;
  const session = await verifySessionToken(token);

  if (!session || (session.role !== "paid" && session.role !== "holder")) {
    redirect("/unlock");
  }

  const accessDetail =
    session.role === "paid"
      ? `Payment ${session.accessPaymentSol.toFixed(4)} SOL`
      : `Holder ${session.tokenBalance.toLocaleString()} tokens (threshold ${session.requiredHolderThreshold.toLocaleString()})`;

  return (
    <div className="space-y-6 pb-10">
      <section className="glass-card rounded-xl p-6">
        <p className="section-title text-sm tracking-[0.18em] text-orange-200/75">
          Vault Clearance Confirmed
        </p>
        <h1 className="section-title mt-2 text-5xl text-orange-100">Classified Dashboard</h1>
        <p className="mt-2 text-sm uppercase tracking-[0.12em] text-orange-100/75">
          Wallet {maskAddress(session.walletAddress)} | Chain {session.chain} | {accessDetail}
        </p>
      </section>

      <DashboardClient />
    </div>
  );
}

