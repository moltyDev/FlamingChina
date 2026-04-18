export type ChainKind = "solana";
export type AccessRole = "paid" | "holder";

export type ClassificationLevel = "Confidential" | "Top Secret" | "Redacted";
export type DocumentFormat = "markdown" | "image" | "pdf";

export interface PaidSessionPayload {
  walletAddress: string;
  role: "paid";
  chain: ChainKind;
  accessPaymentSol: number;
  paymentTxSignature: string;
}

export interface HolderSessionPayload {
  walletAddress: string;
  role: "holder";
  chain: ChainKind;
  tokenBalance: number;
  requiredHolderThreshold: number;
}

export type SessionPayload = PaidSessionPayload | HolderSessionPayload;

export interface DocumentMediaItem {
  path: string;
  caption: string;
}

export interface LeakDocument {
  id: string;
  title: string;
  date: string;
  classification: ClassificationLevel;
  preview: string;
  content: string;
  format?: DocumentFormat;
  isSimulation?: boolean;
  downloadFileName?: string;
  assetPath?: string;
  media?: DocumentMediaItem[];
}
