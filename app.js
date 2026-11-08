/* WEINGARD.ONLINE — front-page engine.
   Reads data/manifest.json and renders the dashboard directory, source bank,
   and source-file viewer. Runtime discovery is an enhancement: the generated
   manifest always remains authoritative when folder listing is unavailable. */
(function () {
  'use strict';

  var FALLBACK_MANIFEST = {
    identity: { siteTitle: 'WEINGARD.ONLINE', contactName: 'Barry Floore', contactEmail: 'barry.floore@gmail.com', intro: '' },
    dashboards: [
      { id: 'dashboard-01', file: 'josh-nunes-dr-talos-ben-weingard.html', dateStart: '2024-04-07', dateEnd: '2025-08-28', dataType: 'SMS/TEXT + CALL DATA', lines: 1030, platforms: ['Google Voice', 'Telegram'], aliases: ['Ben Weingard Jerks Off In Front Of Children', 'Ben Witland', 'Jax Fag', 'stalker3 again', 'stalker3 dr talos', 'stalker3 josh nunes'] },
      { id: 'dashboard-02', file: 'stalker3-stalker-nelson-weingard.html', dateStart: '2023-09-19', dateEnd: '2025-06-17', dataType: 'SMS/TEXT DATA', lines: 1821, platforms: ['Voice - SMS'], aliases: ['Ben Nelson', 'Ben Weingard Jerks Off In Front Of Children', 'Ben w From Meetme', 'BenStalker YetAnother', 'Forgotten ben', 'KD/BEN/ROCKO TG', 'KD_BEN_ROCKO TG', 'RockoTG BenW Tbh', 'Stalker', 'Stalker_ Sim Card Dylan', 'stalker3 "not ben real n_"', 'stalker3 _not ben real n__', 'stalker3 knew sandy'] },
      { id: 'dashboard-03', file: 'consolidated and master callog dashboard with 4636 Voice SMS.html', dateStart: '2022-08-15', dateEnd: '2025-04-12', dataType: 'CALL LOG + SMS/TEXT DATA', lines: 689, platforms: ['Google Voice', 'Voice - Calls'], aliases: ['(929) 568-4636', 'Ben Nelson', 'Ben W 0370', 'Ben Weingard Jerks Off In Front Of Children', 'Ben w From Meetme', 'Forgotten ben', 'Idiot', 'KD_BEN_ROCKO TG', 'Unknown'] },
      { id: 'dashboard-04', file: 'android sms messages dashboard.html', dateStart: '2024-10-22', dateEnd: '2026-10-26', dataType: 'SMS/TEXT DATA', lines: 4942, platforms: ['android sms'], aliases: ['Another Ben Catfish Maybe', 'Ben And Dylan Sitting On A Dick', 'Ben Asks Me Out On A Date 12 25', 'Ben Busted By The Police', 'Ben Escort Ad 12 25', 'Ben New round Dec 2025', 'Ben Nintendo', 'Ben Phone Call', 'Ben Pretends To Be 16', 'Ben W 0370', 'Ben w From Meetme', 'Ben pretends To Be A Hooker', 'BenTheBlackMatchMaker GlennsFriend', 'BenW But Black', 'DerrickReddit but Really Ben', 'Limp Dick Demon (Ben)', 'Possible Ben Definitely Kooky', 'ScottWallace Ben probably'] },
      { id: 'dashboard-05', file: 'stalker 3 and sandy - bw of children - meetme.html', dateStart: '2024-04-19', dateEnd: '2025-02-15', dataType: 'SMS/TEXT + CALL DATA', lines: 646, platforms: ['Google Voice'], aliases: ['Ben w From Meetme', 'stalker3 knew sandy'] },
      { id: 'dashboard-06', file: 'emails and gchat dash.html', dateStart: '2024-03-23', dateEnd: '2025-12-26', dataType: 'EMAIL + GCHAT DATA', lines: 871, platforms: ['GMAIL', 'MBOX Email (quotes stripped)'], aliases: ['American Gaslighter', 'Ben Weingard', 'Dr. Talos', 'MBF', 'StopRaceScience', 'StopRaceScience@protonmail.com', '[ bfloore.online ]', 'americangaslighter@gmail.com', 'barry.floore@gmail.com', 'benweingard@gmail.com'] }
    ],
    sources: { csv: [], image: [], video: [] },
    autoDiscovery: { githubRepo: 'BAFfle-d/Granular_Data_Dash', sourceRules: {} },
    fallback: true
  };

  var IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'];
  var AUDIO_EXT = ['mp3', 'wav', 'ogg', 'm4a', 'aac'];
  var PREVIEW_LIMIT = 250000;
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
    var MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return iso;
    return m[3] + ' ' + MONTHS[parseInt(m[2], 10) - 1] + ' ' + m[1];
  }
  function fmtNum(n) { return Number(n || 0).toLocaleString('en-US'); }
  function kindLabel(kind) { return kind === 'csv' ? 'DOCUMENTS / CSV' : kind === 'image' ? 'IMAGES' : 'AUDIO / VIDEO'; }
  function folderFor(kind) { return kind === 'csv' ? 'original_csv' : kind === 'image' ? 'original_image' : 'original_video'; }
  function normName(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

  function mapFileToDashboard(name) {
    var norm = normName(name);
    var dashList = (MANIFEST && MANIFEST.dashboards) || [];
    for (var i = 0; i < dashList.length; i++) {
      var sfs = dashList[i].sourceFiles || [];
      for (var j = 0; j < sfs.length; j++) {
        var nsf = normName(sfs[j]);
        if (norm === nsf || (nsf.length > 12 && nsf.indexOf(norm) !== -1) || (norm.length > 12 && norm.indexOf(nsf) !== -1)) return dashList[i].id;
      }
    }
    var rules = (MANIFEST.autoDiscovery && MANIFEST.autoDiscovery.sourceRules) || {};
    var keys = Object.keys(rules);
    for (var k = 0; k < keys.length; k++) {
      var kws = rules[keys[k]] || [];
      for (var w = 0; w < kws.length; w++) {
        if (name.toLowerCase().indexOf(kws[w].toLowerCase()) !== -1) return keys[k];
      }
    }
    return null;
  }

  function listFolder(folder, filter, ignores) {
    function wanted(n) {
      if (filter && !filter.test(n)) return false;
      for (var i = 0; i < (ignores || []).length; i++) {
        try { if (new RegExp(ignores[i], 'i').test(n)) return false; } catch (e) { /* ignore bad pattern */ }
      }
      return true;
    }

    /* A real autoindex identifies itself as a directory listing. Some static
       hosts return index.html with HTTP 200 for every path; that is NOT an
       empty folder and must never replace the generated manifest with []. */
    return fetch('./' + folder + '/').then(function (r) {
      if (!r.ok) throw new Error('no autoindex');
      return r.text().then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var title = doc.querySelector('title');
        var isListing = title && /^(?:Directory listing for|Index of)\s+\//i.test(title.textContent.trim());
        if (!isListing) throw new Error('not a directory listing');
        var names = [];
        var anchors = doc.querySelectorAll('a');
        for (var i = 0; i < anchors.length; i++) {
          var h = anchors[i].getAttribute('href') || '';
          if (h.indexOf('/') !== -1 || h.indexOf('?') !== -1) continue;
          var n = decodeURIComponent(h);
          if (wanted(n)) names.push(n);
        }
        return names;
      });
    }).catch(function () {
      /* Public repositories can use GitHub's unauthenticated Contents API.
         Private repositories simply return null here and retain the manifest
         regenerated by the included GitHub Action. */
      var repo = MANIFEST.autoDiscovery && MANIFEST.autoDiscovery.githubRepo;
      if (!repo) return Promise.resolve(null);
      return fetch('https://api.github.com/repos/' + repo + '/contents/' + folder)
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (items) {
          if (!Array.isArray(items)) return null;
          return items.filter(function (it) { return it.type === 'file'; }).map(function (it) { return it.name; }).filter(wanted);
        })
        .catch(function () { return null; });
    });
  }

  function enhanceManifest(m) {
    var metaByFile = {};
    (m.dashboards || []).forEach(function (d) { metaByFile[d.file] = d; });
    var known = [], pending = [];
    return listFolder('dashboards', /\.html$/i).then(function (dashFiles) {
      if (dashFiles) {
        dashFiles.forEach(function (f) {
          if (metaByFile[f]) known.push(metaByFile[f]);
          else pending.push({ id: 'pending-' + f, file: f, pendingMeta: true, pageTitle: f });
        });
        known.sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
        pending.sort(function (a, b) { return a.file < b.file ? -1 : 1; });
        m.dashboards = known.concat(pending);
      }
      var kinds = ['csv', 'image', 'video'];
      var ignores = (m.autoDiscovery && m.autoDiscovery.ignoreSourcePatterns) || [];
      var seq = Promise.resolve();
      kinds.forEach(function (kind) {
        seq = seq.then(function () {
          return listFolder(folderFor(kind), null, ignores).then(function (names) {
            if (!names) return;
            var externallyHosted = ((m.sources && m.sources[kind]) || []).filter(function (f) { return !!f.youtube; });
            m.sources[kind] = names.map(function (n) {
              return { name: n, path: folderFor(kind) + '/' + n, size: 0, dashboard: mapFileToDashboard(n) };
            }).concat(externallyHosted).sort(function (a, b) { return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1; });
          });
        });
      });
      return seq.then(function () { return m; });
    });
  }

  function renderIdentity() {
    var id = MANIFEST.identity || {};
    if (id.intro) el('intro').textContent = id.intro;
  }

  function renderDirectory() {
    var nav = el('dashboard-dir');
    var list = MANIFEST.dashboards || [];
    nav.innerHTML = '';
    list.forEach(function (d, i) {
      var a = document.createElement('a');
      a.href = './dashboards/' + encodeURIComponent(d.file);
      a.className = 'dir-entry';
      var head, sub1, sub2;
      if (d.pendingMeta) {
        head = d.file.replace(/\.html$/i, '').replace(/[-_]+/g, ' ');
        sub1 = 'RECENTLY ADDED — METADATA WILL APPEAR AFTER THE AUTOMATIC INDEX UPDATE';
        sub2 = 'ALREADY BROWSABLE';
      } else {
        head = fmtDate(d.dateStart).toUpperCase() + ' – ' + fmtDate(d.dateEnd).toUpperCase();
        sub1 = esc((d.dataType || 'DATA') + ' LINES: ' + fmtNum(d.lines));
        if (d.platforms && d.platforms.length) sub1 += ' | ' + esc(d.platforms.join(', ').toUpperCase());
        sub2 = (d.aliases && d.aliases.length) ? 'ALIASES: ' + esc(d.aliases.join(', ').toUpperCase()) : 'ALIASES: NONE LISTED';
      }
      a.innerHTML = '&gt; [' + String(i + 1).padStart(2, '0') + '] ' + esc(head) + '<span class="sub">' + sub1 + '</span><span class="sub">' + sub2 + '</span>';
      nav.appendChild(a);
    });
    if (!list.length) nav.innerHTML = '<p class="dir-empty">&gt; NO DASHBOARD FILES FOUND IN .\\DASHBOARDS\\</p>';
    el('dashboard-count').textContent = list.length + ' dashboard file' + (list.length === 1 ? '' : 's') + ' listed';
  }

  function renderSources() {
    var bank = el('source-bank');
    bank.innerHTML = '';
    ['csv', 'image', 'video'].forEach(function (kind) {
      var files = (MANIFEST.sources && MANIFEST.sources[kind]) || [];
      var row = document.createElement('div'); row.className = 'source-row';
      var label = document.createElement('label');
      label.className = 'source-label'; label.setAttribute('for', 'src-' + kind);
      label.textContent = 'C:\\WEINGARD.ONLINE\\' + (kind === 'csv' ? 'ORIGINAL_CSV' : kind === 'image' ? 'ORIGINAL_IMAGE' : 'ORIGINAL_VIDEO') + '>';
      var select = document.createElement('select');
      select.id = 'src-' + kind; select.className = 'source-select';
      select.innerHTML = '<option value="">&mdash; SELECT FILE (' + files.length + ') &mdash;</option>' + files.map(function (f, i) { return '<option value="' + i + '">' + esc(f.name) + '</option>'; }).join('');
      select.addEventListener('change', function () {
        if (select.value === '') return;
        openViewer(kind, parseInt(select.value, 10)); select.value = '';
      });
      var count = document.createElement('span'); count.className = 'source-count';
      count.textContent = files.length ? files.length + ' FILE' + (files.length === 1 ? '' : 'S') : 'EMPTY';
      row.appendChild(label); row.appendChild(select); row.appendChild(count); bank.appendChild(row);
    });
    el('source-note').textContent = MANIFEST.fallback
      ? '> INDEX UNAVAILABLE. SERVE THE FOLDER OVER HTTP TO LOAD data/manifest.json.'
      : 'Dropdowns populate from data/manifest.json. GitHub automatically rebuilds that index after source or dashboard files are pushed. Index generated: ' + (MANIFEST.generated || 'unknown');
  }

  function dashboardUrl(dashId) {
    var d = (MANIFEST.dashboards || []).find(function (x) { return x.id === dashId; });
    return d ? './dashboards/' + encodeURIComponent(d.file) : null;
  }
  function setStatus(msg, isErr) {
    var s = el('viewer-status'); s.textContent = msg || ' '; s.classList.toggle('status-err', !!isErr);
  }
  function openViewer(kind, index) {
    var files = (MANIFEST.sources && MANIFEST.sources[kind]) || [];
    if (!files.length) return;
    viewer.kind = kind; viewer.index = index; viewer.list = files;
    renderViewerFile(); el('viewer').hidden = false; document.body.classList.add('viewer-open');
    el('viewer-close').focus();
  }
  function closeViewer() {
    el('viewer').hidden = true; document.body.classList.remove('viewer-open');
    viewer.text = null; el('viewer-body').innerHTML = '';
  }
  function stepViewer(delta) {
    var n = viewer.list.length; if (!n) return;
    viewer.index = (viewer.index + delta + n) % n; renderViewerFile();
  }

  function renderViewerFile() {
    var f = viewer.list[viewer.index];
    var ext = extOf(f.name);
    el('viewer-filename').textContent = kindLabel(viewer.kind) + ' \\ ' + f.name;
    el('viewer-pos').textContent = (viewer.index + 1) + ' / ' + viewer.list.length;
    viewer.text = null;
    var link = el('viewer-dashlink');
    var url = f.dashboard ? dashboardUrl(f.dashboard) : null;
    if (url) { link.href = url; link.hidden = false; link.textContent = 'VIEW IN DASHBOARD (' + f.dashboard.toUpperCase() + ') ↗'; }
    else { link.hidden = true; link.removeAttribute('href'); }
    var body = el('viewer-body'); body.innerHTML = '';
    setStatus('LOADING ' + (f.path || f.name) + ' …');

    if (f.youtube) {
      var m = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{6,})/.exec(f.youtube);
      var fr = document.createElement('iframe');
      fr.src = m ? 'https://www.youtube.com/embed/' + m[1] : f.youtube;
      fr.className = 'viewer-media viewer-youtube'; fr.setAttribute('allowfullscreen', '');
      fr.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      fr.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin'); body.appendChild(fr);
      setStatus('YOUTUBE VIDEO — ' + f.name + ' (EXPORT OPENS IT ON YOUTUBE)'); return;
    }
    if (ext === 'heic' || ext === 'heif') {
      setStatus('! HEIC IMAGES CANNOT BE PREVIEWED IN MOST BROWSERS — USE EXPORT TO DOWNLOAD ' + f.name, true); return;
    }
    if (IMAGE_EXT.indexOf(ext) !== -1) {
      var img = document.createElement('img'); img.src = encodeURI(f.path); img.alt = f.name; img.className = 'viewer-media';
      img.onload = function () { setStatus('READY — ' + f.name); };
      img.onerror = function () { setStatus('! COULD NOT LOAD ' + f.path + ' — FILE MISSING?', true); };
      body.appendChild(img); return;
    }
    if (AUDIO_EXT.indexOf(ext) !== -1) {
      var aud = document.createElement('audio'); aud.controls = true; aud.src = encodeURI(f.path); aud.className = 'viewer-audio';
      aud.onerror = function () { setStatus('! COULD NOT LOAD ' + f.path + ' — FILE MISSING?', true); };
      body.appendChild(aud); setStatus('READY — ' + f.name); return;
    }
    if (ext === 'mp4' || ext === 'webm' || ext === 'mov' || ext === 'mkv') {
      var vid = document.createElement('video'); vid.controls = true; vid.src = encodeURI(f.path); vid.className = 'viewer-media';
      vid.onerror = function () { setStatus('! COULD NOT LOAD ' + f.path + ' — FILE MISSING?', true); };
      body.appendChild(vid); setStatus('READY — ' + f.name); return;
    }
    fetch(encodeURI(f.path)).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status); return r.text();
    }).then(function (text) {
      viewer.text = text;
      var pre = document.createElement('pre'); pre.className = 'viewer-text'; pre.textContent = text.slice(0, PREVIEW_LIMIT);
      setStatus(text.length > PREVIEW_LIMIT ? 'READY — PREVIEW TRUNCATED. USE EXPORT FOR FULL FILE.' : 'READY — ' + fmtNum(text.length) + ' CHARS');
      body.appendChild(pre);
    }).catch(function (e) {
      setStatus('! CANNOT READ FILE (' + e.message + '). SERVE OVER HTTP; EXPORT/DOWNLOAD STILL WORKS.', true);
    });
  }

  function doCopy() {
    var f = viewer.list[viewer.index]; var ext = extOf(f.name);
    if (viewer.text != null) { copyText(viewer.text); return; }
    if (IMAGE_EXT.indexOf(ext) !== -1 && window.ClipboardItem) {
      fetch(encodeURI(f.path)).then(function (r) { return r.blob(); }).then(function (blob) {
        if (blob.type && blob.type !== 'image/png') throw new Error('unsupported image clipboard format');
        return navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      }).then(function () { setStatus('IMAGE COPIED TO CLIPBOARD.'); })
        .catch(function () { setStatus('! COPY BLOCKED OR UNSUPPORTED — USE EXPORT INSTEAD.', true); });
    } else setStatus('! COPY IS ONLY AVAILABLE FOR TEXT FILES AND SUPPORTED IMAGES OVER HTTPS/LOCALHOST.', true);
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { setStatus('COPIED ' + fmtNum(text.length) + ' CHARS TO CLIPBOARD.'); }).catch(function () { legacyCopy(text); });
    else legacyCopy(text);
  }
  function legacyCopy(text) {
    var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); setStatus('COPIED ' + fmtNum(text.length) + ' CHARS TO CLIPBOARD.'); }
    catch (e) { setStatus('! COPY FAILED — SELECT THE TEXT MANUALLY.', true); }
    document.body.removeChild(ta);
  }
  function doExport() {
    var f = viewer.list[viewer.index];
    if (f.youtube) { window.open(f.youtube, '_blank', 'noopener'); setStatus('OPENED ON YOUTUBE — ' + f.name); return; }
    fetch(encodeURI(f.path)).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); }).then(function (blob) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = f.name; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); setStatus('EXPORTED ' + f.name);
    }).catch(function () {
      var a = document.createElement('a'); a.href = encodeURI(f.path); a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
      setStatus('EXPORTED ' + f.name + ' (DIRECT LINK)');
    });
  }

  function boot() {
    el('viewer-close').addEventListener('click', closeViewer);
    el('viewer-prev').addEventListener('click', function () { stepViewer(-1); });
    el('viewer-next').addEventListener('click', function () { stepViewer(1); });
    el('viewer-copy').addEventListener('click', doCopy);
    el('viewer-export').addEventListener('click', doExport);
    el('viewer').addEventListener('click', function (e) { if (e.target === el('viewer')) closeViewer(); });
    document.addEventListener('keydown', function (e) {
      if (el('viewer').hidden) return;
      if (e.key === 'Escape') closeViewer();
      if (e.key === 'ArrowLeft') stepViewer(-1);
      if (e.key === 'ArrowRight') stepViewer(1);
    });
    fetch('./data/manifest.json', { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status); return r.json();
    }).catch(function () { return FALLBACK_MANIFEST; }).then(function (m) {
      MANIFEST = m; return enhanceManifest(MANIFEST);
    }).then(renderAll).catch(function () {
      MANIFEST = FALLBACK_MANIFEST; renderAll();
    });
  }
  function renderAll() { renderIdentity(); renderDirectory(); renderSources(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
