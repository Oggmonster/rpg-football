import type { TeamId } from "../../sim/state/MatchState";

export interface CommentaryLine {
  text: string;
  team: TeamId | null;
  priority: number;
  immediate?: boolean;
}

export class CommentaryQueue {
  private queue: CommentaryLine[] = [];
  private lastShownAtMs = 0;
  private readonly recent = new Map<string, number>();
  private activeUntilMs = 0;

  enqueue(line: CommentaryLine, nowMs: number) {
    const safeText = this.normalizeText(line.text);
    if (!safeText) return;
    const textKey = safeText.toLowerCase();
    const recentAt = this.recent.get(textKey) ?? -Infinity;
    if (nowMs - recentAt < 90_000) return;

    if (this.queue.length >= 3) {
      const weakestIdx = this.findWeakestIndex();
      if (weakestIdx < 0) return;
      if (this.queue[weakestIdx].priority > line.priority) return;
      this.queue.splice(weakestIdx, 1);
    }

    this.queue.push({ ...line, text: safeText });
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  pull(nowMs: number): CommentaryLine | null {
    if (this.queue.length === 0) return null;

    const next = this.queue[0];
    const cooldownMs = next.immediate ? 250 : 4000;
    if (nowMs - this.lastShownAtMs < cooldownMs) return null;

    this.queue.shift();
    this.lastShownAtMs = nowMs;
    this.activeUntilMs = nowMs + 1900;
    this.recent.set(this.normalizeText(next.text).toLowerCase(), nowMs);
    return next;
  }

  isActive(nowMs: number) {
    return nowMs <= this.activeUntilMs;
  }

  private findWeakestIndex() {
    if (this.queue.length === 0) return -1;
    let weakestIdx = 0;
    let weakestPriority = this.queue[0].priority;
    for (let i = 1; i < this.queue.length; i++) {
      if (this.queue[i].priority < weakestPriority) {
        weakestPriority = this.queue[i].priority;
        weakestIdx = i;
      }
    }
    return weakestIdx;
  }

  private normalizeText(value: unknown) {
    if (typeof value !== "string") return "";
    return value.trim();
  }
}
