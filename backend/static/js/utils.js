export function toF(c) { return Math.round(c * 9/5 + 32); }
export function toC(f) { return Math.round((f - 32) * 5/9); }
export function convertTemp(c, unit) { return unit === 'F' ? toF(c) : Math.round(c); }

export function toast(msg) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transform='translateY(10px)'; setTimeout(()=>t.remove(),400); }, 2800);
}
window.toast = toast;

export function createRipple(e) {
  var btn = e.currentTarget;
  var rect = btn.getBoundingClientRect();
  var size = Math.max(rect.width, rect.height);
  var span = document.createElement('span');
  span.style.width = span.style.height = size + 'px';
  span.style.left = (e.clientX - rect.left - size / 2) + 'px';
  span.style.top = (e.clientY - rect.top - size / 2) + 'px';
  btn.appendChild(span);
  span.addEventListener('animationend', function() { span.remove(); });
}

export function getAnimatedWeatherIcon(condition, size = 64) {
  const cond = (condition || '').toLowerCase();
  if (cond.includes('clear') || cond.includes('sun')) {
    return `<svg class="weather-icon-svg icon-sunny" width="${size}" height="${size}" viewBox="0 0 48 48">
      <circle class="sun" cx="24" cy="24" r="10"/>
      <g class="sun-rays">
        <line x1="24" y1="3" x2="24" y2="8" stroke-linecap="round"/>
        <line x1="24" y1="40" x2="24" y2="45" stroke-linecap="round"/>
        <line x1="3" y1="24" x2="8" y2="24" stroke-linecap="round"/>
        <line x1="40" y1="24" x2="45" y2="24" stroke-linecap="round"/>
        <line x1="9.1" y1="9.1" x2="12.6" y2="12.6" stroke-linecap="round"/>
        <line x1="35.4" y1="35.4" x2="38.9" y2="38.9" stroke-linecap="round"/>
        <line x1="9.1" y1="38.9" x2="12.6" y2="35.4" stroke-linecap="round"/>
        <line x1="35.4" y1="12.6" x2="38.9" y2="9.1" stroke-linecap="round"/>
      </g>
    </svg>`;
  } else if (cond.includes('rain') || cond.includes('drizzle')) {
    return `<svg class="weather-icon-svg icon-rainy" width="${size}" height="${size}" viewBox="0 0 48 48">
      <path class="cloud" d="M12 34a6 6 0 0 1-1-11.9A10 10 0 0 1 30 14a8 8 0 0 1 7.6 5.4A7 7 0 0 1 37 34H12z"/>
      <g class="rain-drops">
        <line class="raindrop raindrop-1" x1="16" y1="36" x2="16" y2="42" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round"/>
        <line class="raindrop raindrop-2" x1="24" y1="38" x2="24" y2="44" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round"/>
        <line class="raindrop raindrop-3" x1="32" y1="36" x2="32" y2="42" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round"/>
      </g>
    </svg>`;
  } else if (cond.includes('snow')) {
    return `<svg class="weather-icon-svg icon-snowy" width="${size}" height="${size}" viewBox="0 0 48 48">
      <path class="cloud" d="M12 34a6 6 0 0 1-1-11.9A10 10 0 0 1 30 14a8 8 0 0 1 7.6 5.4A7 7 0 0 1 37 34H12z"/>
      <circle class="snowflake snowflake-1" cx="16" cy="38" r="2"/>
      <circle class="snowflake snowflake-2" cx="24" cy="40" r="2"/>
      <circle class="snowflake snowflake-3" cx="32" cy="38" r="2"/>
    </svg>`;
  } else if (cond.includes('thunder')) {
    return `<svg class="weather-icon-svg icon-stormy" width="${size}" height="${size}" viewBox="0 0 48 48">
      <path class="cloud" d="M12 34a6 6 0 0 1-1-11.9A10 10 0 0 1 30 14a8 8 0 0 1 7.6 5.4A7 7 0 0 1 37 34H12z"/>
      <polygon class="lightning" points="22,32 28,32 25,38 30,38 23,46 25,40 20,40"/>
    </svg>`;
  } else if (cond.includes('mist') || cond.includes('fog')) {
    return `<svg class="weather-icon-svg icon-foggy" width="${size}" height="${size}" viewBox="0 0 48 48">
      <line class="fog-line fog-line-1" x1="10" y1="18" x2="38" y2="18" />
      <line class="fog-line fog-line-2" x1="6" y1="26" x2="42" y2="26" />
      <line class="fog-line fog-line-3" x1="12" y1="34" x2="36" y2="34" />
    </svg>`;
  } else {
    return `<svg class="weather-icon-svg icon-cloudy" width="${size}" height="${size}" viewBox="0 0 48 48">
      <path class="cloud" d="M12 38a6 6 0 0 1-1-11.9A10 10 0 0 1 30 18a8 8 0 0 1 7.6 5.4A7 7 0 0 1 37 38H12z"/>
      <path class="cloud cloud-front" style="fill:rgba(255,255,255,0.75); transform:translate(2px, 3px);" d="M12 38a6 6 0 0 1-1-11.9A10 10 0 0 1 30 18a8 8 0 0 1 7.6 5.4A7 7 0 0 1 37 38H12z"/>
    </svg>`;
  }
}
