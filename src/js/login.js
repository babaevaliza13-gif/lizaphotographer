const form = document.querySelector("[data-login-form]");
const status = document.querySelector("[data-login-status]");
const button = form.querySelector("button[type='submit']");

if (sessionStorage.getItem("liza-admin-session") === "1") {
  location.replace("/admin");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = String(new FormData(form).get("password") || "").trim();
  if (!password) {
    status.textContent = "Enter the password.";
    return;
  }

  button.disabled = true;
  status.textContent = "Checking...";

  const result = await verifyRemotePassword(password);

  if (result === "ok") {
    enterAdmin(password, "remote");
    return;
  }
  if (result === "no-api") {
    // Local development without the API: open the admin in browser-only mode.
    enterAdmin(password, "local");
    return;
  }

  button.disabled = false;
  status.textContent = result === "wrong" ? "Wrong password." : "The server is not available right now. Try again in a minute.";
});

async function verifyRemotePassword(password) {
  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "x-admin-password": password }
    });
    if (response.ok) return "ok";
    if (response.status === 401) return "wrong";
    if (response.status === 404) return "no-api";
    return "error";
  } catch {
    return "no-api";
  }
}

function enterAdmin(password, mode) {
  sessionStorage.setItem("liza-admin-session", "1");
  sessionStorage.setItem("liza-admin-password", password);
  sessionStorage.setItem("liza-admin-mode", mode);
  location.replace("/admin");
}
