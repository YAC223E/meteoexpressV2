let currentChartKey = 'temp';
let chartPoints = [];
let chartVals = [];
let chartLabels = [];
let chartCanvas = null;
let chartMouseX = null;

window.currentChartKey = currentChartKey;

export { currentChartKey };

export function switchChart(key, btn) {
  currentChartKey = key;
  window.currentChartKey = key;
  document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  drawChart(key);
}
window.switchChart = switchChart;

export function drawChart(key, mouseX = null) {
  const canvas = document.getElementById('hourlyChart');
  if (!canvas) return;
  const HOURLY = window.HOURLY || [];
  if (!HOURLY || !HOURLY.length) {
    canvas.style.display = 'none';
    return;
  }
  canvas.style.display = 'block';
  chartCanvas = canvas;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const W = rect.width, H = rect.height;
  const pad = {top:28, right:18, bottom:32, left:36};
  const cW = W - pad.left - pad.right, cH = H - pad.top - pad.bottom;

  const vals = HOURLY.map(d => (d[key] != null ? d[key] : 0));
  const labels = HOURLY.map(d => d.heure || '');
  const minV = Math.min(...vals) - (key==='temp' ? 2 : 4);
  const maxV = Math.max(...vals) + (key==='temp' ? 2 : 4);

  const style = getComputedStyle(document.body);
  const textColor = style.getPropertyValue('--text').trim() || '#e8eaf6';
  const mutedColor = style.getPropertyValue('--text-muted').trim() || '#8892b0';
  const borderColor = style.getPropertyValue('--border').trim() || '#ffffff20';

  ctx.clearRect(0, 0, W, H);

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (cH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();
    const val = maxV - ((maxV - minV) / 4) * i;
    ctx.fillStyle = mutedColor;
    ctx.font = '10px DM Sans, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(val) + (key === 'temp' ? '°' : key === 'hum' ? '%' : 'm/s'), pad.left - 6, y + 3);
  }

  const points = vals.map((v, i) => ({
    x: pad.left + (cW / (vals.length - 1)) * i,
    y: pad.top + cH - ((v - minV) / (maxV - minV)) * cH,
    val: vals[i],
    label: labels[i]
  }));

  chartPoints = points;
  chartVals = vals;
  chartLabels = labels;

  const colors = { temp: '#5b7cfa', hum: '#2dd4a7', wind: '#fa8c5b' };
  const color = colors[key] || '#5b7cfa';

  const grad = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
  grad.addColorStop(0, color.replace(')', ',0.28)').replace('rgb', 'rgba'));
  grad.addColorStop(1, color.replace(')', ',0.02)').replace('rgb', 'rgba'));
  ctx.beginPath();
  ctx.moveTo(points[0].x, H - pad.bottom);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, H - pad.bottom);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const cp1x = (points[i - 1].x + points[i].x) / 2;
    const cp1y = points[i - 1].y;
    const cp2x = (points[i - 1].x + points[i].x) / 2;
    const cp2y = points[i].y;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, points[i].x, points[i].y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 3.0;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const cp1x = (points[i - 1].x + points[i].x) / 2;
    const cp1y = points[i - 1].y;
    const cp2x = (points[i - 1].x + points[i].x) / 2;
    const cp2y = points[i].y;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, points[i].x, points[i].y);
  }
  ctx.strokeStyle = color.replace(')', ',0.25)').replace('rgb', 'rgba');
  ctx.lineWidth = 7;
  ctx.stroke();

  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  let nowFrac = 0;

  if (labels.length >= 2) {
    const firstLabel = labels[0];
    const lastLabel = labels[labels.length - 1];
    const [fH, fM] = firstLabel.split(':').map(Number);
    const [lH, lM] = lastLabel.split(':').map(Number);
    const firstMins = (fH || 0) * 60 + (fM || 0);
    let lastMins = (lH || 0) * 60 + (lM || 0);
    if (lastMins < firstMins) lastMins += 24 * 60;
    const nowMins = currentHour * 60 + currentMin;
    let clamped = Math.max(firstMins, Math.min(nowMins, lastMins));
    nowFrac = (clamped - firstMins) / (lastMins - firstMins);
  } else {
    nowFrac = 0.1;
  }

  const nowX = pad.left + cW * nowFrac;

  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(nowX, pad.top - 4);
  ctx.lineTo(nowX, H - pad.bottom + 4);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = 'bold 9px DM Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('now', nowX, pad.top - 8);

  points.forEach((p, i) => {
    const isHighlighted = mouseX !== null && Math.abs(mouseX - p.x) < (cW / points.length / 1.6);

    ctx.beginPath();
    ctx.arc(p.x, p.y, isHighlighted ? 5.5 : 4, 0, Math.PI * 2);
    ctx.fillStyle = isHighlighted ? '#fff' : color;
    ctx.fill();
    ctx.strokeStyle = isHighlighted ? color : 'rgba(255,255,255,0.85)';
    ctx.lineWidth = isHighlighted ? 2.5 : 1.5;
    ctx.stroke();

    ctx.fillStyle = isHighlighted ? color : textColor;
    ctx.font = isHighlighted ? 'bold 11px DM Sans,sans-serif' : 'bold 10px DM Sans,sans-serif';
    ctx.textAlign = 'center';
    const valText = Math.round(vals[i]) + (key === 'temp' ? '°' : key === 'hum' ? '%' : '');
    ctx.fillText(valText, p.x, p.y - (isHighlighted ? 14 : 10));

    ctx.fillStyle = mutedColor;
    ctx.font = '9px DM Sans,sans-serif';
    ctx.fillText(labels[i], p.x, H - pad.bottom + 15);
  });

  updateChartTooltip(mouseX, points, key, rect);
}

function updateChartTooltip(mouseX, points, key, rect) {
  const tooltip = document.getElementById('chartTooltip');
  if (!tooltip || mouseX === null || !points.length) {
    if (tooltip) tooltip.style.display = 'none';
    return;
  }
  let closest = points[0];
  let minDist = Infinity;
  points.forEach(p => {
    const dist = Math.abs(p.x - mouseX);
    if (dist < minDist) { minDist = dist; closest = p; }
  });
  const unit = key === 'temp' ? '°' : key === 'hum' ? '%' : ' m/s';
  tooltip.innerHTML = `<strong>${closest.label}</strong><br>${Math.round(closest.val)}${unit}`;
  tooltip.style.display = 'block';
  tooltip.style.left = `${closest.x}px`;
  tooltip.style.top = `${closest.y - 8}px`;
}

export function initChartInteraction() {
  const canvas = document.getElementById('hourlyChart');
  if (!canvas) return;

  let rafPending = false;

  function handleMove(e) {
    if (!chartCanvas || !chartPoints.length) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    chartMouseX = mx;
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(() => {
        drawChart(currentChartKey, chartMouseX);
        rafPending = false;
      });
    }
  }

  function handleLeave() {
    chartMouseX = null;
    drawChart(currentChartKey, null);
    const tooltip = document.getElementById('chartTooltip');
    if (tooltip) tooltip.style.display = 'none';
  }

  canvas.addEventListener('mousemove', handleMove);
  canvas.addEventListener('mouseleave', handleLeave);

  const observer = new MutationObserver(() => {
    if (chartPoints.length) drawChart(currentChartKey, chartMouseX);
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}
