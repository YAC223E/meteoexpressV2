export function startLocalClock(elementId, tzOffsetSeconds, lang) {
  const el = document.getElementById(elementId);
  if (!el || tzOffsetSeconds === undefined || tzOffsetSeconds === null) return;

  function render() {
    const nowUtcMs = Date.now();
    const cityMs = nowUtcMs + tzOffsetSeconds * 1000 + new Date().getTimezoneOffset() * 60000;
    const cityDate = new Date(cityMs);

    const dateStr = cityDate.toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const timeStr = cityDate.toLocaleTimeString(lang === 'en' ? 'en-US' : 'fr-FR', {
      hour: '2-digit', minute: '2-digit'
    });

    el.innerHTML = `<i class="ti ti-clock" aria-hidden="true"></i> ${dateStr} · <span class="live-time">${timeStr}</span>`;
  }

  render();
  return setInterval(render, 1000 * 30);
}
