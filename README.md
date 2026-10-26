# WEINGARD.ONLINE

A static, DOS-styled front page that indexes the dashboards in `dashboards/`
and provides a browsable bank of the original source files
(`original_csv/`, `original_image/`, `original_video/`) with a built-in
file viewer (close / prev-next / copy / export / "view in dashboard").

## Do I have to edit code when I add files?

**No.** Browsers cannot list folders on their own, so the dropdowns are fed
by a small generated index file, `data/manifest.json`. Everything else is
automatic:

| You want to… | You do |
|---|---|
| Add/rename/remove source files (CSV, images, video) | Drop them into `original_csv/`, `original_image/`, or `original_video/`, then double-click **`tools/REBUILD.bat`** |
| Add a new dashboard | Drop its `.html` into `dashboards/`, then run **`tools/REBUILD.bat`** |
| Change site text (title, contact, intro) | Edit `tools/manifest.config.json`, then run **`tools/REBUILD.bat`** |

The generator (`tools/build_manifest.py`):

- reads each dashboard's embedded data and computes the **real** start/end
  dates, line count, platforms, and aliases shown on the front page;
- scans the three `original_*` folders and links each file to the dashboard
  it belongs to (exact file-name match against the dashboard's own source
  list, then the keyword rules in `manifest.config.json`).

You never touch `index.html`, `app.js`, or `style.css` for content changes.

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
