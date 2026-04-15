The interface for [**whatcani.run**](https://whatcani.run).

## Local Development

This project uses [Next.js](https://nextjs.org) and [Bun](https://bun.sh).
Make sure those are installed.

### Installation

First, clone the repo and install dependencies:

```bash
git clone https://github.com/fiveoutofnine/whatcanirun.git
cd whatcanirun/apps/www
bun install
```

Then, set the environment variables:

```bash
cp .env.sample .env
```

<table>
  <thead>
    <tr>
      <th>Category</th>
      <th>Variable</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td rowspan="2">Base</td>
      <td><code>NEXT_PUBLIC_BASE_URL</code></td>
      <td>The base URL of the app.</td>
    </tr>
    <tr>
      <td><code>CRON_SECRET</code></td>
      <td>The secret for <a href="https://vercel.com/docs/cron-jobs" target="_blank" rel="noopener noreferrer">cron jobs</a> and internal run status actions.</td>
    </tr>
    <tr>
      <td rowspan="2">Notifications</td>
      <td><code>RUNS_TELEGRAM_BOT_TOKEN</code></td>
      <td>The Telegram bot token used for new run submission notifications.</td>
    </tr>
    <tr>
      <td><code>RUNS_TELEGRAM_CHAT_ID</code></td>
      <td>The Telegram chat ID that receives new run submission notifications.</td>
    </tr>
    <tr>
      <td rowspan="6">Auth</td>
      <td><code>BETTER_AUTH_URL</code></td>
      <td>The URL of your app for <a href="https://better-auth.com" target="_blank" rel="noopener noreferrer">Better Auth</a>.</td>
    </tr>
    <tr>
      <td><code>BETTER_AUTH_SECRET</code></td>
      <td>The secret for your app for <a href="https://better-auth.com" target="_blank" rel="noopener noreferrer">Better Auth</a>.</td>
    </tr>
    <tr>
      <td><code>AUTH_GITHUB_ID</code></td>
      <td>The ID of the GitHub OAuth app.</td>
    </tr>
    <tr>
      <td><code>AUTH_GITHUB_SECRET</code></td>
      <td>The secret for the GitHub OAuth app.</td>
    </tr>
    <tr>
      <td><code>AUTH_GOOGLE_ID</code></td>
      <td>The ID of the Google OAuth app.</td>
    </tr>
    <tr>
      <td><code>AUTH_GOOGLE_SECRET</code></td>
      <td>The secret for the Google OAuth app.</td>
    </tr>
    <tr>
      <td rowspan="1">Database</td>
      <td><code>DATABASE_URL</code></td>
      <td>The connection string for the database.</td>
    </tr>
  </tbody>
</table>

Finally, run the development server:

```bash
bun run dev
```

### Database Migrations

The project uses [Drizzle ORM](https://orm.drizzle.team) for database migrations.
See the [Drizzle docs](https://orm.drizzle.team/docs) for more information, but in general everything is done via [`drizzle-kit`](https://www.npmjs.com/package/drizzle-kit).

```bash
bunx drizzle-kit generate
bunx drizzle-kit migrate
bunx drizzle-kit push
```

To generate a new migration, use the following command:

```bash
bunx drizzle-kit generate
```

To apply the migrations, use the following command:

```bash
bunx prisma migrate dev
```

### Linting and Formatting

The project uses [ESLint](https://eslint.org) and [Prettier](https://prettier.io) for linting and formatting.
To run them, use the following command:

```bash
bun run lint
```

### Building

```bash
bun run build
```
