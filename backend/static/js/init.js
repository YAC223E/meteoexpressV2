import { state } from './globals.js';
import { toast, createRipple, getAnimatedWeatherIcon } from './utils.js';
import * as IconMap from './icon-map.js';
import { initTheme, toggleTheme, applyWeatherTheme } from './theme.js';
import { currentLang, setLanguage, initLanguage, showExplain, hideExplain } from './i18n.js';
import { getFavs, saveFavs, isFav, toggleFav, removeFav, updateFavButton, renderFavs, renderRecents, getRecents, saveRecents, pushRecent, setUnit, showActivityPlanner, shareAsImage } from './ui.js';
import { geolocate, startVoice, initAutocomplete, selectCity } from './search.js';
import { switchChart, drawChart, initChartInteraction } from './charts.js';
import { initCompass, initSunArc, startWeatherAnimation, startBackgroundWeatherAnimation, startLandingBackgroundCycle } from './animations.js';
import { initMap, setMapLayer } from './map.js';
import { initPWA } from './pwa.js';
import { loadLandingWeather } from './landing.js';
import './chatbot.js';
import './quick-nav.js';
import { startLocalClock } from './local-clock.js';

function initAll() {
  initTheme();
  renderFavs();
  renderRecents();
  initAutocomplete();
  initPWA();
  initLanguage();

  const clockEl = document.getElementById('cityLocalClock');
  if (clockEl) {
    startLocalClock('cityLocalClock', parseInt(clockEl.dataset.tzOffset, 10), currentLang);
  }

  updateFavButton();

  const hasWeather = state.HAS_WEATHER;
  const cond = state.CURRENT_CONDITION;
  const wdeg = state.WIND_DEG;

  if (hasWeather && state.HOURLY && state.HOURLY.length) {
    drawChart('temp');
    initChartInteraction();
  }

  if (hasWeather) {
    initCompass();
    initSunArc();
  }

  if (hasWeather) {
    setTimeout(initMap, 120);
  }

  if (hasWeather) {
    const isDay = (() => {
      const now = new Date();
      const parts = n => n < 10 ? '0' + n : '' + n;
      const curr = parts(now.getHours()) + ':' + parts(now.getMinutes());
      return curr >= state.SUNRISE && curr < state.COUCHER;
    })();
    applyWeatherTheme(cond, isDay);
    startBackgroundWeatherAnimation(cond, wdeg);
    setTimeout(() => startWeatherAnimation(cond), 80);

    const condIsDay = IconMap.isDay(state.SUNRISE, state.COUCHER);
    const mainEmoji = document.querySelector('.weather-emoji');
    if (mainEmoji) {
      const iconHtml = IconMap.weatherIcon(cond, condIsDay, { size: 96, class: "weather-icon-meteocon hero" });
      const cssClass = IconMap.weatherIconCssClass(cond, condIsDay);
      let overlays = '';
      if (cond === 'Rain' || cond === 'Drizzle' || cond === 'Thunderstorm') {
        overlays += '<div class="rain-overlay"><span></span><span></span><span></span><span></span></div>';
      }
      if (cond === 'Thunderstorm') {
        overlays += '<div class="lightning-overlay"></div>';
      }
      mainEmoji.innerHTML = `<div class="weather-icon-wrap weather-icon-${cssClass}">${iconHtml}${overlays}</div>`;
    }

    document.querySelectorAll('.forecast-card').forEach((card, idx) => {
      const iconEl = card.querySelector('.fc-icon');
      if (iconEl && state.PREVISIONS && state.PREVISIONS[idx]) {
        iconEl.innerHTML = IconMap.weatherIcon(state.PREVISIONS[idx].condition, true, { size: 44, class: "weather-icon-meteocon" });
      }
    });
  } else {
    loadLandingWeather();
  }

  const searchForm = document.getElementById('searchForm');
  if (searchForm) {
    searchForm.addEventListener('submit', () => {
      const loading = document.getElementById('loading');
      if (loading) loading.classList.add('active');
      const city = document.getElementById('cityInput') ? document.getElementById('cityInput').value.trim() : '';
      if (city) pushRecent(city);
    });
  }

  window.addEventListener('resize', () => {
    if (typeof drawChart === 'function' && window.currentChartKey) {
      drawChart(window.currentChartKey);
    }
    const Lmap = document.getElementById('weather-map');
    if (Lmap && window.L && typeof window.L.map === 'function') {
      setTimeout(() => {
        const mapEl = document.querySelector('.leaflet-container');
        if (mapEl && mapEl._leaflet_id) {
          const m = Object.values(mapEl).find(v => v && v.invalidateSize);
          if (m) m.invalidateSize();
        }
      }, 60);
    }
  });

  window.currentLang = currentLang;

  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.pill-btn, .search-btn, .fav-btn, .compare-btn, .landing-cta-btn');
    if (btn) createRipple(e);
  });
}

document.addEventListener('DOMContentLoaded', initAll);

window.toggleTheme = toggleTheme;
window.setUnit = setUnit;
window.geolocate = geolocate;
window.startVoice = startVoice;
window.selectCity = selectCity;
window.showActivityPlanner = showActivityPlanner;
window.shareAsImage = shareAsImage;
window.switchChart = switchChart;
window.setMapLayer = setMapLayer;
window.showExplain = showExplain;
window.hideExplain = hideExplain;
window.setLanguage = setLanguage;
window.loadLandingWeather = loadLandingWeather;

window.toggleFav = toggleFav;
window.removeFav = removeFav;
window.renderFavs = renderFavs;
