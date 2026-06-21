export default function handler(request, response) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.status(200).json({
    github: {
      token: Boolean(process.env.GITHUB_TOKEN),
      owner: Boolean(process.env.GITHUB_OWNER),
      repo: Boolean(process.env.GITHUB_REPO),
      branch: process.env.GITHUB_BRANCH || "main",
      contentPath: process.env.GITHUB_CONTENT_PATH || "content/site.config.json",
      uploadDir: process.env.GITHUB_UPLOAD_DIR || "public/uploads"
    },
    notifications: {
      telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
      email: Boolean(process.env.RESEND_API_KEY && (process.env.NOTIFICATION_EMAIL || process.env.CONTACT_EMAIL))
    }
  });
}
