import { toast } from './utils.js';
import { currentLang } from './i18n.js';
import * as IconMap from './icon-map.js';

export function geolocate() {
  if (!navigator.geolocation) { toast('Géolocalisation non supportée'); return; }
  toast('Localisation en cours...');
  navigator.geolocation.getCurrentPosition(async pos => {
    try {
      const r = await fetch(`/reverse-geocode?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
      const d = await r.json();
      if (d.city) {
        const cityInput = document.getElementById('cityInput');
        const searchForm = document.getElementById('searchForm');
        if (cityInput) cityInput.value = d.city;
        if (searchForm) searchForm.submit();
      }
    } catch(e) { toast('Erreur de localisation'); }
  }, () => toast('Permission refusée'));
}
window.geolocate = geolocate;

export function startVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast('Recherche vocale non supportée'); return; }
  const rec = new SR();
  rec.lang = currentLang === 'en' ? 'en-US' : 'fr-FR';
  const btn = document.getElementById('voiceBtn');
  if (btn) btn.classList.add('recording');
  rec.onresult = e => {
    const cityInput = document.getElementById('cityInput');
    const searchForm = document.getElementById('searchForm');
    if (cityInput) cityInput.value = e.results[0][0].transcript;
    if (searchForm) searchForm.submit();
  };
  rec.onerror = () => { if (btn) btn.classList.remove('recording'); toast('Erreur vocale'); };
  rec.onend = () => { if (btn) btn.classList.remove('recording'); };
  rec.start();
  toast(currentLang === 'en' ? 'Speak now...' : 'Parlez maintenant...');
}
window.startVoice = startVoice;

const AC_DEBOUNCE = 200;
const AC_MIN_CHARS = 2;
const AC_MAX_RESULTS = 8;
const AC_LOADING_DELAY = 150;
const AC_CACHE_MAX = 30;

let _acCache = new Map();
let _acAbort = null;
let _acTimer = null;
let _acLoadTimer = null;
let _acSelected = -1;
let _acItems = [];
let _acOpen = false;

function _acCacheGet(key) {
  const v = _acCache.get(key);
  if (v) { _acCache.delete(key); _acCache.set(key, v); }
  return v;
}

function _acCacheSet(key, val) {
  if (_acCache.has(key)) _acCache.delete(key);
  _acCache.set(key, val);
  while (_acCache.size > AC_CACHE_MAX) {
    const first = _acCache.keys().next().value;
    _acCache.delete(first);
  }
}

function _acHighlight(text, query) {
  if (!query) return text;
  const q = query.toLowerCase();
  const lower = text.toLowerCase();
  let result = '';
  let qi = 0;
  for (let i = 0; i < text.length; i++) {
    if (qi < q.length && lower[i] === q[qi]) {
      result += '<span class="ac-hl">' + text[i] + '</span>';
      qi++;
    } else {
      result += text[i];
    }
  }
  return result;
}

function _acScore(item, query) {
  const q = query.toLowerCase();
  const name = item.name.toLowerCase();
  if (name === q) return 100;
  if (name.startsWith(q)) return 90;
  if (name.includes(q)) return 70;
  const words = name.split(/[\s,]+/);
  for (const w of words) {
    if (w.startsWith(q)) return 80;
    if (w.includes(q)) return 60;
  }
  let qi = 0;
  for (let i = 0; i < name.length && qi < q.length; i++) {
    if (name[i] === q[qi]) qi++;
  }
  if (qi === q.length) return 40;
  return 0;
}

function _acRender(results, query) {
  const list = document.getElementById('autocompleteList');
  if (!list) return;
  _acItems = results;
  _acSelected = -1;
  if (!results || results.length === 0) {
    list.innerHTML = '<div class="ac-empty">Aucune ville trouvée</div>';
    list.classList.add('open');
    _acOpen = true;
    return;
  }
  list.innerHTML = results.map((r, i) =>
    '<div class="autocomplete-item" data-ac-idx="' + i + '" onclick="window.selectCity(\'' + r.name.replace(/'/g, "\\'") + '\')">' +
    '<span class="ac-icon">' + IconMap.uiIcon('locate-me') + '</span><span class="ac-name">' + _acHighlight(r.name, query) + '</span>' +
    '</div>'
  ).join('');
  list.classList.add('open');
  _acOpen = true;
}

function _acSelect(idx) {
  const list = document.getElementById('autocompleteList');
  if (!list) return;
  const items = list.querySelectorAll('.autocomplete-item');
  items.forEach(el => el.classList.remove('ac-active'));
  if (idx >= 0 && idx < items.length) {
    items[idx].classList.add('ac-active');
    items[idx].scrollIntoView({ block: 'nearest' });
    const cityInput = document.getElementById('cityInput');
    if (cityInput) cityInput.value = _acItems[idx].name;
  }
  _acSelected = idx;
}

function _acClose() {
  const list = document.getElementById('autocompleteList');
  if (list) list.classList.remove('open');
  _acOpen = false;
  _acSelected = -1;
  _acItems = [];
}

async function _acFetch(query) {
  if (_acAbort) _acAbort.abort();
  _acAbort = new AbortController();
  const cacheKey = query.toLowerCase().trim();
  const cached = _acCacheGet(cacheKey);
  if (cached) {
    _acRender(cached, query);
    return;
  }
  try {
    const r = await fetch('/autocomplete?q=' + encodeURIComponent(query), { signal: _acAbort.signal });
    const data = await r.json();
    const sorted = data.sort((a, b) => _acScore(b, query) - _acScore(a, query)).slice(0, AC_MAX_RESULTS);
    _acCacheSet(cacheKey, sorted);
    _acRender(sorted, query);
  } catch (e) {
    if (e.name !== 'AbortError') {
      _acRender([], query);
    }
  }
}

export function initAutocomplete() {
  const cityInput = document.getElementById('cityInput');
  const list = document.getElementById('autocompleteList');
  if (!cityInput || !list) return;

  cityInput.addEventListener('input', function() {
    clearTimeout(_acTimer);
    clearTimeout(_acLoadTimer);
    const q = this.value.trim().replace(/\s+/g, ' ');
    if (q.length < AC_MIN_CHARS) { _acClose(); return; }
    _acLoadTimer = setTimeout(() => {
      const loader = document.createElement('div');
      loader.className = 'ac-loading';
      loader.textContent = 'Chargement...';
      list.innerHTML = '';
      list.appendChild(loader);
      list.classList.add('open');
      _acOpen = true;
    }, AC_LOADING_DELAY);
    _acTimer = setTimeout(() => {
      clearTimeout(_acLoadTimer);
      _acFetch(q);
    }, AC_DEBOUNCE);
  });

  cityInput.addEventListener('keydown', function(e) {
    if (!_acOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _acSelect(Math.min(_acSelected + 1, _acItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      _acSelect(Math.max(_acSelected - 1, 0));
    } else if (e.key === 'Enter' && _acSelected >= 0) {
      e.preventDefault();
      selectCity(_acItems[_acSelected].name);
    } else if (e.key === 'Escape') {
      _acClose();
      cityInput.blur();
    }
  });

  cityInput.addEventListener('focus', function() {
    const q = this.value.trim();
    if (q.length >= AC_MIN_CHARS && _acItems.length > 0) {
      list.classList.add('open');
      _acOpen = true;
    }
  });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-input-wrap')) _acClose();
  });

  const searchForm = document.getElementById('searchForm');
  if (searchForm) {
    searchForm.addEventListener('submit', function() {
      const loading = document.getElementById('loading');
      const skeleton = document.getElementById('skeleton');
      const mainContent = document.querySelector('.main-grid') || document.querySelector('.landing-hero');
      if (loading) loading.style.display = 'block';
      if (skeleton) skeleton.style.display = 'block';
      if (mainContent) mainContent.style.opacity = '0.25';
    });
  }
}

export function selectCity(name) {
  const cityInput = document.getElementById('cityInput');
  const searchForm = document.getElementById('searchForm');
  if (cityInput) cityInput.value = name;
  _acClose();
  if (searchForm) searchForm.submit();
}
window.selectCity = selectCity;
