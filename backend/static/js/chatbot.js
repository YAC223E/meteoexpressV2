document.addEventListener('DOMContentLoaded', function() {
  var wbBtn = document.getElementById('wbBtn');
  var wbPanel = document.getElementById('wbPanel');
  var wbClose = document.getElementById('wbClose');
  var wbInput = document.getElementById('wbInput');
  var wbSend = document.getElementById('wbSend');
  var wbMessages = document.getElementById('wbMessages');
  var wbSuggestions = document.getElementById('wbSuggestions');
  if (!wbBtn || !wbPanel) return;

  function _wbLang() {
    var p = new URLSearchParams(window.location.search);
    return p.get('lang') === 'en' ? 'en' : 'fr';
  }

  function _wbT(key) {
    var el = document.querySelector('[data-i18n="' + key + '"]');
    return el ? el.textContent : key;
  }

  function _wbToast(msg) {
    if (typeof window.toast === 'function') { window.toast(msg); return; }
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function() { t.classList.add('show'); });
    setTimeout(function() { t.classList.remove('show'); setTimeout(function() { t.remove(); }, 400); }, 2500);
  }

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

  function _wbHideSuggestions() {
    if (wbSuggestions) wbSuggestions.classList.add('wb-hidden');
  }

  function _wbShowSuggestions() {
    if (wbSuggestions) wbSuggestions.classList.remove('wb-hidden');
  }

  function wbAppendMsg(text, type, withIcon) {
    var div = document.createElement('div');
    div.className = 'wb-msg wb-' + type;
    if (withIcon) {
      var icon = document.createElement('i');
      icon.className = 'ti ti-sparkles wb-bot-icon';
      div.appendChild(icon);
    }
    var span = document.createElement('span');
    span.textContent = text;
    div.appendChild(span);
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
    var span = element.querySelector('span') || element;
    span.textContent = '';
    element.classList.remove('wb-typing');
    function tick() {
      if (i < text.length) {
        span.textContent += text.charAt(i);
        i++;
        wbMessages.scrollTop = wbMessages.scrollHeight;
        setTimeout(tick, speed);
      } else if (callback) {
        callback();
      }
    }
    tick();
  }

  async function wbSendMessage(text) {
    text = (text || wbInput.value).trim();
    if (!text) return;
    wbInput.value = '';
    _wbHideSuggestions();
    wbAppendMsg(text, 'user');
    var typing = wbCreateTyping();

    var weatherCtx = _wbLang() === 'en' ? 'Weather data not available' : 'Données météo non disponibles';
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
      var reply = data.reply || (_wbLang() === 'en' ? 'Sorry, I cannot respond right now.' : 'Désolé, je ne peux pas répondre pour le moment.');
      var msgDiv = document.createElement('div');
      msgDiv.className = 'wb-msg wb-bot';
      var icon = document.createElement('i');
      icon.className = 'ti ti-sparkles wb-bot-icon';
      msgDiv.appendChild(icon);
      typing.replaceWith(msgDiv);
      wbTypewrite(msgDiv, reply);
    } catch (err) {
      typing.remove();
      wbAppendMsg(_wbT('chatbot_error'), 'bot');
    }
  }

  wbSend.addEventListener('click', function() { wbSendMessage(); });
  wbInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') wbSendMessage(); });

  // Suggested questions
  var suggestBtns = document.querySelectorAll('.wb-suggest');
  suggestBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      wbSendMessage(btn.textContent);
    });
  });

  // ---- Voice input for chatbot ----
  var wbMic = document.getElementById('wbMic');
  if (!wbMic) return;

  var _chatRec = null;
  var _chatChunks = [];
  var _chatStream = null;
  var _chatTimeout = null;
  var CHAT_VOICE_MAX_MS = 10000;

  function _chatStopRecording() {
    if (_chatRec && _chatRec.state === 'recording') _chatRec.stop();
    if (_chatTimeout) { clearTimeout(_chatTimeout); _chatTimeout = null; }
  }

  wbMic.addEventListener('click', function() {
    if (_chatRec && _chatRec.state === 'recording') {
      _chatStopRecording();
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      _wbToast(_wbT('chatbot_voice_unsupported'));
      return;
    }

    var preferWebM = MediaRecorder.isTypeSupported('audio/webm');
    var mime = preferWebM ? 'audio/webm' : 'audio/mp4';
    var ext = preferWebM ? 'webm' : 'm4a';
    var lang = _wbLang();

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(function(stream) {
        _chatStream = stream;
        _chatChunks = [];
        _chatRec = new MediaRecorder(stream, { mimeType: mime });

        _chatRec.ondataavailable = function(e) {
          if (e.data.size > 0) _chatChunks.push(e.data);
        };

        _chatRec.onstop = function() {
          wbMic.classList.remove('recording');
          if (_chatStream) { _chatStream.getTracks().forEach(function(t) { t.stop(); }); _chatStream = null; }
          if (_chatTimeout) { clearTimeout(_chatTimeout); _chatTimeout = null; }
          if (_chatChunks.length === 0) return;

          _wbToast(_wbT('chatbot_transcribing'));

          var blob = new Blob(_chatChunks, { type: mime });
          var formData = new FormData();
          formData.append('audio', blob, 'recording.' + ext);
          formData.append('lang', lang);

          fetch('/api/transcribe', { method: 'POST', body: formData })
            .then(function(r) { return r.json(); })
            .then(function(data) {
              if (data.error) { _wbToast(data.error); return; }
              if (data.text) {
                wbInput.value = data.text;
                wbSendMessage();
              }
            })
            .catch(function() { _wbToast(_wbT('chatbot_voice_error')); });
        };

        _chatRec.start();
        wbMic.classList.add('recording');
        _wbToast(_wbT('chatbot_voice_start'));
        _chatTimeout = setTimeout(function() { _chatStopRecording(); }, CHAT_VOICE_MAX_MS);
      })
      .catch(function() {
        _wbToast(_wbT('chatbot_voice_permission'));
      });
  });
});
