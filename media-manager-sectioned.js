/* ============================================================
   IPA Church Elappara — sectioned media manager
   Sections:
     home    = Main Church Moment (one image)
     youth   = Youth Ministry (one image)
     worship = Worship Team (one image)
     family  = Church Family (one image)
     gallery = Gallery (many images, editable heading + caption)
     sunday  = Sunday Service (one video)
   ============================================================ */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { supabaseUrl, supabaseAnonKey, supabaseReady } from './supabase-config.js';

const BUCKET = 'site-media';
const TABLE = 'site_media';
const SECTIONS = [
  { key: 'home', label: 'Main Church Moment', help: 'One image used in the Church Moment card on the home page.', kind: 'image', single: true },
  { key: 'youth', label: 'Youth Ministry', help: 'One background image for the Youth Ministry card.', kind: 'image', single: true },
  { key: 'worship', label: 'Worship Team', help: 'One background image for the Worship Team card.', kind: 'image', single: true },
  { key: 'family', label: 'Church Family', help: 'One background image for the Church Family card.', kind: 'image', single: true },
  { key: 'gallery', label: 'Gallery', help: 'Multiple images. Each image has an editable heading and caption.', kind: 'image', single: false },
  { key: 'sunday', label: 'Moments from Sunday Service', help: 'One video shown in the Sunday service section.', kind: 'video', single: true },
];

let client = null;
let cachedItems = [];
let publicCoverflowCleanup = null;

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/\"/g, '&quot;').replace(/'/g, '&#39;');

const safeTitle = (name) => String(name || 'Untitled media')
  .replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Untitled media';

function ensureStyle() {
  if (document.getElementById('ipaSectionedMediaStyle')) return;
  const style = document.createElement('style');
  style.id = 'ipaSectionedMediaStyle';
  style.textContent = `
    .ipa-media-card{border:1px solid var(--line);border-radius:6px;padding:1.6rem;margin-bottom:1.6rem;background:var(--bg-elev)}
    .ipa-media-head{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;margin-bottom:1.15rem}
    .ipa-media-help{font-size:.82rem;color:var(--muted-2);line-height:1.5;margin:.3rem 0 0}
    .ipa-media-count{font-size:.72rem;color:var(--gold-2);border:1px solid var(--line-strong);padding:.35rem .65rem;border-radius:999px;white-space:nowrap}
    .ipa-media-upload{border:1px dashed var(--line-strong);border-radius:5px;padding:1rem;display:flex;align-items:center;gap:.7rem;flex-wrap:wrap;margin-bottom:1rem}
    .ipa-media-upload input{max-width:360px;color:var(--muted-2);font-size:.78rem}
    .ipa-media-list{display:grid;gap:1rem}
    .ipa-media-item{display:grid;grid-template-columns:190px 1fr;gap:1rem;padding:.8rem;border:1px solid var(--line);border-radius:5px;background:rgba(255,255,255,.015)}
    .ipa-media-preview{aspect-ratio:16/10;background:#000;border-radius:4px;overflow:hidden}
    .ipa-media-preview img,.ipa-media-preview video{width:100%;height:100%;object-fit:cover;display:block}
    .ipa-media-kind{font-size:.64rem;letter-spacing:.1em;color:var(--gold-2);display:block;margin-bottom:.45rem}
    .ipa-media-input,.ipa-media-textarea{width:100%;border:1px solid var(--line-strong);background:var(--bg);color:var(--ink);border-radius:4px;padding:.65rem .75rem;font:inherit}
    .ipa-media-textarea{margin-top:.6rem;resize:vertical}
    .ipa-media-actions{display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;margin-top:.65rem}
    .ipa-media-empty{font-size:.82rem;color:var(--muted-2);margin:0;padding:.5rem 0}
    .ipa-media-section{border-top:1px solid var(--line);padding-top:1.3rem;margin-top:1.3rem}
    .ipa-media-section:first-of-type{border-top:0;padding-top:0;margin-top:0}
    .ipa-media-section h3{font-family:'Fraunces',serif;font-size:1.2rem;font-weight:500;margin:0}
    .ipa-media-section-title{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:.8rem}
    .ipa-media-section-help{font-size:.76rem;color:var(--muted-2);margin:.2rem 0 0}
    .ipa-media-status{font-size:.78rem;color:var(--muted-2)}
    .ipa-media-error{color:#e07a5f}
    .ipa-media-ok{color:#8fbe78}
    @media(max-width:700px){.ipa-media-item{grid-template-columns:1fr}.ipa-media-upload input{max-width:none;width:100%}.ipa-media-head,.ipa-media-section-title{flex-direction:column}}
  `;
  document.head.appendChild(style);
}

function getClient() {
  if (!supabaseReady || !supabaseUrl || !supabaseAnonKey) return null;
  if (!client) client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
}

async function ensureSession() {
  const sb = getClient();
  if (!sb) throw new Error('Supabase is not configured.');
  const { data } = await sb.auth.getSession();
  if (data.session) return sb;
  const { error } = await sb.auth.signInAnonymously();
  if (error) throw error;
  return sb;
}

function mediaUrl(path) {
  const sb = getClient();
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function fetchMedia() {
  const sb = getClient();
  if (!sb) return [];
  const { data, error } = await sb.from(TABLE)
    .select('id,path,kind,section,title,caption,sort_order,created_at')
    .order('section', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

function sectionItems(section) {
  return cachedItems.filter((item) => item.section === section);
}

function statusText(id, text, error = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = `ipa-media-status ${error ? 'ipa-media-error' : 'ipa-media-ok'}`;
}

function renderSection(section) {
  const wrap = document.getElementById(`ipa-media-list-${section.key}`);
  if (!wrap) return;
  const items = sectionItems(section.key);
  const counter = document.getElementById(`ipa-media-count-${section.key}`);
  if (counter) counter.textContent = `${items.length} ${items.length === 1 ? 'file' : 'files'}`;

  if (!items.length) {
    wrap.innerHTML = `<p class="ipa-media-empty">No ${section.kind === 'video' ? 'video' : 'images'} uploaded yet.</p>`;
    return;
  }

  wrap.innerHTML = items.map((item) => {
    const url = mediaUrl(item.path);
    const preview = item.kind === 'video'
      ? `<video src="${escapeHtml(url)}" controls muted preload="metadata"></video>`
      : `<img src="${escapeHtml(url)}" alt="${escapeHtml(item.title || 'IPA Church Elappara media')}">`;
    const galleryFields = section.key === 'gallery'
      ? `<input class="ipa-media-input media-title" value="${escapeHtml(item.title || '')}" placeholder="Heading shown on the gallery image">
         <textarea class="ipa-media-textarea media-caption" rows="2" placeholder="Optional caption">${escapeHtml(item.caption || '')}</textarea>`
      : `<input class="ipa-media-input media-title" value="${escapeHtml(item.title || '')}" placeholder="Title">`;

    return `<article class="ipa-media-item" data-id="${Number(item.id)}" data-path="${escapeHtml(item.path)}">
      <div class="ipa-media-preview">${preview}</div>
      <div>
        <span class="ipa-media-kind">${item.kind === 'video' ? 'VIDEO' : 'IMAGE'}</span>
        ${galleryFields}
        <div class="ipa-media-actions">
          <button type="button" class="admin-save media-save">Save details</button>
          <button type="button" class="admin-small-btn media-remove">Remove</button>
          <span class="admin-msg media-row-msg"></span>
        </div>
      </div>
    </article>`;
  }).join('');

  wrap.querySelectorAll('.media-save').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const item = btn.closest('.ipa-media-item');
      const msg = item.querySelector('.media-row-msg');
      msg.textContent = 'Saving…';
      try {
        const sb = await ensureSession();
        const updates = { title: item.querySelector('.media-title').value.trim() };
        const caption = item.querySelector('.media-caption');
        if (caption) updates.caption = caption.value.trim();
        const { error } = await sb.from(TABLE).update(updates).eq('id', Number(item.dataset.id));
        if (error) throw error;
        const found = cachedItems.find((x) => x.id === Number(item.dataset.id));
        if (found) Object.assign(found, updates);
        msg.textContent = 'Saved ✓';
        msg.className = 'admin-msg ipa-media-row-msg ok';
        await renderPublic();
      } catch (err) {
        console.error(err);
        msg.textContent = err.message || 'Could not save';
        msg.className = 'admin-msg ipa-media-row-msg err';
      }
    });
  });

  wrap.querySelectorAll('.media-remove').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const item = btn.closest('.ipa-media-item');
      if (!confirm('Remove this media from the website?')) return;
      const msg = item.querySelector('.media-row-msg');
      msg.textContent = 'Removing…';
      try {
        const sb = await ensureSession();
        const { error: storageError } = await sb.storage.from(BUCKET).remove([item.dataset.path]);
        if (storageError) throw storageError;
        const { error: rowError } = await sb.from(TABLE).delete().eq('id', Number(item.dataset.id));
        if (rowError) throw rowError;
        cachedItems = cachedItems.filter((x) => x.id !== Number(item.dataset.id));
        renderAdmin();
        await renderPublic();
      } catch (err) {
        console.error(err);
        msg.textContent = err.message || 'Could not remove';
        msg.className = 'admin-msg ipa-media-row-msg err';
      }
    });
  });
}

function renderAdmin() {
  SECTIONS.forEach(renderSection);
}

async function uploadSection(section) {
  const input = document.getElementById(`ipa-media-files-${section.key}`);
  const files = Array.from(input?.files || []);
  if (!files.length) {
    statusText(`ipa-media-status-${section.key}`, `Choose ${section.kind === 'video' ? 'a video' : 'one or more images'} first.`, true);
    return;
  }

  try {
    const sb = await ensureSession();
    if (section.single) {
      const existing = sectionItems(section.key);
      if (existing.length) {
        await sb.storage.from(BUCKET).remove(existing.map((x) => x.path));
        const { error } = await sb.from(TABLE).delete().eq('section', section.key);
        if (error) throw error;
        cachedItems = cachedItems.filter((x) => x.section !== section.key);
      }
    }

    const selected = section.single ? files.slice(0, 1) : files;
    let uploaded = 0;
    for (const file of selected) {
      const wantsVideo = section.kind === 'video';
      const valid = wantsVideo ? file.type.startsWith('video/') : file.type.startsWith('image/');
      if (!valid) continue;
      if (file.size > 50 * 1024 * 1024) {
        statusText(`ipa-media-status-${section.key}`, `${file.name} is larger than 50 MB and was skipped.`, true);
        continue;
      }

      const kind = wantsVideo ? 'video' : 'image';
      const ext = (file.name.match(/\.([^.]+)$/)?.[1] || (kind === 'video' ? 'mp4' : 'jpg'))
        .toLowerCase().replace(/[^a-z0-9]/g, '') || (kind === 'video' ? 'mp4' : 'jpg');
      const path = `${section.key}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      statusText(`ipa-media-status-${section.key}`, `Uploading ${file.name}…`);

      const { error: uploadError } = await sb.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { data: row, error: rowError } = await sb.from(TABLE).insert({
        path,
        kind,
        section: section.key,
        title: safeTitle(file.name),
        caption: '',
        sort_order: sectionItems(section.key).length + 1,
      }).select('id,path,kind,section,title,caption,sort_order,created_at').single();
      if (rowError) {
        await sb.storage.from(BUCKET).remove([path]);
        throw rowError;
      }
      cachedItems.push(row);
      uploaded += 1;
    }

    input.value = '';
    statusText(`ipa-media-status-${section.key}`, `${uploaded} ${uploaded === 1 ? 'file' : 'files'} uploaded ✓`);
    renderAdmin();
    await renderPublic();
  } catch (err) {
    console.error(err);
    statusText(`ipa-media-status-${section.key}`, err.message || 'Upload failed', true);
  }
}

function buildAdmin() {
  const shell = document.querySelector('#panel .admin-shell');
  if (!shell || document.getElementById('ipaSectionedMediaManager')) return;
  ensureStyle();

  const card = document.createElement('section');
  card.id = 'ipaSectionedMediaManager';
  card.className = 'ipa-media-card';
  card.innerHTML = `<div class="ipa-media-head">
    <div><h2>Media manager</h2><p class="ipa-media-help">Each area is separate. Home, ministries and Sunday video accept one file; Gallery accepts multiple images with editable headings.</p></div>
  </div>
  ${SECTIONS.map((section) => `<div class="ipa-media-section">
    <div class="ipa-media-section-title">
      <div><h3>${section.label}</h3><p class="ipa-media-section-help">${section.help}</p></div>
      <span class="ipa-media-count" id="ipa-media-count-${section.key}">0 files</span>
    </div>
    <div class="ipa-media-upload">
      <input id="ipa-media-files-${section.key}" type="file" ${section.single ? '' : 'multiple'} accept="${section.kind === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/*'}">
      <button type="button" class="admin-save" id="ipa-media-upload-${section.key}">${section.single ? 'Upload / replace' : 'Upload images'}</button>
      <span class="ipa-media-status" id="ipa-media-status-${section.key}">Ready</span>
    </div>
    <div class="ipa-media-list" id="ipa-media-list-${section.key}"><p class="ipa-media-empty">Loading…</p></div>
  </div>`).join('')}`;

  shell.insertBefore(card, shell.firstElementChild?.nextSibling || shell.firstChild);
  SECTIONS.forEach((section) => {
    document.getElementById(`ipa-media-upload-${section.key}`).addEventListener('click', () => uploadSection(section));
  });
  renderAdmin();
}

function initPublicCoverflow() {
  if (publicCoverflowCleanup) publicCoverflowCleanup();
  publicCoverflowCleanup = null;

  const track = document.getElementById('cfTrack');
  const stage = document.getElementById('cfStage');
  const dotsWrap = document.getElementById('cfDots');
  const prev = document.getElementById('cfPrev');
  const next = document.getElementById('cfNext');
  if (!track || !stage || !dotsWrap || !prev || !next) return;

  const slides = Array.from(track.querySelectorAll('.cf-slide'));
  const total = slides.length;
  if (!total) return;
  let current = 0;
  let timer = null;

  const go = (index) => {
    current = ((index % total) + total) % total;
    render();
  };

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
  prev.onclick = () => go(current - 1);
  next.onclick = () => go(current + 1);
  slides.forEach((slide, i) => slide.addEventListener('click', () => i !== current && go(i)));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion) {
    const stop = () => { if (timer) clearInterval(timer); timer = null; };
    const start = () => { stop(); timer = setInterval(() => go(current + 1), 4800); };
    stage.addEventListener('mouseenter', stop);
    stage.addEventListener('mouseleave', start);
    stage.addEventListener('touchstart', stop, { passive: true });
    stage.addEventListener('touchend', start, { passive: true });
    publicCoverflowCleanup = () => {
      stop();
      stage.removeEventListener('mouseenter', stop);
      stage.removeEventListener('mouseleave', start);
    };
    start();
  }
  render();
}

async function renderPublic() {
  const sb = getClient();
  if (!sb) return;
  try {
    const data = await fetchMedia();
    cachedItems = data;

    // Home / main church moment
    const home = sectionItems('home')[0];
    const homeImg = document.querySelector('.hero-card .hero-photo img');
    if (homeImg && home) {
      homeImg.src = mediaUrl(home.path);
      homeImg.alt = home.title || 'IPA Church Elappara church moment';
      homeImg.classList.remove('cf-broken');
      const caption = document.querySelector('.hero-card .card-caption span');
      if (caption && (home.caption || home.title)) caption.textContent = home.caption || home.title;
    }

    // Ministry cards
    const ministryMap = [['youth', 0], ['worship', 1], ['family', 2]];
    const cards = document.querySelectorAll('.ministry-card');
    ministryMap.forEach(([section, index]) => {
      const item = sectionItems(section)[0];
      const card = cards[index];
      if (item && card) card.style.setProperty('--bg-img', `url("${mediaUrl(item.path)}")`);
    });

    // Gallery
    const gallery = sectionItems('gallery');
    const track = document.getElementById('cfTrack');
    if (track && gallery.length) {
      track.innerHTML = gallery.map((item, i) => `
        <div class="cf-slide" data-index="${i}">
          <div class="cf-media"><img src="${escapeHtml(mediaUrl(item.path))}" alt="${escapeHtml(item.title || 'IPA Church Elappara gallery image')}"></div>
          <p class="cf-caption">${escapeHtml(item.title || item.caption || 'IPA Church Elappara')}</p>
          ${item.caption ? `<small style="display:block;text-align:center;color:var(--muted);margin-top:.35rem;">${escapeHtml(item.caption)}</small>` : ''}
        </div>`).join('');
      initPublicCoverflow();
    }

    // Sunday video
    const sunday = sectionItems('sunday')[0];
    const video = document.querySelector('.watch-frame video');
    if (video && sunday) {
      video.src = mediaUrl(sunday.path);
      video.setAttribute('data-media-id', String(sunday.id));
      video.load();
    }
  } catch (err) {
    console.warn('IPA sectioned media load skipped:', err);
  }
}

export async function setupAdmin() {
  buildAdmin();
  try {
    await ensureSession();
    cachedItems = await fetchMedia();
    renderAdmin();
  } catch (err) {
    SECTIONS.forEach((s) => statusText(`ipa-media-status-${s.key}`, err.message || 'Media library unavailable', true));
  }
}

export async function loadPublicMedia() {
  await renderPublic();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('panel')) setupAdmin();
    else loadPublicMedia();
  });
} else {
  if (document.getElementById('panel')) setupAdmin();
  else loadPublicMedia();
}
