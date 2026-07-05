document.addEventListener('DOMContentLoaded', function() {
  var wbBtn = document.getElementById('wbBtn');
  var wbPanel = document.getElementById('wbPanel');
  var wbClose = document.getElementById('wbClose');
  var wbInput = document.getElementById('wbInput');
  var wbSend = document.getElementById('wbSend');
  var wbMessages = document.getElementById('wbMessages');
  if (!wbBtn || !wbPanel) return;

  wbBtn.addEventListener('click', function() {
    var opening = !wbPanel.classList.contains('wb-open');
    if (opening) {
      wbPanel.style.display = 'flex';
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          wbPanel.classList.add('wb-open');
        });
      });
      wbPanel.setAttribute('aria-hidden', 'false');
      wbInput.focus();
    } else {
      wbPanel.classList.remove('wb-open');
      wbPanel.setAttribute('aria-hidden', 'true');
    }
  });

  wbClose.addEventListener('click', function() {
    wbPanel.classList.remove('wb-open');
    wbPanel.setAttribute('aria-hidden', 'true');
    wbPanel.addEventListener('transitionend', function handler() {
      wbPanel.style.display = 'none';
      wbPanel.removeEventListener('transitionend', handler);
    });
  });

  function wbAppendMsg(text, type) {
    var div = document.createElement('div');
    div.className = 'wb-msg wb-' + type;
    div.textContent = text;
    wbMessages.appendChild(div);
    wbMessages.scrollTop = wbMessages.scrollHeight;
    return div;
  }

  function wbCreateTyping() {
    var div = document.createElement('div');
    div.className = 'wb-msg wb-bot wb-typing';
    var dots = document.createElement('span');
    dots.className = 'wb-typing-dots';
    dots.innerHTML = '<span></span><span></span><span></span>';
    div.appendChild(dots);
    wbMessages.appendChild(div);
    wbMessages.scrollTop = wbMessages.scrollHeight;
    return div;
  }

  function wbTypewrite(element, text, callback) {
    var i = 0;
    var speed = 18;
    element.textContent = '';
    element.classList.remove('wb-typing');
    function tick() {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
        wbMessages.scrollTop = wbMessages.scrollHeight;
        setTimeout(tick, speed);
      } else if (callback) {
        callback();
      }
    }
    tick();
  }

  async function wbSendMessage() {
    var text = wbInput.value.trim();
    if (!text) return;
    wbInput.value = '';
    wbAppendMsg(text, 'user');
    var typing = wbCreateTyping();

    var weatherCtx = 'Données météo non disponibles';
    if (typeof window._wbWeather !== 'undefined' && window._wbWeather.ville) {
      weatherCtx = JSON.stringify(window._wbWeather);
    } else {
      var params = new URLSearchParams(window.location.search);
      var city = params.get('city') || '';
      if (!city) {
        var cityInput = document.getElementById('cityInput');
        if (cityInput) city = cityInput.value.trim();
      }
      if (city) {
        try {
          var wxResp = await fetch('/api/weather?city=' + encodeURIComponent(city) + '&lang=' + (params.get('lang') || 'fr'));
          if (wxResp.ok) {
            var wxData = await wxResp.json();
            if (wxData.meteo) {
              var fullCtx = {
                ville: wxData.meteo.ville,
                pays: wxData.meteo.pays,
                date: wxData.meteo.date,
                temperature: wxData.meteo.temperature,
                temperature_reelle: wxData.meteo.temperature_reelle,
                temp_min: wxData.meteo.temp_min,
                temp_max: wxData.meteo.temp_max,
                condition: wxData.meteo.condition,
                description: wxData.meteo.description,
                humidite: wxData.meteo.humidite,
                vent: wxData.meteo.vent,
                vent_deg: wxData.meteo.vent_deg,
                pression: wxData.meteo.pression,
                visibilite: wxData.meteo.visibilite,
                nuages: wxData.meteo.nuages,
                lever_soleil: wxData.meteo.lever_soleil,
                coucher_soleil: wxData.meteo.coucher_soleil,
                unite: wxData.unite,
                hourly: (wxData.hourly || []).map(function(h) { return h.heure + ': ' + h.temp + '° humidité ' + h.hum + '% vent ' + h.wind + 'm/s'; }).join(' | '),
                previsions: (wxData.previsions || []).map(function(p) { return p.jour + ' ' + p.date + ': ' + p.description + ' min ' + p.temp_min + '° max ' + p.temp_max + '° hum ' + p.humidite + '%'; }).join(' | '),
                aqi: wxData.qualite_air ? wxData.qualite_air.aqi + ' (' + wxData.qualite_air.label + ') PM2.5:' + wxData.qualite_air.pm25 + ' PM10:' + wxData.qualite_air.pm10 : 'N/A',
                uv: wxData.uv ? wxData.uv.index + ' - ' + wxData.uv.risk + ' - ' + wxData.uv.advice : 'N/A'
              };
              weatherCtx = JSON.stringify(fullCtx);
              window._wbWeather = fullCtx;
            }
          }
        } catch (e) { /* ignore */ }
      }
    }

    try {
      var response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, weather: weatherCtx })
      });
      var data = await response.json();
      var reply = data.reply || 'Désolé, je ne peux pas répondre pour le moment.';
      var msgDiv = document.createElement('div');
      msgDiv.className = 'wb-msg wb-bot';
      typing.replaceWith(msgDiv);
      wbTypewrite(msgDiv, reply);
    } catch (err) {
      typing.remove();
      wbAppendMsg('Erreur de connexion. Réessayez.', 'bot');
    }
  }

  wbSend.addEventListener('click', wbSendMessage);
  wbInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') wbSendMessage(); });
});
