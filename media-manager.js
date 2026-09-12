/* ============================================================
   IPA Church Elappara — Media Manager
   Separate media controls for Home, Ministries, Leadership,
   Gallery and Sunday Service video.
   ============================================================ */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { supabaseUrl, supabaseAnonKey, supabaseReady } from './supabase-config.js';

const BUCKET = 'site-media';
const TABLE = 'site_media';

const SECTIONS = {
  home_moment: { label: 'Home — Main Church Moment', multiple: false, kind: 'image', selector: '.hero-card .hero-photo img' },
  ministry_youth: { label: 'Ministries — Youth', multiple: false, kind: 'image', index: 0 },
  ministry_worship: { label: 'Ministries — Worship Team', multiple: false, kind: 'image', index: 1 },
  ministry_family: { label: 'Ministries — Church Family', multiple: false, kind: 'image', index: 2 },
  leadership: { label: 'Leadership — Pastor / Leader', multiple: false, kind: 'image', selector: '.pastor-media img' },
  gallery: { label: 'Gallery', multiple: true, kind: 'image' },
  sunday_service_video: { label: 'Sunday Service — Current Video', multiple: false, kind: 'video', selector: '.watch-frame video' },
};

let client = null;

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const titleFromName = (name) => String(name || 'Untitled media')
  .replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ').trim() || 'Untitled media';

async function getClient() {
  if (!supabaseReady || !supabaseUrl || !supabaseAnonKey) return null;
  if (!client) client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
}

async function ensureAdminSession() {
  const sb = await getClient();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  if (data?.session) return sb;
  const { error } = await sb.auth.signInAnonymously();
  if (error) throw error;
  return sb;
}

function publicUrl(path) {
  return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function listMedia() {
  const sb = await getClient();
  if (!sb) return { data: [], error: null };
  return sb.from(TABLE)
    .select('id,path,kind,section,title,caption,sort_order,created_at')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
}

function sectionItems(items, section) {
  return (items || []).filter((item) => item.section === section);
}

function ensureStyle() {
  if (document.getElementById('ipaMediaStyle')) return;
  const style = document.createElement('style');
  style.id = 'ipaMediaStyle';
  style.textContent = `
    .ipa-mm-wrap{display:grid;gap:1rem;}
    .ipa-mm-card{border:1px solid var(--line);border-radius:6px;padding:1.25rem;background:var(--bg-elev);}
    .ipa-mm-card h2{margin-bottom:.2rem;}
    .ipa-mm-help{font-size:.8rem;color:var(--muted-2);line-height:1.5;margin:0 0 1rem;}
    .ipa-mm-toolbar{display:flex;gap:.65rem;align-items:center;flex-wrap:wrap;padding:1rem;border:1px dashed var(--line-strong);border-radius:5px;}
    .ipa-mm-toolbar input{max-width:320px;color:var(--muted-2);font-size:.78rem;}
    .ipa-mm-count{font-size:.72rem;color:var(--gold-2);border:1px solid var(--line-strong);padding:.3rem .6rem;border-radius:999px;white-space:nowrap;}
    .ipa-mm-list{display:grid;gap:.8rem;margin-top:1rem;}
    .ipa-mm-item{display:grid;grid-template-columns:180px 1fr;gap:1rem;padding:.8rem;border:1px solid var(--line);border-radius:5px;background:rgba(255,255,255,.015);}
    .ipa-mm-preview{aspect-ratio:16/10;background:#000;border-radius:4px;overflow:hidden;}
    .ipa-mm-preview img,.ipa-mm-preview video{width:100%;height:100%;object-fit:cover;display:block;}
    .ipa-mm-kind{font-size:.63rem;letter-spacing:.11em;color:var(--gold-2);display:block;margin-bottom:.4rem;}
    .ipa-mm-input,.ipa-mm-textarea{width:100%;border:1px solid var(--line-strong);background:var(--bg);color:var(--ink);border-radius:4px;padding:.6rem .7rem;font:inherit;}
    .ipa-mm-textarea{margin-top:.55rem;resize:vertical;}
    .ipa-mm-actions{display:flex;gap:.55rem;align-items:center;flex-wrap:wrap;margin-top:.6rem;}
    .ipa-mm-status{font-size:.75rem;color:var(--muted-2);}
    .ipa-mm-empty{font-size:.8rem;color:var(--muted-2);margin:0;padding:.4rem 0;}
    @media(max-width:700px){.ipa-mm-item{grid-template-columns:1fr}.ipa-mm-toolbar input{width:100%;max-width:none}}
  `;
  document.head.appendChild(style);
}

function adminStatus(message, error = false) {
  document.querySelectorAll('[data-mm-status]').forEach((el) => {
    el.textContent = message;
    el.style.color = error ? '#e07a5f' : '';
  });
}

function renderSectionItems(items) {
  if (!items.length) return '<p class="ipa-mm-empty">Nothing uploaded yet.</p>';
  return items.map((item) => {
    const url = publicUrl(item.path);
    const preview = item.kind === 'video'
      ? `<video src="${escapeHtml(url)}" muted controls preload="metadata"></video>`
      : `<img src="${escapeHtml(url)}" alt="${escapeHtml(item.title || 'Church photo')}">`;
    return `
      <article class="ipa-mm-item" data-id="${Number(item.id)}" data-path="${escapeHtml(item.path)}">
        <div class="ipa-mm-preview">${preview}</div>
        <div>
          <span class="ipa-mm-kind">${item.kind === 'video' ? 'VIDEO' : 'IMAGE'}</span>
          <input class="ipa-mm-input ipa-mm-title" value="${escapeHtml(item.title || '')}" placeholder="Image heading / title">
          <textarea class="ipa-mm-textarea ipa-mm-caption" rows="2" placeholder="Caption">${escapeHtml(item.caption || '')}</textarea>
          <div class="ipa-mm-actions">
            <button type="button" class="admin-save ipa-mm-save">Save</button>
            <button type="button" class="admin-small-btn ipa-mm-delete">Remove</button>
            <span class="ipa-mm-status ipa-mm-row-status"></span>
          </div>
        </div>
      </article>`;
  }).join('');
}

function bindItemEvents(card) {
  card.querySelectorAll('.ipa-mm-save').forEach((button) => {
    button.addEventListener('click', async () => {
      const item = button.closest('.ipa-mm-item');
      const status = item.querySelector('.ipa-mm-row-status');
      status.textContent = 'Saving…';
      try {
        const sb = await ensureAdminSession();
        const { error } = await sb.from(TABLE).update({
          title: item.querySelector('.ipa-mm-title').value.trim(),
          caption: item.querySelector('.ipa-mm-caption').value.trim(),
        }).eq('id', Number(item.dataset.id));
        if (error) throw error;
        status.textContent = 'Saved ✓';
      } catch (err) {
        console.error(err);
        status.textContent = err.message || 'Could not save';
      }
    });
  });

  card.querySelectorAll('.ipa-mm-delete').forEach((button) => {
    button.addEventListener('click', async () => {
      const item = button.closest('.ipa-mm-item');
      if (!confirm('Remove this media file from the website?')) return;
      const status = item.querySelector('.ipa-mm-row-status');
      status.textContent = 'Removing…';
      try {
        const sb = await ensureAdminSession();
        const { error: rowError } = await sb.from(TABLE).delete().eq('id', Number(item.dataset.id));
        if (rowError) throw rowError;
        const { error: storageError } = await sb.storage.from(BUCKET).remove([item.dataset.path]);
        if (storageError) console.warn('Storage delete warning:', storageError.message);
        await refreshAdminManager();
      } catch (err) {
        console.error(err);
        status.textContent = err.message || 'Could not remove';
      }
    });
  });
}

function buildSectionCard(section, items) {
  const cfg = SECTIONS[section];
  const card = document.createElement('section');
  card.className = 'ipa-mm-card';
  card.dataset.section = section;
  const current = sectionItems(items, section);
  const accept = cfg.kind === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/*';
  const buttonText = cfg.kind === 'video' ? (current.length ? 'Replace video' : 'Upload video')
    : (cfg.multiple ? 'Add images' : (current.length ? 'Replace image' : 'Upload image'));

  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap;">
      <div>
        <h2>${escapeHtml(cfg.label)}</h2>
        <p class="ipa-mm-help">${cfg.multiple ? 'Add as many gallery photos as needed. Each photo has its own heading and caption.' : 'Only one item is used here. Uploading a new one replaces the current item.'}</p>
      </div>
      <span class="ipa-mm-count">${current.length} ${current.length === 1 ? 'item' : 'items'}</span>
    </div>
    <div class="ipa-mm-toolbar">
      <input class="ipa-mm-file" type="file" accept="${accept}" ${cfg.multiple ? 'multiple' : ''}>
      <button type="button" class="admin-save ipa-mm-upload">${buttonText}</button>
      <span class="ipa-mm-status" data-mm-status></span>
    </div>
    <div class="ipa-mm-list">${renderSectionItems(current)}</div>`;
  card.querySelector('.ipa-mm-upload').addEventListener('click', () => uploadSection(section, card));
  bindItemEvents(card);
  return card;
}

async function removeExistingSectionItems(sb, section) {
  const { data, error } = await sb.from(TABLE).select('id,path').eq('section', section);
  if (error) throw error;
  const rows = data || [];
  if (!rows.length) return;
  const paths = rows.map((row) => row.path).filter(Boolean);
  if (paths.length) {
    const { error: storageError } = await sb.storage.from(BUCKET).remove(paths);
    if (storageError) console.warn('Previous storage delete warning:', storageError.message);
  }
  const { error: deleteError } = await sb.from(TABLE).delete().eq('section', section);
  if (deleteError) throw deleteError;
}

async function uploadSection(section, card) {
  const cfg = SECTIONS[section];
  const input = card.querySelector('.ipa-mm-file');
  const files = Array.from(input.files || []);
  const status = card.querySelector('[data-mm-status]');
  if (!files.length) { status.textContent = 'Choose a file first.'; return; }

  const valid = files.filter((file) => {
    if (file.size > 50 * 1024 * 1024) { status.textContent = `${file.name} is larger than 50 MB.`; return false; }
    return cfg.kind === 'video' ? file.type.startsWith('video/') : file.type.startsWith('image/');
  });
  if (!valid.length) return;

  try {
    const sb = await ensureAdminSession();
    if (!cfg.multiple) await removeExistingSectionItems(sb, section);
    let added = 0;
    for (const file of (cfg.multiple ? valid : valid.slice(0, 1))) {
      const ext = (file.name.match(/\.([^.]+)$/)?.[1] || (cfg.kind === 'video' ? 'mp4' : 'jpg')).toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `${cfg.kind === 'video' ? 'videos' : 'images'}/${section}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      status.textContent = `Uploading ${file.name}…`;
      const { error: uploadError } = await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { error: rowError } = await sb.from(TABLE).insert({
        path, kind: cfg.kind, section, title: titleFromName(file.name), caption: '', sort_order: Math.floor(Date.now() / 1000) % 2147483647,
      });
      if (rowError) { await sb.storage.from(BUCKET).remove([path]); throw rowError; }
      added += 1;
    }
    input.value = '';
    status.textContent = `${added} ${added === 1 ? 'item' : 'items'} saved ✓`;
    await refreshAdminManager();
  } catch (err) {
    console.error(err);
    status.textContent = err.message || 'Upload failed';
  }
}

async function refreshAdminManager() {
  const root = document.getElementById('ipaMediaManager');
  if (!root) return;
  const result = await listMedia();
  if (result.error) { adminStatus(`Could not load media: ${result.error.message}`, true); return; }
  const existing = root.querySelector('.ipa-mm-wrap');
  if (!existing) return;
  existing.innerHTML = '';
  Object.keys(SECTIONS).forEach((section) => existing.appendChild(buildSectionCard(section, result.data || [])));
  adminStatus('Connected');
}

async function setupAdmin() {
  const shell = document.querySelector('#panel .admin-shell');
  if (!shell || document.getElementById('ipaMediaManager')) return;
  ensureStyle();
  const root = document.createElement('section');
  root.id = 'ipaMediaManager';
  root.className = 'ipa-mm-card';
  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap;">
      <div><h2>Website Media</h2><p class="ipa-mm-help">Manage Home, Ministries, Leadership, Gallery and the current Sunday Service video separately.</p></div>
      <span class="ipa-mm-status" data-mm-status>Connecting…</span>
    </div>
    <div class="ipa-mm-wrap"></div>`;
  shell.appendChild(root);
  try { await ensureAdminSession(); await refreshAdminManager(); }
  catch (err) { console.error(err); adminStatus(err.message || 'Media library unavailable.', true); }
}

function initPublicCoverflow() {
  const track = document.getElementById('cfTrack');
  const stage = document.getElementById('cfStage');
  const dotsWrap = document.getElementById('cfDots');
  const prev = document.getElementById('cfPrev');
  const next = document.getElementById('cfNext');
  if (!track || !stage || !dotsWrap || !prev || !next) return;
  const slides = Array.from(track.querySelectorAll('.cf-slide'));
  const total = slides.length;
  if (!total) return;
  let current = 0, timer = null;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const go = (i) => { current = ((i % total) + total) % total; render(); };
  const render = () => {
    slides.forEach((slide, i) => {
      let offset = i - current;
      if (offset > total / 2) offset -= total;
      if (offset < -total / 2) offset += total;
      const abs = Math.abs(offset);
      slide.style.transform = `translateX(${offset * 46}%) translateZ(${-abs * 210}px) rotateY(${offset * -32}deg) scale(${1 - abs * 0.14})`;
      slide.style.opacity = abs > 2 ? 0 : 1 - abs * 0.32;
      slide.style.zIndex = 10 - abs;
      slide.style.pointerEvents = abs > 2 ? 'none' : 'auto';
      slide.classList.toggle('is-active', offset === 0);
    });
    Array.from(dotsWrap.children).forEach((dot, i) => dot.classList.toggle('active', i === current));
  };
  dotsWrap.innerHTML = '';
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'cf-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Go to photo ${i + 1}`);
    dot.addEventListener('click', () => go(i));
    dotsWrap.appendChild(dot);
  });
  prev.onclick = () => go(current - 1); next.onclick = () => go(current + 1);
  slides.forEach((slide, i) => slide.addEventListener('click', () => i !== current && go(i)));
  if (!reduceMotion) {
    const stop = () => { if (timer) clearInterval(timer); timer = null; };
    const start = () => { stop(); timer = setInterval(() => go(current + 1), 4800); };
    stage.addEventListener('mouseenter', stop); stage.addEventListener('mouseleave', start);
    stage.addEventListener('touchstart', stop, { passive: true }); stage.addEventListener('touchend', start, { passive: true }); start();
  }
  render();
}

function renderPublicGallery(items) {
  const gallery = sectionItems(items, 'gallery');
  const track = document.getElementById('cfTrack');
  if (!track || !gallery.length) return;
  track.innerHTML = gallery.map((item, i) => `<div class="cf-slide" data-index="${i}"><div class="cf-media"><img src="${escapeHtml(publicUrl(item.path))}" alt="${escapeHtml(item.title || 'IPA Church Elappara photo')}"></div><p class="cf-caption">${escapeHtml(item.caption || item.title || 'IPA Church Elappara')}</p></div>`).join('');
  initPublicCoverflow();
}

function renderPublicSingleMedia(items, section, selector) {
  const item = sectionItems(items, section)[0];
  if (!item) return;
  const el = document.querySelector(selector);
  if (!el) return;
  const url = publicUrl(item.path);
  if (el.tagName === 'IMG') { el.src = url; if (item.title) el.alt = item.title; }
  else if (el.tagName === 'VIDEO') { el.src = url; el.load(); }
}

function renderPublicMinistry(items, section, index) {
  const item = sectionItems(items, section)[0];
  const cards = document.querySelectorAll('#ministries .ministry-card');
  const card = cards[index];
  if (!item || !card) return;
  card.style.setProperty('--bg-img', `url("${publicUrl(item.path)}")`);
}

async function loadPublicMedia() {
  const sb = await getClient();
  if (!sb) return;
  const { data, error } = await sb.from(TABLE)
    .select('id,path,kind,section,title,caption,sort_order,created_at')
    .order('sort_order', { ascending: true }).order('created_at', { ascending: true });
  if (error) { console.warn('IPA public media load skipped:', error); return; }
  const items = data || [];
  renderPublicSingleMedia(items, 'home_moment', '.hero-card .hero-photo img');
  renderPublicMinistry(items, 'ministry_youth', 0);
  renderPublicMinistry(items, 'ministry_worship', 1);
  renderPublicMinistry(items, 'ministry_family', 2);
  renderPublicSingleMedia(items, 'leadership', '.pastor-media img');
  renderPublicGallery(items);
  renderPublicSingleMedia(items, 'sunday_service_video', '.watch-frame video');
}

window.IPAMediaManager = { setupAdmin, loadPublicMedia };

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => document.getElementById('panel') ? setupAdmin() : loadPublicMedia());
} else {
  if (document.getElementById('panel')) setupAdmin(); else loadPublicMedia();
}
