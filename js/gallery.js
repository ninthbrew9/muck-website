document.querySelectorAll('.ba-slider').forEach(slider => {
  const beforeWrap = slider.querySelector('.ba-before-wrap');
  const divider    = slider.querySelector('.ba-divider');
  let dragging = false;

  function setPosition(x) {
    const rect = slider.getBoundingClientRect();
    let pct = (x - rect.left) / rect.width;
    pct = Math.max(0.02, Math.min(0.98, pct));
    const p = (pct * 100).toFixed(2);
    beforeWrap.style.clipPath = `inset(0 ${(100 - pct * 100).toFixed(2)}% 0 0)`;
    divider.style.left        = p + '%';
  }

  // Mouse
  slider.addEventListener('mousedown', e => { dragging = true; setPosition(e.clientX); e.preventDefault(); });
  window.addEventListener('mousemove', e => { if (dragging) setPosition(e.clientX); });
  window.addEventListener('mouseup',   () => { dragging = false; });

  // Touch
  slider.addEventListener('touchstart', e => {
    dragging = true;
    setPosition(e.touches[0].clientX);
    e.preventDefault();
  }, { passive: false });
  window.addEventListener('touchmove', e => {
    if (dragging) setPosition(e.touches[0].clientX);
  }, { passive: true });
  window.addEventListener('touchend', () => { dragging = false; });
});

// Fade-in on scroll
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
}, { threshold: 0.12 });
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// Nav scroll style
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// Hamburger
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('nav-links');
hamburger?.addEventListener('click', () => {
  const open = hamburger.classList.toggle('open');
  navLinks.classList.toggle('open', open);
  hamburger.setAttribute('aria-expanded', open);
});
navLinks?.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navLinks.classList.remove('open');
    hamburger.setAttribute('aria-expanded', false);
  });
});
