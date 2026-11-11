"use strict";
const http = require("node:http");
const crypto = require("node:crypto");
const { Pool } = require("pg");

const PORT = Number(process.env.PORT || 10000);
const ALLOWED_ORIGIN = "https://dasoco.onrender.com";
const ADMIN_SECRET = process.env.ANALYTICS_ADMIN_SECRET || "";
const DB_URL = process.env.DATABASE_URL || "";
const pool = DB_URL ? new Pool({ connectionString: DB_URL, max: 4, idleTimeoutMillis: 20000, connectionTimeoutMillis: 12000, ssl: { rejectUnauthorized: true } }) : null;
const rate = new Map();
let lastCleanup = 0;

function respond(res, status, data, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders
  });
  res.end(JSON.stringify(data));
}
function equalSecret(a, b) {
  if (!a || !b) return false;
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function constrained(v, max, re) {
  const x = typeof v === "string" ? v.slice(0, max) : "";
  return re.test(x) ? x : "";
}
async function readJson(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk.toString("utf8");
    if (raw.length > 1800) throw new Error("Payload trop volumineux");
  }
  return JSON.parse(raw || "{}");
}
function throttle(req) {
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0];
  const now = Date.now();
  const history = (rate.get(ip) || []).filter(v => now - v < 60000);
  if (history.length > 90) return false;
  history.push(now);
  rate.set(ip, history);
  if (rate.size > 3000) for (const [key, values] of rate) if (values.at(-1) < now - 60000) rate.delete(key);
  return true;
}
async function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 86400000 || !pool) return;
  lastCleanup = now;
  try { await pool.query("DELETE FROM analytics_events WHERE occurred_at < now() - interval '90 days'"); }
  catch (error) { console.error("Stats retention:", error.message); }
}
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url || "/", "http://localhost").pathname;
  const origin = req.headers.origin;
  if (req.method === "OPTIONS") {
    return origin === ALLOWED_ORIGIN ? respond(res, 204, {}) : respond(res, 403, { error: "Origine interdite" });
  }
  if (req.method === "GET" && pathname === "/health") {
    if (!pool) return respond(res, 503, { ok: false, reason: "database not configured" });
    try { await pool.query("SELECT 1"); return respond(res, 200, { ok: true, service: "dasoco-analytics" }); }
    catch (error) { console.error("Health DB:", error.message); return respond(res, 503, { ok: false, reason: "database unavailable" }); }
  }
  if (origin !== ALLOWED_ORIGIN) return respond(res, 403, { error: "Origine interdite" });
  if (!pool) return respond(res, 503, { error: "Service non configuré" });

  if (req.method === "POST" && pathname === "/api/collect") {
    if (!throttle(req)) return respond(res, 429, { error: "Trop de requêtes" });
    try {
      const body = await readJson(req);
      const page = constrained(body.path, 240, /^\/[a-zA-Z0-9/_\-.]*$/);
      if (!page || page.startsWith("/stats")) return respond(res, 400, { error: "Page invalide" });
      const validSource = ["direct", "google", "linkedin", "bing", "facebook", "instagram", "autre"];
      const source = validSource.includes(body.source) ? body.source : "autre";
      const campaign = constrained(body.campaign, 100, /^[a-zA-Z0-9_\- .]*$/);
      await pool.query(
        "INSERT INTO analytics_events (page_path, traffic_source, campaign, is_visit) VALUES ($1, $2, $3, $4)",
        [page, source, campaign, body.visit === true]
      );
      void cleanup();
      return respond(res, 202, { ok: true });
    } catch (error) {
      console.error("Collect error:", error.message);
      return respond(res, 400, { error: "Événement invalide" });
    }
  }
  if (req.method === "GET" && pathname === "/api/summary") {
    const provided = String(req.headers.authorization || "").replace(/^Bearer /i, "");
    if (!equalSecret(provided, ADMIN_SECRET)) return respond(res, 401, { error: "Code d'accès incorrect" });
    try {
      const parsed = new URL(req.url, "http://localhost");
      const days = [7, 30, 90].includes(Number(parsed.searchParams.get("days"))) ? Number(parsed.searchParams.get("days")) : 30;
      const period = "WHERE occurred_at >= now() - make_interval(days => $1::int)";
      const [totals, daily, pages, sources, campaigns] = await Promise.all([
        pool.query("SELECT count(*)::int AS pageviews, coalesce(sum(is_visit::int), 0)::int AS visits FROM analytics_events " + period, [days]),
        pool.query("SELECT to_char(occurred_at AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD') AS date, count(*)::int AS pageviews, coalesce(sum(is_visit::int),0)::int AS visits FROM analytics_events " + period + " GROUP BY date ORDER BY date", [days]),
        pool.query("SELECT page_path AS name, count(*)::int AS pageviews FROM analytics_events " + period + " GROUP BY page_path ORDER BY pageviews DESC LIMIT 15", [days]),
        pool.query("SELECT traffic_source AS name, count(*)::int AS pageviews, coalesce(sum(is_visit::int),0)::int AS visits FROM analytics_events " + period + " GROUP BY traffic_source ORDER BY visits DESC, pageviews DESC", [days]),
        pool.query("SELECT campaign AS name, count(*)::int AS pageviews, coalesce(sum(is_visit::int),0)::int AS visits FROM analytics_events " + period + " AND campaign <> '' GROUP BY campaign ORDER BY visits DESC, pageviews DESC LIMIT 10", [days])
      ]);
      return respond(res, 200, { days, total: totals.rows[0], daily: daily.rows, pages: pages.rows, sources: sources.rows, campaigns: campaigns.rows, updatedAt: new Date().toISOString() });
    } catch (error) {
      console.error("Summary error:", error.message);
      return respond(res, 503, { error: "Données temporairement indisponibles" });
    }
  }
  return respond(res, 404, { error: "Route inconnue" });
});
server.listen(PORT, "0.0.0.0", () => console.log("DASOCO Analytics API listening on", PORT));
