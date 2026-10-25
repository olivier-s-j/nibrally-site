// The homepage demo: one treble staff, a note gliding towards Nib, a 7-key piano. Name the note before it reaches Nib and
// Nib eats it (you hear its pitch); miss it and its name shows. No clock pressure on reduced motion: the note waits.
(() => {
  const svg = document.querySelector('#staff'), keys = [...document.querySelectorAll('.key')], live = document.querySelector('#demo-live'), streakEl = document.querySelector('#streak');
  if (!svg || !keys.length) return;
  // a phone gets a shorter staff (wider in proportion), so the note and Nib stay big enough to read
const NS = 'http://www.w3.org/2000/svg', W = innerWidth < 640 ? 560 : 1000, S = 24, BOTTOM = 170, TOP = BOTTOM - 4 * S, X0 = 150, HIT = W - 165, TRAVEL = W < 1000 ? 5.5 : 6.5;
svg.setAttribute('viewBox', `0 0 ${W} 230`);
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'], SOLF = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'], SEMI = [0, 2, 4, 5, 7, 9, 11];
  // treble positions from middle C (ledger line) to G5 (just above the staff); pos 0 = bottom line E4
  const NOTES = Array.from({ length: 12 }, (_, i) => { const step = i, li = step % 7, oct = 4 + Math.floor(step / 7); return { li, oct, pos: step - 2, midi: 12 * (oct + 1) + SEMI[li] }; });
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = (tag, attrs, parent = svg) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent.appendChild(e); return e; };
  const yOf = pos => BOTTOM - pos * S / 2;

  // staff, clef, Nib
  for (let i = 0; i < 5; i++) el('line', { class: 'line', x1: 20, x2: W - 105, y1: TOP + i * S, y2: TOP + i * S });
  el('line', { class: 'line', x1: 20.5, x2: 20.5, y1: TOP, y2: BOTTOM });
  const clef = document.querySelector('#clef-src')?.content.querySelector('svg');
  if (clef) { const c = clef.cloneNode(true); c.setAttribute('class', 'clef'); c.setAttribute('x', 30); c.setAttribute('y', yOf(2) - 4.75 * S); c.setAttribute('height', 7.9 * S); c.setAttribute('width', 2.65 * S); svg.appendChild(c); }
  const nib = el('image', { href: '/img/nib-open.webp', x: W - 140, y: TOP - 34, width: 150, height: 150 });
  const noteG = el('g', { class: 'note' }), ledger = el('line', { class: 'line', x1: -S, x2: S, y1: 0, y2: 0 }, noteG);
  const head = el('ellipse', { cx: 0, cy: 0, rx: 0.64 * S, ry: 0.45 * S, transform: 'rotate(-22)', fill: '#f5f1ff' }, noteG);
  const stem = el('line', { stroke: '#f5f1ff', 'stroke-width': 2.2, 'stroke-linecap': 'round' }, noteG);
  const chip = el('g', { opacity: 0 }); const chipBox = el('rect', { class: 'chip', x: -28, y: -20, width: 56, height: 36, rx: 10 }, chip); const chipText = el('text', { class: 'name', x: 0, y: 7, 'text-anchor': 'middle' }, chip);

  let audio = null;
  const tone = midi => { try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); const t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
    o.type = 'triangle'; o.frequency.value = 440 * 2 ** ((midi - 69) / 12); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(g).connect(audio.destination); o.start(t); o.stop(t + 0.95); } catch (e) {} };

  let cur = null, last = -1, t0 = 0, state = 'gliding', eatT = 0, streak = 0, running = false, raf = 0, wrong = false;
  const nibFace = (f, ms) => { nib.setAttribute('href', `/img/nib-${f}.webp`); clearTimeout(nibFace.t); if (ms) nibFace.t = setTimeout(() => nib.setAttribute('href', '/img/nib-open.webp'), ms); };
  function next() {
    let i; do i = Math.floor(Math.random() * NOTES.length); while (i === last); last = i; cur = NOTES[i];
    const y = yOf(cur.pos), up = cur.pos < 4; wrong = false; state = 'gliding'; t0 = performance.now();
    head.setAttribute('cy', 0); ledger.style.display = cur.pos <= -2 || cur.pos >= 10 ? '' : 'none';
    stem.setAttribute('x1', up ? 0.57 * S : -0.57 * S); stem.setAttribute('x2', up ? 0.57 * S : -0.57 * S); stem.setAttribute('y1', up ? -2 : 2); stem.setAttribute('y2', up ? -3.3 * S : 3.3 * S);
    noteG.dataset.y = y; noteG.style.opacity = 1; chip.setAttribute('opacity', 0); head.setAttribute('fill', '#f5f1ff'); stem.setAttribute('stroke', '#f5f1ff');
    place(REDUCED ? (X0 + HIT) / 2 : X0, 1);
  }
  function place(x, sc) { noteG.setAttribute('transform', `translate(${x} ${noteG.dataset.y}) scale(${sc})`); noteG.dataset.x = x; }
  function showName() { chipText.textContent = LETTERS[cur.li]; chip.setAttribute('transform', `translate(${noteG.dataset.x} ${Math.max(24, Math.min(+noteG.dataset.y - 2.4 * S, TOP - 20))})`); chip.setAttribute('opacity', 1); }
  function frame(now) {
    if (!running) return;
    const k = (now - t0) / 1000;
    if (state === 'gliding' && !REDUCED) { const p = Math.min(1, k / TRAVEL); place(X0 + p * (HIT - X0), 1); if (p >= 1) miss(); }
    else if (state === 'eaten') { const e = Math.min(1, (now - eatT) / 180); place(+noteG.dataset.x + (W - 75 - +noteG.dataset.x) * e, 1 - 0.9 * e); noteG.style.opacity = 1 - e; if (now - eatT > 650) next(); }
    else if (state === 'missed' && now - eatT > 1300) next();
    raf = requestAnimationFrame(frame);
  }
  function miss() { state = 'missed'; eatT = performance.now(); showName(); nibFace('hurt', 700); streak = 0; streakEl.textContent = ''; live.textContent = `It was ${LETTERS[cur.li]}.`; }
  function answer(li) {
    const k = keys[li]; k.classList.add('down'); setTimeout(() => k.classList.remove('down'), 120);
    if (!cur || state !== 'gliding') return;
    if (li === cur.li) {
      tone(cur.midi); flash(k, 'good'); state = 'eaten'; eatT = performance.now(); head.setAttribute('fill', '#c8ff3b'); stem.setAttribute('stroke', '#c8ff3b');
      setTimeout(() => nibFace('closed'), 150); setTimeout(() => nibFace('happy', 500), 300);
      if (!wrong) { streak++; streakEl.textContent = streak > 1 ? `${streak} in a row` : ''; }
      live.textContent = `Yes, ${LETTERS[cur.li]}.`;
      if (REDUCED) setTimeout(next, 650);
    } else {
      tone(12 * (cur.oct + 1) + SEMI[li]); flash(k, 'bad'); wrong = true; streak = 0; streakEl.textContent = ''; showName(); head.setAttribute('fill', '#ff5c93'); stem.setAttribute('stroke', '#ff5c93');
      live.textContent = `Not ${LETTERS[li]}. It is ${LETTERS[cur.li]}.`;
    }
  }
  const flash = (k, c) => { k.classList.remove('good', 'bad'); void k.offsetWidth; k.classList.add(c); setTimeout(() => k.classList.remove(c), 320); };
  keys.forEach((k, i) => k.addEventListener('pointerdown', e => { e.preventDefault(); answer(i); }));
  keys.forEach((k, i) => k.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); answer(i); } }));
  addEventListener('keydown', e => { if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('input,textarea')) return; const u = e.key.toUpperCase(), li = u === 'H' ? 6 : LETTERS.indexOf(u); if (li >= 0 && e.key.length === 1 && running) answer(li); });
  // run only while the staff is on screen and the tab is visible
  const start = () => { if (running) return; running = true; t0 = performance.now() - (cur && state === 'gliding' ? ((+noteG.dataset.x - X0) / (HIT - X0)) * TRAVEL * 1000 : 0); if (!cur) next(); raf = requestAnimationFrame(frame); };
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  let seen = false; new IntersectionObserver(es => { seen = es[0].isIntersecting; seen && !document.hidden ? start() : stop(); }).observe(svg);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : seen && start());
})();
