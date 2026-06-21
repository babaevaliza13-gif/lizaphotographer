# Vercel + GitHub CMS setup

This project does not need Firebase.

## Storage model

- Public site reads content from `/api/config`.
- Admin saves content to GitHub at `content/site.config.json`.
- Image uploads are committed to GitHub under `public/uploads`.
- Contact form sends notifications through `/api/notify`.

## Vercel build settings

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

## Required Vercel environment variables

Set these in Vercel Project Settings -> Environment Variables:

```text
GITHUB_TOKEN=
GITHUB_OWNER=
GITHUB_REPO=
GITHUB_BRANCH=main
GITHUB_CONTENT_PATH=content/site.config.json
GITHUB_UPLOAD_DIR=public/uploads
```

The GitHub token should have repository contents read/write access.

## Admin password

Default password is `12345`.

Optional stronger server-side password variables:

```text
ADMIN_PASSWORD=
ADMIN_PASSWORD_HASH=
```

If these are empty, the API checks the password hash stored in `site.config.json`.

## Telegram notifications

```text
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

## Email notifications via Resend

```text
RESEND_API_KEY=
NOTIFICATION_EMAIL=
MAIL_FROM=Liza Babaieva <hello@your-domain.com>
```

At least one notification channel must be configured: Telegram or Resend email.
