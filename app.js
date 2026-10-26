/* WEINGARD.ONLINE — front-page engine.
   Reads data/manifest.json (built by tools/build_manifest.py) and renders:
     1. the Available Dashboards directory  2. the Original Sources dropdown bank
     3. the source-file viewer popup.
   If the manifest cannot be fetched (e.g. page opened via file://),
   a built-in fallback keeps the dashboard directory working. */
(function () {
  'use strict';

  /* ---- emergency fallback (last generated values) -------------------- */
  var FALLBACK_MANIFEST = {
    identity: {
      siteTitle: 'WEINGARD.ONLINE',
      contactName: 'Barry Floore',
      contactEmail: 'barry.floore@gmail.com',
      intro: ''
    },
    dashboards: [
      {
        id: 'dashboard-01',
        file: 'josh-nunes-dr-talos-ben-weingard.html',
        pageTitle: 'DASHBOARD 01 — JOSH NUNES / DR TALOS / BEN WEINGARD',
        dateStart: '2024-04-07', dateEnd: '2025-08-28',
        dataType: 'SMS/TEXT + CALL DATA', lines: 1030,
        platforms: ['Google Voice', 'Telegram'],
        aliases: ['Ben Weingard Jerks Off In Front Of Children', 'Ben Witland', 'Jax Fag', 'stalker3 again', 'stalker3 dr talos', 'stalker3 josh nunes']
      },
      {
        id: 'dashboard-02',
        file: 'stalker3-stalker-nelson-weingard.html',
        pageTitle: 'DASHBOARD 02 — STALKER3 / STALKER / NELSON / WEINGARD',
        dateStart: '2023-09-19', dateEnd: '2025-06-17',
        dataType: 'SMS/TEXT DATA', lines: 1821,
        platforms: ['Voice - SMS'],
        aliases: ['Ben Nelson', 'Ben Weingard Jerks Off In Front Of Children', 'Ben w From Meetme', 'BenStalker YetAnother', 'Forgotten ben', 'KD/BEN/ROCKO TG', 'KD_BEN_ROCKO TG', 'RockoTG BenW Tbh', 'Stalker', 'Stalker_ Sim Card Dylan', 'stalker3 _not ben real n__', 'stalker3 "not ben real n_"', 'stalker3 knew sandy']
      }
    ],
    sources: { csv: [], image: [], video: [] },
    fallback: true
  };

  var TEXT_EXT = ['csv', 'txt', 'json', 'html', 'htm', 'md', 'log', 'xml'];
  var IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'];
  var AUDIO_EXT = ['mp3', 'wav', 'ogg', 'm4a', 'aac'];
  var PREVIEW_LIMIT = 250000; // characters of text preview

  var MANIFEST = null;
  var viewer = { kind: null, index: 0, list: [], text: null };

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function extOf(name) {
    var m = /\.([a-z0-9]+)$/i.exec(name || '');
    return m ? m[1].toLowerCase() : '';
  }
  function fmtDate(iso) {
    if (!iso) return 'DATE UNKNOWN';
    var MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY',
      'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return iso;
    return m[3] + ' ' + MONTHS[parseInt(m[2], 10) - 1] + ' ' + m[1];
  }
  function fmtNum(n) { return Number(n || 0).toLocaleString('en-US'); }
  function kindLabel(kind) {
    return kind === 'csv' ? 'DOCUMENTS / CSV' : kind === 'image' ? 'IMAGES' : 'AUDIO / VIDEO';
  }

  /* ---- render: identity ------------------------------------------------ */
  function renderIdentity() {
    var id = MANIFEST.identity || {};
    if (id.intro) {
      el('intro').textContent = id.intro;
    } /* else leave the [PENDING] placeholder visible */
  }

  /* ---- render: dashboard directory ------------------------------------- */
  function renderDirectory() {
    var nav = el('dashboard-dir');
    var list = MANIFEST.dashboards || [];
    nav.innerHTML = '';
    list.forEach(function (d, i) {
      var a = document.createElement('a');
      a.href = './dashboards/' + encodeURIComponent(d.file);
      a.className = 'dir-entry';
      var sub1 = esc((d.dataType || 'DATA') + ' LINES: ' + fmtNum(d.lines));
      if (d.platforms && d.platforms.length) sub1 += ' | ' + esc(d.platforms.join(', ').toUpperCase());
      var sub2 = (d.aliases && d.aliases.length)
        ? 'ALIASES: ' + esc(d.aliases.join(', ').toUpperCase())
        : 'ALIASES: NONE LISTED';
      a.innerHTML =
        '&gt; [' + String(i + 1).padStart(2, '0') + '] ' +
        esc(fmtDate(d.dateStart).toUpperCase()) + ' &#8211; ' + esc(fmtDate(d.dateEnd).toUpperCase()) +
        '<span class="sub">' + sub1 + '</span>' +
        '<span class="sub">' + sub2 + '</span>';
      nav.appendChild(a);
    });
    if (!list.length) {
      nav.innerHTML = '<p class="dir-empty">&gt; NO DASHBOARD FILES FOUND IN .\\DASHBOARDS\\</p>';
    }
    el('dashboard-count').textContent = list.length + ' dashboard file' + (list.length === 1 ? '' : 's') + ' listed';
  }

  /* ---- render: source dropdown bank ------------------------------------ */
  function renderSources() {
    var bank = el('source-bank');
    bank.innerHTML = '';
    ['csv', 'image', 'video'].forEach(function (kind) {
      var files = (MANIFEST.sources && MANIFEST.sources[kind]) || [];
      var row = document.createElement('div');
      row.className = 'source-row';

      var label = document.createElement('label');
      label.className = 'source-label';
      label.setAttribute('for', 'src-' + kind);
      label.textContent = 'C:\\WEINGARD.ONLINE\\' + (kind === 'csv' ? 'ORIGINAL_CSV' : kind === 'image' ? 'ORIGINAL_IMAGE' : 'ORIGINAL_VIDEO') + '>';

      var select = document.createElement('select');
      select.id = 'src-' + kind;
      select.className = 'source-select';
      select.innerHTML = '<option value="">&mdash; SELECT FILE (' + files.length + ') &mdash;</option>' +
        files.map(function (f, i) {
          return '<option value="' + i + '">' + esc(f.name) + '</option>';
        }).join('');
      select.addEventListener('change', function () {
        if (select.value === '') return;
        openViewer(kind, parseInt(select.value, 10));
        select.value = ''; // reset so re-selecting the same file re-opens it
      });

      var count = document.createElement('span');
      count.className = 'source-count';
      count.textContent = files.length ? files.length + ' FILE' + (files.length === 1 ? '' : 'S') : 'EMPTY';

      row.appendChild(label);
      row.appendChild(select);
      row.appendChild(count);
      bank.appendChild(row);
    });
    if (MANIFEST.fallback) {
      el('source-note').textContent =
        '> MANIFEST UNAVAILABLE (page opened from disk?). Source dropdowns are empty. ' +
        'Serve the folder over HTTP (GitHub Pages, or: python -m http.server) and regenerate with tools\\REBUILD.bat.';
    } else {
      el('source-note').textContent =
        'Dropdowns auto-fill from the original_csv / original_image / original_video folders via data\\manifest.json. ' +
        'After adding or renaming files, run tools\\REBUILD.bat to refresh. Manifest generated: ' +
        (MANIFEST.generated || 'unknown');
    }
  }

  /* ---- viewer ------------------------------------------------------------ */
  function dashboardUrl(dashId) {
    var d = (MANIFEST.dashboards || []).find(function (x) { return x.id === dashId; });
    return d ? './dashboards/' + encodeURIComponent(d.file) : null;
  }

  function setStatus(msg, isErr) {
    var s = el('viewer-status');
    s.textContent = msg || ' ';
    s.classList.toggle('status-err', !!isErr);
  }

  function openViewer(kind, index) {
    var files = (MANIFEST.sources && MANIFEST.sources[kind]) || [];
    if (!files.length) return;
    viewer.kind = kind;
    viewer.index = index;
    viewer.list = files;
    renderViewerFile();
    el('viewer').hidden = false;
    document.body.classList.add('viewer-open');
  }

  function closeViewer() {
    el('viewer').hidden = true;
    document.body.classList.remove('viewer-open');
    viewer.text = null;
    el('viewer-body').innerHTML = '';
  }

  function stepViewer(delta) {
    var n = viewer.list.length;
    if (!n) return;
    viewer.index = (viewer.index + delta + n) % n;
    renderViewerFile();
  }

  function renderViewerFile() {
    var f = viewer.list[viewer.index];
    var ext = extOf(f.name);
    el('viewer-filename').textContent =
      kindLabel(viewer.kind) + ' \\ ' + f.name;
    el('viewer-pos').textContent = (viewer.index + 1) + ' / ' + viewer.list.length;
    viewer.text = null;

    // dashboard link
    var link = el('viewer-dashlink');
    var url = f.dashboard ? dashboardUrl(f.dashboard) : null;
    if (url) {
      link.href = url;
      link.hidden = false;
      link.textContent = 'VIEW IN DASHBOARD (' + f.dashboard.toUpperCase() + ') ↗';
    } else {
      link.hidden = true;
    }

    var body = el('viewer-body');
    body.innerHTML = '';
    setStatus('LOADING ' + f.path + ' …');

    if (IMAGE_EXT.indexOf(ext) !== -1) {
      var img = document.createElement('img');
      img.src = encodeURI(f.path);
      img.alt = f.name;
      img.className = 'viewer-media';
      img.onload = function () { setStatus('READY — ' + f.name); };
      img.onerror = function () { setStatus('! COULD NOT LOAD ' + f.path + ' — FILE MISSING?', true); };
      body.appendChild(img);
      return;
    }
    if (AUDIO_EXT.indexOf(ext) !== -1) {
      var aud = document.createElement('audio');
      aud.controls = true;
      aud.src = encodeURI(f.path);
      aud.className = 'viewer-audio';
      aud.onerror = function () { setStatus('! COULD NOT LOAD ' + f.path + ' — FILE MISSING?', true); };
      body.appendChild(aud);
      setStatus('READY — ' + f.name);
      return;
    }
    if (ext === 'mp4' || ext === 'webm' || ext === 'mov' || ext === 'mkv') {
      var vid = document.createElement('video');
      vid.controls = true;
      vid.src = encodeURI(f.path);
      vid.className = 'viewer-media';
      vid.onerror = function () { setStatus('! COULD NOT LOAD ' + f.path + ' — FILE MISSING?', true); };
      body.appendChild(vid);
      setStatus('READY — ' + f.name);
      return;
    }
    // text-like (csv / html exports / txt / json ...)
    fetch(encodeURI(f.path)).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function (text) {
      viewer.text = text;
      var pre = document.createElement('pre');
      pre.className = 'viewer-text';
      pre.textContent = text.slice(0, PREVIEW_LIMIT);
      if (text.length > PREVIEW_LIMIT) {
        setStatus('READY — PREVIEW TRUNCATED (' + fmtNum(PREVIEW_LIMIT) + ' OF ' + fmtNum(text.length) +
          ' CHARS). USE EXPORT FOR FULL FILE.', false);
      } else {
        setStatus('READY — ' + fmtNum(text.length) + ' CHARS');
      }
      body.appendChild(pre);
    }).catch(function (e) {
      setStatus('! CANNOT READ FILE (' + e.message + '). IF OPENED FROM DISK (FILE://), ' +
        'SERVE OVER HTTP — E.G. GITHUB PAGES, OR: python -m http.server — THEN EXPORT/DOWNLOAD STILL WORKS.', true);
    });
  }

  function doCopy() {
    var f = viewer.list[viewer.index];
    var ext = extOf(f.name);
    if (viewer.text != null) {
      copyText(viewer.text);
      return;
    }
    if (IMAGE_EXT.indexOf(ext) !== -1 && window.ClipboardItem) {
      fetch(encodeURI(f.path)).then(function (r) { return r.blob(); }).then(function (blob) {
        return navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      }).then(function () {
        setStatus('IMAGE COPIED TO CLIPBOARD.');
      }).catch(function () {
        setStatus('! COPY BLOCKED BY BROWSER — USE EXPORT INSTEAD.', true);
      });
    } else {
      setStatus('! COPY IS ONLY AVAILABLE FOR TEXT FILES AND IMAGES (OVER HTTPS/LOCALHOST).', true);
    }
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        setStatus('COPIED ' + fmtNum(text.length) + ' CHARS TO CLIPBOARD.');
      }).catch(function () { legacyCopy(text); });
    } else { legacyCopy(text); }
  }
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      setStatus('COPIED ' + fmtNum(text.length) + ' CHARS TO CLIPBOARD.');
    } catch (e) {
      setStatus('! COPY FAILED — SELECT THE TEXT MANUALLY.', true);
    }
    document.body.removeChild(ta);
  }

  function doExport() {
    var f = viewer.list[viewer.index];
    fetch(encodeURI(f.path)).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.blob();
    }).then(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = f.name;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      setStatus('EXPORTED ' + f.name);
    }).catch(function () {
      // last resort: direct link (works for same-origin files even without fetch)
      var a = document.createElement('a');
      a.href = encodeURI(f.path);
      a.download = f.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setStatus('EXPORTED ' + f.name + ' (DIRECT LINK)');
    });
  }

  /* ---- boot --------------------------------------------------------------- */
  function boot() {
    el('viewer-close').addEventListener('click', closeViewer);
    el('viewer-prev').addEventListener('click', function () { stepViewer(-1); });
    el('viewer-next').addEventListener('click', function () { stepViewer(1); });
    el('viewer-copy').addEventListener('click', doCopy);
    el('viewer-export').addEventListener('click', doExport);
    el('viewer').addEventListener('click', function (e) {
      if (e.target === el('viewer')) closeViewer();
    });
    document.addEventListener('keydown', function (e) {
      if (el('viewer').hidden) return;
      if (e.key === 'Escape') closeViewer();
      if (e.key === 'ArrowLeft') stepViewer(-1);
      if (e.key === 'ArrowRight') stepViewer(1);
    });

    fetch('./data/manifest.json', { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (m) {
      MANIFEST = m;
      renderAll();
    }).catch(function () {
      MANIFEST = FALLBACK_MANIFEST;
      renderAll();
    });
  }

  function renderAll() {
    renderIdentity();
    renderDirectory();
    renderSources();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
