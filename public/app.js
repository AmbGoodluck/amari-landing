/* Amari landing — progressive enhancement.
   Motion follows Apple's fluid-interface rules: springs (not fixed-duration
   tweens) for anything touchable, animations start from the on-screen value,
   release velocity is handed to the spring, flicks are projected forward,
   and edges rubber-band instead of hard-stopping. */
(() => {
  'use strict';

  const root = document.documentElement;
  root.classList.add('js');

  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = () => reduceMotionQuery.matches;

  /* ------------------------------------------------------------------
     Spring — parameterised the way Apple designs them:
       response: seconds to (roughly) reach the target, damping: 1 = no bounce.
     Integrates per frame, so it can be retargeted at any time and always
     continues from its current value and velocity (interruptible).
  ------------------------------------------------------------------ */
  class Spring {
    // restDelta / restSpeed are in the spring's own units (px for the
    // carousel, normalised -1..1 for the tilt), so each spring sets its own.
    constructor(value = 0, { response = 0.4, damping = 1, restDelta = 0.25, restSpeed = 0.5 } = {}) {
      this.value = value;
      this.target = value;
      this.velocity = 0;
      this.restDelta = restDelta;
      this.restSpeed = restSpeed;
      this.configure({ response, damping });
      this.onUpdate = null;
      this.onRest = null;
      this._raf = 0;
      this._last = 0;
      this._tick = this._tick.bind(this);
    }

    configure({ response, damping }) {
      const omega = (2 * Math.PI) / response;
      this.stiffness = omega * omega;
      this.damping = 4 * Math.PI * damping / response;
    }

    to(target, { velocity, response, damping } = {}) {
      this.target = target;
      if (velocity !== undefined) this.velocity = velocity;
      if (response || damping) this.configure({ response: response ?? 0.4, damping: damping ?? 1 });
      if (!this._raf) {
        this._last = performance.now();
        this._raf = requestAnimationFrame(this._tick);
      }
    }

    set(value) {
      this.stop();
      this.value = this.target = value;
      this.velocity = 0;
      this.onUpdate?.(value);
    }

    stop() {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
    }

    get isAnimating() { return this._raf !== 0; }

    _tick(now) {
      // Fixed sub-steps keep the integration stable on slow frames.
      let dt = Math.min((now - this._last) / 1000, 1 / 20);
      this._last = now;
      const step = 1 / 240;
      while (dt > 0) {
        const h = Math.min(step, dt);
        const force = -this.stiffness * (this.value - this.target) - this.damping * this.velocity;
        this.velocity += force * h;
        this.value += this.velocity * h;
        dt -= h;
      }
      this.onUpdate?.(this.value);
      if (Math.abs(this.velocity) < this.restSpeed && Math.abs(this.value - this.target) < this.restDelta) {
        this.value = this.target;
        this.velocity = 0;
        this.onUpdate?.(this.value);
        this._raf = 0;
        this.onRest?.();
        return;
      }
      this._raf = requestAnimationFrame(this._tick);
    }
  }

  // Apple's momentum projection (exponential deceleration, as scroll views use).
  const project = (velocity, decelerationRate = 0.998) =>
    (velocity / 1000) * decelerationRate / (1 - decelerationRate);

  // Progressive resistance past a boundary.
  const rubberband = (overshoot, dimension, c = 0.55) =>
    (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot));

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  /* ------------------------------------------------------------------
     Header: materialise the translucent bar only once content is under it.
  ------------------------------------------------------------------ */
  const header = document.querySelector('[data-header]');
  const onScroll = () => header?.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ------------------------------------------------------------------
     Mobile menu — opens from its button, closes on Esc / outside / link.
  ------------------------------------------------------------------ */
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.getElementById('nav-menu');
  if (toggle && menu) {
    const setOpen = (open, { focusToggle = false } = {}) => {
      menu.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (open) menu.querySelector('a')?.focus({ preventScroll: true });
      else if (focusToggle) toggle.focus();
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) setOpen(false, { focusToggle: true });
    });
    document.addEventListener('pointerdown', (e) => {
      if (menu.classList.contains('is-open') && !menu.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
    window.matchMedia('(min-width: 961px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
  }

  /* ------------------------------------------------------------------
     Reveal on scroll — staggered within a group.
  ------------------------------------------------------------------ */
  const revealEls = [...document.querySelectorAll('.reveal')];
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach((el) => {
      const siblings = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
      el.style.setProperty('--reveal-delay', `${Math.min(siblings.indexOf(el), 5) * 70}ms`);
      io.observe(el);
    });
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ------------------------------------------------------------------
     Hero: phone + produce lean toward the pointer (fine pointers only).
     Independent X/Y springs, critically damped — calm, never bouncy.
  ------------------------------------------------------------------ */
  const scope = document.querySelector('[data-tilt-scope]');
  const stage = document.querySelector('[data-tilt]');
  if (scope && stage) {
    const produce = [...scope.querySelectorAll('.produce')];
    const tiltOpts = { response: 0.7, damping: 1, restDelta: 0.001, restSpeed: 0.002 };
    const sx = new Spring(0, tiltOpts);
    const sy = new Spring(0, tiltOpts);
    const render = () => {
      stage.style.setProperty('--ry', `${sx.value * 6}deg`);
      stage.style.setProperty('--rx', `${-sy.value * 5}deg`);
      for (const el of produce) {
        const d = parseFloat(el.dataset.depth || '1');
        el.style.transform = `translate3d(${sx.value * 10 * d}px, ${sy.value * 8 * d}px, 0)`;
      }
    };
    sx.onUpdate = render;
    sy.onUpdate = render;

    const hero = scope.closest('.hero');
    const onMove = (e) => {
      // Mouse only: on hybrid devices a finger should never tilt the scene.
      if (reducedMotion() || e.pointerType !== 'mouse' || !finePointerQuery.matches) return;
      const r = hero.getBoundingClientRect();
      sx.to(clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1));
      sy.to(clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1));
    };
    hero.addEventListener('pointermove', onMove);
    hero.addEventListener('pointerleave', () => { sx.to(0); sy.to(0); });
    reduceMotionQuery.addEventListener('change', () => { sx.set(0); sy.set(0); });
  }

  /* ------------------------------------------------------------------
     Recipe carousel — direct manipulation with momentum.
  ------------------------------------------------------------------ */
  const carousel = document.querySelector('[data-carousel]');
  if (carousel) {
    const viewport = carousel.querySelector('.carousel-viewport');
    const track = carousel.querySelector('.carousel-track');
    const cards = [...track.children];
    const prev = document.querySelector('.carousel-prev');
    const next = document.querySelector('.carousel-next');
    const status = carousel.querySelector('[data-carousel-status]');

    let min = 0;                 // most-negative translate (end of track)
    let snaps = [0];             // translate value that aligns each card
    let index = 0;

    const spring = new Spring(0, { response: 0.45, damping: 1 });
    spring.onUpdate = (x) => { track.style.transform = `translate3d(${x}px,0,0)`; };

    const measure = () => {
      const edge = parseFloat(getComputedStyle(track).paddingLeft) || 0;
      min = Math.min(0, viewport.clientWidth - track.scrollWidth);
      snaps = cards.map((c) => clamp(-(c.offsetLeft - edge), min, 0));
      // Collapse duplicate end snaps so "next" always moves.
      snaps = snaps.filter((s, i) => i === 0 || Math.abs(s - snaps[i - 1]) > 1);
    };

    const nearest = (x) => snaps.reduce((best, s, i) => (Math.abs(s - x) < Math.abs(snaps[best] - x) ? i : best), 0);

    // aria-disabled (not `disabled`) so a keyboard user's focus is never
    // dropped to <body> when they reach either end.
    const setEnabled = (btn, enabled) => btn?.setAttribute('aria-disabled', String(!enabled));
    const isEnabled = (btn) => btn?.getAttribute('aria-disabled') !== 'true';

    const updateUi = () => {
      const atEnd = index >= snaps.length - 1;
      setEnabled(prev, index > 0);
      setEnabled(next, !atEnd);
      if (status) {
        status.textContent = atEnd && index + 1 < cards.length
          ? `Showing recipes ${index + 1} to ${cards.length} of ${cards.length}`
          : `Showing recipe ${index + 1} of ${cards.length}`;
      }
    };

    const goTo = (i, { velocity = 0, bounce = false } = {}) => {
      index = clamp(i, 0, snaps.length - 1);
      const target = snaps[index];
      if (reducedMotion()) spring.set(target);
      else spring.to(target, { velocity, response: 0.45, damping: bounce ? 0.82 : 1 });
      updateUi();
    };

    prev?.addEventListener('click', () => { if (isEnabled(prev)) goTo(index - 1); });
    next?.addEventListener('click', () => { if (isEnabled(next)) goTo(index + 1); });

    const band = (raw) => {
      if (raw > 0) return rubberband(raw, viewport.clientWidth);
      if (raw < min) return min + rubberband(raw - min, viewport.clientWidth);
      return raw;
    };
    // Bring a mid-flight (or tapped-to-stop) track to rest on a card.
    const settle = () => goTo(nearest(clamp(spring.value, min, 0)));

    viewport.addEventListener('keydown', (e) => {
      const map = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: snaps.length - 1 };
      if (e.key in map && e.target === viewport) { e.preventDefault(); goTo(map[e.key]); }
    });

    // Keep a keyboard-focused card in view.
    track.addEventListener('focusin', (e) => {
      const card = e.target.closest('.recipe-card');
      if (!card) return;
      viewport.scrollLeft = 0; // focus() may nudge native scroll; we own positioning
      const x = -(card.offsetLeft - (parseFloat(getComputedStyle(track).paddingLeft) || 0));
      const visibleLeft = -spring.value;
      const cardLeft = -x;
      if (cardLeft < visibleLeft || cardLeft + card.offsetWidth > visibleLeft + viewport.clientWidth) goTo(nearest(x));
    });

    /* Pointer drag: 1:1 tracking, respects grab offset, rubber-bands at ends. */
    let drag = null;
    let suppressClick = false;
    const SLOP = 8; // px of hysteresis before committing to a horizontal drag

    viewport.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('button')) return;
      spring.stop(); // grab it mid-flight: continue from the presentation value
      drag = {
        id: e.pointerId, startX: e.clientX, startY: e.clientY,
        origin: spring.value, active: false,
        samples: [{ x: e.clientX, t: performance.now() }],
      };
    });

    viewport.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (e.pointerType === 'mouse' && e.buttons === 0) { endDrag(e); return; } // missed release
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (!drag.active) {
        if (Math.abs(dy) > SLOP && Math.abs(dy) > Math.abs(dx)) { drag = null; settle(); return; } // vertical scroll wins
        if (Math.abs(dx) < SLOP) return;
        drag.active = true;
        drag.startX = e.clientX; // start tracking from here so there is no jump
        viewport.setPointerCapture(e.pointerId);
        viewport.classList.add('is-dragging');
      }
      spring.set(band(drag.origin + (e.clientX - drag.startX)));
      const now = performance.now();
      drag.samples.push({ x: e.clientX, t: now });
      while (drag.samples.length > 2 && now - drag.samples[0].t > 100) drag.samples.shift();
    });

    function endDrag(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const wasActive = drag.active;
      const now = performance.now();
      // Only motion from the last ~100 ms counts; a pause before release means no fling.
      const s = drag.samples.filter((p) => now - p.t <= 100);
      drag = null;
      viewport.classList.remove('is-dragging');
      if (!wasActive) { settle(); return; } // a tap that caught it mid-flight
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 0);

      let velocity = 0; // px/s
      const last = s[s.length - 1];
      if (s.length >= 2 && now - last.t <= 50) {
        const first = s[0];
        velocity = ((last.x - first.x) / Math.max(last.t - first.t, 1)) * 1000;
      }

      // Project where the flick is heading, then snap to the card nearest that.
      const projected = spring.value + project(velocity);
      let i = nearest(clamp(projected, min, 0));
      // A deliberate flick always advances at least one card.
      if (i === index && Math.abs(velocity) > 400) i = index + (velocity < 0 ? 1 : -1);
      goTo(i, { velocity, bounce: Math.abs(velocity) > 600 });
    }
    // On window, so a release anywhere (even after leaving the carousel) ends the drag.
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    viewport.addEventListener('click', (e) => { if (suppressClick) { e.stopPropagation(); e.preventDefault(); } }, true);

    /* Trackpad horizontal scrolling. */
    let wheelTimer = 0;
    let wheelRaw = null; // un-banded offset for the current wheel gesture
    viewport.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? viewport.clientWidth : 1;
      if (wheelRaw === null) { spring.stop(); wheelRaw = spring.value; }
      wheelRaw -= e.deltaX * unit;
      spring.set(band(wheelRaw));
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => { wheelRaw = null; settle(); }, 120);
    }, { passive: false });

    /* Heart toggle: state + a small pop on the causal event only. */
    track.addEventListener('click', (e) => {
      const btn = e.target.closest('.heart-btn');
      if (!btn) return;
      const on = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(on));
      btn.classList.remove('pop');
      if (on) { void btn.offsetWidth; btn.classList.add('pop'); }
      if (on && navigator.vibrate && !reducedMotion()) navigator.vibrate(8);
    });

    const relayout = () => {
      measure();
      index = clamp(index, 0, snaps.length - 1);
      spring.set(snaps[index]);
      updateUi();
    };
    new ResizeObserver(relayout).observe(viewport);
    relayout();
  }

  /* Footer year. */
  const year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
})();
