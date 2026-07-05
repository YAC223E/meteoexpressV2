import { state } from './globals.js';
import { getAnimatedWeatherIcon } from './utils.js';
import * as IconMap from './icon-map.js';
import { currentLang } from './i18n.js';
import { getRecents } from './ui.js';
import { drawChart, initChartInteraction } from './charts.js';
import { initMap, map } from './map.js';
import { startBackgroundWeatherAnimation, startWeatherAnimation } from './animations.js';
import { startLocalClock } from './local-clock.js';

export async function loadLandingWeather() {
  if (window.HAS_WEATHER) return;

  const shimmer = document.getElementById('landingShimmer');
  const dashboard = document.getElementById('landingDashboard');

  if (shimmer) shimmer.style.display = 'flex';
  if (dashboard) dashboard.classList.remove('active');

  const recents = getRecents();
  let defaultCity = (recents && recents.length) ? recents[0] : 'Paris';

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await fetch(`/reverse-geocode?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
          const d = await r.json();
          if (d.city) {
            fetchAndDisplayLandingWeather(d.city);
            return;
          }
        } catch (e) {
          console.error("Landing reverse geocode error:", e);
        }
        fetchAndDisplayLandingWeather(defaultCity);
      },
      (err) => {
        console.log("Landing geolocation denied or error, using default:", defaultCity);
        fetchAndDisplayLandingWeather(defaultCity);
      },
      { timeout: 5000 }
    );
  } else {
    fetchAndDisplayLandingWeather(defaultCity);
  }
}
window.loadLandingWeather = loadLandingWeather;

export async function fetchAndDisplayLandingWeather(city) {
  const shimmer = document.getElementById('landingShimmer');
  const dashboard = document.getElementById('landingDashboard');
  const unitInput = document.getElementById('unitInput');
  const unit = unitInput ? unitInput.value : 'C';
  const lang = currentLang || 'fr';

  try {
    const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}&unit=${unit}&lang=${lang}`);
    if (!res.ok) throw new Error("API error");
    const data = await res.json();

    window.HOURLY = data.hourly || [];
    state.HOURLY = data.hourly || [];
    var toC = function(v) { return data.unit === 'F' ? Math.round((v - 32) * 5 / 9) : Math.round(v); };
    window.WEATHER_RAW = {
      temp_c: toC(data.meteo.temperature),
      feels_c: toC(data.meteo.temperature_reelle),
      min_c: toC(data.meteo.temp_min),
      max_c: toC(data.meteo.temp_max),
      hourly_c: (data.hourly || []).map(function(h) { return toC(h.temp); }),
      previsions: (data.previsions || []).map(function(p) { return { min_c: toC(p.temp_min), max_c: toC(p.temp_max) }; })
    };
    window.CURRENT_UNIT = data.unit;
    window.WIND_DEG = data.meteo.vent_deg || 0;
    state.WIND_DEG = data.meteo.vent_deg || 0;
    window.LAT = data.meteo.lat || 0;
    state.LAT = data.meteo.lat || 0;
    window.LON = data.meteo.lon || 0;
    state.LON = data.meteo.lon || 0;
    window.SUNRISE = data.meteo.lever_soleil || '06:00';
    state.SUNRISE = data.meteo.lever_soleil || '06:00';
    window.COUCHER = data.meteo.coucher_soleil || '18:00';
    state.COUCHER = data.meteo.coucher_soleil || '18:00';
    window.PREVISIONS = data.previsions || [];
    state.PREVISIONS = data.previsions || [];
    window.BEST_DAYS = data.best_days || {};
    state.BEST_DAYS = data.best_days || {};

    const nameEl = document.getElementById('landingCityName');
    const dateEl = document.getElementById('landingCityDate');
    const tempEl = document.getElementById('landingTemp');
    const descEl = document.getElementById('landingDesc');
    const iconEl = document.getElementById('landingWeatherIcon');
    const humidityEl = document.getElementById('landingHumidity');
    const windEl = document.getElementById('landingWind');
    const feelsEl = document.getElementById('landingFeelsLike');

    if (nameEl) nameEl.textContent = data.meteo.ville;
    if (dateEl) dateEl.textContent = `${data.meteo.pays} • ${data.meteo.date}`;
    if (dateEl && data.meteo.tz_offset_secondes !== undefined) {
      startLocalClock('landingCityDate', data.meteo.tz_offset_secondes, lang);
    }
    if (tempEl) tempEl.textContent = `${data.meteo.temperature}°${data.unit}`;
    if (descEl) descEl.textContent = data.meteo.description;
    if (iconEl) {
      const cond = data.meteo.condition;
      const isDay = IconMap.isDay(data.meteo.lever_soleil, data.meteo.coucher_soleil);
      const iconHtml = IconMap.weatherIcon(cond, isDay, { size: 96, class: "weather-icon-meteocon" });
      const cssClass = IconMap.weatherIconCssClass(cond, isDay);
      let overlays = '';
      if (cond === 'Rain' || cond === 'Drizzle' || cond === 'Thunderstorm') {
        overlays += '<div class="rain-overlay"><span></span><span></span><span></span><span></span></div>';
      }
      if (cond === 'Thunderstorm') {
        overlays += '<div class="lightning-overlay"></div>';
      }
      iconEl.innerHTML = `<div class="weather-icon-wrap weather-icon-${cssClass}">${iconHtml}${overlays}</div>`;
    }
    if (humidityEl) humidityEl.textContent = `${data.meteo.humidite}%`;
    if (windEl) windEl.textContent = `${data.meteo.vent} m/s`;
    if (feelsEl) feelsEl.textContent = (lang === 'en' ? `Feels like ` : `Ressenti `) + `${data.meteo.temperature_reelle}°${data.unit}`;

    const cityInput = document.getElementById('cityInput');
    if (cityInput) {
      cityInput.placeholder = lang === 'en' ? `Search city... (detected: ${data.meteo.ville})` : `Rechercher une ville... (détectée : ${data.meteo.ville})`;
      cityInput.value = data.meteo.ville;
    }

    const previewTitleEl = document.getElementById('landingPreviewTitle');
    if (previewTitleEl) {
      previewTitleEl.textContent = lang === 'en'
        ? `Local Weather Preview for ${data.meteo.ville}`
        : `Aperçu météo local pour ${data.meteo.ville}`;
    }

    const aiContent = document.getElementById('landingAiContent');
    if (aiContent && data.recommendations) {
      const rec = data.recommendations;
      let html = '';
      if (rec.summary) {
        html += `<div class="ai-summary-text" style="font-style: italic; color: var(--text); padding: 12px; background: rgba(91, 124, 250, 0.08); border-radius: 12px; border-left: 4px solid var(--primary); margin-bottom: 8px; font-size: 0.95rem;">"${IconMap.ses(rec.summary)}"</div>`;
      }
      if (rec.clothing && rec.clothing.length) {
        html += `<div style="margin-bottom: 8px;"><strong>${IconMap.clothingIcon('jacket')} ${lang === 'en' ? 'What to wear' : 'Tenue suggérée'} :</strong><div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px;">${rec.clothing.map(item => `<span style="display:inline-flex; align-items:center; gap:6px; background: var(--card-border); border: 1px solid var(--border); padding: 4px 10px; border-radius: 8px; font-size: 0.82rem; color: var(--text);">${IconMap.guessClothingIcon(item)} ${IconMap.ses(item)}</span>`).join('')}</div></div>`;
      }
      if (rec.activities && rec.activities.activities && rec.activities.activities.length) {
        html += `<div style="margin-bottom: 8px;"><strong>${IconMap.activityIcon('running')} ${lang === 'en' ? 'Activities & Advice' : 'Activités & Conseils'} :</strong><ul style="margin: 6px 0 0 16px; padding: 0; font-size: 0.88rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 4px;">${rec.activities.activities.map(act => `<li>${IconMap.guessActivityIcon(act)} ${IconMap.ses(act)}</li>`).join('')}${rec.travel ? `<li>${IconMap.activityIcon('driving')} ${IconMap.ses(rec.travel)}</li>` : ''}</ul></div>`;
      }
      if (rec.pack && rec.pack.length) {
        html += `<div style="margin-bottom: 8px; font-size: 0.88rem; color: var(--text-muted); display:flex; align-items:center; gap:6px;"><strong>${IconMap.uiIcon('backpack')} ${lang === 'en' ? 'To bring' : 'À emporter'} :</strong> ${rec.pack.map(IconMap.ses).join(' • ')}</div>`;
      }
      if (rec.comfort_index) {
        html += `<div style="margin-top: auto; padding-top: 12px; border-top: 1px solid var(--border);"><div style="display:flex; justify-content:space-between; font-size:0.82rem; margin-bottom:4px; color:var(--text-muted);"><span>${lang === 'en' ? 'Comfort Index' : 'Indice de confort'}</span><strong style="color:var(--text);">${rec.comfort_index}%</strong></div><div style="height:6px; background: var(--border); border-radius:10px; overflow:hidden;"><div style="height:100%; width:${rec.comfort_index}%; background:linear-gradient(90deg, var(--primary), var(--accent));"></div></div></div>`;
      }
      aiContent.innerHTML = html;
      aiContent.style.justifyContent = 'flex-start';
    }

    if (typeof drawChart === 'function') {
      drawChart('temp');
      if (typeof initChartInteraction === 'function') initChartInteraction();
    }

    const forecastGrid = document.getElementById('landingForecastGrid');
    if (forecastGrid && state.PREVISIONS.length) {
      forecastGrid.innerHTML = state.PREVISIONS.map(p => `
        <div class="forecast-card">
          <div class="fc-day">${p.jour}</div>
          <div class="fc-date">${p.date}</div>
          <div class="fc-icon">${IconMap.weatherIcon(p.condition, true, { size: 44, class: "weather-icon-meteocon" })}</div>
          <div class="fc-desc" style="min-height:32px; display:flex; align-items:center; justify-content:center; font-size:0.75rem;">${p.description}</div>
          <div class="fc-temps">
            <span class="fc-max" style="font-size:1rem; font-weight:700;">${p.temp_max}°</span>
            <span class="fc-min" style="font-size:0.85rem; color:var(--text-muted);">${p.temp_min}°</span>
          </div>
          <div style="margin-top:6px;font-size:0.7rem;color:var(--text-muted);">${IconMap.uiIcon('droplet')} ${p.humidite}% &bull; ${IconMap.uiIcon('wind-meter')} ${p.vent}m/s</div>
        </div>
      `).join('');
    }

    if (typeof initMap === 'function') initMap();

    if (typeof startBackgroundWeatherAnimation === 'function') {
      startBackgroundWeatherAnimation(data.meteo.condition, state.WIND_DEG);
    }

    const cardCanvas = document.getElementById('landingWeatherFx');
    if (cardCanvas && typeof startWeatherAnimation === 'function') {
      startWeatherAnimation(data.meteo.condition);
    }

    if (shimmer) shimmer.style.display = 'none';
    if (dashboard) {
      dashboard.classList.add('active');
      setTimeout(() => {
        if (map && typeof map.invalidateSize === 'function') map.invalidateSize();
      }, 300);
    }

  } catch (e) {
    console.error("Error fetching preview weather data:", e);
    if (shimmer) {
      shimmer.innerHTML = `<p style="color:var(--danger); padding:20px;">${IconMap.uiIcon('cross-circle')} ${lang === 'en' ? 'Error loading weather data' : 'Erreur lors du chargement des données météo'}.</p>`;
    }
  }
}
window.fetchAndDisplayLandingWeather = fetchAndDisplayLandingWeather;
