const http = require("node:http");
const tls = require("node:tls");

const PORT = process.env.PORT || 10000;
const GMAIL_USER = process.env.GMAIL_USER || "";
const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD || "").replace(/\s/g, "");
const TO_EMAIL = process.env.CONTACT_TO || GMAIL_USER;
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

function smtpReplyReader(socket) {
  let buffer = "";
  const lines = [];
  const waiters = [];
  function flush() {
    while (waiters.length && lines.some(line => /^\d{3} /.test(line))) {
      const waiter = waiters.shift();
      const end = lines.findIndex(line => /^\d{3} /.test(line));
      waiter.resolve(lines.splice(0, end + 1));
    }
  }
  socket.on("data", chunk => {
    buffer += chunk.toString("utf8");
    const parts = buffer.split(/\r?\n/);
    buffer = parts.pop();
    for (const line of parts) if (line) lines.push(line);
    flush();
  });
  return () => new Promise((resolve, reject) => {
    const waiter = { resolve, reject };
    waiters.push(waiter);
    flush();
    socket.once("error", reject);
    socket.once("close", () => reject(new Error("Connexion SMTP fermée")));
  });
}

async function sendGmail({ to, replyTo, subject, text }) {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) throw new Error("Configuration Gmail absente");
  const socket = tls.connect({ host: "smtp.gmail.com", port: 465, servername: "smtp.gmail.com" });
  socket.setTimeout(15000, () => socket.destroy(new Error("Délai SMTP dépassé")));
  const readReply = smtpReplyReader(socket);
  const expect = async (codes, command) => {
    if (command) socket.write(command + "\r\n");
    const lines = await readReply();
    const code = Number(lines[lines.length - 1].slice(0, 3));
    if (!codes.includes(code)) throw new Error("Réponse SMTP inattendue : " + code);
  };
  try {
    await new Promise((resolve, reject) => {
      socket.once("secureConnect", resolve);
      socket.once("error", reject);
    });
    await expect([220]);
    await expect([250], "EHLO dasoco.onrender.com");
    await expect([334], "AUTH LOGIN");
    await expect([334], Buffer.from(GMAIL_USER).toString("base64"));
    await expect([235], Buffer.from(GMAIL_APP_PASSWORD).toString("base64"));
    await expect([250], "MAIL FROM:<" + GMAIL_USER + ">");
    await expect([250, 251], "RCPT TO:<" + to + ">");
    await expect([354], "DATA");

    const encodedSubject = "=?UTF-8?B?" + Buffer.from(subject).toString("base64") + "?=";
    const encodedBody = Buffer.from(text, "utf8").toString("base64").match(/.{1,76}/g).join("\r\n");
    const message = [
      "From: DASOCO <" + GMAIL_USER + ">",
      "To: <" + to + ">",
      "Reply-To: <" + replyTo + ">",
      "Subject: " + encodedSubject,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      encodedBody,
      "."
    ].join("\r\n");
    await expect([250], message);
    await expect([221], "QUIT");
  } finally {
    socket.end();
  }
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
    return send(res, 200, { ok: true, configured: Boolean(GMAIL_USER && GMAIL_APP_PASSWORD) }, ALLOWED_ORIGIN);
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
      if (clean(data.website, 200)) return send(res, 200, { ok: true }, ALLOWED_ORIGIN);

      const name = clean(data.name, 120);
      const company = clean(data.company, 160);
      const email = clean(data.email, 254);
      const need = clean(data.need, 5000);
      if (!name || !need || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return send(res, 400, { error: "Merci de vérifier les champs obligatoires." }, ALLOWED_ORIGIN);
      }
      if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
        return send(res, 503, { error: "Le service d'envoi n'est pas encore configuré." }, ALLOWED_ORIGIN);
      }

      await sendGmail({
        to: TO_EMAIL,
        replyTo: email,
        subject: "Demande de contact DASOCO - " + (company || name),
        text: "Nouvelle demande depuis le site DASOCO\n\nNom : " + name +
          "\nEntreprise : " + (company || "Non précisée") +
          "\nE-mail : " + email + "\n\nBesoin :\n" + need
      });
      return send(res, 200, { ok: true }, ALLOWED_ORIGIN);
    } catch (error) {
      console.error("Contact endpoint error:", error?.stack || error?.message || String(error));
      return send(res, 502, { error: "L'envoi a échoué. Réessayez ou contactez-nous directement." }, ALLOWED_ORIGIN);
    }
  });
});

server.listen(PORT, "0.0.0.0", () => console.log("DASOCO contact API listening on " + PORT));
