import { state } from './globals.js';

let fxCanvas, fxCtx, fxParticles = [], fxAnim = null, fxCondition = '';
let bgCanvas, bgCtx, bgParticles = [], bgAnim = null, bgCondition = '';
let bgWindDeg = 270;
let bgMouseX = 0.5, bgMouseY = 0.5;
let landingCycleInterval = null;
const isMobile = window.innerWidth < 720 || /Mobi|Android/i.test(navigator.userAgent);

// ====== COMPASS ======
export function initCompass() {
  const arrow = document.getElementById('compassArrow');
  if (!arrow) return;
  arrow.setAttribute('transform', `rotate(${state.WIND_DEG},80,80)`);
  const dirs = ['N','NE','E','SE','S','SO','O','NO'];
  const idx = Math.round(state.WIND_DEG / 45) % 8;
  const dirName = dirs[idx];
  const el = document.getElementById('windDirText');
  const el2 = document.getElementById('windDirFull');
  if (el) el.textContent = dirName;
  if (el2) el2.textContent = dirName;
}

// ====== SUN ARC ======
export function initSunArc() {
  const sunDot = document.getElementById('sunDot');
  const dur = document.getElementById('daylightDuration');
  if (!sunDot) return;
  const now = new Date();
  const [srH, srM] = state.SUNRISE.split(':').map(Number);
  const [ssH, ssM] = state.COUCHER.split(':').map(Number);
  const srMins = srH*60+srM, ssMins = ssH*60+ssM;
  const nowMins = now.getHours()*60+now.getMinutes();
  const totalMins = ssMins - srMins;
  if (dur) {
    const h = Math.floor(totalMins/60), m = totalMins%60;
    dur.textContent = `${h}h${m.toString().padStart(2,'0')}`;
  }
  let t = (nowMins - srMins) / totalMins;
  t = Math.max(0, Math.min(1, t));
  const x = (1-t)*(1-t)*20 + 2*t*(1-t)*160 + t*t*300;
  const y = (1-t)*(1-t)*130 + 2*t*(1-t)*10 + t*t*130;
  sunDot.setAttribute('cx', x);
  sunDot.setAttribute('cy', y);
  if (nowMins < srMins || nowMins > ssMins) sunDot.setAttribute('opacity','0.3');
}

// ====== CARD WEATHER PARTICLES ======
export function startWeatherAnimation(condition) {
  fxCanvas = document.getElementById('weatherFx');
  if (!fxCanvas) return;
  fxCtx = fxCanvas.getContext('2d', { alpha: true });
  if (fxAnim) cancelAnimationFrame(fxAnim);
  fxParticles = [];
  fxCondition = (condition || state.CURRENT_CONDITION || 'Clear');

  const W = fxCanvas.width;
  const H = fxCanvas.height;
  fxCtx.clearRect(0, 0, W, H);

   if (fxCondition === 'Snow') {
    for (let i = 0; i < 65; i++) {
      fxParticles.push({
        x: Math.random() * W, y: Math.random() * H,
        r: 2 + Math.random() * 2.5, speed: 0.7 + Math.random() * 1.3,
        sway: Math.random() * 1.8 + 0.8, phase: Math.random() * Math.PI * 2,
        opacity: 0.6 + Math.random() * 0.35
      });
    }
  } else if (fxCondition === 'Thunderstorm') {
    fxParticles.lightning = 0;
  } else if (fxCondition === 'Mist' || fxCondition === 'Fog') {
    for (let i = 0; i < 10; i++) {
      fxParticles.push({
        x: Math.random() * W, y: 15 + Math.random() * (H - 30),
        w: 70 + Math.random() * 80, h: 30 + Math.random() * 25,
        speed: 0.2 + Math.random() * 0.3, opacity: 0.15 + Math.random() * 0.2
      });
    }
  } else if (fxCondition === 'Clear') {
    for (let i = 0; i < 12; i++) {
      fxParticles.push({
        x: Math.random() * W, y: Math.random() * H * 0.8,
        r: 1.5 + Math.random() * 1.5, speed: 0.2 + Math.random() * 0.4,
        opacity: 0.3 + Math.random() * 0.35
      });
    }
  } else {
    /* Cloudy / Overcast / other: floating cloud wisps */
    for (let i = 0; i < 6; i++) {
      fxParticles.push({
        x: Math.random() * W, y: 20 + i * 15,
        w: 60 + Math.random() * 50, h: 20 + Math.random() * 10,
        speed: 0.1 + Math.random() * 0.12, opacity: 0.06 + Math.random() * 0.06
      });
    }
  }

  function drawFx() {
    if (!fxCtx || !fxCanvas) return;
    const W = fxCanvas.width, H = fxCanvas.height;
    fxCtx.clearRect(0, 0, W, H);
    const style = getComputedStyle(document.body);
    const textColor = style.getPropertyValue('--text').trim() || '#e8eaf6';

     if (fxCondition === 'Snow') {
      fxCtx.fillStyle = '#fff';
      const t = Date.now() / 1000;
      fxParticles.forEach(p => {
        fxCtx.globalAlpha = p.opacity;
        fxCtx.beginPath(); fxCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2); fxCtx.fill();
        p.y += p.speed;
        p.x += Math.sin(t * p.sway + p.phase) * 1.2;
        p.phase += 0.02;
        if (p.y > H + 4) { p.y = -2; p.x = Math.random() * W; }
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
      });
      fxCtx.globalAlpha = 1;
    } else if (fxCondition === 'Thunderstorm') {
      /* Only lightning flash — no rain particles */
      fxParticles.lightning = (fxParticles.lightning || 0) - 1;
      if (Math.random() < 0.02 && fxParticles.lightning <= 0) {
        fxParticles.lightning = 4 + Math.random() * 5;
      }
      if (fxParticles.lightning > 0) {
        const intensity = Math.min(0.85, fxParticles.lightning / 6);
        fxCtx.fillStyle = `rgba(255,252,220,${intensity})`;
        fxCtx.fillRect(0, 0, W, H);
        fxCtx.fillStyle = `rgba(200,220,255,${intensity * 0.3})`;
        fxCtx.fillRect(0, 0, W, H * 0.6);
      }
      fxCtx.globalAlpha = 1;
    } else if (fxCondition === 'Mist' || fxCondition === 'Fog') {
      fxCtx.fillStyle = textColor;
      fxParticles.forEach(p => {
        fxCtx.globalAlpha = p.opacity;
        fxCtx.beginPath(); fxCtx.ellipse(p.x, p.y, p.w, p.h, 0, 0, Math.PI * 2); fxCtx.fill();
        p.x += p.speed;
        if (p.x - p.w > W) p.x = -p.w;
      });
      fxCtx.globalAlpha = 1;
    } else if (fxCondition === 'Clear') {
      fxCtx.fillStyle = '#fff';
      const t = Date.now() / 1000;
      fxParticles.forEach(p => {
        const twinkle = 0.5 + Math.sin(t * 2 + p.x * 0.1) * 0.5;
        fxCtx.globalAlpha = p.opacity * twinkle;
        fxCtx.beginPath(); fxCtx.arc(p.x, p.y, p.r * twinkle, 0, Math.PI * 2); fxCtx.fill();
        p.y -= p.speed;
        if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; }
      });
      fxCtx.globalAlpha = 1;
    } else {
      fxCtx.fillStyle = textColor;
      fxParticles.forEach(p => {
        fxCtx.globalAlpha = p.opacity;
        fxCtx.beginPath(); fxCtx.ellipse(p.x, p.y, p.w, p.h, 0, 0, Math.PI * 2); fxCtx.fill();
        p.x += p.speed * 0.6;
        if (p.x - p.w > W) p.x = -p.w * 0.6;
      });
      fxCtx.globalAlpha = 1;
    }
    fxAnim = requestAnimationFrame(drawFx);
  }
  drawFx();
}

export function stopWeatherAnimation() {
  if (fxAnim) cancelAnimationFrame(fxAnim);
  fxAnim = null;
  if (fxCtx && fxCanvas) fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
}

// ====== FULL-SCREEN BACKGROUND ANIMATIONS ======
export function startBackgroundWeatherAnimation(condition, windDeg = 270) {
  bgCanvas = document.getElementById('weather-bg');
  if (!bgCanvas) return;

  bgWindDeg = (typeof windDeg === 'number') ? windDeg : 270;

  function resizeBg() {
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
  }
  resizeBg();
  window.addEventListener('resize', () => {
    if (bgCanvas) { resizeBg(); }
  }, { passive: true });

  document.addEventListener('mousemove', (e) => {
    bgMouseX = e.clientX / window.innerWidth;
    bgMouseY = e.clientY / window.innerHeight;
  }, { passive: true });

  bgCtx = bgCanvas.getContext('2d', { alpha: true });
  if (bgAnim) cancelAnimationFrame(bgAnim);
  bgParticles = [];
  bgCondition = (condition || state.CURRENT_CONDITION || 'Clear').toLowerCase();

  const W = bgCanvas.width;
  const H = bgCanvas.height;

  const windRad = (bgWindDeg - 90) * Math.PI / 180;
  const rainAngle = Math.sin(windRad) * 0.65;

   if (bgCondition.includes('rain') || bgCondition.includes('drizzle')) {
    /* Subtle atmospheric mist only — no full-screen rain particles */
    for (let i = 0; i < 18; i++) {
      bgParticles.push({
        x: Math.random() * W, y: Math.random() * H,
        w: 200 + Math.random() * 300, h: 80 + Math.random() * 120,
        speed: 0.04 + Math.random() * 0.1, opacity: 0.03 + Math.random() * 0.05
      });
    }
  } else if (bgCondition.includes('snow')) {
    for (let i = 0; i < 280; i++) {
      bgParticles.push({
        x: Math.random() * W, y: Math.random() * H,
        r: 1.6 + Math.random() * 3.5, speed: 0.7 + Math.random() * 1.8,
        sway: 0.9 + Math.random() * 2.0, phase: Math.random() * Math.PI * 2,
        opacity: 0.5 + Math.random() * 0.45
      });
    }
  } else if (bgCondition.includes('thunder')) {
    const count = isMobile ? 180 : 320;
    for (let i = 0; i < count; i++) {
      bgParticles.push({
        x: Math.random() * W, y: Math.random() * H,
        len: 16 + Math.random() * 26, speed: 12 + Math.random() * 12,
        opacity: 0.28 + Math.random() * 0.38, angle: rainAngle * 0.8
      });
    }
    bgParticles.lightningTimer = 0;
    bgParticles.boltCount = 0;
  } else if (bgCondition.includes('fog') || bgCondition.includes('mist')) {
    for (let i = 0; i < 22; i++) {
      bgParticles.push({
        x: Math.random() * W, y: Math.random() * H,
        w: 220 + Math.random() * 280, h: 85 + Math.random() * 110,
        speed: 0.09 + Math.random() * 0.18, opacity: 0.06 + Math.random() * 0.1
      });
    }
  } else if (bgCondition.includes('clear')) {
    for (let i = 0; i < 42; i++) {
      bgParticles.push({
        x: Math.random() * W, y: Math.random() * H,
        r: 2.0 + Math.random() * 2.8, speed: 0.12 + Math.random() * 0.38,
        opacity: 0.12 + Math.random() * 0.22
      });
    }
  } else {
    for (let i = 0; i < 14; i++) {
      bgParticles.push({
        x: Math.random() * W, y: 50 + Math.random() * (H * 0.75),
        w: 160 + Math.random() * 300, h: 60 + Math.random() * 85,
        speed: 0.05 + Math.random() * 0.12, opacity: 0.05 + Math.random() * 0.08,
        layer: i % 3
      });
    }
  }

  function drawBackground() {
    if (!bgCtx || !bgCanvas) return;
    const W = bgCanvas.width, H = bgCanvas.height;
    bgCtx.clearRect(0, 0, W, H);
    const style = getComputedStyle(document.body);
    const textColor = style.getPropertyValue('--text').trim() || '#e8eaf6';

    const px = (bgMouseX - 0.5) * 18;
    const py = (bgMouseY - 0.5) * 12;

     if (bgCondition.includes('rain') || bgCondition.includes('drizzle')) {
       /* Subtle mist layers for rain — no full-screen particles */
       bgCtx.fillStyle = textColor;
       bgParticles.forEach(p => {
         bgCtx.globalAlpha = p.opacity;
         bgCtx.beginPath();
         bgCtx.ellipse(p.x + px * 0.8, p.y + py * 0.5, p.w, p.h, 0, 0, Math.PI * 2);
         bgCtx.fill();
         p.x += p.speed;
         if (p.x - p.w > W) p.x = -p.w * 0.5;
       });
       bgCtx.globalAlpha = 1;
     } else if (bgCondition.includes('snow')) {
      bgCtx.fillStyle = '#f0f4ff';
      bgParticles.forEach(p => {
        bgCtx.globalAlpha = p.opacity;
        bgCtx.beginPath(); bgCtx.arc(p.x + px * 0.6, p.y + py * 0.4, p.r, 0, Math.PI * 2); bgCtx.fill();
        p.y += p.speed;
        p.x += Math.sin(p.phase) * p.sway * 0.5 + px * 0.01;
        p.phase += 0.022;
        if (p.y > H + 8) { p.y = -6; p.x = Math.random() * W; }
      });
      bgCtx.globalAlpha = 1;
    } else if (bgCondition.includes('thunder')) {
      bgCtx.strokeStyle = textColor;
      bgParticles.forEach(p => {
        if (!p.len) return;
        bgCtx.globalAlpha = p.opacity;
        bgCtx.lineWidth = 1.4;
        const slant = p.angle || -0.2;
        bgCtx.beginPath();
        bgCtx.moveTo(p.x + px * 0.2, p.y + py * 0.1);
        bgCtx.lineTo(p.x + px * 0.2 + slant * p.len, p.y + py * 0.1 + p.len);
        bgCtx.stroke();
        p.y += p.speed;
        p.x += slant * 2.5;
        if (p.y > H + 25) { p.y = -p.len; p.x = Math.random() * W; }
      });
      const flashChance = isMobile ? 0.007 : 0.013;
      if (Math.random() < flashChance && (bgParticles.lightningTimer || 0) <= 0) {
        bgParticles.lightningTimer = 4 + Math.random() * 6;
        bgParticles.boltCount = 1 + Math.floor(Math.random() * 3);
      }
      if ((bgParticles.lightningTimer || 0) > 0) {
        const a = 0.65 + Math.random() * 0.25;
        bgCtx.fillStyle = `rgba(235,245,255,${a})`;
        bgCtx.fillRect(0, 0, W, H);
        if (bgParticles.boltCount > 0) {
          bgCtx.fillStyle = `rgba(255,253,235,${Math.min(0.95, a + 0.2)})`;
          bgCtx.fillRect(0, 0, W, H * (0.55 + Math.random() * 0.2));
          bgParticles.boltCount--;
        }
      }
      bgCtx.globalAlpha = 1;
    } else if (bgCondition.includes('fog') || bgCondition.includes('mist')) {
      bgCtx.fillStyle = textColor;
      bgParticles.forEach(p => {
        bgCtx.globalAlpha = p.opacity;
        bgCtx.beginPath(); bgCtx.ellipse(p.x + px * 1.2, p.y + py * 0.8, p.w, p.h, 0, 0, Math.PI * 2); bgCtx.fill();
        p.x += p.speed;
        if (p.x - p.w > W) p.x = -p.w * 0.5;
      });
      bgCtx.globalAlpha = 1;
    } else if (bgCondition.includes('clear')) {
      bgCtx.fillStyle = '#fff';
      bgParticles.forEach(p => {
        bgCtx.globalAlpha = p.opacity * (0.45 + Math.sin(Date.now() / 620 + p.x * 0.002) * 0.55);
        bgCtx.beginPath(); bgCtx.arc(p.x + px * 0.8, p.y + py * 0.5, p.r, 0, Math.PI * 2); bgCtx.fill();
        p.y -= p.speed * 0.55;
        if (p.y < -12) { p.y = H + 12; p.x = Math.random() * W; }
      });
      bgCtx.globalAlpha = 1;
    } else {
      bgCtx.fillStyle = textColor;
      bgParticles.forEach(p => {
        bgCtx.globalAlpha = p.opacity;
        const layerShift = (p.layer === 0 ? 1.6 : p.layer === 1 ? 0.9 : 2.2);
        bgCtx.beginPath(); bgCtx.ellipse(p.x + px * layerShift, p.y + py * layerShift * 0.6, p.w, p.h, 0, 0, Math.PI * 2); bgCtx.fill();
        p.x += p.speed * (p.layer === 0 ? 0.85 : p.layer === 1 ? 0.55 : 1.25);
        if (p.x - p.w > W) p.x = -p.w * 0.4;
      });
      bgCtx.globalAlpha = 1;
    }
    bgAnim = requestAnimationFrame(drawBackground);
  }
  drawBackground();
}

export function stopBackgroundWeatherAnimation() {
  if (bgAnim) cancelAnimationFrame(bgAnim);
  bgAnim = null;
  if (bgCtx && bgCanvas) bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
}

export function startLandingBackgroundCycle() {
  if (landingCycleInterval) clearInterval(landingCycleInterval);
  const weathers = ['Clear', 'Clouds'];
  let idx = 0;
  landingCycleInterval = setInterval(() => {
    const hasWeatherNow = document.querySelector('.current-weather');
    if (document.getElementById('weather-bg') && !hasWeatherNow) {
      idx = (idx + 1) % weathers.length;
      startBackgroundWeatherAnimation(weathers[idx], 270);
    } else {
      clearInterval(landingCycleInterval);
      landingCycleInterval = null;
    }
  }, 10500);
}

// ====== REALISTIC HERO RAIN ======
// Bezier curves + splash particles + depth layers + wind sync
let heroRainCanvas, heroRainCtx, heroRainAnim = null;
let heroRainDrops = [], heroRainSplashes = [];
let heroRainWindDeg = 270;
let heroRainIntensity = 'rain'; // 'rain' | 'drizzle' | 'thunder'

export function startHeroRain(condition, windDeg = 270) {
  stopHeroRain();
  heroRainCanvas = document.getElementById('heroRain');
  if (!heroRainCanvas) return;

  heroRainIntensity = condition === 'Drizzle' ? 'drizzle'
    : condition === 'Thunderstorm' ? 'thunder' : 'rain';
  heroRainWindDeg = windDeg;

  const heroWeatherVisual = heroRainCanvas.parentElement;
  if (heroWeatherVisual) {
    heroRainCanvas.width = heroWeatherVisual.clientWidth;
    heroRainCanvas.height = heroWeatherVisual.clientHeight;
  }

  heroRainCtx = heroRainCtx || heroRainCanvas.getContext('2d');
  heroRainDrops = [];
  heroRainSplashes = [];

  const W = heroRainCanvas.width;
  const H = heroRainCanvas.height;

  const isDrizzle = heroRainIntensity === 'drizzle';
  const isThunder = heroRainIntensity === 'thunder';
  const layerCounts = isDrizzle ? [8, 6, 4] : isThunder ? [20, 14, 10] : [16, 10, 6];

  for (let layer = 0; layer < 3; layer++) {
    const count = layerCounts[layer];
    for (let i = 0; i < count; i++) {
      heroRainDrops.push(createDrop(W, H, layer));
    }
  }

  function createDrop(w, h, layer) {
    const depthScale = 0.5 + layer * 0.3;
    return {
      x: Math.random() * w * 1.4 - w * 0.2,
      y: Math.random() * h * 1.5 - h * 0.5,
      length: (6 + Math.random() * 8) * (0.6 + layer * 0.3),
      speed: (3 + Math.random() * 4) * depthScale,
      thickness: (0.6 + layer * 0.3) * (isDrizzle ? 0.5 : 1),
      opacity: (0.3 + layer * 0.15) * (isDrizzle ? 0.5 : 0.8),
      layer: layer,
      curve: (Math.random() - 0.5) * 0.3
    };
  }

  function drawHeroRain() {
    if (!heroRainCtx || !heroRainCanvas) return;
    const W = heroRainCanvas.width;
    const H = heroRainCanvas.height;
    heroRainCtx.clearRect(0, 0, W, H);

    const windRad = (heroRainWindDeg - 90) * Math.PI / 180;
    const windStrength = isDrizzle ? 0.3 : isThunder ? 0.8 : 0.5;
    const windX = Math.cos(windRad) * windStrength;
    const windY = Math.sin(windRad) * windStrength * 0.3;

    // Draw rain drops with Bezier curves
    for (const drop of heroRainDrops) {
      const depthScale = 0.5 + drop.layer * 0.3;
      const dx = (windX * depthScale + drop.curve) * drop.length;
      const dy = (windY * depthScale + 1) * drop.length;

      const grad = heroRainCtx.createLinearGradient(
        drop.x, drop.y,
        drop.x + dx * 0.5, drop.y + dy
      );
      grad.addColorStop(0, `rgba(180,210,240,0)`);
      grad.addColorStop(0.3, `rgba(180,210,240,${drop.opacity * 0.5})`);
      grad.addColorStop(1, `rgba(200,225,255,${drop.opacity})`);

      heroRainCtx.strokeStyle = grad;
      heroRainCtx.lineWidth = drop.thickness;
      heroRainCtx.lineCap = 'round';
      heroRainCtx.beginPath();
      heroRainCtx.moveTo(drop.x, drop.y);
      heroRainCtx.bezierCurveTo(
        drop.x + dx * 0.2, drop.y + dy * 0.3,
        drop.x + dx * 0.7, drop.y + dy * 0.7,
        drop.x + dx, drop.y + dy
      );
      heroRainCtx.stroke();

      drop.y += drop.speed + windY * depthScale * 2;
      drop.x += windX * depthScale * 2 + drop.curve;

      if (drop.y > H) {
        // Splash at bottom
        if (drop.layer === 2 && Math.random() < 0.4) {
          heroRainSplashes.push({
            x: drop.x,
            y: H - 5 + Math.random() * 8,
            r: 1 + Math.random() * 2,
            opacity: 0.5,
            life: 1
          });
        }
        drop.y = -drop.length - Math.random() * H * 0.3;
        drop.x = Math.random() * W * 1.4 - W * 0.2;
      }
      if (drop.x > W + 20) drop.x = -drop.length;
      if (drop.x < -drop.length - 20) drop.x = W + drop.length;
    }

    // Draw splashes
    for (let i = heroRainSplashes.length - 1; i >= 0; i--) {
      const s = heroRainSplashes[i];
      heroRainCtx.beginPath();
      heroRainCtx.arc(s.x, s.y, s.r * (1.5 - s.life), 0, Math.PI, true);
      heroRainCtx.strokeStyle = `rgba(180,210,240,${s.opacity * s.life})`;
      heroRainCtx.lineWidth = 0.8;
      heroRainCtx.stroke();
      s.life -= 0.08;
      if (s.life <= 0) heroRainSplashes.splice(i, 1);
    }

    heroRainAnim = requestAnimationFrame(drawHeroRain);
  }

  drawHeroRain();
}

export function stopHeroRain() {
  if (heroRainAnim) {
    cancelAnimationFrame(heroRainAnim);
    heroRainAnim = null;
  }
  if (heroRainCtx && heroRainCanvas) {
    heroRainCtx.clearRect(0, 0, heroRainCanvas.width, heroRainCanvas.height);
  }
  heroRainDrops = [];
  heroRainSplashes = [];
}
