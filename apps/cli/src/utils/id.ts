import { randomBytes } from "crypto";

export function generateBundleId(): string {
  return randomBytes(3).toString("hex");
}

export function formatTimestamp(date: Date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, "-").replace("Z", "Z");
}

export function bundleFilename(timestamp: string, bundleId: string): string {
  return `whatcanirun_${timestamp}_${bundleId}.zip`;
}
