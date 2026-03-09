export async function getProcessRSS(pid: number): Promise<number> {
  try {
    const proc = Bun.spawn(["ps", "-o", "rss=", "-p", String(pid)], {
      stdout: "pipe",
      stderr: "ignore",
    });
    const output = (await new Response(proc.stdout).text()).trim();
    await proc.exited;
    const rssKb = parseInt(output, 10);
    if (isNaN(rssKb)) return 0;
    return rssKb / 1024; // Convert KB to MB
  } catch {
    return 0;
  }
}

export class MemoryTracker {
  private peakMb = 0;
  private idleMb = 0;
  private interval: ReturnType<typeof setInterval> | null = null;

  async captureIdle(pid: number): Promise<void> {
    // Wait for model to settle, then measure idle RSS
    await new Promise((r) => setTimeout(r, 2000));
    this.idleMb = await getProcessRSS(pid);
  }

  startTracking(pid: number, intervalMs = 100): void {
    this.interval = setInterval(async () => {
      const rss = await getProcessRSS(pid);
      if (rss > this.peakMb) {
        this.peakMb = rss;
      }
    }, intervalMs);
  }

  stopTracking(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  getIdleMb(): number {
    return Math.round(this.idleMb * 10) / 10;
  }

  getPeakMb(): number {
    return Math.round(this.peakMb * 10) / 10;
  }
}
