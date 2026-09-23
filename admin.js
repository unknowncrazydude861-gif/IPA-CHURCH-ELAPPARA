/* ============================================================
   IPA Church Elappara — admin panel script
   ============================================================
   Change the password by editing the line just below.
   This is a client-side gate for convenience, not a security
   boundary — see README.md for what actually protects the
   database (Supabase auth + row-level security).
   ============================================================ */
const ADMIN_PASSWORD = 'admin861';

import { supabaseUrl, supabaseAnonKey, supabaseReady, SUPABASE_SDK } from './supabase-config.js';

/* ---------------- shared deep 3D button styling ---------------- */
if (!document.querySelector('link[data-ultra-buttons]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './ultra-buttons.css?v=20260914-deep';
  link.dataset.ultraButtons = 'true';
  document.head.appendChild(link);
}

/* ---------------- theme toggle (same behaviour as the public site) ---------------- */
(function () {
  const root = document.documentElement;
  const stored = localStorage.getItem('ipa-theme');
  if (stored === 'light') root.setAttribute('data-theme', 'light');
  document.querySelectorAll('.theme-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const isLight = root.getAttribute('data-theme') === 'light';
      if (isLight) { root.removeAttribute('data-theme'); localStorage.setItem('ipa-theme', 'dark'); }
      else { root.setAttribute('data-theme', 'light'); localStorage.setItem('ipa-theme', 'light'); }
    });
  });
})();

/* ---------------- password gate ---------------- */
const gate = document.getElementById('gate');
const panel = document.getElementById('panel');
const gateForm = document.getElementById('gateForm');
const gateInput = document.getElementById('gateInput');
const gateErr = document.getElementById('gateErr');

function unlock() {
  gate.style.display = 'none';
  panel.style.display = 'block';
  initAdmin();
}

if (sessionStorage.getItem('ipa_admin_ok') === 'true') {
  unlock();
} else {
  gateForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (gateInput.value === ADMIN_PASSWORD) {
      sessionStorage.setItem('ipa_admin_ok', 'true');
      unlock();
    } else {
      gateErr.textContent = 'Incorrect password.';
      gateInput.value = '';
    }
  });
}

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  sessionStorage.removeItem('ipa_admin_ok');
  location.reload();
});

/* ---------------- admin main ---------------- */
let supabase = null;
let currentData = null;

async function initAdmin() {
  if (window.__IPA_ADMIN_INIT__) return;
  window.__IPA_ADMIN_INIT__ = true;
  const statusEl = document.getElementById('adminStatus');

  if (!supabaseReady) {
    statusEl.textContent = 'Supabase not configured';
    statusEl.classList.add('warn');
    return;
  }

  try {
    const { createClient } = await import(`https://esm.sh/@supabase/supabase-js@${SUPABASE_SDK}`);
    supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      const { error: authError } = await supabase.auth.signInAnonymously();
      if (authError) throw authError;
    }

    const { data, error } = await supabase.from('site_content').select('data').eq('id', 1).single();
    if (error) throw error;

    currentData = data.data || {};
    statusEl.textContent = 'Connected';
    statusEl.classList.add('ok');
    fillForm(currentData);
  } catch (err) {
    console.error('IPA admin connection error:', err);
    const code = err?.code || err?.name || 'unknown_error';
    if (code === 'anonymous_provider_disabled' || /anonymous.*disabled/i.test(err?.message || '')) {
      statusEl.textContent = 'Anonymous sign-in is disabled in Supabase';
    } else if (err?.message) {
      statusEl.textContent = `Connection error: ${err.message}`;
    } else {
      statusEl.textContent = 'Connection error — see console';
    }
    statusEl.classList.add('warn');
  }
}

function fillForm(d) {
  // Hero
  setVal('f-hero-eyebrow', d.hero?.eyebrow);
  setVal('f-hero-headline', d.hero?.headline);
  setVal('f-hero-lead', d.hero?.lead);

  // Announcement
  document.getElementById('f-announce-enabled').checked = !!d.announcement?.enabled;
  setVal('f-announce-text', d.announcement?.text);

  // Service times (dynamic rows)
  const timesWrap = document.getElementById('timesRows');
  timesWrap.innerHTML = '';
  (d.serviceTimes || []).forEach((t) => addTimeRow(t.label, t.time));
  if (!(d.serviceTimes || []).length) addTimeRow('', '');

  setVal('f-languages', (d.languages || []).join(', '));

  // Ministries (3 fixed slots, matching the 3 cards on the live site)
  const ministries = d.ministries || [];
  for (let i = 0; i < 3; i++) {
    setVal(`f-min-tag-${i}`, ministries[i]?.tag);
    setVal(`f-min-title-${i}`, ministries[i]?.title);
    setVal(`f-min-desc-${i}`, ministries[i]?.desc);
  }

  // Pastor
  setVal('f-pastor-name', d.pastor?.name);
  setVal('f-pastor-role', d.pastor?.role);
  setVal('f-pastor-bio', d.pastor?.bio);
  document.getElementById('f-pastor-confirmed').checked = !!d.pastor?.confirmed;

  // Contact
  const phonesWrap = document.getElementById('phoneRows');
  phonesWrap.innerHTML = '';
  (d.contact?.phones || []).forEach((p) => addPhoneRow(p));
  if (!(d.contact?.phones || []).length) addPhoneRow('');

  setVal('f-email', d.contact?.email);
  setVal('f-address', d.contact?.address);
  setVal('f-mapquery', d.contact?.mapQuery);
  setVal('f-instagram', d.contact?.instagram);
  setVal('f-youtube', d.contact?.youtube);
}

function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val ?? ''; }
function getVal(id) { return document.getElementById(id)?.value?.trim() ?? ''; }

/* ---- dynamic rows: service times ---- */
function addTimeRow(label = '', time = '') {
  const row = document.createElement('div');
  row.className = 'admin-list-row';
  row.innerHTML = `
    <input type="text" class="t-label" placeholder="Label (e.g. Early Service)" value="${escapeAttr(label)}">
    <input type="text" class="t-time" placeholder="Time (e.g. 6:30 – 8:00 AM)" value="${escapeAttr(time)}">
    <button type="button" class="admin-small-btn remove-row">Remove</button>
  `;
  row.querySelector('.remove-row').addEventListener('click', () => row.remove());
  document.getElementById('timesRows').appendChild(row);
}
document.getElementById('addTimeRow').addEventListener('click', () => addTimeRow());

/* ---- dynamic rows: phones ---- */
function addPhoneRow(value = '') {
  const row = document.createElement('div');
  row.className = 'admin-list-row';
  row.style.gridTemplateColumns = '1fr auto';
  row.innerHTML = `
    <input type="text" class="p-phone" placeholder="+91 xxxxx xxxxx" value="${escapeAttr(value)}">
    <button type="button" class="admin-small-btn remove-row">Remove</button>
  `;
  row.querySelector('.remove-row').addEventListener('click', () => row.remove());
  document.getElementById('phoneRows').appendChild(row);
}
document.getElementById('addPhoneRow').addEventListener('click', () => addPhoneRow());

function escapeAttr(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/* ---------------- save handlers ---------------- */
async function saveSection(partial, msgId) {
  const msgEl = document.getElementById(msgId);
  if (!supabase) { msgEl.textContent = 'Not connected to Supabase.'; msgEl.className = 'admin-msg err'; return; }
  currentData = { ...currentData, ...partial };
  msgEl.textContent = 'Saving…';
  msgEl.className = 'admin-msg';
  const { error } = await supabase
    .from('site_content')
    .update({ data: currentData, updated_at: new Date().toISOString() })
    .eq('id', 1);
  if (error) {
    console.error(error);
    msgEl.textContent = 'Could not save — see console.';
    msgEl.className = 'admin-msg err';
  } else {
    msgEl.textContent = 'Saved ✓';
    msgEl.className = 'admin-msg ok';
  }
}

document.getElementById('save-hero').addEventListener('click', () => saveSection({
  hero: {
    eyebrow: getVal('f-hero-eyebrow'),
    headline: getVal('f-hero-headline'),
    lead: getVal('f-hero-lead'),
  },
}, 'msg-hero'));

document.getElementById('save-announce').addEventListener('click', () => saveSection({
  announcement: {
    enabled: document.getElementById('f-announce-enabled').checked,
    text: getVal('f-announce-text'),
  },
}, 'msg-announce'));

document.getElementById('save-times').addEventListener('click', () => {
  const rows = Array.from(document.querySelectorAll('#timesRows .admin-list-row'));
  const serviceTimes = rows
    .map((r) => ({ label: r.querySelector('.t-label').value.trim(), time: r.querySelector('.t-time').value.trim() }))
    .filter((s) => s.label || s.time);
  const languages = getVal('f-languages').split(',').map((s) => s.trim()).filter(Boolean);
  saveSection({ serviceTimes, languages }, 'msg-times');
});

document.getElementById('save-ministries').addEventListener('click', () => {
  const ministries = [0, 1, 2].map((i) => ({
    tag: getVal(`f-min-tag-${i}`),
    title: getVal(`f-min-title-${i}`),
    desc: getVal(`f-min-desc-${i}`),
  }));
  saveSection({ ministries }, 'msg-ministries');
});

document.getElementById('save-pastor').addEventListener('click', () => saveSection({
  pastor: {
    name: getVal('f-pastor-name'),
    role: getVal('f-pastor-role'),
    bio: getVal('f-pastor-bio'),
    confirmed: document.getElementById('f-pastor-confirmed').checked,
  },
}, 'msg-pastor'));

document.getElementById('save-contact').addEventListener('click', () => {
  const rows = Array.from(document.querySelectorAll('#phoneRows .admin-list-row'));
  const phones = rows.map((r) => r.querySelector('.p-phone').value.trim()).filter(Boolean);
  saveSection({
    contact: {
      phones,
      email: getVal('f-email'),
      address: getVal('f-address'),
      mapQuery: getVal('f-mapquery'),
      instagram: getVal('f-instagram'),
      youtube: getVal('f-youtube'),
    },
  }, 'msg-contact');
});
