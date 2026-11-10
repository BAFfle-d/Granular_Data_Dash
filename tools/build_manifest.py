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

# Column-name candidates per logical field (matched case-insensitively)
CANDIDATES = {
    "sender": ["from_sender", "sender_name", "sender name", "contact_name", "sendername"],
    "receiver": ["to_receiver", "recipient_name", "recipient name", "receivername"],
    "platform": ["platform", "product"],
    "file": ["file_name", "file name", "sourcefile", "source file"],
    "date": ["date"],
}


def find_col(cols_lower, names):
    """First column index matching any candidate name (case-insensitive)."""
    for n in names:
        if n in cols_lower:
            return cols_lower.index(n)
    return None

DATE_PATTERNS = [
    (re.compile(r"^(\d{4})-(\d{2})-(\d{2})$"), (1, 2, 3)),          # 2024-04-19
    (re.compile(r"^(\d{1,2})/(\d{1,2})/(\d{4})$"), (3, 1, 2)),      # 2/14/2025
    (re.compile(r"^([A-Za-z]{3})[a-z]* (\d{1,2}) (\d{4})$"), None),  # Feb 14 2025
]
MONTHS = {m: i + 1 for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"])}


def parse_date(d):
    """Normalize a date cell to ISO yyyy-mm-dd; return None if unrecognized."""
    d = (d or "").strip()
    for rx, order in DATE_PATTERNS:
        m = rx.match(d)
        if not m:
            continue
        if order:
            y, mo, da = (int(m.group(i)) for i in order)
        else:
            mo, da, y = MONTHS.get(m.group(1), 0), int(m.group(2)), int(m.group(3))
        if mo and 1 <= mo <= 12:
            return f"{y:04d}-{mo:02d}-{da:02d}"
    return None


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
        cols_lower = [str(c).lower() for c in cols]
        ix = {}
        for key, names in CANDIDATES.items():
            i = find_col(cols_lower, names)
            if i is not None:
                ix[key] = i
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
            d = parse_date(g("date"))
            if d:
                dates.append(d)

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
        if override.get("exclude"):
            print(f"- {meta['file']}: excluded by manifest.config.json")
            continue
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

    # config-only dashboards: file lives in the GitHub repo but not in the
    # local project — config supplies all of their stats (see dashboard-05)
    seen_files = {d["file"] for d in dashboards}
    for fname, override in dash_cfg.items():
        if fname in seen_files or not override.get("id"):
            continue
        dashboards.append({
            "id": override["id"],
            "file": fname,
            "pageTitle": override.get("pageTitle", fname),
            "dateStart": override.get("dateStart"),
            "dateEnd": override.get("dateEnd"),
            "dataType": override.get("dataType", "SMS/TEXT DATA"),
            "lines": override.get("lines"),
            "platforms": override.get("platforms", []),
            "aliases": [a for a in override.get("aliases", []) if a.lower() not in alias_exclude],
            "sourceFiles": override.get("sourceFiles", []),
        })

    # display in configured numeric order (dashboard-01, -02, …), not filename order
    dashboards.sort(key=lambda d: d["id"])

    # ---- source folders ---------------------------------------------------
    # extra_sources.json lists files that exist in the GitHub repo but not in
    # the local project folders (e.g. originals only stored in the repo). Local
    # files always win when both are present.
    extra_src = {}
    extra_path = ROOT / "tools" / "extra_sources.json"
    if extra_path.exists():
        try:
            extra_src = json.loads(extra_path.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"! extra_sources.json unreadable ({e}); ignoring")

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
        local_names = {f["name"] for f in files}
        for ef in extra_src.get(kind, []):
            if ef["name"] in local_names:
                continue
            if any(re.search(pat, ef["name"], re.I) for pat in ignore_sources):
                continue
            files.append({
                "name": ef["name"],
                "path": f"{folder}/{ef['name']}",
                "size": ef.get("size", 0),
                "dashboard": find_dashboard_for_file(ef["name"], dashboards, mapping_rules),
            })
        files.sort(key=lambda f: f["name"].lower())
        sources[kind] = files

    # YouTube-hosted videos (for files too long to host in the repo): shown in
    # the video dropdown and embedded in the viewer. Add entries to the
    # "videoLinks" list in tools/manifest.config.json as
    #   {"title": "...", "url": "https://www.youtube.com/watch?v=..."}
    for vl in cfg.get("videoLinks", []):
        url = vl.get("url", "")
        if not url:
            continue
        sources["video"].append({
            "name": vl.get("title", url),
            "path": "",
            "size": 0,
            "dashboard": None,
            "youtube": url,
        })
    sources["video"].sort(key=lambda f: f["name"].lower())

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
        # lets the live page auto-discover newly added files at runtime
        # (folder listings / GitHub API) without regenerating this manifest
        "autoDiscovery": {
            "githubRepo": cfg.get("githubRepo", ""),
            "sourceRules": cfg.get("sourceKeywordRules", {}),
            "ignoreSourcePatterns": cfg.get("ignoreSourcePatterns", []),
        },
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
