import { state } from './globals.js';

export function initTheme() {
  const saved = localStorage.getItem('mxTheme');
  const dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme:dark)').matches;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const themeIcon = document.getElementById('theme-icon');
  if (themeIcon) themeIcon.innerHTML = dark ? '<i class="ti ti-sun"></i>' : '<i class="ti ti-moon"></i>';
}

export function toggleTheme() {
  const curr = document.documentElement.getAttribute('data-theme');
  const next = curr === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('mxTheme', next);
  const themeIcon = document.getElementById('theme-icon');
  if (themeIcon) themeIcon.innerHTML = next === 'dark' ? '<i class="ti ti-sun"></i>' : '<i class="ti ti-moon"></i>';
}
window.toggleTheme = toggleTheme;

export function applyWeatherTheme(conditionCode, isDay) {
  const cond = (conditionCode || '').toLowerCase();
  const body = document.body;
  body.className = body.className.split(' ').filter(c => !c.startsWith('weather-')).join(' ');
  let cls;
  if (cond.includes('thunder') || cond.includes('storm') || /20[0-9]/.test(cond)) {
    cls = 'weather-storm';
  } else if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower') || /3[0-9]{2}/.test(cond) || /5[0-9]{2}/.test(cond)) {
    cls = 'weather-rain';
  } else if (cond.includes('snow') || cond.includes('sleet') || cond.includes('ice') || /6[0-9]{2}/.test(cond)) {
    cls = 'weather-snow';
  } else if (cond.includes('fog') || cond.includes('mist') || cond.includes('haze') || cond.includes('dust') || /7[0-9]{2}/.test(cond)) {
    cls = 'weather-cloudy';
  } else if (cond.includes('clear') || cond === 'sunny' || /^800$/.test(cond)) {
    cls = isDay ? 'weather-clear-day' : 'weather-clear-night';
  } else if (cond.includes('cloud') || /80[1-4]/.test(cond)) {
    cls = 'weather-cloudy';
  } else {
    cls = isDay ? 'weather-clear-day' : 'weather-clear-night';
  }
  body.classList.add(cls);
}
