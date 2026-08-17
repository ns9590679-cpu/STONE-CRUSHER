/* ============================================================
   VAJRA — cinematic industrial site
   ============================================================ */

/* ---------------- LOADER ---------------- */
const loader = document.getElementById('loader');
const loaderFill = document.getElementById('loaderFill');
const loaderPct = document.getElementById('loaderPct');
let progress = 0;
const loaderInterval = setInterval(() => {
  progress += Math.random() * 12;
  if (progress >= 100) {
    progress = 100;
    clearInterval(loaderInterval);
    setTimeout(() => {
      loader.classList.add('done');
      document.body.style.overflow = 'auto';
      startEntranceAnimations();
    }, 350);
  }
  loaderFill.style.width = progress + '%';
  loaderPct.textContent = 'LOADING ASSETS — ' + Math.floor(progress) + '%';
}, 180);
document.body.style.overflow = 'hidden';

/* ---------------- NAV ---------------- */
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
});

/* ---------------- THREE.JS HERO ---------------- */
let heroScene, heroCamera, heroRenderer, rockGroup, dustPoints, shardGroup;
let heroActive = true;
const canvas = document.getElementById('heroCanvas');

function initHero() {
  if (!window.THREE) { canvas.style.display = 'none'; return; }
  try {
    heroScene = new THREE.Scene();
    heroCamera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
    heroCamera.position.set(0, 0.4, 9);

    heroRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    heroRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    heroRenderer.setSize(window.innerWidth, window.innerHeight);
    heroRenderer.setClearColor(0x000000, 0);

    // Lights — gold key light, cool rim light
    const key = new THREE.PointLight(0xf2c877, 26, 40, 2);
    key.position.set(4, 4, 6);
    heroScene.add(key);
    const rim = new THREE.PointLight(0x6a7cff, 10, 40, 2);
    rim.position.set(-6, -2, -4);
    heroScene.add(rim);
    const amb = new THREE.AmbientLight(0x33323a, 1.1);
    heroScene.add(amb);

    // Faceted "rock core" — icosahedron with displaced vertices for a crystalline rock look
    rockGroup = new THREE.Group();
    const geo = new THREE.IcosahedronGeometry(2.1, 2);
    const posAttr = geo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(posAttr, i);
      const n = v.clone().normalize();
      const disp = (Math.sin(v.x * 3) * Math.cos(v.y * 2.5) * 0.22) + (Math.random() - 0.5) * 0.14;
      v.addScaledVector(n, disp);
      posAttr.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x9a9ba1, metalness: 0.72, roughness: 0.38,
      emissive: 0x2a1c08, emissiveIntensity: 0.25, flatShading: true
    });
    const rock = new THREE.Mesh(geo, mat);
    rockGroup.add(rock);

    // thin gold wireframe overlay for premium faceted highlight
    const wireGeo = new THREE.IcosahedronGeometry(2.14, 1);
    const wireMat = new THREE.MeshBasicMaterial({ color: 0xf2c877, wireframe: true, transparent: true, opacity: 0.18 });
    rockGroup.add(new THREE.Mesh(wireGeo, wireMat));

    heroScene.add(rockGroup);

    // Shards — small fragments orbiting, representing crushed output
    shardGroup = new THREE.Group();
    const shardGeo = new THREE.TetrahedronGeometry(0.16, 0);
    const shardMat = new THREE.MeshStandardMaterial({ color: 0xc7c9cf, metalness: 0.6, roughness: 0.4, emissive: 0x1a1206, emissiveIntensity: 0.4 });
    for (let i = 0; i < 40; i++) {
      const m = new THREE.Mesh(shardGeo, shardMat);
      const r = 3.2 + Math.random() * 2.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      m.position.set(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta) * 0.6, r * Math.cos(phi));
      m.userData.speed = 0.15 + Math.random() * 0.4;
      m.userData.radius = r;
      m.userData.theta = theta;
      m.userData.phi = phi;
      m.scale.setScalar(0.6 + Math.random());
      shardGroup.add(m);
    }
    heroScene.add(shardGroup);

    // Dust particle field
    const dustCount = window.innerWidth < 760 ? 500 : 1400;
    const dustGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 9;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const dustMat = new THREE.PointsMaterial({ color: 0xd7b876, size: 0.018, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
    dustPoints = new THREE.Points(dustGeo, dustMat);
    heroScene.add(dustPoints);

    animateHero();
  } catch (e) {
    console.warn('Hero WebGL unavailable, falling back to static hero.', e);
    canvas.style.display = 'none';
  }
}

let mouseX = 0, mouseY = 0;
window.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth - 0.5);
  mouseY = (e.clientY / window.innerHeight - 0.5);
});

const clock = new THREE.Clock ? new THREE.Clock() : null;
function animateHero() {
  if (!heroActive) return;
  requestAnimationFrame(animateHero);
  const t = clock ? clock.getElapsedTime() : performance.now() / 1000;

  if (rockGroup) {
    rockGroup.rotation.y = t * 0.14 + mouseX * 0.5;
    rockGroup.rotation.x = Math.sin(t * 0.2) * 0.08 + mouseY * 0.3;
  }
  if (shardGroup) {
    shardGroup.rotation.y = -t * 0.06;
    shardGroup.children.forEach((m, i) => {
      m.rotation.x += 0.004 * (i % 3 + 1);
      m.rotation.y += 0.006;
    });
  }
  if (dustPoints) {
    dustPoints.rotation.y = t * 0.015;
    const arr = dustPoints.geometry.attributes.position.array;
    for (let i = 1; i < arr.length; i += 3) {
      arr[i] += 0.0018;
      if (arr[i] > 4.6) arr[i] = -4.6;
    }
    dustPoints.geometry.attributes.position.needsUpdate = true;
  }
  if (heroCamera) {
    heroCamera.position.x += (mouseX * 1.1 - heroCamera.position.x) * 0.02;
    heroCamera.position.y += (0.4 - mouseY * 0.6 - heroCamera.position.y) * 0.02;
    heroCamera.lookAt(0, 0, 0);
  }
  if (heroRenderer) heroRenderer.render(heroScene, heroCamera);
}

window.addEventListener('resize', () => {
  if (!heroRenderer || !heroCamera) return;
  heroCamera.aspect = window.innerWidth / window.innerHeight;
  heroCamera.updateProjectionMatrix();
  heroRenderer.setSize(window.innerWidth, window.innerHeight);
});

initHero();

// Pause hero render loop when hero is off-screen (perf)
if ('IntersectionObserver' in window) {
  new IntersectionObserver((entries) => {
    entries.forEach(en => {
      heroActive = en.isIntersecting;
      if (heroActive) animateHero();
    });
  }, { threshold: 0.01 }).observe(document.getElementById('hero'));
}

/* ---------------- ENTRANCE ANIMATIONS ---------------- */
function startEntranceAnimations() {
  if (!window.gsap) return;
  gsap.registerPlugin(ScrollTrigger);

  gsap.to('.hero-tag', { opacity: 1, duration: .8, delay: .1 });
  gsap.to('.hero-title .line span', {
    y: 0, duration: 1.1, ease: 'power4.out', stagger: 0.12, delay: 0.15
  });
  gsap.fromTo('.hero-desc', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1, delay: 0.7 });
  gsap.fromTo('.hero-ctas', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1, delay: 0.9 });
  gsap.fromTo('.hero-stats', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1, delay: 1.05 });
  gsap.fromTo('.scroll-cue', { opacity: 0 }, { opacity: 1, duration: 1, delay: 1.2 });

  // generic scroll reveals
  document.querySelectorAll('.reveal').forEach((el) => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%' }
    });
  });

  // timeline active dot as it scrolls
  const tlItems = gsap.utils.toArray('.tl-item');
  tlItems.forEach((item) => {
    ScrollTrigger.create({
      trigger: item, start: 'top 60%', end: 'bottom 40%',
      onEnter: () => item.classList.add('active'),
      onEnterBack: () => item.classList.add('active'),
    });
  });

  // PROCESS — pinned horizontal scroll
  const track = document.getElementById('processTrack');
  const stages = gsap.utils.toArray('.pstage');
  const ppFill = document.getElementById('ppFill');
  const ppStone = document.getElementById('ppStone');
  if (track && stages.length) {
    const getMaxScroll = () => Math.max(track.scrollWidth - window.innerWidth + 140, 0);
    const st = ScrollTrigger.create({
      trigger: '#process',
      start: 'top top',
      end: () => '+=' + (getMaxScroll() + window.innerHeight * 0.6),
      pin: true,
      scrub: 0.6,
      onUpdate: (self) => {
        const max = getMaxScroll();
        gsap.set(track, { x: -self.progress * max });
        ppFill.style.width = (self.progress * 100) + '%';
        ppStone.style.left = (self.progress * 100) + '%';
        ppStone.style.transform = `translate(-50%,-50%) rotate(${self.progress * 360}deg) scale(${1.4 - self.progress * 0.7})`;
        ppStone.style.borderRadius = (self.progress * 50) + '%';
      }
    });
    window.addEventListener('resize', () => st.refresh());
  }

  // TRANSPORT — truck moving along SVG path
  const routePath = document.getElementById('routePath');
  const truckDot = document.getElementById('truckDot');
  if (routePath && truckDot && routePath.getTotalLength) {
    const len = routePath.getTotalLength();
    gsap.to({ d: 0 }, {
      d: len, duration: 4, repeat: -1, ease: 'power1.inOut',
      onUpdate: function () {
        const p = routePath.getPointAtLength(this.targets()[0].d);
        truckDot.setAttribute('cx', p.x);
        truckDot.setAttribute('cy', p.y);
      }
    });
  }

  // STATS counters
  document.querySelectorAll('#stats [data-count]').forEach((el) => {
    const target = parseInt(el.getAttribute('data-count'), 10);
    const suffix = el.getAttribute('data-suffix') || '';
    ScrollTrigger.create({
      trigger: el, start: 'top 85%', once: true,
      onEnter: () => {
        gsap.fromTo({ v: 0 }, { v: target }, {
          v: target, duration: 1.8, ease: 'power2.out',
          onUpdate: function () { el.textContent = Math.floor(this.targets()[0].v) + suffix; }
        });
      }
    });
  });

  // Parallax on about copy
  gsap.to('.about-copy', {
    y: -30, ease: 'none',
    scrollTrigger: { trigger: '#about', start: 'top bottom', end: 'bottom top', scrub: true }
  });
}

/* ---------------- PRODUCT CARDS ---------------- */
const products = [
  { name: '10mm Aggregate', cat: 'concrete', code: 'AGG-10', use: 'RCC Slabs, Precast', bulk: '1.55 T/m³', tags: 'concrete' },
  { name: '20mm Aggregate', cat: 'concrete', code: 'AGG-20', use: 'Columns, Beams', bulk: '1.52 T/m³', tags: 'concrete' },
  { name: '40mm Aggregate', cat: 'road', code: 'AGG-40', use: 'PCC, Base Layers', bulk: '1.48 T/m³', tags: 'road' },
  { name: 'GSB / WMM', cat: 'road', code: 'GSB-01', use: 'Highway Sub-base', bulk: '1.9 T/m³', tags: 'road' },
  { name: 'Stone Dust', cat: 'fine', code: 'DST-00', use: 'Paver Bedding, Fill', bulk: '1.6 T/m³', tags: 'fine' },
  { name: 'M-Sand', cat: 'fine', code: 'MSD-01', use: 'Plaster, Masonry', bulk: '1.65 T/m³', tags: 'fine' },
  { name: 'Wet Mix Macadam', cat: 'road', code: 'WMM-02', use: 'Road Base Course', bulk: '2.0 T/m³', tags: 'road' },
  { name: 'Boulder / Rip-Rap', cat: 'concrete', code: 'BLD-05', use: 'Retaining, Erosion Control', bulk: '1.6 T/m³', tags: 'concrete' },
];
const grid = document.getElementById('productGrid');
function renderProducts(filter) {
  grid.innerHTML = '';
  products.filter(p => filter === 'all' || p.tags === filter).forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'pcard';
    card.innerHTML = `
      <div class="pswatch" style="background:radial-gradient(circle at 30% 30%, #${(0x2a2b30 + i * 0x030201).toString(16)}, #14141750 75%)"></div>
      <div class="ptitle">${p.name}</div>
      <div class="pmeta">${p.code}</div>
      <ul class="pspecs">
        <li><span>Best For</span><span>${p.use}</span></li>
        <li><span>Bulk Density</span><span>${p.bulk}</span></li>
        <li><span>Category</span><span>${p.cat}</span></li>
      </ul>`;
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
    grid.appendChild(card);
  });
}
renderProducts('all');
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderProducts(btn.dataset.filter);
  });
});

/* ---------------- GALLERY (procedural art tiles, no external images) ---------------- */
const galleryData = [
  { label: 'Quarry Face — Basalt Bench', hue: '30,25%,14%' },
  { label: 'Primary Crushing Bay', hue: '38,40%,18%' },
  { label: 'Triple-Deck Screening', hue: '220,10%,16%' },
  { label: 'Fleet Loading, Dawn Shift', hue: '25,55%,15%' },
  { label: 'Night Operations', hue: '230,20%,10%' },
  { label: 'Graded Stockpile Yard', hue: '40,30%,17%' },
];
const galGrid = document.getElementById('galleryGrid');
galleryData.forEach((g, i) => {
  const tile = document.createElement('div');
  tile.className = 'gtile';
  tile.innerHTML = `<div class="gart" style="width:100%;height:100%;background:
      radial-gradient(circle at ${20 + i * 12}% ${30 + (i % 3) * 15}%, hsl(${g.hue.split(',')[0]},${g.hue.split(',')[1]},${parseInt(g.hue.split(',')[2]) + 10}%) 0%, hsl(${g.hue}) 60%, #0a0a0c 100%);"></div>
      <div class="gcap">${g.label}</div>`;
  tile.addEventListener('click', () => openLightbox(g));
  galGrid.appendChild(tile);
});

const lightbox = document.getElementById('lightbox');
const lbArt = document.getElementById('lbArt');
const lbCap = document.getElementById('lbCap');
function openLightbox(g) {
  lbArt.style.background = `radial-gradient(circle at 40% 35%, hsl(${g.hue.split(',')[0]},${g.hue.split(',')[1]},${parseInt(g.hue.split(',')[2]) + 12}%) 0%, hsl(${g.hue}) 55%, #0a0a0c 100%)`;
  lbCap.textContent = g.label;
  lightbox.classList.add('show');
}
document.getElementById('lbClose').addEventListener('click', () => lightbox.classList.remove('show'));
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.classList.remove('show'); });

/* ---------------- CONTACT FORM ---------------- */
document.getElementById('quoteForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const original = btn.innerHTML;
  btn.innerHTML = 'Inquiry Sent ✓';
  btn.style.opacity = '0.75';
  setTimeout(() => { btn.innerHTML = original; btn.style.opacity = '1'; e.target.reset(); }, 2400);
});

/* ---------------- AMBIENT SOUND (procedural, no external audio file) ---------------- */
let audioCtx, rumbleNode, isPlaying = false;
const soundBtn = document.getElementById('soundBtn');
function buildRumble() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const bufferSize = 2 * audioCtx.sampleRate;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer; noise.loop = true;

  const lowpass = audioCtx.createBiquadFilter();
  lowpass.type = 'lowpass'; lowpass.frequency.value = 220;

  const gain = audioCtx.createGain();
  gain.gain.value = 0;

  noise.connect(lowpass).connect(gain).connect(audioCtx.destination);
  noise.start();
  rumbleNode = { gain };
}
soundBtn.addEventListener('click', () => {
  if (!audioCtx) buildRumble();
  isPlaying = !isPlaying;
  soundBtn.classList.toggle('on', isPlaying);
  if (rumbleNode) {
    rumbleNode.gain.gain.linearRampToValueAtTime(isPlaying ? 0.05 : 0, audioCtx.currentTime + 0.8);
  }
});
