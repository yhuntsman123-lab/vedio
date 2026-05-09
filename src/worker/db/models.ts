export type JobStatus =
  | "PENDING"
  | "QUEUED"
  | "SCRIPTED"
  | "RENDERING"
  | "TTS_DONE"
  | "COMPOSITING"
  | "SUCCEEDED"
  | "FAILED";

export interface User {
  id: string;
  email: string;
}

export interface Wallet {
  userId: string;
  balance: number;
}

export interface LedgerEntry {
  id: string;
  userId: string;
  jobId?: string;
  type: "credit" | "debit_hold" | "debit_settle" | "refund";
  points: number;
  idempotencyKey: string;
  note?: string;
  createdAt: string;
}

export interface Job {
  id: string;
  projectId: string;
  userId: string;
  status: JobStatus;
  estimatedPoints: number;
  settledPoints?: number;
  outputR2Key?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PreAuthorizeInput {
  userId: string;
  projectId: string;
  jobId: string;
  estimatedPoints: number;
  idempotencyKey: string;
}

export interface SettleInput {
  userId: string;
  jobId: string;
  holdPoints: number;
  actualPoints: number;
  idempotencyKey: string;
}

export interface ProjectInput {
  id: string;
  userId: string;
  title: string;
  styleProfileId: "cn_cyber_dark" | "cn_gothic_dark" | "cn_realistic_drama";
  contentLanguage: "zh" | "en";
  sourceType: "paste" | "txt" | "md" | "url";
  sourceText: string;
  sourceUri?: string;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  styleProfileId: "cn_cyber_dark" | "cn_gothic_dark" | "cn_realistic_drama";
  contentLanguage: "zh" | "en";
  sourceType: "paste" | "txt" | "md" | "url";
  sourceText: string;
  sourceUri?: string;
  createdAt: string;
}
