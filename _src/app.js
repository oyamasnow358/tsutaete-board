  /* ============================================================
     小さな道具
     ============================================================ */
  const $ = s => document.querySelector(s);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  function h(tag, props) {
    const el = document.createElement(tag);
    if (props) Object.keys(props).forEach(k => {
      const v = props[k]; if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v; else if (k === 'html') el.innerHTML = v; else if (k === 'style') el.style.cssText = v; else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? '' : v);
    });
    (function add(list) { list.forEach(c => { if (c === null || c === undefined || c === false || c === '') return; if (Array.isArray(c)) add(c); else el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c); }); })(Array.prototype.slice.call(arguments, 2));
    return el;
  }
  let toastT = null;
  function toast(msg, ms) { const o = $('.toast'); if (o) o.remove(); const t = h('div', { class: 'toast' }, msg); document.body.appendChild(t); clearTimeout(toastT); toastT = setTimeout(() => t.remove(), ms || 2400); }
  const isPhone = () => innerWidth < 600;
  function download(name, text, type) {
    const b = new Blob([text], { type: type || 'text/csv' }), u = URL.createObjectURL(b), a = h('a', { href: u, download: name });
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
  }

  /* ============================================================
     せってい（この 端末）
     ============================================================ */
  const ST_KEY = 'mieel-tsutaete-st';
  const st = Object.assign({ kid: '', sel: 'tap', holdMs: 600, guard: 700, scan: false, scanMs: 1500, sayOnTap: true, showBig: true, preview: true, rate: 0.8, pitch: 1.05, voiceName: '', modeling: false, bigBack: 10 }, (() => { try { return JSON.parse(localStorage.getItem(ST_KEY) || '{}'); } catch (e) { return {}; } })());
  st.modeling = false;
  if (!st.v2) { if (st.rate === 0.95) st.rate = 0.8; st.v2 = 1; }   // はじめの こえが はやすぎたので ゆっくりに
  const saveSt = () => { try { localStorage.setItem(ST_KEY, JSON.stringify(st)); } catch (e) { /* 無視 */ } };

  /* ============================================================
     こえ（よみあげ・先生の 録音）
     ============================================================ */
  const canSpeak = 'speechSynthesis' in window; let jaVoices = [], jaVoice = null;
  function loadVoice() {
    if (!canSpeak) return;
    jaVoices = speechSynthesis.getVoices().filter(x => /^ja/i.test(x.lang));
    jaVoice = jaVoices.find(x => x.name === st.voiceName) || jaVoices.find(x => /Kyoko|O-ren|Otoya|Nanami|Haruka/i.test(x.name)) || jaVoices[0] || null;
  }
  let curAudio = null;
  function stopVoice() { if (canSpeak) speechSynthesis.cancel(); if (curAudio) { try { curAudio.pause(); } catch (e) { /* 無視 */ } curAudio = null; } }
  function say(t) {
    stopVoice(); if (!canSpeak || !t) return;
    try { const u = new SpeechSynthesisUtterance(jaSay(t)); u.lang = 'ja-JP'; u.rate = st.rate; u.pitch = st.pitch; if (jaVoice) u.voice = jaVoice; speechSynthesis.speak(u); } catch (e) { /* 無視 */ }
  }
  // 録音が あれば 録音を、なければ よみあげ
  async function sayOr(text, audioId) {
    if (audioId) {
      const u = await mediaURL(audioId);
      if (u) { stopVoice(); try { curAudio = new Audio(u); await curAudio.play(); return; } catch (e) { /* よみあげへ */ } }
    }
    say(text);
  }
  const sayWord = c => { if (st.sayOnTap && c) sayOr(c.w, c.audioId); };

  /* ============================================================
     ほぞん（IndexedDB・この 端末の 中だけ）
     ============================================================ */
  const DB = {
    db: null,
    open() { if (this.db) return Promise.resolve(this.db); return new Promise((res, rej) => { const r = indexedDB.open('mieel-tsutaete', 1); r.onupgradeneeded = () => { const d = r.result; ['kids', 'cards', 'logs', 'media'].forEach(n => d.createObjectStore(n, { keyPath: 'id' })); }; r.onsuccess = () => { this.db = r.result; res(this.db); }; r.onerror = () => rej(r.error); }); },
    async all(s) { const d = await this.open(); return new Promise((res, rej) => { const q = d.transaction(s).objectStore(s).getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => rej(q.error); }); },
    async get(s, id) { const d = await this.open(); return new Promise((res, rej) => { const q = d.transaction(s).objectStore(s).get(id); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); },
    async put(s, v) { const d = await this.open(); return new Promise((res, rej) => { const tx = d.transaction(s, 'readwrite'); tx.objectStore(s).put(v); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }); },
    async del(s, id) { const d = await this.open(); return new Promise((res, rej) => { const tx = d.transaction(s, 'readwrite'); tx.objectStore(s).delete(id); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }); }
  };
  const URLS = {};
  async function mediaURL(id) { if (!id) return null; if (URLS[id]) return URLS[id]; const m = await DB.get('media', id); if (!m) return null; URLS[id] = URL.createObjectURL(m.blob); return URLS[id]; }
  async function putMedia(blob, kind) { const id = uid(); await DB.put('media', { id, kind, blob, at: Date.now() }); return id; }
  function pickFile(accept, capture) {
    return new Promise(res => {
      const fi = $('#fileIn'); fi.value = ''; fi.accept = accept; if (capture) fi.setAttribute('capture', capture); else fi.removeAttribute('capture');
      fi.onchange = () => res(fi.files && fi.files.length ? Array.from(fi.files) : null);
      fi.click();
    });
  }
  async function shrink(file, max) {
    const url = URL.createObjectURL(file), im = new Image(); im.src = url; await new Promise(r => { im.onload = r; im.onerror = r; });
    const k = Math.min(1, (max || 800) / Math.max(im.width || 1, im.height || 1)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    return new Promise(r => c.toBlob(b => r(b), 'image/jpeg', 0.85));
  }
  let recorder = null;
  async function recordToggle(btn, done) {
    if (recorder) { recorder.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ['audio/mp4', 'audio/webm', ''].find(m => !m || (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)));
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks = [];
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = async () => { stream.getTracks().forEach(t => t.stop()); btn.classList.remove('on'); const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/mp4' }); recorder = null; if (blob.size > 500) done(await putMedia(blob, 'audio')); };
      recorder.start(); btn.classList.add('on'); toast('🔴 ろくおん ちゅう… もう いちど おすと とまります', 3000);
      setTimeout(() => { if (recorder) recorder.stop(); }, 10000);
    } catch (e) { toast('マイクが つかえません（設定で マイクを 許可して ください）', 3500); }
  }

  /* ============================================================
     カード（はじめから ある ことば ＋ 先生が つくった・なおした もの）
     ============================================================ */
  const VB = {}; VOCAB.forEach(v => { VB[v.id] = v; });
  let OVR = {};   // id → 先生の カード（なおした もの・つくった もの）
  let KIDS = [];
  function getC(id) {
    const b = VB[id], o = OVR[id]; if (!b && !o) return null;
    const c = Object.assign({}, b || {}, o || {}); c.id = id;
    return c.hidden ? null : c;
  }
  function listCards(role) {
    const own = Object.keys(OVR).filter(id => !VB[id]).sort((a, b) => (OVR[a].at || 0) - (OVR[b].at || 0));
    return own.concat(VOCAB.map(v => v.id)).map(getC).filter(c => c && (!role || c.role === role));
  }
  async function saveCard(c) { c.at = c.at || Date.now(); OVR[c.id] = c; await DB.put('cards', c); }
  const KID = () => KIDS.find(k => k.id === st.kid) || null;
  function newKid(name, level) {
    return { id: uid(), name: name || 'こども', at: Date.now(), level: level || 1, polite: true, urgent: level >= 3, autoSpeak: true, layout: 'step', size: 'M',
      l1: DEFAULT_LEVELS[1].cards.slice(), l2: DEFAULT_LEVELS[2].slots.map(a => a.slice()), l3: DEFAULT_LEVELS[3].slots.map(a => a.slice()), fav: DEFAULT_FAV.slice() };
  }
  const saveKid = k => DB.put('kids', k);
  const LEVELS = [
    { n: 1, t: '1まいで', ex: '「🚻 トイレ」→「トイレに いきたいです」', d: '1〜4まいの 大きな カード。1まいで 伝えたい ことが まるごと 伝わります。まずは「えらぶと 伝わる」経験から。' },
    { n: 2, t: '2まいで', ex: '「🍵 おちゃ」＋「🥤 のみたい」→「おちゃを のみたいです」', d: '「なに・どこ」→「どうしたい」の じゅんに えらびます。' },
    { n: 3, t: '3まいで', ex: '「やまだせんせい」＋「トイレ」＋「いきたい」→「やまだせんせい、トイレに いきたいです」', d: '「だれに」→「なに・どこ」→「どうしたい」。相手に よびかけて 伝えます。' },
    { n: 4, t: 'じゆうに', ex: 'なかまの タブから 自由に ならべて 文に', d: 'たくさんの ことばから えらんで、自分で 文を つくります。' }
  ];

  /* ============================================================
     えらびかた（タッチ／ながおし／スキャン）と 連続タッチ よけ
     ============================================================ */
  let lastSel = 0;
  function bindSel(el, fn, noGuard) {
    el.setAttribute('data-scan', '');
    let tm = null, sx = 0, sy = 0;
    const fire = () => { const now = Date.now(); if (!noGuard && now - lastSel < st.guard) return; lastSel = now; fn(); };
    el.__fire = fire;
    const cancel = () => { if (tm) { clearTimeout(tm); tm = null; } el.classList.remove('holding'); };
    el.addEventListener('pointerdown', e => {
      if (st.scan || st.sel !== 'hold' || noGuard) return;
      sx = e.clientX; sy = e.clientY; el.style.setProperty('--hold', st.holdMs + 'ms');
      requestAnimationFrame(() => el.classList.add('holding'));
      tm = setTimeout(() => { tm = null; el.classList.remove('holding'); fire(); }, st.holdMs);
    });
    el.addEventListener('pointermove', e => { if (tm && Math.hypot(e.clientX - sx, e.clientY - sy) > 30) cancel(); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => el.addEventListener(ev, cancel));
    el.addEventListener('click', () => { if (st.scan || (st.sel === 'hold' && !noGuard)) return; fire(); });
    return el;
  }
  // 1スイッチの スキャン：じゅんばんに 光り、どこを おしても（スペース・エンターでも）えらぶ
  const SCAN = { i: -1, t: null, items: [] };
  function scanStop() { clearInterval(SCAN.t); SCAN.t = null; document.querySelectorAll('.scan-on').forEach(x => x.classList.remove('scan-on')); }
  function scanRefresh() {
    scanStop();
    if (!st.scan || $('#menu').classList.contains('open') || document.querySelector('.overlay')) return;
    const root = document.querySelector('.show') || main;
    SCAN.items = Array.from(root.querySelectorAll('[data-scan]')).filter(e => e.offsetParent && !e.disabled);
    if (!SCAN.items.length) return;
    SCAN.i = -1; scanStep(); SCAN.t = setInterval(scanStep, st.scanMs);
  }
  function scanStep() {
    const it = SCAN.items; if (!it.length) return;
    if (it[SCAN.i]) it[SCAN.i].classList.remove('scan-on');
    SCAN.i = (SCAN.i + 1) % it.length; it[SCAN.i].classList.add('scan-on');
    try { it[SCAN.i].scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* 無視 */ }
  }
  const scanBlocked = t => !st.scan || !SCAN.t || (t && t.closest && t.closest('#gear, #menu, .overlay'));
  function scanSelect() { const el = SCAN.items[SCAN.i]; if (el && el.__fire) { el.__fire(); } }
  document.addEventListener('pointerdown', e => { if (scanBlocked(e.target)) return; e.preventDefault(); e.stopPropagation(); scanSelect(); }, true);
  document.addEventListener('click', e => { if (scanBlocked(e.target)) return; e.preventDefault(); e.stopPropagation(); }, true);
  document.addEventListener('keydown', e => { if (scanBlocked(e.target) || !(e.key === ' ' || e.key === 'Enter')) return; e.preventDefault(); scanSelect(); });

  /* ============================================================
     カードの 見た目
     ============================================================ */
  const roleOf = c => ROLES[c && c.role] || ROLES.thing;
  function paint(el, c) { const r = roleOf(c); el.style.setProperty('--rc', r.c); el.style.setProperty('--rb', r.bg); return el; }
  function photoInto(el, c, cls) { if (c && c.photoId) mediaURL(c.photoId).then(u => { if (u) { el.style.backgroundImage = 'url("' + u + '")'; if (cls) el.classList.add(cls); const e = el.querySelector('.emo'); if (e) e.remove(); } }); }
  function cardEl(c, onSel, extra) {
    const pic = h('div', { class: 'pic' }, h('span', { class: 'emo' }, c.e || '⭐'));
    const el = paint(h('button', { type: 'button', class: 'card' + (extra ? ' ' + extra : ''), 'aria-label': c.w }, pic, h('div', { class: 'lb', style: (c.w || '').length > 5 ? 'font-size:clamp(11px,min(13cqh,' + (78 / c.w.length).toFixed(1) + 'cqw),64px)' : null }, c.w), h('i', { class: 'hold' })), c);
    photoInto(pic, c, 'photo');
    if (onSel) bindSel(el, onSel);
    return el;
  }
  function thumb(c, cls) { const t = h('span', { class: cls || 'ph' }); if (c.photoId) photoInto(t, c); else return h('span', { class: 'emo' }, c.e || '⭐'); return t; }
  function miniEl(c, extra) { return paint(h('span', { class: 'mini' }, thumb(c), c.w, extra || null), c); }
  // 画面に ぴったり おさまる ならべかた（まいすうと 画面の 形から）
  function fitGrid(el) {
    const n = +el.dataset.n || 1, gap = parseFloat(getComputedStyle(el).rowGap) || 10, W = el.clientWidth, H = el.clientHeight;
    if (!W || !H) return;
    let best = null;
    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols), cw = (W - gap * (cols - 1)) / cols, ch = (H - gap * (rows - 1)) / rows;
      const w = Math.min(cw, ch * 1.3), hh = Math.min(ch, w * 1.15), sc = Math.min(w, 600) * Math.min(hh, 640);
      if (!best || sc > best.sc + 1) best = { cols, w, hh, sc };
    }
    el.style.gridTemplateColumns = 'repeat(' + best.cols + ', ' + Math.floor(Math.min(best.w, 600)) + 'px)';
    el.style.gridAutoRows = Math.floor(Math.min(best.hh, 640)) + 'px';
  }
  const fitAll = () => document.querySelectorAll('.fit').forEach(fitGrid);

  /* ============================================================
     ボード
     ============================================================ */
  const main = $('#main');
  const B = { picks: [], slot: 0, spoken: false, free: [], tab: 'fav' };
  function resetBoard() { B.picks = []; B.slot = 0; B.spoken = false; B.free = []; }
  function updateWho() {
    const k = KID(), w = $('#who');
    w.hidden = !k; if (!k) return;
    w.textContent = (st.modeling ? '👩‍🏫 モデリング ・ ' : '') + k.name + ' ・ ' + LEVELS[k.level - 1].t;
    w.classList.toggle('model', !!st.modeling);
  }
  function render() {
    stopVoice(); main.innerHTML = ''; updateWho();
    const k = KID();
    if (!k) { renderWelcome(); return; }
    const bd = h('section', { class: 'board' }); main.append(bd);
    if (k.level === 1) lv1(bd, k); else if (k.level === 4) lvFree(bd, k); else lvSlots(bd, k);
    if (k.urgent) bd.append(urgentBar(k));
    requestAnimationFrame(() => { fitAll(); scanRefresh(); });
  }

  /* ---------- 1まいで ---------- */
  function lv1(bd, k) {
    const cards = k.l1.map(getC).filter(Boolean);
    if (!cards.length) { bd.append(h('p', { class: 'hint' }, '⚙️ ながおし →「🧒 こども」で カードを えらんで ください')); return; }
    const g = h('div', { class: 'fit', 'data-n': cards.length });
    cards.forEach(c => g.append(cardEl(c, () => {
      const text = single(c, k.polite);
      g.querySelectorAll('.card').forEach(x => x.classList.toggle('dim', x.getAttribute('aria-label') !== c.w));
      setTimeout(() => g.querySelectorAll('.card').forEach(x => x.classList.remove('dim')), 1800);
      sayOr(text, c.msgAudioId); addLog([c], text, 'one');
      if (st.showBig) showBig([c], text, true);
    })));
    bd.append(g);
  }

  /* ---------- 2まいで・3まいで（スロット） ---------- */
  function lvSlots(bd, k) {
    const n = k.level, sets = (n === 2 ? k.l2 : k.l3) || [], names = SLOT_NAMES[n];
    if (B.picks.length !== n) { B.picks = Array(n).fill(null); B.slot = 0; }
    const picks = () => B.picks.map(getC);
    const slotRole = i => { const f = (sets[i] || []).map(getC).find(Boolean); return f || { role: i === n - 1 ? 'action' : n === 3 && i === 0 ? 'person' : 'thing' }; };
    const pick = (i, c) => {
      if (B.spoken) { B.picks = Array(n).fill(null); B.spoken = false; }
      B.picks[i] = c.id; sayWord(c);
      let nx = B.picks.findIndex((p, j) => j > i && !p); if (nx < 0) nx = B.picks.findIndex(p => !p);
      if (nx >= 0) { B.slot = nx; render(); return; }
      render();
      if (k.autoSpeak) setTimeout(() => speakSentence(picks(), k), st.sayOnTap ? 900 : 200);
    };
    // 文の バー
    const slots = h('div', { class: 'slots' });
    for (let i = 0; i < n; i++) {
      const c = getC(B.picks[i]), r = roleOf(slotRole(i));
      if (i > 0) slots.append(h('span', { class: 'arw' }, '▶'));
      const s = h('button', { type: 'button', class: 'slot' + (c ? ' filled' : '') + (i === B.slot && !B.spoken ? ' cur' : ''), style: '--rc:' + r.c + ';--rb:' + r.bg },
        h('span', { class: 'sl' }, names[i]), h('span', { class: 'sv' }, c ? [thumb(c), c.w] : h('span', { class: 'q' }, '？')));
      bindSel(s, () => { if (B.spoken) { B.picks = Array(n).fill(null); B.spoken = false; } B.slot = i; render(); });
      slots.append(s);
    }
    const any = B.picks.some(Boolean);
    bd.append(h('div', { class: 'sbar' }, slots, actsEl(any, () => speakSentence(picks(), k), () => { resetBoard(); render(); })));
    if (st.preview && any) bd.append(h('div', { class: 'sentence' }, compose(picks(), { polite: k.polite })));
    // カード
    const cols = k.layout === 'cols' && main.clientWidth >= 700;
    if (cols) {
      const wrap = h('div', { class: 'cols', style: 'grid-template-columns:repeat(' + n + ', minmax(0,1fr))' });
      for (let i = 0; i < n; i++) {
        const r = roleOf(slotRole(i)), list = (sets[i] || []).map(getC).filter(Boolean);
        const cg = h('div', { class: 'cg fit', 'data-n': list.length || 1 });
        list.forEach(c => cg.append(cardEl(c, () => pick(i, c), B.picks[i] === c.id ? 'on' : '')));
        wrap.append(h('div', { class: 'col' }, h('div', { class: 'ch', style: '--rb:' + r.bg }, names[i]), cg));
      }
      bd.append(wrap);
    } else {
      const list = (sets[B.slot] || []).map(getC).filter(Boolean);
      const g = h('div', { class: 'fit', 'data-n': list.length || 1 });
      list.forEach(c => g.append(cardEl(c, () => pick(B.slot, c), B.picks[B.slot] === c.id ? 'on' : '')));
      if (!list.length) g.append(h('p', { class: 'hint' }, '⚙️ ながおし →「🧒 こども」で「' + names[B.slot] + '」の カードを えらんで ください'));
      bd.append(g);
    }
  }
  function actsEl(ready, onSpeak, onClear, onBack) {
    const sp = bindSel(h('button', { type: 'button', class: 'speak' + (ready ? ' ready' : '') }, h('span', { class: 'emo' }, '🔊'), 'はなす'), () => { if (ready) onSpeak(); });
    if (!ready) sp.disabled = true;
    return h('div', { class: 'acts' }, sp,
      onBack ? bindSel(h('button', { type: 'button', class: 'ibtn', 'aria-label': '1つ けす' }, h('span', null, '⌫', h('small', null, 'ひとつ'))), onBack) : null,
      bindSel(h('button', { type: 'button', class: 'ibtn', 'aria-label': 'ぜんぶ けす' }, h('span', null, '🗑️', h('small', null, 'けす'))), onClear));
  }
  function speakSentence(cards, k) {
    cards = cards.filter(Boolean); if (!cards.length) return;
    const text = compose(cards, { polite: k.polite });
    say(text); addLog(cards, text, 'sent'); B.spoken = true;
    if (st.showBig) showBig(cards, text); else render();
  }

  /* ---------- じゆうに ---------- */
  function lvFree(bd, k) {
    const cards = B.free.map(getC).filter(Boolean);
    const strip = h('div', { class: 'strip' });
    if (!cards.length) strip.append(h('span', { class: 'empty' }, 'カードを えらぶと ここに ならびます'));
    cards.forEach((c, i) => strip.append(bindSel(paint(h('button', { type: 'button', class: 'chip', 'aria-label': c.w + ' を はずす' }, thumb(c), c.w), c), () => { B.free.splice(i, 1); B.spoken = false; render(); })));
    bd.append(h('div', { class: 'sbar' }, strip, actsEl(cards.length > 0, () => speakSentence(cards, k), () => { resetBoard(); render(); }, () => { B.free.pop(); B.spoken = false; render(); })));
    if (st.preview && cards.length) bd.append(h('div', { class: 'sentence' }, compose(cards, { polite: k.polite })));
    setTimeout(() => { strip.scrollLeft = strip.scrollWidth; }, 0);
    // なかまの タブ
    const tabs = [{ k: 'fav', n: 'よく つかう', e: '⭐' }].concat(Object.keys(ROLES).filter(r => listCards(r).length).map(r => ({ k: r, n: ROLES[r].n, e: ROLES[r].e, r: ROLES[r] })));
    if (!tabs.some(t => t.k === B.tab)) B.tab = 'fav';
    bd.append(h('div', { class: 'rtabs' }, tabs.map(t => bindSel(h('button', { type: 'button', class: 'rtab' + (B.tab === t.k ? ' on' : ''), style: t.r ? '--rc:' + t.r.c + ';--rb:' + t.r.bg : '--rc:#FAB005;--rb:#FFF9DB' }, h('span', { class: 'emo' }, t.e), t.n), () => { B.tab = t.k; render(); }))));
    const list = B.tab === 'fav' ? (k.fav || []).map(getC).filter(Boolean) : listCards(B.tab);
    const base = { L: 170, M: 128, S: 96 }[k.size || 'M'] * (isPhone() ? 0.72 : 1);
    const g = h('div', { class: 'scrollgrid', style: 'grid-template-columns:repeat(auto-fill,minmax(' + Math.round(base) + 'px,1fr));grid-auto-rows:' + Math.round(base * 1.05) + 'px' });
    list.forEach(c => g.append(cardEl(c, () => {
      if (B.spoken) { B.free = []; B.spoken = false; }
      if (B.free.length >= 10) { toast('10まいまで です'); return; }
      B.free.push(c.id); sayWord(c); const top = g.scrollTop; render(); const ng = main.querySelector('.scrollgrid'); if (ng) ng.scrollTop = top;
    })));
    bd.append(g);
  }

  /* ---------- いそぎ ---------- */
  function urgentBar(k) {
    return h('div', { class: 'urgent' }, URGENT.map(getC).filter(Boolean).map(c => bindSel(h('button', { type: 'button', class: 'ubtn' }, h('span', { class: 'emo' }, c.e), c.w), () => {
      const text = single(c, k.polite); sayOr(text, c.msgAudioId); addLog([c], text, 'urgent'); if (st.showBig) showBig([c], text, true);
    }, true)));
  }

  /* ---------- 大きく 見せる ---------- */
  function showBig(cards, text, one) {
    const old = document.querySelector('.show'); if (old) old.remove();
    const k = KID() || {};
    const parts = one ? null : composeParts(cards, { polite: k.polite });
    const txt = h('div', { class: 'txt' }, parts ? parts.map(p => paint(h('span', null, p.t), p.c)).reduce((a, s, i) => { if (i && !/、$/.test(parts[i - 1].t)) a.push(' '); a.push(s); return a; }, []) : text);
    const pics = h('div', { class: 'pics' }, cards.map((c, i) => { const d = paint(h('div', { class: 'pc', style: 'animation-delay:' + (i * 0.08) + 's' }, h('span', { class: 'emo' }, c.e || '⭐')), c); photoInto(d, c); return d; }));
    const inner = h('div', { class: 'inner', 'aria-label': 'もう いちど 話す' }, pics, txt);
    const bar = h('div', { class: 'backbar' });
    const o = h('div', { class: 'show' + (cards.length === 1 ? ' one' : '') }, bar, inner);
    let tm = null;
    const close = () => { clearTimeout(tm); if (!o.isConnected) return; o.remove(); if (B.spoken) { resetBoard(); } render(); };
    // 時間が たつと カードの 画面へ もどる（話しなおすと 時間は はじめから）
    const arm = () => {
      clearTimeout(tm); bar.style.transition = 'none'; bar.style.width = '100%';
      if (!st.bigBack) { bar.hidden = true; return; }
      requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.transition = 'width ' + st.bigBack + 's linear'; bar.style.width = '0%'; }));
      tm = setTimeout(close, st.bigBack * 1000 + 300);
    };
    // 写真や 文を もう いちど タッチ → もう いちど 話す（小さな ボタンを さがさなくて よい）
    const again = () => { if (one && cards[0]) sayOr(text, cards[0].msgAudioId); else say(text); pics.querySelectorAll('.pc').forEach(p => { p.style.animation = 'none'; void p.offsetWidth; p.style.animation = ''; }); arm(); };
    bindSel(inner, again, true);
    o.append(h('div', { class: 'sacts' },
      bindSel(h('button', { type: 'button', class: 'btn back' }, '◀ もどる'), close, true),
      bindSel(h('button', { type: 'button', class: 'btn sub' }, '🔄 むきを かえる'), () => { o.classList.toggle('flip'); arm(); }, true)));
    arm();
    document.body.append(o);
    requestAnimationFrame(scanRefresh);
  }

  /* ---------- きろく ---------- */
  function addLog(cards, text, kind) {
    const k = KID(); if (!k) return;
    DB.put('logs', { id: uid(), kid: k.id, at: Date.now(), lv: k.level, ids: cards.map(c => c.id), words: cards.map(c => c.w), text, n: cards.length, kind, model: !!st.modeling }).catch(() => {});
  }

  /* ---------- はじめて ---------- */
  function renderWelcome() {
    let lv = 1;
    const name = h('input', { class: 'tin', placeholder: 'なまえ（例：たろう）', style: 'width:min(320px,100%)' });
    const grid = h('div', { class: 'lvgrid' });
    const draw = () => { grid.innerHTML = ''; LEVELS.forEach(L => grid.append(h('button', { type: 'button', class: 'lvc' + (lv === L.n ? ' on' : ''), onclick: () => { lv = L.n; draw(); } }, h('b', null, L.n + '. ' + L.t), h('div', { class: 'ex' }, L.ex), h('small', null, L.d)))); };
    draw();
    main.append(h('section', { class: 'welcome' },
      h('h1', null, '💬 つたえて ボード'),
      h('p', { class: 'help', style: 'text-align:center;max-width:640px' }, 'カードを えらぶと、ことばに なって 声で 伝わる コミュニケーションの アプリです。その子の 今の 力に あわせて 段階を えらびます（あとから いつでも かえられます）。'),
      name, grid,
      h('button', { type: 'button', class: 'btn', onclick: async () => { const k = newKid(name.value.trim() || 'こども', lv); KIDS.push(k); await saveKid(k); st.kid = k.id; saveSt(); resetBoard(); render(); toast('先生用の 設定は 右上の ⚙️ を ながおし', 3500); } }, '▶ はじめる'),
      h('p', { class: 'help' }, '先生用：右上の ⚙️ を 1.5びょう ながおし')));
  }

  /* ============================================================
     先生用メニュー
     ============================================================ */
  let mTab = 'kid';
  function openMenu() { stopVoice(); scanStop(); renderMenu(); $('#menu').classList.add('open'); }
  function closeMenu() { $('#menu').classList.remove('open'); render(); }
  $('#mClose').addEventListener('click', closeMenu);
  $('#menu').addEventListener('click', e => { if (e.target.id === 'menu') closeMenu(); });
  function segEl(label, cur, opts, onPick, help) {
    return h('div', { class: 'srow' }, h('span', { class: 'lb' }, label), h('div', { class: 'seg' }, opts.map(([v, t]) => h('button', { type: 'button', class: cur === v ? 'on' : '', onclick: () => onPick(v) }, t))), help ? h('small', { class: 'help', style: 'width:100%' }, help) : null);
  }
  const stSeg = (label, key, opts, help) => segEl(label, st[key], opts, v => { st[key] = v; saveSt(); if (key === 'voiceName') loadVoice(); renderMenu(); }, help);
  function renderMenu() {
    const tabs = $('#mTabs'); tabs.innerHTML = '';
    [['kid', '🧒 こども'], ['cards', '🃏 カード'], ['rec', '📊 きろく'], ['set', '🛠️ せってい'], ['data', '💾 データ'], ['help', '❓ つかいかた'], ['lic', '📜 ライセンス']].forEach(([k, t]) => tabs.append(h('button', { type: 'button', class: mTab === k ? 'on' : '', onclick: () => { mTab = k; renderMenu(); } }, t)));
    const b = $('#mBody'); b.innerHTML = ''; b.scrollTop = 0;
    ({ kid: menuKid, cards: menuCards, rec: menuRec, set: menuSet, data: menuData, help: menuHelp, lic: menuLic })[mTab](b);
  }

  /* ---------- こども ---------- */
  function menuKid(b) {
    b.append(h('div', { class: 'row' }, KIDS.map(k => h('button', { type: 'button', class: 'pill' + (k.id === st.kid ? ' on' : ''), onclick: () => { st.kid = k.id; saveSt(); resetBoard(); renderMenu(); } }, '🙂 ' + k.name)),
      h('button', { type: 'button', class: 'pill', style: 'border-style:dashed', onclick: async () => { const n = prompt('こどもの なまえ'); if (!n) return; const k = newKid(n.trim(), 1); KIDS.push(k); await saveKid(k); st.kid = k.id; saveSt(); resetBoard(); renderMenu(); } }, '＋ こども')));
    const k = KID(); if (!k) return;
    const up = () => { saveKid(k); resetBoard(); renderMenu(); };
    const nm = h('input', { class: 'tin', value: k.name, style: 'flex:1' }); nm.addEventListener('change', () => { k.name = nm.value.trim() || k.name; up(); });
    b.append(h('div', { class: 'srow' }, h('span', { class: 'lb' }, 'なまえ'), nm));
    // 段階
    b.append(h('div', { class: 'box' }, h('h3', null, '段階'), h('div', { class: 'lvgrid sm' }, LEVELS.map(L => h('button', { type: 'button', class: 'lvc' + (k.level === L.n ? ' on' : ''), onclick: () => { k.level = L.n; if (L.n >= 3 && k.urgent == null) k.urgent = true; up(); } }, h('b', null, L.n + '. ' + L.t), h('div', { class: 'ex' }, L.ex)))),
      h('p', { class: 'help' }, '段階を かえても、ほかの 段階の カードは そのまま のこります。めやすは「📊 きろく」の「1回に つなげた まい数」。')));
    // カード
    const cb = h('div', { class: 'box' }, h('h3', null, 'つかう カード（' + LEVELS[k.level - 1].t + '）'));
    const setRow = (label, ids, max, role, set) => h('div', { class: 'srow', style: 'align-items:flex-start' }, h('span', { class: 'lb' }, label),
      h('div', { class: 'minis', style: 'flex:1' }, ids.map(getC).filter(Boolean).map(c => miniEl(c))),
      h('button', { type: 'button', class: 'pill', onclick: async () => { const r = await picker({ title: label + ' の カード', ids, max, role }); if (r) { set(r); up(); } } }, '✏️ えらぶ'));
    if (k.level === 1) cb.append(setRow('カード（1〜6まい）', k.l1, 6, 'place', r => { k.l1 = r; }), h('p', { class: 'help' }, 'はじめは 1〜2まい（その子が いちばん 伝えたい もの）から。まいすうは 少しずつ ふやします。1まいで 話す 文は「🃏 カード」で かえられます。'));
    if (k.level === 2 || k.level === 3) {
      const key = 'l' + k.level, roles = k.level === 2 ? ['place', 'action'] : ['person', 'place', 'action'];
      SLOT_NAMES[k.level].forEach((nm2, i) => cb.append(setRow(nm2, k[key][i] || [], 12, roles[i], r => { k[key][i] = r; })));
      if (k.level === 3) {
        const tn = h('input', { class: 'tin', placeholder: '例：やまだ', style: 'width:150px' });
        cb.append(h('div', { class: 'srow' }, h('span', { class: 'lb' }, '先生の なまえ カード'), tn, h('span', null, 'せんせい'),
          h('button', { type: 'button', class: 'pill', onclick: async () => { const v = tn.value.trim(); if (!v) return; const c = { id: 'c-' + uid(), role: 'person', e: '🧑‍🏫', w: v + 'せんせい', call: true }; await saveCard(c); k.l3[0] = [c.id].concat(k.l3[0] || []); if (k.fav.indexOf(c.id) < 0) k.fav.unshift(c.id); up(); toast('「' + c.w + '」を つくりました。写真は「🃏 カード」で つけられます', 3500); } }, '＋ つくる')));
      }
      cb.append(segEl('ならべかた', k.layout, [['step', 'ひとつずつ（じゅんに）'], ['cols', 'ならべて（ぜんぶ 見せる）']], v => { k.layout = v; up(); }, 'ひとつずつ：いま えらぶ ところの カードだけ 出ます（見る ものが 少なく 集中しやすい）。ならべて：列に ならべて 全部 見せます（iPad よこ 向き）。'),
        segEl('そろったら', k.autoSpeak, [[true, '自動で 話す'], [false, '🔊を おして 話す']], v => { k.autoSpeak = v; up(); }));
    }
    if (k.level === 4) cb.append(setRow('⭐ よく つかう', k.fav, 40, '', r => { k.fav = r; }), segEl('カードの 大きさ', k.size, [['L', '大'], ['M', '中'], ['S', '小']], v => { k.size = v; up(); }),
      h('p', { class: 'help' }, '「よく つかう」には、どの 場面でも つかえる ことば（コア語彙：〜したい・いや・もっと・おわり・てつだって など）を 入れて おくと、組み合わせで 多くの ことが 伝えられます。'));
    b.append(cb);
    b.append(h('div', { class: 'box' }, h('h3', null, 'ことば・画面'),
      segEl('いいかた', k.polite, [[true, 'ていねい（です・ください）'], [false, 'ふつう（〜たい）']], v => { k.polite = v; up(); }),
      segEl('いそぎの ボタン', !!k.urgent, [[true, '出す'], [false, '出さない']], v => { k.urgent = v; up(); }, 'トイレ・いたい・たすけて・やすみたい を いつでも 1回で 伝えられる 帯です。')));
    b.append(h('div', { class: 'row' }, h('button', { type: 'button', class: 'pill danger', onclick: async () => {
      if (!confirm('「' + k.name + '」を けしますか？（きろくも けします）')) return;
      for (const l of (await DB.all('logs')).filter(x => x.kid === k.id)) await DB.del('logs', l.id);
      await DB.del('kids', k.id); KIDS = KIDS.filter(x => x !== k); st.kid = KIDS.length ? KIDS[0].id : ''; saveSt(); resetBoard(); renderMenu();
    } }, '🗑️ この子を けす')));
  }

  /* ---------- カードを えらぶ ---------- */
  function picker(o) {
    return new Promise(res => {
      let sel = (o.ids || []).filter(getC), role = o.role || '';
      const ov = h('div', { class: 'overlay' }), body = h('div', { class: 'obody' });
      const count = h('span', { class: 'help' });
      const done = r => { ov.remove(); res(r); };
      ov.append(h('div', { class: 'ob' }, h('div', { class: 'oh' }, h('h3', null, o.title), count, h('button', { type: 'button', class: 'pill', onclick: () => done(null) }, 'やめる'), h('button', { type: 'button', class: 'btn', style: 'min-height:46px', onclick: () => done(sel) }, '✔ けってい')), body));
      const draw = () => {
        body.innerHTML = ''; count.textContent = sel.length + (o.max ? ' / ' + o.max : '') + ' まい';
        body.append(h('div', { class: 'minis' }, sel.length ? sel.map(getC).filter(Boolean).map((c, i) => miniEl(c, h('b', { style: 'margin-left:4px;color:#868E96' }, String(i + 1)))) : h('span', { class: 'help' }, 'えらんだ じゅんに ならびます')));
        body.append(h('div', { class: 'row' }, [['', 'ぜんぶ']].concat(Object.keys(ROLES).map(r => [r, ROLES[r].e + ' ' + ROLES[r].n])).map(([r, t]) => h('button', { type: 'button', class: 'pill small' + (role === r ? ' on' : ''), onclick: () => { role = r; draw(); } }, t)),
          h('button', { type: 'button', class: 'pill small', style: 'border-style:dashed', onclick: async () => { const c = await editCard(null, role || 'thing'); if (c && (!o.max || sel.length < o.max)) sel.push(c.id); draw(); } }, '＋ あたらしい カード')));
        const g = h('div', { class: 'pgrid' });
        listCards(role).forEach(c => {
          const i = sel.indexOf(c.id), el = cardEl(c, null, i >= 0 ? 'on' : '');
          if (i >= 0) el.append(h('span', { class: 'mark' }, String(i + 1)));
          el.addEventListener('click', () => { if (i >= 0) sel.splice(i, 1); else if (o.max && sel.length >= o.max) { toast(o.max + 'まい までです'); return; } else sel.push(c.id); draw(); });
          g.append(el);
        });
        body.append(g);
      };
      draw(); document.body.append(ov);
    });
  }

  /* ---------- カードを つくる・なおす ---------- */
  function editCard(id, role) {
    return new Promise(res => {
      const base = id ? getC(id) : null, isOwn = !id || !VB[id];
      const d = Object.assign({ role: role || 'thing', e: '⭐', w: '' }, base || {});
      if (!id) d.id = 'c-' + uid();
      const ov = h('div', { class: 'overlay' }), body = h('div', { class: 'obody' });
      const done = r => { ov.remove(); res(r); };
      ov.append(h('div', { class: 'ob' }, h('div', { class: 'oh' }, h('h3', null, id ? '✏️ カードを なおす' : '＋ あたらしい カード'), h('button', { type: 'button', class: 'pill', onclick: () => done(null) }, 'やめる'),
        h('button', { type: 'button', class: 'btn', style: 'min-height:46px', onclick: async () => { if (!d.w.trim()) { toast('ことばを いれて ください'); return; } d.w = d.w.trim(); await saveCard(d); done(getC(d.id)); } }, '✔ ほぞん')), body));
      const inp = (key, ph, w) => { const x = h('input', { class: 'tin', value: d[key] || '', placeholder: ph || '', style: 'flex:1;min-width:' + (w || 160) + 'px' }); x.addEventListener('input', () => { d[key] = x.value; if (key === 'w' || key === 'e') prevDraw(); }); return x; };
      const prev = h('div');
      const prevDraw = () => { prev.innerHTML = ''; prev.append(cardEl(Object.assign({}, d, { w: d.w || '（ことば）' }))); };
      const audioRow = (label, key) => {
        const rb = h('button', { type: 'button', class: 'pill rec' }, '🎙️ ろくおん');
        rb.addEventListener('click', () => recordToggle(rb, mid => { d[key] = mid; draw(); toast('ろくおん しました'); }));
        return h('div', { class: 'srow' }, h('span', { class: 'lb' }, label), rb,
          d[key] ? h('button', { type: 'button', class: 'pill', onclick: () => sayOr('', d[key]) }, '▶ きく') : null,
          d[key] ? h('button', { type: 'button', class: 'pill danger', onclick: () => { delete d[key]; draw(); } }, '✖') : h('small', { class: 'help' }, 'なければ 自動の 声で よみます'));
      };
      const draw = () => {
        body.innerHTML = ''; prevDraw();
        const right = h('div', { style: 'display:flex;flex-direction:column;gap:10px;min-width:0' },
          segEl('なかま', d.role, Object.keys(ROLES).map(r => [r, ROLES[r].e + ' ' + ROLES[r].n]), v => { d.role = v; draw(); }),
          h('div', { class: 'srow' }, h('span', { class: 'lb' }, 'ことば'), inp('w', '例：やまだせんせい・ブランコ')),
          h('div', { class: 'srow' }, h('span', { class: 'lb' }, 'えもじ'), inp('e', '⭐', 80), h('small', { class: 'help' }, '写真が ない ときに 出ます')),
          h('div', { class: 'srow' }, h('span', { class: 'lb' }, '写真'),
            h('button', { type: 'button', class: 'pill', onclick: async () => { const f = await pickFile('image/*', 'environment'); if (f) { d.photoId = await putMedia(await shrink(f[0]), 'photo'); draw(); } } }, '📷 とる'),
            h('button', { type: 'button', class: 'pill', onclick: async () => { const f = await pickFile('image/*'); if (f) { d.photoId = await putMedia(await shrink(f[0]), 'photo'); draw(); } } }, '🖼️ えらぶ'),
            d.photoId ? h('button', { type: 'button', class: 'pill danger', onclick: () => { delete d.photoId; draw(); } }, '✖ はずす') : null));
        body.append(h('div', { class: 'edgrid' }, prev, right));
        const more = h('div', { class: 'box' }, h('h3', null, '話す ことば'));
        more.append(audioRow('ことばの 声', 'audioId'));
        if (d.role === 'action' || d.role === 'feeling' || d.role === 'social') more.append(h('div', { class: 'srow' }, h('span', { class: 'lb' }, 'ていねいな いいかた'), inp('polite', d.w ? d.w + 'です' : '例：いきたいです')));
        if (d.role === 'action') {
          d.obj = Object.assign({}, d.obj || {});
          const ps = (role2, opts) => segEl('「' + ROLES[role2].n + '」との 助詞', d.obj[role2] == null ? (PART_DEFAULT.action[role2]) : d.obj[role2], opts, v => { d.obj[role2] = v; draw(); });
          more.append(ps('thing', [['を', 'を'], ['が', 'が'], ['で', 'で'], ['に', 'に']]), ps('place', [['に', 'に'], ['で', 'で'], ['へ', 'へ']]), ps('person', [['に', 'に'], ['と', 'と']]));
        }
        if (d.role === 'person') more.append(segEl('つかいかた', d.call !== false, [[true, 'よびかけ（○○、）'], [false, 'じぶん（○○は）']], v => { d.call = v; draw(); }));
        const mi = inp('msg', single(Object.assign({}, d, { msg: '' }), (KID() || {}).polite !== false));
        more.append(h('div', { class: 'srow' }, h('span', { class: 'lb' }, '1まいで 話す 文'), mi), h('small', { class: 'help' }, '「1まいで」の 段階や いそぎの ボタンで つかう 文です。空なら 自動（例：トイレ → トイレに いきたいです）。'),
          audioRow('1まいの 文の 声', 'msgAudioId'),
          h('div', { class: 'row' }, h('button', { type: 'button', class: 'pill', onclick: () => sayOr(d.w, d.audioId) }, '🔊 ことば'), h('button', { type: 'button', class: 'pill', onclick: () => sayOr(single(d, (KID() || {}).polite !== false), d.msgAudioId) }, '🔊 1まいの 文')));
        body.append(more);
        if (id) body.append(h('div', { class: 'row' },
          h('button', { type: 'button', class: 'pill danger', onclick: async () => { if (!confirm(isOwn ? 'この カードを けしますか？' : 'この カードを かくしますか？（あとで もどせます）')) return; if (isOwn) { delete OVR[id]; await DB.del('cards', id); } else await saveCard(Object.assign({}, OVR[id] || {}, { id, hidden: true })); done(null); } }, isOwn ? '🗑️ けす' : '🙈 かくす'),
          !isOwn && OVR[id] ? h('button', { type: 'button', class: 'pill', onclick: async () => { delete OVR[id]; await DB.del('cards', id); done(getC(id)); } }, '↩️ はじめの カードに もどす') : null));
      };
      draw(); document.body.append(ov);
    });
  }
  let cRole = '';
  function menuCards(b) {
    b.append(h('p', { class: 'help' }, '色は ことばの なかまです（ひと＝黄・もの＝オレンジ・ばしょ＝むらさき・したい＝緑・きもち＝青・こたえ＝ピンク）。写真や 先生の 声を つけると、その子に わかりやすく なります。カードを おすと なおせます。'));
    b.append(h('div', { class: 'row' }, [['', 'ぜんぶ']].concat(Object.keys(ROLES).map(r => [r, ROLES[r].e + ' ' + ROLES[r].n])).map(([r, t]) => h('button', { type: 'button', class: 'pill small' + (cRole === r ? ' on' : ''), onclick: () => { cRole = r; renderMenu(); } }, t)),
      h('button', { type: 'button', class: 'pill', style: 'border-style:dashed;color:var(--main)', onclick: async () => { await editCard(null, cRole || 'thing'); renderMenu(); } }, '＋ あたらしい カード')));
    const g = h('div', { class: 'pgrid' });
    listCards(cRole).forEach(c => { const el = cardEl(c); el.addEventListener('click', async () => { await editCard(c.id); renderMenu(); }); g.append(el); });
    b.append(g);
    const hid = Object.keys(OVR).filter(id => OVR[id].hidden && VB[id]);
    if (hid.length) b.append(h('div', { class: 'box' }, h('h3', null, '🙈 かくした カード'), h('div', { class: 'minis' }, hid.map(id => h('button', { type: 'button', class: 'pill small', onclick: async () => { const o = Object.assign({}, OVR[id]); delete o.hidden; await saveCard(o); renderMenu(); } }, '↩️ ' + VB[id].w)))));
  }

  /* ---------- きろく ---------- */
  let rRange = 30;
  async function menuRec(b) {
    const k = KID(); if (!k) { b.append(h('p', { class: 'help' }, 'こどもが いません')); return; }
    const all = (await DB.all('logs')).filter(l => l.kid === k.id).sort((a, x) => a.at - x.at);
    const from = rRange ? Date.now() - rRange * 864e5 : 0;
    const logs = all.filter(l => l.at >= from && !l.model), model = all.filter(l => l.at >= from && l.model);
    b.append(h('div', { class: 'row' }, h('b', { style: 'flex:1;font-size:18px' }, '📊 ' + k.name + ' の きろく'), segEl('', rRange, [[7, '7日'], [30, '30日'], [0, 'ぜんぶ']], v => { rRange = v; renderMenu(); })));
    const days = new Set(logs.map(l => new Date(l.at).toDateString())).size;
    const sent = logs.filter(l => l.kind === 'sent'), mean = sent.length ? sent.reduce((s, l) => s + l.n, 0) / sent.length : 0;
    b.append(h('div', { class: 'stat' },
      h('div', null, h('b', null, String(logs.length)), '伝えた 回数'),
      h('div', null, h('b', null, days ? (logs.length / days).toFixed(1) : '0'), '1日 あたり（つかった 日）'),
      h('div', null, h('b', null, mean ? mean.toFixed(1) : '−'), '1回に つなげた まい数（へいきん）'),
      h('div', null, h('b', null, String(logs.filter(l => l.kind === 'urgent').length)), 'いそぎの ボタン'),
      h('div', null, h('b', null, String(model.length)), '👩‍🏫 先生の モデリング')));
    // 日ごとの 回数（ぼう）と まい数（せん）
    const cv = h('canvas', { class: 'chart' }); b.append(cv);
    requestAnimationFrame(() => drawChart(cv, logs));
    if (k.level < 4 && sent.length + logs.filter(l => l.kind === 'one').length >= 15) {
      const lvMean = k.level === 1 ? 1 : mean;
      if (k.level === 1 || lvMean >= k.level - 0.2) b.append(h('div', { class: 'box', style: 'background:#EBFBEE;border-color:#B2F2BB' }, h('b', null, '📈 段階の めやす'),
        h('p', { class: 'help' }, k.level === 1 ? '1まいの カードで よく 伝えられています。カードの まいすうを ふやす、または「2まいで」を ためしても よい ころかも しれません。' : LEVELS[k.level - 1].t + ' の 文を よく つくれています。「' + LEVELS[k.level].t + '」を ためしても よい ころかも しれません。') ,
        h('p', { class: 'help' }, '※ あくまで めやすです。その子の ようすを 見て 判断して ください。むずかしそうなら すぐ もどせます。')));
    }
    // よく つかう ことば
    const cnt = {}; logs.forEach(l => (l.ids || []).forEach(id => { cnt[id] = (cnt[id] || 0) + 1; }));
    const top = Object.keys(cnt).sort((a, x) => cnt[x] - cnt[a]).slice(0, 16);
    if (top.length) b.append(h('div', { class: 'box' }, h('h3', null, 'よく つかった ことば'), h('div', { class: 'minis' }, top.map(id => { const c = getC(id) || { w: id, role: 'thing' }; return miniEl(c, h('b', { style: 'margin-left:4px;color:#868E96' }, '×' + cnt[id])); }))));
    // さいきん
    const KN = { one: '1まい', sent: '文', urgent: 'いそぎ' };
    b.append(h('div', { class: 'box' }, h('h3', null, 'さいきん 伝えた こと'),
      all.length ? h('table', { class: 'lg' }, all.slice(-40).reverse().map(l => h('tr', null, h('td', { class: 't' }, new Date(l.at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })), h('td', null, l.text), h('td', { class: 't' }, (l.model ? '👩‍🏫 ' : '') + (KN[l.kind] || '') + ' ' + l.n + 'まい')))) : h('p', { class: 'help' }, 'まだ ありません'),
      h('div', { class: 'row' }, h('button', { type: 'button', class: 'pill', onclick: () => exportCsv(k, all) }, '📄 CSV で かきだす'), h('button', { type: 'button', class: 'pill danger', onclick: async () => { if (!confirm(k.name + ' の きろくを ぜんぶ けしますか？')) return; for (const l of all) await DB.del('logs', l.id); renderMenu(); } }, '🗑️ きろくを けす'))));
  }
  function drawChart(cv, logs) {
    const W = cv.clientWidth, H = cv.clientHeight, d = Math.min(devicePixelRatio || 1, 2); cv.width = W * d; cv.height = H * d;
    const g = cv.getContext('2d'); g.scale(d, d); g.font = '12px sans-serif';
    const by = {}; logs.forEach(l => { const k = new Date(l.at); k.setHours(0, 0, 0, 0); const t = +k; (by[t] = by[t] || []).push(l); });
    const keys = Object.keys(by).map(Number).sort((a, b) => a - b).slice(-30);
    if (!keys.length) { g.fillStyle = '#ADB5BD'; g.fillText('まだ きろくが ありません', 14, 24); return; }
    const L = 34, R = 34, T = 22, Bt = 26, cw = Math.min(60, (W - L - R) / keys.length), maxC = Math.max(...keys.map(k => by[k].length), 1), maxN = 4;
    g.fillStyle = '#868E96'; g.fillText('回数', 4, 14); g.fillText('まい数', W - 44, 14);
    keys.forEach((k, i) => {
      const c = by[k].length, x = L + i * cw, bh = (H - T - Bt) * c / maxC;
      g.fillStyle = '#BAC8FF'; g.fillRect(x + cw * 0.15, H - Bt - bh, cw * 0.7, bh);
      if (keys.length <= 14 || i % Math.ceil(keys.length / 10) === 0) { g.fillStyle = '#868E96'; const dt = new Date(k); g.fillText((dt.getMonth() + 1) + '/' + dt.getDate(), x + cw * 0.1, H - 8); }
    });
    g.strokeStyle = '#2F9E44'; g.lineWidth = 3; g.beginPath();
    keys.forEach((k, i) => { const s = by[k].filter(l => l.kind === 'sent'), m = s.length ? s.reduce((a, l) => a + l.n, 0) / s.length : 1, x = L + i * cw + cw / 2, y = H - Bt - (H - T - Bt) * Math.min(m, maxN) / maxN; if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    g.stroke();
    g.fillStyle = '#2F9E44'; keys.forEach((k, i) => { const s = by[k].filter(l => l.kind === 'sent'), m = s.length ? s.reduce((a, l) => a + l.n, 0) / s.length : 1; g.beginPath(); g.arc(L + i * cw + cw / 2, H - Bt - (H - T - Bt) * Math.min(m, maxN) / maxN, 4.5, 0, 7); g.fill(); });
    g.fillStyle = '#2F9E44'; [1, 2, 3, 4].forEach(n => g.fillText(String(n), W - 16, H - Bt - (H - T - Bt) * n / maxN + 4));
  }
  function exportCsv(k, logs) {
    const KN = { one: '1まい', sent: '文', urgent: 'いそぎ' };
    const rows = ['日時,こども,段階,しゅるい,まい数,カード,伝えた文,モデリング'];
    logs.forEach(l => rows.push([new Date(l.at).toLocaleString('ja-JP'), k.name, l.lv, KN[l.kind] || l.kind, l.n, (l.words || []).join('＋'), '"' + String(l.text).replace(/"/g, '""') + '"', l.model ? 'はい' : ''].join(',')));
    download('つたえてボード_' + k.name + '_きろく.csv', '﻿' + rows.join('\n'));
  }

  /* ---------- せってい ---------- */
  function menuSet(b) {
    b.append(h('div', { class: 'box' }, h('h3', null, '👆 えらびかた'),
      stSeg('えらびかた', 'sel', [['tap', 'タッチ'], ['hold', 'ながおし']], 'ながおし：ふれた だけでは えらばれません（まちがい タッチや 手の ゆれが ある 子に）'),
      st.sel === 'hold' ? stSeg('ながおしの 時間', 'holdMs', [[300, '0.3びょう'], [600, '0.6'], [1000, '1'], [1500, '1.5']]) : null,
      stSeg('れんぞく タッチを ふせぐ', 'guard', [[0, 'しない'], [700, '0.7びょう'], [1500, '1.5'], [3000, '3']], '1回 えらんだ あと、しばらく 次を うけつけません'),
      stSeg('スキャン（1スイッチ）', 'scan', [[false, 'つかわない'], [true, 'つかう']], 'カードが じゅんに 光り、画面の どこかを タッチ（または スイッチ・スペースキー）で えらびます'),
      st.scan ? stSeg('スキャンの はやさ', 'scanMs', [[1000, '1びょう'], [1500, '1.5'], [2000, '2'], [3000, '3']]) : null));
    b.append(h('div', { class: 'box' }, h('h3', null, '🔊 こえ・ひょうじ'),
      stSeg('カードを えらんだら', 'sayOnTap', [[true, 'ことばを よむ'], [false, 'よまない']], 'えらぶ たびに 声が 出ると、自分で たしかめられます（聴覚フィードバック）'),
      stSeg('話したら', 'showBig', [[true, '大きく 見せる'], [false, '見せない']], '相手に 画面を 見せて 伝えられます。写真や 文を タッチすると もう いちど 話します。「むきを かえる」で 向かいの 人にも 読めます'),
      stSeg('文を 字でも 出す', 'preview', [[true, '出す'], [false, '出さない']]),
      stSeg('こえの はやさ', 'rate', [[0.65, 'とても ゆっくり'], [0.8, 'ゆっくり（はじめ）'], [0.95, 'ふつう'], [1.1, 'はやめ']]),
      stSeg('大きな 画面から もどる', 'bigBack', [[5, '5びょうで'], [10, '10びょうで'], [20, '20びょうで'], [0, 'もどらない']], '時間が たつと 自動で カードの 画面に もどります。大きな 画面の 写真や 文を タッチすると、もう いちど 話します'),
      stSeg('こえの 高さ', 'pitch', [[0.9, 'ひくめ'], [1.05, 'ふつう'], [1.35, 'たかめ（こどもらしく）']]),
      jaVoices.length > 1 ? stSeg('こえの しゅるい', 'voiceName', [['', 'おまかせ']].concat(jaVoices.slice(0, 6).map(v => [v.name, v.name.replace(/\(.*\)|Microsoft|Google|日本語|Japanese|Online|Natural/gi, '').trim() || v.name]))) : null));
    b.append(h('div', { class: 'box' }, h('h3', null, '👩‍🏫 モデリング'),
      h('p', { class: 'help' }, '先生が 子どもの ボードを つかって 話しかけて 見せる こと（モデリング）は、AAC を 覚える いちばんの 近道です。オンの 間に 話した ことは、子どもの きろくと 分けて のこります（この 画面を とじても つづき、アプリを ひらき なおすと オフに なります）。'),
      segEl('モデリング', st.modeling, [[false, 'オフ'], [true, 'オン（先生が つかう）']], v => { st.modeling = v; updateWho(); renderMenu(); })));
    b.append(h('p', { class: 'help', style: 'text-align:center' }, '© 2026 MieeL　学校や家庭での利用は自由です（無断転載・再配布・販売はお断り）。くわしくは「📜 ライセンス」'));
  }

  /* ---------- データ ---------- */
  function menuData(b) {
    b.append(h('p', { class: 'help' }, 'こども・カード・写真・声・きろくは この 端末の ブラウザの 中だけに あります（どこにも 送りません）。ホーム画面に 追加して つかい、ときどき かきだして バックアップして ください。ほかの iPad・iPhone へは「かきだす」→ AirDrop →「よみこむ」で うつせます。'),
      h('div', { class: 'row' }, h('button', { type: 'button', class: 'pill', onclick: () => exportAll(false) }, '📤 こども・カードを かきだす'), h('button', { type: 'button', class: 'pill', onclick: () => exportAll(true) }, '📤 きろくも いっしょに'), h('button', { type: 'button', class: 'pill', onclick: importAll }, '📥 よみこむ')),
      h('div', { class: 'row' }, h('button', { type: 'button', class: 'pill danger', onclick: async () => {
        if (!confirm('この 端末の つたえてボードの データを ぜんぶ けしますか？（もとに もどせません）')) return;
        for (const s of ['kids', 'cards', 'logs', 'media']) for (const x of await DB.all(s)) await DB.del(s, x.id);
        KIDS = []; OVR = {}; st.kid = ''; saveSt(); closeMenu();
      } }, '🗑️ ぜんぶ けす')));
  }
  async function exportAll(withLogs) {
    const b64 = blob => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
    const cards = Object.values(OVR), media = {};
    for (const c of cards) for (const key of ['photoId', 'audioId', 'msgAudioId']) if (c[key] && !media[c[key]]) { const m = await DB.get('media', c[key]); if (m) media[c[key]] = { kind: m.kind, data: await b64(m.blob) }; }
    const logs = withLogs ? await DB.all('logs') : [];
    download('つたえてボード_' + new Date().toLocaleDateString('ja-JP').replace(/\//g, '-') + '.json', JSON.stringify({ format: 'mieel-tsutaete', v: 1, kids: KIDS, cards, media, logs }), 'application/json');
  }
  async function importAll() {
    const f = await pickFile('.json,application/json'); if (!f) return;
    try {
      const j = JSON.parse(await f[0].text()); if (j.format !== 'mieel-tsutaete') throw 0;
      for (const id in j.media || {}) { const r = await fetch(j.media[id].data); await DB.put('media', { id, kind: j.media[id].kind, blob: await r.blob(), at: Date.now() }); }
      for (const c of j.cards || []) { OVR[c.id] = c; await DB.put('cards', c); }
      for (const k of j.kids || []) { const i = KIDS.findIndex(x => x.id === k.id); if (i >= 0) KIDS[i] = k; else KIDS.push(k); await saveKid(k); }
      for (const l of j.logs || []) await DB.put('logs', l);
      if (!KID() && KIDS.length) { st.kid = KIDS[0].id; saveSt(); }
      toast('よみこみました（こども ' + (j.kids || []).length + '人・カード ' + (j.cards || []).length + 'まい）'); resetBoard(); renderMenu();
    } catch (e) { toast('よみこめませんでした'); }
  }

  /* ---------- つかいかた・ライセンス ---------- */
  function menuHelp(b) {
    b.innerHTML = `<div class="doc">
      <h3>段階の えらびかた</h3><p><b>1まいで</b>：カードを えらぶと 伝わる、という 経験から。まずは その子が いちばん 伝えたい もの（トイレ・すきな 飲み物・すきな あそび など）を 1〜2まい。伝わったら すぐに こたえて あげる ことが 大切です。<br><b>2まいで・3まいで</b>：「なに・どこ → どうしたい」「だれに → なに・どこ → どうしたい」と、文の 形（スロット）に そって えらびます。助詞（に・を・が）や「です・ください」は アプリが おぎないます。<br><b>じゆうに</b>：なかまの タブから 自由に ならべます。「⭐ よく つかう」に どの 場面でも つかえる ことばを 入れて おくと 便利です。</p>
      <h3>うまく いく コツ</h3><p>・<b>先生も つかって 見せる（モデリング）</b>：子どもに 話しかける ときに、先生が ボードを おしながら 話します。話す ことを 求めずに、たくさん 見せる ことが いちばんの 近道です。<br>・<b>いつでも 手の とどく ところに</b>：ボードが ない と 伝えられません。休み時間・給食・移動の ときも。<br>・<b>カードの 場所を かえない</b>：場所で 覚えて いきます。ふやす ときは 追加して、ならびは なるべく そのまま。<br>・<b>「いや」「やめたい」「たすけて」も 大事な ことば</b>：伝わる 経験が、困った 行動の かわりに なります。<br>・<b>伝わったら 本当に こたえる</b>：おちゃを たのんだら おちゃが くる。それが 次に つかう 理由に なります。</p>
      <h3>色の 意味</h3><p>ひと＝黄・もの＝オレンジ・ばしょ＝むらさき・したい＝緑・きもち＝青・こたえ／あいさつ＝ピンク。色で なかまが わかると、文の 形（だれ → なに → どうする）が 見えやすく なります。</p>
      <h3>からだの 動きに あわせて</h3><p>「🛠️ せってい」で、ながおし（まちがい タッチ よけ）、れんぞく タッチを ふせぐ、スキャン（1スイッチ・スペースキー）を えらべます。iPhone でも つかえます（たて 向き）。</p>
      <h3>先生の 声・写真</h3><p>「🃏 カード」で カードを おすと、写真（その場で とる／えらぶ）や 先生の 録音を つけられます。「1まいで 話す 文」も 自由に かえられます（例：おちゃ →「おちゃを ください」）。</p></div>`;
  }
  function menuLic(b) {
    b.innerHTML = `<div class="lic"><h3>このアプリ</h3><p><b>© 2026 MieeL（ミエル）</b>　<a href="https://www.mieel-support-school.com/" target="_blank" rel="noopener">www.mieel-support-school.com</a><br>学校・家庭・放課後等デイサービス・療育機関などで、子どもの学習や支援のために使うことは自由です（費用はかかりません）。<br>プログラム・画像・文章の無断転載・複製、改変しての公開・再配布、販売、有料の サービスや 商品への 組みこみは お断りします。くわしくは <a href="LICENSE.md" target="_blank" rel="noopener">LICENSE.md</a> を ご覧ください。</p>
      <h3>使っている もの</h3><div class="licitem"><b>フォント Klee One</b>　© Fontworks Inc.　SIL Open Font License 1.1（Google Fonts から 読みこみ）</div><div class="licitem"><b>絵文字</b>　iPad・iPhone・パソコンに 入っている 標準の 絵文字フォントで 表示しています（アプリには ふくまれていません）。</div><div class="licitem"><b>読みあげ</b>　端末に 入っている 音声合成（Web Speech API）を つかっています。</div>
      <h3>プライバシー</h3><p>写真・声・きろくは この端末の 中だけに 保存し、どこにも 送りません。</p></div>`;
  }

  /* ============================================================
     はじまり
     ============================================================ */
  (function () {
    const g = $('#gear'); let t = null; const c = () => { clearTimeout(t); g.classList.remove('pressing'); };
    g.addEventListener('pointerdown', e => { e.preventDefault(); g.classList.add('pressing'); t = setTimeout(() => { c(); openMenu(); }, 1500); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => g.addEventListener(ev, c));
    g.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', e => { if (e.shiftKey && (e.key === 'S' || e.key === 's') && !/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) openMenu(); if (e.key === 'Escape' && $('#menu').classList.contains('open') && !document.querySelector('.overlay')) closeMenu(); });
  })();
  function makeTouchIcon() { try { const c = document.createElement('canvas'); c.width = c.height = 180; const g = c.getContext('2d'); g.fillStyle = '#BAC8FF'; g.fillRect(0, 0, 180, 180); g.font = '118px "Apple Color Emoji","Segoe UI Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('💬', 90, 98); $('#touchIcon').href = c.toDataURL(); } catch (e) { /* 無視 */ } }
  if (canSpeak) { loadVoice(); speechSynthesis.onvoiceschanged = loadVoice; }
  makeTouchIcon();
  let rsT = null;
  window.addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(() => { if (KID() && KID().level >= 2 && KID().level <= 3) render(); else fitAll(); }, 150); });
  // 写真・声・カードが 消されにくいように（ブラウザに 「のこして」と たのむ）
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* 無視 */ }
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
  (async () => {
    try { KIDS = (await DB.all('kids')).sort((a, b) => a.at - b.at); (await DB.all('cards')).forEach(c => { OVR[c.id] = c; }); } catch (e) { console.warn(e); }
    if (st.kid && !KIDS.some(k => k.id === st.kid)) st.kid = KIDS.length ? KIDS[0].id : '';
    if (!st.kid && KIDS.length) st.kid = KIDS[0].id;
    render();
  })();
  window.__tb = { st, DB, B, get KIDS() { return KIDS; }, get OVR() { return OVR; }, render, compose, single, getC, openMenu, closeMenu, renderMenu, set mTab(v) { mTab = v; } };
