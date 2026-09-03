# Vercel + GitHub CMS setup

The site is a static Vite build plus a few Vercel serverless functions in `api/`.

## How content flows

- `content/site.config.json` is the single source of truth (texts, projects, photos, theme).
- At build time `scripts/build-content.mjs` bakes that file into the bundle
  (`src/js/site.content.js`, generated, git-ignored), so pages render instantly
  without waiting for an API call.
- The admin panel (`/admin`) reads and writes the same file through `/api/config`
  and commits it to GitHub. Uploaded photos are committed to `public/uploads/`.
- Every commit triggers a Vercel rebuild, so published changes appear online
  about a minute after saving.
- Photos are resized to max 2000 px and converted to WebP in the browser before upload.

## Local development

```text
npm install
npm run dev        # site on http://127.0.0.1:5178 (admin works in browser-only mode)
npm run build
npm run preview
```

`vite dev` has no serverless functions, so uploads and publishing need either
`vercel dev` (with a `.env` based on `.env.example`) or the deployed admin.

## Vercel build settings

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

## Required Vercel environment variables

Project Settings -> Environment Variables:

```text
GITHUB_TOKEN=            # fine-grained token with Contents: read/write on this repo
GITHUB_OWNER=babaevaliza13-gif
GITHUB_REPO=lizaphotographer
GITHUB_BRANCH=main
GITHUB_CONTENT_PATH=content/site.config.json
GITHUB_UPLOAD_DIR=public/uploads
```

## Admin password

The initial password is `12345`. Change it in Admin -> Security; the hash is stored in
`site.config.json` and the old password stops working immediately.

Optional overrides (take precedence over the stored hash):

```text
ADMIN_PASSWORD=
ADMIN_PASSWORD_HASH=      # sha256 hex
```

## Notifications for the contact form

Telegram:

```text
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

Email via Resend:

```text
RESEND_API_KEY=
NOTIFICATION_EMAIL=
MAIL_FROM=Liza Babaieva <hello@your-domain.com>
```

At least one channel must be configured, otherwise the form reports an error to the visitor.
