export const state = {
  HOURLY: window.HOURLY || [],
  WIND_DEG: window.WIND_DEG || 270,
  LAT: window.LAT || 0,
  LON: window.LON || 0,
  SUNRISE: window.SUNRISE || '06:00',
  COUCHER: window.COUCHER || '18:00',
  PREVISIONS: window.PREVISIONS || [],
  BEST_DAYS: window.BEST_DAYS || {},
  HAS_WEATHER: !!window.HAS_WEATHER,
  CURRENT_CONDITION: window.CURRENT_CONDITION || 'Clear',
};
