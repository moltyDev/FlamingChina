export type ChainKind = "ethereum" | "solana";

export type ClassificationLevel = "Confidential" | "Top Secret" | "Redacted";
export type DocumentFormat = "markdown" | "image" | "pdf";

export interface SessionPayload {
  walletAddress: string;
  role: "holder";
  chain: ChainKind;
  tokenBalance: number;
}

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
  media?: DocumentMediaItem[];
}