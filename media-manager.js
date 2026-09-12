/* ============================================================
   IPA Church Elappara — media manager
   Handles Supabase Storage uploads/deletes and public rendering.
   ============================================================ */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { supabaseUrl, supabaseAnonKey, supabaseReady } from './supabase-config.js';

const BUCKET = 'site-media';
const TABLE = 'site_media';
let client = null;

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const titleFromName = (name) => String(name || 'Untitled media')
  .replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ').trim() || 'Untitled media';

function ensureStyle() {
  if (document.getElementById('ipaMediaStyle')) return;
  const style = document.createElement('style');
  style.id = 'ipaMediaStyle';
  style.textContent = `
    .ipa-media-card{border:1px solid var(--line);border-radius:6px;padding:1.6rem;margin-bottom:1.6rem;background:var(--bg-elev);}
    .ipa-media-head{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;margin-bottom:1.15rem;}
    .ipa-media-help{font-size:.8rem;color:var(--muted-2);line-height:1.5;margin:.25rem 0 0;}
    .ipa-media-count{font-size:.72rem;color:var(--gold-2);border:1px solid var(--line-strong);padding:.35rem .65rem;border-radius:999px;white-space:nowrap;}
    .ipa-upload{border:1px dashed var(--line-strong);border-radius:5px;padding:1rem;display:flex;align-items:center;gap:.7rem;flex-wrap:wrap;margin-bottom:1rem;}
    .ipa-upload input{max-width:290px;color:var(--muted-2);font-size:.78rem;}
    .ipa-media-list{display:grid;gap:1rem;}
    .ipa-media-item{display:grid;grid-template-columns:190px 1fr;gap:1rem;padding:.8rem;border:1px solid var(--line);border-radius:5px;background:rgba(255,255,255,.015);}
    .ipa-media-preview{aspect-ratio:16/10;background:#000;border-radius:4px;overflow:hidden;}
    .ipa-media-preview img,.ipa-media-preview video{width:100%;height:100%;object-fit:cover;display:block;}
    .ipa-media-kind{font-size:.64rem;letter-spacing:.1em;color:var(--gold-2);display:block;margin-bottom:.45rem;}
    .ipa-media-title,.ipa-media-caption{width:100%;border:1px solid var(--line-strong);background:var(--bg);color:var(--ink);border-radius:4px;padding:.65rem .75rem;font:inherit;}
    .ipa-media-caption{margin-top:.6rem;resize:vertical;}
    .ipa-media-actions{display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;margin-top:.65rem;}
    .ipa-media-empty{font-size:.82rem;color:var(--muted-2);margin:0;padding:.5rem 0;}
    .ipa-media-error{color:#e07a5f;}
    @media(max-width:700px){.ipa-media-item{grid-template-columns:1fr}.ipa-upload input{max-width:none;width:100%}.ipa-media-head{flex-direction:column}}
  `;
  document.head.appendChild(style);
}

async function getClient() {
  if (!supabaseReady || !supabaseUrl || !supabaseAnonKey) return null;
  if (!client) client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
}

async function ensureAdminSession() {
  const sb = await getClient();
  if (!sb) return null;
  const { data: sessionData } = await sb.auth.getSession();
  if (sessionData.session) return sb;
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
  return await sb.from(TABLE)
    .select('id,path,kind,title,caption,sort_order,created_at')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
}

function mediaStatus(text, error = false) {
  const el = document.getElementById('ipaMediaStatus');
  if (!el) return;
  el.textContent = text;
  el.style.color = error ? '#e07a5f' : '';
}

function renderAdminList(items) {
  const list = document.getElementById('ipaMediaList');
  const count = document.getElementById('ipaMediaCount');
  if (!list) return;
  if (count) count.textContent = `${items.length} ${items.length === 1 ? 'file' : 'files'}`;
  if (!items.length) {
    list.innerHTML = '<p class="ipa-media-empty">No media uploaded yet.</p>';
    return;
  }

  list.innerHTML = items.map((item) => {
    const url = publicUrl(item.path);
    const preview = item.kind === 'video'
      ? `<video src="${escapeHtml(url)}" muted controls preload="metadata"></video>`
      : `<img src="${escapeHtml(url)}" alt="${escapeHtml(item.title || 'Church photo')}">`;
    return `
      <article class="ipa-media-item" data-id="${Number(item.id)}" data-path="${escapeHtml(item.path)}">
        <div class="ipa-media-preview">${preview}</div>
        <div>
          <span class="ipa-media-kind">${item.kind === 'video' ? 'VIDEO' : 'IMAGE'}</span>
          <input class="ipa-media-title" value="${escapeHtml(item.title || '')}" placeholder="Title">
          <textarea class="ipa-media-caption" rows="2" placeholder="Caption shown below the photo">${escapeHtml(item.caption || '')}</textarea>
          <div class="ipa-media-actions">
            <button type="button" class="admin-save ipa-media-save">Save details</button>
            <button type="button" class="admin-small-btn ipa-media-delete">Remove</button>
            <span class="admin-msg ipa-media-row-msg"></span>
          </div>
        </div>
      </article>`;
  }).join('');

  list.querySelectorAll('.ipa-media-save').forEach((button) => {
    button.addEventListener('click', async () => {
      const item = button.closest('.ipa-media-item');
      const msg = item.querySelector('.ipa-media-row-msg');
      msg.textContent = 'Saving…';
      try {
        const sb = await ensureAdminSession();
        const { error } = await sb.from(TABLE).update({
          title: item.querySelector('.ipa-media-title').value.trim(),
          caption: item.querySelector('.ipa-media-caption').value.trim(),
        }).eq('id', Number(item.dataset.id));
        if (error) throw error;
        msg.textContent = 'Saved ✓';
        msg.className = 'admin-msg ipa-media-row-msg ok';
      } catch (err) {
        console.error(err);
        msg.textContent = err.message || 'Could not save';
        msg.className = 'admin-msg ipa-media-row-msg err';
      }
    });
  });

  list.querySelectorAll('.ipa-media-delete').forEach((button) => {
    button.addEventListener('click', async () => {
      const item = button.closest('.ipa-media-item');
      if (!confirm('Remove this media file from the website?')) return;
      const msg = item.querySelector('.ipa-media-row-msg');
      msg.textContent = 'Removing…';
      try {
        const sb = await ensureAdminSession();
        const { error: storageError } = await sb.storage.from(BUCKET).remove([item.dataset.path]);
        if (storageError) throw storageError;
        const { error: rowError } = await sb.from(TABLE).delete().eq('id', Number(item.dataset.id));
        if (rowError) throw rowError;
        await refreshAdminMedia();
      } catch (err) {
        console.error(err);
        msg.textContent = err.message || 'Could not remove';
        msg.className = 'admin-msg ipa-media-row-msg err';
      }
    });
  });
}

async function refreshAdminMedia() {
  const result = await listMedia();
  if (result.error) {
    renderAdminList([]);
    mediaStatus(`Could not load media: ${result.error.message}`, true);
    return;
  }
  renderAdminList(result.data || []);
}

async function uploadAdminMedia() {
  const input = document.getElementById('ipaMediaFiles');
  if (!input?.files?.length) {
    mediaStatus('Choose one or more images or videos first.', true);
    return;
  }

  try {
    const sb = await ensureAdminSession();
    const files = Array.from(input.files);
    let uploaded = 0;
    for (const file of files) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) continue;
      if (file.size > 50 * 1024 * 1024) {
        mediaStatus(`${file.name} is larger than 50 MB and was skipped.`, true);
        continue;
      }
      const kind = file.type.startsWith('video/') ? 'video' : 'image';
      const ext = (file.name.match(/\.([^.]+)$/)?.[1] || (kind === 'video' ? 'mp4' : 'jpg')).toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `${kind === 'video' ? 'videos' : 'images'}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      mediaStatus(`Uploading ${file.name}…`);
      const { error: uploadError } = await sb.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { error: rowError } = await sb.from(TABLE).insert({
        path,
        kind,
        title: titleFromName(file.name),
        caption: '',
        sort_order: uploaded + 1,
      });
      if (rowError) {
        await sb.storage.from(BUCKET).remove([path]);
        throw rowError;
      }
      uploaded += 1;
    }
    input.value = '';
    mediaStatus(`${uploaded} file${uploaded === 1 ? '' : 's'} uploaded ✓`);
    await refreshAdminMedia();
  } catch (err) {
    console.error(err);
    mediaStatus(err.message || 'Upload failed', true);
  }
}

async function setupAdmin() {
  const shell = document.querySelector('#panel .admin-shell');
  if (!shell || document.getElementById('ipaMediaManager')) return;
  ensureStyle();
  const card = document.createElement('section');
  card.id = 'ipaMediaManager';
  card.className = 'ipa-media-card';
  card.innerHTML = `
    <div class="ipa-media-head">
      <div><h2 style="margin-bottom:.15rem;">Images &amp; videos</h2><p class="ipa-media-help">Add or remove gallery photos and worship videos. Uploaded files are stored in Supabase Storage.</p></div>
      <span class="ipa-media-count" id="ipaMediaCount">0 files</span>
    </div>
    <div class="ipa-upload">
      <input id="ipaMediaFiles" type="file" accept="image/*,video/mp4,video/webm,video/quicktime" multiple>
      <button type="button" class="admin-save" id="ipaUploadMedia">Upload selected</button>
      <span class="admin-msg" id="ipaMediaStatus">Connecting to media library…</span>
    </div>
    <div id="ipaMediaList" class="ipa-media-list"><p class="ipa-media-empty">Loading…</p></div>`;
  shell.insertBefore(card, shell.firstElementChild?.nextSibling || shell.firstChild);
  document.getElementById('ipaUploadMedia').addEventListener('click', uploadAdminMedia);
  try {
    await ensureAdminSession();
    mediaStatus('Connected');
    await refreshAdminMedia();
  } catch (err) {
    mediaStatus(err.message || 'Media library unavailable. Run the Supabase media SQL setup first.', true);
    renderAdminList([]);
  }
}

function renderPublicMedia(items) {
  const images = (items || []).filter((x) => x.kind === 'image');
  const videos = (items || []).filter((x) => x.kind === 'video');
  const track = document.getElementById('cfTrack');
  if (track && images.length) {
    track.innerHTML = images.map((item, i) => `
      <div class="cf-slide" data-index="${i}">
        <div class="cf-media"><img src="${escapeHtml(publicUrl(item.path))}" alt="${escapeHtml(item.title || 'IPA Church Elappara photo')}"></div>
        <p class="cf-caption">${escapeHtml(item.caption || item.title || 'IPA Church Elappara')}</p>
      </div>`).join('');

    const controls = document.querySelector('.cf-controls');
    if (controls) {
      controls.innerHTML = '<button class="cf-arrow" id="cfPrev" aria-label="Previous photo">&lsaquo;</button><div class="cf-dots" id="cfDots"></div><button class="cf-arrow" id="cfNext" aria-label="Next photo">&rsaquo;</button>';
      initPublicCoverflow();
    }
  }

  if (videos.length) {
    const video = document.querySelector('.watch-frame video');
    if (video) {
      video.src = publicUrl(videos[0].path);
      video.load();
    }
  }
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
  let current = 0;
  let timer = null;
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
  prev.onclick = () => go(current - 1);
  next.onclick = () => go(current + 1);
  slides.forEach((slide, i) => slide.addEventListener('click', () => i !== current && go(i)));
  if (!reduceMotion) {
    const stop = () => { if (timer) clearInterval(timer); timer = null; };
    const start = () => { stop(); timer = setInterval(() => go(current + 1), 4800); };
    stage.addEventListener('mouseenter', stop);
    stage.addEventListener('mouseleave', start);
    stage.addEventListener('touchstart', stop, { passive: true });
    stage.addEventListener('touchend', start, { passive: true });
    start();
  }
  render();
}

async function loadPublicMedia() {
  const sb = await getClient();
  if (!sb) return;
  const { data, error } = await sb.from(TABLE)
    .select('id,path,kind,title,caption,sort_order,created_at')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) {
    console.warn('IPA public media load skipped:', error);
    return;
  }
  if (data?.length) renderPublicMedia(data);
}

window.IPAMediaManager = { setupAdmin, loadPublicMedia };

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('panel')) setupAdmin();
    else loadPublicMedia();
  });
} else {
  if (document.getElementById('panel')) setupAdmin();
  else loadPublicMedia();
}
