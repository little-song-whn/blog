/* =========================================================
   Doro 的博客 · 页面交互
   ---------------------------------------------------------
   - 墨痕游标:跟随鼠标的柔和光晕
   - 点击涟漪:落在纸上的一滴墨
   - 飘动的尘粒:页面背景里慢慢游走的小光点
   - 滚动浮现:文章/列表元素进入视窗时柔和淡入
   - 阅读进度条:文章页顶部细线
   - 回到顶部:滚动后浮现的小按钮
   ========================================================= */
(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  // ---------------------------------------------------------
  // 1. 墨痕游标:一团慢慢拖在指尖后面的水墨晕(cursor companion)
  // ---------------------------------------------------------
  function initCursor() {
    if (isTouch || prefersReducedMotion) return;

    const blot = document.createElement('div');
    blot.className = 'cursor-blot';
    const nib = document.createElement('div');
    nib.className = 'cursor-nib';
    document.body.appendChild(blot);
    document.body.appendChild(nib);

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let blotX = mouseX, blotY = mouseY;
    let blotRot = 0;
    let visible = false;
    let lastTrail = 0;

    function spawnTrail(x, y) {
      const now = performance.now();
      if (now - lastTrail < 25) return;          // ~40 fps 游丝
      lastTrail = now;
      const t = document.createElement('span');
      t.className = 'cursor-trail';
      t.style.left = x + 'px';
      t.style.top  = y + 'px';
      document.body.appendChild(t);
      t.addEventListener('animationend', () => t.remove(), { once: true });
    }

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!visible) {
        blot.style.opacity = '1';
        nib.style.opacity = '1';
        visible = true;
      }
      nib.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) rotate(148deg)`;
      spawnTrail(mouseX, mouseY);
    });

    document.addEventListener('mouseleave', () => {
      blot.style.opacity = '0';
      nib.style.opacity = '0';
      visible = false;
    });

    // Hover state on interactive elements
    const interactiveSelector = 'a, button, .post-item, .article-nav a, .publication, .theme-toggle, .frog-companion';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest && e.target.closest(interactiveSelector)) {
        blot.classList.add('cursor-blot--hover');
      }
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest && e.target.closest(interactiveSelector)) {
        blot.classList.remove('cursor-blot--hover');
      }
    });

    function tick() {
      blotX += (mouseX - blotX) * 0.16;
      blotY += (mouseY - blotY) * 0.16;
      blotRot += 0.25; // 缓缓自转,像水里漾开的墨
      blot.style.transform =
        `translate3d(${blotX}px, ${blotY}px, 0) rotate(${blotRot}deg)`;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ---------------------------------------------------------
  // 2. 点击涟漪 (ink ripple)
  // ---------------------------------------------------------
  function initRipple() {
    if (prefersReducedMotion) return;

    document.addEventListener('click', (e) => {
      // 不要在表单/可滚动控件上叠加涟漪
      if (e.target.closest('input, textarea, select')) return;

      const r = document.createElement('span');
      r.className = 'ink-ripple';
      r.style.left = e.clientX + 'px';
      r.style.top = e.clientY + 'px';
      document.body.appendChild(r);

      // 随机一点点偏色,像真的墨水
      const hueShift = (Math.random() - 0.5) * 8;
      r.style.filter = `hue-rotate(${hueShift}deg)`;

      r.addEventListener('animationend', () => r.remove(), { once: true });
    });
  }

  // ---------------------------------------------------------
  // 3. 飘动的尘粒 (drifting particles)
  // ---------------------------------------------------------
  function initParticles() {
    if (prefersReducedMotion) return;

    const layer = document.createElement('div');
    layer.className = 'dust-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);

    const count = window.innerWidth < 700 ? 8 : 16;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'dust';
      const size = (Math.random() * 3 + 1.5).toFixed(2);
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = (Math.random() * 100).toFixed(2) + '%';
      p.style.top = (Math.random() * 100).toFixed(2) + '%';
      p.style.animationDuration = (18 + Math.random() * 22).toFixed(1) + 's';
      p.style.animationDelay = (-Math.random() * 30).toFixed(1) + 's';
      p.style.opacity = (0.25 + Math.random() * 0.35).toFixed(2);
      layer.appendChild(p);
    }
  }

  // ---------------------------------------------------------
  // 4. 滚动浮现 (reveal-on-scroll)
  // ---------------------------------------------------------
  function initReveal() {
    if (prefersReducedMotion || !('IntersectionObserver' in window)) return;

    const targets = document.querySelectorAll(
      '.post-item, .section-block .section-heading, .hero, .article-header, .article-body > *, .about-section, .publication, .timeline li'
    );
    targets.forEach((el) => el.classList.add('reveal'));

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal--in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    targets.forEach((el) => io.observe(el));
  }

  // ---------------------------------------------------------
  // 5. 阅读进度条 (reading progress bar)
  // ---------------------------------------------------------
  function initReadingProgress() {
    const article = document.querySelector('.article-body');
    if (!article) return;

    const bar = document.createElement('div');
    bar.className = 'read-progress';
    document.body.appendChild(bar);

    function update() {
      const rect = article.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const scrolled = -rect.top;
      let pct = total > 0 ? (scrolled / total) * 100 : 0;
      pct = Math.max(0, Math.min(100, pct));
      bar.style.width = pct + '%';
    }
    document.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  // ---------------------------------------------------------
  // 6. 回到顶部按钮 (back-to-top)
  // ---------------------------------------------------------
  function initBackToTop() {
    const btn = document.createElement('button');
    btn.className = 'to-top';
    btn.setAttribute('aria-label', '回到顶部');
    btn.innerHTML = '<span aria-hidden="true">↑</span>';
    document.body.appendChild(btn);

    function update() {
      if (window.scrollY > 600) btn.classList.add('to-top--show');
      else btn.classList.remove('to-top--show');
    }
    document.addEventListener('scroll', update, { passive: true });
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
    update();
  }

  // ---------------------------------------------------------
  // 7. 页眉标题:点击 W 时一个小彩蛋
  // ---------------------------------------------------------
  function initTitleEgg() {
    if (prefersReducedMotion) return;
    const ampersand = document.querySelector('.site-title .ampersand');
    if (!ampersand) return;
    ampersand.style.cursor = 'none';
    ampersand.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      ampersand.classList.remove('ampersand--spin');
      // force reflow to restart animation
      void ampersand.offsetWidth;
      ampersand.classList.add('ampersand--spin');
    });
    // 阻止点击穿透到 <a>
    ampersand.parentElement.addEventListener('click', (e) => {
      if (e.target === ampersand) e.preventDefault();
    });
  }

  // ---------------------------------------------------------
  // 8. 像素水墨青蛙,蹲在荷叶上 (pixel frog on lotus leaf)
  // ---------------------------------------------------------
  function initFrog() {
    const PIX = 4;        // 一个“像素”在 SVG 单位里有多大
    const COLS = 32;
    const RIBBITS = ['呱', '呱呱', '咕呱', '呱~'];

    // 水墨调色板 + 荷叶用稍稍偏冷的草绿,与暖纸不抢戏
    const PALETTE = {
      D: '#1a130d',                       // 深墨 / 轮廓
      M: '#6B5635',                       // 暖栗 / 体色
      L: '#C8B080',                       // 暖米 / 腹部
      W: '#FAF6EE',                       // 眼白(同纸色)
      G: '#5a6b48',                       // 荷叶深
      g: '#7a8d62',                       // 荷叶中
      l: '#a4b885',                       // 荷叶亮
      '~': 'rgba(108, 130, 122, 0.55)',   // 水
    };

    // 32 列 × 24 行 像素图。'.'=透明
    const SPRITE = [
      // —— 青蛙(蹲坐状,正面) ——
      '...........DDD....DDD...........', // 0  眼顶
      '........DWWWWWD..DWWWWWD........', // 1  眼白
      '........DWWWWWD..DWWWWWD........', // 2  眼白(瞳孔位)
      '........DWWWWWD..DWWWWWD........', // 3  眼白
      '...........DDDDDDDDDD...........', // 4  额头
      '.........DMMMMMMMMMMMMD.........', // 5  头上部
      '........DMMMMMMMMMMMMMMD........', // 6  脸颊
      '.......DMMMMMM....MMMMMMD.......', // 7  面颊/上臂
      '......DMMMMMMLLLLLLMMMMMMD......', // 8  身体/手臂
      '......DMMMMMMLLLLLLMMMMMMD......', // 9  身体
      '......DMMMMMMLLLLLLMMMMMMD......', // 10 身体(最宽)
      '.......DMMMMMLLLLLLMMMMMD.......', // 11 收窄
      '........DMMMMMLLLLMMMMMD........', // 12 底部
      '.........DDDD......DDDD.........', // 13 两只小脚
      // —— 荷叶 ——
      '.....GGGGGGGGGGGGGGGGGGGGGG.....', // 14
      '...GGggggggggggggggggggggggGG...', // 15
      '..GGggggllllllllllllllllggggGG..', // 16
      '.GGgggllllllllllllllllllllgggGG.', // 17
      '.GGgggllllllllllllllllllllgggGG.', // 18
      '..GGggggllllllllllllllllggggGG..', // 19
      '...GGggggggggggggggggggggggGG...', // 20
      '.....GGGGGGGGGGGGGGGGGGGGGG.....', // 21
      // —— 水波 ——
      '..~~....~~....~~....~~....~~....', // 22
      '....~~....~~....~~....~~....~~..', // 23
    ];

    // 把每个像素生成一条 <rect>,按层(水/叶/蛙体)分开放
    const water1 = [], water2 = [], leaf = [], frogBody = [];
    for (let y = 0; y < SPRITE.length; y++) {
      const row = SPRITE[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.') continue;
        const fill = PALETTE[ch];
        if (!fill) continue;
        const rect =
          `<rect x="${x * PIX}" y="${y * PIX}" width="${PIX}" height="${PIX}" fill="${fill}"/>`;
        if (ch === '~') (y === 22 ? water1 : water2).push(rect);
        else if (ch === 'G' || ch === 'g' || ch === 'l') leaf.push(rect);
        else frogBody.push(rect);
      }
    }

    // 瞳孔 + 眨眼用的眼皮(单独管,JS 可以挪)
    const pupilLx = 11 * PIX, pupilLy = 2 * PIX;
    const pupilRx = 20 * PIX, pupilRy = 2 * PIX;
    const eyeY = 1 * PIX, eyeW = 3 * PIX, eyeH = 3 * PIX;
    const eyeLx = 10 * PIX, eyeRx = 19 * PIX;

    const pupils = `
      <rect class="pixel-pupil" data-base-x="${pupilLx}" data-base-y="${pupilLy}"
            x="${pupilLx}" y="${pupilLy}" width="${PIX}" height="${PIX}" fill="${PALETTE.D}"/>
      <rect class="pixel-pupil" data-base-x="${pupilRx}" data-base-y="${pupilRy}"
            x="${pupilRx}" y="${pupilRy}" width="${PIX}" height="${PIX}" fill="${PALETTE.D}"/>`;

    const eyelids = `
      <rect class="pixel-eyelid"
            x="${eyeLx}" y="${eyeY}" width="${eyeW}" height="${eyeH}"
            fill="${PALETTE.M}" opacity="0"/>
      <rect class="pixel-eyelid"
            x="${eyeRx}" y="${eyeY}" width="${eyeW}" height="${eyeH}"
            fill="${PALETTE.M}" opacity="0"/>`;

    const svg = `
      <svg class="frog-svg" viewBox="0 0 ${COLS * PIX} ${SPRITE.length * PIX}"
           xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g class="pixel-water pixel-water-1">${water1.join('')}</g>
        <g class="pixel-water pixel-water-2">${water2.join('')}</g>
        <g class="pixel-bob">
          <g class="pixel-leaf">${leaf.join('')}</g>
          <g class="pixel-frog">
            ${frogBody.join('')}
            ${pupils}
            ${eyelids}
          </g>
        </g>
      </svg>`;

    const frog = document.createElement('div');
    frog.className = 'frog-companion frog--pixel';
    frog.setAttribute('role', 'button');
    frog.setAttribute('aria-label', '蹲坐在荷叶上的像素水墨青蛙,点击与它打招呼');
    frog.setAttribute('tabindex', '0');
    frog.title = '点点我';
    frog.innerHTML = svg;
    document.body.appendChild(frog);

    const pupilEls  = frog.querySelectorAll('.pixel-pupil');
    const eyelidEls = frog.querySelectorAll('.pixel-eyelid');
    const frogGroup = frog.querySelector('.pixel-frog');

    // —— 瞳孔随鼠标:贴着像素格,只有 9 个离散位置 ——
    function moveEyes(cx, cy) {
      const rect = frog.getBoundingClientRect();
      const fcx = rect.left + rect.width / 2;
      const fcy = rect.top + rect.height * 0.18;   // 眼区域大概 Y
      const dx = cx - fcx;
      const dy = cy - fcy;
      const snap = (v, t) => (v > t ? PIX : v < -t ? -PIX : 0);
      const sx = snap(dx, 30);
      const sy = snap(dy, 22);
      pupilEls.forEach((p) => {
        const bx = parseFloat(p.dataset.baseX);
        const by = parseFloat(p.dataset.baseY);
        p.setAttribute('x', bx + sx);
        p.setAttribute('y', by + sy);
      });
    }

    if (!isTouch) {
      document.addEventListener('mousemove', (e) => moveEyes(e.clientX, e.clientY));
    }

    // —— 点击 → 蛙体跳一下 + “呱” 飘出 ——
    function ribbit() {
      frogGroup.classList.remove('frog--hop');
      void frog.offsetWidth;
      frogGroup.classList.add('frog--hop');

      const bubble = document.createElement('div');
      bubble.className = 'frog-ribbit';
      bubble.textContent = RIBBITS[Math.floor(Math.random() * RIBBITS.length)];
      bubble.style.setProperty('--tilt', ((Math.random() - 0.5) * 10).toFixed(1) + 'deg');
      frog.appendChild(bubble);
      bubble.addEventListener('animationend', () => bubble.remove(), { once: true });
    }

    frog.addEventListener('click', (e) => {
      e.stopPropagation();
      ribbit();
    });
    frog.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        ribbit();
      }
    });

    // —— 偶尔眨眼:像素风干脆瞬时切换,不做缓动 ——
    if (!prefersReducedMotion) {
      (function scheduleBlink() {
        const wait = 3500 + Math.random() * 3500;
        setTimeout(() => {
          eyelidEls.forEach((l) => l.setAttribute('opacity', '1'));
          setTimeout(() => {
            eyelidEls.forEach((l) => l.setAttribute('opacity', '0'));
            scheduleBlink();
          }, 130);
        }, wait);
      })();
    }
  }

  // ---------------------------------------------------------
  // 9. 落叶 (falling autumn leaves)
  // ---------------------------------------------------------
  function initLeaves() {
    if (prefersReducedMotion) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'leaves-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(canvas, document.body.firstChild);

    const ctx = canvas.getContext('2d');
    let leaves = [];
    let shatters = [];
    let animId = null;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const LEAF_COUNT = window.innerWidth < 700 ? 6 : 12;

    const COLORS = [
      { fill: 'rgba(168, 84, 58, 0.40)', stroke: 'rgba(168, 84, 58, 0.15)' },
      { fill: 'rgba(168, 84, 58, 0.22)', stroke: 'rgba(168, 84, 58, 0.10)' },
      { fill: 'rgba(201, 135, 107, 0.30)', stroke: 'rgba(201, 135, 107, 0.12)' },
      { fill: 'rgba(201, 135, 107, 0.18)', stroke: 'rgba(201, 135, 107, 0.08)' },
      { fill: 'rgba(154, 139, 126, 0.20)', stroke: 'rgba(154, 139, 126, 0.08)' },
      { fill: 'rgba(90, 107, 72, 0.25)', stroke: 'rgba(90, 107, 72, 0.10)' },
    ];

    function randomLeaf() {
      return {
        x: Math.random() * (canvas.width + 120) - 60,
        y: -50 - Math.random() * 150,
        size: 16 + Math.random() * 20,
        speedY: 0.25 + Math.random() * 0.45,
        speedX: (Math.random() - 0.5) * 0.2,
        swayAmp: 0.3 + Math.random() * 0.8,
        swayFreq: 0.006 + Math.random() * 0.01,
        swayPhase: Math.random() * Math.PI * 2,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.015,
        palette: COLORS[Math.floor(Math.random() * COLORS.length)],
        opacity: 0.5 + Math.random() * 0.35,
        alive: true,
      };
    }

    // —— 绘制一片水墨风格落叶 ——
    function drawLeaf(ctx, l) {
      const s = l.size;
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.rot);
      ctx.globalAlpha = l.opacity;

      // 叶身 (不对称水滴形)
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.5);
      ctx.bezierCurveTo(s * 0.45, -s * 0.3, s * 0.55, s * 0.1, 0, s * 0.5);
      ctx.bezierCurveTo(-s * 0.55, s * 0.1, -s * 0.45, -s * 0.3, 0, -s * 0.5);
      ctx.fillStyle = l.palette.fill;
      ctx.fill();
      ctx.strokeStyle = l.palette.stroke;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // 叶脉
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.35);
      ctx.quadraticCurveTo(s * 0.08, 0, 0, s * 0.35);
      ctx.strokeStyle = l.palette.stroke;
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // 叶柄
      ctx.beginPath();
      ctx.moveTo(0, s * 0.5);
      ctx.lineTo(0, s * 0.7);
      ctx.strokeStyle = 'rgba(58, 47, 38, 0.18)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    }

    // —— 创建初始叶子 ——
    for (let i = 0; i < LEAF_COUNT; i++) {
      const l = randomLeaf();
      l.y = Math.random() * (canvas.height + 100);
      leaves.push(l);
    }

    // —— 点击落叶 → 破碎 ——
    function handleLeafClick(e) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      for (let i = leaves.length - 1; i >= 0; i--) {
        const l = leaves[i];
        if (!l.alive) continue;
        const dx = mx - l.x;
        const dy = my - l.y;
        const r = l.size * 0.65;
        if (dx * dx + dy * dy < r * r) {
          // 破碎!
          l.alive = false;
          const count = 8 + Math.floor(Math.random() * 8);
          for (let j = 0; j < count; j++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 1.2 + Math.random() * 3;
            const hue = (Math.random() - 0.5) * 30;
            shatters.push({
              x: l.x, y: l.y,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd - 1,
              size: 2 + Math.random() * 4,
              life: 1,
              decay: 0.012 + Math.random() * 0.018,
              color: l.palette.fill,
              hueShift: hue,
              rot: Math.random() * Math.PI * 2,
              rotSpeed: (Math.random() - 0.5) * 0.3,
            });
          }
          // 重新生成一片新叶
          leaves.push(randomLeaf());
          break;
        }
      }
    }
    canvas.addEventListener('click', handleLeafClick);

    // —— 动画循环 ——
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 更新 & 绘制叶子
      for (const l of leaves) {
        if (!l.alive) continue;
        const sway = Math.sin(Date.now() * l.swayFreq + l.swayPhase) * l.swayAmp;
        l.x += l.speedX + sway * 0.06;
        l.y += l.speedY;
        l.rot += l.rotSpeed;
        if (l.y > canvas.height + 60) {
          Object.assign(l, randomLeaf());
          l.y = -50 - Math.random() * 150;
        }
        drawLeaf(ctx, l);
      }

      // 更新 & 绘制破碎粒子
      for (let i = shatters.length - 1; i >= 0; i--) {
        const p = shatters[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.025;
        p.life -= p.decay;
        p.rot += p.rotSpeed;
        if (p.life <= 0) { shatters.splice(i, 1); continue; }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.life * 0.8;
        ctx.fillStyle = p.color;
        const s = p.size * p.life;
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.restore();
      }

      animId = requestAnimationFrame(animate);
    }
    animate();
  }

  // ---------------------------------------------------------
  // bootstrap
  // ---------------------------------------------------------
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(() => {
    initCursor();
    initRipple();
    initParticles();
    initReveal();
    initReadingProgress();
    initBackToTop();
    initTitleEgg();
    initFrog();
    initLeaves();
  });
})();
