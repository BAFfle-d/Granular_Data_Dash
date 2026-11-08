# WEINGARD.ONLINE

A static, DOS-styled front page indexing the dashboards in `dashboards/` and the original source files in `original_csv/`, `original_image/`, and `original_video/`. The source viewer provides close, previous/next, copy, export, and “view in dashboard” controls.

## Automatic updates on GitHub

**No manual rebuild is required after adding, removing, or replacing files on GitHub.**

The workflow at `.github/workflows/rebuild-manifest.yml` runs after pushes affecting the dashboard folders, source folders, or manifest configuration. It runs `tools/build_manifest.py`, updates `data/manifest.json`, and commits the result back to `main`.

After the workflow commits the updated manifest, the connected hosting service must deploy that commit before the change appears on the site. You can also run the workflow manually from GitHub’s Actions tab.

This works with the repository set to **private**; the browser does not need access to GitHub’s API.

## Local updates

For a local preview, run:

```text
python -m http.server 8000
```

Then open `http://localhost:8000`. A real local directory listing lets new files appear immediately. Opening `index.html` directly from disk is not supported for source preview or copy operations.

To rebuild manually, run `tools/REBUILD.bat` on Windows or:

```text
python tools/build_manifest.py
```

The generator reads each dashboard’s embedded data to calculate dates, unique line counts, platforms, aliases, and source-file associations. Configuration and manual overrides live in `tools/manifest.config.json`. Files listed in `tools/extra_sources.json` are merged when needed.

## Hosting and privacy

Upload or push the whole repository while preserving its folder structure. The `noindex` tags discourage search indexing but are not access control; use the password protection and limited-distribution arrangements you have chosen separately.
