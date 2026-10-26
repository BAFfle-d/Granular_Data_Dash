#!/usr/bin/env python3
"""
build_manifest.py — regenerates data/manifest.json for WEINGARD.ONLINE.

What it does
------------
1. Scans dashboards/*.html and extracts each dashboard's embedded data
   (var CARDS = {...}) to compute REAL values for the front page:
     - date range (first -> last record date)
     - number of data lines (total and unique)
     - platforms used
     - aliases used (sender/receiver names)
     - source file names (used to link original files back to dashboards)
2. Scans the original-source folders:
     original_csv/  original_image/  original_video/
   and lists every file found, mapping each to the dashboard it belongs to
   (exact/normalized match against dashboard source files, then keyword rules).
3. Merges your overrides from tools/manifest.config.json
   (identity text, per-dashboard display tweaks, ignore patterns).
4. Writes data/manifest.json, which index.html reads at runtime.

Run it
------
    python tools/build_manifest.py
or just double-click tools/REBUILD.bat

You never need to edit HTML/JS code when adding files or dashboards.
Drop files into the folders, run this script, done.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "tools" / "manifest.config.json"
OUT_PATH = ROOT / "data" / "manifest.json"

SOURCE_FOLDERS = {
    "csv": "original_csv",
    "image": "original_image",
    "video": "original_video",
}

# Column-name candidates per logical field (different exports name them differently)
CANDIDATES = {
    "sender": ["FROM_SENDER", "sender_name"],
    "receiver": ["TO_RECEIVER", "recipient_name"],
    "platform": ["PLATFORM", "product"],
    "file": ["FILE_NAME", "file_name"],
    "date": ["DATE", "date"],
}


def load_config():
    if CONFIG_PATH.exists():
        try:
            return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"! config file unreadable ({e}); using defaults")
    return {}


def normalize(name):
    """Lowercase, strip non-alphanumerics — used for loose file matching."""
    return re.sub(r"[^a-z0-9]", "", name.lower())


def extract_dashboard(path):
    """Pull metadata out of a dashboard HTML file's embedded CARDS JSON."""
    html = path.read_text(encoding="utf-8", errors="replace")
    m = re.search(r"var CARDS = (\{.*?\});\s*var LABELS", html, re.S)
    if not m:
        return None
    try:
        cards = json.loads(m.group(1))
    except Exception:
        return None

    senders, receivers, platforms, source_files = set(), set(), set(), set()
    nrows = 0
    dates = []

    for card in cards.values():
        cols = card.get("cols", [])
        ix = {}
        for key, names in CANDIDATES.items():
            for n in names:
                if n in cols:
                    ix[key] = cols.index(n)
                    break
        for row in card.get("rows", []):
            nrows += 1
            c = row.get("c", [])

            def g(key):
                i = ix.get(key)
                return c[i] if i is not None and i < len(c) else ""

            if g("sender"):
                senders.add(g("sender"))
            if g("receiver"):
                receivers.add(g("receiver"))
            if g("platform"):
                platforms.add(g("platform"))
            if g("file"):
                source_files.add(g("file"))
            d = g("date")
            if d and re.match(r"\d{4}-\d{2}-\d{2}", d):
                dates.append(d[:10])

    # unique-record count from the overview chip ("1030 unique")
    uniq = re.search(r">([0-9,]+) unique<", html)
    title_m = re.search(r"<title>(.*?)</title>", html)
    return {
        "file": path.name,
        "pageTitle": title_m.group(1).strip() if title_m else path.stem,
        "rows": nrows,
        "unique": int(uniq.group(1).replace(",", "")) if uniq else nrows,
        "dateStart": min(dates) if dates else None,
        "dateEnd": max(dates) if dates else None,
        "aliases": sorted(senders | receivers),
        "platforms": sorted(platforms),
        "sourceFiles": sorted(source_files),
    }


def find_dashboard_for_file(fname, dashboards, rules):
    """Match an original source file to a dashboard."""
    norm = normalize(fname)
    # 1) exact / normalized match against each dashboard's own source-file list
    for d in dashboards:
        for sf in d.get("sourceFiles", []):
            nsf = normalize(sf)
            if norm == nsf or (len(nsf) > 12 and nsf in norm) or (len(norm) > 12 and norm in nsf):
                return d["id"]
    # 2) keyword rules from config: { "dashboard-id": ["keyword", ...] }
    for dash_id, keywords in rules.items():
        low = fname.lower()
        for kw in keywords:
            if kw.lower() in low:
                return dash_id
    return None


def main():
    cfg = load_config()
    identity = cfg.get("identity", {})
    dash_cfg = cfg.get("dashboards", {})
    ignore_sources = cfg.get("ignoreSourcePatterns", [])
    alias_exclude = [x.lower() for x in cfg.get("excludeAliases", ["me", "barry f"])]
    platform_exclude = [x.lower() for x in cfg.get("excludePlatforms", ["call", "text"])]

    # ---- dashboards -------------------------------------------------------
    dashboards = []
    for p in sorted((ROOT / "dashboards").glob("*.html")):
        meta = extract_dashboard(p)
        if not meta:
            print(f"! could not read data from {p.name}; skipped")
            continue
        dash_id = f"dashboard-{len(dashboards) + 1:02d}"
        override = dash_cfg.get(meta["file"], {})
        if override.get("id"):
            dash_id = override["id"]

        aliases = [a for a in meta["aliases"] if a.lower() not in alias_exclude]
        platforms = [pl for pl in meta["platforms"] if pl.lower() not in platform_exclude]

        dashboards.append({
            "id": dash_id,
            "file": meta["file"],
            "pageTitle": override.get("pageTitle", meta["pageTitle"]),
            "dateStart": override.get("dateStart", meta["dateStart"]),
            "dateEnd": override.get("dateEnd", meta["dateEnd"]),
            "dataType": override.get("dataType", "SMS/TEXT DATA"),
            "lines": override.get("lines", meta["unique"]),
            "platforms": override.get("platforms", platforms),
            "aliases": override.get("aliases", aliases),
            "sourceFiles": meta["sourceFiles"],
        })

    # ---- source folders ---------------------------------------------------
    sources = {}
    mapping_rules = cfg.get("sourceKeywordRules", {})
    for kind, folder in SOURCE_FOLDERS.items():
        folder_path = ROOT / folder
        files = []
        if folder_path.is_dir():
            for f in sorted(folder_path.iterdir()):
                if not f.is_file():
                    continue
                if any(re.search(pat, f.name, re.I) for pat in ignore_sources):
                    continue
                files.append({
                    "name": f.name,
                    "path": f"{folder}/{f.name}",
                    "size": f.stat().st_size,
                    "dashboard": find_dashboard_for_file(f.name, dashboards, mapping_rules),
                })
        sources[kind] = files

    manifest = {
        "generated": __import__("datetime").datetime.now().isoformat(timespec="seconds"),
        "identity": {
            "siteTitle": identity.get("siteTitle", "WEINGARD.ONLINE"),
            "contactName": identity.get("contactName", "Barry Floore"),
            "contactEmail": identity.get("contactEmail", "barry.floore@gmail.com"),
            "intro": identity.get("intro", ""),
        },
        "dashboards": dashboards,
        "sources": sources,
    }

    OUT_PATH.parent.mkdir(exist_ok=True)
    OUT_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"OK -> {OUT_PATH.relative_to(ROOT)}")
    print(f"   dashboards: {len(dashboards)}")
    for d in dashboards:
        print(f"     [{d['id']}] {d['file']}: {d['dateStart']} -> {d['dateEnd']}, "
              f"{d['lines']} lines, {len(d['aliases'])} aliases")
    for kind, files in sources.items():
        linked = sum(1 for f in files if f["dashboard"])
        print(f"   {SOURCE_FOLDERS[kind]}: {len(files)} files ({linked} linked to a dashboard)")


if __name__ == "__main__":
    main()
