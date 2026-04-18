import { PublicKey } from "@solana/web3.js";
import { getAddress, isAddress, verifyMessage } from "ethers";
import nacl from "tweetnacl";
import { ChainKind } from "@/lib/types";

function verifyEthereumSignature(
  walletAddress: string,
  message: string,
  signature: string,
): boolean {
  try {
    if (!isAddress(walletAddress)) {
      return false;
    }

    const recovered = verifyMessage(message, signature);
    return getAddress(recovered) === getAddress(walletAddress);
  } catch {
    return false;
  }
}

function verifySolanaSignature(
  walletAddress: string,
  message: string,
  signatureBase64: string,
): boolean {
  try {
    const publicKey = new PublicKey(walletAddress);
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = Uint8Array.from(Buffer.from(signatureBase64, "base64"));

    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes(),
    );
  } catch {
    return false;
  }
}

export function verifyWalletSignature(params: {
  chain: ChainKind;
  walletAddress: string;
  message: string;
  signature: string;
}): boolean {
  if (params.chain === "solana") {
    return verifySolanaSignature(
      params.walletAddress,
      params.message,
      params.signature,
    );
  }

  return verifyEthereumSignature(
    params.walletAddress,
    params.message,
    params.signature,
  );
}