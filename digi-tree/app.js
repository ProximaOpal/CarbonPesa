/* ─── app.js — Digi Tree Platform v2 ─── */

/* ═══════════════════════════════════════
   1. NAVBAR SCROLL STATE
═══════════════════════════════════════ */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

/* ═══════════════════════════════════════
   2. SCROLL-REVEAL OBSERVER
═══════════════════════════════════════ */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const delay = parseInt(entry.target.dataset.delay || '0');
      setTimeout(() => entry.target.classList.add('visible'), delay);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* ═══════════════════════════════════════
   3. ANIMATED COUNTERS (hero stats)
═══════════════════════════════════════ */
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const duration = 2000;
  const steps = 60;
  const increment = target / steps;
  let current = 0;
  let count = 0;
  const tick = () => {
    count++;
    current += increment;
    if (count < steps) {
      el.textContent = Math.floor(current);
      requestAnimationFrame(tick);
    } else {
      el.textContent = target;
    }
  };
  requestAnimationFrame(tick);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.stat-num').forEach(animateCounter);
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });

const heroContent = document.querySelector('.hero-content');
if (heroContent) counterObserver.observe(heroContent);

/* ═══════════════════════════════════════
   4. LEADERBOARD BAR ANIMATION ON SCROLL
═══════════════════════════════════════ */
// Store original widths then zero them for animation
document.querySelectorAll('.lb-fill').forEach(f => {
  f.dataset.targetWidth = f.style.width || '70%';
  f.style.width = '0%';
});

const barObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.lb-fill').forEach(f => {
        setTimeout(() => {
          f.style.transition = 'width 1.2s cubic-bezier(0.4,0,0.2,1)';
          f.style.width = f.dataset.targetWidth || '70%';
        }, 150);
      });
      barObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

document.querySelectorAll('.lb-card').forEach(card => barObserver.observe(card));

/* ═══════════════════════════════════════
   5. EDUCATION TAB TOGGLE
═══════════════════════════════════════ */
function showEduTab(tab, btn) {
  document.querySelectorAll('.edu-panel').forEach(p => {
    p.style.display = 'none';
    p.classList.remove('active');
  });
  document.querySelectorAll('#education .toggle-btn').forEach(b => b.classList.remove('active'));

  const panel = document.getElementById('edu-' + tab);
  if (panel) {
    panel.style.display = 'block';
    panel.classList.add('active');
    panel.querySelectorAll('.edu-card').forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(18px)';
      setTimeout(() => {
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease, border-color 0.35s, box-shadow 0.35s';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, i * 65);
    });
  }
  if (btn) btn.classList.add('active');

  const msgs = {
    climate: 'Climate Education module loaded',
    weather: 'Weather Science module loaded',
    species: 'Tree Species Guide loaded'
  };
  showToast(msgs[tab] || 'Module loaded', 'success');
}

/* ═══════════════════════════════════════
   6. LEADERBOARD TAB TOGGLE
═══════════════════════════════════════ */
function showLbTab(tab, btn) {
  document.querySelectorAll('.lb-panel').forEach(p => {
    p.style.display = 'none';
    p.classList.remove('active');
  });
  document.querySelectorAll('#leaderboard .toggle-btn').forEach(b => b.classList.remove('active'));

  const panel = document.getElementById('lb-' + tab);
  if (panel) {
    panel.style.display = 'block';
    panel.classList.add('active');
    panel.querySelectorAll('.lb-card').forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateX(-18px)';
      setTimeout(() => {
        card.style.transition =
          'opacity 0.45s ease, transform 0.45s ease, border-color 0.35s, box-shadow 0.35s';
        card.style.opacity = '1';
        card.style.transform = 'translateX(0)';
        const fill = card.querySelector('.lb-fill');
        if (fill) {
          const tw = fill.dataset.targetWidth || '70%';
          fill.style.width = '0%';
          setTimeout(() => {
            fill.style.transition = 'width 1.1s cubic-bezier(0.4,0,0.2,1)';
            fill.style.width = tw;
          }, 120);
        }
      }, i * 85);
    });
  }
  if (btn) btn.classList.add('active');

  const msgs = {
    youth:     'Top Youth Planters',
    schools:   'Top Schools',
    investors: 'Top Investors'
  };
  showToast(msgs[tab] || 'Leaderboard updated', 'info');
}

/* ═══════════════════════════════════════
   7. TOAST NOTIFICATIONS
═══════════════════════════════════════ */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = type === 'success' ? 'fa-circle-check'
             : type === 'info'    ? 'fa-circle-info'
             : 'fa-triangle-exclamation';
  toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fadeout');
    setTimeout(() => toast.remove(), 450);
  }, 3500);

  toast.addEventListener('click', () => {
    toast.classList.add('fadeout');
    setTimeout(() => toast.remove(), 450);
  });
}

/* ═══════════════════════════════════════
   8. ACTIVE NAV LINK HIGHLIGHTING
═══════════════════════════════════════ */
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(a => a.style.color = '');
      const link = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
      if (link) link.style.color = '#ffffff';
    }
  });
}, { threshold: 0.35 });

sections.forEach(s => sectionObserver.observe(s));

/* ═══════════════════════════════════════
   9. CARD HOVER — icon scale via JS (backup)
═══════════════════════════════════════ */
// Pure CSS handles it; JS is fallback for older browsers
document.querySelectorAll('.org-card').forEach(card => {
  const icon = card.querySelector('.org-icon i');
  if (!icon) return;
  card.addEventListener('mouseenter', () => {
    icon.style.transform = 'scale(1.25)';
    icon.style.transition = 'transform 0.3s ease';
  });
  card.addEventListener('mouseleave', () => {
    icon.style.transform = 'scale(1)';
  });
});

/* ═══════════════════════════════════════
   10. INIT WELCOME TOAST
═══════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    showToast('Welcome to Digi Tree — Green the Planet!', 'success');
  }, 1200);

  // Animate bars in the initially visible leaderboard panel
  setTimeout(() => {
    document.querySelectorAll('#lb-youth .lb-fill').forEach(f => {
      f.style.transition = 'width 1.2s cubic-bezier(0.4,0,0.2,1)';
      f.style.width = f.dataset.targetWidth || '70%';
    });
  }, 1000);
});

/* Expose globals for inline onclick handlers */
window.showToast  = showToast;
window.showEduTab = showEduTab;
window.showLbTab  = showLbTab;
