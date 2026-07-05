import { state } from './globals.js';

export let map, weatherLayer;

export function initMap() {
  if (!state.LAT || !state.LON) return;
  const mapEl = document.getElementById('weather-map');
  if (!mapEl || typeof L === 'undefined') return;
  if (map) { try { map.remove(); } catch(e){} map = null; }

  map = L.map('weather-map', { zoomControl: true }).setView([state.LAT, state.LON], 7);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 12
  }).addTo(map);

  weatherLayer = L.tileLayer(
    `/map-tiles/precipitation_new/{z}/{x}/{y}.png`,
    { opacity: 0.65, attribution: 'OpenWeatherMap' }
  ).addTo(map);

  L.marker([state.LAT, state.LON]).addTo(map).bindPopup('Votre position').openPopup();

  setTimeout(() => { if (map) map.invalidateSize(); }, 300);
}

export function setMapLayer(layer, btn) {
  document.querySelectorAll('.map-layer-btn').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (!map || typeof L === 'undefined') return;
  if (weatherLayer) map.removeLayer(weatherLayer);
  weatherLayer = L.tileLayer(
    `/map-tiles/${layer}/{z}/{x}/{y}.png`,
    { opacity: 0.65, attribution: 'OpenWeatherMap' }
  ).addTo(map);
}
window.setMapLayer = setMapLayer;
