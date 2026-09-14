/* ============================================================
   IPA Church Elappara — ULTRA 3D engine
   Three.js scene layered behind the existing website.
   ============================================================ */

(async function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.getElementById('ipa3dCanvas');
  if (!canvas) return;

  try {
    const THREE = await import('https://unpkg.com/three@0.160.0/build/three.module.js');

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x06070b, 0.015);

    const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 0.5, 11);

    const root = new THREE.Group();
    scene.add(root);

    // Ambient + directional lighting for a deep cinematic feel.
    scene.add(new THREE.AmbientLight(0x5b4b35, 1.2));
    const key = new THREE.PointLight(0xefc978, 28, 28, 2);
    key.position.set(3.5, 3.8, 5);
    scene.add(key);
    const fill = new THREE.PointLight(0x4fbcd4, 18, 24, 2);
    fill.position.set(-5, 0, 3);
    scene.add(fill);
    const rim = new THREE.PointLight(0x927cff, 16, 20, 2);
    rim.position.set(4, -3, -2);
    scene.add(rim);

    // Main luminous orb.
    const orb = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.35, 5),
      new THREE.MeshPhysicalMaterial({
        color: 0xd6b866,
        emissive: 0x5b3d0d,
        emissiveIntensity: 0.65,
        roughness: 0.22,
        metalness: 0.6,
        clearcoat: 1,
        clearcoatRoughness: 0.16,
        transmission: 0.04,
      })
    );
    root.add(orb);

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(1.7, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xefc978, transparent: true, opacity: 0.055, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    root.add(halo);

    // Rotating sacred-looking rings around the orb.
    const ringGroup = new THREE.Group();
    root.add(ringGroup);
    [2.0, 2.45, 2.9].forEach((radius, index) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, index === 1 ? 0.012 : 0.009, 12, 180),
        new THREE.MeshBasicMaterial({
          color: index === 1 ? 0xefc978 : (index === 2 ? 0x58bfd1 : 0xa582ff),
          transparent: true,
          opacity: index === 1 ? 0.68 : 0.32,
          blending: THREE.AdditiveBlending,
        })
      );
      ring.rotation.set(Math.PI * (0.18 + index * 0.21), index * 0.6, index * 0.24);
      ringGroup.add(ring);
    });

    // Orbiting photo cards: these use the site's existing local images.
    const photoPaths = [
      'images/hero-exterior.jpg',
      'images/congregation-gathered.jpg',
      'images/sunday-worship.jpg',
      'images/worship-hands.jpg',
      'images/praise-lifted.jpg',
      'images/beauty-of-holiness.jpg',
      'images/preacher.jpg',
      'images/welcome-service.jpg'
    ];
    const loader = new THREE.TextureLoader();
    const orbit = new THREE.Group();
    root.add(orbit);

    const photoCards = [];
    photoPaths.forEach((src, i) => {
      const texture = loader.load(src);
      texture.colorSpace = THREE.SRGBColorSpace;
      const card = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.PlaneGeometry(1.05, 0.7),
        new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true, opacity: 0.82 })
      );
      const frame = new THREE.Mesh(
        new THREE.PlaneGeometry(1.11, 0.76),
        new THREE.MeshBasicMaterial({ color: 0xefc978, transparent: true, opacity: 0.07, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
      );
      frame.position.z = -0.012;
      card.add(frame, body);
      card.userData.angle = (i / photoPaths.length) * Math.PI * 2;
      card.userData.radius = 3.65 + (i % 2) * 0.33;
      card.userData.speed = 0.055 + (i % 3) * 0.013;
      card.userData.phase = i * 0.7;
      orbit.add(card);
      photoCards.push(card);
    });

    // Dense particle field.
    const particleCount = 950;
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      const r = 7 + Math.random() * 18;
      const a = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 14;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(a) * r - 4;
      sizes[i] = 0.35 + Math.random() * 1.4;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xd7b55f,
      size: 0.035,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Mouse / touch parallax.
    let targetX = 0;
    let targetY = 0;
    let scrollTarget = 0;
    let smoothX = 0;
    let smoothY = 0;
    let smoothScroll = 0;

    const onPointer = (x, y) => {
      targetX = (x / window.innerWidth) * 2 - 1;
      targetY = -((y / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', (e) => onPointer(e.clientX, e.clientY), { passive: true });
    window.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      if (t) onPointer(t.clientX, t.clientY);
    }, { passive: true });
    window.addEventListener('scroll', () => {
      scrollTarget = Math.min(window.scrollY / Math.max(1, window.innerHeight), 8);
    }, { passive: true });

    const clock = new THREE.Clock();

    function resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    window.addEventListener('resize', resize);

    function animate() {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const dt = Math.min(clock.getDelta(), 0.04);
      void dt;

      smoothX += (targetX - smoothX) * 0.035;
      smoothY += (targetY - smoothY) * 0.035;
      smoothScroll += (scrollTarget - smoothScroll) * 0.035;

      root.rotation.y = smoothX * 0.13 + t * 0.045;
      root.rotation.x = smoothY * 0.08;
      root.position.y = Math.sin(t * 0.48) * 0.12 - smoothScroll * 0.15;

      orb.rotation.x = t * 0.19;
      orb.rotation.y = t * 0.26;
      orb.scale.setScalar(1 + Math.sin(t * 1.3) * 0.025);
      halo.scale.setScalar(1 + Math.sin(t * 1.1) * 0.045);

      ringGroup.rotation.x = t * 0.08;
      ringGroup.rotation.y = -t * 0.12;
      ringGroup.children.forEach((ring, i) => { ring.rotation.z += 0.0015 * (i + 1); });

      photoCards.forEach((card, i) => {
        const a = card.userData.angle + t * card.userData.speed;
        const r = card.userData.radius;
        card.position.set(Math.cos(a) * r, Math.sin(a * 1.3 + card.userData.phase) * 0.75, Math.sin(a) * r - 1.8);
        card.rotation.y = -a - Math.PI / 2;
        card.rotation.z = Math.sin(t * 0.6 + i) * 0.03;
        const s = 0.92 + Math.sin(t * 0.9 + i) * 0.06;
        card.scale.setScalar(s);
      });

      orbit.rotation.y = -t * 0.11;
      particles.rotation.y = t * 0.012;
      particles.rotation.x = Math.sin(t * 0.09) * 0.05;
      camera.position.x += ((smoothX * 0.75) - camera.position.x) * 0.018;
      camera.position.y += ((0.5 + smoothY * 0.38) - camera.position.y) * 0.018;
      camera.lookAt(0, 0, -0.8);

      renderer.render(scene, camera);
    }

    document.body.classList.add('ipa-3d-ready');
    animate();
  } catch (error) {
    console.warn('IPA 3D enhancement unavailable:', error);
  }
})();
