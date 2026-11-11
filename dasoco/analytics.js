/* DASOCO – comptage interne, sans cookie ni identifiant transmis au serveur. */
(function () {
  "use strict";
  if (location.hostname !== "dasoco.onrender.com" || location.pathname.startsWith("/stats")) return;
  if (navigator.globalPrivacyControl === true || navigator.doNotTrack === "1") return;
  try {
    var now = Date.now();
    var params = new URLSearchParams(location.search);
    var refHost = "";
    try { refHost = new URL(document.referrer).hostname.toLowerCase(); } catch (_) {}
    var source = "direct";
    var rawUtm = (params.get("utm_source") || "").toLowerCase();
    var candidate = rawUtm || refHost;
    if (/linkedin|lnkd/.test(candidate)) source = "linkedin";
    else if (/google/.test(candidate)) source = "google";
    else if (/bing/.test(candidate)) source = "bing";
    else if (/facebook|fb\./.test(candidate)) source = "facebook";
    else if (/instagram/.test(candidate)) source = "instagram";
    else if (candidate && candidate !== "dasoco.onrender.com") source = "autre";
    var last = Number(sessionStorage.getItem("dasoco_stats_last") || 0);
    var newVisit = !last || now - last > 30 * 60000;
    if (newVisit) sessionStorage.setItem("dasoco_stats_source", source);
    else source = sessionStorage.getItem("dasoco_stats_source") || source;
    sessionStorage.setItem("dasoco_stats_last", String(now));
    var campaign = (params.get("utm_campaign") || "").slice(0, 100);
    fetch("https://dasoco-analytics.onrender.com/api/collect", {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: location.pathname, source: source, campaign: campaign, visit: newVisit })
    }).catch(function () {});
  } catch (_) {}
})();
