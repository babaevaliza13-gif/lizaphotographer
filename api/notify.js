export default async function handler(request, response) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
  const enquiry = {
    name: clean(body?.name),
    contact: clean(body?.contact),
    session: clean(body?.session),
    message: clean(body?.message)
  };

  if (!enquiry.name || !enquiry.contact || !enquiry.message) {
    response.status(400).json({ error: "Missing required fields" });
    return;
  }

  const text = [
    "New enquiry for Liza Babaieva",
    `Name: ${enquiry.name}`,
    `Contact: ${enquiry.contact}`,
    `Session: ${enquiry.session || "Not selected"}`,
    `Message: ${enquiry.message}`
  ].join("\n");

  const results = await Promise.allSettled([sendTelegram(text), sendEmail(enquiry, text)]);
  const delivered = results.some((result) => result.status === "fulfilled" && result.value === true);

  if (!delivered) {
    response.status(503).json({ error: "Notification channels are not configured" });
    return;
  }

  response.status(200).json({ ok: true });
}

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text })
  });
  if (!response.ok) throw new Error("Telegram failed");
  return true;
}

async function sendEmail(enquiry, text) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFICATION_EMAIL || process.env.CONTACT_EMAIL;
  const from = process.env.MAIL_FROM || "Liza Babaieva <onboarding@resend.dev>";
  if (!apiKey || !to) return false;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to,
      subject: `New ${enquiry.session || "photography"} enquiry`,
      text
    })
  });
  if (!response.ok) throw new Error("Email failed");
  return true;
}

function clean(value) {
  return String(value || "").trim().slice(0, 2000);
}
