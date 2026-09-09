import type { ObservationEventV1 } from "./contract";
import { validateObservationEvent } from "./contract";

export type ObservationSink = (
  events: readonly ObservationEventV1[],
) => void | Promise<void>;

export interface ObservationQueueOptions {
  sink: ObservationSink;
  capacity?: number;
  maxBatch?: number;
  sampleRate?: number;
  dedupeWindowMs?: number;
  maxRetries?: number;
  sinkTimeoutMs?: number;
  random?: () => number;
  now?: () => number;
  delay?: (milliseconds: number) => Promise<void>;
}

export interface ObservationQueueStats {
  accepted: number;
  sampledOut: number;
  deduplicated: number;
  dropped: number;
  delivered: number;
  sinkFailures: number;
  queued: number;
}

export class ObservationQueue {
  private readonly sink: ObservationSink;
  private readonly capacity: number;
  private readonly maxBatch: number;
  private readonly sampleRate: number;
  private readonly dedupeWindowMs: number;
  private readonly maxRetries: number;
  private readonly sinkTimeoutMs: number;
  private readonly random: () => number;
  private readonly now: () => number;
  private readonly delay: (milliseconds: number) => Promise<void>;
  private readonly queue: ObservationEventV1[] = [];
  private readonly recent = new Map<string, number>();
  private flushing: Promise<void> | null = null;
  private totals = {
    accepted: 0,
    sampledOut: 0,
    deduplicated: 0,
    dropped: 0,
    delivered: 0,
    sinkFailures: 0,
  };

  constructor(options: ObservationQueueOptions) {
    this.sink = options.sink;
    this.capacity = Math.max(1, Math.min(options.capacity ?? 32, 256));
    this.maxBatch = Math.max(1, Math.min(options.maxBatch ?? 8, 32));
    this.sampleRate = Math.max(0, Math.min(options.sampleRate ?? 1, 1));
    this.dedupeWindowMs = Math.max(0, options.dedupeWindowMs ?? 60_000);
    this.maxRetries = Math.max(0, Math.min(options.maxRetries ?? 2, 3));
    this.sinkTimeoutMs = Math.max(10, options.sinkTimeoutMs ?? 1_000);
    this.random = options.random ?? Math.random;
    this.now = options.now ?? Date.now;
    this.delay =
      options.delay ??
      ((milliseconds) =>
        new Promise((resolve) => setTimeout(resolve, milliseconds)));
  }

  enqueue(event: ObservationEventV1): boolean {
    if (!validateObservationEvent(event)) return false;
    if (this.random() >= this.sampleRate) {
      this.totals.sampledOut += 1;
      return false;
    }
    const now = this.now();
    const duplicateAt = this.recent.get(event.fingerprint);
    if (duplicateAt !== undefined && now - duplicateAt <= this.dedupeWindowMs) {
      this.totals.deduplicated += 1;
      const pending = this.queue.find(
        (candidate) => candidate.fingerprint === event.fingerprint,
      );
      if (pending) pending.count = Math.min(999, pending.count + 1);
      return false;
    }
    this.recent.set(event.fingerprint, now);
    if (this.recent.size > this.capacity * 4)
      for (const [key, timestamp] of this.recent)
        if (now - timestamp > this.dedupeWindowMs) this.recent.delete(key);
    if (this.queue.length >= this.capacity) {
      this.totals.dropped += 1;
      return false;
    }
    this.queue.push({ ...event });
    this.totals.accepted += 1;
    return true;
  }

  flush(): Promise<void> {
    if (this.flushing) return this.flushing;
    this.flushing = this.flushInternal().finally(() => {
      this.flushing = null;
    });
    return this.flushing;
  }

  snapshot(): ObservationQueueStats {
    return { ...this.totals, queued: this.queue.length };
  }

  pending(): readonly ObservationEventV1[] {
    return this.queue.map((event) => ({ ...event }));
  }

  clear() {
    this.queue.length = 0;
    this.recent.clear();
  }

  private async flushInternal() {
    while (this.queue.length) {
      const batch = this.queue.splice(0, this.maxBatch);
      let delivered = false;
      for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
        try {
          await this.deliverWithTimeout(batch);
          this.totals.delivered += batch.length;
          delivered = true;
          break;
        } catch {
          this.totals.sinkFailures += 1;
          if (attempt < this.maxRetries) await this.delay(25 * 2 ** attempt);
        }
      }
      if (!delivered) this.totals.dropped += batch.length;
    }
  }

  private deliverWithTimeout(batch: readonly ObservationEventV1[]) {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("observation_sink_timeout")),
        this.sinkTimeoutMs,
      );
      Promise.resolve()
        .then(() => this.sink(batch))
        .then(resolve, reject)
        .finally(() => clearTimeout(timeout));
    });
  }
}
