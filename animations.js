/* ============================================================
   Connect the dots — interactions, powered by anime.js v4
   ============================================================ */

let animate, stagger, createDraggable, createAnimatable, utils;
let animeReady = null;
function loadAnime() {
  if (animeReady) return animeReady;
  animeReady = import('https://cdn.jsdelivr.net/npm/animejs@4.0.2/+esm')
    .then((A) => {
      animate = A.animate; stagger = A.stagger;
      createDraggable = A.createDraggable; utils = A.utils;
      createAnimatable = A.createAnimatable;
      return A;
    })
    .catch((e) => {
      console.warn('anime.js failed to load — content still renders, enhancements skipped', e);
      return null;
    });
  return animeReady;
}

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---- 1. Hero headline: character stagger ------------------------------- */
function splitChars(el) {
  const out = [];
  const walk = (node, parent) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        [...n.nodeValue].forEach((ch) => {
          if (ch === ' ') { frag.appendChild(document.createTextNode(' ')); return; }
          const s = document.createElement('span');
          s.className = 'char';
          s.textContent = ch;
          out.push(s);
          frag.appendChild(s);
        });
        parent.replaceChild(frag, n);
      } else if (n.tagName === 'BR') {
        /* keep line breaks */
      } else {
        walk(n, n);
      }
    });
  };
  walk(el, el);
  return out;
}

function initHero() {
  const title = $('#heroTitle');
  if (!title) return;
  if (!animate || reduce) return; // leave fully visible
  const chars = splitChars(title);
  chars.forEach((c) => { c.style.opacity = '0'; });
  animate(chars, {
    opacity: [0, 1],
    y: ['0.65em', '0em'],
    duration: 900,
    delay: stagger(38, { start: 150 }),
    ease: 'out(3)',
  });
}

/* ---- 2. Reveal-on-scroll (robust IntersectionObserver) ----------------- */
function initReveals() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      playCountersIn(e.target);
      io.unobserve(e.target);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });

  $$('.reveal').forEach((el) => io.observe(el));

  // Scroll-driven safety net
  let ticking = false;
  const check = () => {
    ticking = false;
    const vh = window.innerHeight;
    $$('.reveal:not(.is-in)').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) {
        el.classList.add('is-in');
        playCountersIn(el);
      }
    });
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(check); }
  }, { passive: true });
  check();
}

/* ---- 3. Number counters (timer-based, rAF-independent) ----------------- */
function playCountersIn(scope) {
  if (!scope || !scope.querySelectorAll) return;
  scope.querySelectorAll('.num[data-count]').forEach((el) => el._play && el._play());
}

function initCounters() {
  const nums = $$('.num[data-count]');
  nums.forEach((el) => {
    const target   = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const textNode = el.firstChild; // the "0" placeholder text node
    const fmt = (v) => decimals
      ? v.toFixed(decimals)
      : Math.round(v).toLocaleString('en-US');

    el._played = false;
    el._play = () => {
      if (el._played) return;
      el._played = true;
      if (reduce) { textNode.nodeValue = fmt(target); return; }
      const dur = 1600;
      const t0 = performance.now();
      const tick = () => {
        const p = Math.min(1, (performance.now() - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 4); // easeOutQuart
        textNode.nodeValue = fmt(target * eased);
        if (p < 1) setTimeout(tick, 16);
        else textNode.nodeValue = fmt(target);
      };
      tick();
    };
  });

  // Self-contained visibility poller — independent of scroll/IO/rAF
  const poll = () => {
    const vh = window.innerHeight;
    let pending = false;
    nums.forEach((el) => {
      if (el._played) return;
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.9 && r.bottom > 0) el._play();
      else pending = true;
    });
    if (pending) setTimeout(poll, 200);
  };
  poll();
}

/* ---- 4. Timeline: scroll-linked line draw + dot ignition --------------- */
function initTimeline() {
  const grid = $('#tlGrid');
  const prog = $('#tlProg');
  const nodes = $$('.tl-node');
  if (!grid || !prog) return;
  prog.setAttribute('pathLength', '100');

  let ticking = false;
  const update = () => {
    ticking = false;
    const r = grid.getBoundingClientRect();
    const vh = window.innerHeight;
    const trigger = vh * 0.62;                 // line fills as content passes this line
    const span = r.height - vh * 0.25;
    let p = (trigger - r.top) / Math.max(span, 1);
    p = Math.max(0, Math.min(1, p));
    prog.style.strokeDashoffset = String(100 * (1 - p));

    nodes.forEach((n) => {
      const nr = n.getBoundingClientRect();
      const dotY = nr.top + Math.min(68, nr.height * 0.12);
      n.classList.toggle('lit', dotY < trigger);
    });
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
}

/* ---- 5. Marquee rows (IPO names) --------------------------------------- */
function initMarquee() {
  if (!animate || reduce) return;
  $$('[data-marquee]').forEach((m) => {
    const dir = parseFloat(m.dataset.dir) || -1;
    const dist = m.scrollWidth / 2; // content duplicated → loop seamlessly
    if (!dist) return;
    animate(m, {
      x: dir < 0 ? [0, -dist] : [-dist, 0],
      duration: dist * 18,
      ease: 'linear',
      loop: true,
    });
  });
}

/* ---- 6. Hero constellation (Big-Dipper, 5 dots → next) ----------------- */
function initHeroNodes() {
  if (!animate || reduce) return;
  const edge = $('.hn-edge');
  const trace = $('.hn-trace');
  const future = $('.hn-future');
  const comet = $('.hn-comet');
  const stars = $$('.hn-node');
  const fillers = $$('.hn-star');

  // 1. draw the bowl outline (edge + trace) as the dipper forms
  [edge, trace].forEach((el, i) => {
    if (!el || !el.getTotalLength) return;
    const len = el.getTotalLength();
    el.style.strokeDasharray = len;
    el.style.strokeDashoffset = len;
    animate(el, {
      strokeDashoffset: [len, 0],
      duration: 1100,
      delay: 350 + i * 150,
      ease: 'inOut(2)',
    });
  });

  // 2. light each labelled star in chronological order
  if (stars.length) {
    stars.forEach((s) => { s.style.opacity = '0'; });
    animate(stars, {
      opacity: (el) => [0, el.classList.contains('next') ? 0.92 : 1],
      duration: 460,
      delay: stagger(240, { start: 520 }),
      ease: 'out(3)',
    });
  }

  // decorative background stars twinkle in
  if (fillers.length) {
    fillers.forEach((s) => { s.style.opacity = '0'; });
    animate(fillers, {
      opacity: (el) => [0, el.classList.contains('xs') ? 0.55 : 0.85],
      duration: 700,
      delay: stagger(120, { start: 900, from: 'center' }),
      ease: 'out(2)',
    });
    $$('.hn-star.s').forEach((s, i) => {
      animate(s, { opacity: [0.85, 0.3, 0.85], duration: 2800 + i * 500, delay: 2000, loop: true, ease: 'inOut(2)' });
    });
  }

  // 3. the dashed handle to "next" — fades in, then flows outward
  if (future) {
    future.style.opacity = '0';
    animate(future, { opacity: [0, 1], duration: 700, delay: 1750, ease: 'out(2)' });
    animate(future, { strokeDashoffset: [0, -16], duration: 650, delay: 1750, loop: true, ease: 'linear' });
  }

  // 4. a glowing pulse travels from dot to dot, leading to "next"
  if (comet && comet.getTotalLength) {
    const len = comet.getTotalLength();
    const seg = len * 0.1;                       // short bright segment
    // pattern period === path length, so as the pulse exits "next" the next
    // one enters at "research" — a seamless, gap-free loop
    comet.style.strokeDasharray = `${seg} ${len - seg}`;
    comet.style.strokeDashoffset = len;
    animate(comet, {
      strokeDashoffset: [len, 0],               // travel exactly one period
      duration: 3400,
      delay: 2100,
      loop: true,
      ease: 'linear',                           // constant speed — no stop/start stutter
    });
  }

  // 5. gentle pulse on the open "next" ring
  const nextRing = $('.hn-node.next .g');
  if (nextRing) {
    animate(nextRing, { scale: [1, 1.3, 1], duration: 2400, delay: 2200, loop: true, ease: 'inOut(2)' });
  }

  // Cursor parallax — anime.js createAnimatable (from examples/animatable-follow-cursor)
  const map = $('#heroNodes');
  if (map && createAnimatable && window.matchMedia('(pointer:fine)').matches) {
    const drift = createAnimatable(map, {
      x: { duration: 650 },
      y: { duration: 650 },
      rotate: { unit: 'deg', duration: 900 },
      ease: 'out(3)',
    });
    const hero = $('.hero');
    window.addEventListener('pointermove', (e) => {
      const w = window.innerWidth, h = window.innerHeight;
      const nx = utils.mapRange(e.clientX, 0, w, -1, 1);
      const ny = utils.mapRange(e.clientY, 0, h, -1, 1);
      drift.x(nx * 16);
      drift.y(ny * 12);
      drift.rotate(nx * 1.4);
    }, { passive: true });
    if (hero) hero.addEventListener('pointerleave', () => {
      drift.x(0); drift.y(0); drift.rotate(0);
    });
  }
}

/* ---- 7. Top scroll-progress bar ---------------------------------------- */
function initProgress() {
  const bar = $('#scrollProg');
  if (!bar) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
}

/* ---- boot -------------------------------------------------------------- */
function boot() {
  // Critical content — runs immediately, no CDN dependency
  initCounters();
  initReveals();
  initTimeline();
  initProgress();
  // Enhancement animations — load anime.js without blocking content
  loadAnime().then(() => {
    initHero();
    initMarquee();
    initHeroNodes();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
