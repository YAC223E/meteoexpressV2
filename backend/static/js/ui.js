import { toF, convertTemp, toast, getAnimatedWeatherIcon } from './utils.js';
import { TRANSLATIONS, currentLang } from './i18n.js';
import { state } from './globals.js';
import { drawChart } from './charts.js';
import * as IconMap from './icon-map.js';

export function getFavs() { return JSON.parse(localStorage.getItem('mxFavs') || '[]'); }
export function saveFavs(f) { localStorage.setItem('mxFavs', JSON.stringify(f)); }
export function isFav(city) { return getFavs().some(f => f.ville === city); }

export function toggleFav(city, temp, desc) {
  let favs = getFavs();
  const i = favs.findIndex(f => f.ville === city);
  if (i >= 0) { favs.splice(i,1); toast('Retiré des favoris'); }
  else { if (favs.length >= 8) favs.pop(); favs.unshift({ville:city,temp,desc}); toast('Ajouté aux favoris !'); }
  saveFavs(favs); renderFavs(); updateFavButton();
}
window.toggleFav = toggleFav;

export function removeFav(city, e) { e.preventDefault(); e.stopPropagation(); saveFavs(getFavs().filter(f=>f.ville!==city)); renderFavs(); updateFavButton(); }

export function updateFavButton() {
  const btn = document.getElementById('favBtn');
  if (!btn) return;
  const cityName = btn.getAttribute('data-city');
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.fr;
  const icon = isFav(cityName) ? IconMap.uiIcon('heart') : IconMap.uiIcon('star');
  btn.innerHTML = icon + ' ' + (isFav(cityName) ? t.saved_fav : t.save_fav);
}

export function renderFavs() {
  const bar = document.getElementById('favsBar');
  if (!bar) return;
  const favs = getFavs();
  if (!favs.length) { bar.style.display='none'; return; }
  const u = (document.getElementById('unitInput') || {}).value || 'C';
  const lang = currentLang || 'fr';
  bar.style.display = 'flex';
  bar.innerHTML = favs.map(f => `
    <a href="/?city=${encodeURIComponent(f.ville)}&unit=${u}&lang=${lang}" class="fav-city">
      <button class="fav-del" onclick="window.removeFav('${f.ville}',event)">×</button>
      <div class="fav-name">${f.ville}</div>
      <div class="fav-temp">${f.temp}°${u}</div>
      <div class="fav-desc">${f.desc}</div>
    </a>`).join('');
}
window.renderFavs = renderFavs;

export function getRecents() { return JSON.parse(localStorage.getItem('mxRecent') || '[]'); }
export function saveRecents(r) { localStorage.setItem('mxRecent', JSON.stringify(r)); }
export function pushRecent(city) {
  if (!city) return;
  let rec = getRecents().filter(c => c.toLowerCase() !== city.toLowerCase());
  rec.unshift(city);
  if (rec.length > 6) rec.pop();
  saveRecents(rec);
  renderRecents();
}

export function renderRecents() {
  const el = document.getElementById('recentSearches');
  if (!el) return;
  const rec = getRecents();
  if (!rec.length) { el.innerHTML = ''; return; }
  const u = (document.getElementById('unitInput') || {}).value || 'C';
  const lang = currentLang || 'fr';
  el.innerHTML = rec.map(c => `
    <a href="/?city=${encodeURIComponent(c)}&unit=${u}&lang=${lang}" class="city-chip" style="font-size:0.78rem;padding:3px 10px;">${c}</a>
  `).join('');
}

export function setUnit(u) {
  if (!window.WEATHER_RAW) {
    const unitInput = document.getElementById('unitInput');
    if (unitInput) unitInput.value = u;
    return;
  }
  document.body.classList.add('switching');
  window.CURRENT_UNIT = u;
  const unitInput = document.getElementById('unitInput');
  if (unitInput) unitInput.value = u;
  document.querySelectorAll('.unit-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById('unit-' + u.toLowerCase());
  if (activeBtn) activeBtn.classList.add('active');
  const raw = window.WEATHER_RAW;
  const sym = u === 'F' ? '°F' : '°C';
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.fr;
  setTimeout(() => {
    const tempEl = document.getElementById('heroTemp');
    if (tempEl) tempEl.textContent = convertTemp(raw.temp_c, u) + sym;
    const landingTemp = document.getElementById('landingTemp');
    if (landingTemp) landingTemp.textContent = convertTemp(raw.temp_c, u) + sym;
    const feelsEl = document.getElementById('heroFeels');
    if (feelsEl) feelsEl.textContent = t.feels_like + ' ' + convertTemp(raw.feels_c, u) + sym;
    const landingFeels = document.getElementById('landingFeelsLike');
    if (landingFeels) landingFeels.textContent = t.feels_like + ' ' + convertTemp(raw.feels_c, u) + sym;
    const minEl = document.getElementById('heroMin');
    const maxEl = document.getElementById('heroMax');
    if (minEl) minEl.textContent = convertTemp(raw.min_c, u) + '°';
    if (maxEl) maxEl.textContent = convertTemp(raw.max_c, u) + '°';
    const fcMaxEls = document.querySelectorAll('.fc-max');
    const fcMinEls = document.querySelectorAll('.fc-min');
    raw.previsions.forEach((p, i) => {
      if (fcMaxEls[i]) fcMaxEls[i].textContent = convertTemp(p.max_c, u) + '°';
      if (fcMinEls[i]) fcMinEls[i].textContent = convertTemp(p.min_c, u) + '°';
    });
    if (window.HOURLY && window.HOURLY.length && raw.hourly_c) {
      window.HOURLY.forEach((h, i) => {
        if (raw.hourly_c[i] !== undefined) {
          h.temp = convertTemp(raw.hourly_c[i], u);
        }
      });
      if (typeof drawChart === 'function') drawChart(window.currentChartKey || 'temp');
    }
    document.body.classList.remove('switching');
  }, 180);
  const url = new URL(window.location.href);
  url.searchParams.set('unit', u);
  window.history.replaceState({}, '', url);
}
window.setUnit = setUnit;

const ACTIVITY_SCORES = {
  running:  {Clear: 5, Clouds: 4, Drizzle: 2, Rain: 1, Thunderstorm: 0, Snow: 1},
  picnic:   {Clear: 5, Clouds: 3, Drizzle: 1, Rain: 0, Thunderstorm: 0, Snow: 0},
  driving:  {Clear: 5, Clouds: 5, Drizzle: 3, Rain: 2, Thunderstorm: 1, Snow: 1},
  beach:    {Clear: 5, Clouds: 3, Drizzle: 1, Rain: 0, Thunderstorm: 0, Snow: 0},
};

function scoreHour(hourData, activity) {
  const scores = ACTIVITY_SCORES[activity] || ACTIVITY_SCORES.running;
  let base = 3;
  const temp = hourData.temp || 20;
  if (temp >= 18 && temp <= 28) base += 1;
  if (temp < 8 || temp > 32) base -= 1.5;
  if ((hourData.wind || 0) > 7) base -= 0.8;
  return Math.max(0, Math.min(5, Math.round(base)));
}

export function showActivityPlanner(preferredAct) {
  const select = document.getElementById('plannerActivity');
  const results = document.getElementById('plannerResults');
  if (!select || !results) return;
  if (preferredAct) select.value = preferredAct;
  const act = select.value;
  const actLabel = select.options[select.selectedIndex].text;
  const lang = currentLang || 'fr';
  let html = `
    <div style="margin-bottom:10px; display:flex; align-items:center; gap:8px;">
      <span style="font-size:1.1rem;">${IconMap.uiIcon('locate-me')}</span>
      <strong style="font-size:1rem;">${lang === 'en' ? 'Best times for' : 'Meilleurs moments pour'} ${actLabel}</strong>
    </div>`;
  const PREVISIONS = state.PREVISIONS;
  const HOURLY = state.HOURLY;
  if (PREVISIONS && PREVISIONS.length) {
    const scores = ACTIVITY_SCORES[act] || ACTIVITY_SCORES.running;
    const sortedDays = [...PREVISIONS].map(d => {
      const base = scores[d.condition] || 2;
      const tempBonus = (d.temp_max >= 18 && d.temp_max <= 28) ? 1 : 0;
      return { ...d, score: Math.min(6, base + tempBonus) };
    }).sort((a,b) => b.score - a.score).slice(0, 3);
    html += `<div style="margin-bottom:12px;"><div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;">${lang === 'en' ? 'Best days' : 'Meilleurs jours'}</div>`;
    html += `<div style="display:flex; gap:8px; flex-wrap:wrap;">`;
    sortedDays.forEach(d => {
      const pct = Math.round((d.score / 6) * 100);
      const barColor = d.score >= 5 ? 'var(--success)' : d.score >= 4 ? 'var(--primary)' : 'var(--warning)';
      html += `
        <div style="flex:1; min-width:92px; background:rgba(79,195,247,0.06); border:1px solid var(--border); border-radius:12px; padding:9px 10px; font-size:0.82rem;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:1.05rem;">${IconMap.weatherIcon(d.condition, true)}</span>
            <span style="font-weight:700; color:var(--primary);">${d.jour}</span>
          </div>
          <div style="margin:6px 0 4px; font-size:0.95rem;"><strong>${d.temp_max}°</strong> <span style="opacity:.7">/ ${d.temp_min}°</span></div>
          <div style="height:5px; background:var(--border); border-radius:999px; overflow:hidden; margin-bottom:4px;">
            <div style="height:100%; width:${pct}%; background:${barColor}; transition:width .4s;"></div>
          </div>
          <div style="font-size:0.72rem; color:var(--text-muted);">Score <strong style="color:${barColor}">${d.score}/6</strong></div>
        </div>`;
    });
    html += `</div></div>`;
  }
  if (HOURLY && HOURLY.length) {
    const scoredHours = [...HOURLY].map(h => ({...h, score: scoreHour(h, act)}))
      .sort((a,b) => b.score - a.score).slice(0, 5);
    html += `<div style="margin-bottom:6px; font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">${lang === 'en' ? 'Best hours today' : 'Meilleures heures aujourd\'hui'}</div>`;
    html += `<div style="display:flex; flex-direction:column; gap:5px;">`;
    scoredHours.forEach(h => {
      const pct = Math.round((h.score / 5) * 100);
      const quality = h.score >= 4 ? (lang === 'en' ? 'Excellent' : 'Excellent') : h.score >= 3 ? (lang === 'en' ? 'Good' : 'Bon') : (lang === 'en' ? 'Fair' : 'Correct');
      const color = h.score >= 4 ? 'var(--success)' : h.score >= 3 ? 'var(--primary)' : 'var(--text-muted)';
      html += `
        <div style="display:flex; align-items:center; gap:10px; background:rgba(79,195,247,0.05); border:1px solid var(--border); border-radius:10px; padding:6px 10px;">
          <div style="font-family:monospace; font-weight:700; min-width:42px;">${h.heure}</div>
          <div style="flex:1;">
            <div style="height:5px; background:var(--border); border-radius:999px; overflow:hidden;">
              <div style="height:100%; width:${pct}%; background:${color};"></div>
            </div>
          </div>
          <div style="font-size:0.78rem; text-align:right; min-width:64px;">
            <span style="font-weight:700; color:${color};">${quality}</span>
            <span style="opacity:0.6; font-size:0.7rem;"> (${h.score})</span>
          </div>
        </div>`;
    });
    html += `</div>`;
  }
  html += `<div style="margin-top:10px; font-size:0.75rem; color:var(--text-muted); font-style:italic;">${IconMap.uiIcon('bulb')} ${lang === 'en' ? 'Combine these slots with the clothing and safety recommendations above.' : 'Combine ces créneaux avec les recommandations de tenue et de sécurité ci-dessus.'}</div>`;
  results.innerHTML = html;
}
window.showActivityPlanner = showActivityPlanner;

export function toggleSettings() {
  const btn = document.getElementById('settingsBtn');
  const panel = document.getElementById('settingsPanel');
  if (!btn || !panel) return;
  const isOpen = !panel.hasAttribute('hidden');
  if (isOpen) {
    panel.setAttribute('hidden', '');
    btn.setAttribute('aria-expanded', 'false');
  } else {
    panel.removeAttribute('hidden');
    btn.setAttribute('aria-expanded', 'true');
  }
}
window.toggleSettings = toggleSettings;

document.addEventListener('DOMContentLoaded', function() {
  document.addEventListener('click', function(e) {
    const panel = document.getElementById('settingsPanel');
    const btn = document.getElementById('settingsBtn');
    if (!panel || !btn) return;
    if (btn.contains(e.target)) return;
    if (!panel.hasAttribute('hidden') && !panel.contains(e.target)) {
      panel.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
});

export async function shareAsImage() {
  const wrap = document.querySelector('.wrap');
  if (!wrap) { toast('Impossible de capturer'); return; }
  const btns = document.querySelectorAll('.pill-btn, .header-controls button, .search-section, .back-home-btn, .compare-section');
  btns.forEach(b => b.style.visibility = 'hidden');
  toast('Génération de l\'image...');
  try {
    const canvas = await html2canvas(wrap, {
      backgroundColor: getComputedStyle(document.body).backgroundColor || '#0d1124',
      scale: 1.2
    });
    const link = document.createElement('a');
    link.download = `meteo-${(document.querySelector('.city-name')?.textContent || 'ville').trim()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast('Image téléchargée !');
  } catch (e) {
    toast('Erreur lors de la capture');
  } finally {
    btns.forEach(b => b.style.visibility = '');
  }
}
window.shareAsImage = shareAsImage;
