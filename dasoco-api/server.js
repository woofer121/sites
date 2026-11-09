const http = require("node:http");

const PORT = process.env.PORT || 10000;
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const TO_EMAIL = process.env.CONTACT_TO || "yohan.sube@gmail.com";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://dasoco.onrender.com";
const FROM_EMAIL = process.env.RESEND_FROM || "DASOCO <onboarding@resend.dev>";
const requests = new Map();

function send(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(payload));
}

function clean(value, max) {
  return String(value || "").trim().slice(0, max);
}

async function sendWithResend({ replyTo, subject, text }) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY absente");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + RESEND_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      reply_to: replyTo,
      subject,
      text
    }),
    signal: AbortSignal.timeout(20000)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason = result.message || result.name || ("HTTP " + response.status);
    throw new Error("Resend API (" + response.status + "): " + reason);
  }
  return result;
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || "";
  if (origin && origin !== ALLOWED_ORIGIN) return send(res, 403, { error: "Origine non autorisée." });

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    });
    return res.end();
  }

  if (req.method === "GET" && req.url === "/health") {
    return send(res, 200, {
      ok: true,
      configured: Boolean(RESEND_API_KEY),
      provider: "resend"
    });
  }

  if (req.method !== "POST" || req.url !== "/api/contact") {
    return send(res, 404, { error: "Route introuvable." });
  }

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const recent = (requests.get(ip) || []).filter(t => now - t < 15 * 60 * 1000);
  if (recent.length >= 8) return send(res, 429, { error: "Trop de demandes. Réessayez dans quelques minutes." });
  recent.push(now);
  requests.set(ip, recent);

  let raw = "";
  req.on("data", chunk => {
    raw += chunk;
    if (raw.length > 12000) req.destroy();
  });
  req.on("end", async () => {
    try {
      const data = JSON.parse(raw || "{}");
      if (clean(data.website, 200)) return send(res, 200, { ok: true });

      const name = clean(data.name, 120);
      const company = clean(data.company, 160);
      const email = clean(data.email, 254);
      const need = clean(data.need, 5000);
      if (!name || !need || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
        return send(res, 400, { error: "Merci de vérifier les champs obligatoires." });
      }
      if (!RESEND_API_KEY) {
        return send(res, 503, { error: "Le service d'envoi n'est pas encore configuré." });
      }

      const result = await sendWithResend({
        replyTo: email,
        subject: "Demande de contact DASOCO - " + (company || name).replace(/[\\r\\n]+/g, " "),
        text: "Nouvelle demande depuis le site DASOCO\\n\\nNom : " + name +
          "\\nEntreprise : " + (company || "Non précisée") +
          "\\nE-mail : " + email + "\\n\\nBesoin :\\n" + need
      });
      console.log("Contact email accepted by Resend:", result.id || "id indisponible");
      return send(res, 200, { ok: true });
    } catch (error) {
      console.error("Contact endpoint error:", error?.stack || error?.message || String(error));
      return send(res, 502, { error: "L'envoi a échoué. Réessayez ou contactez-nous directement." });
    }
  });
});

server.listen(PORT, "0.0.0.0", () => console.log("DASOCO contact API listening on " + PORT));
