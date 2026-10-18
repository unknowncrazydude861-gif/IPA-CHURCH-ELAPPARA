/* ============================================================
   IPA Church Elappara — Branches admin script
   Uses the same password as admin.js — change both together.
   ============================================================ */


import { supabaseUrl, supabaseAnonKey, supabaseReady, SUPABASE_SDK } from './supabase-config.js';

/* theme toggle */
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

/* password gate (shared session with admin.html) */
const gate = document.getElementById('gate');
const panel = document.getElementById('panel');
const gateForm = document.getElementById('gateForm');
const gateInput = document.getElementById('gateInput');
const gateErr = document.getElementById('gateErr');

function unlock() { gate.style.display = 'none'; panel.style.display = 'block'; initAdmin(); }

/* Reuse the main admin sign-in instead of duplicating a password in this file. */
if (sessionStorage.getItem('ipa_admin_ok') === 'true') {
  unlock();
} else {
  location.replace('admin.html?next=branches');
}
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  sessionStorage.removeItem('ipa_admin_ok');
  location.reload();
});

/* main admin logic */
let supabase = null;
let editingId = null;
let pendingFile = null;

async function initAdmin() {
  const statusEl = document.getElementById('adminStatus');
  if (!supabaseReady) { statusEl.textContent = 'Supabase not configured'; statusEl.classList.add('warn'); return; }

  try {
    const { createClient } = await import(`https://esm.sh/@supabase/supabase-js@${SUPABASE_SDK}`);
    supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      const { error: authError } = await supabase.auth.signInAnonymously();
      if (authError) throw authError;
    }

    statusEl.textContent = 'Connected';
    statusEl.classList.add('ok');
    await refreshList();
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Connection error — see console';
    statusEl.classList.add('warn');
  }
}

async function refreshList() {
  const wrap = document.getElementById('branchList');
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) { wrap.innerHTML = `<p style="color:#e07a5f;font-size:0.9rem;">Could not load branches.</p>`; return; }

  wrap.innerHTML = '';
  if (!data.length) {
    wrap.innerHTML = `<p style="color:var(--muted);font-size:0.9rem;">No branches yet — add the first one below.</p>`;
    return;
  }

  data.forEach((b) => {
    const row = document.createElement('div');
    row.className = 'branch-admin-row';
    row.innerHTML = `
      <div class="thumb">${b.pastor_photo_url ? `<img src="${escapeAttr(b.pastor_photo_url)}" alt="">` : ''}</div>
      <div class="info">
        <strong></strong>
        <span></span>
      </div>
      <div class="row-actions">
        <button type="button" class="admin-small-btn edit-btn">Edit</button>
        <button type="button" class="admin-small-btn remove-btn">Delete</button>
      </div>
    `;
    row.querySelector('.info strong').textContent = b.name || 'Untitled branch';
    row.querySelector('.info span').textContent = [b.pastor_name, b.pastor_role].filter(Boolean).join(' · ');
    row.querySelector('.edit-btn').addEventListener('click', () => startEdit(b));
    row.querySelector('.remove-btn').addEventListener('click', () => removeBranch(b.id, b.name));
    wrap.appendChild(row);
  });
}

function escapeAttr(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v ?? ''; }
function getVal(id) { return document.getElementById(id)?.value?.trim() ?? ''; }

function startEdit(b) {
  editingId = b.id;
  setVal('f-name', b.name);
  setVal('f-pastor-name', b.pastor_name);
  setVal('f-pastor-role', b.pastor_role);
  setVal('f-phone', b.phone);
  setVal('f-address', b.address);
  setVal('f-bio', b.pastor_bio);
  setVal('f-photo-url', b.pastor_photo_url);
  document.getElementById('f-photo-file').value = '';
  pendingFile = null;
  updateThumb(b.pastor_photo_url);
  document.getElementById('formTitle').textContent = `Editing “${b.name || 'branch'}”`;
  document.getElementById('save-branch').textContent = 'Save changes';
  document.getElementById('cancel-edit').style.display = 'inline-flex';
  document.getElementById('formTitle').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetForm() {
  editingId = null;
  pendingFile = null;
  ['f-name', 'f-pastor-name', 'f-pastor-role', 'f-phone', 'f-address', 'f-bio', 'f-photo-url'].forEach((id) => setVal(id, ''));
  document.getElementById('f-photo-file').value = '';
  updateThumb(null);
  document.getElementById('formTitle').textContent = 'Add a branch';
  document.getElementById('save-branch').textContent = 'Add branch';
  document.getElementById('cancel-edit').style.display = 'none';
}
document.getElementById('cancel-edit').addEventListener('click', resetForm);

function updateThumb(url) {
  const thumb = document.getElementById('formThumb');
  thumb.innerHTML = url
    ? `<img src="${escapeAttr(url)}" alt="">`
    : `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.4" style="color:var(--muted-2);"><rect x="3" y="6" width="18" height="13" rx="1.5"/><circle cx="12" cy="12.5" r="3.4"/><path d="M8 6l1.5-2.5h5L16 6"/></svg>`;
}

document.getElementById('f-photo-file').addEventListener('change', (e) => {
  pendingFile = e.target.files[0] || null;
  if (pendingFile) {
    setVal('f-photo-url', '');
    const reader = new FileReader();
    reader.onload = (ev) => updateThumb(ev.target.result);
    reader.readAsDataURL(pendingFile);
  }
});
document.getElementById('f-photo-url').addEventListener('input', (e) => {
  if (e.target.value) { pendingFile = null; document.getElementById('f-photo-file').value = ''; updateThumb(e.target.value); }
});

async function removeBranch(id, name) {
  if (!confirm(`Delete "${name || 'this branch'}"? This can't be undone.`)) return;
  const { error } = await supabase.from('branches').delete().eq('id', id);
  if (error) { alert('Could not delete — see console.'); console.error(error); return; }
  if (editingId === id) resetForm();
  refreshList();
}

document.getElementById('save-branch').addEventListener('click', async () => {
  const msgEl = document.getElementById('msg-branch');
  msgEl.textContent = 'Saving…';
  msgEl.className = 'admin-msg';

  try {
    let photoUrl = getVal('f-photo-url');

    if (pendingFile) {
      const ext = pendingFile.name.split('.').pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('branch-photos').upload(path, pendingFile, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('branch-photos').getPublicUrl(path);
      photoUrl = pub.publicUrl;
    }

    const record = {
      name: getVal('f-name'),
      pastor_name: getVal('f-pastor-name'),
      pastor_role: getVal('f-pastor-role'),
      pastor_bio: getVal('f-bio'),
      pastor_photo_url: photoUrl,
      address: getVal('f-address'),
      phone: getVal('f-phone'),
    };

    if (!record.name) { msgEl.textContent = 'Branch name is required.'; msgEl.className = 'admin-msg err'; return; }

    let error;
    if (editingId) {
      ({ error } = await supabase.from('branches').update(record).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('branches').insert(record));
    }
    if (error) throw error;

    msgEl.textContent = 'Saved ✓';
    msgEl.className = 'admin-msg ok';
    resetForm();
    refreshList();
  } catch (err) {
    console.error(err);
    msgEl.textContent = 'Could not save — see console.';
    msgEl.className = 'admin-msg err';
  }
});