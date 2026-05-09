import type {
  Job,
  LedgerEntry,
  PreAuthorizeInput,
  Project,
  ProjectInput,
  SettleInput,
  User,
  Wallet
} from "./models";

function now(): string {
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export class InMemoryD1 {
  private users = new Map<string, User>();
  private wallets = new Map<string, Wallet>();
  private projects = new Map<string, Project>();
  private jobs = new Map<string, Job>();
  private ledger: LedgerEntry[] = [];
  private idem = new Set<string>();

  ensureUser(user: User): void {
    this.users.set(user.id, user);
    if (!this.wallets.has(user.id)) {
      this.wallets.set(user.id, { userId: user.id, balance: 0 });
    }
  }

  credit(userId: string, points: number, idempotencyKey: string, note = "topup"): LedgerEntry {
    if (this.idem.has(idempotencyKey)) {
      return this.ledger.find((e) => e.idempotencyKey === idempotencyKey)!;
    }
    const wallet = this.requireWallet(userId);
    wallet.balance += points;
    const entry: LedgerEntry = {
      id: makeId("led"),
      userId,
      type: "credit",
      points,
      idempotencyKey,
      note,
      createdAt: now()
    };
    this.ledger.push(entry);
    this.idem.add(idempotencyKey);
    return entry;
  }

  createProject(input: ProjectInput): Project {
    const project: Project = {
      ...input,
      createdAt: now()
    };
    this.projects.set(project.id, project);
    return project;
  }

  getProject(projectId: string): Project {
    const p = this.projects.get(projectId);
    if (!p) {
      throw new Error(`project not found: ${projectId}`);
    }
    return p;
  }

  preAuthorizeAndCreateJob(input: PreAuthorizeInput): Job {
    if (this.idem.has(input.idempotencyKey)) {
      const existing = this.jobs.get(input.jobId);
      if (!existing) {
        throw new Error("Idempotency collision without existing job");
      }
      return existing;
    }

    const wallet = this.requireWallet(input.userId);
    if (wallet.balance < input.estimatedPoints) {
      throw new Error("Insufficient points");
    }

    wallet.balance -= input.estimatedPoints;
    this.ledger.push({
      id: makeId("led"),
      userId: input.userId,
      jobId: input.jobId,
      type: "debit_hold",
      points: input.estimatedPoints,
      idempotencyKey: `${input.idempotencyKey}:hold`,
      createdAt: now()
    });

    const job: Job = {
      id: input.jobId,
      projectId: input.projectId,
      userId: input.userId,
      status: "QUEUED",
      estimatedPoints: input.estimatedPoints,
      createdAt: now(),
      updatedAt: now()
    };

    this.jobs.set(job.id, job);
    this.idem.add(input.idempotencyKey);
    return job;
  }

  settleJob(input: SettleInput): Job {
    if (this.idem.has(input.idempotencyKey)) {
      return this.requireJob(input.jobId);
    }

    const wallet = this.requireWallet(input.userId);
    const job = this.requireJob(input.jobId);

    job.settledPoints = input.actualPoints;

    if (input.actualPoints < input.holdPoints) {
      const refund = input.holdPoints - input.actualPoints;
      wallet.balance += refund;
      this.ledger.push({
        id: makeId("led"),
        userId: input.userId,
        jobId: input.jobId,
        type: "refund",
        points: refund,
        idempotencyKey: `${input.idempotencyKey}:refund`,
        createdAt: now(),
        note: "auto-refund-unused"
      });
    } else if (input.actualPoints > input.holdPoints) {
      const extra = input.actualPoints - input.holdPoints;
      if (wallet.balance < extra) {
        throw new Error("Insufficient points for settlement extra debit");
      }
      wallet.balance -= extra;
      this.ledger.push({
        id: makeId("led"),
        userId: input.userId,
        jobId: input.jobId,
        type: "debit_settle",
        points: extra,
        idempotencyKey: `${input.idempotencyKey}:extra`,
        createdAt: now(),
        note: "settlement-extra"
      });
    }

    job.updatedAt = now();
    this.idem.add(input.idempotencyKey);
    return job;
  }

  updateJobStatus(jobId: string, status: Job["status"], outputR2Key?: string, errorMessage?: string): Job {
    const job = this.requireJob(jobId);
    job.status = status;
    job.updatedAt = now();
    if (outputR2Key) {
      job.outputR2Key = outputR2Key;
    }
    if (errorMessage) {
      job.errorMessage = errorMessage;
    }
    return job;
  }

  getJob(jobId: string): Job {
    return this.requireJob(jobId);
  }

  getWallet(userId: string): Wallet {
    return this.requireWallet(userId);
  }

  getLedgerForUser(userId: string): LedgerEntry[] {
    return this.ledger.filter((x) => x.userId === userId);
  }

  private requireWallet(userId: string): Wallet {
    const wallet = this.wallets.get(userId);
    if (!wallet) {
      throw new Error(`wallet not found: ${userId}`);
    }
    return wallet;
  }

  private requireJob(jobId: string): Job {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`job not found: ${jobId}`);
    }
    return job;
  }
}
