#!/usr/bin/env python3
"""DASOCO: real demo screencast -> public MP4 -> native LinkedIn via Buffer.
No posting is attempted without BUFFER_API_KEY and confirmed DASOCO page.
"""
import datetime as dt
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "dasoco"
DEST = SITE / "media" / "linkedin"
ZONE = ZoneInfo("Europe/Paris")
API = "https://api.buffer.com"
BASE = "https://dasoco.onrender.com"
DAY_MAP = {0: 0, 2: 1, 4: 2}

DEMOS = [
    {
        "slug": "mini-gmao",
        "path": "demos/mini-gmao.html",
        "title": "Une panne. Qui intervient ?",
        "subtitle": "Équipements · Interventions · Préventif",
        "actions": [
            "button[data-p='equipment']",
            "button[data-p='orders']",
            "button[data-p='maintenance']",
            "button[data-p='dashboard']",
        ],
        "captions": [
            "🔧 Une panne, plusieurs intervenants, des informations éparpillées ?\n\nNotre mini-GMAO de démonstration montre comment retrouver les équipements, suivre les interventions et anticiper les échéances dans un seul outil.\n\n🎬 Découvrez la démonstration, puis testez-la :\n",
            "⚙️ Savoir ce qui est en panne, ce qui est prévu et ce qui reste à faire : cela devrait être simple.\n\nDans ce prototype DASOCO, explorez les équipements, les interventions et le planning de maintenance.\n\n🎬 Essayez vous-même :\n",
            "🛠️ Les interventions ne devraient pas se perdre entre fichiers et messages.\n\nVoici notre mini-GMAO de démonstration : différents écrans, une information plus facile à retrouver.\n\n🎬 Démonstration interactive :\n",
        ],
    },
    {
        "slug": "suivi-demandes",
        "path": "demos/suivi-demandes.html",
        "title": "Où en est la demande ?",
        "subtitle": "Signalement · Suivi · Visibilité",
        "actions": ["button.tab:nth-of-type(2)", "button.tab:nth-of-type(3)", "button.tab:nth-of-type(1)"],
        "captions": [
            "📋 « Où en est ma demande ? »\n\nUn outil adapté peut rendre le suivi des interventions beaucoup plus lisible. Nous avons créé un simulateur pour illustrer cette approche.\n\n🎬 Découvrez-le et testez-le :\n",
            "🔎 Une demande reçue, une intervention en cours, une action clôturée…\n\nQuand l'information est structurée au même endroit, chacun peut mieux suivre le processus. Voici notre prototype interactif.\n\n🎬 Testez :\n",
            "📌 Besoin de suivre des demandes sans faire circuler dix versions d'un tableau ?\n\nVoici ce que peut apporter un petit outil métier conçu autour du processus.\n\n🎬 Simulation :\n",
        ],
    },
    {
        "slug": "tableau-de-bord",
        "path": "demos/tableau-de-bord.html",
        "title": "Des chiffres enfin utiles",
        "subtitle": "Filtres · Indicateurs · Décisions",
        "actions": ["select#period", "select#period"],
        "captions": [
            "📊 Un tableau de bord doit répondre à des questions concrètes, pas seulement afficher des graphiques.\n\nNotre démonstration permet de filtrer les informations et de suivre des indicateurs qui évoluent ensemble.\n\n🎬 Explorez-le :\n",
            "🎯 Quels indicateurs sont réellement utiles à votre activité ?\n\nVoici une démonstration d'un tableau de bord interactif imaginé autour d'un besoin métier.\n\n🎬 Testez les filtres :\n",
            "📈 Moins de chiffres dispersés, plus de visibilité sur l'activité.\n\nDécouvrez notre prototype de tableau de bord, et imaginez les informations qui seraient pertinentes pour votre entreprise.\n\n🎬 Démonstration :\n",
        ],
    },
]

def gql(query):
    token = os.environ.get("BUFFER_API_KEY", "")
    if not token:
        raise RuntimeError("BUFFER_API_KEY absent : aucun envoi possible.")
    request = urllib.request.Request(
        API,
        data=json.dumps({"query": query}).encode("utf-8"),
        headers={"Authorization": "Bearer " + token,
                 "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=40) as response:
        payload = json.load(response)
    if payload.get("errors"):
        raise RuntimeError("Buffer GraphQL : " + str(payload["errors"])[:600])
    return payload.get("data", {})

def q(value):
    return json.dumps(str(value), ensure_ascii=False)

def target_slot():
    now = dt.datetime.now(ZONE)
    for shift in range(9):
        day = now.date() + dt.timedelta(days=shift)
        if day.weekday() not in DAY_MAP:
            continue
        when = dt.datetime.combine(day, dt.time(10, 0), ZONE)
        if when > now + dt.timedelta(hours=2):
            return when
    raise RuntimeError("Aucun créneau dans les neuf prochains jours")

def dasoco_channel():
    acc = gql("query { account { organizations { id } } }")
    orgs = acc.get("account", {}).get("organizations", [])
    for org in orgs:
        org_id = org["id"]
        res = gql("query { channels(input: {organizationId: " + q(org_id)
                  + "}) { id name displayName service isQueuePaused } }")
        for channel in res.get("channels", []):
            identity = (str(channel.get("name", "")) + " " +
                        str(channel.get("displayName", ""))).lower()
            if str(channel.get("service", "")).lower() == "linkedin" and "dasoco" in identity:
                if channel.get("isQueuePaused"):
                    raise RuntimeError("File DASOCO en pause dans Buffer.")
                return org_id, channel["id"]
    raise RuntimeError("Page LinkedIn DASOCO introuvable dans les canaux Buffer ; aucune autre page ne sera utilisée.")

def existing_slot(org_id, channel_id, when):
    result = gql(
        "query { posts(first: 100, input: {organizationId: " + q(org_id)
        + ", filter: {status: [scheduled, sent], channelIds: ["
        + q(channel_id) + "]}}) { edges { node { id dueAt status } }"
        + " pageInfo { hasNextPage } } }"
    )
    posts = result.get("posts", {})
    if posts.get("pageInfo", {}).get("hasNextPage"):
        raise RuntimeError("Liste Buffer paginée : arrêt pour éviter un doublon.")
    for item in posts.get("edges", []):
        node = item.get("node", {})
        stamp = node.get("dueAt")
        if not stamp:
            continue
        try:
            posted = dt.datetime.fromisoformat(stamp.replace("Z", "+00:00")).astimezone(ZONE)
        except ValueError:
            continue
        if posted.date() == when.date() and abs((posted - when).total_seconds()) < 7200:
            return node["id"]
    return None

def scenario_for(when):
    # Rotation hebdomadaire, trois sujets différents par semaine.
    week = when.isocalendar().week
    position = DAY_MAP[when.weekday()]
    demo = DEMOS[(week + position) % len(DEMOS)]
    variant = DEMOS[(week + position) % len(DEMOS)]["captions"][((week // 3) + position) % 3]
    url = BASE + "/" + demo["path"]
    caption = (variant + url + "\n\n"
               "Prototype de démonstration avec données fictives.\n"
               "DASOCO — Vos idées méritent leurs propres outils.\n"
               "#DASOCO #ApplicationMetier #OutilsSurMesure")
    return demo, caption

def record_demo(demo, folder):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=["--no-sandbox"])
        ctx = browser.new_context(viewport={"width": 1000, "height": 730},
                                  record_video_dir=str(folder),
                                  record_video_size={"width": 1000, "height": 730},
                                  device_scale_factor=1, color_scheme="light")
        page = ctx.new_page()
        response = page.goto(BASE + "/" + demo["path"],
                             wait_until="domcontentloaded", timeout=45000)
        if response is None or response.status >= 400:
            raise RuntimeError("Démo indisponible : " + demo["path"])
        page.wait_for_timeout(2100)
        actions_done = 0
        for selector in demo["actions"]:
            locator = page.locator(selector).first
            if locator.count():
                try:
                    if selector.startswith("select"):
                        values = locator.locator("option").all()
                        if len(values) > 1:
                            locator.select_option(index=1 if actions_done % 2 == 0 else 0)
                    else:
                        locator.click(timeout=3000)
                    actions_done += 1
                except Exception:
                    pass
            page.wait_for_timeout(1800)
        if actions_done < 1:
            raise RuntimeError("Aucune interaction réelle vérifiée sur " + demo["slug"])
        page.mouse.wheel(0, 420)
        page.wait_for_timeout(2300)
        page.mouse.wheel(0, -420)
        page.wait_for_timeout(2100)
        raw = page.video
        ctx.close()
        output = Path(raw.path())
        browser.close()
    return output

def background(demo, path):
    from PIL import Image, ImageDraw, ImageFont
    import cairosvg
    canvas = Image.new("RGB", (1080, 1350), "#071b3b")
    draw = ImageDraw.Draw(canvas)
    for y in range(1350):
        x = int(6 + 16 * y / 1350)
        draw.line((0, y, 1080, y), fill=(x, 27, 59))
    logo_path = SITE / "assets" / "brand-mark.svg"
    logo_data = cairosvg.svg2png(url=str(logo_path), output_width=115, output_height=115)
    import io
    logo = Image.open(io.BytesIO(logo_data)).convert("RGBA")
    canvas.paste(logo, (56, 52), logo)
    bold = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    regular = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    title = ImageFont.truetype(bold, 57)
    small = ImageFont.truetype(regular, 30)
    brand = ImageFont.truetype(bold, 60)
    draw.text((190, 64), "DASOCO", fill="white", font=brand)
    draw.text((55, 195), demo["title"], fill="#ffffff", font=title)
    draw.text((57, 268), demo["subtitle"], fill="#70e0d5", font=small)
    draw.rounded_rectangle((40, 338, 1040, 1088), radius=18, fill="#0e3157")
    draw.rounded_rectangle((55, 1140, 1025, 1233), radius=22, fill="#176beb")
    draw.text((85, 1164), "Essayez la démonstration sur dasoco.onrender.com",
              fill="white", font=ImageFont.truetype(bold, 28))
    draw.text((55, 1272), "Prototype interactif · Données fictives",
              fill="#a8bad4", font=ImageFont.truetype(regular, 22))
    canvas.save(path)

def encode(raw, bg, output):
    cmd = [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-loop", "1", "-i", str(bg), "-i", str(raw),
        "-filter_complex",
        "[1:v]fps=24,scale=980:730[demo];"
        "[0:v][demo]overlay=x=50:y=349:shortest=1,format=yuv420p[out]",
        "-map", "[out]", "-an", "-c:v", "libx264", "-preset", "veryfast",
        "-crf", "29", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        "-shortest", str(output),
    ]
    subprocess.run(cmd, check=True, timeout=180)
    if output.stat().st_size < 90000:
        raise RuntimeError("MP4 anormalement petit : vérification requise.")

def build_video(demo, when):
    DEST.mkdir(parents=True, exist_ok=True)
    path = DEST / (when.strftime("%Y-%m-%d") + "-" + demo["slug"] + ".mp4")
    if path.exists() and path.stat().st_size > 90000:
        return path
    with tempfile.TemporaryDirectory() as d:
        folder = Path(d)
        raw = record_demo(demo, folder)
        bg = folder / "brand.png"
        background(demo, bg)
        encode(raw, bg, path)
    return path

def main():
    if not os.environ.get("BUFFER_API_KEY"):
        raise RuntimeError("Secret GitHub BUFFER_API_KEY manquant. Ne rien publier.")
    when = target_slot()
    org_id, channel_id = dasoco_channel()
    prior = existing_slot(org_id, channel_id, when)
    if prior:
        print("Déjà programmé, aucun doublon :", when.isoformat(), prior)
        return
    demo, caption = scenario_for(when)
    clip = build_video(demo, when)
    url = BASE + "/media/linkedin/" + clip.name
    # The GitHub Actions workflow commits the MP4 before Buffer is called.
    if os.environ.get("DASOCO_UPLOAD_ONLY") == "1":
        print(json.dumps({"video": str(clip.relative_to(ROOT)),
                          "url": url, "slot": when.isoformat(),
                          "demo": demo["slug"]}, ensure_ascii=False))
        return
    wait_for_media(url)
    schedule(org_id, channel_id, when, caption, url)

def wait_for_media(url):
    for _ in range(24):
        try:
            request = urllib.request.Request(url, method="HEAD",
                                             headers={"User-Agent": "DASOCO-Buffer-Publisher/1.0"})
            with urllib.request.urlopen(request, timeout=12) as response:
                if response.status == 200 and "video" in response.headers.get("Content-Type", ""):
                    return
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError):
            pass
        time.sleep(15)
    raise RuntimeError("Vidéo non disponible sur Render : aucune publication programmée.")

def schedule(org_id, channel_id, when, caption, url):
    prior = existing_slot(org_id, channel_id, when)
    if prior:
        print("Créneau déjà présent après rendu :", prior)
        return
    due = when.astimezone(dt.timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    mutation = (
        "mutation { createPost(input: {text: " + q(caption) +
        ", channelId: " + q(channel_id) +
        ", schedulingType: automatic, mode: customScheduled, dueAt: " + q(due) +
        ", assets: [{video: {url: " + q(url) +
        "}}]}) { ... on PostActionSuccess { post {id dueAt status text} }"
        " ... on MutationError {message} } }"
    )
    data = gql(mutation).get("createPost", {})
    if "post" not in data:
        raise RuntimeError("Buffer a refusé la programmation : " + str(data)[:800])
    post = data["post"]
    if str(post.get("status", "")).lower() not in ("scheduled", "sending", "sent"):
        raise RuntimeError("Statut Buffer inattendu : " + str(post))
    print(json.dumps({"scheduled": True, "postId": post["id"],
                      "dueAt": post.get("dueAt"), "asset": url}, ensure_ascii=False))

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("DASOCO autopost : " + str(exc), file=sys.stderr)
        sys.exit(1)
