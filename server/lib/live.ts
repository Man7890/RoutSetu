import type { Destination } from "../../shared/types.ts";
import { crowdFromVisitors } from "../../shared/seed.ts";
import type { Repo } from "./repo.ts";

/**
 * Prototype Live Simulation.
 * Crowd values are synthetic: a baseline + a smoothed random walk + any user-triggered surge.
 * They are never presented as real visitor counts.
 */
export class LiveCrowd {
  private dests = new Map<string, Destination>();
  private noise = new Map<string, number>();
  private surge = new Map<string, number>();
  private timer?: NodeJS.Timeout;
  updatedAt = new Date();

  constructor(private repo: Repo) {}

  async init() {
    const list = await this.repo.listDestinations();
    list.forEach((d) => {
      this.dests.set(d.id, d);
      const baseCrowd = (d.baseVisitors / d.capacity) * 100;
      const extra = d.crowdScore - Math.round(baseCrowd);
      if (extra > 3) this.surge.set(d.id, extra);
    });
    this.recompute();
    this.timer = setInterval(() => this.tick(), 8000);
    this.timer.unref?.();
  }

  private recompute() {
    for (const d of this.dests.values()) {
      const pts = (d.baseVisitors / d.capacity) * 100 + (this.noise.get(d.id) ?? 0) + (this.surge.get(d.id) ?? 0);
      const visitors = Math.max(0, Math.min(d.capacity, Math.round((pts / 100) * d.capacity)));
      d.currentVisitors = visitors;
      d.crowdScore = crowdFromVisitors(visitors, d.capacity);
    }
    this.updatedAt = new Date();
  }

  tick() {
    for (const d of this.dests.values()) {
      const n = this.noise.get(d.id) ?? 0;
      const next = Math.max(-3, Math.min(3, n * 0.85 + (Math.random() - 0.5) * 1.6));
      this.noise.set(d.id, next);
    }
    this.recompute();
  }

  list(): Destination[] {
    return [...this.dests.values()].map((d) => ({ ...d }));
  }
  get(id: string): Destination | undefined {
    const d = this.dests.get(id);
    return d ? { ...d } : undefined;
  }

  async applySurge(id: string, opts: { points?: number; target?: number }) {
    const d = this.dests.get(id);
    if (!d) throw new Error("Unknown destination");
    const before = d.crowdScore;
    const add = opts.target != null ? opts.target - before : (opts.points ?? 0);
    this.surge.set(id, (this.surge.get(id) ?? 0) + add);
    this.noise.set(id, 0);
    this.recompute();
    await this.repo.updateVisitors(id, d.currentVisitors, d.crowdScore, "SIMULATION");
    return { before, after: this.get(id)! };
  }

  async report(id: string, crowdScore: number) {
    const d = this.dests.get(id);
    if (!d) throw new Error("Unknown destination");
    const base = (d.baseVisitors / d.capacity) * 100;
    this.surge.set(id, crowdScore - base);
    this.noise.set(id, 0);
    this.recompute();
    await this.repo.updateVisitors(id, d.currentVisitors, d.crowdScore, "USER_REPORT");
    return this.get(id)!;
  }

  async reset() {
    this.surge.clear();
    this.noise.clear();
    this.recompute();
    await Promise.all(
      [...this.dests.values()].map((d) => this.repo.updateVisitors(d.id, d.currentVisitors, d.crowdScore, "SIMULATION")),
    );
  }
}
