import { after } from 'next/server';

import { RunStatus } from '@/lib/db/schema';

import { createUpdateRunStatusActionUrl } from '@/app/api/_/update-run-status/run-status';

const TELEGRAM_API_BASE_URL = 'https://api.telegram.org';
const TELEGRAM_TIMEOUT_MS = 5_000;
const OPEN_GRAPH_WARMUP_ATTEMPTS = 5;
const OPEN_GRAPH_WARMUP_DELAY_MS = 1_500;
const OPEN_GRAPH_WARMUP_TIMEOUT_MS = 5_000;

interface TelegramInlineButton {
  text: string;
  url: string;
}

interface ScheduleRunTelegramNotificationOptions {
  buttons?: TelegramInlineButton[];
  warmUrl?: string;
}

export function scheduleNewRunSubmittedNotification(runId: string, runUrl: string): void {
  const verifyActionUrl = createUpdateRunStatusActionUrl(runId, RunStatus.VERIFIED);

  scheduleRunTelegramNotification(`New run submitted:\n${runUrl}`, {
    warmUrl: runUrl,
    buttons: verifyActionUrl
      ? [
          {
            text: 'Mark verified ✅',
            url: verifyActionUrl,
          },
        ]
      : undefined,
  });
}

export function scheduleRunTelegramNotification(
  text: string,
  options: ScheduleRunTelegramNotificationOptions = {},
): void {
  try {
    after(async () => {
      try {
        await maybeWarmOpenGraphMetadata(options.warmUrl);
        await sendTelegramMessage(text, options.buttons);
      } catch {
        // Best-effort only; submission flow must not fail on notification errors.
      }
    });
  } catch {
    void (async () => {
      await maybeWarmOpenGraphMetadata(options.warmUrl);
      await sendTelegramMessage(text, options.buttons);
    })().catch(() => {
      // Best-effort only; submission flow must not fail on notification errors.
    });
  }
}

async function sendTelegramMessage(text: string, buttons?: TelegramInlineButton[]): Promise<void> {
  const botToken = process.env.RUNS_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.RUNS_TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return;
  }

  const response = await fetch(`${TELEGRAM_API_BASE_URL}/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      reply_markup:
        buttons && buttons.length > 0
          ? {
              inline_keyboard: [buttons],
            }
          : undefined,
      text,
    }),
    signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Telegram notification failed with status ${response.status}.`);
  }
}

async function maybeWarmOpenGraphMetadata(url?: string): Promise<void> {
  if (!url) return;

  for (let attempt = 0; attempt < OPEN_GRAPH_WARMUP_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'User-Agent': 'whatcanirun-og-warmup',
        },
        signal: AbortSignal.timeout(OPEN_GRAPH_WARMUP_TIMEOUT_MS),
      });

      if (response.ok) {
        const html = await response.text();
        if (hasOpenGraphMetadata(html)) {
          return;
        }
      }
    } catch {
      // Best-effort only; retry below.
    }

    if (attempt < OPEN_GRAPH_WARMUP_ATTEMPTS - 1) {
      await delay(OPEN_GRAPH_WARMUP_DELAY_MS);
    }
  }
}

function hasOpenGraphMetadata(html: string): boolean {
  return (
    html.includes('property="og:title"') &&
    html.includes('property="og:description"') &&
    html.includes('property="og:image"')
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
