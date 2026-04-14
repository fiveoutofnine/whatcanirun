import { after } from 'next/server';

const TELEGRAM_API_BASE_URL = 'https://api.telegram.org';
const TELEGRAM_TIMEOUT_MS = 5_000;

export function scheduleNewRunSubmittedNotification(runUrl: string): void {
  scheduleRunTelegramNotification(`New run submitted: ${runUrl}`);
}

export function scheduleRunTelegramNotification(text: string): void {
  try {
    after(async () => {
      try {
        await sendTelegramMessage(text);
      } catch {
        // Best-effort only; submission flow must not fail on notification errors.
      }
    });
  } catch {
    void sendTelegramMessage(text).catch(() => {
      // Best-effort only; submission flow must not fail on notification errors.
    });
  }
}

async function sendTelegramMessage(text: string): Promise<void> {
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
      text,
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Telegram notification failed with status ${response.status}.`);
  }
}
