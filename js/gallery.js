document.querySelectorAll('.ba-slider').forEach(slider => {
  const beforeWrap = slider.querySelector('.ba-before-wrap');
  const beforeImg  = beforeWrap.querySelector('.ba-img');
  const divider    = slider.querySelector('.ba-divider');
  let dragging = false;

  // Pin the before image to the full slider width so it never shrinks with the wrapper
  function syncWidth() {
    beforeImg.style.width = slider.offsetWidth + 'px';
  }

  function setPosition(x) {
    const rect = slider.getBoundingClientRect();
    let pct    = (x - rect.left) / rect.width;
    pct        = Math.max(0.02, Math.min(0.98, pct));
    const p    = (pct * 100).toFixed(2) + '%';
    beforeWrap.style.width = p;   // clip the before image
    divider.style.left     = p;   // move the line to exactly the same position
  }

  // Mouse
  slider.addEventListener('mousedown', e => {
    dragging = true;
    syncWidth();
    setPosition(e.clientX);
    e.preventDefault();
  });
  window.addEventListener('mousemove', e => { if (dragging) setPosition(e.clientX); });
  window.addEventListener('mouseup',   () => { dragging = false; });

  // Touch
  slider.addEventListener('touchstart', e => {
    dragging = true;
    syncWidth();
    setPosition(e.touches[0].clientX);
    e.preventDefault();
  }, { passive: false });
  window.addEventListener('touchmove', e => {
    if (dragging) setPosition(e.touches[0].clientX);
  }, { passive: true });
  window.addEventListener('touchend', () => { dragging = false; });

  // Initialise width on load and on resize
  syncWidth();
  window.addEventListener('resize', syncWidth);
});
