/* ─── Eircode routing keys by coverage zone ─────────────────────────────── */
const COVERAGE = {
  inArea: new Set([
    // Co. Wicklow
    'A63', 'A67', 'A98',
    // Co. Wexford
    'Y21', 'Y25', 'Y34', 'Y35',
  ]),
  nearby: new Set([
    // Co. Dublin south / border
    'D18', 'D24',
    // Co. Carlow
    'R21', 'R32', 'R93',
    // Co. Kilkenny
    'R95',
    // Co. Kildare south
    'R51', 'W91',
  ]),
};

/* ─── Placeholder pricing (edit these values to set real rates) ─────────── */
const RATES = {
  pressureWashing: { perSqm: 6,  areaRatio: 0.5  },  // €/m² of driveway proxy
  roofCleaning:    { perSqm: 12, areaRatio: 0.85 },  // €/m² of roof area proxy
  gutterCleaning:  { flat: { small: 100, medium: 150, large: 220 } },
  windowCleaning:  { perSqm: 4,  areaRatio: 0.15 },  // €/m² of window area proxy
};

const PROPERTY_SIZES = { small: 80, medium: 120, large: 200 };

const WHATSAPP_NUMBER = '353XXXXXXXXX'; // ← replace with real number

/* ─── State ─────────────────────────────────────────────────────────────── */
let state = { step: 1, eircode: '', zone: null, services: [], sizeBand: 'medium', customSqm: null };

/* ─── Eircode helpers ────────────────────────────────────────────────────── */
function parseEircode(raw) {
  const clean = raw.replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z]\d{2}[A-Z0-9]{4}$/.test(clean)) return null;
  return { routing: clean.slice(0, 3), full: clean.slice(0, 3) + ' ' + clean.slice(3) };
}

function getZone(routing) {
  if (COVERAGE.inArea.has(routing)) return 'inArea';
  if (COVERAGE.nearby.has(routing)) return 'nearby';
  return 'outside';
}

/* ─── Calculation ────────────────────────────────────────────────────────── */
function calcEstimate(services, sizeBand, customSqm) {
  const sqm = customSqm || PROPERTY_SIZES[sizeBand] || PROPERTY_SIZES.medium;
  let total = 0;

  if (services.includes('pressure')) {
    total += sqm * RATES.pressureWashing.areaRatio * RATES.pressureWashing.perSqm;
  }
  if (services.includes('roof')) {
    total += sqm * RATES.roofCleaning.areaRatio * RATES.roofCleaning.perSqm;
  }
  if (services.includes('gutters')) {
    total += RATES.gutterCleaning.flat[sizeBand] || RATES.gutterCleaning.flat.medium;
  }
  if (services.includes('windows')) {
    total += sqm * RATES.windowCleaning.areaRatio * RATES.windowCleaning.perSqm;
  }

  const low  = Math.round(total * 0.8 / 5) * 5;
  const high = Math.round(total * 1.2 / 5) * 5;
  return { low, high };
}

function serviceLabel(key) {
  return { pressure: 'Pressure Washing', roof: 'Roof Cleaning', gutters: 'Gutter Cleaning', windows: 'Window Cleaning' }[key];
}

function buildWhatsAppUrl(eircode, services, low, high) {
  const serviceNames = services.map(serviceLabel).join(', ');
  const msg = `Hi MUCK! I got an online estimate for ${serviceNames} at ${eircode} — approx €${low}–€${high}. I'd like to book!`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

/* ─── UI helpers ─────────────────────────────────────────────────────────── */
function showPanel(n) {
  document.querySelectorAll('.quote-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`qpanel-${n}`).classList.add('active');

  document.querySelectorAll('.q-step-label').forEach((el, i) => {
    el.classList.toggle('active', i + 1 === n);
    el.classList.toggle('done',   i + 1 < n);
  });
  state.step = n;
}

function setEircodeStatus(msg, type) {
  const el = document.getElementById('eircode-status');
  el.textContent = msg;
  el.className = `eircode-status ${type}`;
}

/* ─── Step navigation ────────────────────────────────────────────────────── */
function goStep2() {
  const raw = document.getElementById('eircode-input').value.trim();
  const parsed = parseEircode(raw);
  if (!parsed) {
    setEircodeStatus('Invalid Eircode format. Try: A67 V278', 'error');
    return;
  }
  state.eircode = parsed.full;
  state.zone    = getZone(parsed.routing);

  const msgs = {
    inArea:  `✓ Great — ${parsed.full} is in our service area.`,
    nearby:  `${parsed.full} — this may be outside our main area. A distance charge may apply.`,
    outside: `${parsed.full} — this is outside our standard area. We may still be able to help!`,
  };
  const types = { inArea: 'ok', nearby: 'warn', outside: 'warn' };
  setEircodeStatus(msgs[state.zone], types[state.zone]);

  showPanel(2);
}

function goStep3() {
  const checked = [...document.querySelectorAll('.service-check:checked')].map(i => i.value);
  if (checked.length === 0) {
    alert('Please select at least one service.');
    return;
  }
  state.services = checked;
  showPanel(3);
}

function goResult() {
  const sizeRadio = document.querySelector('.size-radio:checked');
  const customVal = parseInt(document.getElementById('custom-sqm').value, 10);

  state.sizeBand  = sizeRadio ? sizeRadio.value : 'medium';
  state.customSqm = (!isNaN(customVal) && customVal > 0) ? customVal : null;

  const { low, high } = calcEstimate(state.services, state.sizeBand, state.customSqm);

  document.getElementById('result-range').textContent = `€${low} – €${high}`;
  document.getElementById('result-services').textContent =
    state.services.map(serviceLabel).join(' · ');

  const noteEl = document.getElementById('result-area-note');
  const noteMap = {
    inArea:  { text: '✓ In our service area',            cls: 'green' },
    nearby:  { text: '⚠ Distance charge may apply',      cls: '' },
    outside: { text: '⚠ Outside standard area — we\'ll confirm availability', cls: '' },
  };
  const note = noteMap[state.zone];
  noteEl.textContent = note.text;
  noteEl.className   = `result-area-note${note.cls ? ' ' + note.cls : ''}`;

  const waBtn = document.getElementById('result-whatsapp-btn');
  waBtn.href  = buildWhatsAppUrl(state.eircode, state.services, low, high);

  showPanel(4);
}

function resetQuote() {
  state = { step: 1, eircode: '', zone: null, services: [], sizeBand: 'medium', customSqm: null };
  document.getElementById('eircode-input').value = '';
  setEircodeStatus('', '');
  document.querySelectorAll('.service-check').forEach(c => { c.checked = false; });
  document.querySelectorAll('.check-label').forEach(l => l.classList.remove('checked'));
  document.querySelectorAll('.size-radio').forEach(r => { r.checked = r.value === 'medium'; });
  document.querySelectorAll('.size-label').forEach(l => {
    l.classList.toggle('selected', l.querySelector('input')?.value === 'medium');
  });
  document.getElementById('custom-sqm').value = '';
  showPanel(1);
}

/* ─── Boot ───────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  /* Nav scroll effect */
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  /* Hamburger */
  const burger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');
  burger.addEventListener('click', () => {
    burger.classList.toggle('open');
    navLinks.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      burger.classList.remove('open');
      navLinks.classList.remove('open');
    });
  });

  /* Fade-in observer */
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

  /* Service checkboxes */
  document.querySelectorAll('.check-label').forEach(label => {
    const cb = label.querySelector('input');
    cb.addEventListener('change', () => label.classList.toggle('checked', cb.checked));
  });

  /* Size radio visual */
  document.querySelectorAll('.size-radio').forEach(r => {
    r.addEventListener('change', () => {
      document.querySelectorAll('.size-label').forEach(l => l.classList.remove('selected'));
      r.closest('.size-label').classList.add('selected');
    });
  });

  /* Wire buttons */
  document.getElementById('btn-next-1').addEventListener('click', goStep2);
  document.getElementById('btn-next-2').addEventListener('click', goStep3);
  document.getElementById('btn-next-3').addEventListener('click', goResult);
  document.getElementById('btn-back-2').addEventListener('click', () => showPanel(1));
  document.getElementById('btn-back-3').addEventListener('click', () => showPanel(2));
  document.getElementById('btn-reset').addEventListener('click', resetQuote);

  /* Allow Enter key on Eircode input */
  document.getElementById('eircode-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') goStep2();
  });

  /* WhatsApp footer fallback number */
  document.querySelectorAll('.wa-link').forEach(a => {
    a.href = `https://wa.me/${WHATSAPP_NUMBER}`;
  });
});
