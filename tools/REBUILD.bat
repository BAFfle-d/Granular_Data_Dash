@echo off
REM ============================================================
REM  WEINGARD.ONLINE - rebuild data\manifest.json after you add,
REM  remove, or rename files in original_csv / original_image /
REM  original_video, or add dashboard HTML files.
REM  Just double-click this file.
REM ============================================================
cd /d "%~dp0\.."
where python >nul 2>nul
if %errorlevel%==0 (
    python tools\build_manifest.py
) else (
    where py >nul 2>nul
    if %errorlevel%==0 (
        py tools\build_manifest.py
    ) else (
        echo.
        echo  Python was not found on this machine.
        echo  Install it from https://www.python.org or ask Kimi to regenerate.
    )
)
echo.
pause
