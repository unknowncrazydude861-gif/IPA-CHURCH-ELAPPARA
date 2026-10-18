/* ============================================================
   IPA Church Elappara — public Branches page script
   ============================================================ */
import { supabaseUrl, supabaseAnonKey, supabaseReady, SUPABASE_SDK } from './supabase-config.js';

document.getElementById('year').textContent = new Date().getFullYear();

/* theme toggle (same behaviour as the main site) */
(function () {
  const root = document.documentElement;
  const stored = localStorage.getItem('ipa-theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const initial = stored || (prefersLight ? 'light' : 'dark');
  if (initial === 'light') root.setAttribute('data-theme', 'light');
  document.querySelectorAll('.theme-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const isLight = root.getAttribute('data-theme') === 'light';
      if (isLight) { root.removeAttribute('data-theme'); localStorage.setItem('ipa-theme', 'dark'); }
      else { root.setAttribute('data-theme', 'light'); localStorage.setItem('ipa-theme', 'light'); }
    });
  });
})();

/* nav scroll + mobile menu */
const nav = document.getElementById('siteNav');
window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 30), { passive: true });
const menuBtn = document.getElementById('menuBtn');
const navLinks = document.getElementById('navLinks');
menuBtn.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', open);
});

/* render a branch card */
function branchCard(b) {
  const card = document.createElement('article');
  card.className = 'branch-card';

  const photoWrap = document.createElement('div');
  photoWrap.className = 'branch-photo';
  if (b.pastor_photo_url) {
    const img = document.createElement('img');
    img.src = b.pastor_photo_url;
    img.alt = b.pastor_name ? `Pastor ${b.pastor_name}, ${b.name}` : b.name || 'Church branch';
    img.loading = 'lazy';
    img.onerror = () => { img.remove(); photoWrap.appendChild(fallbackEl()); };
    photoWrap.appendChild(img);
  } else {
    photoWrap.appendChild(fallbackEl());
  }
  card.appendChild(photoWrap);

  const body = document.createElement('div');
  body.className = 'branch-body';

  const name = document.createElement('div');
  name.className = 'branch-name';
  name.textContent = b.name || 'Branch';
  body.appendChild(name);

  if (b.pastor_name) {
    const pn = document.createElement('div');
    pn.className = 'branch-pastor-name';
    pn.textContent = b.pastor_name;
    body.appendChild(pn);
  }
  if (b.pastor_role) {
    const pr = document.createElement('div');
    pr.className = 'branch-pastor-role';
    pr.textContent = b.pastor_role;
    body.appendChild(pr);
  }
  if (b.pastor_bio) {
    const bio = document.createElement('p');
    bio.className = 'branch-bio';
    bio.textContent = b.pastor_bio;
    body.appendChild(bio);
  }
  if (b.address || b.phone) {
    const meta = document.createElement('div');
    meta.className = 'branch-meta';
    if (b.address) {
      const a = document.createElement('span');
      a.textContent = b.address;
      meta.appendChild(a);
    }
    if (b.phone) {
      const p = document.createElement('a');
      p.href = `tel:${b.phone.replace(/[^\d+]/g, '')}`;
      p.textContent = b.phone;
      meta.appendChild(p);
    }
    body.appendChild(meta);
  }

  card.appendChild(body);
  return card;
}

function fallbackEl() {
  const d = document.createElement('div');
  d.className = 'ph-fallback';
  d.textContent = 'Photo coming soon';
  return d;
}

(async function loadBranches() {
  const grid = document.getElementById('branchesGrid');
  const loadingEl = document.getElementById('branchesLoading');
  const emptyEl = document.getElementById('branchesEmpty');

  if (!supabaseReady) { loadingEl.textContent = 'Branches are not available right now.'; return; }

  try {
    const { createClient } = await import(`https://esm.sh/@supabase/supabase-js@${SUPABASE_SDK}`);
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;

    loadingEl.remove();
    if (!data || data.length === 0) {
      emptyEl.style.display = 'block';
      return;
    }
    data.forEach((b) => grid.appendChild(branchCard(b)));

    // Live updates: new/edited/removed branches reflect without a refresh.
    supabase
      .channel('branches_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'branches' }, () => {
        location.reload();
      })
      .subscribe();
  } catch (err) {
    console.error(err);
    loadingEl.textContent = 'Could not load branches right now — please try again later.';
  }
})();