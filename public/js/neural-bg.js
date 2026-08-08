/* ============================================================
   DL-library.uz — Fon animatsiyasi (neyron tarmoq)

   Bu fayl saytning orqa fonidagi harakatlanuvchi nuqtalar va
   ularni bog'lovchi chiziqlarni chizadi.

   TEZLIK UCHUN QILINGAN OPTIMIZATSIYALAR:
     1. Sekundiga 60 emas, 30 kadr — fon uchun ko'z ilg'amaydi,
        lekin protsessor yuki ikki barobar kamayadi.
     2. Ekran o'lchamiga qarab nuqtalar soni moslashadi
        (telefonda kamroq — batareya va CPU tejaladi).
     3. Sahifa ko'rinmay qolsa, modal oyna ochilsa yoki foydalanuvchi
        rasmlarni yashirsa — animatsiya butunlay to'xtaydi.
     4. Masofa hisoblashda kvadrat ildiz (sqrt) ishlatilmaydi.
     5. Foydalanuvchi tizimda animatsiyani o'chirgan bo'lsa
        (prefers-reduced-motion) umuman ishga tushmaydi.
   ============================================================ */

(function () {
  const canvas = document.getElementById('neural-bg');
  if (!canvas) return;

  // Foydalanuvchi tizim sozlamalarida animatsiyani o'chirganmi?
  // (vestibulyar buzilishlar uchun muhim — hurmat qilamiz)
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduceMotion.matches) {
    canvas.style.display = 'none';
    return;
  }

  const ctx = canvas.getContext('2d', { alpha: false });

  // ---------- Sozlamalar ----------
  const CONFIG = {
    // Nuqtalar soni ekran maydoniga qarab hisoblanadi
    particlesPerMegapixel: 45,
    minParticles: 25,
    maxParticles: 90,

    connectionDistance: 160,
    particleMinSize: 1.5,
    particleMaxSize: 3.5,
    speed: 0.4,
    pulseSpeed: 0.02,
    mouseRadius: 220,
    targetFps: 30,

    colors: {
      light: {
        particle: [102, 126, 234],
        particleAlt: [139, 92, 246],
        connection: [102, 126, 234],
        pulse: [56, 189, 176],
        bg: '#f4f4fb',
      },
      dark: {
        particle: [160, 168, 248],
        particleAlt: [167, 139, 250],
        connection: [130, 140, 248],
        pulse: [94, 234, 212],
        bg: '#141428',
      },
    },
  };

  const FRAME_INTERVAL = 1000 / CONFIG.targetFps;
  // Bog'lanish masofasining kvadrati — sqrt hisoblamaslik uchun
  const CONNECT_DIST_SQ = CONFIG.connectionDistance ** 2;
  const MOUSE_RADIUS_SQ = CONFIG.mouseRadius ** 2;

  let particles = [];
  let mouse = { x: -9999, y: -9999 };
  let width = 0;
  let height = 0;
  let animationId = null;
  let lastFrameTime = 0;
  let running = false;

  // ---------- Nuqta ----------
  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * CONFIG.speed;
      this.vy = (Math.random() - 0.5) * CONFIG.speed;
      this.baseSize = CONFIG.particleMinSize
        + Math.random() * (CONFIG.particleMaxSize - CONFIG.particleMinSize);
      this.size = this.baseSize;
      this.pulse = Math.random() * Math.PI * 2;
      this.pulseSpeed = CONFIG.pulseSpeed + Math.random() * 0.01;
      this.isAlt = Math.random() > 0.6;
      this.opacity = 0.4 + Math.random() * 0.5;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      // Nuqta o'lchami sekin "nafas oladi"
      this.pulse += this.pulseSpeed;
      this.size = this.baseSize + Math.sin(this.pulse) * 0.8;

      // Sichqoncha yaqinlashsa nuqta biroz tortiladi va yorqinlashadi
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < MOUSE_RADIUS_SQ && distSq > 0) {
        const dist = Math.sqrt(distSq);
        const force = ((CONFIG.mouseRadius - dist) / CONFIG.mouseRadius) * 0.012;
        this.vx += (dx / dist) * force;
        this.vy += (dy / dist) * force;
        this.opacity = Math.min(0.95, this.opacity + 0.01);
      } else if (this.opacity > 0.45) {
        this.opacity -= 0.005;
      }

      // Tezlik chegarasi
      const speedSq = this.vx * this.vx + this.vy * this.vy;
      if (speedSq > (CONFIG.speed * 1.5) ** 2) {
        this.vx *= 0.98;
        this.vy *= 0.98;
      }

      // Chetdan chiqsa qarama-qarshi tomondan kiradi
      if (this.x < -20) this.x = width + 20;
      else if (this.x > width + 20) this.x = -20;
      if (this.y < -20) this.y = height + 20;
      else if (this.y > height + 20) this.y = -20;
    }

    draw(colors) {
      const color = this.isAlt ? colors.particleAlt : colors.particle;
      const glowRadius = this.size * 3;

      // Yorqinlik (glow).
      // Eslatma: bu yerda oldindan chizilgan rasm (sprite) usuli ham
      // sinab ko'rildi, lekin o'lchov natijasiga ko'ra brauzer
      // gradientni o'zi yaxshi keshlar ekan va gradient tezroq ishladi.
      ctx.beginPath();
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowRadius);
      gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${this.opacity * 0.3})`);
      gradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);
      ctx.fillStyle = gradient;
      ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      // Nuqtaning o'zi
      ctx.beginPath();
      ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${this.opacity})`;
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---------- Yordamchilar ----------

  function getColors() {
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    return CONFIG.colors[theme] || CONFIG.colors.light;
  }

  /** Ekran maydoniga mos nuqtalar sonini hisoblaydi. */
  function particleCount() {
    const megapixels = (width * height) / 1_000_000;
    const count = Math.round(megapixels * CONFIG.particlesPerMegapixel);
    return Math.min(CONFIG.maxParticles, Math.max(CONFIG.minParticles, count));
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  }

  function createParticles() {
    const count = particleCount();
    particles = Array.from({ length: count }, () => new Particle());
  }

  /** Nuqtalar orasidagi va sichqonchagacha bo'lgan chiziqlar. */
  function drawConnections(colors) {
    ctx.lineWidth = 0.8;

    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];

      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = dx * dx + dy * dy;
        if (distSq >= CONNECT_DIST_SQ) continue;

        const opacity = (1 - Math.sqrt(distSq) / CONFIG.connectionDistance) * 0.2;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${colors.connection[0]}, ${colors.connection[1]}, ${colors.connection[2]}, ${opacity})`;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // Sichqonchaga tortiluvchi chiziqlar
      const mdx = mouse.x - a.x;
      const mdy = mouse.y - a.y;
      const mDistSq = mdx * mdx + mdy * mdy;
      if (mDistSq < MOUSE_RADIUS_SQ) {
        const opacity = (1 - Math.sqrt(mDistSq) / CONFIG.mouseRadius) * 0.25;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${colors.pulse[0]}, ${colors.pulse[1]}, ${colors.pulse[2]}, ${opacity})`;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.stroke();
      }
    }
  }

  // ---------- Animatsiya sikli ----------

  function animate(now) {
    animationId = requestAnimationFrame(animate);

    // Kadr chastotasini cheklash (fon uchun 30 fps yetarli)
    if (now - lastFrameTime < FRAME_INTERVAL) return;
    lastFrameTime = now;

    const colors = getColors();
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    for (const p of particles) p.update();
    drawConnections(colors);
    for (const p of particles) p.draw(colors);
  }

  function start() {
    if (running) return;
    running = true;
    lastFrameTime = 0;
    animationId = requestAnimationFrame(animate);
  }

  function stop() {
    if (!running) return;
    running = false;
    if (animationId) cancelAnimationFrame(animationId);
    animationId = null;
  }

  /**
   * Animatsiya faqat kerak bo'lganda ishlaydi:
   * sahifa ko'rinib turgan va modal oyna ochilmagan bo'lsa.
   */
  function updateRunState() {
    const modalOpen = document.querySelector('.flipbook-overlay.active');
    const hiddenByUser = document.documentElement.classList.contains('a11y-no-images');

    if (document.hidden || modalOpen || hiddenByUser) stop();
    else start();
  }

  // ---------- Hodisalar ----------

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      createParticles();
    }, 200);
  });

  document.addEventListener('visibilitychange', updateRunState);

  // Modal oyna ochilishi/yopilishini kuzatamiz
  const modalObserver = new MutationObserver(updateRunState);
  const modal = document.getElementById('flipbook-modal');
  if (modal) {
    modalObserver.observe(modal, { attributes: true, attributeFilter: ['class'] });
  }
  modalObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });

  document.addEventListener('mousemove', (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  }, { passive: true });

  document.addEventListener('mouseleave', () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  document.addEventListener('touchmove', (event) => {
    if (event.touches.length > 0) {
      mouse.x = event.touches[0].clientX;
      mouse.y = event.touches[0].clientY;
    }
  }, { passive: true });

  document.addEventListener('touchend', () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  // Foydalanuvchi tizim sozlamasini ish paytida o'zgartirsa
  reduceMotion.addEventListener('change', (event) => {
    if (event.matches) {
      stop();
      canvas.style.display = 'none';
    } else {
      canvas.style.display = '';
      start();
    }
  });

  // ---------- Ishga tushirish ----------
  resize();
  createParticles();
  updateRunState();
})();
