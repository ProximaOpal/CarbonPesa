'use strict';

// ── DOM REFS ──────────────────────────────────────
const heroBg        = document.getElementById('heroBg');
const searchBtn     = document.getElementById('searchBtn');
const searchOverlay = document.getElementById('searchOverlay');
const searchClose   = document.getElementById('searchClose');
const searchInput   = document.getElementById('searchInput');
const menuBtn       = document.getElementById('menuBtn');
const mainNav       = document.getElementById('mainNav');
const dots          = document.querySelectorAll('.dot');
const navLinks      = document.querySelectorAll('.nav-link');

// ── REAL PLATFORM SLIDE DATA ──────────────────────
const slides = [
  {
    number  : '01.',
    heading : 'MISSION',
    body    : 'Carbon Pesa bridges global climate capital with youth-powered tree planting. Every investment funds verified missions executed by university students, high-schoolers and rural communities.',
    body2   : 'From funding to satellite verification to M-Pesa payouts — the full impact cycle in under 90 days.',
  },
  {
    number  : '02.',
    heading : 'INVESTORS',
    body    : '94+ institutional investors fund climate missions across Africa and beyond. Each tonne of carbon sequestered is tokenised, satellite-verified, and ESG-grade — no greenwashing, only bankable nature.',
    body2   : 'Spot price today: $24.80 / tCO₂e. Live listings: Mau Forest · Kakamega · Aberdare.',
  },
  {
    number  : '03.',
    heading : 'YOUTH',
    body    : '38,000+ youth activated across 61 countries. University students, high-schoolers and primary pupils earn stipends via M-Pesa while building environmental careers on the ground.',
    body2   : 'Schools receive grants. Youth earn experience. Communities grow a permanent green legacy.',
  },
  {
    number  : '04.',
    heading : 'CARBON',
    body    : 'Real-time agricultural carbon mapping powered by AI satellite audits at 94.7% accuracy. Buy or sell verified carbon credits on a transparent marketplace trusted by global institutions.',
    body2   : '2,847 ha under satellite coverage · 18.3 t CO₂ absorbed this hour · $24.80 / tCO₂e.',
  },
  {
    number  : '05.',
    heading : 'IMPACT',
    body    : '142,000+ trees funded across urban roadsides, school compounds, rural farmlands and watersheds. SDG-aligned outcomes across Goals 1 · 8 · 13 · 15 · 17 — publicly auditable impact.',
    body2   : 'Zero greenwashing. Every mission is geo-tagged, species-logged, and satellite-confirmed.',
  },
];

let currentSlide = 0;
let isAnimating  = false;

// ── BACKGROUND LOAD ANIMATION ─────────────────────
window.addEventListener('load', () => {
  heroBg.classList.add('loaded');
  animateCounters();
});

// ── ANIMATED STAT COUNTERS ─────────────────────────
function animateCounters() {
  document.querySelectorAll('.stat-val').forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1800;
    const start = performance.now();

    function tick(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased    = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target);
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target;
    }

    // Delay slightly so user sees animation after page paints
    setTimeout(() => requestAnimationFrame(tick), 700);
  });
}

// ── SEARCH OVERLAY ────────────────────────────────
searchBtn.addEventListener('click', () => {
  searchOverlay.classList.add('open');
  setTimeout(() => searchInput.focus(), 300);
});

searchClose.addEventListener('click', closeSearch);

searchOverlay.addEventListener('click', (e) => {
  if (e.target === searchOverlay) closeSearch();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSearch();
});

function closeSearch() {
  searchOverlay.classList.remove('open');
  searchInput.value = '';
}

// ── MOBILE MENU TOGGLE ────────────────────────────
let navOpen = false;
menuBtn.addEventListener('click', () => {
  navOpen = !navOpen;
  mainNav.style.display       = navOpen ? 'flex'                    : '';
  mainNav.style.flexDirection = navOpen ? 'column'                  : '';
  mainNav.style.position      = navOpen ? 'absolute'                : '';
  mainNav.style.top           = navOpen ? '72px'                    : '';
  mainNav.style.right         = navOpen ? '56px'                    : '';
  mainNav.style.background    = navOpen ? 'rgba(4,14,4,0.95)'       : '';
  mainNav.style.padding       = navOpen ? '20px 28px'               : '';
  mainNav.style.gap           = navOpen ? '18px'                    : '';
  mainNav.style.backdropFilter= navOpen ? 'blur(16px)'              : '';
  mainNav.style.borderLeft    = navOpen ? '1px solid rgba(255,255,255,0.1)' : '';
  mainNav.style.zIndex        = navOpen ? '50'                      : '';
  menuBtn.innerHTML = navOpen
    ? '<i class="fas fa-times"></i>'
    : '<i class="fas fa-bars"></i>';
});

navLinks.forEach(link => {
  link.addEventListener('click', () => {
    navLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    if (navOpen) {
      navOpen = false;
      mainNav.removeAttribute('style');
      menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
    }
  });
});

// ── DOT NAVIGATION / SLIDE TRANSITIONS ───────────
dots.forEach((dot, i) => dot.addEventListener('click', () => goToSlide(i)));

function goToSlide(index) {
  if (isAnimating || index === currentSlide) return;
  isAnimating = true;

  dots[currentSlide].classList.remove('active');
  dots[index].classList.add('active');
  currentSlide = index;

  const block = document.getElementById('featureBlock');

  // fade out
  block.style.transition = 'opacity 0.28s ease, transform 0.28s ease';
  block.style.opacity    = '0';
  block.style.transform  = 'translateY(18px)';

  setTimeout(() => {
    const s = slides[index];
    document.getElementById('featNumber').textContent  = s.number;
    document.getElementById('featHeading').textContent = s.heading;
    document.getElementById('featBody').textContent    = s.body;
    document.getElementById('featBody2').textContent   = s.body2;

    // fade in
    block.style.transition = 'opacity 0.38s ease, transform 0.38s ease';
    block.style.opacity    = '1';
    block.style.transform  = 'translateY(0)';

    setTimeout(() => { isAnimating = false; }, 400);
  }, 290);
}

// ── AUTO-ADVANCE SLIDES ───────────────────────────
let autoPlay = setInterval(advanceSlide, 5500);

function advanceSlide() {
  goToSlide((currentSlide + 1) % slides.length);
}

// Pause on hover
const colRight = document.getElementById('colRight');
const dotsNav  = document.getElementById('dotsNav');

[colRight, dotsNav].forEach(el => {
  el.addEventListener('mouseenter', () => clearInterval(autoPlay));
  el.addEventListener('mouseleave', () => {
    autoPlay = setInterval(advanceSlide, 5500);
  });
});

// ── CTA BUTTONS ───────────────────────────────────
document.getElementById('btnPlant').addEventListener('click', () => {
  showToast('🌱 Starting your planting journey…');
});

document.getElementById('btnWorkflow').addEventListener('click', () => {
  showToast('📋 Loading full workflow…');
});

// ── SUBTLE PARALLAX ON MOUSE MOVE ─────────────────
document.addEventListener('mousemove', (e) => {
  const xPct = (e.clientX / window.innerWidth  - 0.5) * 1.8;
  const yPct = (e.clientY / window.innerHeight - 0.5) * 1.2;
  heroBg.style.transform = `scale(1.04) translate(${xPct}%, ${yPct}%)`;
});

// ── SHARE BUTTON ──────────────────────────────────
document.getElementById('shareBtn').addEventListener('click', async () => {
  const data = {
    title : 'Carbon Pesa — Climate Action Platform',
    text  : 'Bridging Climate Investors with Youth Tree Planters across Urban & Rural Communities Worldwide.',
    url   : window.location.href,
  };
  if (navigator.share) {
    try { await navigator.share(data); } catch (_) {}
  } else {
    await navigator.clipboard.writeText(data.url).catch(() => {});
    showToast('🔗 Link copied to clipboard!');
  }
});

// ── TOAST ─────────────────────────────────────────
function showToast(msg) {
  const el = document.createElement('div');
  el.textContent = msg;
  Object.assign(el.style, {
    position       : 'fixed',
    bottom         : '40px',
    left           : '50%',
    transform      : 'translateX(-50%) translateY(14px)',
    background     : 'rgba(126, 200, 67, 0.12)',
    border         : '1px solid rgba(126, 200, 67, 0.35)',
    backdropFilter : 'blur(14px)',
    color          : '#ffffff',
    padding        : '11px 28px',
    borderRadius   : '4px',
    fontFamily     : 'Outfit, sans-serif',
    fontSize       : '12px',
    letterSpacing  : '1.2px',
    zIndex         : '999',
    opacity        : '0',
    transition     : 'opacity 0.3s, transform 0.3s',
    pointerEvents  : 'none',
    whiteSpace     : 'nowrap',
  });
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.style.opacity   = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    el.style.opacity   = '0';
    el.style.transform = 'translateX(-50%) translateY(14px)';
    setTimeout(() => el.remove(), 320);
  }, 2800);
}
