const http = require("node:http");

const PORT = process.env.PORT || 10000;
const API_KEY = process.env.RESEND_API_KEY;
const TO_EMAIL = process.env.CONTACT_TO || "yohan.sube@gmail.com";
const FROM_EMAIL = process.env.CONTACT_FROM || "";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://dasoco.onrender.com";
const requests = new Map();

function send(res, status, payload, origin) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": origin || ALLOWED_ORIGIN,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(payload));
}

function clean(value, max) {
  return String(value || "").trim().slice(0, max);
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || "";
  if (origin && origin !== ALLOWED_ORIGIN) return send(res, 403, { error: "Origine non autorisée." }, ALLOWED_ORIGIN);

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
    return send(res, 200, { ok: true, configured: Boolean(API_KEY && FROM_EMAIL) }, ALLOWED_ORIGIN);
  }

  if (req.method !== "POST" || req.url !== "/api/contact") {
    return send(res, 404, { error: "Route introuvable." }, ALLOWED_ORIGIN);
  }

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const recent = (requests.get(ip) || []).filter(t => now - t < 15 * 60 * 1000);
  if (recent.length >= 8) return send(res, 429, { error: "Trop de demandes. Réessayez dans quelques minutes." }, ALLOWED_ORIGIN);
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
      // Champ piège anti-robots : un formulaire normal le laisse vide.
      if (clean(data.website, 200)) return send(res, 200, { ok: true }, ALLOWED_ORIGIN);

      const name = clean(data.name, 120);
      const company = clean(data.company, 160);
      const email = clean(data.email, 254);
      const need = clean(data.need, 5000);
      if (!name || !need || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return send(res, 400, { error: "Merci de vérifier les champs obligatoires." }, ALLOWED_ORIGIN);
      }
      if (!API_KEY || !FROM_EMAIL) {
        return send(res, 503, { error: "Le service d'envoi n'est pas encore configuré." }, ALLOWED_ORIGIN);
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [TO_EMAIL],
          reply_to: email,
          subject: "Demande de contact DASOCO - " + (company || name),
          text: "Nouvelle demande depuis le site DASOCO\n\nNom : " + name +
            "\nEntreprise : " + (company || "Non précisée") +
            "\nE-mail : " + email + "\n\nBesoin :\n" + need
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error("Resend error:", response.status, result);
        return send(res, 502, { error: "L'envoi a échoué. Réessayez ou contactez-nous directement." }, ALLOWED_ORIGIN);
      }
      return send(res, 200, { ok: true }, ALLOWED_ORIGIN);
    } catch (error) {
      console.error("Contact endpoint error:", error);
      return send(res, 400, { error: "La demande n'a pas pu être traitée." }, ALLOWED_ORIGIN);
    }
  });
});

server.listen(PORT, "0.0.0.0", () => console.log("DASOCO contact API listening on " + PORT));
