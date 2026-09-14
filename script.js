/* ============================================================
   IPA Church Elappara — public site script
   ============================================================ */
import { supabaseUrl, supabaseAnonKey, supabaseReady, SUPABASE_SDK } from './supabase-config.js';

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------------- theme toggle ---------------- */
(function () {
  const root = document.documentElement;
  const stored = localStorage.getItem('ipa-theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const initial = stored || (prefersLight ? 'light' : 'dark');
  if (initial === 'light') root.setAttribute('data-theme', 'light');

  document.querySelectorAll('.theme-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const isLight = root.getAttribute('data-theme') === 'light';
      if (isLight) {
        root.removeAttribute('data-theme');
        localStorage.setItem('ipa-theme', 'dark');
      } else {
        root.setAttribute('data-theme', 'light');
        localStorage.setItem('ipa-theme', 'light');
      }
    });
  });
})();

/* ---------------- nav scroll state + mobile menu ---------------- */
const nav = document.getElementById('siteNav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 30);
}, { passive: true });

const menuBtn = document.getElementById('menuBtn');
const navLinks = document.getElementById('navLinks');
menuBtn.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', open);
});
navLinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
  navLinks.classList.remove('open');
  menuBtn.setAttribute('aria-expanded', 'false');
}));

/* ---------------- scroll reveal ---------------- */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

/* ---------------- hero drifting light particles ---------------- */
(function () {
  const wrap = document.getElementById('heroParticles');
  if (!wrap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const count = 22;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    const size = 2 + Math.random() * 3;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.left = `${Math.random() * 100}%`;
    p.style.setProperty('--dx', `${(Math.random() - 0.5) * 60}px`);
    p.style.animationDuration = `${9 + Math.random() * 10}s`;
    p.style.animationDelay = `${Math.random() * 10}s`;
    wrap.appendChild(p);
  }
})();

/* ---------------- coverflow gallery ---------------- */
(function () {
  const track = document.getElementById('cfTrack');
  if (!track) return;
  const slides = Array.from(track.querySelectorAll('.cf-slide'));
  const dotsWrap = document.getElementById('cfDots');
  const prevBtn = document.getElementById('cfPrev');
  const nextBtn = document.getElementById('cfNext');
  const stage = document.getElementById('cfStage');
  const total = slides.length;
  let current = 0;
  let autoplayTimer = null;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'cf-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', 'Go to photo ' + (i + 1));
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

  function shortestOffset(i, cur) {
    let raw = i - cur;
    if (raw > total / 2) raw -= total;
    if (raw < -total / 2) raw += total;
    return raw;
  }

  function render() {
    slides.forEach((slide, i) => {
      const offset = shortestOffset(i, current);
      const abs = Math.abs(offset);
      const x = offset * 46;
      const z = -abs * 210;
      const rot = offset * -32;
      const scale = 1 - abs * 0.14;
      const opacity = abs > 2 ? 0 : 1 - abs * 0.32;
      slide.style.transform = `translateX(${x}%) translateZ(${z}px) rotateY(${rot}deg) scale(${scale})`;
      slide.style.opacity = opacity;
      slide.style.zIndex = 10 - abs;
      slide.style.pointerEvents = abs > 2 ? 'none' : 'auto';
      slide.classList.toggle('is-active', offset === 0);
    });
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  function goTo(i) { current = ((i % total) + total) % total; render(); }

  slides.forEach((slide, i) => slide.addEventListener('click', () => { if (i !== current) goTo(i); }));
  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));

  document.addEventListener('keydown', (e) => {
    const r = stage.getBoundingClientRect();
    const inView = r.top < window.innerHeight && r.bottom > 0;
    if (!inView) return;
    if (e.key === 'ArrowLeft') goTo(current - 1);
    if (e.key === 'ArrowRight') goTo(current + 1);
  });

  let touchX = null;
  stage.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) goTo(current + (dx < 0 ? 1 : -1));
    touchX = null;
  }, { passive: true });

  function startAutoplay() { if (reduceMotion) return; stopAutoplay(); autoplayTimer = setInterval(() => goTo(current + 1), 4800); }
  function stopAutoplay() { if (autoplayTimer) clearInterval(autoplayTimer); }

  stage.addEventListener('mouseenter', stopAutoplay);
  stage.addEventListener('mouseleave', startAutoplay);
  stage.addEventListener('touchstart', stopAutoplay, { passive: true });

  render();
  startAutoplay();
})();

/* ---------------- live content from Supabase ---------------- */
function renderContent(data) {
  if (!data) return;

  if (data.announcement && data.announcement.enabled && data.announcement.text) {
    const bar = document.getElementById('announceBar');
    document.getElementById('announceText').textContent = data.announcement.text;
    bar.classList.add('show');
  }

  if (data.hero) {
    if (data.hero.eyebrow) document.getElementById('heroEyebrow').textContent = data.hero.eyebrow;
    if (data.hero.headline) document.getElementById('heroHeadline').textContent = data.hero.headline;
    if (data.hero.lead) document.getElementById('heroLead').textContent = data.hero.lead;
  }

  if (Array.isArray(data.serviceTimes)) {
    const wrap = document.getElementById('serviceTimesList');
    wrap.innerHTML = '';
    data.serviceTimes.forEach((s) => {
      const row = document.createElement('div');
      row.className = 'times-row';
      row.innerHTML = `<span class="name"></span><span class="time"></span>`;
      row.querySelector('.name').textContent = s.label || '';
      row.querySelector('.time').textContent = s.time || '';
      wrap.appendChild(row);
    });
    if (data.serviceTimes[0]) {
      document.getElementById('heroTimePill').textContent = data.serviceTimes[0].time || '';
    }
  }

  if (Array.isArray(data.languages)) {
    const tagWrap = document.getElementById('langTags');
    tagWrap.innerHTML = '';
    data.languages.forEach((l) => {
      const t = document.createElement('span');
      t.className = 'tag';
      t.textContent = l;
      tagWrap.appendChild(t);
    });
    document.getElementById('heroLangPill').textContent = data.languages.join(' & ');
  }

  if (Array.isArray(data.ministries)) {
    const cards = document.querySelectorAll('.ministry-card');
    data.ministries.forEach((m, i) => {
      const card = cards[i];
      if (!card) return;
      const tagEl = card.querySelector('span');
      const titleEl = card.querySelector('h3');
      const descEl = card.querySelector('p');
      if (tagEl) tagEl.textContent = m.tag || '';
      if (titleEl) titleEl.textContent = m.title || '';
      if (descEl) descEl.textContent = m.desc || '';
    });
  }

  if (data.pastor) {
    const nameEl = document.getElementById('pastorName');
    const roleEl = document.getElementById('pastorRole');
    const bioEl = document.getElementById('pastorBio');
    const noteEl = document.getElementById('pastorNote');
    if (data.pastor.name) nameEl.textContent = data.pastor.name;
    if (data.pastor.role) roleEl.textContent = data.pastor.role;
    if (data.pastor.bio) bioEl.textContent = data.pastor.bio;
    noteEl.style.display = data.pastor.confirmed ? 'none' : 'block';
  }

  if (data.contact) {
    if (Array.isArray(data.contact.phones)) {
      const list = document.getElementById('phoneList');
      list.innerHTML = '';
      data.contact.phones.forEach((p) => {
        const a = document.createElement('a');
        const digits = p.replace(/[^\d+]/g, '');
        a.href = `tel:${digits}`;
        a.textContent = p;
        list.appendChild(a);
      });
      const footerList = document.getElementById('footerPhoneList');
      if (footerList) {
        footerList.innerHTML = '';
        data.contact.phones.forEach((p) => {
          const li = document.createElement('li');
          const a = document.createElement('a');
          const digits = p.replace(/[^\d+]/g, '');
          a.href = `tel:${digits}`;
          a.textContent = p;
          li.appendChild(a);
          footerList.appendChild(li);
        });
      }
    }
    if (data.contact.address) document.getElementById('churchAddress').textContent = data.contact.address;
    if (data.contact.mapQuery) {
      document.getElementById('mapFrame').src =
        `https://www.google.com/maps?q=${encodeURIComponent(data.contact.mapQuery)}&output=embed`;
    }
    const socialRow = document.getElementById('socialRow');
    if (socialRow) {
      socialRow.innerHTML = '';
      if (data.contact.instagram) socialRow.appendChild(makeSocial('Instagram', data.contact.instagram));
      if (data.contact.youtube) socialRow.appendChild(makeSocial('YouTube', data.contact.youtube));
      if (data.contact.email) socialRow.appendChild(makeSocial('Email', `mailto:${data.contact.email}`));
    }
  }
}

function makeSocial(label, href) {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = label;
  if (href.startsWith('http')) { a.target = '_blank'; a.rel = 'noopener'; }
  return a;
}

(async function loadContent() {
  if (!supabaseReady) return; // site already shows sensible defaults baked into the HTML
  try {
    const { createClient } = await import(`https://esm.sh/@supabase/supabase-js@${SUPABASE_SDK}`);
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase.from('site_content').select('data').eq('id', 1).single();
    if (!error && data) renderContent(data.data);

    // Live updates: if the admin panel saves a change while someone is on
    // the page, it appears without a refresh.
    supabase
      .channel('site_content_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_content' }, (payload) => {
        if (payload.new && payload.new.data) renderContent(payload.new.data);
      })
      .subscribe();
  } catch (err) {
    console.warn('Supabase content load skipped:', err);
  }
})();

/* ---------------- ultra cinematic 3D layer ---------------- */
import('./ultra3d.js').catch((err) => console.warn('IPA 3D layer skipped:', err));
