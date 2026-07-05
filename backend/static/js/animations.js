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

  if (fxCondition === 'Rain' || fxCondition === 'Drizzle') {
    for (let i = 0; i < 75; i++) {
      fxParticles.push({
        x: Math.random() * W, y: Math.random() * H,
        len: 10 + Math.random() * 14, speed: 6 + Math.random() * 5,
        opacity: 0.35 + Math.random() * 0.45
      });
    }
  } else if (fxCondition === 'Snow') {
    for (let i = 0; i < 55; i++) {
      fxParticles.push({
        x: Math.random() * W, y: Math.random() * H,
        r: 1.8 + Math.random() * 2.2, speed: 0.6 + Math.random() * 1.1,
        sway: Math.random() * 1.6 + 0.6, phase: Math.random() * Math.PI * 2,
        opacity: 0.6 + Math.random() * 0.35
      });
    }
  } else if (fxCondition === 'Thunderstorm') {
    for (let i = 0; i < 60; i++) {
      fxParticles.push({
        x: Math.random() * W, y: Math.random() * H,
        len: 9 + Math.random() * 12, speed: 7 + Math.random() * 6,
        opacity: 0.4 + Math.random() * 0.4
      });
    }
    fxParticles.lightning = 0;
  } else if (fxCondition === 'Mist' || fxCondition === 'Fog') {
    for (let i = 0; i < 7; i++) {
      fxParticles.push({
        x: Math.random() * W, y: 20 + Math.random() * (H - 40),
        w: 60 + Math.random() * 70, h: 28 + Math.random() * 22,
        speed: 0.15 + Math.random() * 0.25, opacity: 0.12 + Math.random() * 0.18
      });
    }
  } else if (fxCondition === 'Clear') {
    for (let i = 0; i < 9; i++) {
      fxParticles.push({
        x: Math.random() * W, y: Math.random() * H * 0.7,
        r: 1.2 + Math.random(), speed: 0.3 + Math.random() * 0.5,
        opacity: 0.25 + Math.random() * 0.3
      });
    }
  } else {
    for (let i = 0; i < 4; i++) {
      fxParticles.push({
        x: Math.random() * W, y: 30 + i * 18,
        w: 55 + Math.random() * 40, h: 18,
        speed: 0.08 + Math.random() * 0.1, opacity: 0.08
      });
    }
  }

  function drawFx() {
    if (!fxCtx || !fxCanvas) return;
    const W = fxCanvas.width, H = fxCanvas.height;
    fxCtx.clearRect(0, 0, W, H);
    const style = getComputedStyle(document.body);
    const textColor = style.getPropertyValue('--text').trim() || '#e8eaf6';

    if (fxCondition === 'Rain' || fxCondition === 'Drizzle') {
      fxCtx.strokeStyle = textColor; fxCtx.lineWidth = 1.2;
      fxParticles.forEach(p => {
        fxCtx.globalAlpha = p.opacity;
        fxCtx.beginPath(); fxCtx.moveTo(p.x, p.y);
        fxCtx.lineTo(p.x, p.y + p.len); fxCtx.stroke();
        p.y += p.speed;
        if (p.y > H + 10) { p.y = -p.len; p.x = Math.random() * W; }
      });
      fxCtx.globalAlpha = 1;
    } else if (fxCondition === 'Snow') {
      fxCtx.fillStyle = '#fff';
      fxParticles.forEach(p => {
        fxCtx.globalAlpha = p.opacity;
        fxCtx.beginPath(); fxCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2); fxCtx.fill();
        p.y += p.speed;
        p.x += Math.sin(p.phase) * p.sway * 0.6;
        p.phase += 0.03;
        if (p.y > H + 4) { p.y = -2; p.x = Math.random() * W; }
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
      });
      fxCtx.globalAlpha = 1;
    } else if (fxCondition === 'Thunderstorm') {
      fxCtx.strokeStyle = textColor; fxCtx.lineWidth = 1.3;
      fxParticles.forEach(p => {
        if (!p.len) return;
        fxCtx.globalAlpha = p.opacity;
        fxCtx.beginPath(); fxCtx.moveTo(p.x, p.y);
        fxCtx.lineTo(p.x, p.y + p.len); fxCtx.stroke();
        p.y += p.speed;
        if (p.y > H + 8) { p.y = -p.len; p.x = Math.random() * W; }
      });
      fxParticles.lightning = (fxParticles.lightning || 0) - 1;
      if (Math.random() < 0.018 && fxParticles.lightning <= 0) {
        fxParticles.lightning = 5 + Math.random() * 7;
        if (Math.random() > 0.6) fxParticles.lightning += 3;
      }
      if (fxParticles.lightning > 0) {
        const intensity = Math.min(0.75, fxParticles.lightning / 9);
        fxCtx.fillStyle = `rgba(255,250,210,${intensity})`;
        fxCtx.fillRect(0, 0, W, H);
        fxCtx.fillStyle = `rgba(180,210,255,${intensity * 0.25})`;
        fxCtx.fillRect(0, 0, W, H);
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
      fxParticles.forEach(p => {
        fxCtx.globalAlpha = p.opacity * (0.6 + Math.sin(Date.now()/420 + p.x) * 0.4);
        fxCtx.beginPath(); fxCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2); fxCtx.fill();
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
    for (let i = 0; i < 420; i++) {
      bgParticles.push({
        x: Math.random() * W, y: Math.random() * H,
        len: 18 + Math.random() * 28, speed: 11 + Math.random() * 14,
        thickness: 1.1 + Math.random() * 1.1,
        opacity: 0.22 + Math.random() * 0.38,
        angle: rainAngle + (Math.random() - 0.5) * 0.15
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
      bgCtx.strokeStyle = textColor;
      bgParticles.forEach(p => {
        bgCtx.globalAlpha = p.opacity;
        bgCtx.lineWidth = p.thickness;
        const slant = p.angle || 0;
        bgCtx.beginPath();
        bgCtx.moveTo(p.x + px * 0.3, p.y + py * 0.2);
        bgCtx.lineTo(p.x + px * 0.3 + slant * p.len, p.y + py * 0.2 + p.len);
        bgCtx.stroke();
        p.y += p.speed;
        p.x += slant * 2.2;
        if (p.y > H + 40) { p.y = -p.len - 20; p.x = Math.random() * W; }
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
