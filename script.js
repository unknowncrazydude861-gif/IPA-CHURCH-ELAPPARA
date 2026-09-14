/* ============================================================
   IPA Church Elappara — public site script
   ============================================================ */
import { supabaseUrl, supabaseAnonKey, supabaseReady, SUPABASE_SDK } from './supabase-config.js';
import { mountInstagramBrandOrbs } from './instagram-brand-orbs.js';

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
      mountInstagramBrandOrbs();
    }
  }
}

function makeSocial(label, href) {
  const a = document.createElement('a');
  a.href = href;
  a.className = label === 'YouTube' ? 'social-3d social-youtube-3d' : 'social-3d';
  if (label === 'Instagram') {
    a.textContent = 'Instagram';
    a.dataset.instagramBrandOrbsTarget = 'true';
  } else if (label === 'YouTube') {
    a.innerHTML = `
      <span class="yt3d-shell" aria-hidden="true">
        <span class="yt3d-glass"></span>
        <span class="yt3d-word">You</span>
        <span class="yt3d-play"></span>
      </span>
      <span class="social-3d-label">YouTube</span>`;
  } else {
    a.textContent = label;
  }
  if (href.startsWith('http')) { a.target = '_blank'; a.rel = 'noopener'; }
  return a;
}

(async function loadContent() {
  if (!supabaseReady) {
    mountInstagramBrandOrbs();
    return;
  }
  try {
    const { createClient } = await import(`https://esm.sh/@supabase/supabase-js@${SUPABASE_SDK}`);
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase.from('site_content').select('data').eq('id', 1).single();
    if (!error && data) renderContent(data.data);
    mountInstagramBrandOrbs();

    supabase
      .channel('site_content_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_content' }, (payload) => {
        if (payload.new && payload.new.data) renderContent(payload.new.data);
      })
      .subscribe();
  } catch (err) {
    console.warn('Supabase content load skipped:', err);
    mountInstagramBrandOrbs();
  }
})();

/* ---------------- 3D button + YouTube UI layer ---------------- */
(function mount3DUI() {
  const styleId = 'ipa-3d-ui-style';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    :root{--ipa-red:#ff2028;--ipa-red-dark:#8f090d;--ipa-edge:#ff4148;--ipa-black:#030303;}

    /* tactile 3D treatment for every real button and primary CTA */
    button:not(.menu-btn),
    .btn,
    nav.links a.cta,
    nav.links a[href="admin.html"],
    .social-3d{
      position:relative;
      transform:translateY(0) translateZ(0);
      transition:transform .18s cubic-bezier(.2,.75,.2,1), box-shadow .18s ease, filter .18s ease, border-color .18s ease;
      box-shadow:
        0 1px 0 rgba(255,255,255,.16) inset,
        0 -1px 0 rgba(0,0,0,.34) inset,
        0 7px 0 rgba(0,0,0,.26),
        0 14px 28px rgba(0,0,0,.28);
      transform-style:preserve-3d;
      will-change:transform;
    }
    button:not(.menu-btn):hover,
    .btn:hover,
    nav.links a.cta:hover,
    nav.links a[href="admin.html"]:hover,
    .social-3d:hover{
      transform:translateY(-3px) perspective(700px) rotateX(3deg);
      box-shadow:
        0 1px 0 rgba(255,255,255,.22) inset,
        0 -1px 0 rgba(0,0,0,.34) inset,
        0 10px 0 rgba(0,0,0,.26),
        0 22px 34px rgba(0,0,0,.36);
      filter:brightness(1.05);
    }
    button:not(.menu-btn):active,
    .btn:active,
    nav.links a.cta:active,
    nav.links a[href="admin.html"]:active,
    .social-3d:active{
      transform:translateY(5px) perspective(700px) rotateX(-2deg);
      box-shadow:
        0 1px 0 rgba(255,255,255,.12) inset,
        0 -1px 0 rgba(0,0,0,.38) inset,
        0 2px 0 rgba(0,0,0,.28),
        0 6px 12px rgba(0,0,0,.26);
    }

    .theme-toggle{
      overflow:hidden;
      background:linear-gradient(145deg, color-mix(in srgb,var(--bg-elev) 94%,white 6%), var(--bg-elev-2));
      border-color:var(--line-strong);
    }

    .cf-arrow{
      min-width:42px;
      min-height:42px;
      border-radius:10px!important;
      background:linear-gradient(145deg, rgba(255,255,255,.09), rgba(255,255,255,.025));
      border:1px solid var(--line-strong)!important;
      backdrop-filter:blur(10px);
    }
    .cf-dot{
      transform:translateZ(0);
      transition:transform .18s ease, width .2s ease, box-shadow .18s ease, background .18s ease;
    }
    .cf-dot:hover{transform:scale(1.25) translateZ(6px);box-shadow:0 5px 14px rgba(0,0,0,.3);}
    .cf-dot.active{box-shadow:0 4px 12px rgba(0,0,0,.28),0 0 16px rgba(var(--gold-rgb),.24);}

    /* YouTube button styled like the supplied glossy black/red reference */
    .social-youtube-3d{
      display:inline-flex!important;
      align-items:center;
      gap:.7rem;
      padding:.34rem .65rem .34rem .4rem!important;
      min-height:58px;
      border-radius:18px!important;
      border:1px solid rgba(255,43,51,.72)!important;
      background:
        linear-gradient(160deg, rgba(255,255,255,.16) 0%, rgba(255,255,255,.05) 20%, rgba(0,0,0,.96) 48%, rgba(3,3,3,.99) 100%)!important;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.16),
        inset 0 -10px 24px rgba(0,0,0,.58),
        0 0 0 1px rgba(255,0,10,.08),
        0 10px 0 #420407,
        0 18px 30px rgba(0,0,0,.42),
        0 0 22px rgba(255,24,32,.18)!important;
      perspective:900px;
      transform-style:preserve-3d;
    }
    .social-youtube-3d::before{
      content:"";
      position:absolute;
      inset:4px;
      border-radius:14px;
      border-top:1px solid rgba(255,255,255,.18);
      pointer-events:none;
    }
    .social-youtube-3d::after{
      content:"";
      position:absolute;
      width:82%;
      height:22px;
      left:9%;
      top:-6px;
      border-radius:50%;
      background:radial-gradient(ellipse at center, rgba(255,255,255,.14), transparent 68%);
      transform:rotateX(72deg) translateZ(18px);
      pointer-events:none;
    }
    .yt3d-shell{
      position:relative;
      display:block;
      width:78px;
      height:46px;
      border-radius:14px;
      background:linear-gradient(155deg,#3a3a3e 0%,#111113 31%,#020202 67%,#000 100%);
      border:1px solid rgba(255,47,55,.72);
      box-shadow:
        inset 0 7px 11px rgba(255,255,255,.12),
        inset 0 -10px 14px rgba(0,0,0,.72),
        0 0 11px rgba(255,21,30,.17),
        0 4px 0 #5e070a;
      transform:translateZ(12px) rotateX(2deg);
      overflow:hidden;
    }
    .yt3d-glass{
      position:absolute;
      inset:3px 6px 26px 6px;
      border-radius:10px 10px 50% 50%;
      background:linear-gradient(180deg,rgba(255,255,255,.22),rgba(255,255,255,0));
      opacity:.65;
    }
    .yt3d-word{
      position:absolute;
      left:11px;
      top:8px;
      font-family:Inter,Arial,sans-serif;
      font-size:20px;
      line-height:1;
      font-weight:500;
      letter-spacing:-.06em;
      color:#080808;
      -webkit-text-stroke:1px rgba(255,255,255,.16);
      text-shadow:1px 1px 0 rgba(255,255,255,.08),0 0 7px rgba(255,35,42,.2);
    }
    .yt3d-play{
      position:absolute;
      right:10px;
      top:11px;
      width:0;
      height:0;
      border-top:12px solid transparent;
      border-bottom:12px solid transparent;
      border-left:19px solid var(--ipa-red);
      filter:drop-shadow(0 0 4px rgba(255,32,40,.75));
      transform:translateZ(5px);
    }
    .yt3d-play::after{
      content:"";
      position:absolute;
      left:-15px;
      top:-7px;
      width:2px;
      height:14px;
      background:#fff;
      opacity:.45;
      box-shadow:0 0 7px rgba(255,40,48,.75);
    }
    .social-3d-label{font-size:.82rem;letter-spacing:.02em;color:var(--ink);font-weight:600;}

    [data-theme="light"] .social-youtube-3d{
      background:linear-gradient(160deg,rgba(255,255,255,.94),rgba(35,35,36,.88) 45%,rgba(0,0,0,.97))!important;
      color:#fff;
    }

    @media (max-width:620px){
      .social-youtube-3d{min-height:54px;padding-right:.55rem!important;}
      .yt3d-shell{width:72px;height:43px;}
      .social-3d-label{display:none;}
    }

    @media (prefers-reduced-motion:reduce){
      button:not(.menu-btn),.btn,nav.links a.cta,nav.links a[href="admin.html"],.social-3d{transition:none!important;}
    }
  `;
  document.head.appendChild(style);

  const decorate = () => {
    document.querySelectorAll('#socialRow a').forEach((a) => {
      if (!a.classList.contains('social-3d')) a.classList.add('social-3d');
      if ((a.textContent || '').trim() === 'YouTube' && !a.querySelector('.yt3d-shell')) {
        a.classList.add('social-youtube-3d');
        a.innerHTML = `
          <span class="yt3d-shell" aria-hidden="true">
            <span class="yt3d-glass"></span>
            <span class="yt3d-word">You</span>
            <span class="yt3d-play"></span>
          </span>
          <span class="social-3d-label">YouTube</span>`;
      }
    });
  };

  decorate();
  const observer = new MutationObserver(decorate);
  const socialRow = document.getElementById('socialRow');
  if (socialRow) observer.observe(socialRow, { childList: true, subtree: true });
})();

/* ---------------- ultra cinematic 3D layer ---------------- */
import('./ultra3d.js').catch((err) => console.warn('IPA 3D layer skipped:', err));
