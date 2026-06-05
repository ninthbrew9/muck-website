/* ─── Eircode routing keys by coverage zone ─────────────────────────────── */
const COVERAGE = {
  inArea: new Set([
    // Co. Wicklow — Bray, Greystones, Kilcoole, Newcastle
    'A98',
    // Co. Wicklow — Wicklow town, Rathnew, Ashford, Rathdrum, Aughrim
    'A67', 'A63',
    // Co. Wicklow — Arklow, Shillelagh, Tinahely
    'Y14',
    // Co. Wexford — Wexford town, Rosslare
    'Y21', 'Y35',
    // Co. Wexford — Enniscorthy, Ferns, Bunclody
    'Y21', 'Y25',
    // Co. Wexford — Gorey, Courtown, Carnew
    'Y34',
    // Co. Wexford — New Ross, Campile
    'Y22',
  ]),
  nearby: new Set([
    // Co. Dublin south — Dun Laoghaire, Cabinteely, Shankill
    'D18', 'D24', 'A94',
    // Co. Carlow — Carlow town, Tullow, Muinebheag
    'R21', 'R32', 'R93',
    // Co. Kilkenny — Kilkenny city, Thomastown, Callan
    'R95', 'R51',
    // Co. Kildare south — Athy, Castledermot
    'R14', 'W91',
    // Co. Waterford border
    'X91',
  ]),
};

/* ─── Pricing — calibrated for Co. Wicklow & Co. Wexford (2025) ─────────── *
 *                                                                            *
 *  Pressure washing  : €5/m² × 35% of floor area (block paving / concrete)  *
 *                      Research range: €120–€350 for typical Irish property   *
 *                                                                            *
 *  Roof cleaning     : €12/m² × 55% of floor area (soft wash + biocide)     *
 *                      Research range: €350–€1,100 by property size          *
 *                                                                            *
 *  Gutter cleaning   : flat rate by size band                                *
 *                      Research range: €90–€240 typical Irish property       *
 *                                                                            *
 *  Window cleaning   : €4.50/m² × 14% of floor area (one-off external)      *
 *                      Research range: €50–€100 by property size             *
 * ─────────────────────────────────────────────────────────────────────────── */
const RATES = {
  pressureWashing: { perSqm: 5,   areaRatio: 0.35 },
  roofCleaning:    { perSqm: 8,   areaRatio: 0.55 },  // reduced — mid Wicklow/Wexford rate
  gutterCleaning:  { flat: { small: 100, medium: 145, large: 195 } },
  windowCleaning:  { perWindow: 6 },                   // €6 per window, count entered by user
};

const PROPERTY_SIZES = { small: 80, medium: 120, large: 200 };

const WHATSAPP_NUMBER  = '353XXXXXXXXX';       // ← replace with real number e.g. 353861234567
const WEB3FORMS_KEY   = 'YOUR_WEB3FORMS_KEY'; // ← paste key from web3forms.com

/* ─── State ─────────────────────────────────────────────────────────────── */
let state = { step: 1, eircode: '', zone: null, services: [], sizeBand: 'medium', customSqm: null, windowCount: 8 };

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
function calcEstimate(services, sizeBand, customSqm, windowCount) {
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
    total += (windowCount || 8) * RATES.windowCleaning.perWindow;
  }

  const low  = Math.round(total * 0.8 / 5) * 5;
  const high = Math.round(total * 1.2 / 5) * 5;
  return { low, high };
}

function serviceLabel(key) {
  return { pressure: 'Pressure Washing', roof: 'Roof Cleaning', gutters: 'Gutter Cleaning', windows: 'Window Cleaning' }[key];
}

function buildWhatsAppUrl(name, phone, eircode, services, low, high) {
  const serviceNames = services.map(serviceLabel).join(', ');
  const msg = `Hi MUCK! I'm ${name} (${phone}). I got an online estimate for ${serviceNames} at ${eircode} — approx €${low}–€${high}. I'd like to book!`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

async function submitToEmail(name, phone, email, eircode, services, low, high) {
  const serviceNames = services.map(serviceLabel).join(', ');
  const payload = {
    access_key:  WEB3FORMS_KEY,
    subject:     `New Quote Request — ${serviceNames} — ${eircode}`,
    from_name:   'MUCK Website',
    name,
    phone,
    email:       email || 'Not provided',
    eircode,
    services:    serviceNames,
    estimate:    `€${low} – €${high}`,
  };
  const res = await fetch('https://api.web3forms.com/submit', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body:    JSON.stringify(payload),
  });
  return res.ok;
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

  const { low, high } = calcEstimate(state.services, state.sizeBand, state.customSqm, state.windowCount);
  state.low  = low;
  state.high = high;

  document.getElementById('result-range').textContent = `€${low} – €${high}`;
  document.getElementById('result-services').textContent = state.services.map(serviceLabel).join(' · ');

  const noteEl  = document.getElementById('result-area-note');
  const noteMap = {
    inArea:  { text: '✓ In our service area',                              cls: 'green' },
    nearby:  { text: '⚠ Distance charge may apply',                        cls: '' },
    outside: { text: '⚠ Outside standard area — we\'ll confirm availability', cls: '' },
  };
  const note = noteMap[state.zone];
  noteEl.textContent = note.text;
  noteEl.className   = `result-area-note${note.cls ? ' ' + note.cls : ''}`;

  // Clear any previous contact details / status
  document.getElementById('lead-name').value  = '';
  document.getElementById('lead-phone').value = '';
  document.getElementById('lead-email').value = '';
  document.getElementById('submit-status').textContent = '';
  document.getElementById('submit-status').className   = 'submit-status';

  showPanel(4);
}

async function handleSubmit() {
  const name  = document.getElementById('lead-name').value.trim();
  const phone = document.getElementById('lead-phone').value.trim();
  const email = document.getElementById('lead-email').value.trim();
  const statusEl = document.getElementById('submit-status');

  // Validate
  if (!name)  { statusEl.textContent = 'Please enter your name.';         statusEl.className = 'submit-status error'; return; }
  if (!phone) { statusEl.textContent = 'Please enter your phone number.'; statusEl.className = 'submit-status error'; return; }

  const btn = document.getElementById('result-submit-btn');
  btn.disabled    = true;
  btn.textContent = 'Sending…';
  statusEl.textContent = '';

  // Send email
  await submitToEmail(name, phone, email, state.eircode, state.services, state.low, state.high);

  // Open WhatsApp
  const waUrl = buildWhatsAppUrl(name, phone, state.eircode, state.services, state.low, state.high);
  window.open(waUrl, '_blank');

  // Confirm to user
  btn.textContent      = '✓ Sent! Opening WhatsApp…';
  statusEl.textContent = 'Quote sent — we\'ll be in touch shortly.';
  statusEl.className   = 'submit-status ok';
}

function resetQuote() {
  state = { step: 1, eircode: '', zone: null, services: [], sizeBand: 'medium', customSqm: null, windowCount: 8, low: 0, high: 0 };
  document.getElementById('window-count-display').textContent = '8';
  document.getElementById('window-count-row').classList.remove('visible');
  const btn = document.getElementById('result-submit-btn');
  btn.disabled    = false;
  btn.innerHTML   = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg> Send Quote &amp; Book on WhatsApp';
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
    cb.addEventListener('change', () => {
      label.classList.toggle('checked', cb.checked);
      // Show/hide window counter
      if (cb.value === 'windows') {
        document.getElementById('window-count-row').classList.toggle('visible', cb.checked);
      }
    });
  });

  /* Window counter buttons */
  document.getElementById('window-minus').addEventListener('click', () => {
    if (state.windowCount > 1) {
      state.windowCount--;
      document.getElementById('window-count-display').textContent = state.windowCount;
    }
  });
  document.getElementById('window-plus').addEventListener('click', () => {
    if (state.windowCount < 60) {
      state.windowCount++;
      document.getElementById('window-count-display').textContent = state.windowCount;
    }
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
  document.getElementById('result-submit-btn').addEventListener('click', handleSubmit);
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
