# WEINGARD.ONLINE

A static, DOS-styled front page that indexes the dashboards in `dashboards/`
and provides a browsable bank of the original source files
(`original_csv/`, `original_image/`, `original_video/`) with a built-in
file viewer (close / prev-next / copy / export / "view in dashboard").

## Do I have to edit code when I add files?

**No.** The page now **auto-discovers** what's in the folders at load time:

| Where the site runs | What happens when you add files |
|---|---|
| Local preview (`python -m http.server`) | Files appear in the dropdowns the **instant you drop them in a folder** — no rebuild |
| Live site (GitHub Pages) | Files appear as soon as you **push** them — no rebuild. Requires the one-time setup below |
| Anywhere | `tools\REBUILD.bat` refreshes the *dashboard stats* (dates / lines / aliases) and the file→dashboard links |

**One-time setup for the live site:** open `tools\manifest.config.json` and
set `"githubRepo": "your-username/your-repository"`. The page then reads the
folder contents through GitHub's public API. The repository must be
**public** (private repos block unauthenticated API reads; if it stays
private, just run `REBUILD.bat` and push the updated `data/manifest.json`
whenever you add files — the old workflow).

New dashboards dropped into `dashboards/` appear in the directory
immediately (numbered at the bottom, marked "recently added"); run
`REBUILD.bat` once to fill in their real dates / lines / aliases.

The generator (`tools/build_manifest.py`) reads each dashboard's embedded
data to compute the **real** start/end dates, line count, platforms, and
aliases, links each source file to its dashboard (exact file-name match,
then the keyword rules in `manifest.config.json`), and writes
`data/manifest.json`. You never touch `index.html`, `app.js`, or
`style.css` for content changes.

### Repo-only files

Some originals (and whole dashboards) live in the GitHub repo but not in
this local folder. The generator handles both cases:

- `tools/extra_sources.json` lists files that exist only in the repo (e.g.
  the original CSVs/images stored on GitHub). They are merged into the
  manifest's source dropdowns; local files always win on name conflicts.
- A `dashboards` entry in `tools/manifest.config.json` whose file is **not**
  present locally is treated as a *repo-only dashboard*: all of its stats
  (lines, dates, platforms, aliases, sourceFiles) come from the config —
  see `dashboard-05` for the worked example.

## Preview locally

Fetch-based features (CSV preview, copy) need the folder served over HTTP.
From this folder run:

```
python -m http.server 8000
```

then open <http://localhost:8000>. Opening `index.html` directly from disk
(`file://`) still shows the dashboard directory but leaves the source
dropdowns empty.

## GitHub Pages

Upload the whole folder (keeping the structure). Run `tools\REBUILD.bat`
before pushing so `data/manifest.json` matches the files you upload.
The `noindex` tags discourage search indexing but are **not** access
control — handle the password protection / limited distribution separately.
