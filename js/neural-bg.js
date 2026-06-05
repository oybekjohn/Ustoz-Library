/* ============================================
   DL-LIBRARY.UZ — Neural Network Background
   Animated particles + connections canvas
   ============================================ */

(function() {
  const canvas = document.getElementById('neural-bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // --- Config ---
  const CONFIG = {
    particleCount: 90,
    connectionDistance: 160,
    particleMinSize: 1.5,
    particleMaxSize: 3.5,
    speed: 0.4,
    pulseSpeed: 0.02,
    mouseRadius: 220,
    colors: {
      light: {
        particle: [102, 126, 234],    // #667eea
        particleAlt: [139, 92, 246],  // #8b5cf6
        connection: [102, 126, 234],
        pulse: [56, 189, 176],        // teal #38bdb0
        bg: '#f4f4fb'
      },
      dark: {
        particle: [160, 168, 248],    // #a0a8f8
        particleAlt: [167, 139, 250], // #a78bfa
        connection: [130, 140, 248],
        pulse: [94, 234, 212],        // light teal #5eead4
        bg: '#141428'
      }
    }
  };

  let particles = [];
  let mouse = { x: -1000, y: -1000 };
  let animFrame;
  let width, height;

  // --- Particle Class ---
  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * CONFIG.speed;
      this.vy = (Math.random() - 0.5) * CONFIG.speed;
      this.baseSize = CONFIG.particleMinSize + Math.random() * (CONFIG.particleMaxSize - CONFIG.particleMinSize);
      this.size = this.baseSize;
      this.pulse = Math.random() * Math.PI * 2;
      this.pulseSpeed = CONFIG.pulseSpeed + Math.random() * 0.01;
      this.isAlt = Math.random() > 0.6;
      this.opacity = 0.4 + Math.random() * 0.5;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      // Pulse size
      this.pulse += this.pulseSpeed;
      this.size = this.baseSize + Math.sin(this.pulse) * 0.8;

      // Mouse interaction — attract gently
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CONFIG.mouseRadius && dist > 0) {
        const force = (CONFIG.mouseRadius - dist) / CONFIG.mouseRadius * 0.012;
        this.vx += dx / dist * force;
        this.vy += dy / dist * force;

        // Particles near mouse glow brighter
        this.opacity = Math.min(0.95, this.opacity + 0.01);
      } else {
        // Fade back to normal
        this.opacity = Math.max(0.4 + Math.random() * 0.1, this.opacity - 0.005);
      }

      // Speed limit
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (speed > CONFIG.speed * 1.5) {
        this.vx *= 0.98;
        this.vy *= 0.98;
      }

      // Wrap edges
      if (this.x < -20) this.x = width + 20;
      if (this.x > width + 20) this.x = -20;
      if (this.y < -20) this.y = height + 20;
      if (this.y > height + 20) this.y = -20;
    }

    draw(colors) {
      const color = this.isAlt ? colors.particleAlt : colors.particle;
      const glowSize = this.size * 3;

      // Glow
      ctx.beginPath();
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowSize);
      gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${this.opacity * 0.3})`);
      gradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);
      ctx.fillStyle = gradient;
      ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${this.opacity})`;
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Get theme colors ---
  function getColors() {
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    return CONFIG.colors[theme] || CONFIG.colors.light;
  }

  // --- Init ---
  function init() {
    resize();
    particles = [];
    for (let i = 0; i < CONFIG.particleCount; i++) {
      particles.push(new Particle());
    }
  }

  // --- Resize ---
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  }

  // --- Draw connections ---
  function drawConnections(colors) {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONFIG.connectionDistance) {
          const opacity = (1 - dist / CONFIG.connectionDistance) * 0.2;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${colors.connection[0]}, ${colors.connection[1]}, ${colors.connection[2]}, ${opacity})`;
          ctx.lineWidth = 0.8;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    // Mouse connections
    for (let i = 0; i < particles.length; i++) {
      const dx = mouse.x - particles[i].x;
      const dy = mouse.y - particles[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < CONFIG.mouseRadius) {
        const opacity = (1 - dist / CONFIG.mouseRadius) * 0.25;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${colors.pulse[0]}, ${colors.pulse[1]}, ${colors.pulse[2]}, ${opacity})`;
        ctx.lineWidth = 0.8;
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.stroke();
      }
    }
  }

  // --- Animate ---
  function animate() {
    const colors = getColors();

    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    // Update & draw
    for (const p of particles) {
      p.update();
    }

    drawConnections(colors);

    for (const p of particles) {
      p.draw(colors);
    }

    animFrame = requestAnimationFrame(animate);
  }

  // --- Events ---
  window.addEventListener('resize', () => {
    resize();
    for (const p of particles) {
      if (p.x > width || p.y > height) {
        p.x = Math.random() * width;
        p.y = Math.random() * height;
      }
    }
  });

  // Mouse tracking on DOCUMENT level (not canvas) so it works through content
  document.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  document.addEventListener('mouseleave', () => {
    mouse.x = -1000;
    mouse.y = -1000;
  });

  // Touch support on document
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      mouse.x = e.touches[0].clientX;
      mouse.y = e.touches[0].clientY;
    }
  }, { passive: true });

  document.addEventListener('touchend', () => {
    mouse.x = -1000;
    mouse.y = -1000;
  });

  // --- Start ---
  init();
  animate();
})();
