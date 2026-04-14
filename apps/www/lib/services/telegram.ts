import { after } from 'next/server';

const TELEGRAM_API_BASE_URL = 'https://api.telegram.org';
const TELEGRAM_TIMEOUT_MS = 5_000;

type TelegramMessageOptions = {
  botToken?: string;
  chatId?: string;
  text: string;
  parseMode?: 'HTML' | 'MarkdownV2';
  disableWebPagePreview?: boolean;
  messageThreadId?: number;
};

export function scheduleNewRunSubmittedNotification(runUrl: string): void {
  scheduleTelegramMessage({
    botToken: process.env.RUNS_TELEGRAM_BOT_TOKEN,
    chatId: process.env.RUNS_TELEGRAM_CHAT_ID,
    text: `New run submitted: ${runUrl}`,
  });
}

export function scheduleTelegramMessage(options: TelegramMessageOptions): void {
  try {
    after(async () => {
      try {
        await sendTelegramMessage(options);
      } catch {
        // Best-effort only; submission flow must not fail on notification errors.
      }
    });
  } catch {
    void sendTelegramMessage(options).catch(() => {
      // Best-effort only; submission flow must not fail on notification errors.
    });
  }
}

export async function sendTelegramMessage({
  botToken,
  chatId,
  text,
  parseMode,
  disableWebPagePreview = true,
  messageThreadId,
}: TelegramMessageOptions): Promise<void> {

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
      disable_web_page_preview: disableWebPagePreview,
      ...(parseMode ? { parse_mode: parseMode } : {}),
      ...(messageThreadId ? { message_thread_id: messageThreadId } : {}),
    }),
    signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Telegram notification failed with status ${response.status}.`);
  }
}
