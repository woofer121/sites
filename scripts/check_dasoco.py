#!/usr/bin/env python3
"""Contrôle statique DASOCO : liens internes, sitemap et balises SEO."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, unquote
import xml.etree.ElementTree as ET
import sys

ROOT = Path(__file__).resolve().parents[1] / "dasoco"
BASE = "https://dasoco.onrender.com"
errors = []

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.canonical = []
        self.robots = []
        self.title = False
    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == "a" and d.get("href"):
            self.links.append(d["href"])
        if tag == "link" and d.get("rel") == "canonical":
            self.canonical.append(d.get("href", ""))
        if tag == "meta" and d.get("name") == "robots":
            self.robots.append(d.get("content", ""))
        if tag == "title":
            self.title = True

def local_path(href, source):
    if href.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
        return None
    p = urlparse(href)
    if p.scheme and (p.scheme not in ("http", "https") or p.netloc != "dasoco.onrender.com"):
        return None
    if p.scheme or href.startswith("/"):
        rel = unquote(p.path).lstrip("/") or "index.html"
        return ROOT / rel
    return source.parent / unquote(p.path)

pages = {}
for file in ROOT.rglob("*.html"):
    p = Page()
    try:
        p.feed(file.read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"{file}: HTML illisible: {exc}")
        continue
    pages[file.resolve()] = p
    if not p.title:
        errors.append(f"{file}: titre HTML absent")
    for href in p.links:
        target = local_path(href, file)
        if target and not target.resolve().is_file():
            errors.append(f"{file.relative_to(ROOT)}: lien cassé {href}")

sitemap = ROOT / "sitemap.xml"
try:
    tree = ET.parse(sitemap)
    locs = [e.text for e in tree.findall(".//{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
    if len(locs) != len(set(locs)):
        errors.append("Sitemap: URLs en doublon")
    for loc in locs:
        target = local_path(loc, ROOT / "index.html")
        if not target or not target.is_file():
            errors.append(f"Sitemap: fichier manquant {loc}")
            continue
        p = pages.get(target.resolve())
        if not p:
            errors.append(f"Sitemap: page non analysée {loc}")
        elif "noindex" in " ".join(p.robots).lower():
            errors.append(f"Sitemap: page noindex {loc}")
        elif p.canonical and loc not in p.canonical:
            errors.append(f"Sitemap: canonical incohérente {loc}: {p.canonical}")
except Exception as exc:
    errors.append(f"Sitemap invalide: {exc}")

if errors:
    print("\n".join("ERREUR " + x for x in errors))
    sys.exit(1)
print(f"OK : {len(pages)} pages HTML, {len(locs)} URLs sitemap, liens internes contrôlés")
