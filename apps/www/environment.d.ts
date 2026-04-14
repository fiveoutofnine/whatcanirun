declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Site
      NEXT_PUBLIC_BASE_URL: string;
      CRON_SECRET: string;
      RUNS_TELEGRAM_BOT_TOKEN?: string;
      RUNS_TELEGRAM_CHAT_ID?: string;
      // Auth
      BETTER_AUTH_URL: string;
      BETTER_AUTH_SECRET: string;
      AUTH_GITHUB_ID: string;
      AUTH_GITHUB_SECRET: string;
      AUTH_GOOGLE_ID: string;
      AUTH_GOOGLE_SECRET: string;
      // Database
      DATABASE_URL: string;
      // Notifications
      TELEGRAM_BOT_TOKEN?: string;
      TELEGRAM_CHAT_ID?: string;
      TELEGRAM_MESSAGE_THREAD_ID?: string;
    }
  }
}

export {};
